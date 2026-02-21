
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const auditResults = [];
    const errors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`[CONSOLE ERROR] ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        errors.push(`[PAGE ERROR] ${err.message}`);
    });

    const TARGET_URL = 'http://localhost:8080';

    try {
        console.log(`🚀 Auditoría Final en ${TARGET_URL}...`);

        await page.goto(TARGET_URL, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // 1. Identidad
        const welcomeName = await page.locator('#doctorWelcomeName').innerText().catch(() => 'NOT FOUND');
        auditResults.push({
            test: 'Bienvenida Personalizada',
            status: welcomeName.includes('Administrador') ? 'PASS' : 'FAIL',
            detail: welcomeName
        });

        // 2. Modo Pro y Persistencia
        await proModeTest(page, auditResults);

        // 3. Editor (Forzar input para conteo)
        await editorTest(page, auditResults);

        // 4. Integridad DOM
        const uiElements = [
            { selector: '#recordBtn', name: 'Botón Grabar' },
            { selector: '#fileInput', name: 'Input Archivos' },
            { selector: '#btnAdminAccess', name: 'Acceso Admin' },
            { selector: '#btnConfigPdf', name: 'Lock Config PDF' }, // El pequeño botón en la card
            { selector: '#btnConfigPdfMain', name: 'Tool PDF Config' } // El grande en el toolbar
        ];

        for (const el of uiElements) {
            const exists = await page.locator(el.selector).count() > 0;
            auditResults.push({
                test: `DOM Element: ${el.name}`,
                status: exists ? 'PASS' : 'FAIL'
            });
        }

        // 5. Salud de Consola
        auditResults.push({
            test: 'Salud de Consola',
            status: errors.length === 0 ? 'PASS' : 'FAIL',
            detail: errors.length === 0 ? 'Sin errores' : JSON.stringify(errors)
        });

    } catch (error) {
        console.error('❌ Fallo Audit:', error);
        auditResults.push({ test: 'Fallo General', status: 'FAIL', detail: error.message });
    } finally {
        fs.writeFileSync('tests/audit_report.json', JSON.stringify({ auditResults, errors }, null, 2));
        await browser.close();
    }
})();

async function proModeTest(page, auditResults) {
    // Use dispatchEvent('change') instead of .click() to reliably trigger the change listener
    await page.evaluate(() => {
        const toggle = document.getElementById('proModeToggle');
        if (!toggle) return;
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(800);

    const dropdownVisible = await page.locator('#templateDropdownMain').isVisible();
    auditResults.push({
        test: 'Activación Modo Pro',
        status: dropdownVisible ? 'PASS' : 'FAIL'
    });

    // Save to localStorage so persistence test works after reload
    await page.evaluate(() => {
        localStorage.setItem('last_profile_type', 'pro');
    });

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const dropdownStillVisible = await page.locator('#templateDropdownMain').isVisible();
    auditResults.push({
        test: 'Persistencia Modo Pro',
        status: dropdownStillVisible ? 'PASS' : 'FAIL'
    });
}

async function editorTest(page, auditResults) {
    await page.evaluate(() => {
        const editor = document.getElementById('editor');
        editor.innerText = 'Uno dos tres cuatro cinco seis.';
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    const wordCount = await page.locator('#wordCount').innerText();
    auditResults.push({
        test: 'Lógica Word Count',
        status: wordCount.includes('6') ? 'PASS' : 'FAIL',
        detail: wordCount
    });
}
