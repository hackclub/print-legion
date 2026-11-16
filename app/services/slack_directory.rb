require "net/http"
require "json"

# Display names and avatars of Slack users (print recipients), via users.info
# with SLACK_BOT_TOKEN (needs users:read). Only the display name (or handle)
# and a Slack-hosted avatar are kept: no real names, emails or Gravatar URLs
# (those carry a hash of the person's email). Cached for 12 hours per user.
module SlackDirectory
  Person = Struct.new(:id, :name, :avatar, keyword_init: true)
  USER_ID = /\A[UW][A-Z0-9]{6,20}\z/
  TTL = 12.hours
  MISS_TTL = 1.hour
  AVATAR_HOSTS = %w[avatars.slack-edge.com ca.slack-edge.com].freeze
  THREADS = 6

  module_function

  def token = ENV["SLACK_BOT_TOKEN"].presence

  # ids -> { id => Person } (people Slack doesn't know are left out)
  def people(ids)
    ids = Array(ids).map(&:to_s).select { _1.match?(USER_ID) }.uniq
    return {} if ids.empty? || token.nil?

    found = {}
    missing = ids.reject { |id| (hit = Rails.cache.read(key(id))) && (found[id] = hit) }
    missing.each_slice((missing.size.to_f / THREADS).ceil.clamp(1, 50)).map do |batch|
      Thread.new { batch.to_h { [_1, lookup(_1)] } }
    end.each { |t| found.merge!(t.value) }
    found.select { |_, p| p.is_a?(Person) }
  end

  def key(id) = "slack:person:v1:#{id}"

  def lookup(id)
    body = get("users.info", user: id)
    return :rate_limited if body == :rate_limited # try again next time, don't cache
    unless body&.dig("ok")
      Rails.cache.write(key(id), :none, expires_in: MISS_TTL)
      return :none
    end
    user = body["user"]
    profile = user["profile"] || {}
    person = Person.new(
      id:,
      name: profile["display_name"].presence || user["name"].presence || "someone",
      avatar: user["deleted"] ? nil : slack_avatar(profile["image_72"] || profile["image_48"])
    )
    Rails.cache.write(key(id), person, expires_in: TTL)
    person
  rescue StandardError => e
    Rails.logger.warn("Slack lookup failed for #{id}: #{e.class}: #{e.message}")
    :error
  end

  # Only Slack's own avatar CDN; Gravatar (default pictures) is dropped.
  def slack_avatar(url)
    uri = URI.parse(url.to_s)
    uri.is_a?(URI::HTTPS) && AVATAR_HOSTS.include?(uri.host) ? uri.to_s : nil
  rescue URI::InvalidURIError
    nil
  end

  def get(method, params)
    uri = URI("https://slack.com/api/#{method}?#{URI.encode_www_form(params)}")
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 3, read_timeout: 6) do |http|
      http.request(Net::HTTP::Get.new(uri, "Authorization" => "Bearer #{token}"))
    end
    return :rate_limited if res.code == "429"
    res.is_a?(Net::HTTPSuccess) ? JSON.parse(res.body) : nil
  end
end
