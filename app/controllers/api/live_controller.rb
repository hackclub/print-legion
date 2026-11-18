module Api
  class LiveController < ApplicationController
    MAX_PRINTS = 40
    # Airtable page offsets look like "<17 chars>/<17 chars>". Anything else
    # would only cost an Airtable request (and its 5/second limit) to reject.
    OFFSET = %r{\A[A-Za-z0-9]{17}/[A-Za-z0-9]{17}\z}
    FIXTURE_OFFSET = /\A\d{1,6}\z/ # the offline fixture client pages by index

    # Per visitor. The pages call these once per view or scroll, so this only
    # bites scripts (and keeps one of them from using up the Airtable quota).
    rate_limit to: 120, within: 1.minute,
               with: -> { render json: { error: "too many requests" }, status: :too_many_requests }

    rescue_from AirtableClient::Error do |e|
      Rails.logger.warn(e.message)
      render json: { error: "airtable unavailable" }, status: :bad_gateway
    end

    # GET /api/live?prints=7
    def show
      limit = params[:prints].presence&.to_i&.clamp(1, MAX_PRINTS)
      render_json PrinterDirectory.live(prints_limit: limit)
    end

    # GET /api/prints?limit=20&offset=...
    def prints
      limit = params.fetch(:limit, 20).to_i.clamp(1, MAX_PRINTS)
      offset = params[:offset].presence
      unless offset.nil? || valid_offset?(offset)
        return render json: { error: "bad offset" }, status: :bad_request
      end
      render_json PrinterDirectory.recent_prints(limit:, offset:)
    end

    private

    def valid_offset?(offset)
      return false unless offset.is_a?(String)
      offset.match?(OFFSET) || (AirtableClient.instance.is_a?(FixtureAirtableClient) && offset.match?(FIXTURE_OFFSET))
    end

    def render_json(data)
      response.headers["Cache-Control"] = "public, max-age=#{AirtableConfig::LIVE_TTL}"
      render json: data
    end
  end
end
