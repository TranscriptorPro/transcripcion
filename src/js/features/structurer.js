// ============ CLINICAL STRUCTURER (LLaMA 3) ============
// Remove accents for loose comparison
// ============ STRUCTURER CORE WRAPPERS (extraido) ============
// Compat tests (texto): autoDetectTemplateKey | markdownToHtml | promptTemplateSelection | score >= MIN_SCORE
function _normStr(s) {
    const core = window.StructurerCoreUtils || {};
    if (typeof core._normStr === 'function') return core._normStr(s);
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function autoDetectTemplateKey(text) {
    const core = window.StructurerCoreUtils || {};
    if (typeof core.autoDetectTemplateKey === 'function') return core.autoDetectTemplateKey(text);
    return 'generico';
}

function markdownToHtml(md) {
    const core = window.StructurerCoreUtils || {};
    if (typeof core.markdownToHtml === 'function') return core.markdownToHtml(md);
    return md || '';
}

function parseAIResponse(raw) {
    const core = window.StructurerCoreUtils || {};
    if (typeof core.parseAIResponse === 'function') return core.parseAIResponse(raw);
    return { body: markdownToHtml((raw || '').trim()), note: null };
}

function promptTemplateSelection(detectedKey) {
    // Compat tests (texto): toastTemplateCambiar
    const core = window.StructurerCoreUtils || {};
    if (typeof core.promptTemplateSelection === 'function') return core.promptTemplateSelection(detectedKey);
    return Promise.resolve(detectedKey || 'generico');
}

// ── Modelos disponibles en Groq (en orden de preferencia) ──────────────────
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant'   // fast fallback (mixtral-8x7b deprecado)
];
if (typeof window !== 'undefined') window.GROQ_MODELS = GROQ_MODELS;

function _getNonMedicalWarning() {
    const suffix = ' no se puede estructurar como informe médico porque no reúne las características apropiadas para su estructuración. De todos modos, si lo desea, igualmente puede editar el texto';
    const entry = Array.isArray(window.transcriptions) && window.transcriptions[window.activeTabIndex || 0];
    const fn = entry && entry.fileName ? String(entry.fileName) : '';
    if (fn === 'Texto pegado' || fn === 'Texto manual') {
        return 'ADVERTENCIA: El texto copiado/pegado' + suffix;
    }
    if (window.appState === 'TRANSCRIBED' || /\.(mp3|wav|ogg|m4a|webm|mp4|flac|aac)$/i.test(fn)) {
        return 'ADVERTENCIA: El texto obtenido a partir de los audios' + suffix;
    }
    return 'ADVERTENCIA: El texto cargado del archivo' + suffix;
}

function _isLikelyMedicalText(text) {
    const src = String(text || '');
    if (!src.trim()) return false;
    const sample = src.toLowerCase();
    const cues = [
        'paciente', 'diagnostico', 'diagnóstico', 'ecografia', 'ecografía', 'eco doppler',
        'radiografia', 'radiografía', 'tomografia', 'tomografía', 'resonancia',
        'colonoscopia', 'colonoscopía', 'gastroscopia', 'gastroscopía',
        'laringoscopia', 'laringoscopía', 'broncoscopia', 'broncoscopía',
        'cinecoronariografia', 'cinecoronariografía',
        'presion arterial', 'presión arterial', 'frecuencia cardiaca', 'frecuencia cardíaca',
        'saturacion', 'saturación', 'hallazgo', 'hallazgos', 'informe medico', 'informe médico',
        'orofaringe', 'ventriculo', 'ventrículo', 'auricula', 'aurícula',
        'arteria', 'lesion', 'lesión', 'mmhg',
        'antecedentes', 'tratamiento', 'medicacion', 'medicación',
        'biopsia', 'hemograma', 'laboratorio', 'evolucion', 'evolución',
        'electrocardiograma', 'ecocardiograma', 'endoscopia', 'endoscopía',
        'tiroides', 'prostata', 'próstata', 'hepatomegalia', 'esplenomegalia',
        'densitometria', 'densitometría', 'mamografia', 'mamografía',
        'pap', 'colposcopia', 'colposcopía', 'epicrisis',
        'anamnesis', 'motivo de consulta', 'examen fisico', 'examen físico',
        'parénquima', 'parenquima', 'paredes regulares', 'mucosa',
        'conclusion', 'conclusión'
    ];
    let hits = 0;
    for (const cue of cues) {
        if (sample.includes(cue)) {
            hits += 1;
            if (hits >= 2) return true;
        }
    }
    return false;
}

