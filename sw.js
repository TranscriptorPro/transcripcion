/**
 * sw.js — Service Worker (PWA2)
 * Cache-First para el app shell; Network-First para llamadas a la API de Groq.
 */

const CACHE_NAME   = 'transcriptor-pro-v70';
const GROQ_ORIGIN  = 'api.groq.com';

// Rutas que NUNCA deben cachearse (siempre network-first)
const NEVER_CACHE = ['/recursos/admin.html', '/recursos/login.html', '/recursos/registro.html', '/anexos/'];

// Recursos del app shell que se cachean en la instalación
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    // CSS
    './src/css/base.css',
    './src/css/variables.css',
    './src/css/layout.css',
    './src/css/components.css',
    './src/css/animations.css',
    './src/css/preview-print.css',
    './src/css/skins/cyberpunk.css',
    './src/css/skins/light-minimal.css',
    // Utils
    './src/js/utils/db.js',
    './src/js/utils/dom.js',
    './src/js/utils/toast.js',
    './src/js/utils/uiModalFocusUtils.js',
    './src/js/utils/ui.js',
    './src/js/utils/uiComparisonUtils.js',
    './src/js/utils/uiPreviewDownloadUtils.js',
    './src/js/utils/uiPatientDataUtils.js',
    './src/js/utils/uiThemeUtils.js',
    './src/js/utils/uiKeyboardShortcuts.js',
    './src/js/utils/uiAutosaveUtils.js',
    './src/js/utils/uiMultiTabUtils.js',
    './src/js/utils/uiApiManagementUtils.js',
    './src/js/utils/uiProfessionalUtils.js',
    './src/js/utils/tabsIndexUtils.js',
    './src/js/utils/tabs.js',
    './src/js/utils/stateManager.js',
    // Config
    './src/js/config/config.js',
    './src/js/config/templatesCatalog.js',
    './src/js/config/templatesCatalogPart2.js',
    './src/js/config/templatesCatalogPart3.js',
    './src/js/config/templates.js',
    './src/js/config/studyTerminology.js',
    // Core
    './src/js/core/audio.js',
    './src/js/core/state.js',
    // Features
    './src/js/features/editor.js',
    './src/js/features/editorDialogUtils.js',
    './src/js/features/editorFieldModalUtils.js',
    './src/js/features/editorCopyPrintUtils.js',
    './src/js/features/editorDownloadCoreUtils.js',
    './src/js/features/editorExportRenderUtils.js',
    './src/js/features/editorDownloadFavoritesUtils.js',
    './src/js/features/editorNormalTemplateUtils.js',
    './src/js/features/editorFormattingFindUtils.js',
    './src/js/features/editorSnapshotsUtils.js',
    './src/js/features/transcriptorWhisperPromptUtils.js',
    './src/js/features/transcriptor.js',
    './src/js/features/structurerCoreUtils.js',
    './src/js/features/structurer.js',
    './src/js/features/formHandler.js',
    './src/js/features/pdfDataAccessUtils.js',
    './src/js/features/reportContextResolver.js',
    './src/js/features/pdfPreview.js',
    './src/js/features/pdfPreviewActions.js',
    './src/js/features/pdfMakerSectionUtils.js',
    './src/js/features/pdfMaker.js',
    './src/js/features/reportHistoryPolicyUtils.js',
    './src/js/features/reportHistory.js',
    './src/js/features/patientRegistry.js',
    './src/js/features/referringDoctorRegistry.js',
    './src/js/features/studyReasonHistory.js',
    './src/js/features/medDictionary.js',
    './src/js/features/contact.js',
    './src/js/features/diagnostic.js',
    './src/js/features/licenseCacheUtils.js',
    './src/js/features/licenseManager.js',
    './src/js/features/themeManager.js',
    './src/js/features/settingsPanel.js',
    './src/js/features/sessionAssistant.js',
    './src/js/features/outputProfiles.js',
    './src/js/features/business.js',
    './src/js/features/pricingCart.js',
    './src/js/features/userGuide.js',
    './recursos/manual.html',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
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
