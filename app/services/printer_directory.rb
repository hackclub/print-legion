# Everything the site reads from Airtable, split by how fresh it needs to be.
#
#   profiles      names, bios, countries, links, avatars -> cached (hours)
#   stats         prints + grams per printer, totals     -> live (15s shared window)
#   recent_prints newest approved prints with photos     -> live (15s shared window)
#
# Only printers ticked "active?" are exposed: inactive ones get no profile,
# no rank and no name on their prints. Program totals (kgs, spools,
# projects) still count everything ever printed.
class PrinterDirectory
  Profile = Struct.new(:id, :name, :country, :website, :slack_id, :bio, :avatar, keyword_init: true)

  P = AirtableConfig::PRINTERS
  R = AirtableConfig::PRINTS

  # Record IDs are random base62, so splitting on the 4th character spreads
  # rows evenly; each partition is fetched in parallel instead of paging.
  PROFILE_PARTITIONS = %w[^rec[0-9A-F] ^rec[G-V] ^rec[W-Za-f] ^rec[g-z]].freeze
  STATS_PARTITION = "^rec[0-9A-Za-f]".freeze
  GRAMS_PER_SPOOL = 750.0
  # Airtable spellings that should count as the same country as the usual name.
  COUNTRY_ALIASES = { "korea, south" => "South Korea" }.freeze

  class << self
    def client = AirtableClient.instance

    # ---- cached -----------------------------------------------------------

    def profiles
      cached = Rails.cache.read("profiles:v1")
      return cached if cached

      fresh = fetch_profiles
      Rails.cache.write("profiles:v1", fresh, expires_in: profile_ttl(fresh))
      fresh
    end

    def countries
      profiles.values.map(&:country).compact.tally.sort_by { |name, n| [-n, name] }.map(&:first)
    end

    # ---- live -------------------------------------------------------------

    def stats
      Rails.cache.fetch("live:stats:v1", expires_in: AirtableConfig::LIVE_TTL, race_condition_ttl: 5) do
        fetch_stats
      end
    end

    # photos_only: the home page strips only show real photos; the prints tab
    # shows every print and uses a placeholder where there's no photo.
    def recent_prints(limit: 20, offset: nil, photos_only: false)
      key = "live:prints:v2:#{limit}:#{offset}:#{photos_only}"
      Rails.cache.fetch(key, expires_in: AirtableConfig::LIVE_TTL, race_condition_ttl: 5) do
        fetch_prints(limit, offset, photos_only)
      end
    end

    # Both live calls at once: one round trip for the browser, ~one for us.
    def live(prints_limit: nil)
      jobs = [-> { stats }]
      jobs << -> { recent_prints(limit: prints_limit, photos_only: true) } if prints_limit
      stats_data, prints_data = client.parallel(*jobs)
      { stats: stats_data, prints: prints_data }.compact
    end

    private

    def fetch_profiles
      fields = P.values_at(:display_name, :profile_picture, :country, :website, :bio, :slack_id, :active)
      batches = client.parallel(*PROFILE_PARTITIONS.map { |re|
        -> { client.list(P[:table], fields:, formula: %(AND({active?}, REGEX_MATCH(RECORD_ID(), "#{re}"))), all_pages: true).first }
      })
      batches.flatten.uniq { _1["id"] }.select { _1["fields"][P[:active]] }.to_h do |rec|
        f = rec["fields"]
        avatar = Array(f[P[:profile_picture]]).first
        [rec["id"], Profile.new(
          id: rec["id"],
          name: f[P[:display_name]].to_s.strip.presence || "printer",
          country: f[P[:country]].presence,
          website: normalize_url(f[P[:website]]),
          slack_id: f[P[:slack_id]].to_s.strip.presence,
          bio: f[P[:bio]].to_s.strip,
          avatar: avatar&.dig("thumbnails", "large", "url") || avatar&.dig("url")
        )]
      end
    end

    def fetch_stats
      fields = P.values_at(:total_grams, :prints, :active)
      country_fields = [R[:sent_to_country]]
      batches = client.parallel(
        -> { client.list(P[:table], fields:, formula: %(AND({prints}, REGEX_MATCH(RECORD_ID(), "#{STATS_PARTITION}"))), all_pages: true).first },
        -> { client.list(P[:table], fields:, formula: %(AND({prints}, NOT(REGEX_MATCH(RECORD_ID(), "#{STATS_PARTITION}")))), all_pages: true).first },
        # Every print, not just approved ones, so the country count matches the project totals.
        -> { client.list(R[:table], fields: country_fields, formula: %(REGEX_MATCH(RECORD_ID(), "#{STATS_PARTITION}")), all_pages: true).first },
        -> { client.list(R[:table], fields: country_fields, formula: %(NOT(REGEX_MATCH(RECORD_ID(), "#{STATS_PARTITION}"))), all_pages: true).first }
      )
      printer_batches, print_batches = batches.each_slice(2).to_a
      everyone = printer_batches.flatten.uniq { _1["id"] }.to_h do |rec|
        f = rec["fields"]
        [rec["id"], { "prints" => Array(f[P[:prints]]).size, "grams" => f[P[:total_grams]].to_f.round(1), "active" => !!f[P[:active]] }]
      end
      active = everyone.select { |_, s| s["active"] }.transform_values { _1.except("active") }

      # A printer became active since profiles were cached: refresh on next view.
      cached = Rails.cache.read("profiles:v1")
      Rails.cache.delete("profiles:v1") if cached && (active.keys - cached.keys).any?

      grams = everyone.values.sum { _1["grams"] }
      {
        "kgs" => (grams / 1000).round(2),
        "spools" => (grams / GRAMS_PER_SPOOL).floor,
        "projects" => everyone.values.sum { _1["prints"] },
        "countries" => count_countries(print_batches.flatten),
        "printers" => active
      }
    end

    # Distinct, trimmed country names across all prints. Blank cells are skipped.
    def count_countries(rows)
      rows.flat_map { Array(_1["fields"]&.dig(R[:sent_to_country])) }
          .map { _1.to_s.strip }.reject(&:empty?)
          .map { |c| COUNTRY_ALIASES.fetch(c.downcase, c) }
          .uniq(&:downcase).size
    end

    def fetch_prints(limit, offset, photos_only)
      base = "{approved?}, NOT({duplicate?})"
      base = "{print_image}, #{base}" if photos_only
      query = ->(formula) {
        client.list(R[:table], fields: R.values_at(:print_image, :printer, :created, :program), formula:,
                    sort: [[R[:created], "desc"]], page_size: limit, offset:)
      }
      records, next_offset = begin
        query.call("AND(#{base}, NOT({#{R[:exclude_name]}}))")
      rescue AirtableClient::Error => e
        # The exclude checkbox column hasn't been created (or was renamed): keep the feed up.
        raise unless e.message.match?(/INVALID_FILTER_BY_FORMULA|UNKNOWN_FIELD/)
        Rails.logger.warn("Prints: no '#{R[:exclude_name]}' column, showing all approved prints")
        query.call("AND(#{base})")
      end
      people = profiles
      items = records.filter_map do |rec|
        f = rec["fields"]
        # First real picture. People sometimes drop STL/STEP/zip/video files (or a
        # saved HTML page named .jpg) into this column; those have no thumbnails
        # and aren't images. nil -> the page shows a placeholder.
        image = Array(f[R[:print_image]]).find { |a| a["thumbnails"].present? || a["type"].to_s.start_with?("image/") }
        next if photos_only && !image
        thumb = image && (image.dig("thumbnails", "large") || image)
        printer = people[Array(f[R[:printer]]).first] # nil for inactive printers
        {
          "id" => rec["id"],
          "src" => thumb&.dig("url"),
          "w" => thumb && (thumb["width"] || image["width"]),
          "h" => thumb && (thumb["height"] || image["height"]),
          "printer" => printer&.name,
          "printer_id" => printer&.id,
          "avatar" => printer&.avatar,
          "event" => f[R[:program]].presence
        }
      end
      { "items" => items, "next" => next_offset }
    end

    # Airtable attachment URLs are signed and expire; the expiry (ms) is part
    # of the path. Never keep profiles past the earliest avatar expiry.
    def profile_ttl(profiles)
      expiries = profiles.values.filter_map { |p| p.avatar.to_s[%r{/v\d+/u/\d+/\d+/(\d{13})/}, 1]&.to_i }
      ttl = AirtableConfig::PROFILE_TTL
      if (soonest = expiries.min)
        ttl = [ttl, soonest / 1000 - Time.now.to_i - 600].min
      end
      ttl.clamp(300, AirtableConfig::PROFILE_TTL)
    end

    def normalize_url(raw)
      url = raw.to_s.strip
      return nil if url.blank? || url.include?(" ")
      url.match?(%r{\Ahttps?://}i) ? url : "https://#{url}"
    end
  end
end
