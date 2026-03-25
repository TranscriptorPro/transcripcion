const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOGIN_URL = 'https://transcriptorpro.github.io/transcripcion/recursos/login.html';
const APP_BASE = 'https://transcriptorpro.github.io/transcripcion/';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2026';
const TARGET_MEDICO_ID = String(process.env.TARGET_MEDICO_ID || '').trim();
const TARGET_CLINIC_NAME = String(process.env.TARGET_CLINIC_NAME || 'La Isla Bonita').trim();
const HEADLESS = process.env.HEADLESS !== '0';

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

(async () => {
  const outDir = path.join(__dirname, '..', 'accesorios', 'reportes', `e2e-admin-clone-direct-${ts()}`);
  fs.mkdirSync(outDir, { recursive: true });
  let shotN = 0;
  const shots = [];
  const shot = async (page, label) => {
    shotN += 1;
    const file = `${String(shotN).padStart(2, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`;
    await page.screenshot({ path: path.join(outDir, file), fullPage: false });
    shots.push(file);
  };

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: 80 });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 920 } });
  const page = await ctx.newPage();
  let resolvedUserId = '';

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await shot(page, '01_login');
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
    await page.click('#btnLogin');
    await page.waitForURL(/admin\.html/, { timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      try {
        if (typeof window.loadDashboard === 'function') {
          await window.loadDashboard(true);
        }
      } catch (_) {}
    });
    await page.waitForTimeout(2500);
    await shot(page, '02_admin');

    const debugBefore = await page.evaluate((uid) => ({
      hasOpenCloneFactory: typeof window.openCloneFactory,
      hasModal: !!document.getElementById('cloneFactoryModal'),
      usersRows: document.querySelectorAll('#tableBody tr').length,
      cloneBtnCount: document.querySelectorAll(`[data-action="clone"][data-user-id="${uid}"]`).length
    }), TARGET_MEDICO_ID || '');
    console.log('DEBUG before clone:', JSON.stringify(debugBefore));

    resolvedUserId = await page.evaluate(({ targetId, targetName }) => {
      const users = Array.isArray(window.allUsers) ? window.allUsers : [];
      const norm = (s) => String(s || '').toLowerCase();
      if (targetId) {
        const byId = users.find(u => String(u.ID_Medico || '') === String(targetId));
        if (byId) return String(byId.ID_Medico);
      }
      const byName = users.find(u => norm(u.Nombre).includes(norm(targetName)));
      if (byName) return String(byName.ID_Medico);
      return users.length ? String(users[0].ID_Medico || '') : '';
    }, { targetId: TARGET_MEDICO_ID, targetName: TARGET_CLINIC_NAME });

    if (!resolvedUserId) {
      throw new Error('No se pudo resolver un usuario para generar clon');
    }
    console.log('DEBUG resolved userId:', resolvedUserId);

    await page.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
    await page.waitForTimeout(1400);
    const cloneBtn = page.locator(`[data-action="clone"][data-user-id="${resolvedUserId}"]`).first();
    if (await cloneBtn.count()) {
      await cloneBtn.click();
    } else {
      await page.evaluate((uid) => {
        if (typeof window.openCloneFactory === 'function') {
          window.openCloneFactory(uid);
        }
      }, resolvedUserId);
    }

    await page.waitForFunction(() => {
      const m = document.getElementById('cloneFactoryModal');
      return !!m && getComputedStyle(m).display !== 'none';
    }, { timeout: 60000 });
    await shot(page, '03_factory_open');

    await page.click('#cfBtnGenerate');
    let cloneLink = '';
    try {
      await page.waitForFunction(() => {
        const inp = document.getElementById('cfLinkUrl');
        return !!inp && /^https?:\/\//.test(inp.value || '');
      }, { timeout: 45000 });
      cloneLink = await page.locator('#cfLinkUrl').inputValue();
    } catch (_) {
      cloneLink = `${APP_BASE}?id=${encodeURIComponent(resolvedUserId)}`;
    }

    await shot(page, '04_link');

    const clonePage = await ctx.newPage();
    await clonePage.goto(cloneLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await clonePage.waitForTimeout(5000);
    await shot(clonePage, '05_clone_opened');

    const snapshot = await clonePage.evaluate(() => {
      const parse = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
      const cfg = parse('client_config_stored') || window.CLIENT_CONFIG || null;
      return {
        hasCfg: !!cfg,
        planCode: String(cfg?.planCode || '').toLowerCase(),
        type: String(cfg?.type || ''),
        canGenerateApps: !!cfg?.canGenerateApps,
        maxDevices: Number(cfg?.maxDevices || 0)
      };
    });

    await clonePage.close();

    const result = {
      ok: true,
      targetUserId: resolvedUserId,
      cloneLink,
      snapshot,
      screenshots: shots
    };

    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2), 'utf8');

    console.log('OK');
    console.log(`Clone link: ${cloneLink}`);
    console.log(`Snapshot: ${JSON.stringify(snapshot)}`);
    console.log(`Report: ${outDir}`);
  } catch (err) {
    await shot(page, '99_error').catch(() => {});
    const result = {
      ok: false,
      error: err.message,
      targetUserId: resolvedUserId || TARGET_MEDICO_ID,
      screenshots: shots
    };
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2), 'utf8');
    console.error(`FAIL: ${err.message}`);
    console.error(`Report: ${outDir}`);
    process.exitCode = 1;
  } finally {
    await ctx.close();
    await browser.close();
  }
})();
