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
