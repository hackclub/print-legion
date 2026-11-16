require "net/http"
require "json"
require "base64"

# Minimal Airtable REST client. Token: AIRTABLE_API_KEY (or AIRTABLE_KEY).
#
# * Keeps a small pool of keep-alive HTTPS connections, so repeat requests skip
#   the TLS handshake (the bulk of latency on a cold call).
# * `parallel` runs several list calls at once; together with formula
#   partitions this turns a 4-page sequential scan into one round trip.
# * Retries once on 429 (Airtable allows 5 requests/second per base).
# * Writes (update, upload_attachment) need data.records:write on the token.
class AirtableClient
  HOST = "api.airtable.com".freeze
  CONTENT_HOST = "content.airtable.com".freeze # attachment uploads
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
  # by_field_id: false keys fields by name (for tables configured by name).
  def list(table, fields:, formula: nil, sort: nil, page_size: 100, max_records: nil, offset: nil, all_pages: false, by_field_id: true)
    records = []
    loop do
      params = [["pageSize", page_size]]
      params << ["returnFieldsByFieldId", "true"] if by_field_id
      fields.each { |f| params << ["fields[]", f] }
      params << ["filterByFormula", formula] if formula
      params << ["maxRecords", max_records] if max_records
      params << ["offset", offset] if offset
      Array(sort).each_with_index do |(field, dir), i|
        params << ["sort[#{i}][field]", field] << ["sort[#{i}][direction]", dir]
      end
      body = request(:get, "/v0/#{@base_id}/#{table}?#{URI.encode_www_form(params)}")
      records.concat(body["records"])
      offset = body["offset"]
      break unless all_pages && offset
    end
    [records, offset]
  end

  # One record, fields keyed by ID.
  def find(table, id, fields: nil)
    params = [["returnFieldsByFieldId", "true"]]
    Array(fields).each { |f| params << ["fields[]", f] }
    request(:get, "/v0/#{@base_id}/#{table}/#{record_id!(id)}?#{URI.encode_www_form(params)}")
  end

  # Sets the given fields (keys are field IDs) on one record. Returns the record.
  def update(table, id, fields)
    request(:patch, "/v0/#{@base_id}/#{table}/#{record_id!(id)}", { fields:, returnFieldsByFieldId: true })
  end

  # Appends a file (max 5 MB) to an attachment field. Returns the record with
  # that field's attachments, keyed by field ID.
  def upload_attachment(id, field, content_type:, filename:, data:)
    body = { contentType: content_type, filename:, file: Base64.strict_encode64(data) }
    request(:post, "/v0/#{@base_id}/#{record_id!(id)}/#{field}/uploadAttachment", body, host: CONTENT_HOST)
  end

  # Runs each block in its own thread and returns their results in order.
  def parallel(*jobs)
    threads = jobs.map { |job| Thread.new { Rails.application.executor.wrap { job.call } } }
    ActiveSupport::Dependencies.interlock.permit_concurrent_loads { threads.map(&:value) }
  end

  private

  VERBS = { get: Net::HTTP::Get, patch: Net::HTTP::Patch, post: Net::HTTP::Post }.freeze

  def request(verb, path, body = nil, host: HOST, attempt: 0)
    req = VERBS.fetch(verb).new(path)
    req["Authorization"] = "Bearer #{@token}"
    if body
      req["Content-Type"] = "application/json"
      req.body = JSON.generate(body)
    end
    # Uploads are rare and go to another host: no pooling for them.
    response = host == HOST ? with_connection { _1.request(req) } : one_off(host) { _1.request(req) }

    case response
    when Net::HTTPSuccess then JSON.parse(response.body)
    when Net::HTTPTooManyRequests
      raise Error, "Airtable rate limit" if attempt >= 1
      sleep 1.05
      request(verb, path, body, host:, attempt: attempt + 1)
    else
      raise Error, "Airtable #{response.code}: #{response.body.to_s[0, 200]}"
    end
  end

  # Record IDs go into URL paths: only ever accept the real shape.
  def record_id!(id)
    id = id.to_s
    raise ArgumentError, "not a record id" unless id.match?(/\Arec[A-Za-z0-9]{14}\z/)
    id
  end

  def one_off(host)
    http = Net::HTTP.new(host, 443)
    http.use_ssl = true
    http.open_timeout = 5
    http.read_timeout = 30
    http.start { yield _1 }
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
