# Airtable wiring for Print Legion.
#
# Field IDs (not names) are used for reads so that renaming a column in
# Airtable doesn't break the site. Formulas still have to reference names.
module AirtableConfig
  BASE_ID = ENV["AIRTABLE_BASE_ID"].presence || "appH3Qc3ucJh5RIcX"

  PRINTERS = {
    table: "tblmd08E0b4iC1dNB",
    display_name: "fldBmVw7GeHr1lss4",
    profile_picture: "fldYoF0z9w2ZCPrj0",
    country: "flddwpabLIUpqvT84",
    website: "fldhBPbm1BTMtU9dF",
    bio: "fldgcrDf5es0PTRQn",
    slack_id: "fldd0ISlzUNk7q6py",
    active: "fldDogi3qCL2d3jPG", # "active?" — only these printers appear on the site
    total_grams: "fldEchFZJZ4qP0MAv",
    prints: "fldKgZLjHISDJYTIt"
  }.freeze

  PRINTS = {
    table: "tblV8Sp8TVcjHAtE9",
    print_image: "fld3bVy0gHGLUDhsT",
    printer: "fldYKimyppP7Shpf7",
    created: "fldPRrCmf4UzsK6ye",
    program: "fldXfIWlLUgVxzsMM",
    # Checkbox that hides a print from the site. Formulas need the name, not the ID.
    exclude_name: ENV["AIRTABLE_PRINT_EXCLUDE_FIELD"].presence || "Exclude on website"
  }.freeze

  # Cache windows. Profiles change rarely; live numbers get only a short
  # shared window so bursts of visitors don't trip Airtable's 5 req/s limit.
  PROFILE_TTL = ENV.fetch("PROFILE_CACHE_SECONDS", 6 * 3600).to_i
  LIVE_TTL = ENV.fetch("LIVE_CACHE_SECONDS", 15).to_i
end
