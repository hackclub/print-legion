require "net/http"
require "json"

# Can this printer take prints right now? Two checks:
#
#   * Hackatime status on their printer row (red = no)
#   * YSWS eligibility from Hack Club Auth's public check endpoint
#     (anything other than "verified_eligible" = no)
#
# A failing check locks the printer: the dashboard switches them inactive and
# won't let them switch back on until both checks pass again.
class Eligibility
  CHECK_TTL = 10.minutes
  IDENT_ID = /\Aident![A-Za-z0-9_-]{1,64}\z/
  SLACK_ID = /\A[UW][A-Z0-9]{6,20}\z/

  YSWS = {
    "verified_eligible" => ["verified", "You're verified and eligible."],
    "verified_but_over_18" => ["over 18", "Hack Club Auth says you're over 18, so you're not YSWS-eligible."],
    "rejected" => ["rejected", "Your identity verification was rejected on Hack Club Auth."],
    "pending" => ["pending", "Your identity verification is still being reviewed."],
    "needs_submission" => ["not submitted", "You haven't submitted identity verification on Hack Club Auth yet."],
    "not_found" => ["no account found", "We couldn't find a Hack Club Auth account for you."],
    "unknown" => ["unknown", "Hack Club Auth returned a status we don't recognise."]
  }.freeze

  Result = Struct.new(:hackatime, :ysws, keyword_init: true) do
    def hackatime_ok? = hackatime != "red"
    def ysws_ok? = ysws == "verified_eligible"
    def ysws_checked? = ysws != :unreachable
    # Locked: a check failed. Unreachable HCA doesn't lock (or unlock) anyone.
    def locked? = !hackatime_ok? || (ysws_checked? && !ysws_ok?)
    # Switching active ON needs both checks to positively pass.
    def can_activate? = hackatime_ok? && ysws_ok?
    def ysws_label = ysws_checked? ? (YSWS[ysws] || YSWS["unknown"]).first : "couldn't check"
    def ysws_note = ysws_checked? ? (YSWS[ysws] || YSWS["unknown"]).last : "Hack Club Auth didn't answer. We'll check again next time."
    def reasons
      [("Hackatime status is red" unless hackatime_ok?),
       ("YSWS eligibility is #{ysws_label}" if ysws_checked? && !ysws_ok?)].compact
    end
  end

  class << self
    # hca_id: the Hack Club Auth identity ID saved at sign-in (falls back to
    # the printer's Slack ID for sessions from before it was saved).
    def for(account, hca_id:)
      Result.new(hackatime: account.hackatime, ysws: ysws_result(hca_id, account.slack_id))
    end

    private

    def ysws_result(hca_id, slack_id)
      if Rails.env.development? && (forced = ENV["DEV_YSWS_RESULT"].presence)
        return forced # try the locked dashboard without a real account
      end
      query = if hca_id.to_s.match?(IDENT_ID) then { idv_id: hca_id }
              elsif slack_id.to_s.match?(SLACK_ID) then { slack_id: }
              end
      return "not_found" unless query

      key = "eligibility:ysws:#{query.values.first}"
      Rails.cache.read(key) || fetch(query).tap { Rails.cache.write(key, _1, expires_in: CHECK_TTL) unless _1 == :unreachable }
    end

    def fetch(query)
      uri = URI.join(HackClubAuthConfig::HOST, "/api/external/check?#{URI.encode_www_form(query)}")
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 3, read_timeout: 5) do |http|
        http.request(Net::HTTP::Get.new(uri, "Accept" => "application/json"))
      end
      return :unreachable unless res.is_a?(Net::HTTPSuccess)
      result = JSON.parse(res.body)["result"].to_s
      YSWS.key?(result) ? result : "unknown"
    rescue StandardError => e
      Rails.logger.warn("Eligibility check failed: #{e.class}: #{e.message}")
      :unreachable
    end
  end
end
