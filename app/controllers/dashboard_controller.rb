# The signed-in printer's dashboard. Every action works on current_printer_id
# (from the session); no param can point it at another record.
class DashboardController < ApplicationController
  before_action :require_printer!
  before_action { response.headers["Cache-Control"] = "no-store" }
  rate_limit to: 10, within: 1.minute, only: %i[update_profile update_email],
             with: -> { redirect_to dashboard_path, alert: "Slow down a little, then try again." }

  rescue_from AirtableClient::Error, with: :airtable_down

  def show
    @account = PrinterAccount.load(current_printer_id)
    @form_url = sent_print_form_url
  end

  def stats
    @account = PrinterAccount.load(current_printer_id)
    @prints = PrinterAccount.prints(@account)
    @grants = begin
      GrantLedger.for_account(@account)
    rescue AirtableClient::Error => e # grants are extra: keep the rest of the page
      Rails.logger.warn("Grants: #{e.message}")
      nil
    end
    @rank = rank_for(@account.id)
  end

  def update_profile
    raw = params[:profile]
    profile = raw.is_a?(ActionController::Parameters) ? raw.permit(:display_name, :avatar) : {}
    saved = []
    if profile[:display_name].present? && PrinterAccount.update_name(current_printer_id, profile[:display_name])
      saved << "name"
    end
    if profile[:avatar].present?
      PrinterAccount.update_avatar(current_printer_id, profile[:avatar])
      saved << "picture"
    end
    redirect_to dashboard_path, notice: saved.any? ? "Saved your #{saved.to_sentence}." : "Nothing to change."
  rescue PrinterAccount::Invalid => e
    redirect_to dashboard_path, alert: e.message
  end

  def update_email
    email = PrinterAccount.update_email(current_printer_id, params[:email])
    redirect_to dashboard_stats_path(anchor: "grants"), notice: "Email set to #{email}."
  rescue PrinterAccount::Invalid => e
    redirect_to dashboard_stats_path(anchor: "grants"), alert: e.message
  end

  private

  # Rank among active printers by prints shipped, ties broken by weight (the
  # same order as the public printers page).
  def rank_for(id)
    table = PrinterDirectory.stats["printers"]
    order = table.select { |_, s| s["prints"].positive? }.sort_by { |_, s| [-s["prints"], -s["grams"]] }.map(&:first)
    (i = order.index(id)) && { place: i + 1, of: order.size }
  end

  def sent_print_form_url
    url = ENV["SENT_PRINT_FORM_URL"].presence || "https://forms.hackclub.com/sent-print"
    url = url.strip
    url.match?(%r{\Ahttps://\S+\z}) ? url : nil
  end

  def airtable_down(error)
    Rails.logger.warn("Dashboard: #{error.message}")
    if error.message.include?("404") # record was deleted: sign out
      reset_session
      return redirect_to login_path
    end
    # A save that Airtable refused (e.g. the token lacks data.records:write).
    return redirect_to dashboard_path, alert: "Couldn't save that to Airtable. Try again in a minute." if request.patch?
    @message = "Airtable isn't answering right now. Try again in a minute."
    render "sessions/failed", status: :service_unavailable
  end
end
