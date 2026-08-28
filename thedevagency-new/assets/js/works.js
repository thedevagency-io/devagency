// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WORKS PAGE — categories overview → portfolio grid → project
//  detail modal, all backed by the CMS (public, read-only).
//
//  URL shape (all optional, all deep-linkable & shareable):
//    works.html                        → category grid
//    works.html?category=SLUG          → projects in a category
//    works.html?category=all           → every project
//    works.html?project=SLUG           → opens that project's modal
//                                         (over its own category's grid)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function () {
  'use strict';

  var categories = [];
  var projects = [];

  var worksBody = document.getElementById('worksBody');
  var worksBreadcrumb = document.getElementById('worksBreadcrumb');
  var modalOverlay = document.getElementById('projectModalOverlay');

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function emptyStateHtml(message) {
    return '<div class="empty-state">' + escapeHtml(message) + '</div>';
  }

  var ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  // ── RENDER: CATEGORY GRID ──
  function categoryCardHtml(cat, count) {
    return (
      '<a class="category-card" href="works.html?category=' + encodeURIComponent(cat.slug) + '" data-category-slug="' + escapeHtml(cat.slug) + '">' +
        '<div class="category-card-arrow">' + ARROW_SVG + '</div>' +
        '<div class="category-card-name">' + escapeHtml(cat.name) + '</div>' +
        '<div class="category-card-desc">' + escapeHtml(cat.description || '') + '</div>' +
        '<div class="category-card-count">' + count + ' Project' + (count === 1 ? '' : 's') + '</div>' +
      '</a>'
    );
  }

  function renderCategories() {
    worksBreadcrumb.innerHTML = '<span class="current">Our Work</span>';

    if (categories.length === 0 && projects.length === 0) {
      worksBody.innerHTML = emptyStateHtml('No projects have been published yet — check back soon.');
      return;
    }

    var cards = [];
    cards.push(categoryCardHtml({ slug: 'all', name: 'All Projects', description: 'Everything we\u2019ve built, in one place.' }, projects.length));
    categories.forEach(function (cat) {
      var count = projects.filter(function (p) { return p.categories && p.categories.slug === cat.slug; }).length;
      cards.push(categoryCardHtml(cat, count));
    });

    worksBody.innerHTML = '<div class="category-grid">' + cards.join('') + '</div>';
  }

  // ── RENDER: PORTFOLIO GRID ──
  function portfolioCardHtml(project) {
    var img = project.thumbnail_url
      ? '<img class="work-img" src="' + escapeHtml(project.thumbnail_url) + '" alt="' + escapeHtml(project.title) + '" loading="lazy">'
      : '<div class="work-img work-placeholder" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:.25;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>';

    return (
      '<button type="button" class="work-card" data-project-slug="' + escapeHtml(project.slug) + '">' +
        img +
        '<div class="work-overlay">' +
          '<div class="work-tag">' + escapeHtml(project.tag || (project.categories ? project.categories.name : '')) + '</div>' +
          '<h3 class="work-title">' + escapeHtml(project.title) + '</h3>' +
        '</div>' +
      '</button>'
    );
  }

  function renderPortfolio(slug) {
    var isAll = slug === 'all';
    var cat = isAll ? { name: 'All Projects', slug: 'all' } : categories.find(function (c) { return c.slug === slug; });

    if (!cat) {
      worksBreadcrumb.innerHTML = '<a href="works.html" data-nav-root="true">Our Work</a><span class="sep">/</span><span class="current">Not found</span>';
      worksBody.innerHTML = emptyStateHtml('We couldn\u2019t find that category.');
      return;
    }

    worksBreadcrumb.innerHTML = '<a href="works.html" data-nav-root="true">Our Work</a><span class="sep">/</span><span class="current">' + escapeHtml(cat.name) + '</span>';

    var filtered = isAll ? projects : projects.filter(function (p) { return p.categories && p.categories.slug === slug; });

    var heading = '<h2 class="section-h2" style="margin-bottom:2.5rem;">' + escapeHtml(cat.name) + '</h2>';

    if (filtered.length === 0) {
      worksBody.innerHTML = heading + emptyStateHtml('No projects in this category yet — check back soon.');
      return;
    }

    worksBody.innerHTML = heading + '<div class="portfolio-grid">' + filtered.map(portfolioCardHtml).join('') + '</div>';
  }

  // ── PROJECT DETAIL MODAL ──
  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  function metaItem(label, value) {
    if (!value) return '';
    return '<div class="project-modal-meta-item"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + value + '</div></div>';
  }

  function chipsHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="meta-chips">' + list.map(function (t) { return '<span class="meta-chip">' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
  }

  function setModalImage(url) {
    document.getElementById('pmImage').src = url || '';
    document.querySelectorAll('#pmThumbs img').forEach(function (t) {
      t.classList.toggle('active', t.dataset.url === url);
    });
  }

  function openModal(project) {
    var images = [];
    if (project.thumbnail_url) images.push(project.thumbnail_url);
    (project.gallery || []).forEach(function (g) { if (images.indexOf(g) === -1) images.push(g); });

    document.getElementById('pmCategory').textContent = project.categories ? project.categories.name : '';
    document.getElementById('pmTitle').textContent = project.title;
    document.getElementById('pmTag').textContent = project.tag || '';
    document.getElementById('pmTag').style.display = project.tag ? '' : 'none';
    document.getElementById('pmDescription').textContent = project.description || 'No description provided yet.';

    var pmThumbs = document.getElementById('pmThumbs');
    if (images.length > 1) {
      pmThumbs.innerHTML = images.map(function (url) {
        return '<img src="' + escapeHtml(url) + '" data-url="' + escapeHtml(url) + '" alt="">';
      }).join('');
      pmThumbs.style.display = '';
      pmThumbs.querySelectorAll('img').forEach(function (t) {
        t.addEventListener('click', function () { setModalImage(t.dataset.url); });
      });
    } else {
      pmThumbs.innerHTML = '';
      pmThumbs.style.display = 'none';
    }

    document.getElementById('pmImageWrap').style.display = images.length ? '' : 'none';
    setModalImage(images[0]);

    var meta = [
      metaItem('Client', escapeHtml(project.client_name)),
      metaItem('Date', escapeHtml(formatDate(project.project_date))),
      metaItem('Category', project.categories ? escapeHtml(project.categories.name) : ''),
      metaItem('Technologies', chipsHtml(project.technologies)),
      metaItem('Tags', chipsHtml(project.tags)),
    ].filter(Boolean).join('');
    var pmMeta = document.getElementById('pmMeta');
    pmMeta.innerHTML = meta;
    pmMeta.style.display = meta ? '' : 'none';

    var actions = '';
    if (project.external_url) {
      actions = '<a class="service-modal-cta" href="' + escapeHtml(project.external_url) + '" target="_blank" rel="noopener">Visit Live Project ' + ARROW_SVG + '</a>';
    }
    document.getElementById('pmActions').innerHTML = actions;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(opts) {
    opts = opts || {};
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (!opts.skipHistory) {
      var url = new URL(location.href);
      url.searchParams.delete('project');
      history.replaceState({}, '', url);
    }
  }

  // ── ROUTING ──
  function renderView() {
    var params = new URLSearchParams(location.search);
    var categorySlug = params.get('category');
    var projectSlug = params.get('project');
    var project = projectSlug ? projects.find(function (p) { return p.slug === projectSlug; }) : null;

    var effectiveCategory = categorySlug;
    if (!effectiveCategory && project && project.categories) {
      effectiveCategory = project.categories.slug;
    }

    if (effectiveCategory) {
      renderPortfolio(effectiveCategory);
    } else {
      renderCategories();
    }

    if (project) {
      openModal(project);
    } else {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function navigateCategory(slug) {
    var url = new URL(location.href);
    url.searchParams.set('category', slug);
    url.searchParams.delete('project');
    history.pushState({}, '', url);
    renderView();
  }

  function navigateProject(slug) {
    var url = new URL(location.href);
    url.searchParams.set('project', slug);
    history.pushState({}, '', url);
    renderView();
  }

  document.body.addEventListener('click', function (e) {
    var root = e.target.closest('[data-nav-root]');
    if (root) {
      e.preventDefault();
      var url = new URL(location.href);
      url.searchParams.delete('category');
      url.searchParams.delete('project');
      history.pushState({}, '', url);
      renderView();
      return;
    }
    var catCard = e.target.closest('[data-category-slug]');
    if (catCard) {
      e.preventDefault();
      navigateCategory(catCard.getAttribute('data-category-slug'));
      return;
    }
    var projCard = e.target.closest('[data-project-slug]');
    if (projCard) {
      e.preventDefault();
      navigateProject(projCard.getAttribute('data-project-slug'));
    }
  });

  document.getElementById('projectModalClose').addEventListener('click', function () { closeModal(); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
  });
  window.addEventListener('popstate', renderView);

  // ── BOOTSTRAP ──
  async function init() {
    if (!window.CMS_API) {
      worksBody.innerHTML = emptyStateHtml('The works page isn\u2019t set up yet.');
      return;
    }
    try {
      var results = await Promise.all([window.CMS_API.fetchCategories(), window.CMS_API.fetchProjects({})]);
      categories = results[0];
      projects = results[1];
    } catch (err) {
      console.error('CMS: failed to load works page data.', err);
      worksBody.innerHTML = emptyStateHtml('We couldn\u2019t load our work right now — please try again shortly.');
      return;
    }
    renderView();
  }

  init();
})();
