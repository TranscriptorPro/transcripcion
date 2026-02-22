// ============ CLINICAL STRUCTURER (LLaMA 3) ============
// Remove accents for loose comparison
function _normStr(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
// Detect template type from raw text content.
// REGLA ESTRICTA: si no hay coincidencia clara y confiable → 'generico'.
// No usa palabras del prompt (son vocablo médico genérico y generan falsos positivos).
// Solo usa: nombre de la plantilla + array de keywords explícitos.
function autoDetectTemplateKey(text) {
    if (!text || typeof window.MEDICAL_TEMPLATES === 'undefined') return 'generico';
    const normText = _normStr(text);
    const scores = {};

    // Comprobar si todas las palabras de un array aparecen en proximidad dentro del texto
    // (ventana deslizante de N palabras — evita falsos positivos por palabras dispersas)
    const inProximity = (textWords, reqWords, windowSize) => {
        for (let i = 0; i < textWords.length; i++) {
            const win = textWords.slice(i, i + windowSize).join(' ');
            if (reqWords.every(w => win.includes(w))) return true;
        }
        return false;
    };
    const textWords = normText.split(/\s+/);

    for (const [key, tmpl] of Object.entries(window.MEDICAL_TEMPLATES)) {
        if (key === 'generico') continue;
        let score = 0;

        // 1. NOMBRE DE PLANTILLA — solo como frase completa (no palabras sueltas)
        //    Ej: "Topografía Corneal" → busca "topografia corneal" como subcadena continua
        const normName = _normStr(tmpl.name).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (normText.includes(normName)) {
            score += 10;
        } else {
            // Fallback: todas las palabras significativas del nombre juntas en ventana de 6
            const nameWords = normName.split(/\s+/).filter(w => w.length > 4);
            if (nameWords.length >= 2 && inProximity(textWords, nameWords, 6)) {
                score += 7;
            }
        }

        // 2. Keywords explícitos del array — fuente principal de detección
        if (Array.isArray(tmpl.keywords)) {
            tmpl.keywords.forEach(kw => {
                const normKw    = _normStr(kw);
                const kwWords   = normKw.split(/\s+/).filter(w => w.length >= 4);

                // Coincidencia exacta de frase completa → máxima confianza
                if (normText.includes(normKw)) {
                    score += 6;
                    return;
                }
                // Keyword multi-palabra: todas las palabras deben aparecer en PROXIMIDAD
                // (ventana de 8 palabras) — NO basta que estén en distintos párrafos
                if (kwWords.length > 1) {
                    if (inProximity(textWords, kwWords, 8)) score += 4;
                    return;
                }
                // Keyword de una sola palabra (>= 4 chars)
                if (kwWords.length === 1) {
                    const w = kwWords[0];
                    if (normText.includes(w)) { score += 4; return; }
                    if (w.length >= 6 && normText.includes(w.slice(0, -2))) score += 2;
                }
            });
        }

        if (score > 0) scores[key] = score;
    }

    if (Object.keys(scores).length === 0) return 'generico';

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestKey, bestScore] = sorted[0];
    const runnerUpScore = sorted[1]?.[1] ?? 0;

    // UMBRAL MÍNIMO DE CONFIANZA
    const MIN_SCORE = 7;
    if (bestScore < MIN_SCORE) return 'generico';

    // VERIFICAR AMBIGÜEDAD: dos candidatos con scores similares y bajos → generico
    if (runnerUpScore >= MIN_SCORE && bestScore < runnerUpScore * 1.5 && bestScore < 14) {
        return 'generico';
    }

    return bestKey;
}

