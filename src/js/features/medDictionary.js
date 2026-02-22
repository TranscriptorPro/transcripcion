// ============================================================
//  REVISOR MÉDICO — Diccionario + Modal de correcciones
//  medDictionary.js
// ============================================================

// ─── 1. DICCIONARIO BASE predefinido ────────────────────────
// Formato: { "texto_incorrecto": "corrección" }
// Las claves se comparan en minúsculas sin tildes.
const MEDICAL_DICT_BASE = {
    // ── ORL / Cabeza y cuello ─────────────────────────────
    "larinx":                   "laringe",
    "larincs":                  "laringe",
    "larinco":                  "laringe",
    "farings":                  "faringe",
    "rinofarings":              "rinofaringe",
    "rinofarinx":               "rinofaringe",
    "epiglotys":                "epiglotis",
    "epiglótys":                "epiglotis",
    "fosa nasar":               "fosa nasal",
    "fosas nasares":            "fosas nasales",
    "tímbano":                  "tímpano",
    "timpano":                  "tímpano",
    "corneta inferior":         "cornete inferior",
    "corneta media":            "cornete medio",
    "corneta superior":         "cornete superior",
    "amigdalas":                "amígdalas",
    "amigdala":                 "amígdala",
    "amidale":                  "amígdala",
    "adenoide":                 "adenoides",
    "otorrinolarinco":          "otorrinolaringólogo",
    "locoregional":             "locorregional",
    "aritenoides laterales":    "aritenoides",
    "pliegue ariepiglótico":    "repliegue ariepiglótico",
    "pliegues ariepiglóticos":  "repliegues ariepiglóticos",
    "cuerda vocal":             "cuerdas vocales",
    "conducto auditibo":        "conducto auditivo",
    "conducto auditibo externo":"conducto auditivo externo",
    "membrana tonpanica":       "membrana timpánica",
    "membrana tonpánica":       "membrana timpánica",
    "ocena":                    "ozena",
    "mucoza":                   "mucosa",
    "mucoza nasal":             "mucosa nasal",
    "mucoza faríngea":          "mucosa faríngea",
    "septun":                   "septum",
    "septo":                    "septum",
    "hipertrofia de corneta":   "hipertrofia de cornete",
    "tonsilas":                 "tonsilas palatinas",
    "roncopatía":               "roncopatía",

    // ── Cardiología ───────────────────────────────────────
    "extrasistoles":            "extrasístoles",
    "extrasistole":             "extrasístole",
    "taquicardia sinusal":      "taquicardia sinusal",
    "taquicardía":              "taquicardia",
    "bradicardía":              "bradicardia",
    "fibrilacion auricular":    "fibrilación auricular",
    "estreses":                 "estrés",
    "eco estres":               "eco-estrés",
    "ecosisma":                 "eco-estrés",
    "ecocardio":                "ecocardiograma",
    "ecocardíograma":           "ecocardiograma",
    "FEVI":                     "FEVI",          // preserve uppercase
    "fevi":                     "FEVI",
    "fraccion de eyeccion":     "fracción de eyección",
    "fracción de eyeccion":     "fracción de eyección",
    "estenosis aortica":        "estenosis aórtica",
    "insuficiencia aortica":    "insuficiencia aórtica",
    "insuficiencia mitral":     "insuficiencia mitral",
    "derrame pericardico":      "derrame pericárdico",
    "hipertrofía":              "hipertrofia",
    "ventrículo izquierdo":     "ventrículo izquierdo",
    "ventriculo izquierdo":     "ventrículo izquierdo",
    "auricula izquierda":       "aurícula izquierda",
    "auricula derecha":         "aurícula derecha",
    "arteria coronaria":        "arteria coronaria",
    "ateroesclerosis":          "aterosclerosis",

    // ── Neurología ────────────────────────────────────────
    "polisomnografía":          "polisomnografía",
    "electromiografia":         "electromiografía",
    "electromiografía":         "electromiografía",
    "electrocmiografía":        "electromiografía",
    "tomografía axial":         "tomografía axial computarizada",
    "resonancia magnética":     "resonancia magnética",
    "resonancia magnetica":     "resonancia magnética",
    "cefalea tensional":        "cefalea tensional",
    "convulsiones febriles":    "convulsiones febriles",
    "hiperecogenicidad":        "hiperecogenicidad",

    // ── Gastroenterología ─────────────────────────────────
    "gastroesofagico":          "gastroesofágico",
    "anastomosis término":      "anastomosis término-terminal",
    "colitis ulcerosa":         "colitis ulcerosa",

    // ── Ortopedia ─────────────────────────────────────────
    "artrosis":                 "artrosis",
    "artritis reumatoide":      "artritis reumatoide",
    "espondilolistesis":        "espondilolistesis",
    "meniscectomia":            "meniscectomía",
    "discal":                   "discal",
    "disco intervertebral":     "disco intervertebral",

    // ── Términos generales ────────────────────────────────
    "hipertension":             "hipertensión",
    "hipertensión arterial":    "hipertensión arterial",
    "diabetes mellitus":        "diabetes mellitus",
    "obstruccion":              "obstrucción",
    "obstrucción":              "obstrucción",
    "inflamacion":              "inflamación",
    "infección":                "infección",
    "infeccion":                "infección",
    "secresion":                "secreción",
    "secresiones":              "secreciones",
    "espesura":                 "espesor",
    "nodulo":                   "nódulo",
    "nodulos":                  "nódulos",
    "nodule":                   "nódulo",
    "polipo":                   "pólipo",
    "polipos":                  "pólipos",
    "hemorragia":               "hemorragia",
    "hemorrágico":              "hemorrágico",
    "abdomen agudo":            "abdomen agudo",
    "peritoneo":                "peritoneo",
    "edema pulmonar":           "edema pulmonar",
    "neumonia":                 "neumonía",
    "pneumonia":                "neumonía",
    "pleuritis":                "pleuritis",
    "trombo embolismo":         "tromboembolismo",
    "tromboembolísmo":          "tromboembolismo",
    "tromboembolia":            "tromboembolismo pulmonar",
    "anticoagulacion":          "anticoagulación",
    "glicemia":                 "glucemia",
    "glucosa en sangre":        "glucemia",
};

