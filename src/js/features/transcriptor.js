// ============ TRANSCRIPTION & GROQ API ============

if (transcribeBtn) {
    transcribeBtn.addEventListener('click', async () => {
        const pending = window.uploadedFiles.filter(item => item.status === 'pending');
        if (pending.length === 0 || window.isProcessing) return;

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
        processingStatus.classList.add('active');
        let done = 0;
        let joinedText = '';
        const shouldJoin = chkJoinAudios ? chkJoinAudios.checked : false;

        try {
            for (let i = 0; i < window.uploadedFiles.length; i++) {
                const item = window.uploadedFiles[i];
                if (item.status !== 'pending') continue;

                item.status = 'processing';
                updateFileList();
                if (processingText) processingText.textContent = `${done + 1}/${pending.length}: ${item.file.name}`;
                if (progressFill) progressFill.style.width = `${(done / pending.length) * 100}%`;

                try {
                    if (processingText) processingText.textContent = `Mejorando audio...`;
                    // Asume processAudio function will be defined globally or imported
                    let processedFile = item.file;
                    if (typeof processAudio === 'function') {
                        processedFile = await processAudio(item.file);
                    }

                    if (processingText) processingText.textContent = `Transcribiendo...`;
                    let text = await transcribeWithGroq(processedFile);
                    text = cleanTranscriptionText(text);

                    if (shouldJoin) {
                        joinedText += (joinedText ? '\n\n' : '') + text;
                    } else {
                        window.transcriptions.push({ fileName: item.file.name, text: text || 'Sin audio detectado.' });
                        window.activeTabIndex = window.transcriptions.length - 1;
                    }

                    item.status = 'done';
                    done++;
                } catch (err) {
                    console.error(err);
                    item.status = 'pending';
                    showToast(`Error en ${item.file.name}: ${err.message}`, 'error');
                }

                updateFileList();
                if (progressFill) progressFill.style.width = `${(done / pending.length) * 100}%`;
            }

            if (shouldJoin && joinedText) {
                const combinedName = `Informe Combinado (${done} audios)`;
                window.transcriptions.push({ fileName: combinedName, text: joinedText });
                window.activeTabIndex = window.transcriptions.length - 1;
                if (editor) editor.innerHTML = joinedText;
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

            // Auto-detect template in Pro mode
            if (window.currentMode === 'pro' && editor && editor.innerText.trim().length > 50) {
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
                            setTimeout(() => {
                                showToast(`🤖 Plantilla detectada: ${templateName}`, 'success');
                            }, 700);
                        }
                    }
                }
            }

            if (progressFill) progressFill.style.width = '100%';
            if (processingText) processingText.textContent = `✓ ${done} transcrito(s)`;

            // Show success message
            if (done) {
                setTimeout(() => {
                    showToast(`${done} transcripción(es) lista(s)`, 'success');
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

async function transcribeWithGroq(file) {
    const form = new FormData();
    form.append('file', file);
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');
    form.append('response_format', 'text');

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${window.GROQ_API_KEY}` },
            body: form
        });

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

        return await res.text();
    } catch (error) {
        console.error('❌ Groq API Error:', error);
        throw error;
    }
}

function cleanTranscriptionText(text) {
    if (!text) return "";
    let cleaned = text.trim();
    // Remove leading ellipsis and spaces
    cleaned = cleaned.replace(/^[\s\.]+/u, "").trim();
    // Capitalize first letter
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
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

// Test Groq API connection
async function testGroqConnection() {
    if (!window.GROQ_API_KEY) {
        return false;
    }

    let audioContext = null;
    try {
        // Create a minimal valid audio test file
        const sampleRate = 16000;
        const duration = 0.1; // 100ms
        const numSamples = Math.floor(sampleRate * duration);

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);

        // Generate a simple 440Hz tone (A note)
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        }

        // Convert to valid WAV - Requires external audioBufferToWav function implementation if used globally
        if (typeof audioBufferToWav !== 'function') {
            console.warn('audioBufferToWav not globally available. Skipping connection test generator.');
            return false;
        }

        const wavBlob = audioBufferToWav(audioBuffer);
        const testFile = new File([wavBlob], 'test.wav', { type: 'audio/wav' });

        // Test with Groq
        const form = new FormData();
        form.append('file', testFile);
        form.append('model', 'whisper-large-v3');
        form.append('language', 'es');
        form.append('response_format', 'text');

        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${window.GROQ_API_KEY}` },
            body: form
        });

        return res.ok;
    } catch (error) {
        console.error('Test connection failed:', error);
        return false;
    } finally {
        // Close AudioContext to prevent resource leaks
        if (audioContext) {
            audioContext.close();
        }
    }
}
