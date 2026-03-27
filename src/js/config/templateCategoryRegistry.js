// ============ SHARED TEMPLATE CATEGORY REGISTRY ============
(function () {
    'use strict';

    const ADMIN_TEMPLATES_STORAGE_KEY = 'admin_templates_config';

    const baseTemplateMapByCategory = {
        'Neumología': [
            { key: 'espirometria', name: 'Espirometría' },
            { key: 'test_marcha', name: 'Test Marcha 6 min' },
            { key: 'pletismografia', name: 'Pletismografía' },
            { key: 'oximetria_nocturna', name: 'Oximetría Nocturna' }
        ],
        'Oftalmología': [
            { key: 'campimetria', name: 'Campimetría' },
            { key: 'oct_retinal', name: 'OCT Retinal' },
            { key: 'topografia_corneal', name: 'Topografía Corneal' },
            { key: 'fondo_ojo', name: 'Fondo de Ojo' },
            { key: 'gonioscopia', name: 'Gonioscopía' }
        ],
        'Imágenes': [
            { key: 'tac', name: 'TAC' },
            { key: 'resonancia', name: 'Resonancia' },
            { key: 'mamografia', name: 'Mamografía' },
            { key: 'densitometria', name: 'Densitometría' },
            { key: 'pet_ct', name: 'PET-CT' },
            { key: 'radiografia', name: 'Radiografía' },
            { key: 'ecografia_abdominal', name: 'Ecografía Abdominal' },
            { key: 'ecografia_renal', name: 'Ecografía Renal' },
            { key: 'ecografia_tiroidea', name: 'Ecografía Tiroidea' },
            { key: 'ecografia_mamaria', name: 'Ecografía Mamaria' },
            { key: 'eco_doppler', name: 'Eco-Doppler' }
        ],
        'Endoscopía': [
            { key: 'gastroscopia', name: 'Gastroscopía' },
            { key: 'colonoscopia', name: 'Colonoscopía' },
            { key: 'broncoscopia', name: 'Broncoscopía' },
            { key: 'laringoscopia', name: 'Laringoscopía' }
        ],
        'Cardiología': [
            { key: 'gammagrafia_cardiaca', name: 'Gammagrafía Cardíaca' },
            { key: 'holter', name: 'Holter' },
            { key: 'mapa', name: 'MAPA' },
            { key: 'cinecoro', name: 'Cinecoronariografía' },
            { key: 'ecg', name: 'ECG' },
            { key: 'eco_stress', name: 'Eco-Stress' },
            { key: 'ett', name: 'Ecocardiograma TT' },
            { key: 'ergometria', name: 'Ergometría' },
            { key: 'eco_te', name: 'Ecocardiograma TE' }
        ],
        'Ginecología': [
            { key: 'pap', name: 'PAP' },
            { key: 'colposcopia', name: 'Colposcopía' },
            { key: 'ecografia_obstetrica', name: 'Ecografía Obstétrica' },
            { key: 'eco_gineco', name: 'Eco Ginecológica (TVS)' },
            { key: 'histeroscopia', name: 'Histeroscopía' }
        ],
        'Neurología': [
            { key: 'electromiografia', name: 'Electromiografía' },
            { key: 'polisomnografia', name: 'Polisomnografía' },
            { key: 'eeg', name: 'EEG' },
            { key: 'potenciales_evocados', name: 'Potenciales Evocados' }
        ],
        'ORL': [
            { key: 'naso', name: 'Nasofibroscopía' },
            { key: 'endoscopia_otologica', name: 'Endoscopía Otológica' }
        ],
        'Quirúrgico': [
            { key: 'protocolo_quirurgico', name: 'Protocolo Quirúrgico' }
        ],
        'General': [
            { key: 'nota_evolucion', name: 'Nota de Evolución' },
            { key: 'epicrisis', name: 'Epicrisis' },
            { key: 'generico', name: 'Informe Genérico' }
        ],
        'Urología': [
            { key: 'uroflujometria', name: 'Uroflujometría' }
        ],
        'Traumatología / Ortopedia': [
            { key: 'artroscopia', name: 'Artroscopía' },
            { key: 'eco_musculoesqueletica', name: 'Eco Musculoesquelética' }
        ],
        'Dermatología': [
            { key: 'dermatoscopia', name: 'Dermatoscopía' }
        ]
    };

    const baseFormSpecialtyToTemplateCategories = {
        'Cardiología': ['Cardiología'],
        'Ecografía General': ['Imágenes'],
        'Eco-Doppler Vascular': ['Imágenes'],
        'Diagnóstico por Imágenes': ['Imágenes'],
        'Gastroenterología / Endoscopía': ['Endoscopía'],
        'ORL (Otorrinolaringología)': ['ORL'],
        'Ginecología': ['Ginecología'],
        'Obstetricia': [],
        'Neumonología / Neumología': ['Neumología'],
        'Neurología': ['Neurología'],
        'Oftalmología': ['Oftalmología'],
        'Cirugía / Quirúrgico': ['Quirúrgico'],
        'Medicina General / Interna': ['General'],
        'Traumatología / Ortopedia': ['Traumatología / Ortopedia'],
        'Dermatología': ['Dermatología'],
        'Endocrinología': [],
        'Urología': ['Urología']
    };

    const runtime = {
        templateMapByCategory: {},
        templateKeysByCategory: {},
        studiesByCategory: {},
        formSpecialtyToTemplateCategories: {},
        adminTemplatesConfig: { version: 1, templates: [], updatedAt: null }
    };

    function _safeParseJSON(raw, fallback) {
        if (!raw || typeof raw !== 'string') return fallback;
        try {
            return JSON.parse(raw);
        } catch (_) {
            return fallback;
        }
    }

    function _clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function _slugKey(input) {
        return String(input || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_{2,}/g, '_');
    }

    function _normalizeKeywords(input) {
        if (Array.isArray(input)) {
            return input.map((k) => String(k || '').trim()).filter(Boolean);
        }
        return String(input || '')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
    }

    function _normalizeAdminTemplate(entry, baseCategoryFallback) {
        const key = _slugKey(entry && entry.key);
        const name = String((entry && entry.name) || '').trim();
        const category = String((entry && entry.category) || baseCategoryFallback || '').trim();
        const keywords = _normalizeKeywords(entry && entry.keywords);
        const prompt = String((entry && entry.prompt) || '').trim();
        const disabled = !!(entry && entry.disabled);

        if (!key) throw new Error('La plantilla debe tener key');
        if (!name) throw new Error('La plantilla debe tener nombre');
        if (!category) throw new Error('La plantilla debe tener categoría');

        return {
            key,
            name,
            category,
            keywords,
            prompt,
            disabled,
            updatedAt: new Date().toISOString()
        };
    }

    function _replaceObjectContents(target, source) {
        Object.keys(target).forEach((k) => delete target[k]);
        Object.entries(source).forEach(([k, v]) => {
            target[k] = v;
        });
    }

    function _loadAdminTemplatesConfig() {
        const parsed = _safeParseJSON(localStorage.getItem(ADMIN_TEMPLATES_STORAGE_KEY), null);
        if (!parsed || typeof parsed !== 'object') {
            return { version: 1, templates: [], updatedAt: null };
        }
        const templates = Array.isArray(parsed.templates) ? parsed.templates : [];
        return {
            version: 1,
            templates,
            updatedAt: parsed.updatedAt || null
        };
    }

    function _saveAdminTemplatesConfig(nextConfig) {
        const payload = {
            version: 1,
            templates: Array.isArray(nextConfig && nextConfig.templates) ? nextConfig.templates : [],
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(ADMIN_TEMPLATES_STORAGE_KEY, JSON.stringify(payload));
        return payload;
    }

    function _buildRuntimeState(adminCfg) {
        const baseMap = _clone(baseTemplateMapByCategory);
        const byKey = {};

        Object.entries(baseMap).forEach(([cat, list]) => {
            (list || []).forEach((item) => {
                byKey[item.key] = { category: cat, item };
            });
        });

        const normalizedTemplates = [];
        const incoming = Array.isArray(adminCfg && adminCfg.templates) ? adminCfg.templates : [];

        incoming.forEach((entry) => {
            const baseInfo = byKey[entry && entry.key];
            const normalized = _normalizeAdminTemplate(entry, baseInfo && baseInfo.category);
            normalizedTemplates.push(normalized);

            if (baseInfo) {
                const oldCategory = baseInfo.category;
                const oldList = baseMap[oldCategory] || [];
                const idx = oldList.findIndex((x) => x.key === normalized.key);
                if (idx >= 0) oldList.splice(idx, 1);
                if (!oldList.length) delete baseMap[oldCategory];
                delete byKey[normalized.key];
            }

            if (normalized.disabled) return;

            if (!baseMap[normalized.category]) baseMap[normalized.category] = [];
            baseMap[normalized.category].push({ key: normalized.key, name: normalized.name });
            byKey[normalized.key] = {
                category: normalized.category,
                item: { key: normalized.key, name: normalized.name }
            };
        });

        const templateKeysByCategory = Object.fromEntries(
            Object.entries(baseMap).map(([cat, list]) => [cat, list.map((t) => t.key)])
        );
        const studiesByCategory = Object.fromEntries(
            Object.entries(baseMap).map(([cat, list]) => [cat, list.map((t) => t.name)])
        );

        return {
            templateMapByCategory: baseMap,
            templateKeysByCategory,
            studiesByCategory,
            formSpecialtyToTemplateCategories: _clone(baseFormSpecialtyToTemplateCategories),
            adminTemplatesConfig: {
                version: 1,
                templates: normalizedTemplates,
                updatedAt: (adminCfg && adminCfg.updatedAt) || null
            }
        };
    }

    function _applyRuntimeToMedicalTemplates() {
        if (!window.MEDICAL_TEMPLATES) return;
        const templates = runtime.adminTemplatesConfig.templates || [];

        templates.forEach((entry) => {
            if (entry.disabled) return;
            const existing = window.MEDICAL_TEMPLATES[entry.key] || {};
            const fallbackPrompt = window.MEDICAL_TEMPLATES.generico && window.MEDICAL_TEMPLATES.generico.prompt
                ? window.MEDICAL_TEMPLATES.generico.prompt
                : 'Estructura este texto médico con redacción profesional y precisión terminológica.';

            window.MEDICAL_TEMPLATES[entry.key] = Object.assign({}, existing, {
                name: entry.name,
                keywords: entry.keywords && entry.keywords.length ? entry.keywords : (existing.keywords || []),
                prompt: entry.prompt || existing.prompt || fallbackPrompt
            });
        });
    }

    function _refreshRuntime() {
        const loadedConfig = _loadAdminTemplatesConfig();
        const next = _buildRuntimeState(loadedConfig);
        _replaceObjectContents(runtime.templateMapByCategory, next.templateMapByCategory);
        _replaceObjectContents(runtime.templateKeysByCategory, next.templateKeysByCategory);
        _replaceObjectContents(runtime.studiesByCategory, next.studiesByCategory);
        _replaceObjectContents(runtime.formSpecialtyToTemplateCategories, next.formSpecialtyToTemplateCategories);
        runtime.adminTemplatesConfig = next.adminTemplatesConfig;
        _applyRuntimeToMedicalTemplates();
    }

    function _persistAndRefresh(configLike) {
        _saveAdminTemplatesConfig(configLike || { templates: [] });
        _refreshRuntime();
        return _clone(runtime.adminTemplatesConfig);
    }

    function _getBaseTemplateKeySet() {
        const set = {};
        Object.values(baseTemplateMapByCategory).forEach((list) => {
            (list || []).forEach((tpl) => {
                set[tpl.key] = true;
            });
        });
        return set;
    }

    const baseTemplateKeySet = _getBaseTemplateKeySet();

    _refreshRuntime();

    function upsertAdminTemplate(templateDef) {
        const current = _clone(runtime.adminTemplatesConfig);
        const normalized = _normalizeAdminTemplate(templateDef);
        const idx = current.templates.findIndex((t) => t.key === normalized.key);
        if (idx >= 0) current.templates[idx] = normalized;
        else current.templates.push(normalized);
        return _persistAndRefresh(current);
    }

    function removeAdminTemplate(templateKey) {
        const key = _slugKey(templateKey);
        const current = _clone(runtime.adminTemplatesConfig);
        current.templates = current.templates.filter((t) => t.key !== key);
        return _persistAndRefresh(current);
    }

    function saveAdminTemplatesConfig(config) {
        const input = (config && typeof config === 'object') ? config : {};
        const rawTemplates = Array.isArray(input.templates) ? input.templates : [];
        const normalizedTemplates = rawTemplates.map((entry) => {
            const baseInfo = _findTemplateByKey(entry && entry.key);
            return _normalizeAdminTemplate(entry, baseInfo && baseInfo.category);
        });
        return _persistAndRefresh({ templates: normalizedTemplates });
    }

    function resetAdminTemplatesConfig() {
        localStorage.removeItem(ADMIN_TEMPLATES_STORAGE_KEY);
        _refreshRuntime();
        return _clone(runtime.adminTemplatesConfig);
    }

    function _findTemplateByKey(templateKey) {
        const key = _slugKey(templateKey);
        for (const [category, list] of Object.entries(runtime.templateMapByCategory)) {
            const hit = (list || []).find((tpl) => tpl.key === key);
            if (hit) return { category, template: hit };
        }
        return null;
    }

    window.TP_TEMPLATE_CATEGORY_REGISTRY = {
        baseTemplateMapByCategory: _clone(baseTemplateMapByCategory),
        templateMapByCategory: runtime.templateMapByCategory,
        templateKeysByCategory: runtime.templateKeysByCategory,
        studiesByCategory: runtime.studiesByCategory,
        formSpecialtyToTemplateCategories: runtime.formSpecialtyToTemplateCategories,
        getAdminTemplatesConfig: function () {
            return _clone(runtime.adminTemplatesConfig);
        },
        saveAdminTemplatesConfig,
        upsertAdminTemplate,
        removeAdminTemplate,
        resetAdminTemplatesConfig,
        isBaseTemplateKey: function (templateKey) {
            return !!baseTemplateKeySet[_slugKey(templateKey)];
        },
        findTemplateByKey: _findTemplateByKey,
        applyToMedicalTemplates: _applyRuntimeToMedicalTemplates,
        refreshRuntimeRegistry: _refreshRuntime
    };
})();
