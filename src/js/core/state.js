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
if (typeof appDB !== 'undefined') {
    appDB.get('groq_api_key').then(function(v) { window.GROQ_API_KEY = v || ''; }).catch(function() {});
}