// ─── 2. Diccionario PERSONALIZADO (localStorage) ────────────
const CUSTOM_DICT_KEY = 'med_dict_custom';

function getMedCustomDict() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_DICT_KEY) || '{}'); }
    catch { return {}; }
}

function saveMedCustomDict(dict) {
    localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(dict));
}

function addMedDictEntry(from, to) {
    if (!from || !to) return;
    const dict = getMedCustomDict();
    dict[from.trim().toLowerCase()] = to.trim();
    saveMedCustomDict(dict);
}

window.removeMedDictEntry = function(from) {
    const dict = getMedCustomDict();
    delete dict[from.toLowerCase()];
    saveMedCustomDict(dict);
    renderDictList();
};

function getFullDict() {
    return { ...MEDICAL_DICT_BASE, ...getMedCustomDict() };
}

// ─── 3. Motor de búsqueda de coincidencias ──────────────────
// Devuelve [{from, to, count, isBase}] encontradas en plainText
function findDictMatches(plainText) {
    const dict = getFullDict();
    const custom = getMedCustomDict();
    const found = [];
    const usedKeys = new Set();

    for (const [key, to] of Object.entries(dict)) {
        if (usedKeys.has(key)) continue;
        try {
            const regex = new RegExp('\\b' + _escapeRegex(key) + '\\b', 'gi');
            const matches = [...plainText.matchAll(regex)];
            if (matches.length > 0) {
                // Use first real match as display "from"
                found.push({
                    from: matches[0][0],
                    key,
                    to,
                    count: matches.length,
                    isBase: MEDICAL_DICT_BASE.hasOwnProperty(key) && !custom.hasOwnProperty(key),
                });
                usedKeys.add(key);
            }
        } catch { /* invalid regex key, skip */ }
    }

    // Sort by count desc, then alphabetically
    return found.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}