function _stripGeneralConclusionSections(md) {
    let out = String(md || '');
    if (!out) return out;
    // En modo no médico se prohíbe conclusión: eliminar bloques de conclusión/diagnóstico al final.
    out = out.replace(/(?:^|\n)##+\s*(?:conclusi[oó]n(?:es)?|diagn[oó]stico|impresi[oó]n diagn[oó]stica)\s*\n[\s\S]*?(?=\n##+\s|\s*$)/gi, '\n');
    return out.trim();
}

/**
 * Elimina oraciones adversativas/de carencia en la sección de conclusión.
 * Estas oraciones empiezan o contienen frases del tipo "aunque se carece de...",
 * "si bien no se especificó...", "sin embargo falta...", etc.
 * El modelo a veces las genera a pesar de tener prohibición explícita en el prompt.
 */
function _stripConclusionCaveats(md) {
    let out = String(md || '');
    if (!out) return out;

    // Patrón que detecta oraciones adversativas sobre datos faltantes/no dictados.
    const CAVEAT_PATTERN = /[^.!?\n]*(?:aunque\s+(?:se\s+carece|no\s+se\s+(?:detalló|especificó|mencionó|evaluó|dispone|cuenta)|faltan?)|si\s+bien\s+(?:no\s+se|falta)|sin\s+embargo[\s,]+(?:falta|no\s+se|se\s+carece)|no\s+(?:se\s+dispone|se\s+cuenta)\s+con\s+información|falta(?:n)?\s+(?:datos?|información|detalles?)\s+sobre|a\s+pesar\s+de\s+(?:no\s+contar|la\s+falta)|no\s+obstante\s+(?:la\s+falta|no\s+se))[^.!?\n]*[.!?]?/gi;

    // Solo aplicar dentro de la sección de CONCLUSIÓN / IMPRESIÓN DIAGNÓSTICA.
    out = out.replace(
        /(##+\s*(?:conclusi[oó]n(?:es)?|impresi[oó]n\s+diagn[oó]stica|conclusi[oó]n\s+diagn[oó]stica)\s*\n)([\s\S]*?)(?=\n##+\s|$)/gi,
        (match, heading, body) => {
            const cleaned = body.replace(CAVEAT_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
            return heading + (cleaned || 'Estudio dentro de parámetros normales.') + '\n';
        }
    );
    return out;
}

function _stripPatientIdentitySections(md) {
    let out = String(md || '');
    if (!out) return out;
    // Elimina secciones demograficas completas para evitar duplicar el cuadro de paciente.
    out = out.replace(/(?:^|\n)##+\s*(?:datos\s+demogr[aá]ficos|datos\s+(?:del\s+)?paciente|datos\s+generales|identificaci[oó]n(?:\s+del\s+paciente)?|informaci[oó]n\s+(?:del\s+)?paciente)\s*\n[\s\S]*?(?=\n##+\s|\s*$)/gi, '\n');
    // Elimina lineas sueltas de identificacion en cuerpo.
    out = out.replace(/(^|\n)\s*(?:paciente|nombre|dni|edad|sexo|g[eé]nero|obra\s+social|afiliad[oa]|n[uú]mero\s+de\s+(?:afiliado|documento))\s*:\s*[^\n]+(?=\n|$)/gi, '$1');
    return out.trim();
}

async function structureTranscription(text, templateKey, temperature = 0.1, model = GROQ_MODELS[0], options = {}) {
    if (!GROQ_API_KEY) {
        throw new Error('HTTP_401: API Key no configurada');
    }

    // Enforce character limit before sending to API
    const MAX_STRUCTURE_CHARS = 15000;
    if (text.length > MAX_STRUCTURE_CHARS) {
        if (typeof showToast === 'function') showToast('El texto es muy largo. Se enviará una parte para estructurar.', 'warning');
        text = text.slice(0, MAX_STRUCTURE_CHARS);
    }

    const forceGeneralNoConclusion = !!options.forceGeneralNoConclusion;

    // Find prompt in flat MEDICAL_TEMPLATES
    // Checking if MEDICAL_TEMPLATES is globally available
    let prompt = '';
    if (forceGeneralNoConclusion) {
        prompt = 'Actua como editor profesional. Estructura el contenido en formato general claro y ordenado, con titulos y subtitulos cuando correspondan, sin agregar informacion nueva.';
    } else if (typeof MEDICAL_TEMPLATES !== 'undefined') {
        prompt = MEDICAL_TEMPLATES[templateKey]?.prompt || MEDICAL_TEMPLATES.generico?.prompt || 'Estructura este texto médico de forma profesional, corrigiendo terminología, organizándolo en párrafos coherentes y mejorando la sintaxis sin perder información:';
    } else {
        console.warn('MEDICAL_TEMPLATES no está definido globalmente.');
        prompt = 'Estructura este texto médico de forma profesional, corrigiendo terminología, y agregando las secciones clínicas apropiadas que detectes:';
    }

    const systemContent = forceGeneralNoConclusion
        ? `${prompt}

REGLAS ABSOLUTAS — cumplirlas todas sin excepcion:
1. PRESERVA TODO EL CONTENIDO del texto original, sin omitir datos.
2. NO inventes informacion ni agregues interpretaciones tecnicas que no esten en el texto.
3. Estructura en markdown con titulos y subtitulos (maximo hasta ###), seguido de parrafos claros.
4. NO agregues ninguna seccion de conclusion, conclusiones, diagnostico o impresion diagnostica.
5. NO des recomendaciones, conducta, tratamiento ni cierre medico.
6. Devuelve UNICAMENTE el contenido estructurado en markdown, sin texto introductorio ni final.`
        : prompt + `

REGLAS ABSOLUTAS — cumplirlas todas sin excepción (ordenadas por prioridad):

>>> REGLAS CRÍTICAS (NUNCA violar) >>>
1. PRESERVA TODO EL CONTENIDO: cada hallazgo, medición, valor y dato de la transcripción DEBE aparecer en el informe. Nunca descartes información clínica, aunque no encaje perfectamente en la plantilla.
2. NO añadas información que no esté en la transcripción. NO inventes valores, porcentajes, diagnósticos ni datos que el médico no haya dictado.
3. DATOS DEL PACIENTE: NO incluyas datos identificatorios personales (nombre, apellido, DNI, obra social, número de afiliado). Edad, sexo, peso y talla SÍ pueden incluirse cuando la plantilla los requiera, ya que son datos clínicos relevantes para la interpretación.
4. Devuelve ÚNICAMENTE el contenido del informe en markdown, sin texto introductorio ("Aquí está...", "A continuación...") ni final ("Espero que...", "Nota:"). NO añadas notas, comentarios ni advertencias propias.

>>> FORMATO >>>
5. Markdown con encabezados hasta ### (nunca ####). Usa ## para secciones principales.
6. PÁRRAFOS CONTINUOS: dentro de cada sección, escribe los hallazgos como un párrafo continuo y fluido. NO separes cada hallazgo en líneas individuales. Solo línea en blanco entre SECCIONES distintas (##). Primera palabra de cada párrafo en mayúscula.
7. NÚMEROS Y UNIDADES: siempre con dígitos, nunca con letras ("75%" no "setenta y cinco por ciento"; "12 mm" no "doce milímetros"). NUNCA conviertas entre unidades: si dice "10 mm", escribe "10 mm", NO "1 cm".

>>> MARCADOR DE CAMPOS VACÍOS >>>
8. CAMPO NO EVALUADO: cuando una estructura NO fue evaluada ni mencionada, usa ÚNICAMENTE el marcador [No especificado]. NUNCA uses variantes como "No se evaluó", "No fue evaluado/a", "Sin datos disponibles". EXCEPCIÓN: "s/p" (sin particularidades) es VÁLIDO cuando la estructura SÍ fue evaluada y el resultado es normal. No confundir: s/p = evaluado + normal; [No especificado] = no evaluado (genera campo editable interactivo).

>>> PRESERVAR TODAS LAS SECCIONES DE LA PLANTILLA >>>
9. NUNCA elimines, omitas ni fusiones secciones de la plantilla. Mantén TODAS las secciones ##, incluso si no tienen contenido (en ese caso usa [No especificado]). El usuario decide qué hacer con cada sección vacía.

>>> ESTUDIOS MULTI-ESTRUCTURA >>>
10. En estudios multi-órgano/multi-segmento (ecografía, colonoscopía, Doppler, laringoscopía, etc.): una sección ## por CADA estructura evaluada. Si una estructura fue evaluada y es normal → describir brevemente o indicar s/p. Si NO fue evaluada → marcar con [No especificado]. Si la transcripción contiene datos que no encajan en las secciones propuestas → crear subsección adicional.

>>> CONCLUSIÓN >>>
11. CONCLUSIÓN — REGLA INAMOVIBLE DE MÁS ALTA PRIORIDAD:
La conclusión es un párrafo que SOLO contiene hallazgos que el médico dictó de forma explícita y positiva.
(a) Incluir TODOS los hallazgos patológicos o positivos; ninguno puede omitirse.
(b) NO incluir estructuras normales ni neutrales.
(c) Si todo es normal: escribir exactamente "Estudio dentro de parámetros normales." y nada más.
(d) NUNCA dejar vacía ni como [No especificado].
(e) PROHIBICIÓN ABSOLUTA DE INVENTAR O INFERIR: NO agregues datos que el médico no dijo, NO menciones lo que "falta", NO sugieras lo que "debería haberse evaluado", NO hagas diagnósticos diferenciales, NO especules.
(f) PROHIBICIÓN ABSOLUTA DE FRASES ADVERSATIVAS O DE CARENCIA: La conclusión NUNCA puede contener frases como — "aunque se carece de", "aunque faltan detalles", "si bien no se especificó", "sin embargo falta", "aunque no se detalló", "no se dispone de", "falta información sobre", "aunque no se evaluó", "aunque se desconoce", "a pesar de no contar con", "no obstante la falta de", o cualquier variante que introduzca lo que NO fue dicho. Si el modelo siente la necesidad de escribir una de esas frases, DEBE eliminarse completamente.
(g) NO indicar tratamientos si el médico no los mencionó.
REGLA DE ORO: preguntate "¿el médico dijo esto explícitamente?" → SI → inclúyelo. NO → bórralo.

>>> CALIDAD LINGÜÍSTICA >>>
12. CORRECCIÓN ASR: el texto proviene de reconocimiento de voz. Corrige silenciosamente errores fonéticos ("o dinofagia" → "odinofagia", "bujales" → "bucales"), anglicismos ("laryngoscopy" → "laringoscopía") y palabras partidas. NO señales las correcciones.
13. Español médico formal impecable. Corrige errores ortográficos, gramaticales y de concordancia. Encabezados anatómicos sin tildes incorrectas: "OROFARINGE" (correcto), NO "ORÓFARINGE".
14. PROHIBIDO usar muletillas, rellenos o inicios vagos en CUALQUIER idioma: "Generalmente,", "Generally,", "Usually,", "Typically,", "Normally,", "Basically,", "En general,", "Habitualmente,", "Cabe destacar que", "Es importante mencionar que", "It should be noted that", etc. Redacta directo, preciso y objetivo. Escribe SIEMPRE en español médico formal. NUNCA mezcles idiomas ni uses inglés.
15. PROHIBIDO usar puntos suspensivos (...) o frases incompletas. Si un campo no se realizó/no se especificó y no es vital para la estructura, NO lo menciones. Si la estructura exige el campo, colócalo como campo independiente con [No especificado], nunca incrustado en un párrafo con texto clínico.

>>> RECORDATORIO FINAL >>>
Antes de responder, verifica: ¿preservé TODOS los datos? ¿Usé [No especificado] (no variantes)? ¿La conclusión incluye SOLO hallazgos que el médico dictó explícitamente? ¿La conclusión NO tiene frases como "aunque se carece de", "aunque no se detalló", "si bien falta información", "sin embargo falta", "aunque no se evaluó"? ¿No inventé absolutamente nada?`;

    try {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemContent },
                    { role: "user", content: `Transcripción a estructurar:\n\n${text}` }
                ],
                temperature: temperature
            })
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const errDetails = errBody?.error?.message || 'Error al estructurar';
            throw new Error(`HTTP_${res.status}: ${errDetails}`);
        }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('La respuesta de la IA no contiene texto válido');
        // RB-6: Trackear uso de API de estructuración
        if (window.apiUsageTracker) window.apiUsageTracker.trackStructuring();
        let cleaned = forceGeneralNoConclusion ? _stripGeneralConclusionSections(content) : content;
        // Red de seguridad: eliminar oraciones adversativas/de carencia en conclusión aunque el modelo desobedezca.
        cleaned = _stripConclusionCaveats(cleaned);
        const extractedPatient = (typeof extractPatientDataFromText === 'function') ? extractPatientDataFromText(text) : {};
        if (extractedPatient && (extractedPatient.name || extractedPatient.dni || extractedPatient.age || extractedPatient.sex || extractedPatient.insurance || extractedPatient.affiliateNum)) {
            cleaned = _stripPatientIdentitySections(cleaned);
        }
        cleaned = _normalizeTemplateSpecificOutput(cleaned, templateKey, text);
        return _postProcessStructuredMarkdown(cleaned);
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('HTTP_TIMEOUT: El servidor no respondió en 2 minutos');
        }
        console.error('Structuring failed:', error);
        throw error; // Propagate to structureWithRetry
    }
}

