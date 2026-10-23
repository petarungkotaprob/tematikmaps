/**
 * Mobile navigation dock + bottom sheet controller.
 * Injects a Google Maps style dock and provides window.MobileUI.
 */
(function () {
  'use strict';

  const MOBILE_QUERY = '(max-width: 768px), (max-width: 900px) and (max-height: 500px)';
  const mediaQuery = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : null;
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  let activeSheet = null;
  let lastFocused = null;

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem('silisa_user'));
    } catch (error) {
      return null;
    }
  }

  function isMobile() {
    return !mediaQuery || mediaQuery.matches;
  }

  function refreshIcons() {
    if (typeof window.feather !== 'undefined') {
      window.feather.replace();
    }
  }

  function icon(name) {
    return '<i data-feather="' + name + '"></i>';
  }

  function buildItems() {
    const user = currentUser();

    if (user) {
      const isAdmin = user.role === 'admin';
      const items = [
        {
          href: 'dashboard.html',
          icon: 'map',
          label: 'Peta',
          active: page === 'dashboard.html'
        },
        {
          href: 'tracker.html',
          icon: 'list',
          label: 'Daftar',
          active: page === 'tracker.html'
        },
        {
          href: 'report.html',
          icon: 'plus',
          label: 'Input',
          center: true,
          active: page === 'report.html'
        }
      ];

      if (isAdmin) {
        items.push({
          href: 'admin.html',
          icon: 'shield',
          label: 'Admin',
          active: page === 'admin.html'
        });
      } else {
        items.push({
          href: 'laporan.html',
          icon: 'bar-chart-2',
          label: 'Laporan',
          active: page === 'laporan.html'
        });
      }

      items.push({
        href: 'settings.html',
        icon: 'user',
        label: 'Akun',
        active: page === 'settings.html'
      });

      return items;
    }

    return [
      {
        href: 'dashboard.html',
        icon: 'map',
        label: 'Peta',
        active: page === 'dashboard.html'
      },
      {
        href: 'tracker.html',
        icon: 'list',
        label: 'Daftar',
        active: page === 'tracker.html'
      },
      {
        href: 'portal.html',
        icon: 'plus',
        label: 'Input',
        center: true,
        active: page === 'portal.html'
      },
      {
        href: 'laporan.html',
        icon: 'bar-chart-2',
        label: 'Laporan',
        active: page === 'laporan.html'
      },
      {
        href: 'login.html',
        icon: 'log-in',
        label: 'Masuk',
        active: page === 'login.html'
      }
    ];
  }

  function renderDock() {
    if (document.getElementById('mobileDock')) return;

    const dock = document.createElement('nav');
    dock.id = 'mobileDock';
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Navigasi utama');

    const list = buildItems();

    const items = list.map(function (item) {
      const classes = ['dock-item'];
      if (item.center) classes.push('dock-item-center');
      if (item.active) classes.push('active');

      const mark = item.center
        ? '<span class="dock-center-btn">' + icon(item.icon) + '</span>'
        : icon(item.icon);

      return '<a class="' + classes.join(' ') + '" href="' + item.href + '"' +
        (item.active ? ' aria-current="page"' : '') + '>' +
        mark + '<span class="dock-label">' + item.label + '</span></a>';
    }).join('');

    dock.innerHTML = '<div class="mobile-dock-inner dock-count-' + list.length + '">' + items + '</div>';
    document.body.appendChild(dock);
    refreshIcons();
  }

  function ensureBackdrop() {
    let backdrop = document.getElementById('sheetBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sheetBackdrop';
      backdrop.className = 'sheet-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function setSheetAria() {
    document.querySelectorAll('.mobile-sheet').forEach(function (sheet) {
      if (!isMobile()) {
        sheet.removeAttribute('aria-hidden');
        return;
      }
      if (sheet.classList.contains('active')) {
        sheet.removeAttribute('aria-hidden');
      } else {
        sheet.setAttribute('aria-hidden', 'true');
      }
    });
  }

  const NON_MODAL_SHEETS = ['sidebarPanel', 'mapOverlay', 'mapInfoSheet'];

  function isNonModal(sheet) {
    return !!sheet && NON_MODAL_SHEETS.indexOf(sheet.id) !== -1;
  }

  function openSheet(target) {
    if (!isMobile()) return;

    const sheet = typeof target === 'string' ? document.getElementById(target) : target;
    if (!sheet) return;

    closeSheets(true);

    const nonModal = isNonModal(sheet);

    activeSheet = sheet;
    lastFocused = document.activeElement;
    sheet.classList.add('mobile-sheet', 'active');
    sheet.setAttribute('role', 'dialog');
    if (nonModal) {
      sheet.removeAttribute('aria-modal');
      sheet.classList.add('sheet-non-modal', 'sheet-scrollable');
    } else {
      sheet.setAttribute('aria-modal', 'true');
      sheet.classList.remove('sheet-non-modal', 'sheet-scrollable');
    }
    sheet.removeAttribute('aria-hidden');

    if (nonModal) {
      ensureBackdrop().classList.remove('active');
      document.body.classList.remove('sheet-open');
    } else {
      ensureBackdrop().classList.add('active');
      document.body.classList.add('sheet-open');
    }
  }

  function closeSheets(immediate) {
    // On desktop, never touch the sidebar panel — it's a fixed left panel, not a sheet
    const isMob = isMobile();

    document.querySelectorAll('.mobile-sheet.active').forEach(function (sheet) {
      // Skip sidebar panel on desktop — it's managed by CSS, not JS
      if (!isMob && sheet.id === 'sidebarPanel') return;

      sheet.classList.remove('active', 'sheet-non-modal', 'sheet-scrollable');
      sheet.style.transform = '';
      sheet.style.transition = '';
      if (isMob) sheet.setAttribute('aria-hidden', 'true');
    });

    const backdrop = document.getElementById('sheetBackdrop');
    if (backdrop) backdrop.classList.remove('active');

    document.body.classList.remove('sheet-open');
    activeSheet = null;

    if (!immediate && lastFocused && document.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  function bindTriggers() {
    document.querySelectorAll('[data-sheet-open]').forEach(function (trigger) {
      if (trigger.dataset.sheetBound) return;
      trigger.dataset.sheetBound = '1';

      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        const id = trigger.getAttribute('data-sheet-open');
        const sheet = document.getElementById(id);

        if (sheet && sheet.classList.contains('active')) {
          closeSheets();
          return;
        }

        openSheet(id);

        const focusSelector = trigger.getAttribute('data-sheet-focus');
        if (focusSelector) {
          setTimeout(function () {
            const field = document.querySelector(focusSelector);
            if (field) field.focus({ preventScroll: true });
          }, 380);
        }
      });
    });

    document.querySelectorAll('[data-sheet-close]').forEach(function (trigger) {
      if (trigger.dataset.sheetBound) return;
      trigger.dataset.sheetBound = '1';

      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        closeSheets();
      });
    });
  }

  function bindGlobalClose() {
    const backdrop = ensureBackdrop();
    if (!backdrop.dataset.closeBound) {
      backdrop.dataset.closeBound = '1';
      backdrop.addEventListener('click', function () {
        closeSheets();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && activeSheet) {
        closeSheets();
      }
    });

    if (mediaQuery) {
      const onChange = function () {
        if (!mediaQuery.matches) closeSheets(true);
        setSheetAria();
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(onChange);
      }
    }
  }

  function bindKeyboard() {
    const viewport = window.visualViewport;

    function update() {
      if (!isMobile()) {
        document.body.classList.remove('keyboard-open');
        return;
      }
      const occluded = window.innerHeight - (viewport ? viewport.height : window.innerHeight);
      document.body.classList.toggle('keyboard-open', occluded > 150);
    }

    if (viewport) {
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);

    document.addEventListener('focusin', function (event) {
      if (event.target.matches('input, textarea, select')) {
        document.body.classList.add('keyboard-open');
      }
    });

    document.addEventListener('focusout', function () {
      setTimeout(function () {
        const target = document.activeElement;
        if (!target || !target.matches('input, textarea, select')) {
          document.body.classList.remove('keyboard-open');
        }
        update();
      }, 150);
    });
  }

  function bindSheetGestures() {
    document.querySelectorAll('.mobile-sheet').forEach(function (sheet) {
      const handle = sheet.querySelector('[data-sheet-drag]');
      if (!handle) return;

      let startY = 0;
      let startTime = 0;
      let dragging = false;

      handle.addEventListener('touchstart', function (event) {
        if (sheet.scrollTop > 0) return;
        startY = event.touches[0].clientY;
        startTime = Date.now();
        dragging = true;
        sheet.style.transition = 'none';
      }, { passive: true });

      handle.addEventListener('touchmove', function (event) {
        if (!dragging) return;
        const delta = Math.max(0, event.touches[0].clientY - startY);
        sheet.style.transform = 'translateY(' + delta + 'px)';
      }, { passive: true });

      handle.addEventListener('touchend', function (event) {
        if (!dragging) return;
        dragging = false;

        const endY = event.changedTouches[0] ? event.changedTouches[0].clientY : startY;
        const delta = Math.max(0, endY - startY);

        sheet.style.transition = '';
        sheet.style.transform = '';

        if (delta > 70 || (Date.now() - startTime < 220 && delta > 30)) {
          closeSheets();
        }
      });
    });
  }

  function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const light = document.body.classList.contains('light-mode');
    meta.setAttribute('content', light ? '#f1f5f9' : '#070e1c');
  }

  function watchTheme() {
    syncThemeColor();
    if (window.MutationObserver) {
      new MutationObserver(syncThemeColor).observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  function bindMapDismiss() {
    document.addEventListener('click', function (event) {
      if (!activeSheet || !isNonModal(activeSheet)) return;
      if (event.target.closest('.mobile-sheet')) return;
      if (event.target.closest('.leaflet-container')) closeSheets();
    }, true);
  }

  function init() {
    renderDock();
    ensureBackdrop();
    bindTriggers();
    bindGlobalClose();
    bindKeyboard();
    bindSheetGestures();
    bindMapDismiss();
    watchTheme();
    setSheetAria();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MobileUI = {
    openSheet: openSheet,
    closeSheets: closeSheets,
    isMobile: isMobile
  };
})();
