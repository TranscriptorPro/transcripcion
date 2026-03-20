const { chromium } = require('playwright');
(async () => {
    const b = await chromium.launch({ headless: true });
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.addInitScript(() => {
        localStorage.setItem('onboarding_done', 'true');
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('CLIENT_CONFIG', JSON.stringify({ type: 'ADMIN', active: true }));
        localStorage.setItem('groq_api_key', 'gsk_test');
        localStorage.setItem('app_mode', 'normal');
    });
    await p.goto('http://127.0.0.1:4176/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(2500);

    // === 1) Force-open Insertar panel + Shape picker via JS ===
    const panelState = await p.evaluate(() => {
        // Click Insertar trigger
        const triggers = document.querySelectorAll('.mobile-group-trigger');
        let found = false;
        for (const t of triggers) {
            if ((t.getAttribute('aria-label') || '').includes('Insertar')) { t.click(); found = true; break; }
        }
        if (!found) return { error: 'No Insertar trigger found', triggerCount: triggers.length };

        // Check panel
        const panel = document.querySelector('.mobile-toolbar-panel[style*="display"]') ||
                       document.querySelector('.mobile-toolbar-panel:not([style*="none"])');
        const panels = document.querySelectorAll('.mobile-toolbar-panel');
        let visPanels = [];
        panels.forEach((p, i) => {
            if (getComputedStyle(p).display !== 'none') visPanels.push(i);
        });
        return { found, panelCount: panels.length, visiblePanels: visPanels };
    });
    console.log('Panel state after Insertar click:', JSON.stringify(panelState));
    await p.waitForTimeout(300);

    // Click shape toggle
    const shapeToggleResult = await p.evaluate(() => {
        const st = document.querySelector('.mobile-shape-toggle');
        if (!st) return 'no shape toggle found';
        const visible = getComputedStyle(st).display !== 'none';
        st.click();
        // Now check shapePicker
        const picker = document.querySelector('.mobile-shape-picker');
        if (!picker) return 'no picker found';
        return { toggleVisible: visible, pickerDisplay: picker.style.display, pickerComputed: getComputedStyle(picker).display };
    });
    console.log('Shape toggle result:', JSON.stringify(shapeToggleResult));
    await p.waitForTimeout(300);

    // Force picker open if needed
    await p.evaluate(() => {
        const picker = document.querySelector('.mobile-shape-picker');
        if (picker && getComputedStyle(picker).display === 'none') {
            picker.style.display = 'grid';
        }
    });
    await p.waitForTimeout(200);

    // === 2) Measure color dots ===
    const dotInfo = await p.evaluate(() => {
        const dots = document.querySelectorAll('.mobile-shape-color-dot');
        const results = [];
        dots.forEach((d, i) => {
            const box = d.getBoundingClientRect();
            const cs = getComputedStyle(d);
            results.push({
                i,
                boxW: Math.round(box.width * 10) / 10,
                boxH: Math.round(box.height * 10) / 10,
                cssW: cs.width,
                cssH: cs.height,
                display: cs.display,
                minW: cs.minWidth,
                padding: cs.padding,
                boxSizing: cs.boxSizing
            });
        });
        return { count: dots.length, dots: results };
    });
    console.log('=== COLOR DOTS ===');
    console.log('Count:', dotInfo.count);
    dotInfo.dots.forEach(d => {
        console.log(`  dot ${d.i}: rendered ${d.boxW}x${d.boxH} | css w=${d.cssW} h=${d.cssH} | display=${d.display} | min-w=${d.minW} | padding=${d.padding} | box-sizing=${d.boxSizing}`);
    });

    // === 3) Check if any parent rule forces size ===
    const parentInfo = await p.evaluate(() => {
        const dot = document.querySelector('.mobile-shape-color-dot');
        if (!dot) return 'no dot';
        const row = dot.parentElement;
        const picker = row ? row.parentElement : null;
        return {
            dotTag: dot.tagName,
            dotClasses: dot.className,
            rowTag: row ? row.tagName : null,
            rowClasses: row ? row.className : null,
            rowDisplay: row ? getComputedStyle(row).display : null,
            pickerTag: picker ? picker.tagName : null,
            pickerClasses: picker ? picker.className : null,
            pickerDisplay: picker ? getComputedStyle(picker).display : null,
            pickerGridCols: picker ? getComputedStyle(picker).gridTemplateColumns : null
        };
    });
    console.log('Parent info:', JSON.stringify(parentInfo));

    // === 4) Check if toolbar-btn rule applies to dots ===
    const specificity = await p.evaluate(() => {
        const dot = document.querySelector('.mobile-shape-color-dot');
        if (!dot) return 'no dot';
        // Check if this matches toolbar-btn rules
        const cs = getComputedStyle(dot);
        return {
            width: cs.width,
            height: cs.height,
            minWidth: cs.minWidth,
            maxWidth: cs.maxWidth,
            borderRadius: cs.borderRadius,
            border: cs.border,
            background: cs.backgroundColor,
            fontSize: cs.fontSize
        };
    });
    console.log('Dot computed:', JSON.stringify(specificity));

    // === 5) Check editor-shape ::after ===
    await p.evaluate(() => {
        const ed = document.getElementById('editor');
        if (ed) ed.innerHTML += '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid #000;background:transparent;margin:8px auto;border-radius:4px;resize:both;overflow:auto;"></div>';
    });
    await p.waitForTimeout(300);
    const afterInfo = await p.evaluate(() => {
        const s = document.querySelector('.editor-shape');
        if (!s) return 'no shape';
        const st = getComputedStyle(s, '::after');
        return { w: st.width, h: st.height, opacity: st.opacity, content: st.content };
    });
    console.log('=== RESIZE HANDLE ::after ===', JSON.stringify(afterInfo));

    // === 6) Check table + initTableResize ===
    // Check if editor has dimensions and table resize listeners
    const editorInfo = await p.evaluate(() => {
        const ed = document.getElementById('editor');
        if (!ed) return { error: 'no editor' };
        const r = ed.getBoundingClientRect();
        // Ensure editor is visible
        return {
            editorW: Math.round(r.width),
            editorH: Math.round(r.height),
            editorDisplay: getComputedStyle(ed).display,
            hasListeners: !!ed._mobileRangeHooked,
            innerWidth: window.innerWidth,
            ontouchstart: 'ontouchstart' in window
        };
    });
    console.log('Editor info:', JSON.stringify(editorInfo));

    // Navigate to the editor tab first
    await p.evaluate(() => {
        // Click on the editor tab/section
        const tabs = document.querySelectorAll('[data-tab], .tab-btn, [role="tab"]');
        tabs.forEach(t => {
            if ((t.textContent || '').trim().toLowerCase().includes('editor') ||
                (t.dataset.tab || '') === 'editor') {
                t.click();
            }
        });
    });
    await p.waitForTimeout(500);

    await p.evaluate(() => {
        const ed = document.getElementById('editor');
        const t = document.createElement('table');
        t.setAttribute('border', '1');
        t.style.cssText = 'border-collapse:collapse;width:100%;margin:1rem 0;table-layout:fixed;';
        for (let i = 0; i < 3; i++) {
            const tr = t.insertRow();
            for (let j = 0; j < 3; j++) {
                const td = tr.insertCell();
                td.style.cssText = 'border:1px solid #ddd;padding:8px;width:33.33%;';
                td.innerHTML = 'R' + i + 'C' + j;
            }
        }
        ed.appendChild(t);
    });
    await p.waitForTimeout(200);
    const tableInfo = await p.evaluate(() => {
        const t = document.querySelector('#editor table');
        if (!t) return null;
        const rect = t.getBoundingClientRect();
        const colWidths = [];
        for (let i = 0; i < t.rows[0].cells.length; i++) {
            const cr = t.rows[0].cells[i].getBoundingClientRect();
            colWidths.push(Math.round(cr.width));
        }
        return { tableW: Math.round(rect.width), colWidths };
    });
    console.log('=== TABLE ===', JSON.stringify(tableInfo));

    // === 7) Simulate table column resize drag ===
    if (tableInfo && tableInfo.colWidths.length >= 3) {
        // Try drag on interior column border (between col 0 and 1)
        const dragResult = await p.evaluate(() => {
            const t = document.querySelector('#editor table');
            if (!t) return 'no table';
            const cell0 = t.rows[0].cells[0];
            const rect0 = cell0.getBoundingClientRect();
            // Right edge of cell 0
            const x = rect0.right;
            const y = rect0.top + rect0.height / 2;
            
            // Check getEdge function
            if (typeof window.getEdge === 'function') {
                const edge = window.getEdge(t, x, y);
                return { edge, x: Math.round(x), y: Math.round(y) };
            }
            return { error: 'getEdge not found globally', x: Math.round(x), y: Math.round(y) };
        });
        console.log('Table drag check:', JSON.stringify(dragResult));
    }

    console.log('\n=== DONE ===');
    await b.close();
})();
