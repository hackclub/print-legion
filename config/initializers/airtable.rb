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
    prints: "fldKgZLjHISDJYTIt",
    email: "fldXRE6VWYqFB0cjL",
    total_prints: "fldYp5mgwaflSimaz",
    # Where a printer's HCB email lives (an email field on this table). Until the
    # column exists, the dashboard shows their account email and can't edit it.
    hcb_email: ENV["AIRTABLE_PRINTER_HCB_EMAIL_FIELD"].presence,
    # Formula names (formulas can't use field IDs).
    slack_id_name: "slack_id",
    email_name: "email"
  }.freeze

  PRINTS = {
    table: "tblV8Sp8TVcjHAtE9",
    print_image: "fld3bVy0gHGLUDhsT",
    printer: "fldYKimyppP7Shpf7",
    created: "fldPRrCmf4UzsK6ye",
    program: "fldXfIWlLUgVxzsMM",
    sent_to_country: "fldQejFiO8Xdyv9jQ", # "Sent to Country (full)", text; counts every print
    weight_grams: "fldM0Vzfef77s4y2i",
    tracking: "fldWA0WpcVd0eWaqY",
    shipping_cost: "fldcFmNuKKZROwP4r", # "Shipping Cost (USD)"
    approved: "fld5p04FZk6PALjf1",
    duplicate: "fldzXmIGXuzlSAFhw",
    shipping_grant: "fldDKvrdYPtMlgOj9", # "HCB Grant (Shipping)" link
    message_url: "fldZgAuEky6xhRooi",
    # Checkbox that hides a print from the site. Formulas need the name, not the ID.
    exclude_name: ENV["AIRTABLE_PRINT_EXCLUDE_FIELD"].presence || "Exclude on website"
  }.freeze

  # Grants issued to a printer, matched on their HCB email. The table doesn't
  # exist yet: set these (field *names*, as shown in Airtable) once it does.
  # Until AIRTABLE_GRANTS_TABLE is set, the stats page says grants are coming.
  GRANTS = {
    table: ENV["AIRTABLE_GRANTS_TABLE"].presence,
    email: ENV["AIRTABLE_GRANTS_EMAIL_FIELD"].presence || "hcb_email",
    amount: ENV["AIRTABLE_GRANTS_AMOUNT_FIELD"].presence || "amount",
    date: ENV["AIRTABLE_GRANTS_DATE_FIELD"].presence || "date",
    purpose: ENV["AIRTABLE_GRANTS_PURPOSE_FIELD"].presence || "purpose",
    link: ENV["AIRTABLE_GRANTS_LINK_FIELD"].presence || "hcb_link"
  }.freeze

  # Cache windows. Profiles change rarely; live numbers get only a short
  # shared window so bursts of visitors don't trip Airtable's 5 req/s limit.
  PROFILE_TTL = ENV.fetch("PROFILE_CACHE_SECONDS", 6 * 3600).to_i
  LIVE_TTL = ENV.fetch("LIVE_CACHE_SECONDS", 15).to_i
end
