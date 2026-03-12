// ============ TEMPLATE CATEGORIES & HELPERS ============

window.TEMPLATE_CATEGORIES = {
    "Neumología": ["espirometria", "test_marcha", "pletismografia", "oximetria_nocturna"],
    "Oftalmología": ["campimetria", "oct_retinal", "topografia_corneal", "fondo_ojo", "gonioscopia"],
    "Imágenes": ["tac", "resonancia", "mamografia", "densitometria", "pet_ct", "radiografia", "ecografia_abdominal", "ecografia_renal", "ecografia_tiroidea", "ecografia_mamaria", "eco_doppler"],
    "Endoscopía": ["gastroscopia", "colonoscopia", "broncoscopia", "laringoscopia"],
    "Cardiología": ["gammagrafia_cardiaca", "holter", "mapa", "cinecoro", "ecg", "eco_stress", "ett"],
    "Ginecología": ["pap", "colposcopia", "ecografia_obstetrica"],
    "Neurología": ["electromiografia", "polisomnografia"],
    "ORL": ["naso", "endoscopia_otologica"],
    "Quirúrgico": ["protocolo_quirurgico"],
    "General": ["nota_evolucion", "epicrisis", "generico"]
};

window.detectStudyType = function (text) {
    let maxScore = 0;
    let detectedType = 'generico';
    const lowerText = text.toLowerCase();

    for (const [key, template] of Object.entries(window.MEDICAL_TEMPLATES)) {
        if (!template.keywords || template.keywords.length === 0) continue;
        let score = 0;
        template.keywords.forEach(keyword => {
            if (lowerText.includes(keyword.toLowerCase())) {
                score++;
            }
        });
        if (score > maxScore) {
            maxScore = score;
            detectedType = key;
        }
    }

    return { type: detectedType, confidence: maxScore };
}

window.populateTemplateDropdown = function () {
    // Filtro por allowedTemplates: si el array tiene elementos, solo muestra esas claves
    const _allowed = (typeof CLIENT_CONFIG !== 'undefined' &&
        Array.isArray(CLIENT_CONFIG.allowedTemplates) &&
        CLIENT_CONFIG.allowedTemplates.length)
        ? new Set(CLIENT_CONFIG.allowedTemplates)
        : null;

    const buildDropdown = (selectEl) => {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="generico">📋 Plantilla General</option>';
        const catIcons = {
            "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
            "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
            "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
        };
        for (const [cat, keys] of Object.entries(window.TEMPLATE_CATEGORIES)) {
            const group = document.createElement('optgroup');
            group.label = `${catIcons[cat] || ''} ${cat}`;
            let added = false;
            keys.forEach(key => {
                if (key === 'generico') return;
                if (_allowed && !_allowed.has(key)) return; // Bloque 4: filtro
                const t = window.MEDICAL_TEMPLATES[key];
                if (!t) return;
                const option = document.createElement('option');
                option.value = key;
                option.textContent = t.name;
                group.appendChild(option);
                added = true;
            });
            if (added) selectEl.appendChild(group);
        }
    };

    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) buildDropdown(templateSelect);

    const toolbarDropdown = document.getElementById('templateDropdownMain');
    if (toolbarDropdown) buildDropdown(toolbarDropdown);

    const normalSelect = document.getElementById('normalTemplateSelect');
    if (normalSelect) buildDropdown(normalSelect);

    // Build custom styled list for normal-mode template dropdown
    const normalList = document.getElementById('normalTemplateList');
    if (normalList) {
        const catIcons = {
            "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
            "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
            "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
        };
        normalList.innerHTML = '';
        // General option
        const generalItem = document.createElement('li');
        generalItem.dataset.value = 'generico';
        generalItem.textContent = '📋 Plantilla General';
        generalItem.className = 'tmpl-list-general';
        normalList.appendChild(generalItem);

        for (const [cat, keys] of Object.entries(window.TEMPLATE_CATEGORIES || {})) {
            const hasItems = keys.some(key => key !== 'generico' && window.MEDICAL_TEMPLATES[key] && (!_allowed || _allowed.has(key)));
            if (!hasItems) continue;
            const header = document.createElement('li');
            header.textContent = `${catIcons[cat] || ''} ${cat}`;
            header.className = 'tmpl-list-header';
            normalList.appendChild(header);
            keys.forEach(key => {
                if (key === 'generico') return;
                if (_allowed && !_allowed.has(key)) return; // Bloque 4: filtro
                const t = window.MEDICAL_TEMPLATES[key];
                if (!t) return;
                const item = document.createElement('li');
                item.dataset.value = key;
                item.textContent = t.name;
                item.className = 'tmpl-list-item';
                normalList.appendChild(item);
            });
        }
    }
}
