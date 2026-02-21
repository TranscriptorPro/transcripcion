/* {{CONFIG_IDENTITY}} */
const CLIENT_CONFIG = {
    type: 'ADMIN',        // ADMIN, TRIAL, NORMAL, PRO
    status: 'active',
    specialties: ['ALL'], // ALL = todas las especialidades
    maxDevices: Infinity,
    trialDays: 0,
    hasProMode: true,
    hasDashboard: true,
    canGenerateApps: true
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * FUNCIÓN DE ACCESO GLOBAL:
 * Esta función permite que el transcriptor obtenga la llave 
 * guardada en el navegador de forma segura.
 */
window.getGroqApiKey = function() {
    return localStorage.getItem('groq_api_key') || '';
};