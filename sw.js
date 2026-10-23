const CACHE_NAME = 'tematikmap-v9';
const ASSETS = [
    './',
    './index.html',
    './portal.html',
    './dashboard.html',
    './report.html',
    './tracker.html',
    './login.html',
    './admin.html',
    './settings.html',
    './css/style.css',
    './css/mobile.css',
    './js/app.js',
    './js/mobile-nav.js',
    './js/theme.js',
    './manifest.json',
    './images/logo.png',
    './images/favicon.png',
    './images/pwa-192.png',
    './images/pwa-512.png'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching latest static assets');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: Clear all obsolete caches immediately
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => {
                    console.log('Deleting obsolete cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Network-First for HTML pages & APIs to always display the latest dashboard
self.addEventListener('fetch', event => {
    const isNavigation = event.request.mode === 'navigate' || 
                         event.request.destination === 'document' ||
                         event.request.url.includes('.html') || 
                         event.request.url.endsWith('/');

    if (event.request.url.includes('api/') || isNavigation) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Stale-while-revalidate for static assets
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);
                return cachedResponse || fetchPromise;
            })
        );
    }
});
