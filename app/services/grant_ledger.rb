# Grants issued to a printer, matched on their HCB email, from the grants
# table configured in AirtableConfig::GRANTS (by field name).
#
# Until the table is set, `for_email` returns a :not_configured result and the
# stats page says grants are on the way. A misnamed field returns :error with
# the Airtable message logged, rather than breaking the page.
class GrantLedger
  G = AirtableConfig::GRANTS
  Result = Struct.new(:status, :grants, keyword_init: true) do
    def total = grants.sum { _1[:amount].to_f }
  end

  class << self
    def configured? = G[:table].present?

    def for_email(email)
      return Result.new(status: :not_configured, grants: []) unless configured?
      email = email.to_s.strip.downcase
      return Result.new(status: :ok, grants: []) unless email.match?(URI::MailTo::EMAIL_REGEXP)

      formula = %(LOWER({#{G[:email]}})='#{email.gsub("\\", "\\\\\\\\").gsub("'", "\\\\'")}')
      records, = AirtableClient.instance.list(G[:table], fields: G.values_at(:email, :amount, :date, :purpose, :link),
                                              formula:, all_pages: true, by_field_id: false)
      grants = records.filter_map do |rec|
        f = rec["fields"]
        next unless f[G[:email]].to_s.strip.downcase == email # re-check in Ruby
        link = f[G[:link]].to_s.strip
        {
          amount: f[G[:amount]].to_f,
          date: (Date.parse(f[G[:date]].to_s) rescue nil),
          purpose: f[G[:purpose]].to_s.strip.presence,
          link: link.match?(%r{\Ahttps://\S+\z}) ? link : nil
        }
      end
      Result.new(status: :ok, grants: grants.sort_by { _1[:date] || Date.new(1970) }.reverse)
    rescue AirtableClient::Error => e
      Rails.logger.warn("Grants: #{e.message}")
      Result.new(status: :error, grants: [])
    end
  end
end
