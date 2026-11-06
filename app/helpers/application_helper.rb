module ApplicationHelper
  COUNTRY_CODES = {
    "United States" => "US", "India" => "IN", "Canada" => "CA", "United Kingdom" => "GB",
    "Australia" => "AU", "Singapore" => "SG", "Germany" => "DE", "Netherlands" => "NL",
    "Poland" => "PL", "Spain" => "ES", "Romania" => "RO", "Czech Republic" => "CZ",
    "Czechia" => "CZ", "New Zealand" => "NZ", "Pakistan" => "PK", "Portugal" => "PT",
    "United Arab Emirates" => "AE", "Sweden" => "SE", "Belgium" => "BE", "Austria" => "AT",
    "Slovakia" => "SK", "South Africa" => "ZA", "Hungary" => "HU", "France" => "FR",
    "Malaysia" => "MY", "Italy" => "IT", "Uzbekistan" => "UZ", "Nepal" => "NP",
    "Switzerland" => "CH", "Morocco" => "MA", "Kazakhstan" => "KZ", "China" => "CN",
    "Brazil" => "BR", "Lithuania" => "LT", "Costa Rica" => "CR", "Bangladesh" => "BD",
    "Israel" => "IL", "Mexico" => "MX", "Korea, South" => "KR", "South Korea" => "KR",
    "Finland" => "FI", "Colombia" => "CO", "Taiwan" => "TW", "Philippines" => "PH",
    "Thailand" => "TH", "Luxembourg" => "LU", "Denmark" => "DK", "Norway" => "NO",
    "Ireland" => "IE", "Japan" => "JP", "Indonesia" => "ID", "Vietnam" => "VN",
    "Greece" => "GR", "Turkey" => "TR", "Ukraine" => "UA", "Argentina" => "AR",
    "Chile" => "CL", "Egypt" => "EG", "Nigeria" => "NG", "Kenya" => "KE",
    "Sri Lanka" => "LK", "Estonia" => "EE", "Latvia" => "LV", "Croatia" => "HR",
    "Slovenia" => "SI", "Serbia" => "RS", "Bulgaria" => "BG", "Saudi Arabia" => "SA",
    "Hong Kong" => "HK", "Peru" => "PE", "Iceland" => "IS"
  }.freeze

  def flag(country)
    code = COUNTRY_CODES[country] or return "🌐"
    code.chars.map { (0x1F1E6 + _1.ord - 65).chr(Encoding::UTF_8) }.join
  end

  def country_label(country)
    country.to_s.sub("Korea, South", "South Korea").downcase
  end

  def slack_url(slack_id)
    "https://hackclub.slack.com/team/#{slack_id}"
  end

  SLACK_CHANNEL = "https://hackclub.slack.com/archives/C083P4FJM46".freeze
end
