// ============ CLINICAL STRUCTURER (LLaMA 3) ============
// Remove accents for loose comparison
function _normStr(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
// Detect template type from raw text content (keyword + prompt matching with accent normalization)
function autoDetectTemplateKey(text) {
    if (!text || typeof window.MEDICAL_TEMPLATES === 'undefined') return 'generico';
    const normText = _normStr(text);
    const scores = {};
    for (const [key, tmpl] of Object.entries(window.MEDICAL_TEMPLATES)) {
        if (key === 'generico') continue;
        const name   = _normStr(tmpl.name);
        const prompt = _normStr(tmpl.prompt);
        let score = 0;
        // Template name words (>3 chars) — high weight
        name.split(/\s+/).forEach(word => {
            if (word.length > 3 && normText.includes(word)) score += 3;
        });
        // First 20 significant words from prompt
        prompt.split(/\s+/).filter(w => w.length > 5).slice(0, 20).forEach(word => {
            if (normText.includes(word)) score++;
        });
        // Keywords array — with stem fallback (strip last 1–2 chars to handle plural/accents)
        if (Array.isArray(tmpl.keywords)) {
            tmpl.keywords.forEach(kw => {
                _normStr(kw).split(/\s+/).forEach(w => {
                    if (w.length < 4) return;
                    if (normText.includes(w)) { score += 2; return; }
                    if (w.length >= 5 && normText.includes(w.slice(0, -1))) { score += 1; return; }
                    if (w.length >= 6 && normText.includes(w.slice(0, -2))) { score += 1; }
                });
            });
        }
        if (score > 0) scores[key] = score;
    }
    if (Object.keys(scores).length === 0) return 'generico';
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// ============ MARKDOWN → HTML CONVERTER ============
function markdownToHtml(md) {
    if (!md) return '';
    const lines = md.split('\n');
    const html = [];
    let inList = false;

    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };

    const inlineFormat = (text) => text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (/^#{1}\s/.test(line)) {
            closeList();
            html.push(`<h1 class="report-h1">${inlineFormat(line.replace(/^#+\s*/, ''))}</h1>`);
        } else if (/^#{2}\s/.test(line)) {
            closeList();
            html.push(`<h2 class="report-h2">${inlineFormat(line.replace(/^#+\s*/, ''))}</h2>`);
        } else if (/^#{3,}\s/.test(line)) {
            closeList();
            html.push(`<h3 class="report-h3">${inlineFormat(line.replace(/^#+\s*/, ''))}</h3>`);
        } else if (/^[-*]\s/.test(line)) {
            if (!inList) { html.push('<ul class="report-list">'); inList = true; }
            const content = line.replace(/^[-*]\s*/, '');
            // Sub-item: detect "  - "
            html.push(`<li>${inlineFormat(content)}</li>`);
        } else if (/^\s{2,}[-*]\s/.test(line)) {
            // nested bullet (already inside list paragraph)
            const content = line.replace(/^\s+[-*]\s*/, '');
            html.push(`<li class="report-list-nested">${inlineFormat(content)}</li>`);
        } else if (line.trim() === '') {
            closeList();
        } else {
            closeList();
            html.push(`<p class="report-p">${inlineFormat(line)}</p>`);
        }
    }
    closeList();
    const result = html.join('\n');
    // Wrap [No especificado] with clickable span
    return result.replace(/\[No especificado\]/g, '<span class="no-data" tabindex="0" title="Clic para editar">[No especificado]</span>');
}

// Extract AI's meta-note and return { body: html, note: string|null }
function parseAIResponse(raw) {
    if (!raw) return { body: '', note: null };

    // Match "Nota:" paragraph at the end (common pattern from LLaMA)
    const notePatterns = [
        /^\*?\*?Nota:?\*?\*?:?\s*/im,
        /^Note:?\s*/im,
        /^Aclaración:?\s*/im,
    ];

    let note = null;
    let body = raw;

    // Find last paragraph that starts with Nota / Note / Aclaración
    const paragraphs = raw.split(/\n{2,}/);
    const noteParaIdx = paragraphs.findLastIndex(p =>
        notePatterns.some(rx => rx.test(p.trim()))
    );

    if (noteParaIdx !== -1) {
        note = paragraphs[noteParaIdx]
            .replace(notePatterns[0], '')
            .replace(notePatterns[1], '')
            .replace(notePatterns[2], '')
            .replace(/^\*+|\*+$/g, '')
            .trim();
        body = paragraphs.slice(0, noteParaIdx).join('\n\n');
    }

    return { body: markdownToHtml(body.trim()), note };
}

