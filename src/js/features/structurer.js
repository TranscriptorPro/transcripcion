// ============ CLINICAL STRUCTURER (LLaMA 3) ============
// Detect template type from raw text content (keyword matching)
function autoDetectTemplateKey(text) {
    if (!text || typeof window.MEDICAL_TEMPLATES === 'undefined') return 'generico';
    const lowerText = text.toLowerCase();
    // Build score map: for each template, count how many keywords from its name/prompt match
    const scores = {};
    for (const [key, tmpl] of Object.entries(window.MEDICAL_TEMPLATES)) {
        if (key === 'generico') continue;
        const name = (tmpl.name || '').toLowerCase();
        const prompt = (tmpl.prompt || '').toLowerCase();
        let score = 0;
        // Split template name into words and check presence in text
        name.split(/\s+/).forEach(word => { if (word.length > 3 && lowerText.includes(word)) score += 3; });
        // Check some prompt keywords
        const promptWords = prompt.split(/\s+/).filter(w => w.length > 5);
        promptWords.slice(0, 20).forEach(word => { if (lowerText.includes(word)) score++; });
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
    return html.join('\n');
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
                    { role: "system", content: prompt + "\n\nREGLAS DE FORMATO OBLIGATORIAS:\n- Devuelve SOLO el contenido del informe en markdown.\n- NO agregues notas, aclaraciones, advertencias ni comentarios propios al final ni en ningún lugar del informe.\n- Si falta información, usa [No especificado] en el campo correspondiente.\n- No uses encabezados de nivel > 3 (###)." },
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
function showAINote(note) {
    const panel = document.getElementById('aiNotePanel');
    const content = document.getElementById('aiNoteContent');
    if (!panel || !content) return;
    if (!note) { panel.style.display = 'none'; return; }
    content.textContent = note;
    panel.style.display = 'flex';
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
                showAINote(note);
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                if (typeof showToast === 'function') showToast('✅ Texto estructurado con IA', 'success');
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

            const oldText = btnApplyStructure.textContent;
            btnApplyStructure.disabled = true;
            btnApplyStructure.textContent = "✨ Estructurando...";

            try {
                const templateSelect = document.getElementById('templateSelect');
                const templateKey = templateSelect ? templateSelect.value : 'generico';
                const rawMarkdown = await structureTranscription(editor.innerText, templateKey);
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                showAINote(note);
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof showToast === 'function') showToast('Informe estructurado ✓', 'success');

                const wizardTemplateCard = document.getElementById('wizardTemplateCard');
                if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            } catch (e) {
                if (typeof showToast === 'function') showToast('Error al estructurar', 'error');
            } finally {
                btnApplyStructure.disabled = false;
                btnApplyStructure.textContent = oldText;
            }
        });
    }
}

