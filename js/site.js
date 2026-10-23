/**
 * Site branding loader: applies app name, logo and favicon from settings API.
 * Ensures ALL logo images on all pages stay in sync with system settings.
 */
(function () {
  'use strict';

  function applyBranding(s) {
    if (!s) return;
    var logo = s.app_logo || 'images/logo.png';
    var favicon = s.app_favicon || logo;
    var name = (s.app_name || 'Peta Tematik').trim();
    var motto = s.app_motto || '';

    // 1. Update ALL logo images everywhere across all pages
    var logoSelectors = [
      '.brand img',
      '.brand-logo',
      '.app-logo',
      '.gm-drawer-logo',
      '.login-logo img',
      'img[src*="images/logo.png"]',
      'img[src*="uploads/logo"]',
      'img[alt*="Logo"]',
      '#preview_logo'
    ];
    document.querySelectorAll(logoSelectors.join(', ')).forEach(function (img) {
      if (img.src !== logo) {
        img.src = logo;
      }
      img.alt = name + ' Logo';
    });

    // 2. Update Brand text & Motto
    document.querySelectorAll('.brand').forEach(function (brand) {
      var words = name.split(/\s+/);
      var first = words.shift() || '';
      var rest = words.join(' ');

      var textNode = null;
      for (var i = 0; i < brand.childNodes.length; i++) {
        var node = brand.childNodes[i];
        if (node.nodeType === 3 && node.textContent.trim()) { textNode = node; break; }
      }
      if (textNode) textNode.textContent = first + ' ';

      var span = brand.querySelector('span');
      if (span) {
        span.textContent = rest;
        span.style.display = rest ? '' : 'none';
      }

      var mottoEl = brand.querySelector('.brand-motto');
      if (mottoEl && motto) mottoEl.textContent = motto;
    });

    // 3. Update Drawer header app name
    var drawerAppName = document.querySelector('.gm-drawer-app-name');
    if (drawerAppName) {
      var dWords = name.split(/\s+/);
      var dFirst = dWords.shift() || '';
      var dRest = dWords.join(' ');
      drawerAppName.innerHTML = dFirst + (dRest ? '<span>' + dRest + '</span>' : '');
    }
    var drawerAgency = document.querySelector('.gm-drawer-agency');
    if (drawerAgency && motto) {
      drawerAgency.textContent = motto;
    }

    // 4. Update login motto / subtitle
    if (motto) {
      var loginMotto = document.querySelector('.login-card > p, .login-subtitle');
      if (loginMotto) loginMotto.textContent = motto;
    }

    // 5. Update title & favicon
    if (document.title.indexOf('Peta Tematik') !== -1) {
      document.title = document.title.replace(/Peta Tematik/g, name);
    }

    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', name);

    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
      link.setAttribute('href', favicon);
    });
  }

  // Early sync from cache to prevent image flicker
  try {
    var cached = JSON.parse(localStorage.getItem('silisa_settings') || 'null');
    if (cached) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyBranding(cached); });
      } else {
        applyBranding(cached);
      }
    }
  } catch (e) {}

  function fetchLatest() {
    if (!window.fetch) return;
    fetch('api/site-settings.php', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json && json.status === 'success' && json.settings) {
          applyBranding(json.settings);
          try { localStorage.setItem('silisa_settings', JSON.stringify(json.settings)); } catch (e) {}
        }
      })
      .catch(function () {
        try {
          var c = JSON.parse(localStorage.getItem('silisa_settings') || 'null');
          if (c) applyBranding(c);
        } catch (e) {}
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchLatest);
  } else {
    fetchLatest();
  }
})();
