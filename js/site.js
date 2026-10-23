/**
 * Site branding loader: applies app name, logo and favicon from settings API.
 */
(function () {
  'use strict';

  function applyBranding(s) {
    var logo = s.app_logo || 'images/logo.png';
    var favicon = s.app_favicon || logo;
    var name = (s.app_name || 'Peta Tematik').trim();
    var motto = s.app_motto || '';

    document.querySelectorAll('.brand').forEach(function (brand) {
      var img = brand.querySelector('img');
      if (img) {
        img.src = logo;
        img.alt = name + ' Logo';
      }

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

    if (motto) {
      var loginMotto = document.querySelector('.login-card > p');
      if (loginMotto) loginMotto.textContent = motto;
    }

    if (document.title.indexOf('Peta Tematik') !== -1) {
      document.title = document.title.replace(/Peta Tematik/g, name);
    }

    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', name);

    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
      link.setAttribute('href', favicon);
    });
  }

  function init() {
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
          var cached = JSON.parse(localStorage.getItem('silisa_settings') || 'null');
          if (cached) applyBranding(cached);
        } catch (e) {}
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
