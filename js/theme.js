/**
 * theme.js — Dark / Light mode toggle
 * Persists preference in localStorage key: silisa_theme
 * Apply early in <head> to avoid FOUC.
 */
(function () {
    'use strict';

    var KEY = 'silisa_theme';
    var saved = localStorage.getItem(KEY);

    // Apply immediately before paint
    if (saved === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body && document.body.classList.add('dark-mode');
    }

    function applyTheme(dark) {
        document.documentElement.classList.toggle('dark-mode', dark);
        document.body.classList.toggle('dark-mode', dark);
        localStorage.setItem(KEY, dark ? 'dark' : 'light');

        // Update icon
        var icon = document.getElementById('themeIcon');
        if (icon) {
            icon.setAttribute('data-feather', dark ? 'sun' : 'moon');
            if (typeof feather !== 'undefined') feather.replace();
        }

        // Update meta theme-color
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#202124' : '#ffffff');
    }

    // Apply on DOMContentLoaded to ensure body exists
    document.addEventListener('DOMContentLoaded', function () {
        var isDark = localStorage.getItem(KEY) === 'dark';
        document.body.classList.toggle('dark-mode', isDark);

        // Set correct icon on load
        var icon = document.getElementById('themeIcon');
        if (icon) {
            icon.setAttribute('data-feather', isDark ? 'sun' : 'moon');
        }
    });

    // Delegate click on toggle button (works even before DOM ready)
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('#btnToggleTheme');
        if (btn) {
            applyTheme(!document.body.classList.contains('dark-mode'));
        }
    });
})();
