// Source for assets/vendor/supabase-client.min.js.
// Not loaded directly by any page — it's the input to the build script below.
//
// Why bundle it locally instead of loading from a CDN (e.g. jsdelivr/unpkg)?
// Your CSP is intentionally strict (script-src 'self' plus only
// googletagmanager.com). Bundling keeps it that way — no extra third-party
// script origin to trust.
//
// To rebuild (e.g. after upgrading @supabase/supabase-js):
//   npm install
//   npm run build:cms-vendor
export { createClient } from '@supabase/supabase-js';
