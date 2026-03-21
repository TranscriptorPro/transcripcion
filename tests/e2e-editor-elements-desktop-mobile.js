/**
 * E2E: Editor inserted elements interaction (desktop + mobile)
 *
 * Validates for inserted elements (table, shape, image):
 * - insert
 * - select
 * - drag
 * - resize (handles)
 * - copy
 * - delete
 *
 * Usage:
 *   node tests/e2e-editor-elements-desktop-mobile.js
 */

const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.gif': 'image/gif'
};

function startServer(port) {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            if (fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        srv.listen(port, () => resolve(srv));
    });
}

let passed = 0;
let failed = 0;
function ok(name, detail) {
    passed++;
    console.log(`[OK] ${name}${detail ? ` - ${detail}` : ''}`);
}
function fail(name, detail) {
    failed++;
    console.log(`[FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
}
function ensure(cond, name, detail) {
    if (cond) ok(name, detail);
    else fail(name, detail);
}

async function setupPage(page, baseUrl) {
    await page.addInitScript(() => {
        localStorage.setItem('groq_api_key', 'gsk_mock_local_e2e');
        localStorage.setItem('client_config_stored', JSON.stringify({
            type: 'ADMIN',
            plan: 'PRO',
            hasProMode: true,
            maxDevices: 3,
            medicoId: 'E2E-ELEMENTS-001'
        }));
        localStorage.setItem('prof_data', JSON.stringify({
            nombre: 'Dr QA',
            matricula: 'MP-QA-1001',
            especialidad: 'Clinica'
        }));
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#editor', { state: 'attached', timeout: 20000 });
    const isEditorVisible = await page.locator('#editor').isVisible();
    if (!isEditorVisible) {
        // In some mobile layouts editor can be collapsed/hidden by container styles.
        await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return;
            let n = ed;
            while (n && n !== document.body) {
                if (n.style) {
                    const cs = getComputedStyle(n);
                    if (cs.display === 'none') n.style.display = 'block';
                    n.style.visibility = 'visible';
                    n.style.opacity = '1';
                    n.style.maxHeight = n.style.maxHeight === '0px' ? 'none' : n.style.maxHeight;
                }
                n = n.parentElement;
            }
        });
    }
    await page.waitForTimeout(1200);
}

async function countVisibleHandles(page) {
    return page.evaluate(() => Array.from(document.querySelectorAll('.editor-shape-handle')).filter(h => getComputedStyle(h).display !== 'none').length);
}

async function dragByMouse(page, x, y, dx, dy) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 10 });
    await page.mouse.up();
}

async function resizeFromSEHandle(page, dx, dy) {
    const seHandle = page.locator('.editor-shape-handle[data-dir="se"]').first();
    await seHandle.waitFor({ state: 'visible', timeout: 5000 });
    const hb = await seHandle.boundingBox();
    if (!hb) return false;
    const cx = hb.x + hb.width / 2;
    const cy = hb.y + hb.height / 2;
    await dragByMouse(page, cx, cy, dx, dy);
    return true;
}

async function dragByTouch(page, x, y, dx, dy, steps = 10) {
    const session = await page.context().newCDPSession(page);
    const sx = Math.round(x);
    const sy = Math.round(y);
    await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: sx, y: sy, radiusX: 6, radiusY: 6, force: 1, id: 1 }]
    });
    for (let i = 1; i <= steps; i++) {
        const nx = Math.round(x + (dx * i / steps));
        const ny = Math.round(y + (dy * i / steps));
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: nx, y: ny, radiusX: 6, radiusY: 6, force: 1, id: 1 }]
        });
        await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
}

async function testDesktop(page) {
    console.log('\n=== DESKTOP ===');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('#editor');

    // TABLE INSERT BUTTON + PICKER APPEARANCE
    await page.click('#insertTableBtn');
    const picker = page.locator('.desktop-table-grid-picker');
    await picker.waitFor({ state: 'visible', timeout: 5000 });

    const pickerBox = await picker.boundingBox();
    ensure(!!pickerBox, 'DESKTOP-TABLE-PICKER-VISIBLE', 'grid picker visible');
    if (pickerBox) {
        ensure(pickerBox.width <= 220, 'DESKTOP-TABLE-PICKER-WIDTH', `width=${Math.round(pickerBox.width)}px`);
    }

    await page.hover('.desktop-table-grid-picker .table-grid-cell[data-row="2"][data-col="2"]');
    await page.click('.desktop-table-grid-picker .table-grid-cell[data-row="2"][data-col="2"]');
    await page.waitForTimeout(300);

    const tableCount1 = await page.locator('#editor table').count();
    ensure(tableCount1 >= 1, 'DESKTOP-TABLE-INSERT', `tables=${tableCount1}`);

    // Select table by border click (top-left border zone)
    const tb = await page.locator('#editor table').first().boundingBox();
    if (tb) {
        await page.locator('#editor table').first().click({ position: { x: 2, y: 2 } });
        await page.waitForTimeout(120);
    }

    const handlesAfterTableSel = await countVisibleHandles(page);
    ensure(handlesAfterTableSel === 8, 'DESKTOP-TABLE-SELECT-HANDLES', `handles=${handlesAfterTableSel}`);

    // Drag table
    let tablePos1 = await page.locator('#editor table').first().boundingBox();
    if (tablePos1) {
        await dragByMouse(page, tablePos1.x + 4, tablePos1.y + 4, 80, 30);
        await page.waitForTimeout(120);
    }
    let tablePos2 = await page.locator('#editor table').first().boundingBox();
    ensure(!!tablePos1 && !!tablePos2 && Math.abs(tablePos2.x - tablePos1.x) > 20, 'DESKTOP-TABLE-DRAG', tablePos1 && tablePos2 ? `dx=${Math.round(tablePos2.x - tablePos1.x)}` : 'no-bbox');

    // Resize table
    let tableSize1 = await page.locator('#editor table').first().boundingBox();
    const resizedTable = await resizeFromSEHandle(page, 60, 40);
    await page.waitForTimeout(140);
    let tableSize2 = await page.locator('#editor table').first().boundingBox();
    ensure(resizedTable && !!tableSize1 && !!tableSize2 && (tableSize2.width > tableSize1.width || tableSize2.height > tableSize1.height), 'DESKTOP-TABLE-RESIZE', tableSize1 && tableSize2 ? `${Math.round(tableSize1.width)}x${Math.round(tableSize1.height)} -> ${Math.round(tableSize2.width)}x${Math.round(tableSize2.height)}` : 'no-bbox');

    // Row height resize via cell border drag (inside table editing mode)
    const firstCell = page.locator('#editor table tr:first-child td:first-child');
    const cellBox1 = await firstCell.boundingBox();
    if (cellBox1) {
        // Click center of cell to allow table internal resizing logic
        await page.mouse.click(cellBox1.x + cellBox1.width / 2, cellBox1.y + cellBox1.height / 2);
        await page.waitForTimeout(100);
        const rowHeightBefore = await page.evaluate(() => {
            const row = document.querySelector('#editor table tr:first-child');
            return row ? row.getBoundingClientRect().height : 0;
        });
        await dragByMouse(page, cellBox1.x + 8, cellBox1.y + cellBox1.height - 2, 0, 36);
        await page.waitForTimeout(120);
        const rowHeightAfter = await page.evaluate(() => {
            const row = document.querySelector('#editor table tr:first-child');
            return row ? row.getBoundingClientRect().height : 0;
        });
        ensure(rowHeightAfter > rowHeightBefore + 10, 'DESKTOP-TABLE-ROW-HEIGHT-RESIZE', `${Math.round(rowHeightBefore)} -> ${Math.round(rowHeightAfter)}`);
    } else {
        fail('DESKTOP-TABLE-ROW-HEIGHT-RESIZE', 'no-cell-bbox');
    }

    // Copy table (floating action bar)
    // Reselect table before copy/delete checks
    tablePos2 = await page.locator('#editor table').first().boundingBox();
    if (tablePos2) {
        await page.locator('#editor table').first().click({ position: { x: 2, y: 2 } });
        await page.waitForTimeout(120);
    }
    const copyBtn = page.locator('.shape-mobile-actionbar .shape-action-copy').first();
    const delBtn = page.locator('.shape-mobile-actionbar .shape-action-delete').first();
    const tableActionBarVisible = await copyBtn.isVisible().catch(() => false);
    ensure(tableActionBarVisible, 'DESKTOP-TABLE-ACTIONBAR-VISIBLE', 'copy/delete visible');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(120);
    const tableCount2 = await page.locator('#editor table').count();
    ensure(tableCount2 > tableCount1, 'DESKTOP-TABLE-COPY', `tables=${tableCount1} -> ${tableCount2}`);

    // Delete selected table
    await page.keyboard.press('Delete');
    await page.waitForTimeout(120);
    const tableCount3 = await page.locator('#editor table').count();
    ensure(tableCount3 < tableCount2, 'DESKTOP-TABLE-DELETE', `tables=${tableCount2} -> ${tableCount3}`);

    // SHAPE INSERT BUTTON
    await page.click('#insertShapeBtn');
    await page.click('.desktop-shape-picker .desktop-shape-btn:nth-of-type(2)'); // square
    await page.waitForTimeout(180);

    const shapeSel = '#editor .editor-shape:not(.editor-img-wrap):not(hr)';
    const shapeCount1 = await page.locator(shapeSel).count();
    ensure(shapeCount1 >= 1, 'DESKTOP-SHAPE-INSERT', `shapes=${shapeCount1}`);

    const sb = await page.locator(shapeSel).last().boundingBox();
    if (sb) {
        await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
        await page.waitForTimeout(120);
    }

    const hShape = await countVisibleHandles(page);
    ensure(hShape === 8, 'DESKTOP-SHAPE-SELECT-HANDLES', `handles=${hShape}`);

    let shapePos1 = await page.locator(shapeSel).last().boundingBox();
    if (shapePos1) await dragByMouse(page, shapePos1.x + 6, shapePos1.y + 6, 60, 30);
    await page.waitForTimeout(120);
    let shapePos2 = await page.locator(shapeSel).last().boundingBox();
    ensure(!!shapePos1 && !!shapePos2 && Math.abs(shapePos2.x - shapePos1.x) > 8, 'DESKTOP-SHAPE-DRAG', shapePos1 && shapePos2 ? `dx=${Math.round(shapePos2.x - shapePos1.x)}` : 'no-bbox');

    let shapeSize1 = await page.locator(shapeSel).last().boundingBox();
    const resizedShape = await resizeFromSEHandle(page, 40, 25);
    await page.waitForTimeout(120);
    let shapeSize2 = await page.locator(shapeSel).last().boundingBox();
    ensure(resizedShape && !!shapeSize1 && !!shapeSize2 && (shapeSize2.width > shapeSize1.width || shapeSize2.height > shapeSize1.height), 'DESKTOP-SHAPE-RESIZE', shapeSize1 && shapeSize2 ? `${Math.round(shapeSize1.width)}x${Math.round(shapeSize1.height)} -> ${Math.round(shapeSize2.width)}x${Math.round(shapeSize2.height)}` : 'no-bbox');

    // Reselect shape before copy/delete checks
    shapePos2 = await page.locator(shapeSel).last().boundingBox();
    if (shapePos2) {
        await page.locator(shapeSel).last().click();
        await page.waitForTimeout(120);
    }
    const shapeActionBarVisible = await copyBtn.isVisible().catch(() => false);
    ensure(shapeActionBarVisible, 'DESKTOP-SHAPE-ACTIONBAR-VISIBLE', 'copy/delete visible');

    const shapeCountBeforeCopy = await page.locator(shapeSel).count();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(120);
    const shapeCountAfterCopy = await page.locator(shapeSel).count();
    ensure(shapeCountAfterCopy > shapeCountBeforeCopy, 'DESKTOP-SHAPE-COPY', `shapes=${shapeCountBeforeCopy} -> ${shapeCountAfterCopy}`);

    await page.keyboard.press('Delete');
    await page.waitForTimeout(120);
    const shapeCountAfterDelete = await page.locator(shapeSel).count();
    ensure(shapeCountAfterDelete < shapeCountAfterCopy, 'DESKTOP-SHAPE-DELETE', `shapes=${shapeCountAfterCopy} -> ${shapeCountAfterDelete}`);

    // IMAGE INSERT BUTTON
    await page.click('#insertImageBtn');
    const fileInput = page.locator('input[type="file"]').last();
    await fileInput.setInputFiles({
        name: 'qa-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64')
    });
    await page.waitForTimeout(220);

    const imgSel = '#editor .editor-img-wrap.editor-shape';
    const imgCount1 = await page.locator(imgSel).count();
    ensure(imgCount1 >= 1, 'DESKTOP-IMAGE-INSERT', `images=${imgCount1}`);

    const ib = await page.locator(imgSel).last().boundingBox();
    if (ib) {
        await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
        await page.waitForTimeout(120);
    }

    const hImg = await countVisibleHandles(page);
    ensure(hImg === 8, 'DESKTOP-IMAGE-SELECT-HANDLES', `handles=${hImg}`);

    let imgPos1 = await page.locator(imgSel).last().boundingBox();
    if (imgPos1) await dragByMouse(page, imgPos1.x + 8, imgPos1.y + 8, 65, 35);
    await page.waitForTimeout(120);
    let imgPos2 = await page.locator(imgSel).last().boundingBox();
    ensure(!!imgPos1 && !!imgPos2 && Math.abs(imgPos2.x - imgPos1.x) > 15, 'DESKTOP-IMAGE-DRAG', imgPos1 && imgPos2 ? `dx=${Math.round(imgPos2.x - imgPos1.x)}` : 'no-bbox');

    let imgSize1 = await page.locator(imgSel).last().boundingBox();
    const resizedImg = await resizeFromSEHandle(page, 45, 30);
    await page.waitForTimeout(120);
    let imgSize2 = await page.locator(imgSel).last().boundingBox();
    ensure(resizedImg && !!imgSize1 && !!imgSize2 && (imgSize2.width > imgSize1.width || imgSize2.height > imgSize1.height), 'DESKTOP-IMAGE-RESIZE', imgSize1 && imgSize2 ? `${Math.round(imgSize1.width)}x${Math.round(imgSize1.height)} -> ${Math.round(imgSize2.width)}x${Math.round(imgSize2.height)}` : 'no-bbox');

    // Reselect image before copy/delete checks
    imgPos2 = await page.locator(imgSel).last().boundingBox();
    if (imgPos2) {
        await page.locator(imgSel).last().click();
        await page.waitForTimeout(120);
    }
    const imageActionBarVisible = await copyBtn.isVisible().catch(() => false);
    ensure(imageActionBarVisible, 'DESKTOP-IMAGE-ACTIONBAR-VISIBLE', 'copy/delete visible');

    const imgCountBeforeCopy = await page.locator(imgSel).count();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(120);
    const imgCountAfterCopy = await page.locator(imgSel).count();
    ensure(imgCountAfterCopy > imgCountBeforeCopy, 'DESKTOP-IMAGE-COPY', `images=${imgCountBeforeCopy} -> ${imgCountAfterCopy}`);

    await page.keyboard.press('Delete');
    await page.waitForTimeout(120);
    const imgCountAfterDelete = await page.locator(imgSel).count();
    ensure(imgCountAfterDelete < imgCountAfterCopy, 'DESKTOP-IMAGE-DELETE', `images=${imgCountAfterCopy} -> ${imgCountAfterDelete}`);
}

async function testMobile(browser, baseUrl) {
    console.log('\n=== MOBILE ===');

    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true
    });

    const page = await context.newPage();
    await setupPage(page, baseUrl);

    await page.evaluate(() => {
        document.body.classList.add('mobile-sidebar-collapsed');
        const ed = document.getElementById('editor');
        if (ed) {
            ed.style.display = 'block';
            ed.style.minHeight = '320px';
        }
    });
    await page.waitForTimeout(200);

    // Insert table using desktop button handler directly (button may be regrouped/hidden in mobile UI)
    await page.evaluate(() => {
        const btn = document.getElementById('insertTableBtn');
        if (btn) btn.click();
    });
    await page.waitForSelector('.desktop-table-grid-picker', { state: 'visible', timeout: 5000 });
    await page.click('.desktop-table-grid-picker .table-grid-cell[data-row="1"][data-col="1"]');
    await page.waitForTimeout(220);

    const tableCount = await page.locator('#editor table').count();
    ensure(tableCount >= 1, 'MOBILE-TABLE-INSERT', `tables=${tableCount}`);

    // Select table by border tap
    const tb = await page.locator('#editor table').first().boundingBox();
    if (tb) {
        await page.touchscreen.tap(tb.x + 2, tb.y + 2);
        await page.waitForTimeout(220);
    }

    const actionBarVisible = await page.locator('.shape-mobile-actionbar').isVisible().catch(() => false);
    ensure(actionBarVisible, 'MOBILE-ACTIONBAR-VISIBLE', 'copy/delete bar visible on selection');
    if (!actionBarVisible) {
        const h = await countVisibleHandles(page);
        const dbg = await page.evaluate(() => {
            const editor = document.getElementById('editor');
            const table = document.querySelector('#editor table');
            const er = editor ? editor.getBoundingClientRect() : null;
            const tr = table ? table.getBoundingClientRect() : null;
            const hiddenAncestors = [];
            if (editor) {
                let n = editor.parentElement;
                while (n && n !== document.body) {
                    const cs = getComputedStyle(n);
                    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0) {
                        hiddenAncestors.push({
                            tag: n.tagName,
                            id: n.id || null,
                            cls: n.className || null,
                            display: cs.display,
                            visibility: cs.visibility,
                            opacity: cs.opacity
                        });
                    }
                    n = n.parentElement;
                }
            }
            return {
                editorRect: er ? { x: er.x, y: er.y, w: er.width, h: er.height } : null,
                tableRect: tr ? { x: tr.x, y: tr.y, w: tr.width, h: tr.height } : null,
                editorDisplay: editor ? getComputedStyle(editor).display : null,
                editorVisibility: editor ? getComputedStyle(editor).visibility : null,
                tableExists: !!table,
                hiddenAncestors
            };
        });
        console.log('[DEBUG][MOBILE-ACTIONBAR]', JSON.stringify({ handlesVisible: h, ...dbg }));
    }

    // Mobile copy/delete for table
    const copyBtn = page.locator('.shape-mobile-actionbar .shape-action-copy').first();
    const delBtn = page.locator('.shape-mobile-actionbar .shape-action-delete').first();

    if (actionBarVisible) {
        await copyBtn.click();
        await page.waitForTimeout(200);
        const tableAfterCopy = await page.locator('#editor table').count();
        ensure(tableAfterCopy > tableCount, 'MOBILE-TABLE-COPY', `tables=${tableCount} -> ${tableAfterCopy}`);

        await delBtn.click();
        await page.waitForTimeout(200);
        const tableAfterDelete = await page.locator('#editor table').count();
        ensure(tableAfterDelete < tableAfterCopy, 'MOBILE-TABLE-DELETE', `tables=${tableAfterCopy} -> ${tableAfterDelete}`);
    } else {
        fail('MOBILE-TABLE-COPY', 'actionbar not visible');
        fail('MOBILE-TABLE-DELETE', 'actionbar not visible');
    }

    // Insert image and validate resize with touch drag on handle.
    await page.evaluate(() => {
        const btn = document.getElementById('insertImageBtn');
        if (btn) btn.click();
    });
    const mobileFileInput = page.locator('input[type="file"]').last();
    await mobileFileInput.setInputFiles({
        name: 'qa-mobile-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64')
    });
    await page.waitForTimeout(260);

    const imgSel = '#editor .editor-img-wrap.editor-shape';
    const mobileImgCount = await page.locator(imgSel).count();
    ensure(mobileImgCount >= 1, 'MOBILE-IMAGE-INSERT', `images=${mobileImgCount}`);

    const ib = await page.locator(imgSel).last().boundingBox();
    if (ib) {
        await page.touchscreen.tap(ib.x + ib.width / 2, ib.y + ib.height / 2);
        await page.waitForTimeout(180);
    }

    const mobileImgHandles = await countVisibleHandles(page);
    ensure(mobileImgHandles === 8, 'MOBILE-IMAGE-SELECT-HANDLES', `handles=${mobileImgHandles}`);

    const seHandle = page.locator('.editor-shape-handle[data-dir="se"]').first();
    await seHandle.waitFor({ state: 'visible', timeout: 5000 });
    const hb = await seHandle.boundingBox();
    const imgSize1 = await page.locator(imgSel).last().boundingBox();
    let resizedMobileImg = false;
    if (hb) {
        await dragByTouch(page, hb.x + hb.width / 2, hb.y + hb.height / 2, 46, 32);
        await page.waitForTimeout(220);
        resizedMobileImg = true;
    }
    const imgSize2 = await page.locator(imgSel).last().boundingBox();
    ensure(resizedMobileImg && !!imgSize1 && !!imgSize2 && (imgSize2.width > imgSize1.width || imgSize2.height > imgSize1.height), 'MOBILE-IMAGE-RESIZE-TOUCH', imgSize1 && imgSize2 ? `${Math.round(imgSize1.width)}x${Math.round(imgSize1.height)} -> ${Math.round(imgSize2.width)}x${Math.round(imgSize2.height)}` : 'no-bbox');

    // Deselect when tapping outside selected element.
    await page.touchscreen.tap(8, 8);
    await page.waitForTimeout(180);
    const handlesAfterOutsideTap = await countVisibleHandles(page);
    ensure(handlesAfterOutsideTap === 0, 'MOBILE-DESELECT-ON-OUTSIDE-TAP', `handles=${handlesAfterOutsideTap}`);

    // Group menu should auto-collapse after command button usage.
    const canTestGroupCollapse = await page.evaluate(() => {
        const trigger = document.querySelector('.mobile-group-trigger[aria-label="Formato"]');
        const bold = document.getElementById('boldBtn');
        if (!trigger || !bold) return false;
        trigger.click();
        bold.click();
        const group = trigger.closest('.mobile-toolbar-group');
        return !!group;
    });
    if (!canTestGroupCollapse) {
        fail('MOBILE-GROUP-AUTOCOLLAPSE-AFTER-ACTION', 'group-or-button-not-found');
    } else {
        await page.waitForTimeout(180);
        const formatoOpenAfterAction = await page.evaluate(() => {
            const trigger = document.querySelector('.mobile-group-trigger[aria-label="Formato"]');
            const group = trigger ? trigger.closest('.mobile-toolbar-group') : null;
            return !!(group && group.classList.contains('open'));
        });
        ensure(!formatoOpenAfterAction, 'MOBILE-GROUP-AUTOCOLLAPSE-AFTER-ACTION', `open=${formatoOpenAfterAction}`);
    }

    // ── HR line selection on mobile ──
    await page.evaluate(() => {
        const editor = document.getElementById('editor');
        if (!editor) return;
        editor.innerHTML = '<p>Test line</p><hr class="editor-shape" style="border:none;border-top:2px solid #000;margin:12px 0;"><p>After line</p>';
        // Re-ensure editor-area is visible (state manager may have hidden it)
        document.body.classList.add('mobile-sidebar-collapsed');
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.add('mobile-hidden');
        var ea = document.querySelector('.editor-area');
        if (ea) ea.style.setProperty('display', 'block', 'important');
    });
    await page.waitForTimeout(300);
    const hrInserted = await page.evaluate(() => document.querySelectorAll('#editor hr.editor-shape').length);
    const hrBox = await page.evaluate(() => {
        const hr = document.querySelector('#editor hr.editor-shape');
        if (!hr) return null;
        const r = hr.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    });
    if (hrBox && hrBox.w > 0) {
        // Use CDP touch event to properly trigger touchstart handler
        const hrSession = await page.context().newCDPSession(page);
        await hrSession.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: Math.round(hrBox.x), y: Math.round(hrBox.y), radiusX: 6, radiusY: 6, force: 1, id: 1 }]
        });
        await page.waitForTimeout(80);
        await hrSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await hrSession.detach();
        await page.waitForTimeout(300);
    }
    const hrHandles = await countVisibleHandles(page);
    ensure(hrInserted > 0 && hrHandles === 8, 'MOBILE-HR-LINE-SELECT-HANDLES', `hrs=${hrInserted},handles=${hrHandles}`);

    // Deselect HR
    if (hrHandles > 0) {
        await page.touchscreen.tap(8, 8);
        await page.waitForTimeout(180);
    }

    await context.close();
}

(async function run() {
    const PORT = 8771;
    const BASE = `http://localhost:${PORT}`;
    const server = await startServer(PORT);
    const browser = await chromium.launch({ headless: true });

    try {
        const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const desktopPage = await desktopContext.newPage();
        await setupPage(desktopPage, BASE);

        await testDesktop(desktopPage);
        await desktopContext.close();

        await testMobile(browser, BASE);

        console.log(`\nSUMMARY: ${passed + failed} | OK: ${passed} | FAIL: ${failed}`);
        if (failed > 0) process.exitCode = 1;
    } catch (err) {
        console.log('[FATAL]', err.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
})();
