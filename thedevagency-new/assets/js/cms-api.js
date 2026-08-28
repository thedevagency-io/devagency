// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMS API — thin shared wrapper around the Supabase client.
//  Used by index.html, works.html, and admin/index.html.
//  Depends on: assets/vendor/supabase-client.min.js (must load first)
//              assets/js/cms-config.js (must load first)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (window) {
  'use strict';

  var _client = null;

  function getClient() {
    if (_client) return _client;
    if (!window.supabaseSDK || !window.supabaseSDK.createClient) {
      throw new Error('Supabase SDK not loaded. Check assets/vendor/supabase-client.min.js.');
    }
    var cfg = window.CMS_CONFIG || {};
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') !== -1) {
      throw new Error('CMS not configured yet. Fill in assets/js/cms-config.js with your Supabase URL and anon key.');
    }
    _client = window.supabaseSDK.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return _client;
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'item';
  }

  // ── PUBLIC READS ──

  async function fetchCategories() {
    var supabase = getClient();
    var res = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  // opts: { categorySlug, featured, limit }
  async function fetchProjects(opts) {
    opts = opts || {};
    var supabase = getClient();
    var query = supabase
      .from('projects')
      .select('*, categories(name, slug)')
      .eq('status', 'published')
      .order('sort_order', { ascending: true });

    if (opts.featured) query = query.eq('featured', true);
    if (opts.limit) query = query.limit(opts.limit);

    var res = await query;
    if (res.error) throw res.error;
    var rows = res.data || [];

    if (opts.categorySlug) {
      rows = rows.filter(function (p) {
        return p.categories && p.categories.slug === opts.categorySlug;
      });
    }
    return rows;
  }

  async function fetchProjectBySlug(slug) {
    var supabase = getClient();
    var res = await supabase
      .from('projects')
      .select('*, categories(name, slug)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  // ── ADMIN (requires an authenticated session; RLS enforces this too) ──

  async function signIn(email, password) {
    var supabase = getClient();
    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var supabase = getClient();
    await supabase.auth.signOut();
  }

  async function getSession() {
    var supabase = getClient();
    var res = await supabase.auth.getSession();
    return res.data ? res.data.session : null;
  }

  function onAuthChange(cb) {
    var supabase = getClient();
    supabase.auth.onAuthStateChange(function (_event, session) { cb(session); });
  }

  async function adminFetchAllProjects() {
    var supabase = getClient();
    var res = await supabase
      .from('projects')
      .select('*, categories(name, slug)')
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function adminFetchAllCategories() {
    return fetchCategories();
  }

  async function upsertCategory(category) {
    var supabase = getClient();
    if (!category.slug) category.slug = slugify(category.name);
    var res = await supabase.from('categories').upsert(category).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function deleteCategory(id) {
    var supabase = getClient();
    var res = await supabase.from('categories').delete().eq('id', id);
    if (res.error) throw res.error;
  }

  async function upsertProject(project) {
    var supabase = getClient();
    if (!project.slug) project.slug = slugify(project.title);
    var res = await supabase.from('projects').upsert(project).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function updateProjectFields(id, fields) {
    var supabase = getClient();
    var res = await supabase.from('projects').update(fields).eq('id', id);
    if (res.error) throw res.error;
  }

  async function updateCategoryFields(id, fields) {
    var supabase = getClient();
    var res = await supabase.from('categories').update(fields).eq('id', id);
    if (res.error) throw res.error;
  }

  async function deleteProject(id) {
    var supabase = getClient();
    var res = await supabase.from('projects').delete().eq('id', id);
    if (res.error) throw res.error;
  }

  async function uploadImage(file, pathPrefix) {
    var supabase = getClient();
    var ext = (file.name && file.name.indexOf('.') !== -1) ? file.name.split('.').pop() : 'jpg';
    var path = (pathPrefix || 'uploads') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var res = await supabase.storage.from('project-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (res.error) throw res.error;
    var pub = supabase.storage.from('project-images').getPublicUrl(res.data.path);
    return pub.data.publicUrl;
  }

  window.CMS_API = {
    getClient: getClient,
    slugify: slugify,
    fetchCategories: fetchCategories,
    fetchProjects: fetchProjects,
    fetchProjectBySlug: fetchProjectBySlug,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    onAuthChange: onAuthChange,
    adminFetchAllProjects: adminFetchAllProjects,
    adminFetchAllCategories: adminFetchAllCategories,
    upsertCategory: upsertCategory,
    deleteCategory: deleteCategory,
    updateCategoryFields: updateCategoryFields,
    upsertProject: upsertProject,
    deleteProject: deleteProject,
    updateProjectFields: updateProjectFields,
    uploadImage: uploadImage,
  };
})(window);
