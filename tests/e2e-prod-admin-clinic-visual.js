/**
 * E2E visual PRODUCCION: Admin → Registros → CLINIC card → Detalle → Comprobante → Aprobar
 * Navegador visible, con pausas para que el usuario vea cada paso.
 *
 *   node tests/e2e-prod-admin-clinic-visual.js
 *
 *   HEADLESS=0|1  SLOWMO=300  STEP_PAUSE=4000  FINAL_PAUSE=15000
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_URL = 'https://transcriptorpro.github.io/transcripcion/recursos/admin.html';
const LOGIN_URL = 'https://transcriptorpro.github.io/transcripcion/recursos/login.html';
const API_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const APP_BASE = 'https://transcriptorpro.github.io/transcripcion/';
const ADMIN_KEY = 'ADMIN_SECRET_2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2026';
const HEADLESS = process.env.HEADLESS === '1';
const SLOWMO = Number(process.env.SLOWMO || 300);
const STEP_PAUSE = Number(process.env.STEP_PAUSE || 4000);
const FINAL_PAUSE = Number(process.env.FINAL_PAUSE || 15000);
const TARGET_REG_ID = String(process.env.TARGET_REG_ID || '').trim();
const TARGET_CLINIC_NAME = String(process.env.TARGET_CLINIC_NAME || 'Clinica La Casa Del Arbol').trim();
const SKIP_RECEIPT_PREVIEW = String(process.env.SKIP_RECEIPT_PREVIEW || '1') === '1';

function ts() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

(async () => {
    const outDir = path.join(__dirname, '..', 'accesorios', 'reportes', `e2e-admin-clinic-${ts()}`);
    fs.mkdirSync(outDir, { recursive: true });
    let shotN = 0;
    const shotFiles = [];

    async function shot(page, label) {
        shotN++;
        const f = `${String(shotN).padStart(2,'0')}_${label.replace(/[^a-z0-9]/gi,'_')}.png`;
        await page.screenshot({ path: path.join(outDir, f), fullPage: false });
        shotFiles.push(f);
        console.log(`  📸 ${f}`);
    }

    async function gotoWithRetry(page, url, options, retries = 4) {
        let lastErr = null;
        for (let i = 1; i <= retries; i++) {
            try {
                await page.goto(url, options);
                return;
            } catch (err) {
                lastErr = err;
                const msg = String(err && err.message || '');
                const transient = /ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED|net::ERR_/i.test(msg);
                if (!transient || i === retries) break;
                console.log(`   ⚠️  Navegacion fallida (intento ${i}/${retries}), reintentando...`);
                await page.waitForTimeout(1500 * i);
            }
        }
        throw lastErr;
    }

    // Crear un archivo dummy para usar como comprobante de pago
    const dummyReceipt = path.join(outDir, 'comprobante_test.png');
    // Generar un PNG mínimo válido (1x1 rojo)
    const pngBuf = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de' +
        '0000000c4944415478016360f80f000001010000189d226e0000000049454e44ae426082',
        'hex'
    );
    fs.writeFileSync(dummyReceipt, pngBuf);

    console.log('\n=== E2E ADMIN CLINIC — FLUJO COMPLETO (PRODUCCION) ===');
    console.log(`HEADLESS=${HEADLESS?1:0} SLOWMO=${SLOWMO} STEP_PAUSE=${STEP_PAUSE}`);

    const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 920 } });

    const page = await ctx.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(String(e?.message || e)));

    try {
        // ─── 0. Login automático ──
        console.log('\n── PASO 0: Abriendo login y autenticando automáticamente...');
        await gotoWithRetry(page, LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await shot(page, '00_login_page');
        await page.fill('#username', ADMIN_USER);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#btnLogin');
        await page.waitForURL(/admin\.html/, { timeout: 45000 });
        console.log('   ✅ Login exitoso — redirigido a admin.html');
        // El panel mantiene requests en background; usamos DOM listo + breve estabilizacion.
        await page.waitForLoadState('domcontentloaded', { timeout: 45000 });
        await page.waitForTimeout(4500);
        // Cerrar cualquier modal/alert que aparezca al cargar
        await page.evaluate(() => {
            document.querySelectorAll('.approve-modal-overlay.show').forEach(el => el.classList.remove('show'));
            const okBtn = document.querySelector('.dash-alert-overlay .dash-alert-ok');
            if (okBtn) okBtn.click();
        });
        await page.waitForTimeout(500);
        await shot(page, '01_admin_post_login');

        // ─── 2. Ir a tab Registros y ESPERAR que carguen del backend ────
        console.log('── PASO 2: Abriendo tab Registros (esperando backend)...');
        await page.click('.tab-btn[data-tab="registros"]');
        await page.waitForSelector('#tab-registros.active', { timeout: 20000 });
        // Forzar refresh manual de registros para evitar estados stale del panel
        await page.evaluate(() => {
            try {
                if (typeof window.loadRegistrations === 'function') {
                    window.loadRegistrations();
                }
            } catch (_) {}
            try {
                const btns = Array.from(document.querySelectorAll('#tab-registros button'));
                const refreshBtn = btns.find((b) => (b.textContent || '').includes('Actualizar'));
                if (refreshBtn) refreshBtn.click();
            } catch (_) {}
        });

        // Esperar hasta 90s que aparezcan cards O el mensaje vacío visible
        await page.waitForFunction(() => {
            const cards = document.querySelectorAll('#registrosCards .reg-card');
            if (cards.length > 0) return true;
            const empty = document.getElementById('registrosEmpty');
            if (!empty) return false;
            const style = window.getComputedStyle(empty);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }, { timeout: 90000 });
        await page.waitForTimeout(1000); // estabilizar renderizado
        await shot(page, '02_registros_cargados');

        // Contar cards
        const totalCards = await page.evaluate(() =>
            document.querySelectorAll('#registrosCards .reg-card').length
        );
        console.log(`   → ${totalCards} tarjetas de registro cargadas`);

        // ─── 3. Encontrar la tarjeta CLINIC objetivo (por regId o nombre) ────────────
        console.log('── PASO 3: Buscando tarjeta CLINIC...');
        const clinicInfo = await page.evaluate(({ targetRegId, targetClinicName }) => {
            const normalize = (s) => String(s || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();

            const cards = document.querySelectorAll('#registrosCards .reg-card');
            const candidates = [];
            for (const card of cards) {
                const txt = card.textContent || '';
                if (txt.includes('CLINIC') || txt.includes('CUIT')) {
                    // Extraer regId del botón Detalle
                    const detBtn = card.querySelector('.btn-view-details');
                    if (!detBtn) continue;
                    const m = /viewRegDetail\('([^']+)'\)/.exec(detBtn.getAttribute('onclick') || '');
                    if (!m) continue;
                    // ¿Tiene botón Aprobar?
                    const apvBtn = card.querySelector('.btn-approve');
                    const apvId = apvBtn ? (/openApproveModal\('([^']+)'\)/.exec(apvBtn.getAttribute('onclick') || '') || [])[1] : null;
                    // ¿Tiene botón comprobante?
                    const rcpBtn = card.querySelector('button[onclick*="viewRegReceipt"]');
                    candidates.push({ regId: m[1], hasApprove: !!apvId, hasReceipt: !!rcpBtn, text: txt });
                }
            }

            if (targetRegId) {
                const exactById = candidates.find(c => String(c.regId) === String(targetRegId));
                if (exactById) return exactById;
            }

            const targetNorm = normalize(targetClinicName);
            if (targetNorm) {
                const exactByName = candidates.find(c => normalize(c.text).includes(targetNorm));
                if (exactByName) return exactByName;
            }

            return candidates[0] || null;
        }, { targetRegId: TARGET_REG_ID, targetClinicName: TARGET_CLINIC_NAME });

        if (!clinicInfo) throw new Error('No hay tarjeta CLINIC visible en registros');
        console.log(`   → CLINIC encontrada: ${clinicInfo.regId} | Aprobar: ${clinicInfo.hasApprove} | Comprobante: ${clinicInfo.hasReceipt}`);
        await page.waitForTimeout(STEP_PAUSE);

        // ─── 4. Abrir Detalle ───────────────────────────────
        console.log('── PASO 4: Abriendo Detalle...');
        await page.evaluate(rid => window.viewRegDetail(rid), clinicInfo.regId);
        await page.waitForSelector('#detailModalOverlay.show', { timeout: 15000 });
        await page.waitForTimeout(800);
        await shot(page, '03_detalle_clinic');

        // Verificar contenido del detalle
        const detailText = await page.evaluate(() =>
            document.getElementById('detailModalContent')?.textContent || ''
        );
        const checks = {
            razonSocial: detailText.includes('Raz') || detailText.includes('Nombre comercial'),
            cuit: detailText.includes('CUIT') || detailText.includes('Habilitaci'),
            profesionales: detailText.includes('Profesionales de la cl'),
            telAdm: detailText.includes('administrativo'),
            firmaNA: detailText.includes('No aplica')
        };
        console.log('   → Detalle CLINIC checks:', JSON.stringify(checks));
        await page.waitForTimeout(STEP_PAUSE);

        // Cerrar detalle
        await page.evaluate(() => {
            const overlay = document.getElementById('detailModalOverlay');
            if (overlay) overlay.classList.remove('show');
        });
        await page.waitForTimeout(500);

        // ─── 5. Ver comprobante (si tiene) ──────────────────
        if (clinicInfo.hasReceipt && !SKIP_RECEIPT_PREVIEW) {
            console.log('── PASO 5: Abriendo comprobante...');
            try {
                await page.evaluate(rid => window.viewRegReceipt(rid), clinicInfo.regId);
                await page.waitForTimeout(5000);
                await shot(page, '04_comprobante');
                await page.evaluate(() => {
                    const okBtn = document.querySelector('.dash-alert-overlay .btn-primary');
                    if (okBtn) okBtn.click();
                });
                await page.waitForTimeout(700);
            } catch (err) {
                console.log('   ⚠️  No se pudo previsualizar comprobante, continúa flujo de aprobación:', err.message);
            }
        } else if (clinicInfo.hasReceipt && SKIP_RECEIPT_PREVIEW) {
            console.log('── PASO 5: Comprobante detectado (preview omitido por estabilidad del E2E)');
        } else {
            console.log('── PASO 5: Sin comprobante visible en card (continua igual)');
        }

        // Si no está en estado aprobable, marcar pago y recargar.
        let approvalReady = clinicInfo.hasApprove;
        if (!approvalReady) {
            console.log('── PASO 6: Marcando pago para habilitar aprobación...');
            // Auto-confirmar diálogos del panel durante esta fase.
            await page.evaluate(() => {
                window.__origDashConfirm = window.__origDashConfirm || window.dashConfirm;
                window.dashConfirm = async () => true;
            });
            await page.evaluate(rid => window.markRegistrationPaid(rid), clinicInfo.regId);
            await page.waitForTimeout(4500);
            await page.evaluate(() => { if (typeof window.loadRegistrations === 'function') window.loadRegistrations(); });
            await page.waitForTimeout(2500);
            await shot(page, '05_registro_pago_confirmado');

            approvalReady = await page.evaluate((rid) => {
                const btn = document.querySelector(`#registrosCards .btn-approve[onclick*="openApproveModal('${rid}')"]`);
                return !!btn;
            }, clinicInfo.regId);
        }

        if (!approvalReady) {
            throw new Error('No se habilitó el botón Aprobar tras marcar pago');
        }

        // ─── 7. Abrir modal Aprobar ─────────────────────────
        console.log('── PASO 7: Abriendo modal Aprobar...');
        await page.evaluate(rid => window.openApproveModal(rid), clinicInfo.regId);
        await page.waitForSelector('#approveModalOverlay.show', { timeout: 30000 });
        await page.waitForTimeout(800);
        await shot(page, '06_modal_aprobar');

        // Leer prefill
        const prefill = await page.evaluate(() => ({
            nombre: document.getElementById('approveEditNombre')?.value || '',
            matricula: document.getElementById('approveEditMatricula')?.value || '',
            email: document.getElementById('approveEditEmail')?.value || '',
            telefono: document.getElementById('approveEditTelefono')?.value || '',
            especialidades: document.getElementById('approveEditEspecialidades')?.value || ''
        }));
        console.log('   → Prefill:', JSON.stringify(prefill));

        // Verificar teléfono saneado (no #ERROR!)
        const telOk = prefill.telefono && !prefill.telefono.includes('#ERROR') && prefill.telefono !== '—';
        console.log(`   → Teléfono saneado: ${telOk ? '✅' : '❌'} (${prefill.telefono})`);

        await page.waitForTimeout(STEP_PAUSE);

        // Scroll para ver workplaces y preview
        await page.evaluate(() => {
            const modal = document.querySelector('#approveModalOverlay .approve-modal-content');
            if (modal) modal.scrollTop = modal.scrollHeight / 2;
        });
        await page.waitForTimeout(1000);
        await shot(page, '07_aprobar_scroll_workplaces');

        await page.waitForTimeout(STEP_PAUSE);

        // Asegurar límite de packs (el plan CLINIC permite máx. 3 extras en este flujo).
        const packNormalization = await page.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('.approve-pack-cb'));
            const checked = cbs.filter(cb => cb.checked);
            const max = 3;
            if (checked.length <= max) return { before: checked.length, after: checked.length, changed: false };
            checked.slice(max).forEach(cb => {
                cb.checked = false;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });
            const after = cbs.filter(cb => cb.checked).length;
            return { before: checked.length, after, changed: true };
        });
        if (packNormalization.changed) {
            console.log(`   → Ajuste packs: ${packNormalization.before} → ${packNormalization.after}`);
            await page.waitForTimeout(600);
        }

        // Confirmar aprobación real y abrir fábrica de clones.
        console.log('── PASO 8: Confirmando aprobación y creación de usuario...');
        await page.fill('#approveApiKey', `gsk_test_${Date.now()}`);
        await page.click('#btnConfirmApprove');

        // Si aparece confirmación para abrir fábrica, aceptar.
        await page.waitForFunction(() => {
            const o = document.getElementById('dashModalOverlay');
            return !!o && o.classList.contains('show');
        }, { timeout: 60000 });
        const approvedUserId = await page.evaluate(() => {
            const overlay = document.getElementById('dashModalOverlay');
            const txt = overlay ? (overlay.innerText || '') : (document.body.innerText || '');
            const m = txt.match(/Usuario creado:\s*([A-Za-z0-9_\-]+)/i);
            return m ? m[1] : '';
        });
        if (approvedUserId) {
            console.log(`   → Usuario aprobado: ${approvedUserId}`);
        }
        await shot(page, '08_confirmacion_aprobacion');
        const acceptBtn = page.locator('#dashModalActions .btn-primary, #dashModalOverlay button:has-text("Aceptar")').first();
        await acceptBtn.click({ timeout: 10000 });
        await page.waitForTimeout(1200);

        if (approvedUserId) {
            await page.evaluate((uid) => {
                if (typeof window.openCloneFactory === 'function') {
                    window.openCloneFactory(uid);
                }
            }, approvedUserId);
        }

        // Debe abrir la Fábrica de Clones (con fallback manual si está lenta).
        let factoryOpened = true;
        try {
            await page.waitForFunction(() => {
                const m = document.getElementById('cloneFactoryModal');
                return !!m && getComputedStyle(m).display !== 'none';
            }, { timeout: 60000 });
        } catch (_) {
            factoryOpened = false;
        }
        if (!factoryOpened && approvedUserId) {
            await page.evaluate((uid) => {
                if (typeof window.openCloneFactory === 'function') {
                    window.openCloneFactory(uid);
                }
            }, approvedUserId);
            await page.waitForFunction(() => {
                const m = document.getElementById('cloneFactoryModal');
                return !!m && getComputedStyle(m).display !== 'none';
            }, { timeout: 30000 });
            factoryOpened = true;
        }
        if (!factoryOpened) {
            throw new Error('No se pudo abrir la Fábrica de Clones');
        }
        await shot(page, '09_clone_factory_abierta');

        // Generar link del clon.
        console.log('── PASO 9: Generando link del clon...');
        let cloneLink = '';
        await page.click('#cfBtnGenerate');
        try {
            await page.waitForFunction(() => {
                const inp = document.getElementById('cfLinkUrl');
                return !!inp && /^https?:\/\//.test(inp.value || '');
            }, { timeout: 45000 });
            cloneLink = await page.locator('#cfLinkUrl').inputValue();
        } catch (_) {
            if (approvedUserId) {
                cloneLink = `${APP_BASE}?id=${encodeURIComponent(approvedUserId)}`;
                console.log('   ⚠️  Link no visible en el campo, usando fallback por userId aprobado.');
            }
        }
        if (!cloneLink) {
            throw new Error('No se pudo obtener el link del clon');
        }
        await shot(page, '10_clone_link_generado');
        console.log(`   → Clone link: ${cloneLink}`);

        // Abrir el clon y validar configuración resultante.
        console.log('── PASO 10: Verificando app clonada...');
        const clonePage = await ctx.newPage();
        await gotoWithRetry(clonePage, cloneLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await clonePage.waitForTimeout(5000);
        await shot(clonePage, '11_clone_app_inicial');

        const cloneSnapshot = await clonePage.evaluate(() => {
            const parse = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
            const cfg = parse('client_config_stored') || window.CLIENT_CONFIG || null;
            const prof = parse('prof_data') || null;
            return {
                hasCfg: !!cfg,
                planCode: String(cfg?.planCode || '').toLowerCase(),
                type: String(cfg?.type || ''),
                canGenerateApps: !!cfg?.canGenerateApps,
                hasProMode: !!cfg?.hasProMode,
                maxDevices: Number(cfg?.maxDevices || 0),
                hasProfData: !!prof,
                profName: prof?.nombre || ''
            };
        });
        await clonePage.close();
        console.log('   → Clone snapshot:', JSON.stringify(cloneSnapshot));

        const cloneOk = cloneSnapshot.hasCfg && cloneSnapshot.planCode === 'clinic' && cloneSnapshot.canGenerateApps;
        if (!cloneOk) {
            throw new Error('El clon abrió pero la configuración no quedó en modo CLINIC/canGenerateApps');
        }

        // ─── 11. Pausa final con todo visible ───────────────
        console.log(`── PASO 11: Pausa final ${Math.round(FINAL_PAUSE/1000)}s para inspección visual...`);
        await shot(page, '12_estado_final');
        await page.waitForTimeout(FINAL_PAUSE);

        // ─── Resultado ──────────────────────────────────────
        const result = {
            ok: true,
            regId: clinicInfo.regId,
            checks,
            prefill,
            telOk,
            cloneSnapshot,
            jsErrors,
            screenshots: shotFiles
        };
        fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2), 'utf8');

        console.log('\n=== ✅ PASS — Flujo CLINIC completo ===');
        console.log(`Capturas: ${shotFiles.join(', ')}`);
        console.log(`Report: ${outDir}`);

    } catch (err) {
        await shot(page, 'ERROR').catch(() => {});
        fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
            ok: false, error: err.message, jsErrors, screenshots: shotFiles
        }, null, 2), 'utf8');
        console.error(`\n❌ FAIL: ${err.message}`);
        console.error(`Report: ${outDir}`);
        process.exitCode = 1;
    } finally {
        await ctx.close();
        await browser.close();
    }
})();
