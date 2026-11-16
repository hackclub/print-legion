require "net/http"
require "json"

# OAuth client for Hack Club Auth. Only used at sign-in: we swap the code for
# an access token, read who the person is, and then forget the token. Nothing
# from Hack Club Auth is stored apart from the printer record it matched.
module HackClubAuth
  Error = Class.new(StandardError)
  Identity = Struct.new(:id, :slack_id, :email, keyword_init: true)

  module_function

  def authorize_url(state:, redirect_uri:)
    query = URI.encode_www_form(
      client_id: HackClubAuthConfig::CLIENT_ID,
      redirect_uri:,
      response_type: "code",
      scope: HackClubAuthConfig::SCOPES,
      state:
    )
    "#{HackClubAuthConfig::HOST}/oauth/authorize?#{query}"
  end

  # code -> Identity. Raises Error on anything unexpected.
  def identify(code:, redirect_uri:)
    token = post_form("/oauth/token",
      client_id: HackClubAuthConfig::CLIENT_ID,
      client_secret: HackClubAuthConfig::CLIENT_SECRET,
      redirect_uri:,
      code:,
      grant_type: "authorization_code")["access_token"]
    raise Error, "no access token" if token.blank?

    me = get_json("/api/v1/me", token).fetch("identity", {})
    raise Error, "no identity" if me["id"].blank?
    Identity.new(id: me["id"], slack_id: me["slack_id"].presence, email: me["primary_email"].presence)
  end

  def post_form(path, params)
    uri = URI.join(HackClubAuthConfig::HOST, path)
    req = Net::HTTP::Post.new(uri)
    req["Accept"] = "application/json"
    req.set_form_data(params)
    parse(http(uri) { _1.request(req) })
  end

  def get_json(path, token)
    uri = URI.join(HackClubAuthConfig::HOST, path)
    req = Net::HTTP::Get.new(uri)
    req["Accept"] = "application/json"
    req["Authorization"] = "Bearer #{token}"
    parse(http(uri) { _1.request(req) })
  end

  def http(uri, &)
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 5, read_timeout: 10, &)
  end

  def parse(response)
    raise Error, "Hack Club Auth #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  rescue JSON::ParserError
    raise Error, "Hack Club Auth sent something that isn't JSON"
  end
end
