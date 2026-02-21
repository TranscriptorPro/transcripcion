// ============ RECORDING ============
const recordBtn = document.getElementById('recordBtn');
const recordBtnText = document.getElementById('recordBtnText');
const recordBtnIcon = document.getElementById('recordBtnIcon');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTime = document.getElementById('recordingTime');

if (recordBtn) recordBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (!window.isRecording) {
        // Start Recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            window.mediaRecorder = new MediaRecorder(stream);
            window.audioChunks = [];

            window.mediaRecorder.ondataavailable = event => {
                window.audioChunks.push(event.data);
            };

            window.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(window.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const fileName = `Grabación ${new Date().toLocaleTimeString().replace(/:/g, '-')}.wav`;
                const file = new File([audioBlob], fileName, { type: 'audio/wav' });

                handleFiles([file]);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            window.mediaRecorder.start();
            window.isRecording = true;
            updateRecordingUI(true);

            // Timer
            window.recordingStartTime = Date.now();
            window.recordingInterval = setInterval(() => {
                const diff = Date.now() - window.recordingStartTime;
                const seconds = Math.floor((diff / 1000) % 60);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            if (typeof showToast !== 'undefined') showToast('No se pudo acceder al micrófono. Verifica los permisos.', 'error');
        }
    } else {
        // Stop Recording
        window.mediaRecorder.stop();
        window.isRecording = false;
        updateRecordingUI(false);
        clearInterval(window.recordingInterval);
        recordingTime.textContent = '00:00';
    }
}

function updateRecordingUI(recording) {
    const dropZone = document.getElementById('dropZone');

    if (recording) {
        if (recordBtn) recordBtn.classList.add('recording-pulse');
        if (recordBtnIcon) recordBtnIcon.textContent = '🔴';
        if (recordBtnText) recordBtnText.textContent = 'Detener Grabación';
        if (recordingStatus) recordingStatus.classList.add('active');
        if (dropZone) dropZone.style.opacity = '0.5';
        if (dropZone) dropZone.style.pointerEvents = 'none';
    } else {
        if (recordBtn) recordBtn.classList.remove('recording-pulse');
        if (recordBtnIcon) recordBtnIcon.textContent = '🎙️';
        if (recordBtnText) recordBtnText.textContent = 'Grabar Audio';
        if (recordingStatus) recordingStatus.classList.remove('active');
        if (dropZone) dropZone.style.opacity = '1';
        if (dropZone) dropZone.style.pointerEvents = 'all';
    }
}

// ============ FILE HANDLING ============
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

if (dropZone) {
    dropZone.addEventListener('click', () => fileInput && fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
}
if (fileInput) {
    fileInput.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
    const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm|flac)$/i.test(f.name));

    if (!audioFiles.length) {
        if (typeof showToast !== 'undefined') showToast('Selecciona archivos de audio válidos', 'error');
        return;
    }

    const validFiles = audioFiles.filter(f => f.size <= 25 * 1024 * 1024);
    if (validFiles.length < audioFiles.length) {
        if (typeof showToast !== 'undefined') showToast('Archivos >25MB ignorados', 'error');
    }

    window.uploadedFiles.push(...validFiles.map(f => ({ file: f, status: 'pending' })));
    if (typeof updateFileList === 'function') updateFileList();

    const transcribeBtn = document.getElementById('transcribeBtn');
    if (transcribeBtn) transcribeBtn.disabled = false;
    if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('FILES_LOADED');
}

window.updateFileList = function () {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    fileList.innerHTML = window.uploadedFiles.map((item, i) => `
    <div class="file-item">
        <div class="file-item-icon ${item.status}">
            <svg viewBox="0 0 24 24"><path d="${item.status === 'done' ? 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z' : 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4-1.79 4-4V7h4V3h-6z'}"/></svg>
        </div>
        <div class="file-item-info">
            <div class="file-item-name">${item.file.name}</div>
            <div class="file-item-status">${formatSize(item.file.size)} • ${item.status === 'done' ? '✓ Listo' : item.status === 'processing' ? 'Procesando...' : 'Pendiente'}</div>
        </div>
        ${!window.isProcessing ? `<button class="file-item-remove" onclick="removeFile(${i})"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>` : ''}
    </div>
`).join('');
}

window.removeFile = i => {
    window.uploadedFiles.splice(i, 1);
    updateFileList();

    const transcribeBtn = document.getElementById('transcribeBtn');
    if (transcribeBtn) transcribeBtn.disabled = !window.uploadedFiles.length;

    if (!window.uploadedFiles.length) {
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('IDLE');
    }
};

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}


// ============ AUDIO PROCESSING ============

window.processAudio = async function (file) {
    const chkNormalize = document.getElementById('chkNormalize');
    const chkNoise = document.getElementById('chkNoise');

    const shouldNormalize = chkNormalize?.checked || false;
    const shouldReduceNoise = chkNoise?.checked || false;
    const shouldCompress = false; // Feature disabled (checkbox removed in PR #5)

    // If no processing is needed, return original file
    if (!shouldNormalize && !shouldReduceNoise && !shouldCompress) {
        return file;
    }

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create offline context for processing
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        let currentNode = source;

        // Normalize (gain adjustment)
        if (shouldNormalize) {
            const gainNode = offlineContext.createGain();
            // Find peak and normalize
            let peak = 0;
            for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
                const data = audioBuffer.getChannelData(c);
                for (let i = 0; i < data.length; i++) {
                    peak = Math.max(peak, Math.abs(data[i]));
                }
            }
            gainNode.gain.value = peak > 0 ? 0.95 / peak : 1;
            currentNode.connect(gainNode);
            currentNode = gainNode;
        }

        // Noise reduction (high-pass filter to remove low-frequency noise)
        if (shouldReduceNoise) {
            const highpass = offlineContext.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 80; // Remove frequencies below 80Hz
            currentNode.connect(highpass);
            currentNode = highpass;

            // Also add a subtle lowpass to remove high-frequency hiss
            const lowpass = offlineContext.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 12000;
            currentNode.connect(lowpass);
            currentNode = lowpass;
        }

        // Compressor for dynamic range
        if (shouldCompress) {
            const compressor = offlineContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            currentNode.connect(compressor);
            currentNode = compressor;
        }

        currentNode.connect(offlineContext.destination);
        source.start(0);

        const renderedBuffer = await offlineContext.startRendering();

        // Convert to WAV blob
        const wavBlob = audioBufferToWav(renderedBuffer);
        return new File([wavBlob], file.name.replace(/\.[^/.]+$/, '.wav'), { type: 'audio/wav' });

    } catch (error) {
        console.warn('Audio processing failed, using original:', error);
        return file;
    }
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const offset = 44;
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numChannels; c++) {
            const sample = Math.max(-1, Math.min(1, channels[c][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset + (i * blockAlign) + (c * bytesPerSample), intSample, true);
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Expose audioBufferToWav globally so testGroqConnection() in transcriptor.js can use it
window.audioBufferToWav = audioBufferToWav;
