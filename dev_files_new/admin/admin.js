// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ADMIN DASHBOARD
//  Requires: assets/vendor/supabase-client.min.js, cms-config.js,
//            cms-api.js loaded first.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function () {
  'use strict';

  var categories = [];
  var projects = [];

  var editingProjectId = null;
  var editingCategoryId = null;
  var slugManuallyEdited = false;
  var categorySlugManuallyEdited = false;

  var pendingThumbFile = null;
  var pendingThumbPreviewUrl = null;
  var existingThumbUrl = null;
  var thumbRemoved = false;
  var galleryItems = []; // [{ url }] for existing, [{ file, previewUrl }] for new
  var toastTimer = null;

  var ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  var ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
  var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
  var ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>';
  var ICON_IMAGE_PLACEHOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseCommaList(str) {
    return String(str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function sortByOrder(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }

  function friendlyError(err) {
    var msg = (err && err.message) || String(err);
    if (/duplicate key|already exists/i.test(msg)) {
      return 'That URL slug is already used by something else — please choose a different one.';
    }
    if (/JWT|not authenticated|401/i.test(msg)) {
      return 'Your session expired — please sign in again.';
    }
    return msg;
  }

  function showToast(message, isError) {
    var t = $('toast');
    t.textContent = message;
    t.className = 'admin-toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3400);
  }

  // ── AUTH ──

  function showLogin() {
    $('loginScreen').style.display = 'flex';
    $('dashboard').style.display = 'none';
  }

  function showDashboard() {
    $('loginScreen').style.display = 'none';
    $('dashboard').style.display = 'flex';
  }

  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorBox = $('loginError');
    errorBox.style.display = 'none';
    var btn = $('loginSubmit');
    var btnText = $('loginSubmitText');
    btn.disabled = true;
    btnText.textContent = 'Signing In…';
    try {
      await window.CMS_API.signIn($('loginEmail').value.trim(), $('loginPassword').value);
      $('loginForm').reset();
    } catch (err) {
      errorBox.textContent = /invalid/i.test(err.message || '') ? 'Incorrect email or password.' : friendlyError(err);
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Sign In';
    }
  });

  $('logoutBtn').addEventListener('click', async function () {
    try { await window.CMS_API.signOut(); } catch (e) { /* ignore */ }
  });

  // ── VIEW SWITCHING ──

  document.querySelectorAll('.admin-nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-nav-link').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var view = btn.getAttribute('data-view');
      $('viewProjects').style.display = view === 'projects' ? '' : 'none';
      $('viewCategories').style.display = view === 'categories' ? '' : 'none';
    });
  });

  // ── DATA LOADING ──

  async function loadAll() {
    try {
      var results = await Promise.all([
        window.CMS_API.adminFetchAllCategories(),
        window.CMS_API.adminFetchAllProjects(),
      ]);
      categories = results[0];
      projects = results[1];
      populateCategorySelect();
      renderCategoriesList();
      renderProjectsList();
    } catch (err) {
      showToast('Could not load your data: ' + friendlyError(err), true);
    }
  }

  function populateCategorySelect() {
    var sel = $('pfCategory');
    var current = sel.value;
    sel.innerHTML = '<option value="">— Uncategorized —</option>' +
      categories.slice().sort(sortByOrder).map(function (c) {
        return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</option>';
      }).join('');
    if (current) sel.value = current;
  }

  // ══════════════════════════════════════════════════════════
  //  PROJECTS
  // ══════════════════════════════════════════════════════════

  function renderProjectsList() {
    var container = $('projectsList');
    if (projects.length === 0) {
      container.innerHTML = '<div class="admin-list-empty">No projects yet. Click "+ Add Project" to create your first one.</div>';
      return;
    }

    var html = '';
    var sortedCats = categories.slice().sort(sortByOrder);
    sortedCats.forEach(function (cat) {
      var items = projects.filter(function (p) { return p.category_id === cat.id; }).sort(sortByOrder);
      if (!items.length) return;
      html += '<div class="admin-list-group-label">' + escapeHtml(cat.name) + '</div>';
      items.forEach(function (p, i) { html += projectCardHtml(p, i === 0, i === items.length - 1); });
    });
    var uncategorized = projects.filter(function (p) { return !p.category_id; }).sort(sortByOrder);
    if (uncategorized.length) {
      html += '<div class="admin-list-group-label">Uncategorized</div>';
      uncategorized.forEach(function (p, i) { html += projectCardHtml(p, i === 0, i === uncategorized.length - 1); });
    }
    container.innerHTML = html || '<div class="admin-list-empty">No projects yet.</div>';
  }

  function projectCardHtml(p, isFirst, isLast) {
    var thumb = p.thumbnail_url
      ? '<img src="' + escapeHtml(p.thumbnail_url) + '" alt="">'
      : ICON_IMAGE_PLACEHOLDER;
    var badgeClass = p.status === 'published' ? 'admin-badge-published' : 'admin-badge-draft';
    return (
      '<div class="admin-card" data-id="' + escapeHtml(p.id) + '">' +
        '<div class="admin-card-thumb">' + thumb + '</div>' +
        '<div class="admin-card-body">' +
          '<div class="admin-card-title">' + escapeHtml(p.title) + (p.featured ? ' <span class="star" title="Featured on homepage">\u2605</span>' : '') + '</div>' +
          '<div class="admin-card-sub"><span class="admin-badge ' + badgeClass + '">' + escapeHtml(p.status) + '</span>' + (p.tag ? escapeHtml(p.tag) : '') + '</div>' +
        '</div>' +
        '<div class="admin-card-actions">' +
          '<button type="button" class="admin-icon-btn" data-action="up" ' + (isFirst ? 'disabled' : '') + ' title="Move up">' + ICON_UP + '</button>' +
          '<button type="button" class="admin-icon-btn" data-action="down" ' + (isLast ? 'disabled' : '') + ' title="Move down">' + ICON_DOWN + '</button>' +
          '<button type="button" class="admin-icon-btn" data-action="edit" title="Edit">' + ICON_EDIT + '</button>' +
          '<button type="button" class="admin-icon-btn danger" data-action="delete" title="Delete">' + ICON_DELETE + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  $('projectsList').addEventListener('click', async function (e) {
    var card = e.target.closest('.admin-card');
    var btn = e.target.closest('[data-action]');
    if (!card || !btn) return;
    var id = card.getAttribute('data-id');
    var project = projects.find(function (p) { return p.id === id; });
    if (!project) return;
    var action = btn.getAttribute('data-action');

    if (action === 'edit') { openProjectEditor(project); }
    else if (action === 'delete') {
      if (!confirm('Delete "' + project.title + '"? This can\u2019t be undone.')) return;
      try {
        await window.CMS_API.deleteProject(id);
        showToast('Project deleted.');
        await loadAll();
      } catch (err) { showToast(friendlyError(err), true); }
    } else if (action === 'up' || action === 'down') {
      await moveProject(project, action === 'up' ? -1 : 1);
    }
  });

  async function moveProject(project, direction) {
    var group = projects.filter(function (p) { return (p.category_id || null) === (project.category_id || null); }).sort(sortByOrder);
    var idx = group.findIndex(function (p) { return p.id === project.id; });
    var swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    var other = group[swapIdx];
    try {
      await window.CMS_API.updateProjectFields(project.id, { sort_order: other.sort_order });
      await window.CMS_API.updateProjectFields(other.id, { sort_order: project.sort_order });
      await loadAll();
    } catch (err) { showToast(friendlyError(err), true); }
  }

  function nextSortOrder(categoryId) {
    var siblings = projects.filter(function (p) { return (p.category_id || null) === (categoryId || null); });
    if (!siblings.length) return 1;
    return Math.max.apply(null, siblings.map(function (p) { return p.sort_order || 0; })) + 1;
  }

  // ── PROJECT EDITOR ──

  function resetProjectForm() {
    editingProjectId = null;
    slugManuallyEdited = false;
    $('projectEditorTitle').textContent = 'Add Project';
    $('projectForm').reset();
    $('pfCategory').value = '';
    pendingThumbFile = null;
    pendingThumbPreviewUrl = null;
    existingThumbUrl = null;
    thumbRemoved = false;
    galleryItems.forEach(function (item) { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    galleryItems = [];
    renderThumbPreview();
    renderGalleryGrid();
    $('projectFormError').style.display = 'none';
  }

  function openProjectEditor(project) {
    resetProjectForm();
    if (project) {
      editingProjectId = project.id;
      slugManuallyEdited = true; // don't clobber an existing slug while editing
      $('projectEditorTitle').textContent = 'Edit Project';
      $('pfTitle').value = project.title || '';
      $('pfSlug').value = project.slug || '';
      $('pfCategory').value = project.category_id || '';
      $('pfTag').value = project.tag || '';
      $('pfDescription').value = project.description || '';
      $('pfExternalUrl').value = project.external_url || '';
      $('pfStatus').value = project.status || 'published';
      $('pfClientName').value = project.client_name || '';
      $('pfProjectDate').value = project.project_date || '';
      $('pfTechnologies').value = (project.technologies || []).join(', ');
      $('pfTags').value = (project.tags || []).join(', ');
      $('pfFeatured').checked = !!project.featured;
      existingThumbUrl = project.thumbnail_url || null;
      galleryItems = (project.gallery || []).map(function (url) { return { url: url }; });
      renderThumbPreview();
      renderGalleryGrid();
    }
    $('projectEditorOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProjectEditor() {
    $('projectEditorOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  $('addProjectBtn').addEventListener('click', function () { openProjectEditor(null); });
  $('projectEditorClose').addEventListener('click', closeProjectEditor);
  $('cancelProjectBtn').addEventListener('click', closeProjectEditor);
  $('projectEditorOverlay').addEventListener('click', function (e) { if (e.target === $('projectEditorOverlay')) closeProjectEditor(); });

  $('pfTitle').addEventListener('input', function () {
    if (!slugManuallyEdited) $('pfSlug').value = window.CMS_API.slugify($('pfTitle').value);
  });
  $('pfSlug').addEventListener('input', function () { slugManuallyEdited = true; });

  function renderThumbPreview() {
    var wrap = $('thumbPreview');
    var url = pendingThumbPreviewUrl || (!thumbRemoved ? existingThumbUrl : null);
    if (url) {
      wrap.innerHTML = '<img src="' + escapeHtml(url) + '" alt="">' +
        '<button type="button" class="admin-gallery-remove" id="thumbRemoveBtn" style="top:4px;right:4px;" aria-label="Remove image">\u2715</button>';
      $('thumbRemoveBtn').addEventListener('click', function (e) {
        e.preventDefault();
        pendingThumbFile = null;
        pendingThumbPreviewUrl = null;
        thumbRemoved = true;
        $('thumbInput').value = '';
        renderThumbPreview();
      });
    } else {
      wrap.innerHTML = ICON_IMAGE_PLACEHOLDER;
    }
  }

  $('thumbInput').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    pendingThumbFile = file;
    pendingThumbPreviewUrl = URL.createObjectURL(file);
    thumbRemoved = false;
    renderThumbPreview();
  });

  function renderGalleryGrid() {
    var grid = $('galleryGrid');
    grid.innerHTML = galleryItems.map(function (item, idx) {
      var url = item.previewUrl || item.url;
      return '<div class="admin-gallery-item"><img src="' + escapeHtml(url) + '" alt=""><button type="button" class="admin-gallery-remove" data-idx="' + idx + '" aria-label="Remove image">\u2715</button></div>';
    }).join('');
    grid.querySelectorAll('.admin-gallery-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var removed = galleryItems.splice(idx, 1)[0];
        if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
        renderGalleryGrid();
      });
    });
  }

  $('galleryInput').addEventListener('change', function (e) {
    Array.prototype.forEach.call(e.target.files || [], function (file) {
      galleryItems.push({ file: file, previewUrl: URL.createObjectURL(file) });
    });
    e.target.value = '';
    renderGalleryGrid();
  });

  $('projectForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorBox = $('projectFormError');
    errorBox.style.display = 'none';
    var saveBtn = $('saveProjectBtn');
    var saveBtnText = $('saveProjectBtnText');
    saveBtn.disabled = true;
    saveBtnText.textContent = 'Saving…';

    try {
      var thumbnailUrl = existingThumbUrl;
      if (pendingThumbFile) {
        thumbnailUrl = await window.CMS_API.uploadImage(pendingThumbFile, 'thumbnails');
      } else if (thumbRemoved) {
        thumbnailUrl = null;
      }

      var galleryUrls = [];
      for (var i = 0; i < galleryItems.length; i++) {
        var item = galleryItems[i];
        if (item.file) galleryUrls.push(await window.CMS_API.uploadImage(item.file, 'gallery'));
        else galleryUrls.push(item.url);
      }

      var categoryId = $('pfCategory').value || null;
      var payload = {
        title: $('pfTitle').value.trim(),
        slug: $('pfSlug').value.trim() || window.CMS_API.slugify($('pfTitle').value),
        category_id: categoryId,
        tag: $('pfTag').value.trim() || null,
        description: $('pfDescription').value.trim() || null,
        external_url: $('pfExternalUrl').value.trim() || null,
        status: $('pfStatus').value,
        client_name: $('pfClientName').value.trim() || null,
        project_date: $('pfProjectDate').value || null,
        technologies: parseCommaList($('pfTechnologies').value),
        tags: parseCommaList($('pfTags').value),
        featured: $('pfFeatured').checked,
        thumbnail_url: thumbnailUrl,
        gallery: galleryUrls,
      };

      if (editingProjectId) {
        payload.id = editingProjectId;
      } else {
        payload.sort_order = nextSortOrder(categoryId);
      }

      await window.CMS_API.upsertProject(payload);
      closeProjectEditor();
      showToast('Project saved.');
      await loadAll();
    } catch (err) {
      errorBox.textContent = friendlyError(err);
      errorBox.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtnText.textContent = 'Save Project';
    }
  });

  // ── PROJECT PREVIEW ──

  function metaItem(label, value) {
    if (!value) return '';
    return '<div class="project-modal-meta-item"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + value + '</div></div>';
  }
  function chipsHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="meta-chips">' + list.map(function (t) { return '<span class="meta-chip">' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
  }

  $('previewProjectBtn').addEventListener('click', function () {
    var categoryId = $('pfCategory').value;
    var cat = categories.find(function (c) { return c.id === categoryId; });
    var thumb = pendingThumbPreviewUrl || (!thumbRemoved ? existingThumbUrl : null) || (galleryItems[0] && (galleryItems[0].previewUrl || galleryItems[0].url));

    $('pvCategory').textContent = cat ? cat.name : '';
    $('pvTitle').textContent = $('pfTitle').value.trim() || 'Untitled Project';
    var tag = $('pfTag').value.trim();
    $('pvTag').textContent = tag;
    $('pvTag').style.display = tag ? '' : 'none';
    $('pvDescription').textContent = $('pfDescription').value.trim() || 'No description provided yet.';
    $('pvImageWrap').style.display = thumb ? '' : 'none';
    $('pvImage').src = thumb || '';

    var meta = [
      metaItem('Client', escapeHtml($('pfClientName').value.trim())),
      metaItem('Date', escapeHtml($('pfProjectDate').value)),
      metaItem('Category', cat ? escapeHtml(cat.name) : ''),
      metaItem('Technologies', chipsHtml(parseCommaList($('pfTechnologies').value))),
      metaItem('Tags', chipsHtml(parseCommaList($('pfTags').value))),
    ].filter(Boolean).join('');
    $('pvMeta').innerHTML = meta;
    $('pvMeta').style.display = meta ? '' : 'none';

    var url = $('pfExternalUrl').value.trim();
    $('pvActions').innerHTML = url
      ? '<a class="service-modal-cta" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Visit Live Project</a>'
      : '';

    $('previewOverlay').classList.add('active');
  });

  function closePreview() { $('previewOverlay').classList.remove('active'); }
  $('previewClose').addEventListener('click', closePreview);
  $('previewOverlay').addEventListener('click', function (e) { if (e.target === $('previewOverlay')) closePreview(); });

  // ══════════════════════════════════════════════════════════
  //  CATEGORIES
  // ══════════════════════════════════════════════════════════

  function renderCategoriesList() {
    var container = $('categoriesList');
    var sorted = categories.slice().sort(sortByOrder);
    if (!sorted.length) {
      container.innerHTML = '<div class="admin-list-empty">No categories yet. Click "+ Add Category" to create one.</div>';
      return;
    }
    container.innerHTML = sorted.map(function (cat, i) {
      var count = projects.filter(function (p) { return p.category_id === cat.id; }).length;
      return (
        '<div class="admin-card" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="admin-card-body">' +
            '<div class="admin-card-title">' + escapeHtml(cat.name) + '</div>' +
            '<div class="admin-card-sub">/' + escapeHtml(cat.slug) + ' \u00b7 ' + count + ' project' + (count === 1 ? '' : 's') + '</div>' +
          '</div>' +
          '<div class="admin-card-actions">' +
            '<button type="button" class="admin-icon-btn" data-action="up" ' + (i === 0 ? 'disabled' : '') + ' title="Move up">' + ICON_UP + '</button>' +
            '<button type="button" class="admin-icon-btn" data-action="down" ' + (i === sorted.length - 1 ? 'disabled' : '') + ' title="Move down">' + ICON_DOWN + '</button>' +
            '<button type="button" class="admin-icon-btn" data-action="edit" title="Edit">' + ICON_EDIT + '</button>' +
            '<button type="button" class="admin-icon-btn danger" data-action="delete" title="Delete">' + ICON_DELETE + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  $('categoriesList').addEventListener('click', async function (e) {
    var card = e.target.closest('.admin-card');
    var btn = e.target.closest('[data-action]');
    if (!card || !btn) return;
    var id = card.getAttribute('data-id');
    var cat = categories.find(function (c) { return c.id === id; });
    if (!cat) return;
    var action = btn.getAttribute('data-action');

    if (action === 'edit') { openCategoryEditor(cat); }
    else if (action === 'delete') {
      var count = projects.filter(function (p) { return p.category_id === cat.id; }).length;
      var msg = count
        ? 'Delete "' + cat.name + '"? ' + count + ' project(s) in it will become Uncategorized (they won\u2019t be deleted).'
        : 'Delete "' + cat.name + '"?';
      if (!confirm(msg)) return;
      try {
        await window.CMS_API.deleteCategory(id);
        showToast('Category deleted.');
        await loadAll();
      } catch (err) { showToast(friendlyError(err), true); }
    } else if (action === 'up' || action === 'down') {
      await moveCategory(cat, action === 'up' ? -1 : 1);
    }
  });

  async function moveCategory(cat, direction) {
    var sorted = categories.slice().sort(sortByOrder);
    var idx = sorted.findIndex(function (c) { return c.id === cat.id; });
    var swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    var other = sorted[swapIdx];
    try {
      await window.CMS_API.updateCategoryFields(cat.id, { sort_order: other.sort_order });
      await window.CMS_API.updateCategoryFields(other.id, { sort_order: cat.sort_order });
      await loadAll();
    } catch (err) { showToast(friendlyError(err), true); }
  }

  function resetCategoryForm() {
    editingCategoryId = null;
    categorySlugManuallyEdited = false;
    $('categoryEditorTitle').textContent = 'Add Category';
    $('categoryForm').reset();
    $('categoryFormError').style.display = 'none';
  }

  function openCategoryEditor(cat) {
    resetCategoryForm();
    if (cat) {
      editingCategoryId = cat.id;
      categorySlugManuallyEdited = true;
      $('categoryEditorTitle').textContent = 'Edit Category';
      $('cfName').value = cat.name || '';
      $('cfSlug').value = cat.slug || '';
      $('cfDescription').value = cat.description || '';
    }
    $('categoryEditorOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryEditor() {
    $('categoryEditorOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  $('addCategoryBtn').addEventListener('click', function () { openCategoryEditor(null); });
  $('categoryEditorClose').addEventListener('click', closeCategoryEditor);
  $('cancelCategoryBtn').addEventListener('click', closeCategoryEditor);
  $('categoryEditorOverlay').addEventListener('click', function (e) { if (e.target === $('categoryEditorOverlay')) closeCategoryEditor(); });

  $('cfName').addEventListener('input', function () {
    if (!categorySlugManuallyEdited) $('cfSlug').value = window.CMS_API.slugify($('cfName').value);
  });
  $('cfSlug').addEventListener('input', function () { categorySlugManuallyEdited = true; });

  $('categoryForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorBox = $('categoryFormError');
    errorBox.style.display = 'none';
    var saveBtn = $('saveCategoryBtn');
    var saveBtnText = $('saveCategoryBtnText');
    saveBtn.disabled = true;
    saveBtnText.textContent = 'Saving…';
    try {
      var payload = {
        name: $('cfName').value.trim(),
        slug: $('cfSlug').value.trim() || window.CMS_API.slugify($('cfName').value),
        description: $('cfDescription').value.trim() || null,
      };
      if (editingCategoryId) payload.id = editingCategoryId;
      else payload.sort_order = categories.length ? Math.max.apply(null, categories.map(function (c) { return c.sort_order || 0; })) + 1 : 1;

      await window.CMS_API.upsertCategory(payload);
      closeCategoryEditor();
      showToast('Category saved.');
      await loadAll();
    } catch (err) {
      errorBox.textContent = friendlyError(err);
      errorBox.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtnText.textContent = 'Save Category';
    }
  });

  // ── Escape key closes whichever modal is open ──
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('previewOverlay').classList.contains('active')) closePreview();
    else if ($('projectEditorOverlay').classList.contains('active')) closeProjectEditor();
    else if ($('categoryEditorOverlay').classList.contains('active')) closeCategoryEditor();
  });

  // ── BOOTSTRAP ──
  if (!window.CMS_API) {
    showLogin();
    $('loginError').textContent = 'The CMS isn\u2019t configured yet. Fill in assets/js/cms-config.js first.';
    $('loginError').style.display = 'block';
  } else {
    window.CMS_API.onAuthChange(function (session) {
      if (session) { showDashboard(); loadAll(); }
      else { showLogin(); }
    });
  }
})();
