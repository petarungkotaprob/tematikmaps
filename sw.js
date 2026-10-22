const CACHE_NAME = 'silisa-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/portal.html',
    '/dashboard.html',
    '/report.html',
    '/tracker.html',
    '/analytics.html',
    '/login.html',
    '/css/style.css',
    '/images/logo.png',
    '/images/favicon.png'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching static assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    // Network first for API, Cache first for static assets
    if (event.request.url.includes('api/')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