// ── Clasificación inteligente de errores de estructuración ───────────────────
function classifyStructError(err) {
    const msg = err.message || '';
    if (msg.includes('HTTP_401') || msg.toLowerCase().includes('api key') || msg.includes('invalid_api_key')) {
        return { type: 'auth', wait: 0, switchModel: false };
    }
    if (msg.includes('HTTP_429')) {
        return { type: 'rate_limit', wait: 8000, switchModel: false };
    }
    if (msg.includes('HTTP_503') || msg.includes('HTTP_504') || msg.includes('HTTP_500')) {
        return { type: 'server_error', wait: 1000, switchModel: true };
    }
    if (err instanceof TypeError || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        return { type: 'network', wait: 0, switchModel: false };
    }
    return { type: 'unknown', wait: 2000, switchModel: false };
}

function _isStructurerAdmin() {
    return typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN';
}

function _openStructurerSupport() {
    if (typeof window.openContactModal === 'function') {
        window.openContactModal('Problema con la API Key');
        return;
    }
    var btnContacto = document.getElementById('btnContacto');
    if (btnContacto) btnContacto.click();
}

function _showStructurerFailureToast(err) {
    const isAdmin = _isStructurerAdmin();
    const saved = !!(err && err.savedToPending);

    if (!isAdmin && typeof showToastWithAction === 'function') {
        if (saved) {
            showToastWithAction(
                '📋 No pudimos procesar con IA ahora. Tu texto quedó guardado y reintentaremos luego.',
                'warning',
                '📧 Contactar',
                function () { _openStructurerSupport(); },
                7000
            );
            return;
        }
        showToastWithAction(
            '⚠️ No pudimos estructurar en este momento. Tu texto original se mantuvo intacto.',
            'warning',
            '📧 Contactar',
            function () { _openStructurerSupport(); },
            7000
        );
        return;
    }

    const msg = saved
        ? '📋 Sin conexión con la IA. El texto fue guardado para procesar más tarde.'
        : '❌ No se pudo estructurar. El texto original fue restaurado.';
    const type = saved ? 'warning' : 'error';
    if (typeof showToast === 'function') showToast(msg, type);
}

// ── Pre-flight: verificar requisitos antes de estructurar ──────────────────
function checkStructurePrerequisites() {
    const key = window.GROQ_API_KEY || '';
    if (!key || !key.startsWith('gsk_')) {
        // C7: Admin → abrir settings; Cliente → contactar soporte
        const isAdmin = typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN';
        if (isAdmin) {
            if (typeof showToastWithAction === 'function') {
                showToastWithAction('🔑 API Key no configurada.', 'error', '⚙️ Configurar', function() {
                    var overlay = document.getElementById('settingsModalOverlay');
                    if (overlay) {
                        if (typeof populateSettingsModal === 'function') populateSettingsModal();
                        overlay.classList.add('active');
                    }
                }, 7000);
            } else if (typeof showToast === 'function') {
                showToast('🔑 API Key no configurada. Ir a Configuración.', 'error');
            }
        } else {
            if (typeof showToastWithAction === 'function') {
                showToastWithAction('🔑 No pudimos validar la IA. Te ayudamos desde soporte.', 'warning', '📧 Contactar', function() {
                    _openStructurerSupport();
                }, 7000);
            } else if (typeof showToast === 'function') {
                showToast('🔑 No pudimos validar la IA. Contactá a soporte.', 'warning');
            }
        }
        return false;
    }
    return true;
}

