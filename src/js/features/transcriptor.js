// ============ TRANSCRIPTION & GROQ API ============

// Flag para controlar si se auto-estructura después de transcribir
window._shouldAutoStructure = false;

// Botón "Transcribir y Estructurar" (Pro) — setea flag y dispara transcripción
const transcribeAndStructureBtn = document.getElementById('transcribeAndStructureBtn');
if (transcribeAndStructureBtn) {
    transcribeAndStructureBtn.addEventListener('click', () => {
        window._shouldAutoStructure = true;
        if (transcribeBtn && !transcribeBtn.disabled) transcribeBtn.click();
    });
}

if (transcribeBtn) {
    transcribeBtn.addEventListener('click', async () => {
        const pending = window.uploadedFiles.filter(item => item.status === 'pending');
        if (pending.length === 0 || window.isProcessing) return;

        // Capturar el flag antes de resetear
        const shouldAutoStructureNow = window._shouldAutoStructure;
        window._shouldAutoStructure = false;

        // Enhanced API Key validation
        if (!window.GROQ_API_KEY) {
            showToast('⚠️ Configura tu API Key de Groq primero', 'error');
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        // Validate API key format
        if (!window.GROQ_API_KEY.startsWith('gsk_')) {
            showToast('❌ API Key inválida (debe empezar con gsk_)', 'error');
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        window.isProcessing = true;
        transcribeBtn.disabled = true;
        const tAndSBtnSync = document.getElementById('transcribeAndStructureBtn');
        if (tAndSBtnSync) tAndSBtnSync.disabled = true;
        processingStatus.classList.add('active');
        let done = 0;
        let joinedText = '';
        let skippedFiles = [];
        let batchCancelled = false;
        let shouldJoin = false;

        // Si el checkbox "Unir audios" ya está marcado, auto-unir sin preguntar
        // Solo mostrar diálogo si hay múltiples archivos y el checkbox NO está marcado
        if (pending.length > 1) {
            if (chkJoinAudios && chkJoinAudios.checked) {
                shouldJoin = true;
            } else if (typeof askJoinAudiosPromise === 'function') {
                shouldJoin = await askJoinAudiosPromise(pending.length);
                if (chkJoinAudios) chkJoinAudios.checked = shouldJoin;
            }
        }

        // Limpiar transcripciones anteriores para empezar con pestañas frescas
        window.transcriptions = [];
        window.activeTabIndex = 0;

        try {
            for (let i = 0; i < window.uploadedFiles.length; i++) {
                const item = window.uploadedFiles[i];
                if (item.status !== 'pending') continue;

                item.status = 'processing';
                updateFileList();
                if (processingText) processingText.textContent = `${done + 1}/${pending.length}: ${item.file.name}`;
                if (progressFill) progressFill.style.width = `${(done / pending.length) * 100}%`;

                try {
                    // 1. Validate file format/size/integrity before sending
                    validateAudioFile(item.file);

                    // RM-6: Verificar si el audio es silencioso antes de consumir cuota API
                    if (typeof isAudioSilent === 'function') {
                        try {
                            const silent = await isAudioSilent(item.file);
                            if (silent) {
                                showToast(`⚠️ "${item.file.name}" parece ser silencio. Se enviará igualmente.`, 'warning', 4000);
                            }
                        } catch (_) { /* no bloquear si falla el análisis */ }
                    }

                    // 2. Transcribe with 4-attempt retry strategy
                    if (processingText) processingText.textContent = `Transcribiendo: ${item.file.name}...`;
                    let text = await transcribeWithRetry(item.file, (msg) => {
                        if (processingText) processingText.textContent = msg;
                    });
                    text = cleanTranscriptionText(text);

                    // Enforce transcription length limit
                    const MAX_TRANSCRIPTION_LENGTH = 20000;
                    if (text.length > MAX_TRANSCRIPTION_LENGTH) {
                        const truncationNote = '\n\n[Transcripción truncada por longitud excesiva]';
                        text = text.slice(0, MAX_TRANSCRIPTION_LENGTH - truncationNote.length) + truncationNote;
                    }

                    if (shouldJoin) {
                        joinedText += (joinedText ? '\n\n' : '') + text;
                    } else {
                        window.transcriptions.push({ fileName: item.file.name, text: text || 'Sin audio detectado.' });
                        window.activeTabIndex = window.transcriptions.length - 1;
                    }

                    item.status = 'done';
                    done++;
                } catch (err) {
                    console.error('Transcription failed after all attempts:', err);
                    item.status = 'error';
                    const errorInfo = classifyTranscriptionError(err.message);
                    const isMultiFile = pending.length > 1;

                    if (shouldJoin && isMultiFile) {
                        // Modo unir + múltiples archivos: preguntar si continuar o cancelar todo
                        const decision = await askBatchDecision(item.file.name, done + 1, pending.length);
                        if (decision === 'cancel') {
                            batchCancelled = true;
                            break;
                        }
                        // 'continue': saltear este archivo y seguir
                        skippedFiles.push(item.file.name);
                    } else if (!shouldJoin && isMultiFile) {
                        // Modo pestañas separadas + múltiples archivos: saltear con toast, NO bloquear
                        showToast(`❌ "${item.file.name}" no pudo transcribirse (${errorInfo.type}). Continuando con los demás...`, 'error');
                        skippedFiles.push(item.file.name);
                    } else {
                        // Archivo único: ofrecer herramientas de reparación
                        const repairedFile = await showAudioRepairModal(item.file, errorInfo);
                        if (repairedFile) {
                            if (processingText) processingText.textContent = `Reintentando con audio reparado...`;
                            try {
                                let repairedText = await transcribeWithGroqParams(repairedFile, { language: 'es' });
                                repairedText = cleanTranscriptionText(repairedText);
                                if (shouldJoin) {
                                    joinedText += (joinedText ? '\n\n' : '') + repairedText;
                                } else {
                                    window.transcriptions.push({ fileName: item.file.name, text: repairedText || 'Sin audio detectado.' });
                                    window.activeTabIndex = window.transcriptions.length - 1;
                                }
                                item.status = 'done';
                                done++;
                            } catch (repairErr) {
                                item.status = 'error';
                                showToast(`❌ "${item.file.name}" no pudo transcribirse incluso después de reparar. El problema es del archivo de audio.`, 'error');
                            }
                        }
                    }
                }

                updateFileList();
                if (progressFill) progressFill.style.width = `${(done / pending.length) * 100}%`;
            }

            if (shouldJoin && (joinedText || skippedFiles.length > 0)) {
                const skipStr = skippedFiles.length ? `, ${skippedFiles.length} omitido${skippedFiles.length > 1 ? 's' : ''}` : '';
                const combinedName = `Informe Combinado (${done} audio${done !== 1 ? 's' : ''}${skipStr})`;
                const skipNote = skippedFiles.length
                    ? `\n\n⚠️ NOTA: Este informe puede estar incompleto. Los siguientes archivos no pudieron transcribirse:\n${skippedFiles.map(f => `• ${f}`).join('\n')}`
                    : '';
                const finalText = joinedText + skipNote;
                window.transcriptions.push({ fileName: combinedName, text: finalText });
                window.activeTabIndex = window.transcriptions.length - 1;
                if (editor) editor.innerHTML = finalText;
            } else if (!shouldJoin && window.transcriptions.length > 0) {
                if (editor) editor.innerHTML = window.transcriptions[window.activeTabIndex].text;
            }

            if (typeof createTabs === 'function') createTabs();
            if (typeof updateWordCount === 'function') updateWordCount();

            // Update state to TRANSCRIBED and populate templates for Normal mode
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            if (window.currentMode === 'normal' && typeof populateLimitedTemplates === 'function') {
                populateLimitedTemplates();
            }

            // Auto-detect template in Pro mode AND auto-structure pipeline
            // Solo auto-estructurar si se usó el botón "Transcribir y Estructurar"
            if (shouldAutoStructureNow && window.currentMode === 'pro' && editor && editor.innerText.trim().length > 50) {
                // Ocultar el contenido del editor mientras se estructura
                // El usuario NO debe ver el texto crudo — solo el resultado final
                editor.classList.add('editor-pipeline-hidden');

                if (typeof detectStudyType === 'function') {
                    const detection = detectStudyType(editor.innerText);
                    if (detection.confidence >= 2) {
                        window.selectedTemplate = detection.type;
                        const toolbarDropdown = document.getElementById('templateDropdownMain');
                        if (toolbarDropdown) toolbarDropdown.value = detection.type;
                        if (typeof templateSelect !== 'undefined' && templateSelect) templateSelect.value = detection.type;

                        // Check if MEDICAL_TEMPLATES is accessible globally
                        if (typeof MEDICAL_TEMPLATES !== 'undefined') {
                            const templateName = MEDICAL_TEMPLATES[detection.type]?.name || detection.type;
                            showToast(`🤖 Plantilla detectada: ${templateName} — Estructurando...`, 'success');
                        }
                    }
                }

                // ── Auto-pipeline: Transcripción → Estructuración inmediata ──
                // No usar timeout — estructurar inmediatamente para que el usuario
                // nunca vea el texto sin formato
                if (typeof window.autoStructure === 'function') {
                    window.autoStructure({ silent: true }).then(success => {
                        if (!success && typeof showToast === 'function') {
                            showToast('⚠️ La estructuración automática falló. El texto fue transcripto pero no estructurado.', 'warning', 5000);
                        }
                    }).finally(() => {
                        // Revelar el editor solo cuando la estructuración termine
                        editor.classList.remove('editor-pipeline-hidden');
                    });
                } else {
                    editor.classList.remove('editor-pipeline-hidden');
                }
            }

            if (progressFill) progressFill.style.width = '100%';
            if (processingText) {
                const isPipeline = window.currentMode === 'pro' && editor && editor.innerText.trim().length > 50;
                processingText.textContent = isPipeline
                    ? `✓ ${done} transcrito(s) — Estructurando con IA...`
                    : `✓ ${done} transcrito(s)`;
            }

            // Show success message
            if (done > 0 || skippedFiles.length > 0) {
                setTimeout(() => {
                    if (skippedFiles.length === 0) {
                        showToast(`✅ ${done} transcripción(es) lista(s)`, 'success');
                    } else {
                        showToast(`⚠️ ${done} transcripto(s), ${skippedFiles.length} omitido(s) por error. Revisá el informe.`, 'warning');
                    }
                }, 500);
            }

        } catch (generalError) {
            console.error('Error general:', generalError);
            showToast('Error general en el proceso: ' + (generalError?.message || 'Error desconocido'), 'error');
            if (window.transcriptions && window.transcriptions.length > 0) {
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            }
        } finally {
            window.isProcessing = false;
            transcribeBtn.disabled = window.uploadedFiles.every(f => f.status === 'done');
            const tAndSFinal = document.getElementById('transcribeAndStructureBtn');
            if (tAndSFinal) tAndSFinal.disabled = transcribeBtn.disabled;

            // Liberar Object URLs de archivos procesados para evitar memory leaks
            window.uploadedFiles.forEach(item => {
                if (item.status === 'done' && item.audioUrl) {
                    URL.revokeObjectURL(item.audioUrl);
                    item.audioUrl = null;
                }
                if (item._audio) {
                    item._audio.pause();
                    item._audio = null;
                }
            });

            // ALWAYS hide processing status after completion
            setTimeout(() => {
                if (processingStatus) {
                    processingStatus.classList.remove('active');
                }
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
                if (processingText) {
                    processingText.textContent = '';
                }
            }, 1000);
        }
    });
}

async function transcribeWithGroqParams(file, { language = 'es', model = 'whisper-large-v3' } = {}) {
    const form = new FormData();
    form.append('file', file);
    form.append('model', model);
    if (language) form.append('language', language);
    form.append('response_format', 'text');

    try {
        const res = await fetchWithTimeout(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${window.GROQ_API_KEY}` },
            body: form
        }, 120000);

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);

            // Specific error messages
            if (res.status === 400) {
                throw new Error('Archivo de audio inválido o corrupto');
            } else if (res.status === 401) {
                throw new Error('API Key inválida o expirada');
            } else if (res.status === 429) {
                throw new Error('Límite de requests excedido. Espera un momento');
            } else if (res.status === 503) {
                throw new Error('Servicio de Groq temporalmente no disponible');
            } else {
                const msg = errorData?.error?.message || 'Error desconocido';
                throw new Error(`Error ${res.status}: ${msg}`);
            }
        }

        // RB-6: Trackear uso de API de transcripción
        const text = await res.text();
        if (window.apiUsageTracker) window.apiUsageTracker.trackTranscription();
        return text;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('⏱️ Timeout: el servidor no respondió en 2 minutos');
        }
        console.error('❌ Groq API Error:', error);
        throw error;
    }
}

// ── Frases de alucinación conocidas de Whisper (audio vacío/silencioso) ────
const HALLUCINATION_PHRASES = [
    /^\s*gracias por ver(?: el video)?[.!]?\s*$/i,
    /^\s*thanks for watching[.!]?\s*$/i,
    /^\s*suscr[íi]bete[.!]?\s*$/i,
    /^\s*subscribe[.!]?\s*$/i,
    /^\s*like and subscribe[.!]?\s*$/i,
    /^\s*no olvides suscribirte[.!]?\s*$/i,
    /^\s*dale like[.!]?\s*$/i,
    /^\s*hasta la pr[oó]xima[.!]?\s*$/i,
    /^\s*nos vemos[.!]?\s*$/i,
    /^\s*subtítulos realizados por[.\s]*$/i,
    /^\s*subt[ií]tulos por la comunidad[.\s]*$/i,
    /^\s*[.…·\-_\s]{3,}$/,
    /^\s*music[.\s]*$/i,
    /^\s*m[úu]sica[.\s]*$/i,
    /^\s*aplausos[.\s]*$/i,
];

function cleanTranscriptionText(text) {
    if (!text) return "";
    let cleaned = text.trim();
    // Remove leading ellipsis and spaces
    cleaned = cleaned.replace(/^[\s\.]+/u, "").trim();

    // Filtro de alucinaciones de Whisper (audio silencioso/vacío)
    if (HALLUCINATION_PHRASES.some(rx => rx.test(cleaned))) {
        console.warn('⚠️ Hallucination filter: descartado →', cleaned);
        return '';
    }

    // Si el texto limpio es muy corto (< 10 chars) y solo tiene palabras genéricas → sospechoso
    if (cleaned.length > 0 && cleaned.length < 10 && !/[a-záéíóúñ]{4,}/i.test(cleaned)) {
        console.warn('⚠️ Hallucination filter: texto sospechosamente corto →', cleaned);
        return '';
    }

    // Capitalize first letter
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

// ── Classify error for user-friendly messages ──────────────────────────────
function classifyTranscriptionError(errMsg) {
    const msg = (errMsg || '').toLowerCase();
    if (msg.includes('api key') || msg.includes('401') || msg.includes('inválida o expirada')) {
        return { type: 'auth', userMsg: 'API Key inválida o expirada. Verificá tu clave en Configuración.',
            suggestions: ['Verificar que la clave comience con gsk_', 'Generar una nueva API Key en console.groq.com'] };
    }
    if (msg.includes('formato') || msg.includes('inválido') || msg.includes('corrupto') || msg.includes('400')) {
        return { type: 'format', userMsg: 'El archivo de audio no es compatible o está dañado.',
            suggestions: ['Usar las herramientas de reparación de abajo', 'Convertir a MP3 o WAV', 'Verificar que el archivo reproduzca correctamente'] };
    }
    if (msg.includes('25mb') || msg.includes('grande')) {
        return { type: 'size', userMsg: 'El archivo supera el límite de 25 MB de la API.',
            suggestions: ['Dividir el audio en partes más cortas', 'Comprimir el archivo antes de subirlo'] };
    }
    if (msg.includes('429') || msg.includes('límite')) {
        return { type: 'ratelimit', userMsg: 'Límite de requests de Groq excedido.',
            suggestions: ['Esperar unos minutos y reintentar', 'Verificar los límites del plan en console.groq.com'] };
    }
    if (msg.includes('503') || msg.includes('no disponible')) {
        return { type: 'network', userMsg: 'Servicio de Groq temporalmente no disponible.',
            suggestions: ['Verificar conexión a Internet', 'Intentar en unos minutos', 'Ver status.groq.com'] };
    }
    return { type: 'unknown', userMsg: errMsg || 'Error desconocido al procesar el audio.',
        suggestions: ['Verificar que el archivo sea un audio válido', 'Intentar con otro formato de archivo', 'Verificar API Key y conexión a Internet'] };
}

// ── Repair audio with Web Audio API ────────────────────────────────────────
async function repairAudioFile(file, { doNormalize = true, doNoise = true, doMono = false } = {}) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();
        const targetRate = doMono ? 16000 : audioBuffer.sampleRate;
        const numCh = doMono ? 1 : audioBuffer.numberOfChannels;
        const offCtx = new OfflineAudioContext(numCh, Math.ceil(audioBuffer.duration * targetRate), targetRate);
        const source = offCtx.createBufferSource();
        source.buffer = audioBuffer;
        let node = source;
        if (doNormalize) {
            const gain = offCtx.createGain();
            let peak = 0;
            for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
                const d = audioBuffer.getChannelData(c);
                for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
            }
            gain.gain.value = peak > 0 ? 0.95 / peak : 1;
            node.connect(gain); node = gain;
        }
        if (doNoise) {
            const hp = offCtx.createBiquadFilter();
            hp.type = 'highpass'; hp.frequency.value = 80;
            node.connect(hp); node = hp;
            const lp = offCtx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = 12000;
            node.connect(lp); node = lp;
        }
        node.connect(offCtx.destination);
        source.start(0);
        const rendered = await offCtx.startRendering();
        if (typeof audioBufferToWav !== 'function') return file;
        const wavBlob = audioBufferToWav(rendered);
        const suffix = doMono ? '_mono16k' : '_reparado';
        return new File([wavBlob], file.name.replace(/\.[^.]+$/, `${suffix}.wav`), { type: 'audio/wav' });
    } catch (e) {
        console.warn('repairAudioFile failed, returning original:', e);
        return file;
    }
}

// ── 4-attempt retry with progressive strategy ──────────────────────────────
async function transcribeWithRetry(file, onStatusUpdate) {
    const ATTEMPTS = 4;
    let lastError = null;
    let forcedFile = null;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
            if (attempt > 1) {
                if (onStatusUpdate) onStatusUpdate(`Reintento ${attempt}/${ATTEMPTS}...`);
                await new Promise(r => setTimeout(r, (attempt - 1) * 1500));
            }
            let fileToSend = file;
            // Attempts 3 & 4: force full repair (normalize + noise + mono 16kHz)
            if (attempt >= 3) {
                if (!forcedFile) {
                    if (onStatusUpdate) onStatusUpdate(`Reintento ${attempt}/${ATTEMPTS}: reparando audio...`);
                    forcedFile = await repairAudioFile(file, { doNormalize: true, doNoise: true, doMono: true });
                }
                fileToSend = forcedFile;
            }
            // Attempts 2 & 4: auto-detect language (omit language param)
            const langParam = (attempt === 2 || attempt === 4) ? null : 'es';
            const text = await transcribeWithGroqParams(fileToSend, { language: langParam });
            return text; // success
        } catch (err) {
            console.warn(`Transcription attempt ${attempt}/${ATTEMPTS} failed:`, err.message);
            lastError = err;
            // Auth or size errors: no point retrying
            if (err.message.includes('API Key') || err.message.includes('401') ||
                err.message.includes('25MB') || err.message.includes('grande')) {
                throw err;
            }
        }
    }
    throw lastError;
}

// ── Batch failure decision modal ───────────────────────────────────────────
function askBatchDecision(fileName, position, total) {
    return new Promise((resolve) => {
        const modal = document.getElementById('batchFailModal');
        if (!modal) { resolve('continue'); return; }
        const infoEl = document.getElementById('batchFailInfo');
        if (infoEl) infoEl.innerHTML =
            `<p>El <strong>audio ${position} de ${total}</strong> (<em>${fileName}</em>) no pudo transcribirse tras <strong>4 intentos</strong>.</p>
             <p class="repair-note">⚠️ El problema es del archivo de audio, <strong>no de la aplicación</strong>.</p>
             <p>¿Cómo querés continuar?</p>`;
        modal.style.display = 'flex';
        let resolved = false;
        const done = (val) => { if (!resolved) { resolved = true; modal.style.display = 'none'; resolve(val); } };
        document.getElementById('batchFailContinueBtn').onclick = () => done('continue');
        document.getElementById('batchFailCancelBtn').onclick   = () => done('cancel');
    });
}

// ── Audio repair modal ─────────────────────────────────────────────────────
function showAudioRepairModal(file, errorInfo) {
    return new Promise((resolve) => {
        const modal = document.getElementById('audioRepairModal');
        if (!modal) { resolve(null); return; }
        const fnEl  = document.getElementById('audioRepairFileName');
        const errEl = document.getElementById('audioRepairError');
        const sugEl = document.getElementById('audioRepairSuggestions');
        if (fnEl)  fnEl.textContent  = file.name;
        if (errEl) errEl.textContent = errorInfo.userMsg;
        if (sugEl) sugEl.innerHTML   = errorInfo.suggestions.map(s => `<li>${s}</li>`).join('');
        modal.style.display = 'flex';
        let resolved = false;
        const done = (val) => { if (!resolved) { resolved = true; modal.style.display = 'none'; resolve(val); } };
        document.getElementById('audioRepairCancelBtn').onclick = () => done(null);
        modal.onclick = (e) => { if (e.target === modal) done(null); };
        document.getElementById('audioRepairRetryBtn').onclick = async () => {
            const btn = document.getElementById('audioRepairRetryBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Reparando...';
            try {
                const repaired = await repairAudioFile(file, {
                    doNormalize: document.getElementById('repairNormalize').checked,
                    doNoise:     document.getElementById('repairNoise').checked,
                    doMono:      document.getElementById('repairMono').checked
                });
                done(repaired);
            } catch (e) {
                btn.disabled = false;
                btn.textContent = '🔄 Reparar y reintentar';
                if (typeof showToast === 'function') showToast('No se pudo procesar el audio', 'error');
            }
        };
    });
}

// Validate audio file before processing
function validateAudioFile(file) {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/webm', 'audio/flac', 'audio/aac', 'audio/opus'];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.webm', '.flac', '.aac', '.opus'];

    // Validate type MIME or extension
    if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        throw new Error(`Formato no soportado: ${file.name}`);
    }

    // Validate size (25MB max for Groq)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error(`Archivo muy grande: ${file.name} (máx 25MB)`);
    }

    // Validate not empty
    if (file.size === 0) {
        throw new Error(`Archivo vacío: ${file.name}`);
    }

    return true;
}

// ── RA-2: Reintentar archivos fallidos ─────────────────────────────────────
// Cambia status 'error' → 'pending' para que el próximo click de Transcribir los procese
window.retryFailedFiles = function() {
    const failedCount = window.uploadedFiles.filter(f => f.status === 'error').length;
    if (failedCount === 0) {
        if (typeof showToast === 'function') showToast('No hay archivos fallidos para reintentar', 'info');
        return;
    }
    window.uploadedFiles.forEach(f => {
        if (f.status === 'error') f.status = 'pending';
    });
    if (typeof updateFileList === 'function') updateFileList();
    const transcribeBtn = document.getElementById('transcribeBtn');
    if (transcribeBtn) transcribeBtn.disabled = false;
    const tAndS = document.getElementById('transcribeAndStructureBtn');
    if (tAndS) tAndS.disabled = false;
    if (typeof showToast === 'function') showToast(`🔄 ${failedCount} archivo(s) listo(s) para reintentar`, 'success');
};

// ── RM-6: Detección de audio silencioso pre-envío ──────────────────────────
// Analiza el RMS del audio; si es < threshold → probablemente silencio.
async function isAudioSilent(file, threshold = 0.01) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = await ctx.decodeAudioData(await file.arrayBuffer());
        const data = buf.getChannelData(0);
        let rms = 0;
        for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
        rms = Math.sqrt(rms / data.length);
        ctx.close();
        return rms < threshold;
    } catch (_) {
        return false; // si no se puede analizar, no bloquear
    }
}

// testGroqConnection — removida (dead code, nunca se invocaba)
