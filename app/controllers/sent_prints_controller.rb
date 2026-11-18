# /dashboard/send: the signed-in printer logs a print they've shipped.
# The printer and their Slack ID come from the session, never the form.
class SentPrintsController < ApplicationController
  before_action :require_printer!
  before_action { response.headers["Cache-Control"] = "no-store" }
  before_action :load_printer, only: %i[new create]
  rate_limit to: 5, within: 1.minute, only: :create,
             with: -> { redirect_to dashboard_send_path, alert: "Slow down a little, then try again." }
  rate_limit to: 40, within: 1.minute, only: :recipient, with: -> { head :too_many_requests }

  rescue_from AirtableClient::Error do |e|
    Rails.logger.warn("Sent print: #{e.message}")
    @message = "Airtable isn't answering right now, so nothing was saved. Try again in a minute."
    render "sessions/failed", status: :service_unavailable
  end

  def new
    @form = SentPrint.new(account: @account, grants: @grants)
    issue_token
  end

  def create
    token = session.delete(:send_token)
    unless token.is_a?(String) && params[:send_token].is_a?(String) && ActiveSupport::SecurityUtils.secure_compare(token, params[:send_token])
      return redirect_to dashboard_send_path, alert: "That form was already sent, or it expired. Check your stats before sending it again."
    end

    raw = params[:print].is_a?(ActionController::Parameters) ? params[:print] : ActionController::Parameters.new
    @form = SentPrint.new(
      account: @account, grants: @grants,
      params: raw.permit(*SentPrint::FIELDS),
      files: { images: raw[:images], stls: raw[:stls], proof: raw[:proof] }
    )
    if @form.valid?
      @form.save!
      redirect_to dashboard_stats_path, notice: "Print logged! It shows as pending until it's approved."
    else
      issue_token
      flash.now[:alert] = "Some answers need fixing (marked below). Files have to be picked again."
      render :new, status: :unprocessable_content
    end
  end

  # Live preview of the recipient: Slack display name and avatar only.
  def recipient
    id = params[:slack_id].to_s.strip.upcase
    return head :bad_request unless id.match?(SentPrint::SLACK_ID)
    person = SlackDirectory.people([id])[id]
    return render json: { found: false } unless person
    render json: { found: true, id:, name: person.name, avatar: person.avatar }
  end

  private

  def load_printer
    @account = PrinterAccount.load(current_printer_id)
    eligibility = Eligibility.for(@account, hca_id: session[:hca_id])
    if eligibility.locked?
      return redirect_to dashboard_path, alert: "You can't log prints until your eligibility checks pass."
    end
    @grants = GrantLedger.for_account(@account)
    @choices = SentPrint.choices
  end

  def issue_token = (@send_token = session[:send_token] = SecureRandom.urlsafe_base64(24))
end
