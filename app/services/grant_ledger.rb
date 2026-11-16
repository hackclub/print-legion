# HCB grant cards issued to a printer, from the "Grants Issued" table. Each
# grant links to its printer, and the printer row links back, so a printer's
# grants are read through their own record (never by email or by a param).
class GrantLedger
  G = AirtableConfig::GRANTS

  class << self
    # [{ purpose:, amount:, url:, issued: }], newest first. Raises AirtableClient::Error.
    def for_account(account)
      client = AirtableClient.instance
      jobs = account.grant_ids.each_slice(40).map do |ids|
        formula = "OR(#{ids.map { "RECORD_ID()='#{_1}'" }.join(",")})"
        -> { client.list(G[:table], fields: G.values_at(:card_url, :printer, :purpose, :amount, :issued), formula:, all_pages: true).first }
      end
      records = jobs.any? ? client.parallel(*jobs).flatten : []
      records.select { Array(_1.dig("fields", G[:printer])).include?(account.id) }.map do |rec|
        f = rec["fields"]
        url = f[G[:card_url]].to_s.strip
        {
          purpose: f[G[:purpose]].to_s.strip.presence,
          amount: f[G[:amount]]&.to_f,
          url: url.match?(%r{\Ahttps://\S+\z}) ? url : nil,
          issued: (Date.iso8601(f[G[:issued]].to_s) rescue nil)
        }
      end.sort_by { |g| [g[:issued] || Date.new(1970), g[:amount].to_f] }.reverse
    end
  end
end
