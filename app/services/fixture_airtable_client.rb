# Stand-in for AirtableClient when AIRTABLE_API_KEY isn't set (local dev).
# Reads Airtable-shaped records from db/fixtures/<table_id>.json and ignores
# formulas, so the UI can be worked on offline. Writes are kept in memory for
# the life of the process, so the dashboard can be tried without a token.
class FixtureAirtableClient
  EDITS = Hash.new { |h, k| h[k] = {} } # table => { record_id => fields }
  CREATED = Hash.new { |h, k| h[k] = [] } # table => [records made in this process]
  LOCK = Mutex.new

  def list(table, fields:, formula: nil, sort: nil, page_size: 100, max_records: nil, offset: nil, all_pages: false, by_field_id: true)
    sleep 0.25 # roughly a real round trip, so the loader is visible in dev
    records = load(table)
    return [records, nil] if all_pages

    start = offset.to_i
    page = records[start, page_size] || []
    next_offset = start + page_size < records.size ? (start + page_size).to_s : nil
    [page, next_offset]
  end

  def find(table, id, fields: nil)
    load(table).find { _1["id"] == id } or raise AirtableClient::Error, "Airtable 404: NOT_FOUND"
  end

  def update(table, id, fields)
    current = find(table, id)["fields"]
    # Like Airtable: [{ "id" => "att…" }] keeps those existing attachments.
    fields = fields.to_h do |k, v|
      if v.is_a?(Array) && v.all? { _1.is_a?(Hash) && _1.keys.map(&:to_s) == ["id"] }
        have = Array(current[k.to_s])
        [k, v.filter_map { |a| have.find { _1["id"] == (a["id"] || a[:id]) } }]
      else
        [k, v]
      end
    end
    LOCK.synchronize { EDITS[table][id] = (EDITS[table][id] || {}).merge(fields.transform_keys(&:to_s)) }
    find(table, id)
  end

  # Keeps the picture as a data URL so the page can show it straight away.
  def upload_attachment(id, field, content_type:, filename:, data:)
    table = [AirtableConfig::PRINTERS[:table], AirtableConfig::PRINTS[:table]].find { |t| load(t).any? { _1["id"] == id } } or
      raise AirtableClient::Error, "Airtable 404: NOT_FOUND"
    url = "data:#{content_type};base64,#{Base64.strict_encode64(data)}"
    current = Array(find(table, id).dig("fields", field))
    att = { "id" => "att#{SecureRandom.alphanumeric(14)}", "url" => url, "filename" => filename, "type" => content_type }
    update(table, id, field => current + [att])
  end

  def create(table, fields)
    id = "rec#{SecureRandom.alphanumeric(14)}"
    rec = { "id" => id, "createdTime" => Time.now.utc.iso8601, "fields" => fields.transform_keys(&:to_s) }
    LOCK.synchronize { CREATED[table] << rec }
    rec
  end

  def destroy(table, id)
    LOCK.synchronize { CREATED[table].reject! { _1["id"] == id } }
    { "id" => id, "deleted" => true }
  end

  # Offline stand-in for the meta API: select choices are the values already
  # used in the fixture records.
  def table_schema(table)
    fields = load(table).flat_map { _1["fields"].to_a }.group_by(&:first).map do |id, pairs|
      names = pairs.map(&:last).select { _1.is_a?(String) }.uniq.sort
      { "id" => id, "type" => "singleSelect", "options" => { "choices" => names.map { { "name" => _1 } } } }
    end
    { "id" => table, "fields" => fields }
  end

  def parallel(*jobs)
    threads = jobs.map { |job| Thread.new { Rails.application.executor.wrap { job.call } } }
    ActiveSupport::Dependencies.interlock.permit_concurrent_loads { threads.map(&:value) }
  end

  private

  def load(table)
    path = Rails.root.join("db/fixtures/#{table}.json")
    records = path.exist? ? JSON.parse(File.read(path)) : []
    edits = LOCK.synchronize { EDITS[table].dup }
    records += LOCK.synchronize { CREATED[table].dup }
    records.map { |r| edits[r["id"]] ? r.merge("fields" => r["fields"].merge(edits[r["id"]])) : r }
  end
end
