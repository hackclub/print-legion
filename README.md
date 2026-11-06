# print legion

The Print Legion site, built in Rails 8 from the Figma "final" page.

```
bundle install
bin/rails server   # reads AIRTABLE_API_KEY (or AIRTABLE_KEY) from .env
```

Without a token the app runs on offline fixtures in `db/fixtures/` (placeholder photos), so the UI can be worked on without the base.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | hero, how-it-works strip, latest prints reel, live totals |
| `/printers` | every printer, ranked by prints shipped; filter by country, sort by count / weight / name (⇅ reverses), search names + bios. Filters live in the URL (`?place=India&sort=weight`). |
| `/prints` | newest approved, non-duplicate prints with photos; loads more as you scroll |
| `/docs/requesters`, `/docs/printers`, `/docs/organizers` | guides |

## What's cached and what's live

| Data | Where | Freshness |
| --- | --- | --- |
| Printer names, bios, countries, links, avatars | rendered into the HTML from `Rails.cache` | up to 6 h, but never past the earliest Airtable avatar URL expiry (signed URLs), and dropped as soon as a printer appears that isn't in the cache |
| Prints count + kg per printer, totals (kgs, spools, projects) | `GET /api/live` after page load | live, with a 15 s shared window |
| Latest prints | `GET /api/live?prints=7`, `GET /api/prints` | live, with a 15 s shared window |

The 15 s window exists only so a burst of visitors can't exceed Airtable's 5 requests/second per base. Set `LIVE_CACHE_SECONDS=0` to disable it.

### Staying under 1 s

* Live stats only ask for printers that have prints, split into two record-ID partitions fetched in parallel, so it's one Airtable round trip instead of paging.
* The stats and prints calls run in parallel on the server, and the browser makes a single request per page.
* HTTPS connections to Airtable are kept alive and reused.
* Reads use field IDs (`config/initializers/airtable.rb`), so renaming a column doesn't break the site.
* The loading screen fades in only after 120 ms, so fast loads never flash it. Fetch timings are logged in the browser console (`[live] /api/live in …ms`).

## What appears on the site

* Only printers ticked **active?** in Airtable are listed, ranked, or named on prints. Program totals (kgs, spools, projects) still count every print.
* Tick **Exclude on website** on a print to keep it out of the feed and the home page reel.

## Fonts

Inter loads from Google Fonts. **Terminal Grotesque** (Velvetyne) is self-hosted from `public/fonts/`.

## Deploying

Any Rack host works (`SECRET_KEY_BASE`, `AIRTABLE_API_KEY`, `RAILS_SERVE_STATIC_FILES=1` if no CDN). The cache is in-process memory; with several servers, point `config.cache_store` at Redis or Memcached.
