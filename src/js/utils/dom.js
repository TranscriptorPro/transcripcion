const $ = id => document.getElementById(id);

// RA-5: Helper seguro para leer JSON de appDB/IndexedDB (evita crash por datos corruptos)
window.safeJSONParse = async function(key, fallback) {
    try {
        const val = await appDB.get(key);
        return (val !== undefined && val !== null) ? val : fallback;
    }
    catch (_) { return fallback; }
};

// RC-1: Helper: fetch con AbortController + timeout de seguridad
// Evita que la UI quede "zombificada" si Groq no responde.
window.fetchWithTimeout = function(url, options, timeoutMs = 120000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

// ============ NORMALIZACIÓN DE TEXTO — MODO ORACIÓN ============
// Convierte texto a modo oración respetando:
//  - Nombres propios (en campos de nombre cada palabra capitalizada)
//  - Siglas médicas (CVF, VEF1, TAC, ECG, IAM, HTA, etc.) se mantienen en MAYÚSCULAS
//  - Primera letra de oración en mayúscula; después de punto, mayúscula
//  - Preposiciones y artículos en minúscula (excepto inicio de oración)

(function() {
    // Siglas médicas + generales que deben preservarse en MAYÚSCULAS
    const SIGLAS = new Set([
        'CVF','VEF1','VEF','FEV1','FEV','PEF','TAC','ECG','EEG','EMG','RMN','RM','RX',
        'IAM','HTA','DBT','DM','DM2','IC','FA','FV','TV','BAV','HIV','VIH','HCV','HBV',
        'EPOC','ACV','TEP','TVP','IRC','IRA','IMC','PA','FC','FR','SAT','SPO2','PO2',
        'PCO2','PH','HB','HTO','GB','PLT','VSG','PCR','LDH','CPK','GOT','GPT','TGO','TGP',
        'GGT','FAL','BT','BD','BI','TSH','T3','T4','PSA','CA','AFP','CEA','HDL','LDL',
        'VLDL','TG','EAB','OD','OI','AO','AV','PIO','DIU','CC','ML','MG','KG','MM','CM',
        'MEQ','UI','AINE','ATB','ABD','CIV','CRV','DA','DP','ETT','ETE','VI','VD','AI','AD',
        'FEVI','TAPSE','PSAP','FOP','CIA','CIV','DAP','VCS','VCI','AP','TP','AR','IT','EM',
        'NYHA','KPS','ECOG','ASA','PEEP','FIO2','CPAP','BIPAP','IV','VO','IM','SC','SL','EV',
        'DNI','NHC','HC','ID','OSDE','IAPOS','IOMA','PAMI','SOS',
        'LIC','ING','MP','MN'
    ]);

    // Palabras pequeñas que van en minúscula (salvo inicio de oración)
    const LOWER_WORDS = new Set([
        'de','del','la','las','los','el','en','con','sin','por','para','al','a','y','e',
        'o','u','ni','que','su','sus'
    ]);

    /**
     * Normaliza texto a modo oración.
     * @param {string} text — texto a normalizar
     * @param {string} [mode='sentence'] — 'sentence' | 'name' (cada palabra capitalizada)
     * @returns {string}
     */
    window.normalizeFieldText = function(text, mode) {
        if (!text || typeof text !== 'string') return (text != null) ? String(text) : '';
        const t = text.trim();
        if (!t) return '';

        // Si todo mayúsculas y parece sigla corta (≤6 chars) → no tocar
        if (t.length <= 6 && /^[A-Z0-9]+$/.test(t)) return t;

        return mode === 'name' ? _normalizeName(t) : _normalizeSentence(t);
    };

    function _isUpperSigla(word) {
        const clean = word.replace(/[.,;:!?()]+$/g, '');
        // Solo siglas explícitas del set
        if (SIGLAS.has(clean.toUpperCase())) return true;
        // Mayúsculas con números intercalados (VEF1, T4, PO2, FIO2, etc.)
        if (/^[A-Z]+\d+[A-Z]*$/i.test(clean) && clean.length <= 6) return true;
        // Con punto: D.N.I., M.P.
        if (/^([A-Z]\.){2,}[A-Z]?$/i.test(clean)) return true;
        return false;
    }

    function _normalizeProfessionalTitleToken(word) {
        const m = String(word || '').match(/^([dD][rR][aA]?)(\.?)([,:;!?)]*)$/);
        if (!m) return null;
        const base = m[1].toLowerCase() === 'dra' ? 'Dra.' : 'Dr.';
        return base + (m[3] || '');
    }

    function _capitalizeWord(word) {
        if (!word) return '';
        const profTitle = _normalizeProfessionalTitleToken(word);
        if (profTitle) return profTitle;
        if (_isUpperSigla(word)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    function _normalizeName(text) {
        return text.split(/\s+/).map((w, i) => {
            if (_isUpperSigla(w)) return w.toUpperCase();
            if (i > 0 && LOWER_WORDS.has(w.toLowerCase())) return w.toLowerCase();
            return _capitalizeWord(w);
        }).join(' ');
    }

    function _normalizeSentence(text) {
        // Separar por oraciones (punto + espacio o inicio)
        const sentences = text.split(/(?<=\.)\s+/);
        return sentences.map(sent => {
            const words = sent.split(/\s+/);
            return words.map((w, i) => {
                const profTitle = _normalizeProfessionalTitleToken(w);
                if (profTitle) return profTitle;
                if (_isUpperSigla(w)) return w.toUpperCase();
                if (i === 0) return _capitalizeWord(w);
                if (LOWER_WORDS.has(w.toLowerCase())) return w.toLowerCase();
                return w.toLowerCase();
            }).join(' ');
        }).join(' ');
    }

    /**
     * Regla global de presentacion profesional:
     * - Nunca duplicar prefijos (Dr./Dra. Dr./Dra.)
     * - Si el nombre ya trae prefijo, se limpia y se recompone una sola vez
     * - Si no hay sexo/prefijo, usa Dr. por defecto
     */
    window.getProfessionalDisplay = function(rawName, sexo) {
        const original = String(rawName || '').trim();
        let baseName = original;

        // Limpia cualquier prefijo repetido al inicio (Dr., Dra., Dr./Dra.)
        const leadingPrefix = /^(?:\s*(?:dr\.?\s*\/\s*dra\.?|dra\.?|dr\.?))\s+/i;
        let loops = 0;
        while (leadingPrefix.test(baseName) && loops < 6) {
            baseName = baseName.replace(leadingPrefix, '').trim();
            loops += 1;
        }

        const sx = String(sexo || '').trim().toUpperCase();
        let title = '';
        if (sx === 'F') title = 'Dra.';
        else if (sx === 'M') title = 'Dr.';
        else if (/^\s*dra\.?/i.test(original)) title = 'Dra.';
        else if (/^\s*dr\.?/i.test(original)) title = 'Dr.';
        else title = 'Dr.';

        const safeName = (baseName || original || 'Profesional').replace(/\s+/g, ' ').trim();
        const fullName = `${title} ${safeName}`.replace(/\s+/g, ' ').trim();
        return { title, name: safeName, fullName };
    };
})();

// ============ AUTO-NORMALIZACIÓN DE CAMPOS DE FORMULARIO ============
// Aplica normalización modo oración/nombre al salir de cualquier campo de texto
(function() {
    // Campos que se normalizan como NOMBRE (cada palabra capitalizada)
    const NAME_FIELDS = new Set([
        'reqPatientName', 'profName', 'profNombre', 'nombreProfesional',
        'workplace', 'lugarTrabajo'
    ]);

    // Campos que se fuerzan a MAYÚSCULAS completas
    const UPPER_FIELDS = new Set([
        'reqPatientInsurance'
    ]);

    // Campos que NO se normalizan
    const SKIP_FIELDS = new Set([
        'reqPatientSearch', 'reqPatientDni', 'reqPatientAge',
        'reqPatientAffiliateNum', 'apiKeyInput', 'registrySearch',
        'groqApiKey', 'deviceId', 'fieldSearchInput'
    ]);

    function shouldNormalize(el) {
        if (!el || !el.id) return false;
        if (SKIP_FIELDS.has(el.id)) return false;
        if (el.type === 'number' || el.type === 'email' || el.type === 'password' || el.type === 'url') return false;
        if (el.tagName === 'SELECT') return false;
        if (el.readOnly || el.disabled) return false;
        return true;
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Event delegation en blur (capture) para todos los inputs del documento
        document.addEventListener('blur', (e) => {
            const el = e.target;
            if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
            if (!shouldNormalize(el)) return;
            const val = el.value.trim();
            if (!val) return;

            if (UPPER_FIELDS.has(el.id)) {
                if (val !== val.toUpperCase()) el.value = val.toUpperCase();
                return;
            }

            const mode = NAME_FIELDS.has(el.id) ? 'name' : 'sentence';
            const normalized = window.normalizeFieldText(val, mode);
            if (normalized !== val) {
                el.value = normalized;
            }
        }, true); // capture phase
    });
})();
