# The signed-in printer's dashboard. Every action works on current_printer_id
# (from the session); no param can point it at another record.
class DashboardController < ApplicationController
  before_action :require_printer!
  before_action { response.headers["Cache-Control"] = "no-store" }
  rate_limit to: 10, within: 1.minute, only: %i[update_profile update_email request_shipping_grant],
             with: -> { redirect_to dashboard_path, alert: "Slow down a little, then try again." }

  rescue_from AirtableClient::Error, with: :airtable_down

  def show
    @account = PrinterAccount.load(current_printer_id)
    @eligibility = Eligibility.for(@account, hca_id: session[:hca_id])
    # A failing check switches the printer off (and keeps them off: see update_profile).
    if @eligibility.locked? && @account.active
      PrinterAccount.update_details(current_printer_id, active: false)
      @account.active = false
      @switched_off = true
    end
  end

  def stats
    @account = PrinterAccount.load(current_printer_id)
    @prints = PrinterAccount.prints(@account)
    @recipients = SlackDirectory.people(@prints.filter_map { _1[:recipient] })
    @rank = rank_for(@account.id)
  end

  def grants
    @account = PrinterAccount.load(current_printer_id)
    @grants = begin
      GrantLedger.for_account(@account)
    rescue AirtableClient::Error => e # keep the email form usable
      Rails.logger.warn("Grants: #{e.message}")
      nil
    end
    @pending_request = ShippingGrantRequest.pending_for(@account) if @grants
  end

  # One click on the grants tab: a shipping grant request for this printer.
  def request_shipping_grant
    account = PrinterAccount.load(current_printer_id)
    if Eligibility.for(account, hca_id: session[:hca_id]).locked?
      return redirect_to dashboard_grants_path, alert: "You can't request a grant until your eligibility checks pass."
    end
    # A double click sends two requests at once; both would pass the pending
    # check before either row exists. Only one gets through this lock.
    lock = "grant-request-lock:#{account.id}"
    raise ShippingGrantRequest::AlreadyPending unless Rails.cache.write(lock, true, unless_exist: true, expires_in: 30.seconds)
    begin
      ShippingGrantRequest.create!(account)
    rescue AirtableClient::Error
      Rails.cache.delete(lock) # nothing was made, so let them try again
      raise
    end
    redirect_to dashboard_grants_path, notice: "Shipping grant requested! The card will go to #{account.email || "your email"}."
  rescue ShippingGrantRequest::AlreadyPending
    redirect_to dashboard_grants_path, alert: "You already have a shipping grant request waiting."
  end

  def update_profile
    raw = params[:profile]
    profile = raw.is_a?(ActionController::Parameters) ? raw.permit(:display_name, :bio, :active, :avatar) : {}
    active = profile.key?(:active) ? ActiveModel::Type::Boolean.new.cast(profile[:active]) : nil
    blocked = nil
    # Switching on needs both eligibility checks to pass, whatever the form sent.
    if active
      eligibility = Eligibility.for(PrinterAccount.load(current_printer_id), hca_id: session[:hca_id])
      unless eligibility.can_activate?
        active = nil
        blocked = "You can't switch to active right now (#{eligibility.reasons.presence&.to_sentence || "couldn't check your eligibility"})."
      end
    end
    saved = PrinterAccount.update_details(current_printer_id, name: profile[:display_name].presence, bio: profile[:bio], active:)
    if profile[:avatar].present?
      PrinterAccount.update_avatar(current_printer_id, profile[:avatar])
      saved << "picture"
    end
    notice = saved.any? ? "Saved your #{saved.to_sentence}." : ("Nothing to change." unless blocked)
    redirect_to dashboard_path, notice:, alert: blocked
  rescue PrinterAccount::Invalid => e
    redirect_to dashboard_path, alert: e.message
  end

  def update_email
    email = PrinterAccount.update_email(current_printer_id, params[:email])
    redirect_to dashboard_grants_path, notice: "Email set to #{email}."
  rescue PrinterAccount::Invalid => e
    redirect_to dashboard_grants_path, alert: e.message
  end

  private

  # Rank among active printers by prints shipped, ties broken by weight (the
  # same order as the public printers page).
  def rank_for(id)
    table = PrinterDirectory.stats["printers"]
    order = table.select { |_, s| s["prints"].positive? }.sort_by { |_, s| [-s["prints"], -s["grams"]] }.map(&:first)
    (i = order.index(id)) && { place: i + 1, of: order.size }
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
