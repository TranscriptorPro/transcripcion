// ============ TRANSCRIPTOR WHISPER PROMPT UTILS ============

window.TranscriptorWhisperPromptUtils = window.TranscriptorWhisperPromptUtils || {};

window.TranscriptorWhisperPromptUtils.buildWhisperPrompt = async function buildWhisperPromptCore() {
    const MAX_PROMPT_CHARS = 800; // Whisper acepta hasta ~224 tokens de prompt
    const studies = (typeof window.STUDY_TERMINOLOGY !== 'undefined') ? window.STUDY_TERMINOLOGY : [];

    function termsFromStudy(study) {
        if (!study) return '';
        const parts = [];
        if (study.keywords) parts.push(...study.keywords);
        if (study.abreviaturas) {
            for (const [abbr, full] of Object.entries(study.abreviaturas)) {
                parts.push(abbr, full);
            }
        }
        if (study.clasificaciones) parts.push(...study.clasificaciones);
        return parts.join(', ');
    }

    function termsFromCategory(category) {
        const matches = studies.filter(s =>
            s.category && s.category.toLowerCase() === category.toLowerCase()
        );
        if (matches.length === 0) return '';
        const allTerms = new Set();
        matches.forEach(s => {
            (s.keywords || []).forEach(k => allTerms.add(k));
            Object.keys(s.abreviaturas || {}).forEach(a => allTerms.add(a));
            Object.values(s.abreviaturas || {}).forEach(v => allTerms.add(v));
        });
        return [...allTerms].join(', ');
    }

    function specialtyToCategory(especialidades) {
        if (!especialidades) return null;
        const spec = especialidades.toLowerCase();
        const map = {
            'cardiolog': 'Cardiología',
            'neumolog': 'Neumología',
            'neumonolog': 'Neumología',
            'oftalmolog': 'Oftalmología',
            'gastroenterolog': 'Endoscopía',
            'orl': 'ORL',
            'otorrinolaring': 'ORL',
            'ginecolog': 'Ginecología',
            'obstetr': 'Obstetricia',
            'neurolog': 'Neurología',
            'urolog': 'Urología',
            'dermatolog': 'Dermatología',
            'cirug': 'Quirúrgico',
            'imágen': 'Imágenes',
            'imagen': 'Imágenes',
            'ecograf': 'Imágenes'
        };
        for (const [key, cat] of Object.entries(map)) {
            if (spec.includes(key)) return cat;
        }
        return null;
    }

    let promptTerms = '';
    let source = 'universal';

    const selectedTpl = (typeof window.selectedTemplate !== 'undefined') ? window.selectedTemplate : null;
    if (selectedTpl && selectedTpl !== 'generico') {
        const study = studies.find(s => s.templateKey === selectedTpl);
        if (study) {
            promptTerms = termsFromStudy(study);
            source = 'plantilla: ' + study.estudio;
        }
    }

    if (!promptTerms) {
        try {
            const profiles = (await appDB.get('output_profiles')) || [];
            const pdfCfg = (await appDB.get('pdf_config')) || {};
            let activeProfile = profiles.find(p => p.isDefault);
            if (!activeProfile && pdfCfg.activeWorkplaceIndex !== undefined) {
                activeProfile = profiles.find(p =>
                    p.workplaceIndex === String(pdfCfg.activeWorkplaceIndex) &&
                    p.professionalIndex === String(pdfCfg.activeProfessionalIndex || '0')
                );
            }
            if (activeProfile && activeProfile.name) {
                const studyPart = activeProfile.name.replace(/^[^\w]*/, '').split('—')[0].trim();
                if (studyPart) {
                    const normStudy = studyPart.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const match = studies.find(s => {
                        const normEst = s.estudio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        return normEst.includes(normStudy) || normStudy.includes(normEst) ||
                            normStudy.includes(s.templateKey.replace(/_/g, ' '));
                    });
                    if (match) {
                        promptTerms = termsFromStudy(match);
                        source = 'perfil: ' + match.estudio;
                    }
                }
            }
        } catch (_) {}
    }

    if (!promptTerms) {
        try {
            const pdfCfg = (await appDB.get('pdf_config')) || {};
            const prof = pdfCfg.activeProfessional;
            if (prof && prof.especialidades) {
                const specs = prof.especialidades.split(',').map(s => s.trim());
                const categories = new Set();
                specs.forEach(sp => {
                    const cat = specialtyToCategory(sp);
                    if (cat) categories.add(cat);
                });
                if (categories.size > 0) {
                    const allTerms = [...categories].map(c => termsFromCategory(c)).filter(Boolean);
                    promptTerms = allTerms.join(', ');
                    source = 'especialidad: ' + specs.join(', ');
                }
            }
        } catch (_) {}
    }

    if (!promptTerms) {
        promptTerms = [
            'paciente', 'antecedentes', 'diagnóstico', 'tratamiento', 'evolución',
            'hipertensión arterial', 'diabetes mellitus', 'dislipemia', 'tabaquismo',
            'disnea', 'odinofagia', 'disfagia', 'disfonía', 'tos', 'fiebre',
            'ecocardiograma', 'espirometría', 'electrocardiograma', 'ecografía',
            'colonoscopía', 'endoscopía', 'laringoscopía', 'broncoscopía',
            'resonancia magnética', 'tomografía', 'mamografía', 'densitometría',
            'fracción de eyección', 'ventrículo izquierdo', 'aurícula izquierda',
            'cuerdas vocales', 'mucosa', 'pólipo', 'nódulo', 'estenosis',
            'insuficiencia', 'hipertrofia', 'derrame', 'edema', 'inflamación',
            'biopsia', 'anatomía patológica', 'citología', 'histología',
            'sin particularidades', 'dentro de límites normales', 'se observa',
            'milímetros', 'centímetros', 'frecuencia cardíaca', 'presión arterial',
            'saturación de oxígeno', 'bilateral', 'unilateral', 'proximal', 'distal'
        ].join(', ');
        source = 'universal';
    }

    const prefix = 'Transcripción médica en español: ';
    const maxTerms = MAX_PROMPT_CHARS - prefix.length;
    if (promptTerms.length > maxTerms) {
        promptTerms = promptTerms.substring(0, maxTerms).replace(/,\s*[^,]*$/, '');
    }

    const finalPrompt = prefix + promptTerms;
    console.log(`[Whisper Prompt] Fuente: ${source} (${finalPrompt.length} chars)`);
    return finalPrompt;
};
