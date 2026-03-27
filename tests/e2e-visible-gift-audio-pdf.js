'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL = BASE_URL + '/recursos/login.html';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin2026';
const HEADLESS = process.env.HEADLESS === '1';

const LOGOS_DIR = 'C:\\Users\\kengy\\Desktop\\Logos';
const AUDIOS_DIR = 'C:\\Users\\kengy\\Desktop\\Audios';

const ASSETS = {
  wpLogo: path.join(LOGOS_DIR, 'CMR.png'),
  proLogo: path.join(LOGOS_DIR, 'roman.png'),
  firma: path.join(LOGOS_DIR, 'firma.png')
};

const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-visible-gift-audio-pdf-' + Date.now());
const SHOTS_DIR = path.join(REPORT_DIR, 'screenshots');
const DOWNLOADS_DIR = path.join(REPORT_DIR, 'downloads');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

function log(msg) {
  console.log('[VISIBLE-E2E] ' + msg);
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Falta ' + label + ': ' + filePath);
  }
}

function getAudioFiles() {
  const all = fs.readdirSync(AUDIOS_DIR);
  const files = all
    .filter((f) => /\.(mp3|wav|ogg|m4a|webm)$/i.test(f))
    .map((f) => path.join(AUDIOS_DIR, f));
  if (!files.length) throw new Error('No hay audios en ' + AUDIOS_DIR);
  return files.slice(0, 4);
}

let shotIdx = 0;
async function shot(page, name) {
  shotIdx += 1;
  const safe = String(name).replace(/[^a-z0-9_\-]/gi, '_');
  const out = path.join(SHOTS_DIR, String(shotIdx).padStart(2, '0') + '_' + safe + '.png');
  await page.screenshot({ path: out, fullPage: true }).catch(() => {});
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch (_) {
    throw new Error('Respuesta no JSON en ' + url + ': ' + txt.slice(0, 300));
  }
}

async function closeDashModalIfPresent(page) {
  const isVisible = await page.locator('#dashModalOverlay').isVisible().catch(() => false);
  if (!isVisible) return false;
  await page.evaluate(() => {
    const actions = document.getElementById('dashModalActions');
    const primary = actions ? actions.querySelector('button') : null;
    if (primary) {
      primary.click();
      return;
    }
    const closeBtn = document.getElementById('dashModalCloseBtn');
    if (closeBtn) closeBtn.click();
  }).catch(() => {});
  await page.waitForTimeout(1000);
  return true;
}

