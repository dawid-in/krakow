// Offline support for krakow.html.
// Everything is served from the cache straight away and refreshed in the background,
// so the page opens with no signal — and an edit shows up on the second load after it is published.
const CACHE = 'krakow-v1';
const FONT_AWESOME = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/';
const TAILWIND = 'https://cdn.tailwindcss.com/';

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => Promise.all([
        cache.addAll(['./krakow.html', FONT_AWESOME + 'css/all.min.css', FONT_AWESOME + 'webfonts/fa-solid-900.woff2']),
        // Tailwind's CDN sends no CORS headers, so it can only be stored as an opaque response.
        // The page still renders without it (its CSS is inlined), so a failure here is not fatal.
        fetch(TAILWIND, { mode: 'no-cors' }).then(response => cache.put(TAILWIND, response)).catch(() => {})
    ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const request = event.request;
    // The weather is only useful live; loadWeather() hides the strips when it can't be fetched
    if (request.method !== 'GET' || request.url.includes('open-meteo.com')) return;

    event.respondWith(caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fresh = fetch(request).then(response => {
            if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
            return response;
        });
        if (!cached) return fresh;
        event.waitUntil(fresh.catch(() => {}));
        return cached;
    }));
});