function _escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── 4. Aplicar correcciones a nodos de texto ───────────────
// accepted: [{from, to}]
function applyDictCorrections(editorEl, accepted) {
    if (!editorEl || !accepted.length) return;

    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    for (const { from, to } of accepted) {
        let regex;
        try { regex = new RegExp('\\b' + _escapeRegex(from) + '\\b', 'gi'); }
        catch { continue; }

        for (const textNode of nodes) {
            if (!regex.test(textNode.nodeValue)) { regex.lastIndex = 0; continue; }
            regex.lastIndex = 0;
            // Replace inside a temp span to handle multiple occurrences
            const parts = textNode.nodeValue.split(regex);
            if (parts.length < 2) continue;
            const fragment = document.createDocumentFragment();
            parts.forEach((part, i) => {
                fragment.appendChild(document.createTextNode(part));
                if (i < parts.length - 1) {
                    fragment.appendChild(document.createTextNode(to));
                }
            });
            textNode.parentNode.replaceChild(fragment, textNode);
            // Refresh nodes list since we modified the DOM
            // (simpler: break and restart — for small texts this is fine)
        }
    }
}

// ─── 5. Scan con IA para sugerencias adicionales ────────────
async function scanWithAI(plainText) {
    const key = window.GROQ_API_KEY || localStorage.getItem('groq_api_key');
    if (!key) return [];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Eres un corrector de terminología médica en español especializado en errores de reconocimiento de voz. 
Analiza el texto y detecta SOLO palabras o frases que sean errores evidentes de transcripción de voz (el sistema ASR escuchó mal un término médico).
Devuelve ÚNICAMENTE un array JSON válido, sin texto adicional, con el formato exacto:
[{"from": "texto_incorrecto_en_el_texto", "to": "corrección_correcta"}]
Si no encuentras errores claros, devuelve: []
No corrijas estilo, comas, signos de puntuación ni redacción. Solo errores de reconocimiento de voz en terminología médica.`
                },
                { role: 'user', content: plainText.slice(0, 3000) }
            ],
            temperature: 0.0
        })
    });

    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.choices[0].message.content.trim();

    // Extract JSON array from response (might have markdown code fences)
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item.from && item.to && item.from !== item.to)
            .map(item => ({ from: item.from, to: item.to, isBase: false, isAI: true, count: 1, key: item.from.toLowerCase() }));
    } catch {
        return [];
    }
}

// ─── 6. Estado del modal ────────────────────────────────────
let _dictModalMatches  = [];   // [{from, to, key, count, isBase, isAI, checked}]
let _dictModalAILoaded = false;

// ─── 7. Renderizado de la pestaña REVISIÓN ──────────────────
function renderReviewList() {
    const container = document.getElementById('medDictReviewList');
    const empty     = document.getElementById('medDictReviewEmpty');
    const counter   = document.getElementById('medDictSelCount');
    if (!container) return;

    const checked = _dictModalMatches.filter(m => m.checked).length;
    if (counter) counter.textContent = `${checked} corrección${checked !== 1 ? 'es' : ''} seleccionada${checked !== 1 ? 's' : ''}`;

    if (_dictModalMatches.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    container.innerHTML = _dictModalMatches.map((m, i) => `
        <label class="med-dict-item ${m.checked ? 'checked' : ''}" data-idx="${i}">
            <input type="checkbox" class="med-dict-cb" data-idx="${i}" ${m.checked ? 'checked' : ''}>
            <span class="med-dict-from">${_htmlEncode(m.from)}</span>
            <span class="med-dict-arrow">→</span>
            <span class="med-dict-to">${_htmlEncode(m.to)}</span>
            <span class="med-dict-badge ${m.isAI ? 'badge-ai' : m.isBase ? 'badge-base' : 'badge-custom'}">${m.isAI ? 'IA' : m.isBase ? 'BASE' : 'MÍO'}</span>
            ${m.count > 1 ? `<span class="med-dict-count">×${m.count}</span>` : ''}
            ${m.isAI ? `<button class="med-dict-save-btn" data-idx="${i}" title="Guardar en mi diccionario">💾</button>` : ''}
        </label>
    `).join('');

    // Checkboxes
    container.querySelectorAll('.med-dict-cb').forEach(cb => {
        cb.addEventListener('change', e => {
            const idx = +e.target.dataset.idx;
            _dictModalMatches[idx].checked = e.target.checked;
            e.target.closest('.med-dict-item').classList.toggle('checked', e.target.checked);
            renderReviewList();
        });
    });

    // Guardar sugerencia AI al diccionario personal
    container.querySelectorAll('.med-dict-save-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const idx = +e.currentTarget.dataset.idx;
            const m = _dictModalMatches[idx];
            addMedDictEntry(m.from, m.to);
            m.isAI  = false;
            m.isBase = false;
            renderReviewList();
            renderDictList();
            if (typeof showToast === 'function') showToast(`💾 "${m.from}" guardado en tu diccionario`, 'success');
        });
    });
}

// ─── 8. Renderizado de la pestaña DICCIONARIO ───────────────
function renderDictList() {
    const container = document.getElementById('medDictListContainer');
    if (!container) return;

    const custom = getMedCustomDict();
    const baseEntries  = Object.entries(MEDICAL_DICT_BASE);
    const customEntries = Object.entries(custom);

    let html = '';

    if (customEntries.length === 0) {
        html += `<p class="med-dict-section-empty">No tienes entradas personalizadas aún. Agrega palabras arriba.</p>`;
    } else {
        html += `<p class="med-dict-section-title">📁 Mi diccionario (${customEntries.length})</p>`;
        html += customEntries.map(([from, to]) => `
            <div class="med-dict-dict-row">
                <span class="med-dict-dict-from">${_htmlEncode(from)}</span>
                <span class="med-dict-arrow">→</span>
                <span class="med-dict-dict-to">${_htmlEncode(to)}</span>
                <span class="med-dict-badge badge-custom">MÍO</span>
                <button class="med-dict-del-btn" onclick="removeMedDictEntry('${_htmlEncode(from)}')" title="Eliminar">🗑</button>
            </div>
        `).join('');
    }

    html += `<details class="med-dict-base-details"><summary class="med-dict-section-title">🔒 Diccionario base (${baseEntries.length} entradas, solo lectura)</summary>`;
    html += baseEntries.map(([from, to]) => `
        <div class="med-dict-dict-row">
            <span class="med-dict-dict-from">${_htmlEncode(from)}</span>
            <span class="med-dict-arrow">→</span>
            <span class="med-dict-dict-to">${_htmlEncode(to)}</span>
            <span class="med-dict-badge badge-base">BASE</span>
        </div>
    `).join('');
    html += `</details>`;

    container.innerHTML = html;
}

// ─── 9. Abrir modal ─────────────────────────────────────────
window.openMedDictModal = function () {
    const editor = document.getElementById('editor');
    if (!editor || !editor.innerText.trim()) {
        if (typeof showToast === 'function') showToast('El editor está vacío', 'error');
        return;
    }

    const plainText = editor.innerText;
    const rawMatches = findDictMatches(plainText);

    _dictModalMatches = rawMatches.map(m => ({ ...m, checked: true }));
    _dictModalAILoaded = false;

    // Reset tabs → review
    _switchDictTab('review');

    renderReviewList();
    renderDictList();

    // Reset AI button state
    const btnAI = document.getElementById('btnMedDictScanAI');
    if (btnAI) { btnAI.disabled = false; btnAI.textContent = '🤖 Buscar más con IA'; }

    document.getElementById('medDictModal')?.classList.add('active');
};

function _switchDictTab(tab) {
    document.querySelectorAll('.med-dict-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const r = document.getElementById('medDictTabReview');
    const d = document.getElementById('medDictTabDictionary');
    if (r) r.style.display = tab === 'review' ? '' : 'none';
    if (d) d.style.display = tab === 'dictionary' ? '' : 'none';
}

function _htmlEncode(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── 10. Init (wiring de botones del modal) ─────────────────
window.initMedDictModal = function () {
    // Cerrar
    ['closeMedDictModal','btnMedDictClose'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            document.getElementById('medDictModal')?.classList.remove('active');
        });
    });

    // Tabs
    document.querySelectorAll('.med-dict-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            _switchDictTab(btn.dataset.tab);
            if (btn.dataset.tab === 'dictionary') renderDictList();
        });
    });

    // Aplicar correcciones
    document.getElementById('btnMedDictApply')?.addEventListener('click', () => {
        const editor = document.getElementById('editor');
        const toApply = _dictModalMatches.filter(m => m.checked);
        if (!editor || toApply.length === 0) {
            if (typeof showToast === 'function') showToast('Ninguna corrección seleccionada', 'warning');
            return;
        }
        applyDictCorrections(editor, toApply);
        document.getElementById('medDictModal')?.classList.remove('active');
        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof showToast === 'function') showToast(`✅ ${toApply.length} corrección${toApply.length !== 1 ? 'es' : ''} aplicada${toApply.length !== 1 ? 's' : ''}`, 'success');
    });

    // Agregar entrada al diccionario personal
    const addEntry = () => {
        const fromEl = document.getElementById('medDictInputFrom');
        const toEl   = document.getElementById('medDictInputTo');
        if (!fromEl || !toEl) return;
        const from = fromEl.value.trim();
        const to   = toEl.value.trim();
        if (!from || !to) { if (typeof showToast === 'function') showToast('Completa ambos campos', 'warning'); return; }
        addMedDictEntry(from, to);
        fromEl.value = '';
        toEl.value   = '';
        renderDictList();
        if (typeof showToast === 'function') showToast(`💾 "${from}" → "${to}" guardado`, 'success');
    };
    document.getElementById('btnMedDictAdd')?.addEventListener('click', addEntry);
    document.getElementById('medDictInputTo')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });

    // Scan con IA
    document.getElementById('btnMedDictScanAI')?.addEventListener('click', async () => {
        if (_dictModalAILoaded) return;
        const key = window.GROQ_API_KEY || localStorage.getItem('groq_api_key');
        if (!key) {
            if (typeof showToast === 'function') showToast('Configurá la API Key para usar IA', 'error');
            return;
        }
        const btn = document.getElementById('btnMedDictScanAI');
        btn.disabled = true;
        btn.textContent = '⏳ Consultando IA...';
        try {
            const editor = document.getElementById('editor');
            const aiMatches = await scanWithAI(editor?.innerText || '');
            _dictModalAILoaded = true;
            if (aiMatches.length === 0) {
                btn.textContent = '✓ Sin sugerencias adicionales';
            } else {
                // Merge: skip duplicates already in list
                const existing = new Set(_dictModalMatches.map(m => m.key));
                const newOnes  = aiMatches.filter(m => !existing.has(m.key));
                _dictModalMatches.push(...newOnes.map(m => ({ ...m, checked: true })));
                btn.textContent = `✓ IA agregó ${newOnes.length} sugerencia${newOnes.length !== 1 ? 's' : ''}`;
                renderReviewList();
            }
        } catch {
            btn.disabled  = false;
            btn.textContent = '🤖 Buscar más con IA';
            if (typeof showToast === 'function') showToast('Error al contactar la IA', 'error');
        }
    });

    // Escape cierra
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('medDictModal')?.classList.contains('active')) {
            document.getElementById('medDictModal')?.classList.remove('active');
        }
    });

    // Click fuera cierra
    document.getElementById('medDictModal')?.addEventListener('click', e => {
        if (e.target.id === 'medDictModal') {
            document.getElementById('medDictModal')?.classList.remove('active');
        }
    });
};