async function closeOnboardingIfPresent(page) {
  const visible = await page.locator('#onboardingOverlay').isVisible().catch(() => false);
  if (!visible) return false;
  await page.evaluate(() => {
    const finishBtn = document.getElementById('onboardingFinishBtn');
    if (finishBtn) {
      finishBtn.click();
      return;
    }
    const closeBtn = document.getElementById('closeOnboardingBtn') || document.querySelector('#onboardingOverlay .modal-close');
    if (closeBtn) {
      closeBtn.click();
      return;
    }
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.remove('active');
    localStorage.setItem('onboarding_accepted', 'true');
  }).catch(() => {});
  await page.waitForTimeout(500);
  return true;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

(async () => {
  const audioFiles = getAudioFiles();
  assertFile(ASSETS.wpLogo, 'logo institución');
  assertFile(ASSETS.proLogo, 'logo profesional');
  assertFile(ASSETS.firma, 'firma');

  const suffix = Date.now().toString(36).toUpperCase();
  const giftData = {
    nombre: 'Dr. Ricardo Salvatierra ' + suffix,
    email: 'aldowagner78@gmail.com',
    matricula: 'MN ' + suffix.slice(-6),
    telefono: '+54 11 6789 12' + String(Math.floor(Math.random() * 90 + 10)),
    especialidad: 'Cardiología',
    social: {
      fb: 'https://facebook.com/centro.salvatierra',
      ig: '@dr.ricardo.salvatierra',
      yt: 'https://youtube.com/@drsalvatierra',
      x: '@DrRSalvatierra',
      wa: '+54 9 11 6789-1234'
    }
  };

  const groqKeys = {
    primary: 'gsk_visible_e2e_primary_key',
    b1: 'gsk_visible_e2e_backup1_key',
    b2: 'gsk_visible_e2e_backup2_key'
  };

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 130 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 940 },
    acceptDownloads: true,
    serviceWorkers: 'block'
  });

  // Mock IA para permitir flujo completo con audios reales y estructuración.
  await context.route('**api.groq.com/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (/\/models$/i.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'list',
          data: [
            { id: 'whisper-large-v3-turbo', object: 'model' },
            { id: 'llama-3.1-8b-instant', object: 'model' }
          ]
        })
      });
    }

    if (/audio\/transcriptions/i.test(url)) {
      const fakeText = [
        'Paciente: Maria Eugenia Farina. DNI: 28944111. Edad: 57 años. Sexo: femenino.',
        'Estudio: Ecocardiograma transtorácico. Fecha: ' + todayISO() + '.',
        'Motivo: control anual.',
        'Ventrículo izquierdo con función sistólica conservada. FEVI 62%.',
        'Sin derrame pericárdico. Sin signos de hipertensión pulmonar.',
        'Conclusión: estudio dentro de parámetros normales.'
      ].join(' ');
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: fakeText });
    }

    if (/chat\/completions/i.test(url)) {
      const structured = [
        '## DATOS DEL PACIENTE',
        '- Paciente: María Eugenia Farina',
        '- DNI: 28944111',
        '- Edad: 57 años',
        '- Sexo: Femenino',
        '',
        '## DATOS DEL ESTUDIO',
        '- Tipo de estudio: Ecocardiograma transtorácico',
        '- Fecha: ' + todayISO(),
        '- Motivo: Control anual',
        '',
        '## HALLAZGOS',
        '- Ventrículo izquierdo con función sistólica conservada.',
        '- FEVI estimada: 62%.',
        '- Sin derrame pericárdico.',
        '- Sin datos de hipertensión pulmonar.',
        '',
        '## CONCLUSION',
        '- Ecocardiograma transtorácico dentro de límites normales.'
      ].join('\n');

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chatcmpl-visible-e2e',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'llama-3.1-8b-instant',
          choices: [{ index: 0, message: { role: 'assistant', content: structured }, finish_reason: 'stop' }]
        })
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const page = await context.newPage();

  try {
    log('Login admin');
    await page.goto(LOGIN_URL + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
    await shot(page, '01_login_filled');
    await page.click('#btnLogin');
    await page.waitForURL(/recursos\/admin\.html/, { timeout: 35000 });
    await page.waitForTimeout(2500);
    await shot(page, '02_admin_logged');

    log('Cargar API keys admin para herencia');
    await page.evaluate((keys) => {
      localStorage.setItem('admin_groq_key', keys.primary);
      localStorage.setItem('admin_groq_key_b1', keys.b1);
      localStorage.setItem('admin_groq_key_b2', keys.b2);
    }, groqKeys);

    log('Abrir wizard GIFT y completar datos');
    await page.click('#btnGiftUser');
    await page.waitForTimeout(1200);

    await page.fill('#giftNombre', giftData.nombre);
    await page.fill('#giftEmail', giftData.email);
    await page.fill('#giftMatricula', giftData.matricula);
    await page.fill('#giftTelefono', giftData.telefono);
    await page.selectOption('#giftEspecialidad', { label: giftData.especialidad }).catch(async () => {
      const firstOpt = await page.locator('#giftEspecialidad option').nth(1).getAttribute('value').catch(() => '');
      if (firstOpt) await page.selectOption('#giftEspecialidad', firstOpt);
    });

    await page.fill('#giftSocialFb', giftData.social.fb);
    await page.fill('#giftSocialIg', giftData.social.ig);
    await page.fill('#giftSocialYt', giftData.social.yt);
    await page.fill('#giftSocialX', giftData.social.x);
    await page.fill('#giftSocialWa', giftData.social.wa);

    await shot(page, '03_gift_step1_full_data');
    await page.click('button[onclick="giftGoStep(2)"]');
    await page.waitForTimeout(900);

    log('Completar lugares de trabajo con logo real');
    await page.fill('#gwWpName0', 'Instituto Cardiovascular Salvatierra');
    await page.fill('#gwWpAddress0', 'Av. Cabildo 2350, CABA');
    await page.fill('#gwWpPhone0', '+54 11 4300-1111');
    await page.fill('#gwWpEmail0', 'turnos@salvatierra.med.ar');
    await page.fill('#gwWpFooter0', 'Instituto Cardiovascular Salvatierra — Av. Cabildo 2350');
    await page.setInputFiles('#giftWorkplacesContainer .gw-wp-accordion[data-wp-index="0"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    await shot(page, '04_gift_step2_workplace');

    await page.click('button[onclick="giftGoStep(3)"]');
    await page.waitForTimeout(900);

    log('Subir firma y logo profesional; mantener redes visibles');
    await page.setInputFiles('#giftFirma', ASSETS.firma).catch(() => {});
    await page.setInputFiles('#giftProLogo', ASSETS.proLogo).catch(() => {});
    await page.check('#giftShowPhone').catch(() => {});
    await page.check('#giftShowEmail').catch(() => {});
    await page.check('#giftShowSocial').catch(() => {});
    await shot(page, '05_gift_step3_branding');

    await page.click('button[onclick="giftGoStep(4)"]');
    await page.waitForTimeout(900);

    log('Configurar licencia');
    await page.selectOption('#giftPlan', 'GIFT').catch(() => {});
    await page.check('#giftAllTemplates').catch(() => {});
    await shot(page, '06_gift_step4_license');

    await page.click('button[onclick="giftGoStep(5)"]');
    await page.waitForTimeout(800);
    await page.click('button[onclick="giftGoStep(6)"]');
    await page.waitForTimeout(1000);
    await shot(page, '07_gift_step6_summary');

    log('Generar link de clon');
    await page.click('button[onclick="document.getElementById(\'cfBtnGenerate\').click()"]');
    await page.waitForTimeout(8500);
    await shot(page, '08_gift_created');

    const dashMsg = await page.locator('#dashModalMsg').innerText().catch(() => '');
    if (/todav[ií]a no aparece en la tabla|actualiz[aá] usuarios|f[aá]brica manualmente/i.test(dashMsg || '')) {
      await closeDashModalIfPresent(page);
      await page.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
      await page.waitForTimeout(1200);
      await page.click('#btnRefresh').catch(() => {});
      await page.waitForTimeout(3500);
      await page.click('#btnGiftUser').catch(() => {});
      await page.waitForTimeout(1200);
    } else {
      await closeDashModalIfPresent(page);
    }

    let cloneLink = '';
    for (let i = 0; i < 6; i += 1) {
      cloneLink = await page.locator('#cfLinkUrl').inputValue().catch(() => '');
      if (cloneLink.includes('?id=')) break;
      await page.click('#cfBtnGenerate').catch(() => {});
      await page.waitForTimeout(2200);
      await closeDashModalIfPresent(page);
    }
    if (!cloneLink.includes('?id=')) throw new Error('No se pudo generar link de clon GIFT');

    const cloneId = cloneLink.split('?id=')[1].split('&')[0];
    log('Clon generado: ' + cloneId);

    log('Abrir clon');
    const clonePage = await context.newPage();
    await clonePage.goto(cloneLink + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await clonePage.waitForTimeout(5000);
    await closeOnboardingIfPresent(clonePage);
    await shot(clonePage, '09_clone_loaded');

    // Asegurar API key válida para desbloquear flujo de transcripción.
    await clonePage.evaluate((k) => {
      localStorage.setItem('groq_api_key', k);
      if (!window.GROQ_API_KEY || typeof window.GROQ_API_KEY !== 'string') {
        window.GROQ_API_KEY = k;
      }
    }, groqKeys.primary);

    log('Cargar audios reales');
    await clonePage.setInputFiles('#fileInput', audioFiles);
    await clonePage.waitForTimeout(900);
    await closeOnboardingIfPresent(clonePage);
    await shot(clonePage, '10_audio_files_loaded');

    // Forzar unión de audios.
    await clonePage.check('#chkJoinAudios').catch(() => {});

    log('Transcribir + estructurar');
    await clonePage.click('#transcribeAndStructureBtn');

    const joinYesVisible = await clonePage.locator('#joinAudiosYes').isVisible().catch(() => false);
    if (joinYesVisible) {
      await clonePage.click('#joinAudiosYes').catch(() => {});
    }

    await clonePage.waitForFunction(() => {
      const btn = document.getElementById('btnConfigPdfMain');
      if (!btn) return false;
      const cs = window.getComputedStyle(btn);
      return cs.display !== 'none' && !btn.disabled;
    }, null, { timeout: 90000 });
    await clonePage.waitForTimeout(1200);
    await shot(clonePage, '11_after_transcribe_structure');

    log('Editar datos paciente/estudio (modal lápiz o fallback)');
    const pencilVisible = await clonePage.locator('.patient-data-edit-btn').first().isVisible().catch(() => false);
    if (pencilVisible) {
      await clonePage.locator('.patient-data-edit-btn').first().click().catch(() => {});
      await clonePage.waitForTimeout(400);
    } else {
      await clonePage.evaluate(() => {
        const ov = document.getElementById('patientDataRequiredOverlay');
        if (ov) ov.classList.add('active');
      });
    }

    await clonePage.fill('#reqPatientName', 'Carlos Bernal');
    await clonePage.fill('#reqPatientDni', '30222999');
    await clonePage.fill('#reqStudyType', 'Ecocardiograma transtorácico');
    await clonePage.fill('#reqStudyDate', todayISO());
    await clonePage.fill('#reqStudyTime', '10:45');
    await clonePage.click('#btnSavePatientData').catch(() => {});
    await clonePage.evaluate(() => {
      const ov = document.getElementById('patientDataRequiredOverlay');
      if (ov) ov.classList.remove('active');
    }).catch(() => {});
    await clonePage.waitForTimeout(900);
    await shot(clonePage, '12_patient_study_edited');

    log('Configurar PDF (QR activado y guardar)');
    const openedPdfConfig = await clonePage.evaluate(() => {
      const isVisible = (el) => !!(el && window.getComputedStyle(el).display !== 'none' && el.offsetParent !== null);
      const mainBtn = document.getElementById('btnConfigPdfMain');
      const smallBtn = document.getElementById('btnConfigPdf');
      if (isVisible(mainBtn)) {
        mainBtn.click();
        return true;
      }
      if (isVisible(smallBtn)) {
        smallBtn.click();
        return true;
      }
      if (typeof window.openPdfConfig === 'function') {
        window.openPdfConfig();
        return true;
      }
      if (typeof window.openPdfConfigModal === 'function') {
        window.openPdfConfigModal();
        return true;
      }
      return false;
    });
    if (!openedPdfConfig) throw new Error('No se pudo abrir configuración PDF');
    await clonePage.waitForTimeout(900);

    await clonePage.check('#pdfShowQR').catch(() => {});
    await clonePage.check('#pdfShowHeader').catch(() => {});
    await clonePage.check('#pdfShowSignImage').catch(() => {});
    await clonePage.click('#btnSavePdfConfig').catch(() => {});
    await clonePage.waitForTimeout(900);
    await shot(clonePage, '13_pdf_config_saved');

    log('Abrir vista previa');
    const previewOpened = await clonePage.evaluate(async () => {
      const ov = document.getElementById('patientDataRequiredOverlay');
      if (ov) ov.classList.remove('active');
      if (typeof window.openPrintPreview === 'function') {
        try {
          await window.openPrintPreview();
          return true;
        } catch (_) {}
      }
      const btn = document.getElementById('printBtn') || document.querySelector('[data-testid="togglePreviewBtn"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!previewOpened) throw new Error('No se pudo abrir la vista previa');
    await clonePage.waitForTimeout(1400);
    await shot(clonePage, '14_preview_opened');

    const previewText = await clonePage.evaluate(() => {
      const pages = Array.from(document.querySelectorAll('.pv-real-page'));
      if (pages.length) return pages.map((p) => p.innerText || '').join('\n');
      const c = document.getElementById('printPreviewContainer') || document.getElementById('previewPage');
      return c ? c.innerText : '';
    });

    const hasPatient = /Carlos Bernal/i.test(previewText);
    const hasStudy = /Ecocardiograma/i.test(previewText);
    const hasSocial = /facebook|instagram|whatsapp|youtube|x\b|@/i.test(previewText);
    if (!hasPatient || !hasStudy) {
      throw new Error('Preview incompleto. patient=' + hasPatient + ' study=' + hasStudy);
    }

    log('Descargar PDF desde preview');
    await clonePage.evaluate(() => {
      localStorage.setItem('pdf_output_mode', 'download');
    });

    let pdfPath = '';
    try {
      const downloadPromise = clonePage.waitForEvent('download', { timeout: 20000 });
      await clonePage.click('#btnDownloadFromPreview');
      const download = await downloadPromise;
      const suggested = download.suggestedFilename();
      pdfPath = path.join(DOWNLOADS_DIR, suggested || ('informe_' + Date.now() + '.pdf'));
      await download.saveAs(pdfPath);
    } catch (_) {
      // Fallback: invocar generador PDF directo y capturar blob via outputPdf.
      const fallback = await clonePage.evaluate(async () => {
        const oldOutputPdf = window.outputPdf;
        let captured = null;
        window.outputPdf = async (blob, filename) => {
          const b64 = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
              const s = String(fr.result || '');
              resolve(s.split(',')[1] || '');
            };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
          captured = { filename: filename || ('informe_' + Date.now() + '.pdf'), b64 };
          return true;
        };

        try {
          const editorEl = document.getElementById('editor');
          const html = editorEl ? editorEl.innerHTML : '';
          const fileName = (window._pdfConfigCache && window._pdfConfigCache.patientName)
            ? String(window._pdfConfigCache.patientName).replace(/\s+/g, '_')
            : 'informe_visible_e2e';
          const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          if (typeof window.downloadPDFWrapper === 'function') {
            await window.downloadPDFWrapper(html, fileName, new Date().toLocaleDateString('es-AR'), fileDate);
          }
        } catch (_) {}

        await new Promise((r) => setTimeout(r, 1200));
        window.outputPdf = oldOutputPdf;
        return captured;
      });

      if (!fallback || !fallback.b64) {
        throw new Error('No se pudo capturar descarga de PDF (evento y fallback fallaron)');
      }
      pdfPath = path.join(DOWNLOADS_DIR, fallback.filename);
      fs.writeFileSync(pdfPath, Buffer.from(fallback.b64, 'base64'));
    }

    const stat = fs.statSync(pdfPath);
    if (stat.size < 1024) throw new Error('PDF descargado demasiado pequeño: ' + stat.size + ' bytes');

    await shot(clonePage, '15_pdf_downloaded');

    const summary = {
      ok: true,
      cloneId,
      cloneLink,
      usedAudioFiles: audioFiles,
      hasPatient,
      hasStudy,
      hasSocial,
      pdfPath,
      pdfBytes: stat.size,
      reportDir: REPORT_DIR
    };

    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    log('OK flujo completo finalizado. Reporte: ' + REPORT_DIR);

    await clonePage.waitForTimeout(5000);
  } catch (err) {
    fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), String(err && err.stack ? err.stack : err));
    console.error('[VISIBLE-E2E][FAIL]', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})();
