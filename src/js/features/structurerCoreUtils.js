// ============ STRUCTURER CORE UTILS ============

(function () {
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

// Limpia marcadores [No especificado] de líneas que ya tienen contenido completo.
// Solo mantiene el marcador en líneas donde realmente falta información.
function _stripRedundantEmptyMarkers(md) {
    const MARKER = /\[No especificado\]/g;
    const MARKERS_ALL = /\[No especificado\]|\bNo se evaluó\.?|\bNo fue evaluad[ao]\.?|\bNo evaluad[ao]\.?|\bNo se realizó\.?|\bSin datos disponibles\.?/gi;
    return md.split('\n').map(line => {
        if (!MARKER.test(line)) return line;
        // Strip markdown heading markers, bold labels, and every empty-field marker
        const stripped = line
            .replace(/^#{1,3}\s*/, '')
            .replace(/\*\*[^*]+\*\*:?\s*/g, '')
            .replace(MARKERS_ALL, '')
            .replace(/[.,;:\s]+/g, ' ')
            .trim();
        // If meaningful content remains (≥30 chars) → it's a complete phrase, remove markers
        if (stripped.length >= 30) {
            return line.replace(MARKER, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1');
        }
        return line;
    }).join('\n');
}

function _stripWeakLeadIns(md) {
    return String(md || '')
    .replace(/(^|\n)\s*(?:\*\*)?\s*(Generalmente|En general|Habitualmente|Generally|Usually|Typically|Commonly|In general|Overall)\s*,\s+/gim, '$1')
    .replace(/([.!?]\s+)(?:\*\*)?\s*(Generalmente|En general|Habitualmente|Generally|Usually|Typically|Commonly|In general|Overall)\s*,\s+/gim, '$1');
}

function markdownToHtml(md) {
    if (!md) return '';

    // Pre-process: remove redundant [No especificado] from complete phrases
    md = _stripRedundantEmptyMarkers(md);
    // Limpieza final de inicios vagos introducidos por el LLM.
    md = _stripWeakLeadIns(md);

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
        const isNumList = /^\d+[.)]\s/.test(t.split('\n')[0].trim());
        const endsComma = /[,;]\s*$/.test(t.replace(/\[No especificado\]/g, '').trimEnd());
        if (!isHeading && !isList && !isNumList && endsComma) {
            if (!enumAcc) enumAcc = [];
            // Añadir todas las líneas no vacías del bloque al acumulador
            t.split('\n').forEach(l => { if (l.trim()) enumAcc.push(l.trim()); });
        } else {
            if (enumAcc) { mergedBlocks.push({ type: 'enum', lines: enumAcc }); enumAcc = null; }
            mergedBlocks.push({ type: isHeading ? 'heading' : (isList || isNumList) ? 'list' : 'para', raw: t, ordered: isNumList });
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
            const tag = mb.ordered ? 'ol' : 'ul';
            html.push(`<${tag} class="report-list">`);
            mb.raw.split('\n').forEach(l => {
                const lt = l.trim();
                if (!lt) return;
                if (/^[-*]\s/.test(lt)) {
                    html.push(`<li>${capFirst(inlineFormat(lt.replace(/^[-*]\s*/, '')))}</li>`);
                } else if (/^\d+[.)]\s/.test(lt)) {
                    html.push(`<li>${capFirst(inlineFormat(lt.replace(/^\d+[.)]\s*/, '')))}</li>`);
                } else if (/^\s{2,}[-*]\s/.test(l)) {
                    html.push(`<li class="report-list-nested">${capFirst(inlineFormat(lt.replace(/^[-*]\s*/, '')))}</li>`);
                }
            });
            html.push(`</${tag}>`);

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

    const EMPTY_FIELD_HTML =
        '<span class="no-data-field" contenteditable="false" data-field-empty="1">'
        + '<span class="no-data-text">— campo vacío —</span>'
        + '<button class="no-data-edit-btn" tabindex="0" title="Revisión" type="button">▶</button>'
        + '</span>';

    // Patrones que el AI puede generar cuando una estructura no fue evaluada
    const NO_EVAL_PATTERNS = [
        /\[No especificado\]/g,
        /\[Sin datos disponibles\]/gi,
        /\[No evaluado(?: en este estudio)?\]/gi,
        /\bNo se evalu\u00f3\.?/gi,
        /\bNo fue evaluad[ao]\.?/gi,
        /\bNo evaluad[ao]\.?/gi,
        /\bNo se realiz\u00f3\.?/gi,
        /\bSin datos disponibles\.?/gi,
    ];

    let result = html.join('\n');

    // Convertir a badge solo cuando el marcador representa un campo completo (fin de línea/bloque).
    // Evita mostrar botones en medio de frases clínicas.
    const emptyToken = '(?:\\[No especificado\\]|\\[Sin datos disponibles\\]|\\[No evaluado(?: en este estudio)?\\]|No se evalu\\u00f3\\.?|No fue evaluad[ao]\\.?|No evaluad[ao]\\.?|No se realiz\\u00f3\\.?|Sin datos disponibles\\.?)';
    const rxLabelField = new RegExp(`(:\\s*)${emptyToken}(?:\\s*[.,;:]?)(?=\\s*(?:<br\\s*\\/?>|<\\/p>|<\\/li>))`, 'gi');
    const rxBareField = new RegExp(`(>\\s*)${emptyToken}(?:\\s*[.,;:]?)(?=\\s*(?:<br\\s*\\/?>|<\\/p>|<\\/li>))`, 'gi');
    result = result
        .replace(rxLabelField, `$1${EMPTY_FIELD_HTML}`)
        .replace(rxBareField, `$1${EMPTY_FIELD_HTML}`);

    // Limpiar fragmentos huérfanos adyacentes al badge (ej: "s.", ".s", puntuación suelta)
    // que quedan cuando la IA genera variantes como "[No especificado]s." o "Sin datos."
    const badgeEndTag = '</span></span>';
    result = result.replace(new RegExp(badgeEndTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[a-z]{0,3}[.,;:]+', 'gi'),
        badgeEndTag);

    // No eliminar headings aquí: el borrado de secciones debe depender de acciones del usuario.

    return result;
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

// ─── Toast interactivo: confirmar/cambiar plantilla detectada ─────────────────
// Devuelve una Promise que resuelve con la clave de plantilla elegida.
// Auto-confirma tras 5 s si el usuario no interactúa.
function promptTemplateSelection(detectedKey) {
    return new Promise((resolve) => {
        const tmpl = window.MEDICAL_TEMPLATES || {};
        const name = tmpl[detectedKey]?.name || detectedKey;

        // Eliminar toast anterior si existiera
        const prev = document.getElementById('toastTemplate');
        if (prev) prev.remove();

        const el = document.createElement('div');
        el.id = 'toastTemplate';
        el.className = 'toast-action';
        el.innerHTML = `
            <span class="toast-action__text">&#128269; Plantilla: <strong>${name}</strong></span>
            <button class="toast-action__btn" id="toastTemplateCambiar">Cambiar</button>
        `;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));

        let timer;
        const done = (key) => {
            clearTimeout(timer);
            el.classList.remove('show');
            setTimeout(() => el.remove(), 350);
            resolve(key);
        };

        // Auto-confirma en 5 s
        timer = setTimeout(() => done(detectedKey), 5000);

        document.getElementById('toastTemplateCambiar').addEventListener('click', () => {
            clearTimeout(timer);
            // Filtrar por allowedTemplates si existe (Bloque 4)
            const allowed = (typeof CLIENT_CONFIG !== 'undefined' && Array.isArray(CLIENT_CONFIG.allowedTemplates) && CLIENT_CONFIG.allowedTemplates.length)
                ? CLIENT_CONFIG.allowedTemplates
                : Object.keys(tmpl).filter(k => k !== 'generico');
            const options = allowed
                .map(k => `<option value="${k}"${k === detectedKey ? ' selected' : ''}>${tmpl[k]?.name || k}</option>`)
                .join('');
            el.innerHTML = `
                <select id="toastTemplateSelect" class="toast-action__select">${options}</select>
                <button class="toast-action__btn" id="toastTemplateConfirm">&#10003; Confirmar</button>
                <button class="toast-action__btn toast-action__btn--ghost" id="toastTemplateCancel">&#10005;</button>
            `;
            document.getElementById('toastTemplateConfirm').addEventListener('click', () => {
                const sel = document.getElementById('toastTemplateSelect');
                done(sel ? sel.value : detectedKey);
            });
            document.getElementById('toastTemplateCancel').addEventListener('click', () => done(detectedKey));
            // 10 s adicionales para que el usuario elija
            timer = setTimeout(() => {
                const sel = document.getElementById('toastTemplateSelect');
                done(sel ? sel.value : detectedKey);
            }, 10000);
        });
    });
}

    window.StructurerCoreUtils = {
        _normStr,
        autoDetectTemplateKey,
        markdownToHtml,
        parseAIResponse,
        promptTemplateSelection,
        _stripRedundantEmptyMarkers,
    };
})();
