# Printing legion

New printing legion setup.

Fill out forms.hackclub.com/print-legion-signup to sign up!

## Environment

Create a `.env` file inside `backend/` with the Airtable credentials plus a table for ratings:

- `AIRTABLE_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_ID` – main printers table (already in use)
- `AIRTABLE_PRINT_TABLE_ID` – print stats table (already in use)
- `AIRTABLE_RATINGS_TABLE_ID` – **new** table where each record represents a single rating with `slack_id` (text), `rating` (number), and `rater_slack_id` (text) to tie submissions back to a Hack Clubber.

Every time someone submits a rating from the site, the backend will append a record to the ratings table and recompute averages directly from Airtable.
