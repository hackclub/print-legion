Rails.application.routes.draw do
  root "pages#home"
  get "printers", to: "printers#index"
  get "prints", to: "prints#index"
  get "docs", to: redirect("/docs/printers")
  get "docs/:guide", to: "pages#docs", as: :doc, constraints: { guide: /requesters|printers|organizers/ }

  namespace :api do
    get "live", to: "live#show"     # stats (+ optional recent prints)
    get "prints", to: "live#prints" # paginated print feed
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
