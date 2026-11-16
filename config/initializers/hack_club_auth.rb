# Hack Club Auth (https://auth.hackclub.com/docs/oauth-guide) signs printers in
# to their dashboard. Register the callback URL on the app:
#   http://localhost:3000/oauth/callback        (development)
#   https://printlegion.hackclub.com/oauth/callback (production)
# The app needs the `email` and `slack_id` scopes.
module HackClubAuthConfig
  HOST = ENV["HCA_HOST"].presence || "https://auth.hackclub.com"
  CLIENT_ID = ENV["HCA_CLIENT_ID"].presence
  CLIENT_SECRET = ENV["HCA_CLIENT_SECRET"].presence
  SCOPES = ENV["HCA_SCOPES"].presence || "email slack_id"
  # Leave unset to use <this site>/oauth/callback.
  REDIRECT_URI = ENV["HCA_REDIRECT_URI"].presence

  def self.configured? = CLIENT_ID.present? && CLIENT_SECRET.present?
end
