class PrintersController < ApplicationController
  # Profiles render from cache; counts, weights and ranking arrive from /api/live.
  def index
    @printers = PrinterDirectory.profiles.values.sort_by { _1.name.downcase }
    @countries = PrinterDirectory.countries
  end
end
