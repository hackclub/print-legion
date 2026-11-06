class PagesController < ApplicationController
  GUIDES = { "requesters" => "Guide for Requesters", "printers" => "Guide for Printers", "organizers" => "Guide for Event Organizers" }.freeze

  def home
    # The country count comes from live stats (see app.js), not from the server.
  end

  def docs
    @guide = params[:guide]
    @guides = GUIDES
  end
end
