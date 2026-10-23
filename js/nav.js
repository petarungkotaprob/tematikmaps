/**
 * nav.js - Universal Navigation & Desktop Top-Right Profile / Logout controller
 * Provides consistent navbar links, user profile pill, and dropdown across all pages.
 */
(function () {
  'use strict';

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('silisa_user'));
    } catch (e) {
      return null;
    }
  }

  function getPageName() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function getInitials(name) {
    if (!name) return 'U';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  function buildUserHtml(user, isMapPage) {
    if (user) {
      var initials = getInitials(user.nama_lengkap || user.username);
      var displayName = user.nama_lengkap || user.username || 'Pengguna';
      var roleName = user.role === 'admin' ? 'Administrator' : 'Petugas';
      var adminLink = user.role === 'admin' ? '<a href="admin-system-settings.html"><i data-feather="tool"></i> <span>Pengaturan Sistem</span></a>' : '';

      return '<div class="user-dropdown-wrapper" style="position: relative;">' +
        '<button type="button" class="user-profile-pill" id="userProfileBtn" aria-expanded="false" title="Menu Pengguna">' +
          '<div class="user-avatar-circle">' + initials + '</div>' +
          '<span class="user-profile-name">' + displayName + '</span>' +
          '<i data-feather="chevron-down" style="width: 14px; height: 14px; opacity: 0.7;"></i>' +
        '</button>' +
        '<div class="user-dropdown-card" id="userDropdownCard">' +
          '<div class="user-dropdown-header">' +
            '<strong>' + displayName + '</strong>' +
            '<span class="user-role-badge">' + roleName + '</span>' +
          '</div>' +
          '<div class="user-dropdown-links">' +
            '<a href="settings.html"><i data-feather="user"></i> <span>Profil & Akun</span></a>' +
            adminLink +
            '<a href="admin.html"><i data-feather="shield"></i> <span>Panel Admin</span></a>' +
            '<hr style="margin: 4px 0; border: none; border-top: 1px solid var(--gm-border, #dadce0);">' +
            '<button type="button" class="dropdown-logout" id="dropdownLogoutBtn">' +
              '<i data-feather="log-out"></i> <span>Keluar (Logout)</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<a href="login.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 500; text-decoration: none;">' +
      '<i data-feather="log-in" style="width: 14px; height: 14px;"></i>' +
      '<span>Masuk</span>' +
    '</a>';
  }

  function initNav() {
    var page = getPageName();
    var user = getCurrentUser();

    // 1. Ensure consistent links in .nav-links on pages with .navbar
    var navLinks = document.querySelector('.nav-links');
    if (navLinks && page !== 'dashboard.html' && page !== 'login.html') {
      var links = [
        { href: 'dashboard.html', label: 'Peta Tematik', id: 'dashboard.html' },
        { href: 'tracker.html', label: 'Daftar Permohonan', id: 'tracker.html' },
        { href: 'report.html', label: 'Input Lahan', id: 'report.html' },
        { href: 'laporan.html', label: 'Laporan', id: 'laporan.html' }
      ];
      if (user && user.role === 'admin') {
        links.push({ href: 'admin.html', label: 'Admin', id: 'admin.html' });
      }

      var html = '';
      links.forEach(function (lnk) {
        var active = page === lnk.id ? ' class="active"' : '';
        html += '<a href="' + lnk.href + '"' + active + '>' + lnk.label + '</a>';
      });
      navLinks.innerHTML = html;
    }

    // 2. Setup .nav-user-area on navbar pages
    var navbar = document.querySelector('.navbar');
    if (navbar && page !== 'dashboard.html' && page !== 'login.html') {
      var userArea = navbar.querySelector('.nav-user-area');
      if (!userArea) {
        userArea = document.createElement('div');
        userArea.className = 'nav-user-area';
        navbar.appendChild(userArea);
      }

      var isDark = document.body.classList.contains('dark-mode');
      var themeIcon = isDark ? 'sun' : 'moon';

      userArea.innerHTML = '<button type="button" class="gm-search-icon-btn gm-theme-toggle" id="btnToggleTheme" title="Ganti Tema Gelap/Terang" style="width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--gm-border, #dadce0); background: var(--gm-white, #fff); display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">' +
          '<i data-feather="' + themeIcon + '" id="themeIcon"></i>' +
        '</button>' +
        buildUserHtml(user, false);
    }

    // 3. Setup desktop top-right user button on dashboard.html
    if (page === 'dashboard.html') {
      var mapTopWrap = document.getElementById('gmTopUserWrap');
      if (!mapTopWrap) {
        mapTopWrap = document.createElement('div');
        mapTopWrap.id = 'gmTopUserWrap';
        mapTopWrap.className = 'gm-top-user-wrap';
        document.body.appendChild(mapTopWrap);
      }
      mapTopWrap.innerHTML = buildUserHtml(user, true);
    }

    // 4. Bind Dropdown toggle & Logout listeners
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('#userProfileBtn');
      var card = document.getElementById('userDropdownCard');

      if (btn) {
        e.stopPropagation();
        if (card) card.classList.toggle('show');
        return;
      }

      // Close dropdown if clicked outside
      if (card && card.classList.contains('show') && !e.target.closest('#userDropdownCard')) {
        card.classList.remove('show');
      }

      // Handle logout click
      var logoutBtn = e.target.closest('#dropdownLogoutBtn');
      if (logoutBtn) {
        e.preventDefault();
        try { localStorage.removeItem('silisa_user'); } catch (err) {}
        window.location.href = 'login.html';
      }
    });

    if (typeof window.feather !== 'undefined') {
      window.feather.replace();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
