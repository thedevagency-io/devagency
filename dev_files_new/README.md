# The Dev Agency — Backend Setup

Your form now saves every enquiry to a real database, in addition to
still emailing you via Formspree.

> **New:** the Works/Projects section now has its own admin dashboard —
> see **[CMS-SETUP.md](./CMS-SETUP.md)** to set it up (~15 minutes).

## What's new in this bundle
- `netlify/functions/submit-enquiry.js` — serverless function that validates
  and saves each submission
- `supabase_schema.sql` — creates the database table
- `package.json` / `netlify.toml` — tells Netlify how to build/run the function
- `script.js` — updated to call the new function

## One-time setup (~10 minutes)

### 1. Create a free Supabase project
Go to supabase.com → sign up → "New Project". Pick any name/region,
set a database password (save it somewhere), and wait ~2 min for it to spin up.

### 2. Create the table
In your Supabase project: **SQL Editor → New Query** → paste the entire
contents of `supabase_schema.sql` → click **Run**.

### 3. Get your API credentials
Go to **Project Settings → API**. You'll need two values:
- **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
- **service_role key** (under "Project API keys" — NOT the "anon" key;
  the service_role key is secret and must never appear in your frontend code)

### 4. Add those as environment variables in Netlify
In Netlify: **Site settings → Environment variables → Add a variable**, add:
| Key | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_KEY` | your service_role key |

### 5. Deploy this whole folder to Netlify
Drag-and-drop this entire folder (all files, including the `netlify` subfolder)
onto your Netlify dashboard, same as before. Netlify will detect
`netlify.toml`, install the `@supabase/supabase-js` dependency automatically,
and deploy your function alongside the site.

### 6. Test it
Submit the live "Get in Touch" form with a test entry, then check:
- Your Gmail inbox (via Formspree, as before)
- Supabase → **Table Editor → enquiries** — your test row should appear there too

## Viewing your enquiries going forward
Log into Supabase → **Table Editor → enquiries** any time to see every
submission, sortable/filterable, with a built-in export-to-CSV option.

## Notes
- If the database save fails but the email still goes through (or vice versa),
  the visitor still sees "Message sent" — the form only shows an error if
  BOTH fail. Check the browser console or Netlify function logs to debug
  either path individually.
- The `service_role` key bypasses Row Level Security by design — that's fine
  here because it only lives in the serverless function (server-side),
  never in code the browser can see.
