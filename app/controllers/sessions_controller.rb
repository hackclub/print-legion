# Sign-in with Hack Club Auth (OAuth authorization-code flow).
class SessionsController < ApplicationController
  STATE_TTL = 10.minutes

  rate_limit to: 20, within: 1.minute, only: %i[new callback]

  def new
    return redirect_to dashboard_path if signed_in?
    return render :unavailable, status: :service_unavailable unless HackClubAuthConfig.configured?

    state = SecureRandom.urlsafe_base64(32)
    session[:oauth_state] = state
    session[:oauth_state_at] = Time.now.to_i
    redirect_to HackClubAuth.authorize_url(state:, redirect_uri:), allow_other_host: true
  end

  def callback
    expected = session.delete(:oauth_state)
    issued_at = session.delete(:oauth_state_at).to_i
    return failed("Sign-in was cancelled.") if params[:error].present?

    state, code = params[:state], params[:code]
    unless expected.is_a?(String) && state.is_a?(String) && ActiveSupport::SecurityUtils.secure_compare(expected, state) &&
           Time.now.to_i - issued_at < STATE_TTL.to_i
      return failed("That sign-in link has expired. Give it another go.")
    end
    return failed("Hack Club Auth didn't send a sign-in code.") unless code.is_a?(String) && code.length.between?(1, 512)

    identity = HackClubAuth.identify(code:, redirect_uri:)
    unless identity.slack_id
      reset_session
      return render :no_slack, status: :forbidden
    end
    if (printer_id = PrinterAccount.record_id_for(identity))
      sign_in!(printer_id, hca_id: identity.id)
      redirect_to dashboard_path
    else
      reset_session
      render :not_a_printer, status: :forbidden
    end
  rescue HackClubAuth::Error, AirtableClient::Error => e
    Rails.logger.warn("Sign-in failed: #{e.class}: #{e.message}")
    failed("We couldn't finish signing you in. Try again in a minute.")
  end

  def destroy
    reset_session
    redirect_to root_path
  end

  # Development only (the route doesn't exist elsewhere): sign in as any
  # printer record without Hack Club Auth, to work on the dashboard offline.
  def dev
    raise ActionController::RoutingError, "Not Found" unless Rails.env.development?
    PrinterAccount.load(params[:id]) # must be a real printer record
    sign_in!(params[:id])
    redirect_to dashboard_path
  rescue ArgumentError, AirtableClient::Error
    raise ActionController::RoutingError, "Not Found"
  end

  private

  def redirect_uri = HackClubAuthConfig::REDIRECT_URI || "#{request.base_url}/oauth/callback"

  def failed(message)
    @message = message
    render :failed, status: :unprocessable_content
  end
end
