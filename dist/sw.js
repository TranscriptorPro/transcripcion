/**
 * sw.js — Service Worker (PWA2)
 * Cache-First para el app shell; Network-First para llamadas a la API de Groq.
 */

const CACHE_NAME   = 'transcriptor-pro-app.mmuk1cm2';
const GROQ_ORIGIN  = 'api.groq.com';

// Rutas que NUNCA deben cachearse (siempre network-first)
const NEVER_CACHE = ['/recursos/admin.html', '/recursos/login.html', '/recursos/registro.html', '/anexos/'];

// Recursos del app shell que se cachean en la instalación
const APP_SHELL = [
    './',
    './index.html',
    './app.mmuk1cm2.min.js',
    './app.mmuk1cmh.min.css',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// ── Install: pre-cachear app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // cache:'no-store' bypasa el HTTP cache del browser → siempre trae la versión fresca del servidor
            const requests = APP_SHELL.map(url => new Request(url, { cache: 'no-store' }));
            return cache.addAll(requests).catch(err => {
                console.warn('[SW] Algunos recursos no pudieron cachearse:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: eliminar caches viejos ─────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

// ── Message: forzar activación desde la página ───────────────────────────────
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-First: llamadas a la API de Groq (nunca cachear)
    if (url.hostname.includes(GROQ_ORIGIN)) {
        event.respondWith(
            fetch(event.request).catch(() => new Response(
                JSON.stringify({ error: { message: 'Sin conexión a internet' } }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            ))
        );
        return;
    }

    // No manejar solicitudes no-GET
    if (event.request.method !== 'GET') return;

    // Network-First: rutas que NUNCA deben cachearse (admin, login, tests)
    // cache:'no-store' bypasses browser HTTP cache entirely
    if (NEVER_CACHE.some(path => url.pathname.includes(path))) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).catch(() => {
                // Offline: intentar cache como último recurso
                return caches.match(event.request);
            })
        );
        return;
    }

    // Network-First: Google Apps Script (backend)
    if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response(
                JSON.stringify({ error: 'Sin conexión' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            ))
        );
        return;
    }

    // Network-First para HTML siempre — nunca cachear index.html
    if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).then(response => {
                return response;
            }).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Network-First para JS y CSS del app shell
    const isAppShellUpdate = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
    if (isAppShellUpdate) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') return caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Cache-First: imágenes, fuentes y otros recursos estáticos
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => {
                // Offline fallback: devolver index.html para navegación
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
