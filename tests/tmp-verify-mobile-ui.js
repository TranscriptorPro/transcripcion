const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    // Pre-seed admin state to skip onboarding
    await page.addInitScript(() => {
        localStorage.setItem('onboarding_done', 'true');
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('CLIENT_CONFIG', JSON.stringify({ type: 'ADMIN', active: true }));
        localStorage.setItem('groq_api_key', 'gsk_test1234567890abcdef');
        localStorage.setItem('app_mode', 'normal');
    });

    await page.goto('http://127.0.0.1:4176/index.html', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Check mobile toolbar exists
    const toolbar = await page.$('#editorToolbar.mobile-grouped');
    console.log('Mobile toolbar found:', !!toolbar);

    // Click on Insertar group (the + icon, 5th group)
    const groups = await page.$$('.mobile-toolbar-group .mobile-group-trigger');
    console.log('Groups found:', groups.length);
    for (let i = 0; i < groups.length; i++) {
        const title = await groups[i].getAttribute('aria-label');
        console.log(`  Group ${i}: ${title}`);
    }

    // Find Insertar group
    let insertarTrigger = null;
    for (const g of groups) {
        const label = await g.getAttribute('aria-label');
        if (label && label.includes('Insertar')) { insertarTrigger = g; break; }
    }

    if (insertarTrigger) {
        await insertarTrigger.click();
        await page.waitForTimeout(500);

        // Check shape toggle
        const shapeToggle = await page.$('.mobile-shape-toggle');
        if (shapeToggle) {
            await shapeToggle.click();
            await page.waitForTimeout(300);

            // Check color dots
            const dots = await page.$$('.mobile-shape-color-dot');
            console.log('Color dots found:', dots.length);
            if (dots.length > 0) {
                const box = await dots[0].boundingBox();
                console.log('First dot size:', box ? `${box.width}x${box.height}` : 'NOT VISIBLE');
            }

            // Check color row
            const colorRow = await page.$('.mobile-shape-color-row');
            if (colorRow) {
                const rowBox = await colorRow.boundingBox();
                console.log('Color row size:', rowBox ? `${rowBox.width}x${rowBox.height}` : 'NOT VISIBLE');
            }
        } else {
            console.log('Shape toggle NOT found');
        }
    } else {
        console.log('Insertar trigger NOT found');
    }

    // Check editor-shape resize handle
    // Insert a shape to test
    const editor = await page.$('#editor');
    if (editor) {
        await editor.click();
        await page.evaluate(() => {
            const ed = document.getElementById('editor');
            ed.innerHTML += '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid #000;background:transparent;margin:8px auto;border-radius:4px;resize:both;overflow:auto;min-width:20px;min-height:20px;"></div>';
        });
        await page.waitForTimeout(300);
        const shape = await page.$('.editor-shape');
        if (shape) {
            const shapeBox = await shape.boundingBox();
            console.log('Shape size:', shapeBox ? `${shapeBox.width}x${shapeBox.height}` : 'NOT VISIBLE');
            // Check ::after pseudo element
            const afterSize = await page.evaluate(() => {
                const s = document.querySelector('.editor-shape');
                const after = getComputedStyle(s, '::after');
                return { w: after.width, h: after.height, opacity: after.opacity };
            });
            console.log('Shape ::after pseudo:', JSON.stringify(afterSize));
        }

        // Insert a table to test
        await page.evaluate(() => {
            const ed = document.getElementById('editor');
            const table = document.createElement('table');
            table.setAttribute('border', '1');
            table.style.cssText = 'border-collapse:collapse;width:100%;margin:1rem 0;table-layout:fixed;';
            for (let i = 0; i < 3; i++) {
                const tr = table.insertRow();
                for (let j = 0; j < 3; j++) {
                    const td = tr.insertCell();
                    td.style.cssText = 'border:1px solid #ddd;padding:8px;width:33.33%;';
                    td.innerHTML = `R${i}C${j}`;
                }
            }
            ed.appendChild(table);
        });
        await page.waitForTimeout(300);

        // Test table column widths
        const colWidths = await page.evaluate(() => {
            const table = document.querySelector('#editor table');
            if (!table || !table.rows[0]) return null;
            const widths = [];
            for (let i = 0; i < table.rows[0].cells.length; i++) {
                widths.push(Math.round(table.rows[0].cells[i].getBoundingClientRect().width));
            }
            return widths;
        });
        console.log('Table column widths:', JSON.stringify(colWidths));
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
    await browser.close();
})();
