# The Dev Agency — Works/Projects CMS

Your Works/Projects section is now powered by a real admin dashboard instead
of hardcoded HTML. This document covers what was built, how to set it up
(~15 minutes, one time), and how to use it day to day.

---

## 1. What was added

| Piece | Purpose |
|---|---|
| `supabase/cms_schema.sql` | Creates the `categories` and `projects` tables, security rules, an image storage bucket, and migrates your 2 existing projects into the new system. |
| `assets/js/cms-config.js` | Holds your Supabase project URL + public (anon) key. **You fill this in.** |
| `assets/js/cms-api.js` | Shared helper used by every page to talk to Supabase. |
| `assets/vendor/supabase-client.min.js` | The Supabase SDK, bundled locally so nothing loads from a third-party CDN (keeps your existing strict CSP intact). |
| `works.html` + `assets/js/works.js` | The public "Works" page: category browser → project grid → project detail. |
| `admin/index.html`, `admin/admin.css`, `admin/admin.js` | The password-protected dashboard where you manage everything. |
| Small edits to `index.html`, `script.js`, `styles.css` | Added the "Click/Tap to See Our Works" button, made the homepage's 2 featured cards load from the CMS (with your original hardcoded cards kept as a safety fallback), and added new CSS for the category/portfolio grids and project modal. |

**Nothing about your existing design was replaced.** The homepage still looks
and behaves exactly as before — the Work section just now pulls its content
from a database instead of your HTML, and the two existing projects were
carried over pixel-for-pixel (their original thumbnail images are preserved
in the migration script).

### Why this approach

You already had a Supabase project wired up for the enquiry form (per your
existing `README.md`), so this reuses it rather than standing up a second
backend. It adds two new tables to that same project.

The admin dashboard talks to Supabase **directly from the browser**, using
Supabase's own login system (Supabase Auth) and Row Level Security (RLS) —
this is the standard, secure way to build an admin panel on Supabase, and it
means no new server functions were needed:

- **Anyone** can *read* published projects/categories (that's what the
  public website needs).
- **Only someone signed in** through the admin login can create, edit,
  delete, or see draft projects.

This is enforced by Postgres itself (in `cms_schema.sql`), not by the
front-end code — so even if someone reads your JavaScript, they can't write
to your data without signing in.

> **A note on the "anon" key you'll add to `cms-config.js`:** unlike the
> `service_role` key described in your original `README.md` (which must
> stay secret, server-side only), the **anon key is meant to be public**.
> It ships inside every Supabase web app. It cannot bypass the security
> rules above. Never put the `service_role` key in front-end code — only
> the anon key belongs in `cms-config.js`.

---

## 2. One-time setup

### Step 1 — Run the database migration
In your existing Supabase project: **SQL Editor → New Query** → paste the
entire contents of `supabase/cms_schema.sql` → **Run**.

This creates the `categories` and `projects` tables, sets up the security
rules, creates a `project-images` storage bucket, and inserts your 3 starter
categories (Websites, Graphic Designs, Other Projects) plus your 2 existing
projects — with their original thumbnails intact.

### Step 2 — Get your API keys
**Project Settings → API**. You'll need:
- **Project URL** (`https://xxxxxxxx.supabase.co`)
- **anon public** key (⚠️ not the `service_role` key)

### Step 3 — Configure the site
Open `assets/js/cms-config.js` and fill in those two values:

```js
window.CMS_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
};
```

### Step 4 — Create your admin login
In Supabase: **Authentication → Users → Add User**.
- Enter your email and a password.
- Check **"Auto Confirm User"** so you can sign in immediately.

This is the email/password you'll use to log into `/admin/`. You can add
more admin users later the same way.

### Step 5 — Deploy
Deploy the whole folder to Netlify exactly as before (drag-and-drop, or your
existing git-based deploy). No new environment variables or build settings
are needed for this feature — everything runs client-side against Supabase.

### Step 6 — Test it
1. Visit `yoursite.com/works.html` — you should see 3 categories, and the
   2 existing projects under "Websites."
2. Visit `yoursite.com/admin/` and sign in with the account from Step 4.
3. Try editing a project, adding a new one, and creating a new category.
4. Refresh your homepage — the Work section should still show correctly.

---

## 3. Using the dashboard

- **Projects tab** — add, edit, delete, and reorder projects (↑/↓ arrows
  reorder within a category). Each project has a title, slug, category,
  short card tag, description, thumbnail, gallery, external link, client
  name, date, technologies, tags, status (Draft/Published), and a
  "Featured" checkbox.
- **Draft vs Published** — a Draft project is only visible to you in the
  dashboard; it won't appear anywhere on the public site until you switch
  it to Published. Use this to prepare a project before it goes live.
- **Featured** — the homepage shows up to 2 **Featured + Published**
  projects. Check this box on the projects you want front and center.
- **Categories tab** — add, edit, delete, and reorder categories. Deleting
  a category doesn't delete its projects — they just move to
  "Uncategorized" until you reassign them.
- **Preview** — inside the project editor, "Preview" shows exactly how the
  project card/detail will look on the public site, before you save.

---

## 4. Future expandability

The `projects` table includes an `extra` column (type `jsonb`) that isn't
used by any form field yet — it's there so a future field can be added
without a database migration. For anything bigger, adding a real column is
just:

```sql
alter table public.projects add column my_new_field text;
```

...then a matching input in `admin/admin.js` (form) and a display line in
`assets/js/works.js` (`openModal`). The existing fields (client name, date,
technologies, tags, gallery, external link, status, featured) already cover
everything mentioned in the original request, so most future additions
should be small, additive changes — not a rebuild.

---

## 5. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Works page says "couldn't load our work" | `cms-config.js` still has placeholder values, or the SQL migration hasn't been run yet. |
| Homepage shows the *old* 2 static cards even after adding projects | That's the safety fallback — it only shows if the CMS fetch fails or returns zero *Featured + Published* projects. Make sure at least one project has both. |
| Can't sign into `/admin/` | Confirm the user was created with "Auto Confirm User" checked, and that you're using the anon key (not service key) in `cms-config.js`. |
| "That URL slug is already used" | Slugs must be unique across all projects (or all categories). Change it slightly. |
| Uploaded image doesn't show | Check the browser console — if it's a CSP error, confirm the CSP `<meta>` tag's `img-src`/`connect-src` still include `https://*.supabase.co` (already set in `index.html`, `works.html`, `admin/index.html`). |
