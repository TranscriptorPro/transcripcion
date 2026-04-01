
async function buildWhisperPrompt() {
    // Compat tests: usa STUDY_TERMINOLOGY / studyTerminology para prompt contextual.
    const api = window.TranscriptorWhisperPromptUtils;
    if (api && typeof api.buildWhisperPrompt === 'function') {
        return api.buildWhisperPrompt();
    }
    return 'Transcripción médica en español: paciente, diagnóstico, tratamiento, evolución';
}

window.buildWhisperPrompt = buildWhisperPrompt;

window._shouldAutoStructure = false;

function _isAdminTranscriptorContext() {
    return typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN';
}

function _showApiKeyGuidance(message) {
    const msg = message || 'Error de API Key.';
    const isAdmin = _isAdminTranscriptorContext();

    if (typeof showToastWithAction === 'function') {
        if (isAdmin) {
            showToastWithAction(msg, 'error', '⚙️ Configurar', function () {
                var overlay = document.getElementById('settingsModalOverlay');
                if (overlay) {
                    if (typeof populateSettingsModal === 'function') populateSettingsModal();
                    overlay.classList.add('active');
                }
            }, 7000);
        } else {
            showToastWithAction('🔑 No pudimos validar tu API Key. Contactá a soporte o revisa tu plan.', 'warning', '📧 Contactar', function () {
                if (typeof window.openContactModal === 'function') {
                    window.openContactModal('Problema con la API Key');
                } else {
                    var btnContacto = document.getElementById('btnContacto');
                    if (btnContacto) btnContacto.click();
                }
            }, 7000);
        }
        return;
    }

    if (typeof showToast === 'function') {
        showToast(isAdmin ? msg : '🔑 Error de API Key. Contactá a soporte.', 'error');
    }
}

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

        const shouldAutoStructureNow = window._shouldAutoStructure;
        window._shouldAutoStructure = false;

        if (!window.GROQ_API_KEY) {
            _showApiKeyGuidance('⚠️ Configurá tu API Key de Groq primero');
            if (_isAdminTranscriptorContext() && apiKeyInput) apiKeyInput.focus();
            return;
        }

        if (!window.GROQ_API_KEY.startsWith('gsk_')) {
            _showApiKeyGuidance('❌ API Key inválida (debe empezar con gsk_)');
            if (_isAdminTranscriptorContext() && apiKeyInput) apiKeyInput.focus();
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

        if (pending.length > 1) {
            if (chkJoinAudios && chkJoinAudios.checked) {
                shouldJoin = true;
            } else if (typeof askJoinAudiosPromise === 'function') {
                shouldJoin = await askJoinAudiosPromise(pending.length);
                if (chkJoinAudios) chkJoinAudios.checked = shouldJoin;
            }
        }

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
                    validateAudioFile(item.file);

                    if (typeof isAudioSilent === 'function') {
                        try {
                            const silent = await isAudioSilent(item.file);
                            if (silent) {
                                showToast(`⚠️ "${item.file.name}" parece ser silencio. Se enviará igualmente.`, 'warning', 4000);
                            }
                        } catch (_) { /* no bloquear si falla el análisis */ }
                    }

                    if (processingText) processingText.textContent = `Transcribiendo: ${item.file.name}...`;
                    let text = await transcribeWithRetry(item.file, (msg) => {
                        if (processingText) processingText.textContent = msg;
                    });
                    text = cleanTranscriptionText(text);

                    text = autoApplyDictCorrections(text);

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
                        const decision = await askBatchDecision(item.file.name, done + 1, pending.length);
                        if (decision === 'cancel') {
                            batchCancelled = true;
                            break;
                        }
                        skippedFiles.push(item.file.name);
                    } else if (!shouldJoin && isMultiFile) {
                        showToast(`❌ "${item.file.name}" no pudo transcribirse (${errorInfo.type}). Continuando con los demás...`, 'error');
                        skippedFiles.push(item.file.name);
                    } else {
                        const repairedFile = await showAudioRepairModal(item.file, errorInfo);
                        if (repairedFile) {
                            if (processingText) processingText.textContent = `Reintentando con audio reparado...`;
                            try {
                                let repairedText = await transcribeWithGroqParams(repairedFile, { language: 'es' });
                                repairedText = cleanTranscriptionText(repairedText);
                                repairedText = autoApplyDictCorrections(repairedText);
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

            if (typeof saveEditorSnapshot === 'function') saveEditorSnapshot('Transcripción cruda', 'transcription');

            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            if (window.currentMode === 'normal' && typeof populateLimitedTemplates === 'function') {
                populateLimitedTemplates();
            }

            if (shouldAutoStructureNow && window.currentMode === 'pro' && editor && editor.innerText.trim().length > 50) {
                editor.classList.add('editor-pipeline-hidden');

                if (typeof detectStudyType === 'function') {
                    const detection = detectStudyType(editor.innerText);
                    if (detection.confidence >= 2) {
                        window.selectedTemplate = detection.type;
                        const toolbarDropdown = document.getElementById('templateDropdownMain');
                        if (toolbarDropdown) toolbarDropdown.value = detection.type;
                        if (typeof templateSelect !== 'undefined' && templateSelect) templateSelect.value = detection.type;
                    }
                }

                if (typeof window.autoStructure === 'function') {
                    window.autoStructure({ silent: true }).then(success => {
                        if (!success && typeof showToast === 'function') {
                            showToast('⚠️ La estructuración automática falló. El texto fue transcripto pero no estructurado.', 'warning', 5000);
                        }
                    }).finally(() => {
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
            const errMsg = String(generalError?.message || '');
            if (errMsg.includes('API Key') || errMsg.includes('401')) {
                _showApiKeyGuidance('🔑 Problema de autenticación con la API Key.');
            } else {
                showToast('Error general en el proceso: ' + (generalError?.message || 'Error desconocido'), 'error');
            }
            if (window.transcriptions && window.transcriptions.length > 0) {
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            }
        } finally {
            window.isProcessing = false;
            transcribeBtn.disabled = window.uploadedFiles.every(f => f.status === 'done');
            const tAndSFinal = document.getElementById('transcribeAndStructureBtn');
            if (tAndSFinal) tAndSFinal.disabled = transcribeBtn.disabled;

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

async function transcribeWithGroqParams(file, { language = 'es', model = 'whisper-large-v3-turbo' } = {}) {
    const form = new FormData();
    form.append('file', file);
    form.append('model', model);
    if (language) form.append('language', language);
    form.append('response_format', 'text');
    form.append('temperature', '0'); // Determinístico: reduce invenciones fonéticas

    try {
        const whisperPrompt = await buildWhisperPrompt();
        if (whisperPrompt) {
            form.append('prompt', whisperPrompt);
        }
    } catch (e) {
        console.warn('[Whisper Prompt] Error al construir prompt, se continúa sin él:', e);
    }

    try {
        const res = await fetchWithTimeout(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${window.GROQ_API_KEY}` },
            body: form
        }, 120000);

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);

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

var HALLUCINATION_PHRASES = [
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

var MEDICAL_REJOIN_RULES = [
    { rx: /\b(dis)\s+(fagia|fonía|fonia|nea|pnea|función|funcion|pepsia|uria|plasia|trofia|cinesia|tonia|tonía|kinesia|lipidemia|lipemia|ritmia|taxia|menorrea|psia|praxia|fasia|lexia|grafía|grafia)/gi, to: '$1$2' },
    { rx: /\b(taqui|bradi)\s+(cardia|pnea|arritmia|sistolia)/gi, to: '$1$2' },
    { rx: /\b(hiper|hipo)\s+(tensión|tension|trofia|plasia|emia|glucemia|tiroidismo|calcemia|natremia|kalemia|potasemia|osmolar)/gi, to: '$1$2' },
    { rx: /\b(endo|bronco|colono|laringo|gastro|naso|rino|faringo|cisto|hister)\s+(scopía|scopia|scopio)/gi, to: '$1$2' },
    { rx: /\b(eco|electro)\s+(cardiograma|cardio|encefalograma|miografía|miografia)/gi, to: '$1$2' },
    { rx: /\bo\s+(dinofagia)/gi, to: 'o$1' },
    { rx: /\b(histo|inmuno)\s+(patología|patologia|química|quimica|histoquímica|histoquimica)/gi, to: '$1$2' },
    { rx: /\b(naso|oro|hipo|supra|sub)\s+(faríngea|faringea|glótica|glotica|glotis)/gi, to: '$1$2' },
    { rx: /\b(peri|mio|endo)\s+(cardio|carditis|metrio|metritis)/gi, to: '$1$2' },
];

window.cleanTranscriptionText = cleanTranscriptionText;
function cleanTranscriptionText(text) {
    if (!text) return "";
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^[\s\.]+/u, "").trim();

    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    if (typeof HALLUCINATION_PHRASES !== 'undefined' && HALLUCINATION_PHRASES.some(rx => rx.test(cleaned))) {
        console.warn('⚠️ Hallucination filter: descartado →', cleaned);
        return '';
    }

    if (cleaned.length > 0 && cleaned.length < 10 && !/[a-záéíóúñ]{4,}/i.test(cleaned)) {
        console.warn('⚠️ Hallucination filter: texto sospechosamente corto →', cleaned);
        return '';
    }

    if (typeof MEDICAL_REJOIN_RULES !== 'undefined') {
        for (const rule of MEDICAL_REJOIN_RULES) {
            cleaned = cleaned.replace(rule.rx, rule.to);
        }
    }

    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

function autoApplyDictCorrections(text) {
    if (!text || text.length < 5) return text;
    try {
        const baseDict = (typeof MEDICAL_DICT_BASE !== 'undefined') ? MEDICAL_DICT_BASE : {};
        const customDict = (typeof getMedCustomDict === 'function') ? getMedCustomDict() : {};
        const fullDict = { ...baseDict, ...customDict };

        let corrected = text;
        let totalFixes = 0;
        const _esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        for (const [from, to] of Object.entries(fullDict)) {
            if (from === to) continue; // skip no-ops
            try {
                const rx = new RegExp('\\b' + _esc(from) + '\\b', 'gi');
                const before = corrected;
                corrected = corrected.replace(rx, to);
                if (corrected !== before) totalFixes++;
            } catch { /* skip invalid regex keys */ }
        }

        if (totalFixes > 0) {
            console.log(`[AutoDict] ${totalFixes} corrección(es) aplicadas automáticamente`);
        }
        return corrected;
    } catch (e) {
        console.warn('[AutoDict] Error, se devuelve texto original:', e);
        return text;
    }
}

function classifyTranscriptionError(errMsg) {
    const isAdmin = (typeof _isAdminTranscriptorContext === 'function')
        ? _isAdminTranscriptorContext()
        : false;
    const status = (typeof errMsg === 'object' && errMsg !== null) ? errMsg.status : null;
    const msg = String((typeof errMsg === 'object' && errMsg !== null) ? (errMsg.message || errMsg.status || '') : (errMsg || '')).toLowerCase();
    if (status === 413 || msg.includes('413') || msg.includes('payload') || msg.includes('entity too large')) {
        return {
            type: 'file_too_large',
            userMsg: isAdmin
                ? 'El archivo supera el límite de tamaño permitido por la API.'
                : 'El audio es demasiado pesado para procesarlo de una vez.',
            suggestions: isAdmin
                ? ['Dividir el audio en partes más cortas', 'Comprimir el archivo antes de subirlo']
                : ['Recortar el audio en partes cortas', 'Intentar nuevamente con un archivo más liviano']
        };
    }
    if (msg.includes('api key') || msg.includes('401') || msg.includes('inválida o expirada') || status === 401) {
        return {
            type: 'auth',
            userMsg: isAdmin
                ? 'API Key inválida o expirada. Verificá tu clave en Configuración.'
                : 'No pudimos validar la API Key. Contactá al soporte para ayudarte rápido.',
            suggestions: isAdmin
                ? ['Verificar que la clave comience con gsk_', 'Generar una nueva API Key en console.groq.com']
                : ['Abrir Contacto desde Configuración', 'Elegir "Problema con la API Key"']
        };
    }
    if (msg.includes('formato') || msg.includes('inválido') || msg.includes('corrupto') || msg.includes('400')) {
        return {
            type: 'format',
            userMsg: isAdmin
                ? 'El archivo de audio no es compatible o está dañado.'
                : 'No pudimos leer bien este audio.',
            suggestions: isAdmin
                ? ['Usar las herramientas de reparación de abajo', 'Convertir a MP3 o WAV', 'Verificar que el archivo reproduzca correctamente']
                : ['Probar con otro audio', 'Convertir a MP3 o WAV', 'Si persiste, contactar soporte']
        };
    }
    if (msg.includes('25mb') || msg.includes('grande')) {
        return {
            type: 'size',
            userMsg: isAdmin
                ? 'El archivo supera el límite de 25 MB de la API.'
                : 'El audio supera el tamaño permitido.',
            suggestions: isAdmin
                ? ['Dividir el audio en partes más cortas', 'Comprimir el archivo antes de subirlo']
                : ['Recortar el audio en partes', 'Intentar con una grabación más corta']
        };
    }
    if (msg.includes('429') || msg.includes('límite')) {
        return {
            type: 'ratelimit',
            userMsg: isAdmin
                ? 'Límite de requests de Groq excedido.'
                : 'Hay mucha demanda en este momento y no pudimos transcribir ahora.',
            suggestions: isAdmin
                ? ['Esperar unos minutos y reintentar', 'Verificar los límites del plan en console.groq.com']
                : ['Esperar un momento y volver a intentar', 'Si continúa, contactar soporte']
        };
    }
    if (msg.includes('503') || msg.includes('no disponible')) {
        return {
            type: 'network',
            userMsg: isAdmin
                ? 'Servicio de Groq temporalmente no disponible.'
                : 'El servicio de transcripción está temporalmente no disponible.',
            suggestions: isAdmin
                ? ['Verificar conexión a Internet', 'Intentar en unos minutos', 'Ver status.groq.com']
                : ['Reintentar en unos minutos', 'Verificar conexión a Internet', 'Si persiste, contactar soporte']
        };
    }
    return {
        type: 'unknown',
        userMsg: isAdmin
            ? (errMsg || 'Error desconocido al procesar el audio.')
            : 'No pudimos completar la transcripción en este intento.',
        suggestions: isAdmin
            ? ['Verificar que el archivo sea un audio válido', 'Intentar con otro formato de archivo', 'Verificar API Key y conexión a Internet']
            : ['Intentar nuevamente', 'Probar con otro audio', 'Si continúa, contactar soporte']
    };
}

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
            if (attempt >= 3) {
                if (!forcedFile) {
                    if (onStatusUpdate) onStatusUpdate(`Reintento ${attempt}/${ATTEMPTS}: reparando audio...`);
                    forcedFile = await repairAudioFile(file, { doNormalize: true, doNoise: true, doMono: true });
                }
                fileToSend = forcedFile;
            }
            const langParam = (attempt === 2 || attempt === 4) ? null : 'es';
            const text = await transcribeWithGroqParams(fileToSend, { language: langParam });
            return text; // success
        } catch (err) {
            console.warn(`Transcription attempt ${attempt}/${ATTEMPTS} failed:`, err.message);
            lastError = err;
            if (err.message.includes('API Key') || err.message.includes('401') ||
                err.message.includes('25MB') || err.message.includes('grande')) {
                throw err;
            }
        }
    }
    throw lastError;
}

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

function validateAudioFile(file) {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/webm', 'audio/flac', 'audio/aac', 'audio/opus'];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.webm', '.flac', '.aac', '.opus'];

    if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        throw new Error(`Formato no soportado: ${file.name}`);
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error(`Archivo muy grande: ${file.name} (máx 25MB)`);
    }

    if (file.size === 0) {
        throw new Error(`Archivo vacío: ${file.name}`);
    }

    return true;
}

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

window.transcribeAudioSimple = async function(file) {
    const apiKey = (typeof window.getResolvedGroqApiKey === 'function')
        ? window.getResolvedGroqApiKey()
        : (window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '');
    if (!apiKey) throw new Error('No hay API key configurada');
    const MAX_RETRIES = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 1500));
            const form = new FormData();
            form.append('file', file);
            form.append('model', 'whisper-large-v3-turbo');
            form.append('language', 'es');
            form.append('response_format', 'text');
            form.append('temperature', '0');
            try {
                const prompt = await buildWhisperPrompt();
                if (prompt) form.append('prompt', prompt);
            } catch(_) {}
            const res = await fetchWithTimeout(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + apiKey },
                body: form
            }, 120000);
            if (!res.ok) {
                if (res.status === 401) throw new Error('API Key inválida');
                if (res.status === 429) throw new Error('Límite de requests excedido');
                throw new Error('Error ' + res.status);
            }
            const text = (await res.text()).trim();
            if (window.apiUsageTracker) window.apiUsageTracker.trackTranscription();
            return text;
        } catch (err) {
            lastErr = err;
            if (err.message.includes('401') || err.message.includes('API Key')) throw err;
        }
    }
    throw lastErr;
};