async function structureTranscription(text, templateKey) {
    if (!GROQ_API_KEY) {
        showToast('Configura la API Key para el Modo Pro', 'error');
        return text;
    }

    // Enforce character limit before sending to API
    const MAX_STRUCTURE_CHARS = 15000;
    if (text.length > MAX_STRUCTURE_CHARS) {
        if (typeof showToast === 'function') showToast('El texto es muy largo. Se enviará una parte para estructurar.', 'warning');
        text = text.slice(0, MAX_STRUCTURE_CHARS);
    }

    // Find prompt in flat MEDICAL_TEMPLATES
    // Checking if MEDICAL_TEMPLATES is globally available
    let prompt = '';
    if (typeof MEDICAL_TEMPLATES !== 'undefined') {
        prompt = MEDICAL_TEMPLATES[templateKey]?.prompt || MEDICAL_TEMPLATES.generico?.prompt || 'Estructura este texto médico de forma profesional, corrigiendo terminología, organizándolo en párrafos coherentes y mejorando la sintaxis sin perder información:';
    } else {
        console.warn('MEDICAL_TEMPLATES no está definido globalmente.');
        prompt = 'Estructura este texto médico de forma profesional, corrigiendo terminología, y agregando las secciones clínicas apropiadas que detectes:';
    }

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: prompt + `

REGLAS ABSOLUTAS — cumplirlas todas sin excepción:
1. PRESERVA TODO EL CONTENIDO: cada hallazgo, medición, valor y dato de la transcripción DEBE aparecer en el informe. Nunca descartes información clínica, aunque no encaje perfectamente en la plantilla.
2. Si la transcripción contiene datos que no corresponden a las secciones propuestas, ubícalos en la sección más apropiada o crea una subsección adicional con un título descriptivo.
3. Usa [No especificado] SOLO cuando un campo de la plantilla no tiene absolutamente ningún dato en la transcripción.
4. NO añadas información que no esté en la transcripción.
5. NO añadas notas, comentarios ni advertencias propias en ningún lugar del informe.
6. Devuelve ÚNICAMENTE el contenido del informe en markdown, sin texto introductorio ni final.
7. No uses encabezados de nivel > 3 (###).` },
                    { role: "user", content: `Transcripción a estructurar:\n\n${text}` }
                ],
                temperature: 0.1
            })
        });

        if (!res.ok) throw new Error('Error al estructurar');
        const data = await res.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Structuring failed:', error);
        showToast('Error al estructurar. Se usará texto plano.', 'warning');
        return text; // Fallback a texto plano si falla 
    }
}

// ---- AI Note panel helper ----
// templateLabel: optional string to show which template was used
function showAINote(note, templateLabel) {
    const panel = document.getElementById('aiNotePanel');
    const content = document.getElementById('aiNoteContent');
    if (!panel || !content) return;
    const parts = [];
    if (templateLabel) parts.push(`📋 Plantilla: <strong>${templateLabel}</strong>`);
    if (note) parts.push(note);
    if (parts.length === 0) { panel.style.display = 'none'; return; }
    content.innerHTML = parts.join(' &nbsp;·&nbsp; ');
    panel.style.display = 'flex';
}

// ---- Patient data check after structuring ----
window.triggerPatientDataCheck = function(rawText) {
    const extracted = typeof extractPatientDataFromText === 'function'
        ? extractPatientDataFromText(rawText)
        : {};
    const savedConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const hasName = extracted.name || savedConfig.patientName;

    if (!hasName) {
        const set = (id, v) => { if (v !== undefined && v !== null && v !== '') { const el = document.getElementById(id); if (el) el.value = v; } };
        set('reqPatientName', extracted.name || '');
        set('reqPatientDni', extracted.dni || '');
        set('reqPatientAge', extracted.age || '');
        set('reqPatientSex', extracted.sex || '');
        document.getElementById('patientDataRequiredOverlay')?.classList.add('active');
    } else {
        const config = { ...savedConfig };
        if (extracted.name && !config.patientName) config.patientName = extracted.name;
        if (extracted.dni  && !config.patientDni)  config.patientDni  = extracted.dni;
        if (extracted.age  && !config.patientAge)  config.patientAge  = extracted.age;
        if (extracted.sex  && !config.patientSex)  config.patientSex  = extracted.sex;
        localStorage.setItem('pdf_config', JSON.stringify(config));
        if (extracted.name && typeof showToast === 'function')
            showToast(`👤 Paciente: ${extracted.name}`, 'success');
    }
}

