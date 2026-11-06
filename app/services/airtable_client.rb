require "net/http"
require "json"

# Minimal Airtable REST client. Token: AIRTABLE_API_KEY (or AIRTABLE_KEY).
#
# * Keeps a small pool of keep-alive HTTPS connections, so repeat requests skip
#   the TLS handshake (the bulk of latency on a cold call).
# * `parallel` runs several list calls at once; together with formula
#   partitions this turns a 4-page sequential scan into one round trip.
# * Retries once on 429 (Airtable allows 5 requests/second per base).
class AirtableClient
  HOST = "api.airtable.com".freeze
  Error = Class.new(StandardError)

  def self.instance
    @instance ||= if (token = ENV["AIRTABLE_API_KEY"].presence || ENV["AIRTABLE_KEY"].presence)
      new(token, AirtableConfig::BASE_ID)
    else
      FixtureAirtableClient.new
    end
  end

  def initialize(token, base_id)
    @token = token
    @base_id = base_id
    @pool = []
    @pool_lock = Mutex.new
  end

  # Returns [records, next_offset]. With all_pages: true, follows offsets.
  def list(table, fields:, formula: nil, sort: nil, page_size: 100, max_records: nil, offset: nil, all_pages: false)
    records = []
    loop do
      params = [["pageSize", page_size], ["returnFieldsByFieldId", "true"]]
      fields.each { |f| params << ["fields[]", f] }
      params << ["filterByFormula", formula] if formula
      params << ["maxRecords", max_records] if max_records
      params << ["offset", offset] if offset
      Array(sort).each_with_index do |(field, dir), i|
        params << ["sort[#{i}][field]", field] << ["sort[#{i}][direction]", dir]
      end
      body = get("/v0/#{@base_id}/#{table}?#{URI.encode_www_form(params)}")
      records.concat(body["records"])
      offset = body["offset"]
      break unless all_pages && offset
    end
    [records, offset]
  end

  # Runs each block in its own thread and returns their results in order.
  def parallel(*jobs)
    threads = jobs.map { |job| Thread.new { Rails.application.executor.wrap { job.call } } }
    ActiveSupport::Dependencies.interlock.permit_concurrent_loads { threads.map(&:value) }
  end

  private

  def get(path, attempt: 0)
    response = with_connection do |http|
      req = Net::HTTP::Get.new(path)
      req["Authorization"] = "Bearer #{@token}"
      http.request(req)
    end

    case response
    when Net::HTTPSuccess then JSON.parse(response.body)
    when Net::HTTPTooManyRequests
      raise Error, "Airtable rate limit" if attempt >= 1
      sleep 1.05
      get(path, attempt: attempt + 1)
    else
      raise Error, "Airtable #{response.code}: #{response.body.to_s[0, 200]}"
    end
  end

  def with_connection
    http = @pool_lock.synchronize { @pool.pop } || start_connection
    begin
      result = yield http
    rescue IOError, EOFError, Errno::ECONNRESET, Net::ReadTimeout, OpenSSL::SSL::SSLError
      http.finish rescue nil
      http = start_connection
      result = yield http
    end
    @pool_lock.synchronize { @pool.push(http) if @pool.size < 8 }
    result
  end

  def start_connection
    http = Net::HTTP.new(HOST, 443)
    http.use_ssl = true
    http.open_timeout = 3
    http.read_timeout = 8
    http.keep_alive_timeout = 30
    http.start
  end
end
