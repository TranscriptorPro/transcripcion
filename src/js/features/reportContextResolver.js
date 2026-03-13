// ============ REPORT CONTEXT RESOLVER ============
// Fuente unica de datos para preview/print/download/email.

(function initReportContextResolver() {
    function _safeParseJson(raw, fallback) {
        try { return JSON.parse(raw); } catch (_) { return fallback; }
    }

    function _cleanDoctorName(name) {
        return String(name || '').replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '').trim();
    }

    function _sanitizeInsuranceName(rawInsurance, affiliateNum) {
        let val = String(rawInsurance || '').trim();
        const aff = String(affiliateNum || '').trim();
        if (!val) return '';

        // Quita fragmentos tipo "N° AFILIADO: 12345" o similares.
        val = val.replace(/\bN\s*[°ºo]?\s*AFILIAD[OA]\b\s*:?\s*[A-Z0-9\-\.\/]+/gi, ' ');

        // Si por extracción quedó el número dentro de cobertura, lo elimina.
        if (aff) {
            const escAff = aff.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            val = val.replace(new RegExp(`(^|\\s|[(:-])${escAff}(?=\\s|$|[),.;:-])`, 'g'), ' ');
        }

        return val.replace(/\s{2,}/g, ' ').replace(/[\s,;:\-]+$/g, '').trim();
    }

    function _reqValue(id) {
        return document.getElementById(id)?.value?.trim() || '';
    }

    function _reqChecked(id, fallback) {
        const el = document.getElementById(id);
        if (!el) return fallback;
        return !!el.checked;
    }

    function _isGenericStudyType(value) {
        const s = String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        if (!s) return true;
        return s === 'informe medico general'
            || s === 'informe medico'
            || s === 'informe general'
            || s === 'informe generico'
            || s === 'generico'
            || s === 'general';
    }

    function _extractStudyTypeFromEditor(editorEl) {
        if (!editorEl) return '';

        const h = editorEl.querySelector('h1, h2, h3, .report-h1, .report-h2');
        const txt = String(h?.textContent || '').trim();
        const m = txt.match(/^\s*INFORME\s+DE\s+(.+)$/i);
        if (m && m[1]) return m[1].trim();

        const plain = String(editorEl.innerText || '');
        const m2 = plain.match(/\bINFORME\s+DE\s+([^\n]+)/i);
        return m2 && m2[1] ? m2[1].trim() : '';
    }

    function _toDateDisplay(isoDate) {
        if (!isoDate) return '';
        try {
            return new Date(isoDate + 'T12:00').toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch (_) {
            return '';
        }
    }

    async function _loadConfigSafe() {
        if (window._pdfConfigCache && typeof window._pdfConfigCache === 'object') {
            return window._pdfConfigCache;
        }
        if (typeof appDB !== 'undefined' && typeof appDB.get === 'function') {
            try {
                const v = await appDB.get('pdf_config');
                if (v && typeof v === 'object') return v;
            } catch (_) {}
        }
        return _safeParseJson(localStorage.getItem('pdf_config') || '{}', {});
    }

    async function _loadProfDataSafe() {
        if (window._profDataCache && typeof window._profDataCache === 'object') {
            return window._profDataCache;
        }
        if (typeof appDB !== 'undefined' && typeof appDB.get === 'function') {
            try {
                const v = await appDB.get('prof_data');
                if (v && typeof v === 'object') return v;
            } catch (_) {}
        }
        return _safeParseJson(localStorage.getItem('prof_data') || '{}', {});
    }

    async function _loadWorkplacesSafe() {
        if (Array.isArray(window._wpProfilesCache)) return window._wpProfilesCache;
        if (typeof appDB !== 'undefined' && typeof appDB.get === 'function') {
            try {
                const v = await appDB.get('workplace_profiles');
                if (Array.isArray(v)) return v;
            } catch (_) {}
        }
        return _safeParseJson(localStorage.getItem('workplace_profiles') || '[]', []);
    }

    window.resolveReportContext = async function resolveReportContext(options) {
        const opts = options || {};
        const editorEl = opts.editorEl || window.editor || document.getElementById('editor');

        const config = await _loadConfigSafe();
        const profData = await _loadProfDataSafe();
        const workplaces = await _loadWorkplacesSafe();

        const extracted = (opts.includeEditorExtract !== false
            && editorEl
            && typeof window.extractPatientDataFromText === 'function')
            ? window.extractPatientDataFromText(editorEl.innerText || '')
            : {};

        const patientName = extracted.name || config.patientName || _reqValue('reqPatientName') || _reqValue('pdfPatientName');
        const patientDni = extracted.dni || config.patientDni || _reqValue('reqPatientDni') || _reqValue('pdfPatientDni');
        const patientAge = extracted.age || config.patientAge || _reqValue('reqPatientAge') || _reqValue('pdfPatientAge');
        const patientSex = extracted.sex || config.patientSex || _reqValue('reqPatientSex') || _reqValue('pdfPatientSex');
        const patientAffiliateNum = extracted.affiliateNum || config.patientAffiliateNum || _reqValue('reqPatientAffiliateNum') || _reqValue('pdfPatientAffiliateNum');
        const patientInsuranceRaw = extracted.insurance || config.patientInsurance || _reqValue('reqPatientInsurance') || _reqValue('pdfPatientInsurance');
        const patientInsurance = _sanitizeInsuranceName(patientInsuranceRaw, patientAffiliateNum);

        const showStudyDate = _reqChecked('reqShowStudyDate', config.showStudyDate !== false);
        const showStudyTime = _reqChecked('reqShowStudyTime', config.showStudyTime !== false);

        const studyDateRaw = config.studyDate || _reqValue('reqStudyDate') || _reqValue('pdfStudyDate') || '';
        const studyDateDisplay = showStudyDate ? _toDateDisplay(studyDateRaw) : '';

        const studyTime = showStudyTime
            ? (config.studyTime || _reqValue('reqStudyTime') || _reqValue('pdfStudyTime') || '')
            : '';

        const tplKey = window.selectedTemplate || config.selectedTemplate || '';
        const tplName = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
        const headingStudyType = _extractStudyTypeFromEditor(editorEl);
        const baseStudyType = config.studyType || _reqValue('reqStudyType') || tplName || '';
        const studyType = _isGenericStudyType(baseStudyType)
            ? (headingStudyType || tplName || baseStudyType)
            : baseStudyType;

        const rawRefDoctor = _cleanDoctorName(config.referringDoctor || _reqValue('reqReferringDoctor') || '');
        const referringDoctorDisplay = rawRefDoctor ? ('Dr./a ' + rawRefDoctor) : '';

        const reportNum = _reqValue('pdfReportNumber') || config.reportNum || '';
        const hideReportHeader = (String(window.CLIENT_CONFIG?.type || '').toUpperCase() !== 'CLINIC')
            && (config.hideReportHeader === true);

        const activePro = config.activeProfessional || null;
        const wpIdx = (config.activeWorkplaceIndex !== undefined && config.activeWorkplaceIndex !== null)
            ? Number(config.activeWorkplaceIndex)
            : (config.selectedWorkplace !== undefined && config.selectedWorkplace !== null && config.selectedWorkplace !== ''
                ? Number(config.selectedWorkplace)
                : 0);
        const activeWorkplace = Array.isArray(workplaces) ? workplaces[wpIdx] : null;

        return {
            config,
            profData,
            workplaces,
            extracted,
            editorEl,
            activeProfessional: activePro,
            activeWorkplace,
            patientName,
            patientDni,
            patientAge,
            patientSex,
            patientInsurance,
            patientAffiliateNum,
            studyType,
            studyDateRaw,
            studyDateDisplay,
            showStudyDate,
            showStudyTime,
            studyTime,
            studyReason: config.studyReason || _reqValue('reqStudyReason') || '',
            referringDoctorRaw: rawRefDoctor,
            referringDoctorDisplay,
            reportNum,
            footerText: config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.',
            showDateInFooter: (config.showDate ?? true) === true,
            hideReportHeader,
            selectedTemplateKey: tplKey,
            selectedTemplateName: tplName
        };
    };
})();
