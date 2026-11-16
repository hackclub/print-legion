class ApplicationController < ActionController::Base
  # Signed-in printers keep their dashboard session this long.
  SESSION_TTL = 14.days

  helper_method :current_printer_id, :signed_in?

  private

  # The printer record this browser signed in as, from the encrypted session
  # cookie. This is the only thing that decides whose record the dashboard
  # reads or writes.
  def current_printer_id
    return @current_printer_id if defined?(@current_printer_id)
    id = session[:printer_id]
    fresh = Time.now.to_i - session[:signed_in_at].to_i < SESSION_TTL.to_i
    @current_printer_id = id.is_a?(String) && fresh ? id : nil
  end

  def signed_in? = current_printer_id.present?

  def require_printer!
    return if signed_in?
    reset_session
    redirect_to login_path
  end

  # A new session on every sign-in, so a cookie planted beforehand is useless.
  def sign_in!(printer_id)
    reset_session
    session[:printer_id] = printer_id
    session[:signed_in_at] = Time.now.to_i
  end
end