// ============ MARKDOWN → HTML CONVERTER ============
function markdownToHtml(md) {
    if (!md) return '';

    const inlineFormat = (text) => text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');

    // Capitaliza el primer carácter real (saltando etiquetas HTML al inicio)
    const capFirst = (text) =>
        text.replace(/^(\s*(?:<[^>]+>)*)([a-záéíóúüñ])/i, (_, pre, ch) => pre + ch.toUpperCase());

    const html = [];

    // Separar en bloques por líneas en blanco (párrafos Markdown reales)
    const rawBlocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/);

    // Agrupar bloques de texto consecutivos que terminan en coma/punto y coma
    // (son hallazgos en enumeración → van en el mismo párrafo fluido)
    const mergedBlocks = [];
    let enumAcc = null;
    for (const block of rawBlocks) {
        const t = block.trim();
        if (!t) continue;
        const isHeading = /^#{1,3}\s/.test(t);
        const isList    = /^[-*]\s/.test(t.split('\n')[0].trim());
        const endsComma = /[,;]\s*$/.test(t.replace(/\[No especificado\]/g, '').trimEnd());
        if (!isHeading && !isList && endsComma) {
            if (!enumAcc) enumAcc = [];
            // Añadir todas las líneas no vacías del bloque al acumulador
            t.split('\n').forEach(l => { if (l.trim()) enumAcc.push(l.trim()); });
        } else {
            if (enumAcc) { mergedBlocks.push({ type: 'enum', lines: enumAcc }); enumAcc = null; }
            mergedBlocks.push({ type: isHeading ? 'heading' : isList ? 'list' : 'para', raw: t });
        }
    }
    if (enumAcc) mergedBlocks.push({ type: 'enum', lines: enumAcc });

    for (const mb of mergedBlocks) {
        if (mb.type === 'enum') {
            // Hallazgos en enumeración → un solo párrafo, ítems unidos con espacio
            const text = mb.lines.map(inlineFormat).join(' ');
            html.push(`<p class="report-p">${capFirst(text)}</p>`);

        } else if (mb.type === 'heading') {
            const lines = mb.raw.split('\n');
            lines.forEach(raw => {
                const l = raw.trim();
                if (!l) return;
                if      (/^# /.test(l))  html.push(`<h1 class="report-h1">${inlineFormat(l.replace(/^#+\s*/, ''))}</h1>`);
                else if (/^## /.test(l)) html.push(`<h2 class="report-h2">${inlineFormat(l.replace(/^#+\s*/, ''))}</h2>`);
                else if (/^### /.test(l))html.push(`<h3 class="report-h3">${inlineFormat(l.replace(/^#+\s*/, ''))}</h3>`);
                else                     html.push(`<p class="report-p">${capFirst(inlineFormat(l))}</p>`);
            });

        } else if (mb.type === 'list') {
            html.push('<ul class="report-list">');
            mb.raw.split('\n').forEach(l => {
                const lt = l.trim();
                if (!lt) return;
                if (/^[-*]\s/.test(lt)) {
                    html.push(`<li>${capFirst(inlineFormat(lt.replace(/^[-*]\s*/, '')))}</li>`);
                } else if (/^\s{2,}[-*]\s/.test(l)) {
                    html.push(`<li class="report-list-nested">${capFirst(inlineFormat(lt.replace(/^[-*]\s*/, '')))}</li>`);
                }
            });
            html.push('</ul>');

        } else {
            // Párrafo normal: múltiples líneas → unir con <br>, capitalizar cada una
            const lines = mb.raw.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 1) {
                html.push(`<p class="report-p">${capFirst(inlineFormat(lines[0]))}</p>`);
            } else {
                const parts = lines.map((l, i) => i === 0 ? capFirst(inlineFormat(l)) : capFirst(inlineFormat(l)));
                html.push(`<p class="report-p">${parts.join('<br>')}</p>`);
            }
        }
    }

    return html.join('\n')
        .replace(/\[No especificado\]/g, '<span class="no-data" tabindex="0" title="Clic para editar">[No especificado]</span>');
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
7. No uses encabezados de nivel > 3 (###).
8. FORMATO DE PÁRRAFOS (CRÍTICO): dentro de cada sección, escribe los hallazgos como un párrafo continuo y fluido. NO separes cada hallazgo con líneas en blanco. Los ítems de una misma sección van juntos, sin saltos de línea dobles entre ellos. Solo usa línea en blanco para separar SECCIONES distintas (##). La primera palabra de cada párrafo debe comenzar con mayúscula.` },
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
    // Siempre limpia datos del paciente anterior — nunca hay carry-over entre informes
    const savedConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    delete savedConfig.patientName;
    delete savedConfig.patientDni;
    delete savedConfig.patientAge;
    delete savedConfig.patientSex;
    localStorage.setItem('pdf_config', JSON.stringify(savedConfig));

    // Intentar extraer datos del paciente desde el audio transcripto
    const extracted = typeof extractPatientDataFromText === 'function'
        ? extractPatientDataFromText(rawText) : {};

    if (extracted.name) {
        // Encontrado en el audio — guardar y notificar
        savedConfig.patientName = extracted.name;
        if (extracted.dni) savedConfig.patientDni = extracted.dni;
        if (extracted.age) savedConfig.patientAge = extracted.age;
        if (extracted.sex) savedConfig.patientSex = extracted.sex;
        localStorage.setItem('pdf_config', JSON.stringify(savedConfig));
        if (typeof showToast === 'function')
            showToast(`👤 Paciente detectado: ${extracted.name}`, 'success');
    } else {
        // Sin datos en el audio → siempre pedir, siempre con campos vacíos
        ['reqPatientName','reqPatientDni','reqPatientAge','reqPatientSex',
         'reqPatientInsurance','reqPatientAffiliateNum','reqPatientSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.style.borderColor = ''; }
        });
        document.getElementById('patientDataRequiredOverlay')?.classList.add('active');
        // Inicializar buscador de registro
        if (typeof initPatientRegistrySearch === 'function') initPatientRegistrySearch();
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
                let autoDetected = false;
                if (!currentTemplate || currentTemplate === 'generico') {
                    const detected = autoDetectTemplateKey(rawText);
                    if (detected !== 'generico') {
                        currentTemplate = detected;
                        autoDetected = true;
                    } else {
                        currentTemplate = 'generico';
                    }
                }
                const rawMarkdown = await structureTranscription(rawText, currentTemplate);
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                window._lastStructuredHTML = body;
                // No mostrar el panel de plantilla/nota — solo el informe estructurado
                showAINote(null, null);
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
                // No mostrar el panel de plantilla/nota — solo el informe
                showAINote(null, null);
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

