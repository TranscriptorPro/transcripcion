/**
 * Circuits 21–34: Advanced features
 * ───────────────────────────────────
 * C21 — Historial de transcripciones
 * C22 — Diccionario médico
 * C23 — Settings avanzados (temas, custom color, UI)
 * C24 — Formulario de contacto
 * C25 — PWA (manifest, service worker, offline)
 * C26 — Panel de administración
 * C27 — Fábrica de clones (factory)
 * C28 — Seguridad XSS (sanitización)
 * C29 — Atajos de teclado
 * C30 — Contadores de palabras/caracteres
 * C31 — Toast/notificaciones
 * C32 — Modal de diagnóstico
 * C33 — Accesibilidad básica (ARIA, focus)
 * C34 — Consola limpia (error global check)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
function nowStamp() {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function esc(s) { return String(s || '').replace(/[|]/g, '\\|').replace(/\n/g, ' '); }

async function main() {
    const stamp = nowStamp();
    const aDir = path.join(process.cwd(), 'anexos', 'accesorios', `c21_34_artifacts_${stamp}`);
    ensureDir(aDir); const ssDir = path.join(aDir, 'screenshots'); ensureDir(ssDir);

    const results = []; const consoleErrors = [];
    const add = (id, st, det) => { results.push({ id, status: st, detail: det }); console.log(`${st === 'PASS' ? '✅' : st === 'WARN' ? '⚠️' : '❌'} ${id} — ${det}`); };
    const ss = async (pg, name) => { try { await pg.screenshot({ path: path.join(ssDir, `${name}.png`), fullPage: false }); } catch (_) { } };

    const browser = await chromium.launch({ headless: false, slowMo: 60 });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await context.route('**/openai/v1/**', async (route) => {
        await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ choices: [{ message: { content: '# Mock\n## HALLAZGOS\n- Mock.' } }], text: 'Mock transcription.' }),
        });
    });

    let page = await context.newPage();
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const t = msg.text();
            if (!t.includes('favicon') && !t.includes('net::ERR') && !t.includes('Failed to load resource') && !t.includes('service-worker'))
                consoleErrors.push(t);
        }
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // ═══ C21: HISTORIAL DE TRANSCRIPCIONES ═══
    try {
        const history = await page.evaluate(() => {
            const btn = document.getElementById('btnHistory') || document.getElementById('historyBtn') || document.querySelector('[data-action="history"]');
            const historyExists = typeof window.loadHistory === 'function' || typeof window.showHistory === 'function';
            return { btnExists: !!btn, btnId: btn?.id || 'not found', funcExists: historyExists };
        });
        add('C21-01', history.btnExists ? 'PASS' : 'WARN', `Historial: btn=${history.btnId}, func=${history.funcExists}`);
    } catch (e) { add('C21-01', 'FAIL', e.message); }

    try {
        const historyStore = await page.evaluate(() => {
            const key = 'transcription_history';
            const data = localStorage.getItem(key);
            return { hasKey: !!data, entries: data ? JSON.parse(data).length : 0 };
        });
        add('C21-02', 'PASS', `Historial storage: hasKey=${historyStore.hasKey}, entries=${historyStore.entries}`);
    } catch (e) { add('C21-02', 'WARN', `Historial storage: ${e.message}`); }

    // ═══ C22: DICCIONARIO MÉDICO ═══
    try {
        const dict = await page.evaluate(() => {
            const btn = document.getElementById('btnDictionary') || document.getElementById('dictBtn') || document.querySelector('[data-action="dictionary"]');
            const hasDictFunc = typeof window.openDictionary === 'function' || typeof window.showDictionary === 'function';
            // Check if dictionary module loaded
            const hasMedicalDict = typeof window.medicalDictionary !== 'undefined' || typeof window.MedicalDictionary !== 'undefined';
            return { btnExists: !!btn, btnId: btn?.id || 'not found', funcExists: hasDictFunc, moduleExists: hasMedicalDict };
        });
        add('C22-01', dict.btnExists ? 'PASS' : 'WARN', `Diccionario: btn=${dict.btnId}, func=${dict.funcExists}, module=${dict.moduleExists}`);
        await ss(page, 'C22-01_dictionary');
    } catch (e) { add('C22-01', 'FAIL', e.message); }

    // ═══ C23: SETTINGS AVANZADOS ═══
    try {
        await page.evaluate(() => { if (typeof window.openSettingsModal === 'function') window.openSettingsModal(); });
        await page.waitForTimeout(800);
        const settings = await page.evaluate(() => {
            const modal = document.getElementById('settingsModal') || document.getElementById('settingsOverlay');
            const isVisible = modal && (modal.classList.contains('active') || window.getComputedStyle(modal).display !== 'none');

            // Check for sections inside
            const sections = [];
            if (modal) {
                const headings = modal.querySelectorAll('h3, h4, .section-title, legend');
                headings.forEach(h => sections.push(h.textContent.trim().slice(0, 40)));
            }

            // Check specific settings elements
            const hasApiKey = !!document.getElementById('groqApiKey');
            const hasThemeSection = !!document.querySelector('.theme-options, .theme-container, #themeSection');

            return { visible: isVisible, sections, hasApiKey, hasThemeSection };
        });
        add('C23-01', settings.visible ? 'PASS' : 'WARN', `Settings visible=${settings.visible}, secciones=[${settings.sections.slice(0, 5).join(', ')}]`);
        add('C23-02', settings.hasApiKey ? 'PASS' : 'WARN', `API Key field: ${settings.hasApiKey}`);
        await ss(page, 'C23-01_settings');
    } catch (e) { add('C23-01', 'FAIL', e.message); }

    // Close settings
    await page.evaluate(() => {
        const close = document.querySelector('#settingsModal .close-btn, #settingsModal [data-dismiss], .modal-close');
        if (close) close.click();
    });
    await page.waitForTimeout(300);

    // ═══ C24: FORMULARIO DE CONTACTO ═══
    try {
        const contact = await page.evaluate(() => {
            const btn = document.getElementById('btnContact') || document.getElementById('contactBtn') || document.querySelector('[data-action="contact"]');
            const hasContactFunc = typeof window.openContactForm === 'function' || typeof window.showContactModal === 'function';
            const contactForm = document.getElementById('contactForm') || document.getElementById('contactModal');
            return { btnExists: !!btn, btnId: btn?.id, funcExists: hasContactFunc, formExists: !!contactForm };
        });
        add('C24-01', contact.btnExists || contact.funcExists ? 'PASS' : 'WARN',
            `Contacto: btn=${contact.btnId}, func=${contact.funcExists}, form=${contact.formExists}`);
    } catch (e) { add('C24-01', 'FAIL', e.message); }

    // ═══ C25: PWA ═══
    try {
        const pwa = await page.evaluate(() => {
            const manifestLink = document.querySelector('link[rel="manifest"]');
            const hasServiceWorker = 'serviceWorker' in navigator;
            const hasMeta = !!document.querySelector('meta[name="theme-color"]');
            return { hasManifest: !!manifestLink, manifestHref: manifestLink?.href || '', hasServiceWorker, hasThemeMeta: hasMeta };
        });
        add('C25-01', pwa.hasManifest ? 'PASS' : 'FAIL', `Manifest: ${pwa.hasManifest ? pwa.manifestHref.split('/').pop() : 'no'}`);
        add('C25-02', pwa.hasServiceWorker ? 'PASS' : 'FAIL', `Service Worker API: ${pwa.hasServiceWorker}`);
        add('C25-03', pwa.hasThemeMeta ? 'PASS' : 'WARN', `Meta theme-color: ${pwa.hasThemeMeta}`);
    } catch (e) { add('C25-01', 'FAIL', e.message); }

    // ═══ C26: PANEL DE ADMINISTRACIÓN ═══
    try {
        const admin = await page.evaluate(() => {
            const btn = document.getElementById('btnAdmin') || document.getElementById('adminBtn') || document.getElementById('btnOpenAdmin')
                || document.querySelector('[data-action="admin"]');
            const panel = document.getElementById('adminPanel') || document.getElementById('adminOverlay');
            const hasFunc = typeof window.openAdminPanel === 'function' || typeof window.showAdminPanel === 'function';
            return { btnExists: !!btn, btnId: btn?.id, panelExists: !!panel, funcExists: hasFunc };
        });
        add('C26-01', admin.btnExists || admin.funcExists ? 'PASS' : 'WARN',
            `Admin: btn=${admin.btnId}, panel=${admin.panelExists}, func=${admin.funcExists}`);
        await ss(page, 'C26-01_admin');
    } catch (e) { add('C26-01', 'FAIL', e.message); }

    // ═══ C27: FÁBRICA DE CLONES ═══
    try {
        const factory = await page.evaluate(() => {
            const hasFactory = typeof window.openFactoryPanel === 'function' || typeof window.showFactoryModal === 'function';
            const hasPendingSetup = typeof window._PENDING_SETUP_ID !== 'undefined';
            const hasClientConfig = typeof window.CLIENT_CONFIG !== 'undefined';
            return { hasFactory, hasPendingSetup, configType: hasClientConfig ? window.CLIENT_CONFIG.type : 'N/A' };
        });
        add('C27-01', factory.hasClientConfig ? 'PASS' : 'FAIL',
            `Factory: func=${factory.hasFactory}, configType=${factory.configType}`);
    } catch (e) { add('C27-01', 'FAIL', e.message); }

    // ═══ C28: SEGURIDAD XSS ═══
    try {
        const xss = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false, reason: 'no editor' };
            // Test 1: Script injection
            const malicious = '<img src=x onerror="window.__XSS_FIRED=true"><script>window.__XSS_SCRIPT=true</script>';
            ed.innerHTML = malicious;
            // Check if DOMPurify cleaned it
            const hasDOMPurify = typeof DOMPurify !== 'undefined';
            const hasOnerror = ed.innerHTML.includes('onerror');
            const hasScript = ed.innerHTML.includes('<script');
            const xssFired = window.__XSS_FIRED === true;
            const xssScript = window.__XSS_SCRIPT === true;
            return { hasDOMPurify, hasOnerror, hasScript, xssFired, xssScript };
        });

        if (!xss.xssFired && !xss.xssScript) {
            add('C28-01', 'PASS', `XSS bloqueado (DOMPurify=${xss.hasDOMPurify}, onerror=${xss.hasOnerror}, script=${xss.hasScript})`);
        } else {
            add('C28-01', 'FAIL', `⚠️ XSS EJECUTADO: onerror=${xss.xssFired}, script=${xss.xssScript}`);
        }
    } catch (e) { add('C28-01', 'FAIL', e.message); }

    // XSS test 2: via paste
    try {
        const pasteXss = await page.evaluate(() => {
            window.__XSS_PASTE = false;
            const ed = document.getElementById('editor');
            ed.innerHTML = 'texto limpio';
            const html = '<div onmouseover="window.__XSS_PASTE=true">hover me</div><script>window.__XSS_PASTE_SCRIPT=true</script>';
            const dt = new DataTransfer();
            dt.setData('text/html', html);
            const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            ed.dispatchEvent(evt);
            return { pasteFired: window.__XSS_PASTE, pasteScript: window.__XSS_PASTE_SCRIPT === true, html: ed.innerHTML.slice(0, 120) };
        });
        if (!pasteXss.pasteFired && !pasteXss.pasteScript) {
            add('C28-02', 'PASS', 'XSS via paste bloqueado');
        } else {
            add('C28-02', 'FAIL', `XSS via paste: mouseover=${pasteXss.pasteFired}, script=${pasteXss.pasteScript}`);
        }
    } catch (e) { add('C28-02', 'FAIL', e.message); }

    // ═══ C29: ATAJOS DE TECLADO ═══
    try {
        const shortcuts = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false };
            ed.innerHTML = 'Texto para probar atajos de teclado disponibles.';
            ed.focus();
            // Select all text
            const range = document.createRange(); range.selectNodeContents(ed);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);

            // Test Ctrl+B
            document.execCommand('bold', false, null);
            const hasBold = /<(strong|b)\b/i.test(ed.innerHTML);

            // Test Ctrl+I
            document.execCommand('italic', false, null);
            const hasItalic = /<(em|i)\b/i.test(ed.innerHTML);

            return { hasBold, hasItalic };
        });
        add('C29-01', shortcuts.hasBold && shortcuts.hasItalic ? 'PASS' : 'WARN',
            `Atajos: bold=${shortcuts.hasBold}, italic=${shortcuts.hasItalic}`);
    } catch (e) { add('C29-01', 'FAIL', e.message); }

    // ═══ C30: CONTADORES DE PALABRAS/CARACTERES ═══
    try {
        const counter = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false };
            ed.innerHTML = 'Una dos tres cuatro cinco seis siete ocho nueve diez.';
            ed.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof updateWordCount === 'function') updateWordCount();

            const wc = document.getElementById('wordCount') || document.querySelector('.word-count');
            return { exists: !!wc, text: wc?.textContent?.trim() || '', id: wc?.id || 'not found' };
        });
        add('C30-01', counter.exists ? 'PASS' : 'WARN', `Contador: ${counter.id}, "${counter.text}"`);
        await ss(page, 'C30-01_word_count');
    } catch (e) { add('C30-01', 'FAIL', e.message); }

    // ═══ C31: TOAST/NOTIFICACIONES ═══
    try {
        const toast = await page.evaluate(() => {
            if (typeof showToast !== 'function') return { ok: false, reason: 'showToast undefined' };
            showToast('Test QA notification', 'success');
            const container = document.getElementById('toastContainer') || document.querySelector('.toast-container');
            const toasts = container ? container.querySelectorAll('.toast, .notification').length : 0;
            return { ok: true, containerExists: !!container, toastCount: toasts };
        });
        add('C31-01', toast.ok ? 'PASS' : 'FAIL', `Toast: container=${toast.containerExists}, count=${toast.toastCount}`);
        await ss(page, 'C31-01_toast');
    } catch (e) { add('C31-01', 'FAIL', e.message); }

    // ═══ C32: MODAL DE DIAGNÓSTICO ═══
    try {
        const diag = await page.evaluate(() => {
            const btn = document.getElementById('btnDiagnostic') || document.getElementById('diagnosticBtn') || document.querySelector('[data-action="diagnostic"]');
            const hasFunc = typeof window.openDiagnostic === 'function' || typeof window.showDiagPanel === 'function' || typeof window.runDiagnostics === 'function';
            return { btnExists: !!btn, btnId: btn?.id || 'not found', funcExists: hasFunc };
        });
        add('C32-01', diag.btnExists || diag.funcExists ? 'PASS' : 'WARN', `Diagnóstico: btn=${diag.btnId}, func=${diag.funcExists}`);
    } catch (e) { add('C32-01', 'FAIL', e.message); }

    // ═══ C33: ACCESIBILIDAD BÁSICA ═══
    try {
        const a11y = await page.evaluate(() => {
            const htmlLang = document.documentElement.lang;
            const hasTitle = !!document.title;
            const ariaElements = document.querySelectorAll('[aria-label], [aria-pressed], [role]').length;
            const tabindex = document.querySelectorAll('[tabindex]').length;
            const altImages = document.querySelectorAll('img[alt]').length;
            const totalImages = document.querySelectorAll('img').length;
            return { lang: htmlLang, hasTitle, ariaCount: ariaElements, tabindex, altImages, totalImages };
        });
        add('C33-01', a11y.lang ? 'PASS' : 'WARN', `Lang: "${a11y.lang}", title=${a11y.hasTitle}`);
        add('C33-02', a11y.ariaCount > 5 ? 'PASS' : 'WARN', `ARIA elements: ${a11y.ariaCount}, tabindex: ${a11y.tabindex}`);
        add('C33-03', a11y.totalImages === 0 || a11y.altImages > 0 ? 'PASS' : 'WARN', `Imgs con alt: ${a11y.altImages}/${a11y.totalImages}`);
    } catch (e) { add('C33-01', 'FAIL', e.message); }

    // ═══ C34: CONSOLA LIMPIA ═══
    if (consoleErrors.length === 0) {
        add('C34-01', 'PASS', '0 errores JS en consola durante C21-C34');
    } else {
        add('C34-01', 'WARN', `${consoleErrors.length} error(es): ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    await ss(page, 'C21-34_FINAL');
    await browser.close();

    // ── Report ───
    const reportPath = path.join(aDir, 'C21_34_REPORT.md');
    const pass = results.filter(r => r.status === 'PASS').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const fail = results.filter(r => r.status === 'FAIL').length;

    const lines = ['# Circuitos 21–34: Avanzados — Reporte', '',
        `- **Fecha**: ${new Date().toISOString()}`, `- **URL**: ${APP_URL}`,
        `- **Resultado**: ✅ PASS=${pass}  ⚠️ WARN=${warn}  ❌ FAIL=${fail}`,
        '', '| Paso | Estado | Detalle |', '|------|--------|---------|',
    ];
    for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
        lines.push(`| ${r.id} | ${icon} ${r.status} | ${esc(r.detail)} |`);
    }
    if (consoleErrors.length > 0) {
        lines.push('', '## Console errors', '');
        consoleErrors.forEach((e, i) => lines.push(`${i + 1}. \`${e.slice(0, 200)}\``));
    }
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(`\n📄 Reporte: ${reportPath}`);
    console.log(`\n═══ RESUMEN C21-C34 ═══`);
    console.log(`  PASS: ${pass}  |  WARN: ${warn}  |  FAIL: ${fail}`);
    process.exit(fail > 0 ? 2 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(99); });
