# Writing the docs guides

The guides on `/docs/<guide>` are plain Markdown files in `app/views/pages/guides/`:

| Page                   | File                                     |
| ---------------------- | ---------------------------------------- |
| `/docs/requesters`     | `app/views/pages/guides/requesters.md`   |
| `/docs/printers`       | `app/views/pages/guides/printers.md`     |
| `/docs/organizers`     | `app/views/pages/guides/organizers.md`   |

Edit a file and refresh the page; no restart needed. The renderer lives in `app/helpers/guides_helper.rb`.

Don't start a guide with a `# Title`: the page already shows the guide's name (set in `GUIDES` in `app/controllers/pages_controller.rb`).

## Headings

Use `##` for sections and `###` for subsections. Text between headings is grouped automatically, so the spacing matches the rest of the site.

## Links

The style of a link is picked from its text:

| You write                                  | You get                         |
| ------------------------------------------ | ------------------------------- |
| `[#printing-legion][slack]`                | orange highlight (channels)     |
| `[@nimit][nimit]`                          | red highlight (people)          |
| `https://forms.hackclub.com/...` (bare URL) | orange underlined link          |
| `[any other text](https://...)`            | plain link                      |

Links to other sites open in a new tab. Email addresses become `mailto:` links on their own.

`[slack]` and `[nimit]` are shared links defined once in `SHARED_LINKS` in `app/helpers/guides_helper.rb`. Add a name there to make it usable as `[text][name]` in every guide.

## Example URLs

Wrap text in backticks to get the italic underlined style used for example URLs that aren't links:

```md
looks something like this → `https://hcb.hackclub.com/grants/......`
```

## Line breaks

A blank line starts a new paragraph. To break a line inside a paragraph, end it with `\`:

```md
If you think you qualify, DM me!\
Grants are sent to the email you signed up with.
```

## FAQ

Under a heading named `FAQ`, each `###` heading is a question and the text after it is the answer:

```md
## FAQ

### Am I allowed to take multiple print jobs simultaneously?

Please only take one print task at a time!

### I printed the parts but the recipient ghosted me :c

Please DM [@nimit][nimit] to get this resolved!
```

The FAQ ends at the next heading of the same level or higher (`##` or `#`).

## Anything else

Bold, italics, lists and so on are standard Markdown. For anything Markdown can't express, write HTML directly in the file; it's passed through as-is.
