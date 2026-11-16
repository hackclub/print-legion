# The signed-in printer's own record: lookup at sign-in, the dashboard and
# stats views, and the few fields they may change.
#
# Every method here takes the record ID the controller got from the session
# (set at sign-in from Hack Club Auth). Nothing in a request's params can
# choose which record is read or written.
class PrinterAccount
  P = AirtableConfig::PRINTERS
  R = AirtableConfig::PRINTS

  Account = Struct.new(:id, :name, :avatar, :email, :country, :active,
                       :total_grams, :print_ids, :grant_ids, keyword_init: true)
  Invalid = Class.new(StandardError) # message is safe to show the printer

  NAME_MAX = 40
  AVATAR_MAX_BYTES = 5 * 1024 * 1024 # Airtable's upload limit
  AVATAR_TYPES = {
    "image/png" => ["png", "\x89PNG\r\n\x1A\n".b],
    "image/jpeg" => ["jpg", "\xFF\xD8\xFF".b],
    "image/gif" => ["gif", "GIF8".b],
    "image/webp" => ["webp", nil] # RIFF....WEBP, checked below
  }.freeze
  SLACK_ID = /\A[UW][A-Z0-9]{6,20}\z/
  EMAIL_MAX = 254

  class << self
    def client = AirtableClient.instance

    # ---- sign-in -------------------------------------------------------------

    # Hack Club Auth identity -> printer record ID (or nil). Slack ID first;
    # the account email only when there's no Slack ID match.
    def record_id_for(identity)
      by_slack(identity.slack_id) || by_email(identity.email)
    end

    # ---- reading ---------------------------------------------------------------

    def load(id)
      fields = P.values_at(:display_name, :profile_picture, :email, :country, :active, :total_grams, :prints, :grants)
      rec = client.find(P[:table], id, fields:)
      f = rec["fields"]
      avatar = Array(f[P[:profile_picture]]).last
      Account.new(
        id: rec["id"],
        name: f[P[:display_name]].to_s.strip.presence || "printer",
        avatar: avatar&.dig("thumbnails", "large", "url") || avatar&.dig("url"),
        email: f[P[:email]].presence,
        country: f[P[:country]].presence,
        active: !!f[P[:active]],
        total_grams: f[P[:total_grams]].to_f,
        # Only plain IDs reach the formula below (letters and digits, nothing to escape).
        print_ids: Array(f[P[:prints]]).grep(/\Arec[A-Za-z0-9]{1,30}\z/),
        grant_ids: Array(f[P[:grants]]).grep(/\Arec[A-Za-z0-9]{1,30}\z/)
      )
    end

    # The printer's prints, newest first, fetched 40 IDs at a time in parallel.
    def prints(account)
      fields = R.values_at(:created, :program, :print_image, :sent_to_country, :weight_grams, :tracking,
                           :shipping_cost, :approved, :duplicate, :shipping_grant, :message_url, :printer)
      jobs = account.print_ids.each_slice(40).map do |ids|
        formula = "OR(#{ids.map { "RECORD_ID()='#{_1}'" }.join(",")})"
        -> { client.list(R[:table], fields:, formula:, all_pages: true).first }
      end
      records = jobs.any? ? client.parallel(*jobs).flatten : []
      # Belt and braces: only rows that really link back to this printer.
      records.select { Array(_1.dig("fields", R[:printer])).include?(account.id) }.map do |rec|
        f = rec["fields"]
        image = Array(f[R[:print_image]]).find { |a| a["thumbnails"].present? || a["type"].to_s.start_with?("image/") }
        {
          id: rec["id"],
          created: (Time.zone.parse(f[R[:created]].to_s) rescue nil),
          event: f[R[:program]].presence,
          country: PrinterDirectory.normalize_country(f[R[:sent_to_country]]),
          grams: f[R[:weight_grams]].to_f,
          tracking: f[R[:tracking]].to_s.strip.presence,
          shipping: f[R[:shipping_cost]].to_f,
          approved: !!f[R[:approved]],
          duplicate: !!f[R[:duplicate]],
          grant_url: safe_url(f[R[:shipping_grant]]),
          message_url: safe_url(f[R[:message_url]]),
          image: image && (image.dig("thumbnails", "large", "url") || image["url"])
        }
      end.sort_by { -(_1[:created]&.to_i || 0) }
    end

    # ---- writing (all scoped to the session's record) ----------------------------

    def update_name(id, raw)
      name = raw.to_s.unicode_normalize(:nfc).gsub(/[[:cntrl:]]/, "").squish
      raise Invalid, "Your name can't be empty." if name.empty?
      raise Invalid, "Keep your name to #{NAME_MAX} characters." if name.length > NAME_MAX
      current = client.find(P[:table], id, fields: [P[:display_name]]).dig("fields", P[:display_name]).to_s.strip
      return nil if current == name # unchanged: no write

      client.update(P[:table], id, P[:display_name] => name)
      expire_public_profiles
      name
    end

    # Replaces the profile picture with an uploaded file (ActionDispatch upload).
    def update_avatar(id, upload)
      raise Invalid, "Pick a picture to upload." unless upload.respond_to?(:read)
      raise Invalid, "That picture is over 5 MB." if upload.size > AVATAR_MAX_BYTES
      data = upload.read
      type, ext = sniff_image(data)
      raise Invalid, "Use a PNG, JPG, GIF or WebP picture." unless type

      before = Array(client.find(P[:table], id).dig("fields", P[:profile_picture])).map { _1["id"] }
      rec = client.upload_attachment(id, P[:profile_picture], content_type: type, filename: "avatar-#{Time.now.to_i}.#{ext}", data:)
      fresh = Array(rec.dig("fields", P[:profile_picture])).reject { before.include?(_1["id"]) }.last
      raise Invalid, "Airtable didn't take the picture. Try again?" unless fresh
      # Keep only the new picture.
      client.update(P[:table], id, P[:profile_picture] => [{ "id" => fresh["id"] }])
      expire_public_profiles
    end

    # The printer's email, which is also their HCB email (grants go there).
    # Two printers can't share one: it's also how sign-in finds someone with
    # no Slack ID on their Hack Club account.
    def update_email(id, raw)
      email = raw.to_s.strip.downcase
      unless email.length <= EMAIL_MAX && email.match?(URI::MailTo::EMAIL_REGEXP)
        raise Invalid, "That doesn't look like an email address."
      end
      owner = by_email(email)
      return email if owner == id # already theirs
      raise Invalid, "Another printer already uses that email." if owner

      client.update(P[:table], id, P[:email] => email)
      email
    end

    private

    def by_slack(slack_id)
      return unless slack_id.to_s.match?(SLACK_ID)
      match(%({#{P[:slack_id_name]}}='#{slack_id}'), P[:slack_id]) { _1 == slack_id }
    end

    def by_email(email)
      email = email.to_s.strip.downcase
      return unless email.length <= EMAIL_MAX && email.match?(URI::MailTo::EMAIL_REGEXP)
      match(%(LOWER({#{P[:email_name]}})='#{formula_string(email)}'), P[:email]) { _1.to_s.strip.downcase == email }
    end

    # The formula narrows it down; the block re-checks each row in Ruby. Active
    # rows win if a person somehow has more than one.
    def match(formula, field)
      records, = client.list(P[:table], fields: [field, P[:active]], formula:, page_size: 10)
      hits = records.select { yield _1.dig("fields", field) }
      (hits.find { _1.dig("fields", P[:active]) } || hits.first)&.dig("id")
    end

    def formula_string(s) = s.gsub("\\", "\\\\\\\\").gsub("'", "\\\\'")

    def sniff_image(data)
      AVATAR_TYPES.each do |type, (ext, magic)|
        ok = magic ? data.start_with?(magic) : (data.byteslice(0, 4) == "RIFF".b && data.byteslice(8, 4) == "WEBP".b)
        return [type, ext] if ok
      end
      nil
    end

    def safe_url(raw)
      url = raw.to_s.strip
      url.match?(%r{\Ahttps://[^\s]+\z}) ? url : nil
    end

    # The public printers list caches profiles for hours; show changes now.
    def expire_public_profiles = Rails.cache.delete("profiles:v1")
  end
end