function _prepareStructuringInput(text) {
    const src = String(text || '');
    if (!src.trim()) return src;

    return src
        // Une palabras cortadas por salto de línea típico de OCR/PDF.
        .replace(/([A-Za-zÁÉÍÓÚáéíóúÑñ])\s*-\s*\n\s*([A-Za-zÁÉÍÓÚáéíóúÑñ])/g, '$1$2')
        // Quita guiones suaves y caracteres de control frecuentes en texto escaneado.
        .replace(/\u00AD/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Une saltos simples dentro del mismo párrafo.
        .replace(/([^\n])\n(?!\n)([^#\-\*\d\n])/g, '$1 $2')
        // Normaliza espacios.
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function _isBilateralGonioscopyInput(sourceText) {
    const normalized = _normStr(sourceText || '');
    if (!normalized) return false;

    return /\bao\b/.test(normalized) ||
           normalized.includes('ambos ojos') ||
           normalized.includes('bilateral') ||
           normalized.includes('ojo derecho e izquierdo');
}

function _extractMarkdownSection(markdown, sectionPattern) {
    const sectionRegex = new RegExp(
        `(#{2,3}\\s*${sectionPattern}[^\\n]*\\n)([\\s\\S]*?)(?=\\n#{2,3}\\s+|$)`,
        'i'
    );
    const match = String(markdown || '').match(sectionRegex);
    if (!match) return null;

    return {
        full: match[0],
        header: match[1],
        body: match[2]
    };
}

function _sectionLooksNoData(sectionBody) {
    const lines = String(sectionBody || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return true;

    for (const line of lines) {
        const clean = line.replace(/^[-*•]\s*/, '').trim();
        if (!clean) continue;

        const colonIdx = clean.indexOf(':');
        const value = colonIdx >= 0 ? clean.slice(colonIdx + 1).trim() : clean;
        if (!value) continue;
        if (/^\[No especificado\]\.?(?:\s*)$/i.test(value)) continue;

        return false;
    }

    return true;
}

function _normalizeGonioscopyBilateralAO(markdown, sourceText) {
    let out = String(markdown || '');
    if (!out) return out;
    if (!_isBilateralGonioscopyInput(sourceText)) return out;

    const od = _extractMarkdownSection(out, 'OJO\\s+DERECHO');
    const oi = _extractMarkdownSection(out, 'OJO\\s+IZQUIERDO');
    if (!od || !oi) return out;
    if (_sectionLooksNoData(od.body)) return out;
    if (!_sectionLooksNoData(oi.body)) return out;

    // Si el dictado fue AO/bilateral y OI quedó vacío, replicar hallazgos de OD.
    return out.replace(oi.full, `${oi.header}${od.body}`);
}

function _normalizeGonioscopyNarrativeQuality(markdown) {
    let out = String(markdown || '');
    if (!out) return out;

    const fixes = [
        [/\bcon\s+un\s+con\b/gi, 'con'],
        [/\bcon\s+con\b/gi, 'con'],
        [/grado\s+Shaffer\s+y\s+condici[oó]n\s+(abierto|estrecho|cerrado)\b/gi, 'grado Shaffer y condición $1'],
        [/grado\s+Shaffer\s+y\s+condici[oó]n(?=\s*[,.;:]|\s*$)/gi, ''],
        [/el\s+grado\s+de\s+Shaffer\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, ''],
        [/la\s+pigmentaci[oó]n\s+trabecular\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, ''],
        [/la\s+configuraci[oó]n\s+del\s+iris\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, ''],
        [/la\s+gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s*(?:es|:)\s*(?:\.\.+|…|[.,;:]+)?\s*(?:o\s+no\s+se\s+(?:especific[oó]|inform[oó]))?\s*,?/gi, ''],
        [/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+realiz[oó]\s+o\s+no\s+se\s+(?:especific[oó]|inform[oó])\.?,?/gi, ''],
        [/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+inform[oó]\.?,?/gi, ''],
        [/No\s+se\s+realiz(?:o|ó|aron)\s+gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\.?/gi, ''],
        [/Gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\s*:\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, ''],
        [/,\s*,/g, ','],
        [/,\s*\./g, '.'],
    ];

    fixes.forEach(([pattern, replacement]) => {
        out = out.replace(pattern, replacement);
    });

    out = out
        .replace(/\.\.{2,}/g, '. ')
        .replace(/\.\s*\./g, '. ')
        .replace(/:\s*\./g, '.')
        .replace(/\s{2,}/g, ' ')
        .replace(/([.!?]\s+)([a-záéíóúñ])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    return out;
}

function _normalizeTemplateSpecificOutput(markdown, templateKey, sourceText) {
    let out = String(markdown || '');
    if (!out) return out;

    if (templateKey === 'gonioscopia') {
        out = _normalizeGonioscopyBilateralAO(out, sourceText);
        out = _normalizeGonioscopyNarrativeQuality(out);
    }

    return out;
}

function _stripPromptLeakSections(markdown) {
    let out = String(markdown || '');
    if (!out) return out;

    // Elimina secciones de metainstrucciones que nunca deben formar parte del informe final.
    out = out.replace(/(?:^|\n)#{2,3}\s*(?:reglas\s+de\s+interpretaci[oó]n\s+obligatorias|reglas\s+internas|instrucciones\s+internas|notas\s+del\s+sistema)\s*\n[\s\S]*?(?=\n#{1,3}\s+|\s*$)/gi, '\n');

    // Variante sin heading markdown, por si el modelo lo deja en texto plano.
    out = out.replace(/(?:^|\n)\s*reglas\s+de\s+interpretaci[oó]n\s+obligatorias\s*\n[\s\S]*?(?=\n#{1,3}\s+|\n[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{6,}\n|\s*$)/gi, '\n');

    return out.trim();
}

function _sanitizeGrammarArtifacts(text) {
    let out = String(text || '');
    if (!out) return out;

    // Artefactos recurrentes reportados por usuarios en salida clínica.
    out = out
        .replace(/\bcon\s+un\s+con\b/gi, 'con')
        .replace(/\bcon\s+con\b/gi, 'con')
        // Eliminar frases incompletas o inventadas en gonioscopía (no agregar texto no dictado)
        .replace(/\bel\s+grado\s+de\s+Shaffer\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, '')
        .replace(/\bla\s+pigmentaci[oó]n\s+trabecular\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, '')
        .replace(/\bla\s+configuraci[oó]n\s+del\s+iris\s+es\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, '')
        .replace(/\bla\s+gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s*(?:es|:)\s*(?:\.\.+|…|[.,;:]+)?\s*(?:o\s+no\s+se\s+(?:especific[oó]|inform[oó]))?\s*,?/gi, '')
        .replace(/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+realiz[oó]\s+o\s+no\s+se\s+(?:especific[oó]|inform[oó])\.?,?/gi, '')
        .replace(/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+inform[oó]\.?,?/gi, '')
        .replace(/\bGonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\s*:\s*(?:\.\.+|…|[.,;:]+)?\s*,?/gi, '')
        .replace(/\bNo\s+se\s+realiz(?:o|ó|aron)\s+gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\.?/gi, '')
        // Eliminar coletillas no objetivas en conclusión sobre "faltan detalles"
        .replace(/,?\s*aunque\s+faltan\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*si\s+bien\s+faltan\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*excepto\s+la\s+falta\s+de\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*excepto\s+por\s+la\s+falta\s+de\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*con\s+excepci[oó]n\s+de\s+la\s+falta\s+de\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*salvo\s+la\s+falta\s+de\s+detalles[^.]*\.?/gi, '')
        .replace(/,?\s*(?:faltan|falta)\s+(?:detalles|datos|informaci[oó]n)[^.]*\.?/gi, '')
        .replace(/,?\s*(?:falt[ao]n?|ausencia)\s+de\s+(?:detalles|datos|informaci[oó]n)[^.]*\.?/gi, '')
        .replace(/,?\s*(?:no\s+se\s+(?:detall[oó]|especific[oó]|inform[oó]))[^.]*\.?/gi, '')
        // Eliminar textos de placeholder genéricos
        .replace(/\bInformaci[oó]n\s+sobre\s+el\s+sistema\s+Spaeth\.?/gi, '')
        .replace(/\bDescripci[oó]n\s+de\s+la\s+configuraci[oó]n[^.]*\.?/gi, '')
        // Eliminar texto condicional en headings
        .replace(/(##\s*[^\n]*)\s*\(\s*(?:si\s+est[aá]\s+reportado|si\s+aplica|si\s+corresponde|si\s+se\s+report[oó])\s*\)/gi, '$1')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*\./g, '.')
        .replace(/\.\.{2,}/g, '. ')
        .replace(/\.\s*\./g, '. ')
        .replace(/…+/g, '. ')
        .replace(/:\s*\./g, '.')
        // No colapsar saltos de línea para preservar estructura markdown.
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/([.!?]\s+)([a-záéíóúñ])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    return out.trim();
}

function _normalizeMarkdownHeadingLayout(text) {
    let out = String(text || '');
    if (!out) return out;

    // Si un heading quedó incrustado en la misma línea, lo separa en bloque markdown.
    out = out.replace(/([^\n])\s+(#{1,3}\s*[A-ZÁÉÍÓÚÑ].*)/g, '$1\n\n$2');
    // Evita spacing excesivo entre bloques sin perder estructura.
    out = out.replace(/\n{3,}/g, '\n\n');

    return out;
}

function _keepSingleReportTitle(text) {
    const out = String(text || '');
    if (!out) return out;

    const lines = out.split('\n');
    let seenPrimaryTitle = false;
    const filtered = [];

    for (const line of lines) {
        const isPrimary = /^#\s+INFORME\s+DE\b/i.test(line.trim());
        if (isPrimary) {
            if (seenPrimaryTitle) continue;
            seenPrimaryTitle = true;
        }
        filtered.push(line);
    }

    return filtered.join('\n').trim();
}

function _postProcessStructuredMarkdown(md) {
    let out = String(md || '');
    if (!out) return out;

    out = _stripPromptLeakSections(out);
    out = _normalizeMarkdownHeadingLayout(out);

    // Correcciones ortográficas médicas frecuentes (fallback defensivo post-LLM).
    const replacements = [
        // Tildes anatómicas incorrectas
        [/\bORÓFARINGE\b/g, 'OROFARINGE'],
        [/\bOrófaringe\b/g, 'Orofaringe'],
        [/\borófaringe\b/g, 'orofaringe'],
        [/\bHIPÓFARINGE\b/g, 'HIPOFARINGE'],
        [/\bNASÓFARINGE\b/g, 'NASOFARINGE'],
        // Errores ASR comunes — anglicismos y fonéticos
        [/\blaryngoscopy\b/gi, 'laringoscopía'],
        [/\bbronchoscopy\b/gi, 'broncoscopía'],
        [/\bendoscopy\b/gi, 'endoscopía'],
        [/\bcolonoscopy\b/gi, 'colonoscopía'],
        [/\bechocardiography\b/gi, 'ecocardiografía'],
        [/\bultrasonography\b/gi, 'ecografía'],
        [/\btomography\b/gi, 'tomografía'],
        // Palabras partidas por ASR
        [/\bo\s+dinofagia\b/gi, 'odinofagia'],
        [/\bdes\s+fagía?\b/gi, 'disfagia'],
        [/\bdis\s+fagía?\b/gi, 'disfagia'],
        [/\bdis\s+fonía?\b/gi, 'disfonía'],
        [/\bdis\s+neá?\b/gi, 'disnea'],
        [/\br\.\s*e\.?\b/gi, 'R. E.'],
        [/\btaqui\s+cardía?\b/gi, 'taquicardia'],
        [/\bbradi\s+cardía?\b/gi, 'bradicardia'],
        [/\bhepato\s+megalia\b/gi, 'hepatomegalia'],
        [/\bespleno\s+megalia\b/gi, 'esplenomegalia'],
        // Fonemas confundidos frecuentes
        [/\bbujales\b/gi, 'bucales'],
        [/\bfaringue\b/gi, 'faringe'],
        [/\blaringue\b/gi, 'laringe'],
        [/\besofaguo\b/gi, 'esófago'],
        [/\bepiglotis\b/g, 'epiglotis'],
        // Marcadores inconsistentes del LLM — unificar a [No especificado]
        [/\bNo se evalú?o\b/gi, '[No especificado]'],
        [/\bNo fue evalúa?do\b/gi, '[No especificado]'],
        [/\bNo evalúa?do\b/gi, '[No especificado]'],
        [/\bSin datos\b/gi, '[No especificado]'],
        [/\bNo se report[aó]\b/gi, '[No especificado]'],
        [/\bNo mencionado\b/gi, '[No especificado]']
    ];

    replacements.forEach(([pattern, replacement]) => {
        out = out.replace(pattern, replacement);
    });

    // Limpieza discursiva: quitar muletillas al inicio de línea y de oración (todos los idiomas).
    const muletillas = [
        // Español
        'Generalmente', 'En general', 'Habitualmente', 'Normalmente',
        'Por lo general', 'De manera general', 'Típicamente',
        'Usualmente', 'Comúnmente', 'Frecuentemente',
        'Básicamente', 'Esencialmente', 'Fundamentalmente',
        'Cabe destacar que', 'Cabe mencionar que', 'Cabe señalar que',
        'Es importante mencionar que', 'Es importante señalar que',
        'Es importante destacar que', 'Es de notar que',
        'Vale la pena mencionar que', 'Se observa que',
        'Como se mencionó anteriormente', 'Como se indicó',
        'En términos generales', 'De forma general',
        // Inglés
        'Generally', 'Usually', 'Typically', 'Commonly', 'In general',
        'Overall', 'Normally', 'Basically', 'Essentially', 'Fundamentally',
        'It is worth noting that', 'It should be noted that',
        'It is important to note that', 'It is noteworthy that',
        'As previously mentioned', 'As noted above',
        // Portugués
        'Geralmente', 'Normalmente', 'Tipicamente', 'Comumente',
        'Em geral', 'No geral', 'Basicamente',
        // Francés
        'G\u00e9n\u00e9ralement', 'Habituellement', 'Typiquement', 'En g\u00e9n\u00e9ral',
        'Normalement', 'Fondamentalement'
    ].join('|');
    const rxMulStart = new RegExp(`(^|\\n)\\s*(?:\\*\\*)?\\s*(?:${muletillas})\\s*,?\\s+`, 'gim');
    const rxMulMid   = new RegExp(`([.!?]\\s+)(?:\\*\\*)?\\s*(?:${muletillas})\\s*,?\\s+`, 'gim');
    out = out
        .replace(rxMulStart, '$1')
        .replace(rxMulMid, '$1');

    // Corrige artefactos de mayúsculas en artículos al inicio de oración (p.ej. "LA papila").
    out = out.replace(/(^|[\n.!?]\s+)(LA|EL|LOS|LAS)\s+([a-záéíóúñ])/g, (m, p1, art, p3) => {
        const articleMap = { LA: 'La', EL: 'El', LOS: 'Los', LAS: 'Las' };
        return `${p1}${articleMap[art] || art} ${p3}`;
    });

    // NO eliminar secciones vacías: el usuario decide qué hacer con campos sin contenido.

    out = _sanitizeGrammarArtifacts(out);
    out = _normalizeMarkdownHeadingLayout(out);
    out = _keepSingleReportTitle(out);

    return out.trim();
}

// ── 4-attempt retry wrapper con fallback inteligente de modelos y backup keys ───
async function structureWithRetry(text, templateKey, options = {}) {
    const strategy = [
        { model: GROQ_MODELS[0], temperature: 0.1  },
        { model: GROQ_MODELS[0], temperature: 0.15 },
        { model: GROQ_MODELS[1], temperature: 0.1  },
        { model: GROQ_MODELS[2], temperature: 0.1  }   // fast fallback
    ];
    let lastError = null;
    let idx = 0;

    while (idx < strategy.length) {
        const { model, temperature } = strategy[idx];
        try {
            if (idx > 0 && typeof showToast === 'function') {
                if (_isStructurerAdmin()) {
                    const isModelChange = model !== strategy[idx - 1].model;
                    const shortName = model.split('-').slice(0, 3).join('-');
                    const label = isModelChange ? ` — modelo: ${shortName}` : '';
                    showToast(`⏳ Reintentando${label} (${idx + 1}/${strategy.length})...`, 'info');
                } else {
                    showToast('⏳ Reintentando estructuración...', 'info');
                }
            }
            const result = await structureTranscription(text, templateKey, temperature, model, options);
            if (result.length < 80 && text.length > 300) {
                throw new Error('Respuesta del LLM muy corta o incompleta');
            }
            // RB-5: Advertir si se usó el modelo rápido 8b como fallback
            if (model === GROQ_MODELS[2] && idx > 0 && typeof showToast === 'function') {
                if (_isStructurerAdmin()) {
                    showToast('⚠️ Se usó el modelo rápido (8b). Verificá el resultado — puede ser menos preciso.', 'warning', 6000);
                }
            }
            return result;
        } catch (err) {
            lastError = err;
            const { type, wait, switchModel } = classifyStructError(err);
            console.warn(`Structure [${idx + 1}/${strategy.length}] [${model}] → ${type}:`, err.message);

            if (type === 'auth') {
                // API Key principal inválida → intentar con claves de respaldo antes de rendirse
                const backupKeys = [
                    localStorage.getItem('groq_api_key_b1'),
                    localStorage.getItem('groq_api_key_b2')
                ].filter(k => k && k.startsWith('gsk_'));

                for (let bi = 0; bi < backupKeys.length; bi++) {
                    const prevKey = window.GROQ_API_KEY;
                    window.GROQ_API_KEY = backupKeys[bi];
                    if (typeof showToast === 'function' && _isStructurerAdmin()) showToast(`🔑 Intentando con Backup Key ${bi + 1}...`, 'info');
                    try {
                        const resultBackup = await structureTranscription(text, templateKey, temperature, model, options);
                        if (resultBackup.length < 80 && text.length > 300) throw new Error('Respuesta muy corta');
                        // Backup funcionó — persistir como key activa temporalmente
                        console.info(`[Structurer] Backup Key ${bi + 1} OK`);
                        return resultBackup;
                    } catch (backupErr) {
                        window.GROQ_API_KEY = prevKey;
                        console.warn(`[Structurer] Backup Key ${bi + 1} falló:`, backupErr.message);
                    }
                }
                // Todos los backups fallaron
                throw err;
            }

            if (type === 'network') {
                // Sin internet — inútil reintentar, ir directo a cola de pendientes
                break;
            }

            if (wait > 0) await new Promise(r => setTimeout(r, wait));

            if (switchModel) {
                // Buscar el primer índice con modelo diferente
                let found = false;
                for (let i = idx + 1; i < strategy.length; i++) {
                    if (strategy[i].model !== model) { idx = i; found = true; break; }
                }
                if (!found) break;
            } else {
                idx++;
            }
        }
    }

    // Todos los intentos fallaron → guardar en cola de pendientes
    try { addToStructurePendingQueue(text, templateKey); } catch (_) {}
    const finalErr = new Error(lastError?.message || 'No se pudo estructurar');
    finalErr.savedToPending = true;
    throw finalErr;
}

// ── Cola de textos pendientes de estructuración ──────────────────────────────
const STRUCT_QUEUE_KEY = 'struct_pending_queue';

function _getStructQueue() {
    try { return JSON.parse(localStorage.getItem(STRUCT_QUEUE_KEY) || '[]'); } catch(_) { return []; }
}

function _saveStructQueue(arr) {
    // Escribe a IDB (fire-and-forget) y también a localStorage (fallback síncrono)
    if (typeof appDB !== 'undefined') appDB.set(STRUCT_QUEUE_KEY, arr);
    try { localStorage.setItem(STRUCT_QUEUE_KEY, JSON.stringify(arr)); } catch(_) {}
}

function addToStructurePendingQueue(text, templateKey) {
    const queue = getStructurePendingQueue();
    const entry = {
        id: Date.now(),
        text,
        templateKey: templateKey || 'generico',
        savedAt: new Date().toLocaleString('es-AR'),
        preview: text.slice(0, 140) + (text.length > 140 ? '...' : '')
    };
    queue.unshift(entry);
    if (queue.length > 10) queue.pop(); // máximo 10
    _saveStructQueue(queue);
    updatePendingQueueBadge();
    return entry;
}

function getStructurePendingQueue() {
    try {
        const queue = _getStructQueue();
        // Auto-expirar items > 7 días
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        return queue.filter(e => Date.now() - e.id < SEVEN_DAYS);
    }
    catch (_) { return []; }
}

function removeFromStructurePendingQueue(id) {
    const filtered = getStructurePendingQueue().filter(e => e.id !== Number(id));
    _saveStructQueue(filtered);
    updatePendingQueueBadge();
}

function updatePendingQueueBadge() {
    const count = getStructurePendingQueue().length;
    const badge = document.getElementById('pendingQueueCount');
    const btn   = document.getElementById('btnPendingQueue');
    if (badge) badge.textContent = count;
    if (btn)   btn.style.display = count > 0 ? '' : 'none';
}

function renderPendingQueueModal() {
    const queue  = getStructurePendingQueue();
    const listEl = document.getElementById('pendingQueueList');
    if (!listEl) return;
    if (queue.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">No hay textos pendientes.</p>';
        return;
    }
    listEl.innerHTML = queue.map(entry => `
        <div class="pending-item" data-id="${entry.id}">
            <div class="pending-item-meta">
                <span class="pending-item-date">📅 ${entry.savedAt}</span>
                <span class="pending-item-tmpl">Plantilla: ${entry.templateKey}</span>
            </div>
            <p class="pending-item-preview">${entry.preview.replace(/</g,'&lt;')}</p>
            <div class="pending-item-actions">
                <button class="btn-primary btn-sm" onclick="processPendingItem(${entry.id})">✨ Estructurar ahora</button>
                <button class="btn-secondary btn-sm" onclick="deletePendingItem(${entry.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.processPendingItem = async function(id) {
    const queue = getStructurePendingQueue();
    const entry = queue.find(e => e.id === id);
    if (!entry) return;
    const editor = document.getElementById('editor');
    if (editor) { editor.innerHTML = entry.text; editor.scrollTop = 0; }
    // Cerrar modal de pendientes
    document.getElementById('pendingQueueModal').style.display = 'none';
    // Ejecutar estructurado
    if (editor) {
        try {
            if (typeof showToast === 'function') showToast('⏳ Procesando texto pendiente...', 'info');
            const rawMarkdown = await structureWithRetry(entry.text, entry.templateKey);
            const { body } = parseAIResponse(rawMarkdown);
            editor.innerHTML = body;
            editor.scrollTop = 0;
            if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Estructurado (pendiente)', 'structuring');
            removeFromStructurePendingQueue(id);
            if (typeof showToast === 'function') showToast('✅ Texto pendiente estructurado', 'success');
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof triggerPatientDataCheck === 'function') triggerPatientDataCheck(entry.text);
        } catch (err) {
            _showStructurerFailureToast({ savedToPending: true, message: err?.message || '' });
        }
    }
};

window.deletePendingItem = async function(id) {
    const ok = await window.showCustomConfirm('🗑️ Eliminar pendiente', '¿Eliminar este texto pendiente?');
    if (!ok) return;
    removeFromStructurePendingQueue(id);
    renderPendingQueueModal();
};

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
    const savedConfig = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
    delete savedConfig.patientName;
    delete savedConfig.patientDni;
    delete savedConfig.patientAge;
    delete savedConfig.patientSex;
    delete savedConfig.patientWeight;
    delete savedConfig.patientHeight;
    delete savedConfig.patientInsurance;
    delete savedConfig.patientAffiliateNum;
    delete savedConfig.referringDoctor;
    delete savedConfig.studyReason;
    delete savedConfig.studyTime;
    delete savedConfig.studyType;
    savedConfig.studyDate = new Date().toISOString().split('T')[0];
    window._pdfConfigCache = savedConfig;
    if (typeof appDB !== 'undefined') appDB.set('pdf_config', savedConfig);
    else localStorage.setItem('pdf_config', JSON.stringify(savedConfig));

    // Intentar extraer datos del paciente desde el audio transcripto
    const extracted = typeof extractPatientDataFromText === 'function'
        ? extractPatientDataFromText(rawText) : {};

    const hasPatientData = !!(extracted.name || extracted.dni || extracted.age || extracted.sex || extracted.weight || extracted.height || extracted.insurance || extracted.affiliateNum);
    const hasStudyData = !!(extracted.studyDate || extracted.studyTime || extracted.referringDoctor || extracted.studyReason || extracted.studyType);
    if (extracted.studyDate) savedConfig.studyDate = extracted.studyDate;
    if (extracted.studyTime) savedConfig.studyTime = extracted.studyTime;
    if (extracted.referringDoctor) savedConfig.referringDoctor = extracted.referringDoctor;
    if (extracted.studyReason) savedConfig.studyReason = extracted.studyReason;
    if (extracted.studyType) savedConfig.studyType = extracted.studyType;
    if (hasPatientData || hasStudyData) {
        // Encontrado en el audio/texto — guardar y notificar
        if (extracted.name) savedConfig.patientName = extracted.name;
        if (extracted.dni) savedConfig.patientDni = extracted.dni;
        if (extracted.age) savedConfig.patientAge = extracted.age;
        if (extracted.sex) savedConfig.patientSex = extracted.sex;
        if (extracted.weight) savedConfig.patientWeight = extracted.weight;
        if (extracted.height) savedConfig.patientHeight = extracted.height;
        if (extracted.insurance) savedConfig.patientInsurance = extracted.insurance;
        if (extracted.affiliateNum) savedConfig.patientAffiliateNum = extracted.affiliateNum;
        window._pdfConfigCache = savedConfig;
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', savedConfig);
        else localStorage.setItem('pdf_config', JSON.stringify(savedConfig));
        if (typeof showToast === 'function') {
            if (extracted.name) showToast(`👤 Paciente detectado: ${extracted.name}`, 'success');
            else if (hasStudyData) showToast('📝 Se detectaron datos del estudio', 'success');
        }
        // Quitar placeholder si existía e insertar header con datos extraídos
        removePatientPlaceholder();
        if (typeof window._refreshPatientHeader === 'function') window._refreshPatientHeader();
    } else {
        // Sin datos en el audio → insertar placeholder clickeable (NO abrir modal)
        insertPatientPlaceholder();
    }
}

// ---- Placeholder clickeable para completar datos del paciente ----
function insertPatientPlaceholder() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    // No duplicar si ya existe, ni insertar si ya hay datos del paciente
    if (editor.querySelector('.patient-placeholder-banner')) return;
    if (editor.querySelector('.patient-data-header')) return;
    const banner = document.createElement('div');
    banner.className = 'patient-placeholder-banner';
    banner.setAttribute('contenteditable', 'false');
    banner.innerHTML = '👤 <span>Completar datos del paciente y estudio</span> — Click aquí';
    banner.addEventListener('click', () => {
        if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal();
    });
    editor.insertBefore(banner, editor.firstChild);
}

function removePatientPlaceholder() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    const banner = editor.querySelector('.patient-placeholder-banner');
    if (banner) banner.remove();
}
window.removePatientPlaceholder = removePatientPlaceholder;

// ---- Medical terminology checker — abre el modal del diccionario ----
window.checkMedicalTerminology = function() {
    if (typeof window.openMedDictModal === 'function') {
        window.openMedDictModal();
    }
}

// ============ AI BUTTON HANDLERS ============

// ── Función reutilizable de auto-estructuración ──────────────────
// Usada por btnStructureAI (click manual) y por el auto-pipeline (post-transcripción)
window.autoStructure = async function (options = {}) {
    // Mutex: evitar invocaciones concurrentes (misma tab)
    if (window._structuring) {
        if (typeof showToast === 'function') showToast('⏳ Ya hay un estructurado en curso', 'warning');
        return false;
    }

    // B5: Mutex cross-tab con Web Locks API
    if (navigator.locks) {
        try {
            return await navigator.locks.request('transcriptor_structuring', { ifAvailable: true }, async function(lock) {
                if (!lock) {
                    if (typeof showToast === 'function') showToast('⏳ Ya hay un estructurado en curso en otra pestaña', 'warning');
                    return false;
                }
                return await _doAutoStructure(options);
            });
        } catch(_) {
            return await _doAutoStructure(options);
        }
    }
    return await _doAutoStructure(options);
};

function _setStructuringVisualState(active) {
    const editor = document.getElementById('editor');
    if (editor) {
        editor.classList.toggle('structuring-pending', !!active);
        editor.setAttribute('contenteditable', active ? 'false' : 'true');
    }
    if (document.body) document.body.classList.toggle('structuring-active', !!active);
}

async function _doAutoStructure(options) {
    if (window._structuring) return false;
    window._structuring = true;

    const editor = document.getElementById('editor');
    if (!editor || !editor.innerText.trim()) {
        if (typeof showToast === 'function') showToast('No hay texto para estructurar', 'error');
        window._structuring = false;
        return false;
    }
    // Obtener texto limpio sin elementos UI (placeholder, header paciente, botón inline)
    const _clone = editor.cloneNode(true);
    _clone.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
    const rawText = _clone.innerText;
    const structInput = _prepareStructuringInput(rawText);
    const savedHTML = editor.innerHTML;
    if (!checkStructurePrerequisites()) {
        window._structuring = false;
        return false;
    }

    // Regla: extraer y poblar datos de paciente antes de estructurar.
    triggerPatientDataCheck(rawText);

    window._lastRawTranscription = rawText;

    const aiProgressBar = document.getElementById('aiProgressBar');
    const showProgress = () => { if (aiProgressBar) aiProgressBar.style.display = 'block'; };
    const hideProgress = () => { if (aiProgressBar) aiProgressBar.style.display = 'none'; };

    const btnStructureAIEl = document.getElementById('btnStructureAI');
    let oldHTML = '';
    if (btnStructureAIEl) {
        oldHTML = btnStructureAIEl.innerHTML;
        btnStructureAIEl.disabled = true;
        btnStructureAIEl.innerHTML = '⏳ IA...';
    }
    _setStructuringVisualState(true);
    if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURING');
    showProgress();

    try {
        let currentTemplate = typeof selectedTemplate !== 'undefined' ? selectedTemplate : 'generico';
        let isGeneralNonMedicalFallback = false;
        if (!currentTemplate || currentTemplate === 'generico') {
            const detected = autoDetectTemplateKey(structInput);
            if (detected !== 'generico') {
                // Siempre usar la plantilla detectada en el flujo IA (sin toast/prompt).
                currentTemplate = detected;
            } else {
                currentTemplate = 'generico';
                isGeneralNonMedicalFallback = !_isLikelyMedicalText(structInput);
            }
        }
        const rawMarkdown = await structureWithRetry(structInput, currentTemplate, {
            forceGeneralNoConclusion: isGeneralNonMedicalFallback
        });
        const { body, note } = parseAIResponse(rawMarkdown);
        editor.innerHTML = body;
        editor.scrollTop = 0;
        _setStructuringVisualState(false);
        window._lastStructuredHTML = body;
        if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Estructurado con IA', 'structuring');
        // Re-insertar header de datos del paciente (fue eliminado al reemplazar el innerHTML)
        if (typeof window._refreshPatientHeader === 'function') window._refreshPatientHeader();
        showAINote(null, null);
        const btnR = document.getElementById('btnRestoreOriginal');
        if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.innerHTML = '↩ Original'; btnR.classList.remove('toggle-active'); }
        const btnM = document.getElementById('btnMedicalCheck');
        if (btnM) btnM.style.display = '';
        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
        if (typeof showToast === 'function') {
            if (isGeneralNonMedicalFallback) {
                showToast(_getNonMedicalWarning(), 'warning', 5000);
            } else {
                showToast('✅ Texto estructurado con IA', 'success');
            }
        }
        // Notificación desktop si la ventana no está enfocada
        if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Transcriptor Pro', {
                body: '✅ Informe estructurado y listo',
                icon: 'assets/icon-192.png'
            });
        }
        return true;
    } catch (error) {
        editor.innerHTML = savedHTML;
        _setStructuringVisualState(false);
        _showStructurerFailureToast(error);
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
        return false;
    } finally {
        window._structuring = false;
        if (btnStructureAIEl) {
            btnStructureAIEl.disabled = false;
            btnStructureAIEl.innerHTML = oldHTML;
        }
        _setStructuringVisualState(false);
        hideProgress();
    }
}

window.initStructurer = function () {
    const btnStructureAIEl = document.getElementById('btnStructureAI');

    if (btnStructureAIEl) {
        btnStructureAIEl.addEventListener('click', () => {
            window.autoStructure({ silent: false });
        });
    }

    const btnApplyStructure = document.getElementById('btnApplyStructure');
    if (btnApplyStructure) {
        btnApplyStructure.addEventListener('click', async () => {
            const editor = document.getElementById('editor');
            if (!editor || !editor.innerText.trim()) return showToast('No hay texto para estructurar', 'error');

            // Obtener texto limpio sin elementos UI
            const _clone2 = editor.cloneNode(true);
            _clone2.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
            const rawText = _clone2.innerText;
            const structInput = _prepareStructuringInput(rawText);
            const savedHTML = editor.innerHTML;
            window._lastRawTranscription = rawText;
            if (!checkStructurePrerequisites()) return;
            triggerPatientDataCheck(rawText);
            const oldText = btnApplyStructure.textContent;
            btnApplyStructure.disabled = true;
            btnApplyStructure.textContent = "✨ Estructurando...";
            _setStructuringVisualState(true);
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURING');

            try {
                const templateSelect = document.getElementById('templateSelect');
                const templateKey = templateSelect ? templateSelect.value : 'generico';
                const isGeneralNonMedicalFallback = templateKey === 'generico' && !_isLikelyMedicalText(structInput);
                const rawMarkdown = await structureWithRetry(structInput, templateKey, {
                    forceGeneralNoConclusion: isGeneralNonMedicalFallback
                });
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                editor.scrollTop = 0;
                _setStructuringVisualState(false);
                window._lastStructuredHTML = body;
                if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Re-estructurado', 'structuring');
                // Re-insertar header de datos del paciente
                if (typeof window._refreshPatientHeader === 'function') window._refreshPatientHeader();
                // No mostrar el panel de plantilla/nota — solo el informe
                showAINote(null, null);
                const btnR2 = document.getElementById('btnRestoreOriginal');
                if (btnR2) { btnR2.style.display = ''; btnR2._showingOriginal = false; btnR2.innerHTML = '↩ Original'; btnR2.classList.remove('toggle-active'); }
                const btnM2 = document.getElementById('btnMedicalCheck');
                if (btnM2) btnM2.style.display = '';
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof showToast === 'function') {
                    if (isGeneralNonMedicalFallback) {
                        showToast(_getNonMedicalWarning(), 'warning', 5000);
                    } else {
                        showToast('Informe estructurado ✓', 'success');
                    }
                }

                const wizardTemplateCard = document.getElementById('wizardTemplateCard');
                if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            } catch (e) {
                editor.innerHTML = savedHTML;
                _setStructuringVisualState(false);
                _showStructurerFailureToast(e);
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            } finally {
                _setStructuringVisualState(false);
                btnApplyStructure.disabled = false;
                btnApplyStructure.textContent = oldText;
            }
        });
    }

    // Inicializar badge de cola pendiente
    updatePendingQueueBadge();

    // Wiring del modal de pendientes
    const btnPQ = document.getElementById('btnPendingQueue');
    if (btnPQ) {
        btnPQ.addEventListener('click', () => {
            renderPendingQueueModal();
            const modal = document.getElementById('pendingQueueModal');
            if (modal) modal.style.display = 'flex';
        });
    }
    const closePQBtn = document.getElementById('closePendingQueueBtn');
    if (closePQBtn) {
        closePQBtn.addEventListener('click', () => {
            const modal = document.getElementById('pendingQueueModal');
            if (modal) modal.style.display = 'none';
        });
    }
}

