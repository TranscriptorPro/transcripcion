// ============ APPLY TEMPLATE BUTTON (Normal Mode) — dropdown ============

(function initEditorNormalTemplateUtils() {
    const applyTemplateBtn = document.getElementById('btnApplyTemplate');
    const normalTemplateDropdown = document.getElementById('normalTemplateDropdown');
    const normalTemplateList = document.getElementById('normalTemplateList');

    function buildStaticTemplate(templateName, rawText) {
        const nd = '<span class="no-data-field" contenteditable="false" data-field-empty="1"><span class="no-data-text">[No especificado]</span><button class="no-data-edit-btn" tabindex="0" title="Revisión" type="button">▶</button></span>';
        return `<h1 class="report-h1">${templateName}</h1>
<h2 class="report-h2">Datos del Paciente</h2>
<p class="report-p"><strong>Nombre:</strong> ${nd} &nbsp; <strong>DNI:</strong> ${nd}</p>
<p class="report-p"><strong>Edad:</strong> ${nd} &nbsp; <strong>Sexo:</strong> ${nd}</p>
<h2 class="report-h2">Transcripción</h2>
${rawText.split('\n').filter(l => l.trim()).map(line => `<p class="report-p">${line}</p>`).join('\n')}
<h2 class="report-h2">Conclusión</h2>
<p class="report-p">${nd}</p>`;
    }

    async function applyNormalTemplate(templateKey) {
        if (window._applyingTemplate) return;
        window._applyingTemplate = true;

        normalTemplateDropdown.style.display = 'none';
        const editorEl = document.getElementById('editor');
        const rawText = editorEl ? editorEl.innerText : '';

        if (!rawText.trim()) {
            if (typeof showToast === 'function') showToast('No hay texto para aplicar plantilla', 'error');
            return;
        }
        if (typeof MEDICAL_TEMPLATES === 'undefined') return;

        const template = MEDICAL_TEMPLATES[templateKey];
        const templateName = template ? template.name : 'General';

        const _tclone = document.createElement('div');
        _tclone.innerHTML = editorEl.innerHTML;
        _tclone.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
        window._lastRawTranscription = _tclone.innerText;

        const hasKey = window.GROQ_API_KEY;
        const canUseAI = hasKey && typeof structureTranscription === 'function';

        if (canUseAI) {
            if (applyTemplateBtn) applyTemplateBtn.disabled = true;
            const aiBar = document.getElementById('aiProgressBar');
            if (aiBar) aiBar.style.display = 'block';
            try {
                const rawMarkdown = await structureTranscription(rawText, templateKey);
                const { body, note } = parseAIResponse(rawMarkdown);
                editorEl.innerHTML = body;
                window._lastStructuredHTML = body;
                if (typeof showAINote === 'function') showAINote(note, templateName);
                const btnR = document.getElementById('btnRestoreOriginal');
                if (btnR) {
                    btnR.style.display = '';
                    btnR._showingOriginal = false;
                    btnR.innerHTML = '↩ Original';
                    btnR.classList.remove('toggle-active');
                }
                const btnM = document.getElementById('btnMedicalCheck');
                if (btnM) btnM.style.display = '';
                if (typeof window.updateWordCount === 'function') window.updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada con IA`, 'success');
                if (typeof triggerPatientDataCheck === 'function') triggerPatientDataCheck(rawText);
            } catch (_) {
                editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
                if (typeof window.updateWordCount === 'function') window.updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
            } finally {
                window._applyingTemplate = false;
                if (applyTemplateBtn) applyTemplateBtn.disabled = false;
                const aiBar2 = document.getElementById('aiProgressBar');
                if (aiBar2) aiBar2.style.display = 'none';
            }
        } else {
            editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
            window._applyingTemplate = false;
        }
    }

    if (applyTemplateBtn && normalTemplateDropdown) {
        applyTemplateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = normalTemplateDropdown.style.display !== 'none';
            normalTemplateDropdown.style.display = isOpen ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            if (normalTemplateDropdown) normalTemplateDropdown.style.display = 'none';
        });

        if (normalTemplateList) {
            normalTemplateList.addEventListener('click', (e) => {
                const item = e.target.closest('li[data-value]');
                if (!item) return;
                e.stopPropagation();
                applyNormalTemplate(item.dataset.value);
            });
        }
    }

    window.applyNormalTemplate = applyNormalTemplate;
})();
