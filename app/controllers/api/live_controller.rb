module Api
  class LiveController < ApplicationController
    MAX_PRINTS = 40

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
      render_json PrinterDirectory.recent_prints(limit:, offset: params[:offset].presence)
    end

    private

    def render_json(data)
      response.headers["Cache-Control"] = "public, max-age=#{AirtableConfig::LIVE_TTL}"
      render json: data
    end
  end
end
