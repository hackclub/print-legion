# The "I sent a print" form at /dashboard/send. Checks what the printer
# entered and writes one row to the prints table.
#
# Who the print belongs to never comes from the form: the printer link and
# Slack ID are taken from the signed-in printer's own record, and the shipping
# grant card must be one of the cards issued to them.
class SentPrint
  R = AirtableConfig::PRINTS

  MAX_FILE = 5 * 1024 * 1024 # Airtable's direct-upload limit
  MAX_TOTAL = 60 * 1024 * 1024
  LIMITS = { images: 10, stls: 10, proof: 3 }.freeze

  IMAGE_TYPES = { "png" => "image/png", "jpg" => "image/jpeg", "jpeg" => "image/jpeg", "gif" => "image/gif",
                  "webp" => "image/webp", "heic" => "image/heic" }.freeze
  MODEL_TYPES = { "stl" => "model/stl", "3mf" => "model/3mf", "step" => "model/step", "stp" => "model/step",
                  "obj" => "model/obj", "zip" => "application/zip" }.freeze
  PROOF_TYPES = IMAGE_TYPES.merge("pdf" => "application/pdf").freeze

  SLACK_ID = /\A[UW][A-Z0-9]{8,10}\z/
  MESSAGE_URL = %r{\Ahttps://hackclub\.slack\.com/archives/C083P4FJM46/p\d{10,}(\?\S*)?\z}
  GITHUB_URL = %r{\Ahttps://github\.com/[\w.-]+/[\w.-]+(/\S*)?\z}
  GRANT_URL = %r{\Ahttps://hcb\.hackclub\.com/grants/[A-Za-z0-9]{4,}\z}
  ANY_URL = %r{\Ahttps://[^\s/]+\.[^\s/]+(/\S*)?\z}

  FIELDS = %i[shipping_grant message_url recipient github_url recipient_grant tracking shipping_cost
              country weight program files_location anything_else].freeze

  attr_reader :values, :errors

  # Options a printer can pick from, read live from Airtable (10 min cache).
  def self.choices
    Rails.cache.fetch("schema:prints:choices:v1", expires_in: 10.minutes) do
      fields = AirtableClient.instance.table_schema(R[:table])["fields"]
      pick = ->(id) { Array(fields.find { _1["id"] == id }&.dig("options", "choices")).map { _1["name"] }.compact }
      { countries: pick.(R[:sent_to_country]), programs: pick.(R[:program]) }
    end
  end

  def initialize(account:, grants:, params: {}, files: {})
    @account = account
    @grant_urls = Array(grants).filter_map { _1[:url] }
    @values = FIELDS.to_h { |k| [k, params[k].to_s.strip] }
    @files = { images: uploads(files[:images]), stls: uploads(files[:stls]), proof: uploads(files[:proof]) }
    @errors = {}
  end

  def valid?
    @errors = {}
    v = @values
    choices = self.class.choices

    need(:shipping_grant, @grant_urls.include?(v[:shipping_grant]), "Pick one of your grant cards.")
    need(:message_url, v[:message_url].match?(MESSAGE_URL), "Paste the link to your message in #printing-legion.")
    need(:recipient, v[:recipient].upcase.match?(SLACK_ID), "That doesn't look like a Slack ID (it starts with U).")
    need(:github_url, v[:github_url].length <= 300 && v[:github_url].match?(GITHUB_URL), "Paste the project's GitHub link.")
    need(:recipient_grant, v[:recipient_grant].match?(GRANT_URL), "Paste the recipient's HCB grant link (hcb.hackclub.com/grants/…).")
    need(:tracking, v[:tracking].present? && v[:tracking].length <= 200 && !v[:tracking].match?(%r{https?://|www\.}i),
         "Paste only the tracking number(s), no links.")
    need(:shipping_cost, money?(v[:shipping_cost], max: 500), "Enter the shipping cost in USD, like 4.20.")
    need(:country, choices[:countries].include?(v[:country]), "Pick the destination country.")
    need(:weight, number?(v[:weight], max: 50_000) && v[:weight].to_f.positive?, "Enter the total weight in grams.")
    need(:program, choices[:programs].include?(v[:program]), "Pick the YSWS this print is for.")
    need(:anything_else, v[:anything_else].length <= 2000, "Keep this to 2,000 characters.")
    if v[:files_location].present?
      need(:files_location, v[:files_location].length <= 500 && v[:files_location].match?(ANY_URL), "Paste a full https:// link.")
    end

    check_files(:proof, PROOF_TYPES, required: true, alt_ok: false, label: "shipping proof")
    check_files(:images, IMAGE_TYPES, required: true, alt_ok: true, label: "print photo")
    check_files(:stls, MODEL_TYPES, required: true, alt_ok: true, label: "STL file")
    total = @files.values.flatten.sum(&:size)
    @errors[:files] = "That's over 60 MB of files in total. Link some of them instead." if total > MAX_TOTAL
    @errors.empty?
  end

  # Too-big files the printer picked (names), so the page can ask for a link.
  def oversize = @files.slice(:images, :stls).values.flatten.select { _1.size > MAX_FILE }.map(&:original_filename)

  # Creates the row, then uploads the files. If any upload fails the row is
  # deleted again, so a retry doesn't leave a half-filled duplicate.
  def save!
    client = AirtableClient.instance
    v = @values
    fields = {
      R[:printer] => [@account.id],
      R[:slack_id] => @account.slack_id,
      R[:shipping_grant] => v[:shipping_grant],
      R[:message_url] => v[:message_url],
      R[:recipient] => v[:recipient].upcase,
      R[:github_url] => v[:github_url],
      R[:recipient_grant] => v[:recipient_grant],
      R[:tracking] => v[:tracking],
      R[:shipping_cost] => v[:shipping_cost].to_f.round(2),
      R[:sent_to_country] => v[:country],
      R[:weight_grams] => v[:weight].to_f,
      R[:program] => v[:program],
      R[:anything_else] => v[:anything_else].presence,
      R[:files_location] => v[:files_location].presence
    }.compact
    record = client.create(R[:table], fields)
    begin
      jobs = { R[:shipping_proof] => [:proof, PROOF_TYPES], R[:print_image] => [:images, IMAGE_TYPES],
               R[:stl_file] => [:stls, MODEL_TYPES] }.flat_map do |field, (kind, types)|
        @files[kind].select { _1.size <= MAX_FILE }.map do |file|
          -> { client.upload_attachment(record["id"], field, content_type: types.fetch(ext(file)), filename: safe_name(file), data: file.read) }
        end
      end
      jobs.each_slice(3) { client.parallel(*_1) } # stay under Airtable's 5 requests/second
    rescue StandardError
      client.destroy(R[:table], record["id"]) rescue nil
      raise
    end
    record["id"]
  end

  private

  def need(key, ok, message) = (@errors[key] ||= message unless ok)

  def money?(s, max:) = s.match?(/\A\d{1,4}(\.\d{1,2})?\z/) && s.to_f <= max
  def number?(s, max:) = s.match?(/\A\d{1,6}(\.\d{1,2})?\z/) && s.to_f <= max

  def uploads(list) = Array(list).select { _1.respond_to?(:original_filename) && _1.size.positive? }

  def ext(file) = File.extname(file.original_filename.to_s).delete(".").downcase

  def safe_name(file)
    base = File.basename(file.original_filename.to_s).gsub(/[^\w.\- ]/, "_")
    base.presence&.slice(0, 120) || "file.#{ext(file)}"
  end

  def check_files(kind, types, required:, alt_ok:, label:)
    files = @files[kind]
    if files.size > LIMITS[kind]
      return @errors[kind] = "Attach at most #{LIMITS[kind]} #{label.pluralize}."
    end
    if (bad = files.find { !types.key?(ext(_1)) })
      return @errors[kind] = "#{bad.original_filename} isn't a #{types.keys.join(", ")} file."
    end
    big = files.select { _1.size > MAX_FILE }
    if big.any? && !alt_ok
      return @errors[kind] = "#{big.map(&:original_filename).to_sentence} is over 5 MB. Upload a smaller copy."
    end
    if big.any? && @values[:files_location].blank?
      return @errors[:files_location] = "#{big.map(&:original_filename).to_sentence} #{big.size == 1 ? "is" : "are"} over 5 MB. " \
                                        "Put #{big.size == 1 ? "it" : "them"} somewhere online (a GitHub folder works) and paste the link here."
    end
    if required && (files - big).empty? && @values[:files_location].blank?
      @errors[kind] = "Attach at least one #{label}#{alt_ok ? ", or link where they are below" : ""}."
    end
  end
end
