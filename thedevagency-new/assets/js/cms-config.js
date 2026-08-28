// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMS CONFIG
//
//  Fill these in once, from your Supabase project:
//  Project Settings → API → "Project URL" and "anon public" key.
//
//  IMPORTANT: this is the ANON key, not the service_role key.
//  The anon key is *meant* to be public — it ships inside every
//  Supabase web app's front-end bundle. It cannot bypass Row
//  Level Security. All the real protection lives in the RLS
//  policies defined in supabase/cms_schema.sql (public can only
//  read published rows; only a signed-in admin can write).
//
//  Never put your service_role key here or anywhere in
//  front-end code — that one stays server-side only, exactly as
//  described in README.md for the enquiry form.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.CMS_CONFIG = {
  SUPABASE_URL: https://ljirqrzyytnsxctcofem.supabase.co,
  SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaXJxcnp5eXRuc3hjdGNvZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTIxMjAsImV4cCI6MjA5ODY2ODEyMH0.zXAKYjZa-8tSbCz8sKDQljLTcfiKJXiA0M2zOUk1BpY,
};
