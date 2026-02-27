/**
 * sw.js — Service Worker (PWA2)
 * Cache-First para el app shell; Network-First para llamadas a la API de Groq.
 */

const CACHE_NAME   = 'transcriptor-pro-v27';
const GROQ_ORIGIN  = 'api.groq.com';

// Rutas que NUNCA deben cachearse (siempre network-first)
const NEVER_CACHE = ['/recursos/', '/anexos/'];

// Recursos del app shell que se cachean en la instalación
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './src/css/base.css',
    './src/css/variables.css',
    './src/css/layout.css',
    './src/css/components.css',
    './src/css/animations.css',
    './src/js/config/config.js',
    './src/js/config/templates.js',
    './src/js/config/studyTerminology.js',
    './src/js/core/audio.js',
    './src/js/core/state.js',
    './src/js/utils/dom.js',
    './src/js/utils/stateManager.js',
    './src/js/utils/tabs.js',
    './src/js/utils/toast.js',
    './src/js/utils/ui.js',
    './src/js/features/business.js',
    './src/js/features/contact.js',
    './src/js/features/editor.js',
    './src/js/features/formHandler.js',
    './src/js/features/medDictionary.js',
    './src/js/features/patientRegistry.js',
    './src/js/features/pdfMaker.js',
    './src/js/features/reportHistory.js',
    './src/js/features/pdfPreview.js',
    './src/js/features/sessionAssistant.js',
    './src/js/features/structurer.js',
    './src/js/features/transcriptor.js',
    './src/js/features/outputProfiles.js',
    './src/js/features/diagnostic.js',
    './src/js/features/licenseManager.js',
    './src/js/features/settingsPanel.js',
    './src/js/features/userGuide.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
];

// ── Install: pre-cachear app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL).catch(err => {
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

    // Cache-First: app shell y recursos estáticos (solo la app principal)
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
