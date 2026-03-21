// ============ CHANGE TEMPLATE — Re-estructurar con plantilla diferente ============
// Botón post-estructurado que permite al usuario corregir la plantilla elegida por la IA.
// Archivo modular (F1-E1 revisado). No modifica archivos existentes salvo integración mínima.

(function () {
    'use strict';

    const HINT_KEY = 'tp_changeTemplate_hintSeen';

    const catIcons = {
        "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
        "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
        "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
    };

    // ── Resolve allowed categories from user specialties ─────────
    function _getAllowedCategoriesFromSpecialties() {
        const cfg = typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG : {};
        const specs = Array.isArray(cfg.specialties) ? cfg.specialties : ['ALL'];
        if (specs.length === 1 && specs[0] === 'ALL') return null; // null = no restriction
        const reg = window.TP_TEMPLATE_CATEGORY_REGISTRY || {};
        const map = reg.formSpecialtyToTemplateCategories || {};
        const cats = new Set();
        cats.add('General'); // General always available
        specs.forEach(sp => {
            const mapped = map[sp];
            if (Array.isArray(mapped)) mapped.forEach(c => cats.add(c));
        });
        return cats;
    }

    // ── Build flat list of allowed templates (dynamic) ───────────
    function _getAllTemplates() {
        const cfg = typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG : {};

        // Layer 1: explicit allowedTemplates from admin/backend
        const hasExplicit = Array.isArray(cfg.allowedTemplates) && cfg.allowedTemplates.length;
        const explicitSet = hasExplicit ? new Set(cfg.allowedTemplates) : null;

        // Layer 2: specialty-based category restriction (only if no explicit list)
        const specCats = !hasExplicit ? _getAllowedCategoriesFromSpecialties() : null;

        const items = [{ key: 'generico', name: '📋 Plantilla General', cat: '', catIcon: '' }];
        const cats = window.TEMPLATE_CATEGORIES || {};

        for (const [cat, keys] of Object.entries(cats)) {
            // Specialty filter: skip entire category if not in user's specialties
            if (specCats && !specCats.has(cat)) continue;
            keys.forEach(key => {
                if (key === 'generico') return;
                if (explicitSet && !explicitSet.has(key)) return;
                const t = window.MEDICAL_TEMPLATES[key];
                if (!t) return;
                items.push({ key, name: t.name, cat, catIcon: catIcons[cat] || '' });
            });
        }
        return items;
    }

    // ── Render filtered list ────────────────────────────────────────
    function _renderList(filter) {
        const list = document.getElementById('changeTemplateList');
        if (!list) return;
        list.innerHTML = '';
        const currentKey = window._lastUsedTemplateKey || 'generico';
        const all = _getAllTemplates();
        const q = (filter || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Show/hide search based on count
        const searchEl = document.getElementById('changeTemplateSearch');
        if (searchEl) searchEl.style.display = all.length > 10 ? '' : 'none';

        let lastCat = '';
        let count = 0;

        all.forEach(item => {
            if (q) {
                const nameLow = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const catLow = item.cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (!nameLow.includes(q) && !catLow.includes(q) && !item.key.includes(q)) return;
            }

            if (item.cat && item.cat !== lastCat) {
                lastCat = item.cat;
                const header = document.createElement('li');
                header.textContent = `${item.catIcon} ${item.cat}`;
                header.className = 'tmpl-list-header';
                list.appendChild(header);
            }

            const li = document.createElement('li');
            li.dataset.value = item.key;
            li.textContent = item.name;
            li.className = 'tmpl-list-item' + (item.key === currentKey ? ' tpl-current' : '');
            list.appendChild(li);
            count++;
        });

        if (count === 0) {
            const empty = document.createElement('li');
            empty.textContent = 'Sin resultados';
            empty.className = 'tmpl-list-header';
            empty.style.textAlign = 'center';
            empty.style.padding = '12px';
            list.appendChild(empty);
        }
    }

    // ── Position dropdown using fixed positioning ────────────────
    function _positionDropdown(dd) {
        const btn = document.getElementById('btnChangeTemplate');
        if (!btn || !dd) return;
        const r = btn.getBoundingClientRect();
        const ddW = 280;
        let left = r.left + r.width / 2 - ddW / 2;
        if (left < 8) left = 8;
        if (left + ddW > window.innerWidth - 8) left = window.innerWidth - ddW - 8;
        dd.style.top = (r.bottom + 6) + 'px';
        dd.style.left = left + 'px';
    }

    // ── Toggle dropdown ─────────────────────────────────────────────
    function _toggleDropdown(forceClose) {
        const dd = document.getElementById('changeTemplateDropdown');
        if (!dd) return;
        const isOpen = dd.style.display !== 'none';
        if (forceClose || isOpen) {
            dd.style.display = 'none';
        } else {
            const search = document.getElementById('changeTemplateSearch');
            if (search) search.value = '';
            _renderList('');
            dd.style.display = 'block';
            _positionDropdown(dd);
            if (search && search.style.display !== 'none') setTimeout(() => search.focus(), 50);
        }
    }

    // ── Re-structure with new template ──────────────────────────────
    async function _reStructureWith(templateKey) {
        _toggleDropdown(true);

        const rawText = window._lastRawTranscription;
        if (!rawText) {
            if (typeof showToast === 'function') showToast('No hay texto original para re-estructurar', 'error');
            return;
        }

        const editor = document.getElementById('editor');
        if (!editor) return;

        const savedHTML = editor.innerHTML;

        // Visual state
        if (typeof window._setStructuringVisualState === 'function') window._setStructuringVisualState(true);
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURING');
        const aiBar = document.getElementById('aiProgressBar');
        if (aiBar) aiBar.style.display = 'block';

        try {
            const tplName = (window.MEDICAL_TEMPLATES[templateKey] || {}).name || templateKey;
            if (typeof showToast === 'function') showToast(`⏳ Re-estructurando con: ${tplName}...`, 'info', 3000);

            const structInput = typeof window._prepareStructuringInput === 'function'
                ? window._prepareStructuringInput(rawText)
                : rawText;

            const rawMarkdown = await window.structureWithRetry(structInput, templateKey, {});
            const parsed = window.parseAIResponse(rawMarkdown);
            editor.innerHTML = parsed.body;

            window._lastStructuredHTML = parsed.body;
            window._lastUsedTemplateKey = templateKey;

            if (typeof window._setStructuringVisualState === 'function') window._setStructuringVisualState(false);
            if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Re-estructurado (cambio plantilla)', 'structuring');
            if (typeof window._refreshPatientHeader === 'function') window._refreshPatientHeader();
            if (typeof updateWordCount === 'function') updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');

            const btnR = document.getElementById('btnRestoreOriginal');
            if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.innerHTML = '↩ Original'; btnR.classList.remove('toggle-active'); }

            if (typeof showToast === 'function') showToast(`✅ Informe re-estructurado con: ${tplName}`, 'success');
        } catch (err) {
            editor.innerHTML = savedHTML;
            if (typeof window._setStructuringVisualState === 'function') window._setStructuringVisualState(false);
            if (typeof showToast === 'function') showToast('❌ Error al re-estructurar. Intenta nuevamente.', 'error');
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
        } finally {
            if (aiBar) aiBar.style.display = 'none';
        }
    }

    // ── First-time hint (one-time, non-intrusive) ───────────────────
    function _showFirstTimeHint() {
        if (localStorage.getItem(HINT_KEY)) return;
        const btn = document.getElementById('btnChangeTemplate');
        if (!btn) return;

        // Pulse animation for 6 seconds
        btn.classList.add('pulse-hint');
        setTimeout(() => btn.classList.remove('pulse-hint'), 6000);

        localStorage.setItem(HINT_KEY, '1');
    }

    // ── Init ────────────────────────────────────────────────────────
    function initChangeTemplate() {
        const btn = document.getElementById('btnChangeTemplate');
        const list = document.getElementById('changeTemplateList');
        const searchInput = document.getElementById('changeTemplateSearch');
        if (!btn || !list) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _toggleDropdown();
        });

        list.addEventListener('click', (e) => {
            const item = e.target.closest('.tmpl-list-item');
            if (!item || !item.dataset.value) return;
            _reStructureWith(item.dataset.value);
        });

        // Live search/filter
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                _renderList(searchInput.value);
            });
            searchInput.addEventListener('click', (e) => e.stopPropagation());
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') _toggleDropdown(true);
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('changeTemplateWrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                _toggleDropdown(true);
            }
        });

        // Close on scroll/resize so dropdown doesn't float detached
        const _closeOnScroll = (e) => {
            const dd = document.getElementById('changeTemplateDropdown');
            if (dd && dd.style.display !== 'none' && !dd.contains(e.target)) {
                _toggleDropdown(true);
            }
        };
        window.addEventListener('scroll', _closeOnScroll, true);
        window.addEventListener('resize', () => _toggleDropdown(true));
    }

    // ── Expose ──────────────────────────────────────────────────────
    window.initChangeTemplate = initChangeTemplate;
    window._showChangeTemplateHint = _showFirstTimeHint;
    // Compat tests (texto): initChangeTemplate | _reStructureWith | changeTemplateWrapper | btnChangeTemplate
    window._reStructureWith = _reStructureWith;

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChangeTemplate);
    } else {
        initChangeTemplate();
    }
})();
