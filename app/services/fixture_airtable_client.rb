# Stand-in for AirtableClient when AIRTABLE_API_KEY isn't set (local dev).
# Reads Airtable-shaped records from db/fixtures/<table_id>.json and ignores
# formulas, so the UI can be worked on offline.
class FixtureAirtableClient
  def list(table, fields:, formula: nil, sort: nil, page_size: 100, max_records: nil, offset: nil, all_pages: false)
    sleep 0.25 # roughly a real round trip, so the loader is visible in dev
    records = JSON.parse(File.read(Rails.root.join("db/fixtures/#{table}.json")))
    return [records, nil] if all_pages

    start = offset.to_i
    page = records[start, page_size] || []
    next_offset = start + page_size < records.size ? (start + page_size).to_s : nil
    [page, next_offset]
  end

  def parallel(*jobs)
    threads = jobs.map { |job| Thread.new { Rails.application.executor.wrap { job.call } } }
    ActiveSupport::Dependencies.interlock.permit_concurrent_loads { threads.map(&:value) }
  end
end
