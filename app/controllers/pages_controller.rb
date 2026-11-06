class PagesController < ApplicationController
  GUIDES = { "requesters" => "Guide for Requesters", "printers" => "Guide for Printers", "organizers" => "Guide for Event Organizers" }.freeze

  def home
    @countries = PrinterDirectory.countries.size # cached with profiles
  end

  def docs
    @guide = params[:guide]
    @guides = GUIDES
  end
end