// ---- Medical terminology checker — abre el modal del diccionario ----
window.checkMedicalTerminology = function() {
    if (typeof window.openMedDictModal === 'function') {
        window.openMedDictModal();
    }
}

// ============ AI BUTTON HANDLERS ============
window.initStructurer = function () {
    const btnStructureAIEl = document.getElementById('btnStructureAI');
    const aiProgressBar = document.getElementById('aiProgressBar');

    const showProgress = () => { if (aiProgressBar) aiProgressBar.style.display = 'block'; };
    const hideProgress = () => { if (aiProgressBar) aiProgressBar.style.display = 'none'; };

    if (btnStructureAIEl) {
        btnStructureAIEl.addEventListener('click', async () => {
            const editor = document.getElementById('editor');
            if (!editor || !editor.innerText.trim()) {
                if (typeof showToast === 'function') showToast('No hay texto para estructurar', 'error');
                return;
            }
            const rawText = editor.innerText;
            const oldHTML = btnStructureAIEl.innerHTML;
            window._lastRawTranscription = rawText; // save for restore/toggle
            btnStructureAIEl.disabled = true;
            btnStructureAIEl.innerHTML = '⏳ IA...';
            showProgress();
            try {
                let currentTemplate = typeof selectedTemplate !== 'undefined' ? selectedTemplate : 'generico';
                if (!currentTemplate || currentTemplate === 'generico') {
                    currentTemplate = autoDetectTemplateKey(rawText);
                }
                const rawMarkdown = await structureTranscription(rawText, currentTemplate);
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                window._lastStructuredHTML = body;
                const tmplLabel = (typeof MEDICAL_TEMPLATES !== 'undefined' && MEDICAL_TEMPLATES[currentTemplate])
                    ? MEDICAL_TEMPLATES[currentTemplate].name : currentTemplate;
                showAINote(note, tmplLabel);
                const btnR = document.getElementById('btnRestoreOriginal');
                if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.textContent = '↩'; }
                const btnM = document.getElementById('btnMedicalCheck');
                if (btnM) btnM.style.display = '';
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                if (typeof showToast === 'function') showToast('✅ Texto estructurado con IA', 'success');
                triggerPatientDataCheck(rawText);
            } catch (error) {
                if (typeof showToast === 'function') showToast('Error al estructurar', 'error');
            } finally {
                btnStructureAIEl.disabled = false;
                btnStructureAIEl.innerHTML = oldHTML;
                hideProgress();
            }
        });
    }

    const btnApplyStructure = document.getElementById('btnApplyStructure');
    if (btnApplyStructure) {
        btnApplyStructure.addEventListener('click', async () => {
            const editor = document.getElementById('editor');
            if (!editor || !editor.innerText.trim()) return showToast('No hay texto para estructurar', 'error');

            const rawText = editor.innerText;
            window._lastRawTranscription = rawText;
            const oldText = btnApplyStructure.textContent;
            btnApplyStructure.disabled = true;
            btnApplyStructure.textContent = "✨ Estructurando...";

            try {
                const templateSelect = document.getElementById('templateSelect');
                const templateKey = templateSelect ? templateSelect.value : 'generico';
                const rawMarkdown = await structureTranscription(editor.innerText, templateKey);
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                window._lastStructuredHTML = body;
                const tmplLabel2 = (typeof MEDICAL_TEMPLATES !== 'undefined' && MEDICAL_TEMPLATES[templateKey])
                    ? MEDICAL_TEMPLATES[templateKey].name : templateKey;
                showAINote(note, tmplLabel2);
                const btnR2 = document.getElementById('btnRestoreOriginal');
                if (btnR2) { btnR2.style.display = ''; btnR2._showingOriginal = false; btnR2.textContent = '↩'; }
                const btnM2 = document.getElementById('btnMedicalCheck');
                if (btnM2) btnM2.style.display = '';
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof showToast === 'function') showToast('Informe estructurado ✓', 'success');

                const wizardTemplateCard = document.getElementById('wizardTemplateCard');
                if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                triggerPatientDataCheck(rawText);
            } catch (e) {
                if (typeof showToast === 'function') showToast('Error al estructurar', 'error');
            } finally {
                btnApplyStructure.disabled = false;
                btnApplyStructure.textContent = oldText;
            }
        });
    }
}

