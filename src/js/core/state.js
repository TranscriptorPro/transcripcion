// ============ GLOBAL APP STATE ============
// All variables are attached to window so they are accessible
// from every script module without scope conflicts.

// App State
window.currentMode = 'normal'; // 'normal' or 'pro'
window.appState = 'IDLE'; // IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED → PREVIEWED
window.selectedTemplate = 'generico';

// Data State
window.uploadedFiles = [];
window.transcriptions = [];
window.activeTabIndex = 0;
window.isProcessing = false;

// Editor State
window.undoStack = [];
window.redoStack = [];

// Recording State
window.mediaRecorder = null;
window.audioChunks = [];
window.isRecording = false;
window.recordingInterval = null;
window.recordingStartTime = 0;

// API Key State - initialize async from IndexedDB (appDB already queues calls while IDB opens)
window.GROQ_API_KEY = '';
window._groqApiKeyMeta = { ts: 0, source: 'bootstrap' };

window.normalizeGroqApiKey = function (key) {
    const raw = String(key || '').trim();
    if (!raw) return '';
    if (/^gsk_/i.test(raw)) {
        return 'gsk_' + raw.slice(4);
    }
    return raw;
};

window.setGroqApiKey = function (key, opts) {
    const options = opts || {};
    const source = options.source || 'unknown';
    const allowEmpty = options.allowEmpty === true;
    const nowTs = Date.now();
    const normalized = (typeof window.normalizeGroqApiKey === 'function')
        ? window.normalizeGroqApiKey(key)
        : String(key || '').trim();
    const current = String(window.GROQ_API_KEY || '').trim();

    // Anti-race: never downgrade an existing key with an empty late write.
    if (!allowEmpty && !normalized && current) return current;

    window.GROQ_API_KEY = normalized;
    window._groqApiKeyMeta = { ts: nowTs, source: source };

    try { localStorage.setItem('groq_api_key', normalized); } catch (_) {}
    if (typeof appDB !== 'undefined') {
        try { appDB.set('groq_api_key', normalized); } catch (_) {}
    }
    return normalized;
};

window.getResolvedGroqApiKey = function () {
    const runtime = (typeof window.normalizeGroqApiKey === 'function')
        ? window.normalizeGroqApiKey(window.GROQ_API_KEY || '')
        : String(window.GROQ_API_KEY || '').trim();
    const stored = (typeof window.normalizeGroqApiKey === 'function')
        ? window.normalizeGroqApiKey(localStorage.getItem('groq_api_key') || '')
        : String(localStorage.getItem('groq_api_key') || '').trim();
    const resolved = runtime || stored;
    if (resolved && resolved !== runtime) {
        window.GROQ_API_KEY = resolved;
    }
    return resolved;
};

window.clearGroqApiKey = function (source) {
    return window.setGroqApiKey('', { source: source || 'clear', allowEmpty: true });
};

// Prefer localStorage immediately for first paint, then reconcile appDB async without clobbering.
window.getResolvedGroqApiKey();
if (typeof appDB !== 'undefined') {
    appDB.get('groq_api_key').then(function(v) {
        window.setGroqApiKey(v || '', { source: 'appDB-init', allowEmpty: false });
    }).catch(function() {});
}
