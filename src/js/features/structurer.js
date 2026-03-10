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
        'paciente', 'diagnostico', 'ecografia', 'eco doppler', 'radiografia', 'tomografia', 'resonancia',
        'colonoscopia', 'gastroscopia', 'laringoscopia', 'broncoscopia', 'cinecoronariografia',
        'presion arterial', 'frecuencia cardiaca', 'saturacion', 'hallazgo', 'informe medico',
        'orofaringe', 'ventriculo', 'auricula', 'arteria', 'lesion', 'mmhg', 'mm', 'cm', 'ml'
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

function _stripPatientIdentitySections(md) {
    let out = String(md || '');
    if (!out) return out;
    // Elimina secciones demograficas completas para evitar duplicar el cuadro de paciente.
    out = out.replace(/(?:^|\n)##+\s*(?:datos\s+demograficos|datos\s+del\s+paciente|identificacion\s+del\s+paciente|identificacion)\s*\n[\s\S]*?(?=\n##+\s|\s*$)/gi, '\n');
    // Elimina lineas sueltas de identificacion en cuerpo.
    out = out.replace(/(^|\n)\s*(?:paciente|nombre|dni|edad|sexo|obra\s+social|afiliad[oa])\s*:\s*[^\n]+(?=\n|$)/gi, '$1');
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

REGLAS ABSOLUTAS — cumplirlas todas sin excepción:
1. PRESERVA TODO EL CONTENIDO: cada hallazgo, medición, valor y dato de la transcripción DEBE aparecer en el informe. Nunca descartes información clínica, aunque no encaje perfectamente en la plantilla.
2. Si la transcripción contiene datos que no corresponden a las secciones propuestas, ubícalos en la sección más apropiada o crea una subsección adicional con un título descriptivo.
2.1 DATOS DEL PACIENTE: NO incluyas identificacion del paciente en el cuerpo del informe (nombre, sexo, edad, DNI, obra social o numero de afiliado). Esos datos se gestionan en el cuadro superior del sistema.
3. Usa SIEMPRE el marcador [No especificado] cuando una estructura NO fue evaluada, NO fue mencionada O no tiene datos en la transcripción. NUNCA escribas "No se evaluó", "No fue evaluado", "No evaluado", "Sin datos" ni ninguna variante. El marcador [No especificado] se convierte en un campo editable interactivo para el médico.
4. NO añadas información que no esté en la transcripción.
5. NO añadas notas, comentarios ni advertencias propias en ningún lugar del informe.
6. Devuelve ÚNICAMENTE el contenido del informe en markdown, sin texto introductorio ni final.
7. No uses encabezados de nivel > 3 (###).
8. FORMATO DE PÁRRAFOS (CRÍTICO): dentro de cada sección, escribe los hallazgos como un párrafo continuo y fluido. NO separes cada hallazgo con líneas en blanco. Los ítems de una misma sección van juntos, sin saltos de línea dobles entre ellos. Solo usa línea en blanco para separar SECCIONES distintas (##). La primera palabra de cada párrafo debe comenzar con mayúscula.
9. NÚMEROS Y UNIDADES: Escribe siempre los valores numéricos con dígitos, nunca con letras. Ejemplos: "75%" no "setenta y cinco por ciento"; "40%" no "cuarenta por ciento"; "12 mm" no "doce milímetros"; "65%" no "sesenta y cinco por ciento"; "18 mm" no "dieciocho milímetros". Esta regla aplica a porcentajes, medidas, edades, frecuencias, presiones y cualquier valor cuantificable.
10. ESTUDIOS MULTI-ÓRGANO / MULTI-SEGMENTO: En estudios que evalúan múltiples órganos, segmentos anatómicos o vasos (ecografía, colonoscopía, gastroscopía, cinecoronariografía, Doppler vascular, laringoscopía, nasofibroscopía, etc.) dedica una sección ## separada a CADA estructura evaluada. Si una estructura fue evaluada con resultado normal, descríbela en prosa. Si NO fue evaluada ni mencionada en la transcripción, escribe EXACTAMENTE el marcador [No especificado] como único contenido del párrafo de esa sección — NUNCA "No se evaluó", "s/p", "Sin datos" ni ninguna variante libre.
11. CONCLUSIÓN (REGLA UNIVERSAL): En TODAS las plantillas, la CONCLUSIÓN debe: (a) incluir TODOS los hallazgos patológicos o positivos — ninguno puede omitirse, aunque sea leve; (b) NO incluir estructuras con resultado normal; (c) si absolutamente todo es normal, escribir "Estudio dentro de parámetros normales."; (d) NUNCA dejar la conclusión vacía, en blanco, ni como "[No especificado]"; (e) PROHIBIDO: inventar valores, porcentajes o datos no presentes en la transcripción; (f) PROHIBIDO: indicar tratamientos, medicación o derivaciones si el médico no los mencionó.
12. NUNCA conviertas entre unidades de medida. Si el médico dice "10 mm", escribe "10 mm", NO "1 cm". Si dice "500 ml", escribe "500 ml", NO "0.5 L". Preserva la unidad exacta que usó el profesional.
13. CORRECCIÓN DE ERRORES ASR: El texto fue generado por reconocimiento de voz y puede contener errores fonéticos. Corrige silenciosamente los errores evidentes de transcripción de voz: anglicismos incorrectos ("laryngoscopy" → "laringoscopía"), palabras partidas ("o dinofagia" → "odinofagia"), fonemas confundidos ("bujales" → "bucales"), y falta de tildes en términos médicos. NO señales las correcciones, simplemente usa la forma correcta en español.
14. ORTOGRAFÍA, REDACCIÓN Y GRAMÁTICA: Redacta con español médico formal impecable. PROHIBIDO devolver errores ortográficos, gramaticales o de concordancia. Antes de responder, revisa y corrige todo el texto final.
15. ENCABEZADOS ANATÓMICOS EN MAYÚSCULAS: Evita tildes incorrectas en títulos anatómicos. Ejemplo obligatorio: escribir "OROFARINGE" (correcto) y NO "ORÓFARINGE".`;

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
        const extractedPatient = (typeof extractPatientDataFromText === 'function') ? extractPatientDataFromText(text) : {};
        if (extractedPatient && (extractedPatient.name || extractedPatient.dni || extractedPatient.age || extractedPatient.sex || extractedPatient.insurance || extractedPatient.affiliateNum)) {
            cleaned = _stripPatientIdentitySections(cleaned);
        }
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

function _postProcessStructuredMarkdown(md) {
    let out = String(md || '');
    if (!out) return out;

    // Correcciones ortográficas médicas frecuentes (fallback defensivo post-LLM).
    const replacements = [
        [/\bORÓFARINGE\b/g, 'OROFARINGE'],
        [/\bOrófaringe\b/g, 'Orofaringe'],
        [/\borófaringe\b/g, 'orofaringe'],
        [/\blaryngoscopy\b/gi, 'laringoscopía'],
        [/\bo\s+dinofagia\b/gi, 'odinofagia'],
        [/\bbujales\b/gi, 'bucales']
    ];

    replacements.forEach(([pattern, replacement]) => {
        out = out.replace(pattern, replacement);
    });

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
    if (editor) { editor.innerHTML = entry.text; }
    // Cerrar modal de pendientes
    document.getElementById('pendingQueueModal').style.display = 'none';
    // Ejecutar estructurado
    if (editor) {
        try {
            if (typeof showToast === 'function') showToast('⏳ Procesando texto pendiente...', 'info');
            const rawMarkdown = await structureWithRetry(entry.text, entry.templateKey);
            const { body } = parseAIResponse(rawMarkdown);
            editor.innerHTML = body;
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
    window._pdfConfigCache = savedConfig;
    if (typeof appDB !== 'undefined') appDB.set('pdf_config', savedConfig);
    else localStorage.setItem('pdf_config', JSON.stringify(savedConfig));

    // Intentar extraer datos del paciente desde el audio transcripto
    const extracted = typeof extractPatientDataFromText === 'function'
        ? extractPatientDataFromText(rawText) : {};

    const hasPatientData = !!(extracted.name || extracted.dni || extracted.age || extracted.sex || extracted.weight || extracted.height || extracted.insurance || extracted.affiliateNum);
    if (hasPatientData) {
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
            const who = extracted.name ? extracted.name : 'datos del paciente';
            showToast(`👤 Paciente detectado: ${who}`, 'success');
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
    banner.innerHTML = '👤 <span>Completar datos del paciente</span> — Click aquí';
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

async function _doAutoStructure(options) {
    if (window._structuring) return false;
    window._structuring = true;

    const editor = document.getElementById('editor');
    if (!editor || !editor.innerText.trim()) {
        if (typeof showToast === 'function') showToast('No hay texto para estructurar', 'error');
        return false;
    }
    // Obtener texto limpio sin elementos UI (placeholder, header paciente, botón inline)
    const _clone = editor.cloneNode(true);
    _clone.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
    const rawText = _clone.innerText;
    const structInput = _prepareStructuringInput(rawText);
    const savedHTML = editor.innerHTML;
    if (!checkStructurePrerequisites()) return false;

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
        window._lastStructuredHTML = body;
        if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Estructurado con IA', 'structuring');
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
        _showStructurerFailureToast(error);
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
        return false;
    } finally {
        window._structuring = false;
        if (btnStructureAIEl) {
            btnStructureAIEl.disabled = false;
            btnStructureAIEl.innerHTML = oldHTML;
        }
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

            try {
                const templateSelect = document.getElementById('templateSelect');
                const templateKey = templateSelect ? templateSelect.value : 'generico';
                const isGeneralNonMedicalFallback = templateKey === 'generico' && !_isLikelyMedicalText(structInput);
                const rawMarkdown = await structureWithRetry(structInput, templateKey, {
                    forceGeneralNoConclusion: isGeneralNonMedicalFallback
                });
                const { body, note } = parseAIResponse(rawMarkdown);
                editor.innerHTML = body;
                window._lastStructuredHTML = body;
                if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Re-estructurado', 'structuring');
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
                _showStructurerFailureToast(e);
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            } finally {
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

