// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HOMEPAGE WORK SECTION — loads up to 2 featured projects from
//  the CMS and swaps them into #workGrid, replacing the two
//  hardcoded cards that ship in index.html.
//
//  If the CMS isn't configured yet, or the fetch fails for any
//  reason (offline, RLS misconfigured, etc.), this does nothing
//  and the original hardcoded cards stay exactly as they were —
//  the homepage never shows a broken or empty Work section.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cardMarkup(project, isFeatured) {
    var href = project.external_url
      ? project.external_url
      : ('works.html?project=' + encodeURIComponent(project.slug));
    var target = project.external_url ? ' target="_blank" rel="noopener"' : '';
    var img = project.thumbnail_url
      ? '<img class="work-img" src="' + escapeHtml(project.thumbnail_url) + '" alt="' + escapeHtml(project.title) + '" loading="lazy">'
      : '<div class="work-img work-placeholder" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:.25;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>';

    return (
      '<a class="work-card' + (isFeatured ? ' featured' : '') + '" href="' + escapeHtml(href) + '"' + target + '>' +
        img +
        '<div class="work-overlay">' +
          '<div class="work-tag">' + escapeHtml(project.tag || (project.categories ? project.categories.name : '')) + '</div>' +
          '<h3 class="work-title">' + escapeHtml(project.title) + '</h3>' +
        '</div>' +
      '</a>'
    );
  }

  async function loadFeaturedWork() {
    var grid = document.getElementById('workGrid');
    if (!grid || !window.CMS_API) return;

    try {
      var projects = await window.CMS_API.fetchProjects({ featured: true, limit: 2 });
      if (!projects || projects.length === 0) return; // keep static fallback

      grid.innerHTML = projects.map(function (p, i) { return cardMarkup(p, i === 0); }).join('');
    } catch (err) {
      // CMS not set up yet, or a network hiccup — silently keep the static cards.
      console.warn('CMS: could not load featured work, showing static fallback.', err.message || err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeaturedWork);
  } else {
    loadFeaturedWork();
  }
})();
