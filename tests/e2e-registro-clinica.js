/**
 * E2E automatizado: flujo completo de registro CLINIC, con navegador visible,
 * carga de imagenes reales y reporte HTML navegable por capturas.
 *
 * Uso recomendado:
 *   node tests/e2e-registro-clinica.js
 *
 * Variables de entorno opcionales:
 *   REGISTRO_URL        URL del formulario
 *   HEADLESS            1 = sin ventana, 0 = visible
 *   SLOWMO              demora entre acciones en ms
 *   LOGOS_DIR           carpeta de imagenes para uploads
 *   WAIT_FOR_SUBMIT_MS  espera maxima del submit/portal
 *   FINAL_PAUSE_MS      pausa final antes de cerrar el browser
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REGISTRO_URL = process.env.REGISTRO_URL
    || 'https://transcriptorpro.github.io/transcripcion/recursos/registro.html';
const HEADLESS = process.env.HEADLESS === '1';
const SLOWMO = Number(process.env.SLOWMO || 450);
const LOGOS_DIR = process.env.LOGOS_DIR || 'C:\\Users\\kengy\\Desktop\\Logos';
const WAIT_FOR_SUBMIT_MS = Number(process.env.WAIT_FOR_SUBMIT_MS || 45000);
const FINAL_PAUSE_MS = Number(process.env.FINAL_PAUSE_MS || 12000);

const CLINICA = {
    nombre: 'Clinica La Casa Del Arbol',
    cuit: '30-70011223-9',
    email: 'admin@lacasadelarbol.demo',
    telefono: '+54 11 4500-7700',
    sedes: [
        {
            nombre: 'Sede Central - Casa Del Arbol',
            direccion: 'Av. Del Arbol 1700, CABA',
            telefono: '+54 11 4500-7700',
            email: 'central@lacasadelarbol.demo',
            footer: 'Clinica La Casa Del Arbol - Sede Central | Tel: (011) 4500-7700'
        },
        {
            nombre: 'Sucursal Arbol Norte',
            direccion: 'Aranguren 2420, CABA',
            telefono: '+54 11 4500-7711',
            email: 'norte@lacasadelarbol.demo',
            footer: 'Clinica La Casa Del Arbol - Sucursal Norte'
        }
    ],
    profesionales: [
        {
            titulo: 'Dr.',
            nombre: 'Hernan Guillermo Rios',
            matricula: 'MN 87654',
            especialidad: 'Cardiologia',
            telefono: '+54 11 4500-7701',
            email: 'h.rios@lacasadelarbol.demo',
            usuario: 'hrios',
            pin: '4521'
        },
        {
            titulo: 'Dra.',
            nombre: 'Valentina Souza',
            matricula: 'MN 43210',
            especialidad: 'Neurologia',
            telefono: '+54 11 4500-7702',
            email: 'v.souza@lacasadelarbol.demo',
            usuario: 'vsouza',
            pin: '7890'
        },
        {
            titulo: 'Dr.',
            nombre: 'Lucas Matias Ferreira',
            matricula: 'MN 99001',
            especialidad: 'Diagnostico por Imagenes',
            telefono: '+54 11 4500-7703',
            email: 'l.ferreira@lacasadelarbol.demo',
            usuario: 'lferreira',
            pin: '1357'
        }
    ]
};

function nowStamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeLabel(value) {
    return value.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function listImageFiles(dirPath) {
    try {
        return fs.readdirSync(dirPath)
            .filter(name => /\.(png|jpg|jpeg|webp)$/i.test(name))
            .map(name => path.join(dirPath, name));
    } catch (_) {
        return [];
    }
}

function pickImages(pool, count, preferredToken) {
    const sorted = pool.slice().sort((a, b) => a.localeCompare(b));
    const preferred = preferredToken
        ? sorted.filter(file => path.basename(file).toLowerCase().includes(preferredToken.toLowerCase()))
        : [];
    const remaining = sorted.filter(file => !preferred.includes(file));
    return preferred.concat(remaining).slice(0, count);
}

function buildHtmlReport(outDir, captures, diagnostics) {
    const reportPath = path.join(outDir, 'reporte.html');
    const payload = JSON.stringify({ captures, diagnostics }, null, 2);
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte E2E Registro Clinica</title>
<style>
  :root {
    --bg:#0f172a;
    --panel:#111827;
    --muted:#94a3b8;
    --text:#e5eefc;
    --accent:#14b8a6;
    --border:#243042;
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:Segoe UI, Arial, sans-serif; background:linear-gradient(180deg,#0b1220,#111827); color:var(--text); }
  .layout { display:grid; grid-template-columns:320px 1fr; min-height:100vh; }
  .side { border-right:1px solid var(--border); background:rgba(15,23,42,.92); padding:18px; overflow:auto; }
  .main { padding:18px; }
  h1 { margin:0 0 10px; font-size:20px; }
  h2 { margin:20px 0 10px; font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .diag { font-size:13px; line-height:1.55; background:rgba(17,24,39,.9); border:1px solid var(--border); border-radius:12px; padding:12px; }
  .controls { display:flex; gap:10px; margin:0 0 14px; }
  button { border:none; border-radius:10px; padding:10px 14px; background:var(--accent); color:#062a2a; font-weight:700; cursor:pointer; }
  button.secondary { background:#1f2937; color:var(--text); border:1px solid var(--border); }
  .counter { color:var(--muted); font-size:13px; margin-bottom:12px; }
  .viewer { background:rgba(15,23,42,.8); border:1px solid var(--border); border-radius:14px; padding:14px; }
  .viewer img { width:100%; max-height:78vh; object-fit:contain; border-radius:10px; background:#fff; }
  .caption { margin-top:10px; font-size:14px; }
  .note { margin-top:6px; color:var(--muted); font-size:13px; }
  .list { display:flex; flex-direction:column; gap:8px; }
  .step-btn { width:100%; text-align:left; background:#111827; color:var(--text); border:1px solid var(--border); }
  .step-btn.active { background:#0f766e; color:#ecfeff; border-color:#14b8a6; }
  .meta { color:var(--muted); font-size:12px; margin-top:3px; }
  @media (max-width: 980px) {
    .layout { grid-template-columns:1fr; }
    .side { border-right:none; border-bottom:1px solid var(--border); }
  }
</style>
</head>
<body>
<div class="layout">
  <aside class="side">
    <h1>Reporte E2E</h1>
    <div class="diag" id="diag"></div>
    <h2>Capturas</h2>
    <div class="list" id="list"></div>
  </aside>
  <main class="main">
    <div class="controls">
      <button class="secondary" id="prevBtn">Anterior</button>
      <button id="nextBtn">Siguiente</button>
    </div>
    <div class="counter" id="counter"></div>
    <div class="viewer">
      <img id="image" alt="Captura E2E">
      <div class="caption" id="caption"></div>
      <div class="note" id="note"></div>
      <div class="meta" id="meta"></div>
    </div>
  </main>
</div>
<script>
const data = ${payload};
let index = 0;
const listEl = document.getElementById('list');
const diagEl = document.getElementById('diag');
const imageEl = document.getElementById('image');
const captionEl = document.getElementById('caption');
const noteEl = document.getElementById('note');
const counterEl = document.getElementById('counter');
const metaEl = document.getElementById('meta');
function renderDiagnostics() {
  const d = data.diagnostics;
  diagEl.innerHTML = [
    '<div><strong>Estado final:</strong> ' + d.finalState + '</div>',
    '<div><strong>Submit:</strong> ' + d.submitSummary + '</div>',
    '<div><strong>Portal de pago:</strong> ' + d.portalSummary + '</div>',
    '<div><strong>Imagenes usadas:</strong> ' + d.usedImages.join(' | ') + '</div>',
    '<div><strong>Errores JS:</strong> ' + (d.jsErrors.length ? d.jsErrors.join(' | ') : 'sin errores') + '</div>'
  ].join('');
}
function renderList() {
  listEl.innerHTML = '';
  data.captures.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'step-btn' + (idx === index ? ' active' : '');
    btn.innerHTML = '<div>' + item.title + '</div><div class="meta">' + item.file + '</div>';
    btn.addEventListener('click', () => { index = idx; renderViewer(); renderList(); });
    listEl.appendChild(btn);
  });
}
function renderViewer() {
  const item = data.captures[index];
  imageEl.src = item.file;
  captionEl.textContent = item.title;
  noteEl.textContent = item.note || '';
  counterEl.textContent = 'Paso ' + (index + 1) + ' de ' + data.captures.length;
  metaEl.textContent = item.file;
}
document.getElementById('prevBtn').addEventListener('click', () => {
  index = (index - 1 + data.captures.length) % data.captures.length;
  renderViewer();
  renderList();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  index = (index + 1) % data.captures.length;
  renderViewer();
  renderList();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') document.getElementById('nextBtn').click();
  if (event.key === 'ArrowLeft') document.getElementById('prevBtn').click();
});
renderDiagnostics();
renderViewer();
renderList();
</script>
</body>
</html>`;
    fs.writeFileSync(reportPath, html, 'utf8');
    return reportPath;
}

const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-registro-clinic-' + nowStamp());
fs.mkdirSync(OUT_DIR, { recursive: true });

const captures = [];
let screenshotIdx = 0;
async function shot(page, label, note) {
    screenshotIdx++;
    const file = `${String(screenshotIdx).padStart(2, '0')}_${safeLabel(label)}.png`;
    const fpath = path.join(OUT_DIR, file);
    await page.screenshot({ path: fpath, fullPage: false });
    captures.push({ title: label, note: note || '', file });
    console.log(`  📸 ${file}`);
    return fpath;
}

async function fillAndBlur(page, selector, value) {
    const el = page.locator(selector);
    await el.click();
    await el.fill(value);
    await el.blur();
    await page.waitForTimeout(90);
}

async function uploadFile(locator, filePath, label) {
    if (!filePath) {
        console.warn(`  ⚠️  Sin archivo para ${label}`);
        return false;
    }
    await locator.setInputFiles(filePath);
    console.log(`  🖼️  ${label}: ${path.basename(filePath)}`);
    return true;
}

function basenameList(files) {
    return files.map(file => path.basename(file));
}

(async () => {
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  E2E Registro CLINIC | visible + uploads + reporte navegable');
    console.log('══════════════════════════════════════════════════════════════\n');
    console.log(`  URL:      ${REGISTRO_URL}`);
    console.log(`  Headless: ${HEADLESS}`);
    console.log(`  SlowMo:   ${SLOWMO} ms`);
    console.log(`  Logos:    ${LOGOS_DIR}`);
    console.log(`  Capturas: ${OUT_DIR}\n`);

    const imagePool = listImageFiles(LOGOS_DIR);
    const workplaceImages = pickImages(imagePool, 2, 'logo');
    const signatureImages = pickImages(imagePool, 3, 'firma');
    const professionalLogoImages = pickImages(imagePool, 3, 'logo');
    const usedImages = basenameList(workplaceImages.concat(signatureImages, professionalLogoImages));

    if (!imagePool.length) {
        console.warn('  ⚠️  No se encontraron imagenes en la carpeta configurada; el test seguira sin uploads.');
    }

    const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 920 } });
    const page = await ctx.newPage();
    const jsErrors = [];
    const networkEvents = [];
    const requestStartByUrl = new Map();

    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('request', req => {
        const url = req.url();
        if (/script\.google|googleusercontent|apps-script/i.test(url)) {
            requestStartByUrl.set(url + '|' + req.method(), Date.now());
        }
    });
    page.on('response', async res => {
        const url = res.url();
        if (!/script\.google|googleusercontent|apps-script/i.test(url)) return;
        const key = url + '|' + res.request().method();
        const startedAt = requestStartByUrl.get(key) || Date.now();
        networkEvents.push({
            url,
            method: res.request().method(),
            status: res.status(),
            elapsedMs: Date.now() - startedAt
        });
    });

    let reportPath = '';

    try {
        console.log('▶ Paso 0 — Seleccionar plan CLINIC');
        await page.goto(REGISTRO_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        await shot(page, 'paso0_inicial', 'Pantalla inicial de precios antes de cualquier interaccion.');

        await page.locator('button[data-curr="ARS"]').click();
        await page.waitForTimeout(700);
        await page.locator('.pricing-card:has-text("Clínica")').click();
        await page.waitForTimeout(350);
        await shot(page, 'paso0_clinic_seleccionado', 'Plan Clinica seleccionado en ARS.');

        await page.locator('#btnStep0Next').click();
        await page.waitForTimeout(800);
        await shot(page, 'paso1_datos_clinica', 'Ingreso al formulario principal de la clinica.');

        console.log('▶ Paso 1 — Datos de la clínica');
        await fillAndBlur(page, '#regNombre', CLINICA.nombre);
        await fillAndBlur(page, '#regMatricula', CLINICA.cuit);
        await fillAndBlur(page, '#regEmail', CLINICA.email);
        await fillAndBlur(page, '#regTelefono', CLINICA.telefono);
        await fillAndBlur(page, '#regSocialIg', '@cmisanmartin_oficial');
        await fillAndBlur(page, '#regSocialFb', 'facebook.com/cmisanmartin');
        await shot(page, 'paso1_relleno', 'Datos principales de la clinica completos y normalizados.');

        await page.locator('#step1 .btn-row .btn-primary').click();
        await page.waitForTimeout(850);

        console.log('▶ Paso 2 — Especialidades y estudios');
        await shot(page, 'paso2_especialidades', 'Listado inicial de especialidades disponibles.');
        const especialidades = ['Cardiología', 'Neurología', 'Diagnóstico por Imágenes'];
        for (const esp of especialidades) {
            const checkbox = page.locator(`.checkbox-item:has-text("${esp}") input`);
            if (await checkbox.count()) {
                await checkbox.check();
                await page.waitForTimeout(250);
            }
        }
        const btnTodos = page.locator('button:has-text("Seleccionar todos")');
        if (await btnTodos.count()) {
            await btnTodos.click();
            await page.waitForTimeout(350);
        }
        await shot(page, 'paso2_estudios_seleccionados', 'Especialidades y estudios completos para los tres profesionales.');

        await page.locator('#step2 .btn-row .btn-primary').click();
        await page.waitForTimeout(850);

        console.log('▶ Paso 3 — Sedes y profesionales con imágenes');
        await shot(page, 'paso3_sedes_inicio', 'Ingreso al paso de sedes, logos y profesionales.');

        const sede0 = CLINICA.sedes[0];
        await fillAndBlur(page, '#regWpAddress0', sede0.direccion);
        await fillAndBlur(page, '#regWpFooter0', sede0.footer);
        await uploadFile(page.locator('#wp-0 input[type="file"]').first(), workplaceImages[0], 'Logo sede principal');
        await page.waitForTimeout(500);
        await shot(page, 'paso3_sede_principal_rellena', 'Sede principal completa con logo institucional de ejemplo.');

        console.log('  → Agregar sucursal');
        const btnAddWp = page.locator('#btnAddWorkplace');
        if (await btnAddWp.count() && await btnAddWp.isVisible()) {
            await btnAddWp.click();
            await page.waitForTimeout(650);
            const sede1 = CLINICA.sedes[1];
            await fillAndBlur(page, '#regWpName1', sede1.nombre);
            await fillAndBlur(page, '#regWpAddress1', sede1.direccion);
            await fillAndBlur(page, '#regWpPhone1', sede1.telefono);
            await fillAndBlur(page, '#regWpEmail1', sede1.email);
            await fillAndBlur(page, '#regWpFooter1', sede1.footer);
            await uploadFile(page.locator('#wp-1 input[type="file"]').first(), workplaceImages[1] || workplaceImages[0], 'Logo sucursal');
            await page.waitForTimeout(500);
            await shot(page, 'paso3_sucursal_rellena', 'Sucursal adicional cargada con datos completos y logo.');
        } else {
            console.warn('  ⚠️  No se pudo agregar la segunda sede en esta ejecucion.');
        }

        console.log('  → Profesionales');
        for (let i = 0; i < CLINICA.profesionales.length; i++) {
            const prof = CLINICA.profesionales[i];
            if (i > 0) {
                await page.locator('#btnAddProfessional').click();
                await page.waitForTimeout(550);
            }

            console.log(`  → Profesional ${i + 1}: ${prof.titulo} ${prof.nombre}`);
            const card = page.locator(`#prof-${i}`);
            await card.locator(`.titulo-btn[data-t="${prof.titulo}"]`).click();
            await fillAndBlur(page, `#regProfName${i}`, prof.nombre);
            await fillAndBlur(page, `#regProfMatricula${i}`, prof.matricula);
            await fillAndBlur(page, `#regProfEspecialidad${i}`, prof.especialidad);
            await fillAndBlur(page, `#regProfTelefono${i}`, prof.telefono);
            await fillAndBlur(page, `#regProfEmail${i}`, prof.email);
            await fillAndBlur(page, `#regProfUsuario${i}`, prof.usuario);
            await page.locator(`#regProfPin${i}`).fill(prof.pin);

            const fileInputs = card.locator('input[type="file"]');
            await uploadFile(fileInputs.nth(0), signatureImages[i] || signatureImages[0] || workplaceImages[0], `Firma profesional ${i + 1}`);
            await uploadFile(fileInputs.nth(1), professionalLogoImages[i] || professionalLogoImages[0] || workplaceImages[0], `Logo profesional ${i + 1}`);
            await page.waitForTimeout(550);
            await shot(page, `paso3_prof${i + 1}_${prof.usuario}`, `Profesional ${i + 1} completo con firma y logo de prueba.`);
        }

        await shot(page, 'paso3_todo_listo', 'Todas las sedes y profesionales estan listos antes de avanzar.');

        await page.locator('#step3 .btn-row .btn-primary').click();
        await page.waitForTimeout(1200);
        let activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        console.log(`  Paso activo tras avanzar: ${activeStep}`);
        if (activeStep === 'step3') {
            console.log('  ⚠️  El avance quedo trabado en step3; forzando goStep(5).');
            await page.evaluate(() => goStep(5, { force: true }));
            await page.waitForTimeout(900);
            activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        }
        if (activeStep === 'step4') {
            await page.locator('#step4 .btn-row .btn-primary').click();
            await page.waitForTimeout(900);
            activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        }
        await shot(page, `paso_activo_${activeStep || 'desconocido'}`, 'Verificacion del paso activo despues de avanzar desde sedes/profesionales.');

        console.log('▶ Paso 5 — Carrito');
        await shot(page, 'paso5_carrito', 'Carrito sin extras agregados, tal como requiere la prueba base.');
        const btnCartNext = page.locator('#step5 .btn-row .btn-primary');
        if (await btnCartNext.count() && await btnCartNext.isVisible()) {
            await btnCartNext.click();
        } else {
            await page.evaluate(() => {
                const btn = document.querySelector('#step5 .btn-row .btn-primary');
                if (btn) btn.scrollIntoView();
            });
            await page.waitForTimeout(350);
            await btnCartNext.click({ force: true });
        }
        await page.waitForTimeout(900);

        console.log('▶ Paso 6 — Resumen de inversión');
        await shot(page, 'paso6_resumen_inversion', 'Resumen inicial del costo con pago unico y suscripcion mensual.');
        const btnAnual = page.locator('button[data-billing="annual"]');
        if (await btnAnual.count()) {
            await btnAnual.click();
            await page.waitForTimeout(500);
            await shot(page, 'paso6_billing_anual', 'Cambio al ciclo anual para validar el descuento y el total.');
        }

        console.log('▶ Submit — Registro y portal de pagos');
        const submitStartedAt = Date.now();
        await page.locator('#btnSubmit').click();

        let submitWaitTimedOut = false;
        try {
            await page.waitForFunction(() => {
                const step7 = document.getElementById('step7');
                const panel = document.getElementById('paymentPortalPanel');
                const btn = document.getElementById('btnSubmit');
                const step7Active = !!step7 && step7.classList.contains('active');
                const panelVisible = !!panel && getComputedStyle(panel).display !== 'none';
                const btnReset = !!btn && /Confirmar y Enviar Registro/.test(btn.textContent || '');
                return step7Active || panelVisible || btnReset;
            }, { timeout: WAIT_FOR_SUBMIT_MS });
        } catch (_) {
            submitWaitTimedOut = true;
        }

        if (!submitWaitTimedOut) {
            try {
                await page.waitForFunction(() => {
                    const status = document.getElementById('paymentPortalStatus');
                    const transfer = document.getElementById('paymentTransferData');
                    const statusText = status ? (status.innerText || '').trim() : '';
                    const transferText = transfer ? (transfer.innerText || '').trim() : '';
                    return transferText.length > 0 || /Error al cargar/i.test(statusText);
                }, { timeout: 20000 });
            } catch (_) {
                // Si no llega contenido, capturamos el estado igualmente para diagnostico.
            }
        }

        const submitElapsed = Date.now() - submitStartedAt;
        const step7State = await page.evaluate(() => ({
            active: !!document.getElementById('step7') && document.getElementById('step7').classList.contains('active'),
            title: document.getElementById('step7Title') ? document.getElementById('step7Title').textContent : '',
            message: document.getElementById('step7Message') ? document.getElementById('step7Message').innerText : '',
            paymentPanelVisible: !!document.getElementById('paymentPortalPanel') && getComputedStyle(document.getElementById('paymentPortalPanel')).display !== 'none',
            paymentStatus: document.getElementById('paymentPortalStatus') ? document.getElementById('paymentPortalStatus').innerText : '',
            transferText: document.getElementById('paymentTransferData') ? document.getElementById('paymentTransferData').innerText : '',
            uploadStatus: document.getElementById('paymentUploadStatus') ? document.getElementById('paymentUploadStatus').innerText : '',
            buttonText: document.getElementById('btnSubmit') ? document.getElementById('btnSubmit').textContent : ''
        }));

        await shot(page, 'paso7_resultado', 'Estado luego del submit, con foco en si el paso 7 y el panel de pagos quedaron visibles.');
        await page.waitForTimeout(2200);
        await shot(page, 'paso7_portal_pago', 'Captura final del portal de pagos o del estado de espera/error posterior al envio.');

        // Intentar subir comprobante con cualquier archivo de prueba disponible.
        if (step7State.paymentPanelVisible) {
            const receiptCandidate = workplaceImages[0] || signatureImages[0] || professionalLogoImages[0] || null;
            if (receiptCandidate) {
                console.log(`  🧾 Subiendo comprobante de prueba: ${path.basename(receiptCandidate)}`);
                await page.setInputFiles('#paymentReceiptInput', receiptCandidate);
                await page.waitForTimeout(350);
                await page.click('#btnSendReceipt');
                try {
                    await page.waitForFunction(() => {
                        const t = (document.getElementById('paymentUploadStatus')?.innerText || '').toLowerCase();
                        return t.includes('comprobante') || t.includes('enviado') || t.includes('revision') || t.includes('error');
                    }, { timeout: 30000 });
                } catch (_) {}
                await page.waitForTimeout(800);
                await shot(page, 'paso7_comprobante_enviado', 'Comprobante de prueba enviado desde el portal de pagos.');
            } else {
                console.log('  ⚠️  Sin imagen disponible para comprobante de prueba.');
            }
        }

        const registerEvent = networkEvents.find(item => item.method === 'POST');
        const portalEvent = networkEvents.find(item => /public_get_payment_portal/.test(item.url));
        const finalState = step7State.paymentPanelVisible
            ? 'Portal visible'
            : step7State.active
                ? 'Step 7 visible sin portal'
                : submitWaitTimedOut
                    ? 'Submit demorado o trabado'
                    : 'Sin transicion final';
        reportPath = buildHtmlReport(OUT_DIR, captures, {
            finalState,
            submitSummary: `${submitElapsed} ms${submitWaitTimedOut ? ' (timeout de espera del test)' : ''}${registerEvent ? ` | POST ${registerEvent.status} en ${registerEvent.elapsedMs} ms` : ' | sin respuesta POST detectada'}`,
            portalSummary: step7State.paymentPanelVisible
                ? `${step7State.paymentStatus || 'panel visible'}${portalEvent ? ` | GET portal ${portalEvent.status} en ${portalEvent.elapsedMs} ms` : ''}`
                : `${step7State.buttonText || 'sin boton'}${step7State.uploadStatus ? ` | ${step7State.uploadStatus}` : ''}`,
            usedImages,
            jsErrors
        });

        console.log('\n══════════════════════════════════════════════════════════════');
        console.log(`  Estado final: ${finalState}`);
        console.log(`  Submit total observado: ${submitElapsed} ms${submitWaitTimedOut ? ' (timeout del wait del test)' : ''}`);
        console.log(`  Titulo paso 7: ${step7State.title || '—'}`);
        console.log(`  Mensaje paso 7: ${(step7State.message || '—').replace(/\s+/g, ' ').slice(0, 220)}`);
        console.log(`  Panel pago visible: ${step7State.paymentPanelVisible}`);
        console.log(`  Estado portal: ${step7State.paymentStatus || '—'}`);
        console.log(`  Transferencia/QR: ${(step7State.transferText || '—').replace(/\s+/g, ' ').slice(0, 220)}`);
        if (registerEvent) console.log(`  Backend POST: ${registerEvent.status} en ${registerEvent.elapsedMs} ms`);
        if (portalEvent) console.log(`  Backend GET portal: ${portalEvent.status} en ${portalEvent.elapsedMs} ms`);
        if (jsErrors.length) {
            console.log(`  Errores JS: ${jsErrors.join(' | ')}`);
        } else {
            console.log('  Errores JS: ninguno');
        }
        console.log(`  Reporte HTML: ${reportPath}`);
        console.log(`  Capturas: ${OUT_DIR}`);
        console.log('══════════════════════════════════════════════════════════════\n');
    } catch (err) {
        console.error(`\n  ❌ Error durante el test: ${err.message}`);
        await shot(page, 'ERROR_estado_actual', 'Captura de error al momento de la falla.').catch(() => {});
        throw err;
    } finally {
        if (FINAL_PAUSE_MS > 0) {
            console.log(`  Manteniendo el navegador abierto ${FINAL_PAUSE_MS} ms para observacion final...`);
            await page.waitForTimeout(FINAL_PAUSE_MS);
        }
        await browser.close();
    }
})();
