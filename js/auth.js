/**
 * Authentication & Session Module
 * Mengelola sesi login di browser, memvalidasi ke server, dan menjaga
 * halaman yang membutuhkan login tetap terlindungi.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'silisa_user';
  var SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 hari
  var PROTECTED_PAGES = [
    'dashboard.html',
    'tracker.html',
    'report.html',
    'settings.html',
    'laporan.html',
    'admin.html',
    'admin-system-settings.html'
  ];
  var ADMIN_PAGES = ['admin.html', 'admin-system-settings.html'];

  var memorySession = null;
  var expiryTimer = null;
  var lastExpired = false;

  function getPageName() {
    var name = window.location.pathname.split('/').pop() || 'index.html';
    return name.toLowerCase();
  }

  function readRaw() {
    try {
      var localValue = window.localStorage.getItem(STORAGE_KEY);
      if (localValue) return localValue;
    } catch (e) { /* localStorage tidak tersedia */ }

    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(value) {
    var written = false;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      written = true;
    } catch (e) { /* abaikan */ }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, value);
      written = true;
    } catch (e) { /* abaikan */ }

    return written;
  }

  function removeRaw() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* abaikan */ }
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* abaikan */ }
  }

  function normalizeUser(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (value.id === undefined || value.id === null || value.id === '') return null;

    var username = typeof value.username === 'string' ? value.username.trim() : '';
    var role = typeof value.role === 'string' ? value.role.trim().toLowerCase() : '';
    if (!username || !role) return null;

    var user = {};
    for (var key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        user[key] = value[key];
      }
    }
    user.username = username;
    user.role = role;
    return user;
  }

  function scheduleExpiry(user) {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }

    var remaining = Number(user.expires_at) - Date.now();
    if (!isFinite(remaining) || remaining <= 0) return;

    expiryTimer = setTimeout(function () {
      if (!read()) {
        redirectToLogin(true);
      }
    }, Math.min(remaining + 1000, 2147483647));
  }

  function read() {
    var raw = readRaw();
    if (!raw) {
      memorySession = null;
      window.currentUser = null;
      return null;
    }

    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      removeRaw();
      memorySession = null;
      window.currentUser = null;
      return null;
    }

    var user = normalizeUser(parsed);
    if (!user) {
      removeRaw();
      memorySession = null;
      window.currentUser = null;
      return null;
    }

    var now = Date.now();
    var expiresAt = Number(user.expires_at);

    if (!isFinite(expiresAt) || expiresAt <= 0) {
      // Sesi lama belum punya masa berlaku: beri masa berlaku satu kali.
      user.login_at = Number(user.login_at) || now;
      user.expires_at = now + SESSION_TTL;
      writeRaw(JSON.stringify(user));
    } else if (expiresAt <= now) {
      lastExpired = true;
      clear();
      return null;
    }

    lastExpired = false;
    memorySession = user;
    window.currentUser = user;
    scheduleExpiry(user);
    return user;
  }

  function save(user, serverExpiresAt) {
    var record = normalizeUser(user);
    if (!record) {
      throw new Error('Data sesi tidak valid.');
    }

    var now = Date.now();
    var expiresAt = Number(serverExpiresAt);

    record.login_at = Number(record.login_at) || now;
    record.expires_at = isFinite(expiresAt) && expiresAt > now
      ? expiresAt
      : now + SESSION_TTL;

    memorySession = record;
    window.currentUser = record;
    writeRaw(JSON.stringify(record));
    scheduleExpiry(record);

    return record;
  }

  function clear() {
    removeRaw();
    memorySession = null;
    window.currentUser = null;
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  }

  function redirectToLogin(expired) {
    var url = 'login.html';
    if (expired) url += '?expired=1';
    window.location.replace(url);
  }

  function logout() {
    clear();

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('api/auth.php?action=logout');
      } else {
        fetch('api/auth.php?action=logout', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true
        }).catch(function () { /* abaikan */ });
      }
    } catch (e) { /* abaikan */ }

    window.location.replace('login.html');
  }

  function currentUser() {
    return memorySession || read();
  }

  function guardPage() {
    var page = getPageName();
    var user = read();

    if (page === 'login.html') {
      if (user) {
        window.location.replace('dashboard.html');
        return false;
      }
      return true;
    }

    if (PROTECTED_PAGES.indexOf(page) !== -1 && !user) {
      redirectToLogin(lastExpired);
      return false;
    }

    if (ADMIN_PAGES.indexOf(page) !== -1 && user && user.role !== 'admin') {
      alert('Akses Ditolak: Halaman ini hanya untuk Administrator.');
      window.location.replace('dashboard.html');
      return false;
    }

    return true;
  }

  function verifyServerSession() {
    var user = currentUser();
    if (!user) return;
    if (typeof navigator.onLine !== 'undefined' && navigator.onLine === false) return;

    fetch('api/auth.php?action=session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (response) {
        if (response.status === 401) {
          clear();
          redirectToLogin(true);
          return null;
        }
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (!data || data.status !== 'success' || !data.user) return;

        var active = read();
        if (!active) return;

        var fresh = normalizeUser(data.user);
        if (!fresh) return;

        var changed = String(active.id) !== String(fresh.id) ||
          active.username !== fresh.username ||
          active.role !== fresh.role;

        if (changed) {
          save(fresh, data.expires_at);
          window.location.reload();
        }
      })
      .catch(function () {
        // Offline / server tidak merespons: pertahankan sesi lokal.
      });
  }

  window.AuthSession = {
    KEY: STORAGE_KEY,
    TTL: SESSION_TTL,
    read: read,
    save: save,
    clear: clear,
    logout: logout,
    currentUser: currentUser,
    redirectToLogin: redirectToLogin,
    verify: verifyServerSession
  };

  var pageAllowed = guardPage();
  window.currentUser = memorySession;

  if (pageAllowed && PROTECTED_PAGES.indexOf(getPageName()) !== -1) {
    verifyServerSession();
  }

  // Cek ulang saat halaman diambil dari back/forward cache (mis. setelah logout).
  window.addEventListener('pageshow', function (event) {
    if (!guardPage()) return;
    if (event.persisted && PROTECTED_PAGES.indexOf(getPageName()) !== -1) {
      verifyServerSession();
    }
  });

  // Sinkronkan sesi antar-tab: login/logout di satu tab berlaku di tab lain.
  window.addEventListener('storage', function (event) {
    if (event.key !== null && event.key !== STORAGE_KEY) return;

    var user = read();
    var page = getPageName();

    if (!user && PROTECTED_PAGES.indexOf(page) !== -1) {
      redirectToLogin(false);
      return;
    }

    if (user && page === 'login.html') {
      window.location.replace('dashboard.html');
      return;
    }

    if (PROTECTED_PAGES.indexOf(page) !== -1) {
      window.location.reload();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var loginForm = document.getElementById('loginForm');
    var errBox = document.getElementById('loginError');

    // Tampilkan pemberitahuan jika sesi sebelumnya telah berakhir.
    if (loginForm && errBox) {
      var params = new URLSearchParams(window.location.search);
      if (params.get('expired') === '1') {
        errBox.style.display = 'block';
        errBox.innerText = 'Sesi Anda telah berakhir. Silakan masuk kembali.';
      }
    }

    if (!loginForm) return;

    // Kosongkan kredensial saat halaman dimuat agar tidak terisi otomatis.
    var uField = document.getElementById('username');
    var pField = document.getElementById('password');
    if (uField) uField.value = '';
    if (pField) pField.value = '';

    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      var btn = document.getElementById('btnLogin');
      var defaultButtonHtml = btn ? btn.innerHTML : '';
      var usernameField = document.getElementById('username');
      var passwordField = document.getElementById('password');

      if (btn) {
        btn.innerHTML = 'Memproses...';
        btn.disabled = true;
      }
      if (errBox) errBox.style.display = 'none';

      try {
        var response = await fetch('api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({
            username: usernameField ? usernameField.value : '',
            password: passwordField ? passwordField.value : ''
          })
        });

        var data = null;
        try {
          data = await response.json();
        } catch (e) {
          throw new Error('Respons server tidak valid.');
        }

        if (data.status !== 'success' || !data.user) {
          throw new Error(data.message || 'Login gagal.');
        }

        save(data.user, data.expires_at);
        window.location.replace('dashboard.html');
      } catch (err) {
        if (errBox) {
          errBox.style.display = 'block';
          errBox.innerText = err.message;
          if (err.message.indexOf('fetch') !== -1 || err.message.indexOf('Failed to fetch') !== -1) {
            errBox.innerText = 'Gagal terhubung ke API. Pastikan server dan database aktif.';
          }
        }
      } finally {
        if (btn) {
          btn.innerHTML = defaultButtonHtml || '<i data-feather="log-in" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"></i> Masuk';
          btn.disabled = false;
          if (typeof feather !== 'undefined') feather.replace();
        }
      }
    });
  });
})();
