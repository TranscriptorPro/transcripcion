// App State
let currentMode = 'normal'; // 'normal' or 'pro'
let appState = 'IDLE'; // IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED → PREVIEWED
let selectedTemplate = 'generico';

// Data State
let uploadedFiles = [];
let transcriptions = [];
let activeTabIndex = 0;
let isProcessing = false;

// Editor State
let undoStack = [];
let redoStack = [];

// Recording State
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingInterval = null;
let recordingStartTime = 0;
