# Shipping grant requests ("Shipping Grants" table), made from the grants tab
# with one click. The request is always for the signed-in printer: their
# record link, Slack ID and email come from their own row.
class ShippingGrantRequest
  S = AirtableConfig::SHIPPING_REQUESTS
  AlreadyPending = Class.new(StandardError)

  class << self
    # The printer's unsent request, if any: { id:, created: } or nil.
    def pending_for(account)
      return nil if account.shipping_request_ids.empty?
      client = AirtableClient.instance
      formula = "OR(#{account.shipping_request_ids.first(40).map { "RECORD_ID()='#{_1}'" }.join(",")})"
      rows, = client.list(S[:table], fields: S.values_at(:printer, :sent, :created), formula:, all_pages: true)
      row = rows.select { Array(_1.dig("fields", S[:printer])).include?(account.id) && !_1.dig("fields", S[:sent]) }
                .max_by { _1.dig("fields", S[:created]).to_s }
      row && { id: row["id"], created: (Time.zone.parse(row.dig("fields", S[:created]).to_s) rescue nil) }
    end

    def create!(account)
      raise AlreadyPending if pending_for(account)
      AirtableClient.instance.create(S[:table], {
        S[:printer] => [account.id],
        S[:slack_id] => account.slack_id,
        S[:hcb_email] => account.email
      }.compact)
    end
  end
end
