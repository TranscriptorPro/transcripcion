// ============ EDITOR: MODAL EDITAR CAMPO [No especificado] ============

(function initEditorFieldModalUtils() {
    // ── Etapa 5: Sugerencias dinámicas por nombre de campo ──────────────────
    const _fieldSuggestions = {
        sexo: ['Masculino', 'Femenino'],
        'genero': ['Masculino', 'Femenino'],
        edad: ['Pediatrico', 'Adulto', 'Adulto mayor'],
        preparacion: ['Ayuno de 8 hs', 'Sin preparacion especial', 'Ayuno de 6 hs', 'Vejiga llena'],
        acceso: ['Oral', 'Nasal', 'Transanal', 'Transvaginal', 'Suprapubico'],
        'via de acceso': ['Oral', 'Nasal', 'Transanal'],
        tecnica: ['Convencional', 'Helicoidal', 'Multicorte', 'Con gadolinio'],
        contraste: ['Sin contraste', 'Con contraste EV iodado', 'Con gadolinio', 'Oral y EV'],
        'medio de contraste': ['Sin contraste', 'Con contraste EV', 'Oral'],
        sedacion: ['Sin sedacion', 'Con sedacion', 'Anestesia general'],
        anestesia: ['Local', 'General', 'Raquidea', 'Sin anestesia'],
        indicacion: ['Control', 'Screening', 'Dolor', 'Seguimiento post-quirurgico', 'Estadificacion'],
        motivo: ['Control periodico', 'Dolor', 'Estudio de rutina', 'Seguimiento'],
        'motivo de consulta': ['Dolor', 'Control', 'Disnea', 'Fiebre', 'Mareos'],
        'motivo de estudio': ['Control', 'Dolor abdominal', 'Screening', 'Seguimiento'],
        lateralidad: ['Derecha', 'Izquierda', 'Bilateral'],
        localizacion: ['Superior', 'Inferior', 'Anterior', 'Posterior', 'Central', 'Periferico'],
        tamano: ['Pequeno', 'Mediano', 'Grande'],
        margenes: ['Regulares', 'Irregulares', 'Bien definidos', 'Mal definidos'],
        ecogenicidad: ['Anecoico', 'Hipoecoico', 'Isoecoico', 'Hiperecoico', 'Heterogeneo'],
        densidad: ['Hipodensa', 'Isodensa', 'Hiperdensa', 'Heterogenea'],
        senal: ['Hiperintensa en T2', 'Hipointensa en T1', 'Isointensa', 'Heterogenea'],
        contorno: ['Regular', 'Irregular', 'Lobulado'],
        ritmo: ['Sinusal', 'Fibrilacion auricular', 'Irregular'],
        frecuencia: ['Normal', 'Taquicardia', 'Bradicardia'],
        'funcion sistolica': ['Conservada', 'Levemente reducida', 'Moderadamente reducida', 'Severamente reducida'],
        antecedentes: ['Sin antecedentes relevantes', 'HTA', 'DBT', 'Dislipidemia', 'Tabaquismo'],
        medicacion: ['Sin medicacion actual', 'Antihipertensivos', 'Anticoagulantes'],
        alergias: ['Sin alergias conocidas', 'Alergia a iodo', 'Alergia a penicilina'],
        'estado general': ['Bueno', 'Regular', 'Malo'],
        evolucion: ['Favorable', 'Estable', 'Desfavorable', 'Sin cambios significativos'],
        plan: ['Control en 6 meses', 'Control en 1 ano', 'Derivar a especialista', 'Completar estudios'],
        conducta: ['Control ambulatorio', 'Internacion', 'Interconsulta', 'Alta medica'],
        diagnostico: ['A confirmar', 'Presuntivo', 'Confirmado']
    };

    const _FIELD_HISTORY_KEY = 'field_value_history';
    let _fldHistCache = null;
    if (typeof appDB !== 'undefined') {
        appDB.get(_FIELD_HISTORY_KEY).then(function(v) { _fldHistCache = v || {}; }).catch(function() {});
    }

    function _getFieldHistory() {
        if (_fldHistCache !== null) return _fldHistCache;
        try { return JSON.parse(localStorage.getItem(_FIELD_HISTORY_KEY)) || {}; } catch (_) { return {}; }
    }

    function _saveFieldValue(fieldName, value) {
        if (!fieldName || !value || value.length < 2 || value.length > 100) return;
        const h = _getFieldHistory();
        const key = fieldName.toLowerCase().trim();
        if (!h[key]) h[key] = [];
        if (!h[key].includes(value)) {
            h[key].unshift(value);
            if (h[key].length > 8) h[key] = h[key].slice(0, 8);
        }
        _fldHistCache = h;
        if (typeof appDB !== 'undefined') appDB.set(_FIELD_HISTORY_KEY, h);
        else { try { localStorage.setItem(_FIELD_HISTORY_KEY, JSON.stringify(h)); } catch (_) {} }
    }

    function _renderDynamicChips(fieldName) {
        const container = document.getElementById('efDynamicChips');
        if (!container) return;
        container.innerHTML = '';
        if (!fieldName) { container.style.display = 'none'; return; }

        const key = fieldName.toLowerCase().trim();
        const suggestions = new Map();

        const history = _getFieldHistory()[key] || [];
        history.forEach(v => suggestions.set(v, 'history'));

        const dictKey = Object.keys(_fieldSuggestions).find(k => key.includes(k) || k.includes(key));
        if (dictKey) {
            _fieldSuggestions[dictKey].forEach(v => { if (!suggestions.has(v)) suggestions.set(v, 'dict'); });
        }

        if (suggestions.size === 0) { container.style.display = 'none'; return; }

        suggestions.forEach((source, val) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline btn-sm ef-quick-btn';
            btn.dataset.val = val;
            btn.textContent = val;
            btn.style.fontSize = '0.75rem';
            btn.style.padding = '0.2rem 0.55rem';
            if (source === 'history') {
                btn.style.borderColor = 'var(--primary)';
                btn.style.color = 'var(--primary)';
                btn.title = 'Usado anteriormente';
            } else {
                btn.style.borderColor = 'var(--border)';
                btn.title = 'Sugerencia';
            }
            container.appendChild(btn);
        });

        container.style.display = 'flex';
    }

    const modal = document.getElementById('editFieldModal');
    const editor = document.getElementById('editor');
    const overlay = modal;
    if (!modal) return;

    let _targetSpan = null;
    let _efRecorder = null;
    let _efChunks = [];
    let _efRecordInterval = null;
    let _efRecording = false;
    let _fieldReviewAttempt = 0;

    const isPro = () => !!(window.GROQ_API_KEY) &&
        (typeof CLIENT_CONFIG === 'undefined' ||
         CLIENT_CONFIG.type === 'ADMIN' ||
         CLIENT_CONFIG.hasProMode === true);

    function openEditFieldModal(span) {
        _targetSpan = span;

        const para = span.closest('p,li') || span.parentElement;
        const ctx = document.getElementById('editFieldContext');
        if (ctx && para) {
            const full = para.innerText || para.textContent;
            ctx.textContent = full.length > 90 ? full.slice(0, 87) + '...' : full;
        }

        const title = document.getElementById('editFieldModalTitle');
        if (title && para) {
            let labelText = '';
            for (const node of para.childNodes) {
                if (node === span || (node.nodeType === 1 && node.contains && node.contains(span))) break;
                labelText += node.textContent || '';
            }
            labelText = labelText.trim().replace(/:+\s*$/, '').trim();
            const colonIdx = labelText.lastIndexOf(':');
            if (colonIdx >= 0) labelText = labelText.slice(colonIdx + 1).trim();
            if (labelText.length > 40) labelText = labelText.slice(0, 40) + '...';
            title.textContent = labelText
                ? '▶ ' + labelText.charAt(0).toUpperCase() + labelText.slice(1)
                : '▶ Revisión de campo';
        }

        document.getElementById('efTextInput').value = '';
        document.getElementById('efRecordResult').value = '';
        document.getElementById('efTranscribeStatus').textContent = '';
        document.getElementById('efRecordTime').textContent = '00:00';
        _stopRecordingEF();
        _fieldReviewAttempt = 0;
        const btnRev = document.getElementById('btnReviewFieldAI');
        if (btnRev) btnRev.textContent = '▶ Revisión IA';

        _switchTab('write');
        const fieldLabel = title ? title.textContent.replace(/^[▶✏️]\s*/, '').trim() : '';
        _renderDynamicChips(fieldLabel);

        overlay.classList.add('active');
        setTimeout(() => document.getElementById('efTextInput').focus(), 80);
    }

    function closeEditFieldModal() {
        _stopRecordingEF();
        overlay.classList.remove('active');
        _targetSpan = null;
    }

    function applyFieldValue(val) {
        if (!_targetSpan) return;
        const text = (val || '').trim();
        if (!text) { closeEditFieldModal(); return; }

        const titleEl = document.getElementById('editFieldModalTitle');
        const fieldLabel = titleEl ? titleEl.textContent.replace(/^[▶✏️]\s*/, '').trim() : '';
        if (fieldLabel && text !== 's/p' && text !== 'Sin particularidades' && text !== 'No evaluado') {
            _saveFieldValue(fieldLabel, text);
        }

        const node = document.createTextNode(text);
        _targetSpan.replaceWith(node);
        if (editor) editor.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
    }

    function _switchTab(tab) {
        const isWrite = tab === 'write';
        const tabWrite = document.getElementById('efTabWrite');
        const tabRecord = document.getElementById('efTabRecord');
        document.getElementById('efPanelWrite').style.display = isWrite ? '' : 'none';
        document.getElementById('efPanelRecord').style.display = isWrite ? 'none' : '';
        tabWrite.style.background = isWrite ? 'var(--primary)' : 'var(--bg-card)';
        tabWrite.style.color = isWrite ? '#fff' : 'var(--text-primary)';

        const _isProCtx = window.currentMode === 'pro'
            || (typeof CLIENT_CONFIG !== 'undefined' && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));
        if (!_isProCtx) {
            tabRecord.classList.remove('btn-pro-animated');
            tabRecord.style.background = 'var(--bg-card)';
            tabRecord.style.color = 'var(--text-secondary)';
            tabRecord.style.opacity = '0.55';
            tabRecord.style.cursor = 'not-allowed';
            tabRecord.disabled = true;
        } else if (isWrite) {
            tabRecord.disabled = false;
            tabRecord.style.opacity = '1';
            tabRecord.style.cursor = 'pointer';
            tabRecord.classList.add('btn-pro-animated');
        } else {
            tabRecord.disabled = false;
            tabRecord.style.opacity = '1';
            tabRecord.style.cursor = 'pointer';
            tabRecord.classList.remove('btn-pro-animated');
            tabRecord.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
            tabRecord.style.color = '#fff';
        }
    }

    document.getElementById('efTabWrite')?.addEventListener('click', () => _switchTab('write'));
    document.getElementById('efTabRecord')?.addEventListener('click', () => {
        const _isProClick = window.currentMode === 'pro'
            || (typeof CLIENT_CONFIG !== 'undefined' && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));
        if (!_isProClick) {
            showToast('🔒 Funcion disponible solo en Modo Pro', 'info');
            return;
        }
        if (!isPro()) { showToast('🔑 API Key requerida para grabar y transcribir', 'info'); return; }
        _switchTab('record');
    });

    document.getElementById('efPanelWrite')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.ef-quick-btn');
        if (!btn) return;
        applyFieldValue(btn.dataset.val);
    });

    function _stopRecordingEF() {
        if (_efRecorder && _efRecording) {
            try { _efRecorder.stop(); } catch (_) {}
        }
        _efRecording = false;
        clearInterval(_efRecordInterval);
        const btn = document.getElementById('efRecordBtn');
        if (btn) {
            document.getElementById('efRecordIcon').textContent = '🎙️';
            document.getElementById('efRecordLabel').textContent = 'Iniciar grabacion';
            btn.classList.remove('recording-pulse');
        }
    }

    function _resolveGroqApiKey() {
        try {
            if (typeof window.getResolvedGroqApiKey === 'function') {
                const k = String(window.getResolvedGroqApiKey() || '').trim();
                if (k) return k;
            }
        } catch (_) {}
        return String(window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '').trim();
    }

    function _cleanFieldReviewOutput(text) {
        let out = String(text || '').trim();
        if (!out) return '';
        out = out
            .replace(/^```[\w-]*\s*/i, '')
            .replace(/```$/i, '')
            .replace(/^[-*]\s+/, '')
            .replace(/^"|"$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Evitar que la IA devuelva encabezados o prefijos explicativos.
        out = out.replace(/^(?:Campo|Resultado|Revisi[oó]n)\s*:\s*/i, '').trim();
        // Unificar variantes de no evaluado.
        if (/^(?:no se evalu[oó]|no fue evaluad[ao]|sin datos disponibles|no evaluad[ao])\.?$/i.test(out)) {
            return '[No especificado]';
        }
        return out;
    }

    function _getTemplateSpecificReviewRules(templateKey) {
        const k = String(templateKey || '').toLowerCase();
        if (!k || k === 'generico') return '';

        if (k === 'gonioscopia') {
            return [
                'Reglas específicas de gonioscopía:',
                '- No inventar hallazgos (Shaffer, pigmentación, dinámica/indentación, iris) si no están en el contexto.',
                '- Prohibido dejar frases truncadas tipo "... es." o "...:.", y prohibido agregar "o no se especificó".',
                '- Si el dato no está explícito, devolver [No especificado].'
            ].join('\n');
        }

        if (k === 'cinecoro' || k === 'ecg' || k === 'holter' || k === 'mapa') {
            return [
                'Reglas específicas cardiológicas:',
                '- Conservar números, unidades, porcentajes y lateralidad exactamente como aparecen.',
                '- No convertir unidades ni reinterpretar el diagnóstico.'
            ].join('\n');
        }

        if (k.includes('eco') || k.includes('ecografia') || k.includes('doppler')) {
            return [
                'Reglas específicas de ecografía/Doppler:',
                '- Mantener descripciones objetivas por estructura, sin inferencias.',
                '- No agregar conclusiones nuevas ni recomendaciones.'
            ].join('\n');
        }

        if (k === 'tac' || k === 'resonancia' || k === 'mamografia' || k === 'pet_ct') {
            return [
                'Reglas específicas de imágenes:',
                '- No agregar topografía anatómica no mencionada.',
                '- Mantener terminología radiológica formal y objetiva.'
            ].join('\n');
        }

        return '';
    }

    async function _runFieldAIReview() {
        if (!_targetSpan) return;
        const key = _resolveGroqApiKey();
        if (!key) {
            if (typeof showToast === 'function') showToast('🔑 API Key requerida para Revisión IA', 'info');
            return;
        }

        const btn = document.getElementById('btnReviewFieldAI');
        const input = document.getElementById('efTextInput');
        const status = document.getElementById('efTranscribeStatus');
        if (!input) return;

        const para = _targetSpan.closest('p, li') || _targetSpan.parentElement;
        const paragraph = String(para?.innerText || para?.textContent || '').trim();
        const titleEl = document.getElementById('editFieldModalTitle');
        const fieldLabel = titleEl ? titleEl.textContent.replace(/^[▶✏️]\s*/, '').trim() : '';
        const draft = String(input.value || '').trim();
        const rawSource = String(window._lastRawTranscription || '').slice(0, 4000);
        const templateKey = String(window.selectedTemplate || 'generico');
        const templateName = window.MEDICAL_TEMPLATES?.[templateKey]?.name || templateKey;
        const templateRules = _getTemplateSpecificReviewRules(templateKey);

        _fieldReviewAttempt += 1;
        if (btn) {
            btn.disabled = true;
            btn.textContent = `⏳ Revisión ${_fieldReviewAttempt}`;
        }
        if (status) status.textContent = `⏳ Ejecutando revisión ${_fieldReviewAttempt}...`;

        try {
            const model = (Array.isArray(window.GROQ_MODELS) && window.GROQ_MODELS[0]) || 'llama-3.1-8b-instant';
            const systemContent = [
                'Eres un asistente de redacción médica.',
                'Tarea: reescribir SOLO un campo clínico puntual de forma objetiva y correcta.',
                'Reglas absolutas:',
                '1) No inventar, no inferir, no agregar datos no presentes.',
                '2) No usar muletillas ni mezclar idiomas. Solo español médico formal.',
                '3) Corregir ortografía, gramática y puntuación. Escribir en modo oración.',
                '4) No alterar números, unidades, porcentajes, lateralidad ni negaciones.',
                '5) Prohibido usar puntos suspensivos, frases incompletas o placeholders inventados.',
                '6) Si el dato no está explícito: responder exactamente [No especificado].',
                '7) Responder solo el texto final del campo, sin encabezados ni explicaciones.',
                templateRules
            ].join('\n');

            const userContent = [
                `Plantilla activa: ${templateName}`,
                `Campo objetivo: ${fieldLabel || '[Sin etiqueta]'}`,
                `Borrador actual del campo: ${draft || '[Vacío]'}`,
                `Párrafo de contexto: ${paragraph || '[Sin contexto]'}`,
                `Fuente original transcripta (referencia): ${rawSource || '[No disponible]'}`,
                'Devuelve una única frase o valor de campo final.'
            ].join('\n\n');

            const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemContent },
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.1
                })
            });

            if (!res.ok) throw new Error(`HTTP_${res.status}`);
            const data = await res.json();
            const rawOut = data?.choices?.[0]?.message?.content || '';
            const revised = _cleanFieldReviewOutput(rawOut);
            if (!revised) throw new Error('EMPTY_REVIEW');

            input.value = revised;
            input.focus();
            if (status) status.textContent = `✅ Revisión ${_fieldReviewAttempt} lista. Si querés otra pasada, pulsá nuevamente.`;
            if (typeof showToast === 'function') showToast(`✅ Revisión ${_fieldReviewAttempt} aplicada al borrador`, 'success');
        } catch (err) {
            if (status) status.textContent = '❌ No se pudo revisar el campo. Reintentá.';
            if (typeof showToast === 'function') showToast('❌ Error en Revisión IA del campo', 'error');
            console.warn('Field AI review error:', err);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '▶ Revisión IA';
            }
        }
    }

    document.getElementById('efRecordBtn')?.addEventListener('click', async () => {
        if (!_efRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                _efChunks = [];
                _efRecorder = new MediaRecorder(stream);
                _efRecorder.ondataavailable = e => _efChunks.push(e.data);
                _efRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    const realMime = _efRecorder.mimeType || 'audio/webm';
                    const ext = realMime.includes('ogg') ? 'ogg' : 'webm';
                    const blob = new Blob(_efChunks, { type: realMime });
                    const file = new File([blob], `campo.${ext}`, { type: realMime });
                    const status = document.getElementById('efTranscribeStatus');
                    const result = document.getElementById('efRecordResult');
                    if (status) status.textContent = '⏳ Transcribiendo...';
                    try {
                        let txt = await window.transcribeAudioSimple(file);
                        if (typeof window.cleanTranscriptionText === 'function') {
                            txt = window.cleanTranscriptionText(txt);
                        }
                        if (result) result.value = txt.trim();
                        if (status) status.textContent = txt
                            ? '✅ Transcripcion lista. Edita si es necesario y pulsa Aplicar.'
                            : '🔇 No se detecto dictado claro. Intenta de nuevo.';
                    } catch (_) {
                        if (status) status.textContent = '❌ Error al transcribir. Intenta de nuevo.';
                    }
                };
                _efRecorder.start();
                _efRecording = true;
                const start = Date.now();
                _efRecordInterval = setInterval(() => {
                    const d = Date.now() - start;
                    const s = Math.floor((d / 1000) % 60);
                    const m = Math.floor(d / 60000);
                    const el = document.getElementById('efRecordTime');
                    if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }, 1000);
                document.getElementById('efRecordIcon').textContent = '⏹️';
                document.getElementById('efRecordLabel').textContent = 'Detener grabacion';
                document.getElementById('efRecordBtn').classList.add('recording-pulse');
            } catch (_) {
                showToast('No se pudo acceder al microfono', 'error');
            }
        } else {
            _stopRecordingEF();
        }
    });

    function clearFieldValue() {
        // "Dejar en blanco" — cierra el modal sin tocar el badge; el campo sigue editable.
        closeEditFieldModal();
    }
    document.getElementById('btnReviewFieldAI')?.addEventListener('click', _runFieldAIReview);
    document.getElementById('btnBlankEditField')?.addEventListener('click', clearFieldValue);

    function removeOrphanSectionHeadings() {
        if (!editor) return;
        editor.querySelectorAll('h2.report-h2, h3.report-h3').forEach((heading) => {
            let node = heading.nextElementSibling;
            let hasContent = false;
            while (node && !/^H[23]$/.test(node.tagName)) {
                const txt = String(node.textContent || '').replace(/[\u00A0\s]+/g, '').trim();
                const hasEmptyField = !!node.querySelector?.('.no-data-field');
                if (txt || hasEmptyField) {
                    hasContent = true;
                    break;
                }
                node = node.nextElementSibling;
            }
            if (!hasContent) heading.remove();
        });
    }

    function _performFieldDeletion(span) {
        if (!span || !editor) return;

        // Si el span ya no pertenece al DOM vivo del editor, no hay nada que borrar.
        if (!editor.contains(span)) {
            closeEditFieldModal();
            return;
        }

        const para = span.closest('p, li');
        span.remove();

        // Limpiar residuo de etiqueta en el contenedor padre.
        if (para && editor.contains(para)) {
            // Si quedan otros badges, no tocar la línea.
            if (!para.querySelector('.no-data-field')) {
                const remaining = String(para.textContent || '')
                    .replace(/[\u00A0]+/g, ' ').trim();
                // Quitar patrones "Etiqueta:" y ver si queda contenido útil.
                const noLabels = remaining
                    .replace(/[\w\u00C0-\u024F]+\s*:/g, '')
                    .replace(/[,;.\s\u2014\u2013-]+/g, '')
                    .trim();
                if (!noLabels) {
                    para.remove();
                }
            }
        }

        removeOrphanSectionHeadings();

        editor.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
        if (typeof showToast === 'function') showToast('🗑️ Campo eliminado del informe', 'info');
    }

    document.getElementById('btnDeleteFieldSection')?.addEventListener('click', () => {
        // Capturar la referencia ANTES de abrir el diálogo de confirmación asíncrono.
        const spanRef = _targetSpan;
        if (!spanRef) return;
        const sectionName = document.getElementById('editFieldModalTitle')?.textContent?.replace(/^[▶✏️]\s*/, '') || 'este campo';
        window.showCustomConfirm(
            '🗑️ Eliminar campo',
            `¿Eliminar "${sectionName}" del informe? Esta accion no se puede deshacer.`,
            () => _performFieldDeletion(spanRef)
        );
    });

    document.getElementById('btnConfirmEditField')?.addEventListener('click', () => {
        const writePanel = document.getElementById('efPanelWrite');
        const isWrite = writePanel && writePanel.style.display !== 'none';
        const val = isWrite
            ? document.getElementById('efTextInput').value
            : document.getElementById('efRecordResult').value;
        applyFieldValue(val);
    });

    document.getElementById('btnCancelEditField')?.addEventListener('click', closeEditFieldModal);
    document.getElementById('closeEditFieldModal')?.addEventListener('click', closeEditFieldModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEditFieldModal(); });

    document.getElementById('efTextInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('btnConfirmEditField').click();
        }
        if (e.key === 'Escape') closeEditFieldModal();
    });

    if (editor) {
        editor.addEventListener('click', (e) => {
            const btn = e.target.closest('.no-data-edit-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const span = btn.closest('.no-data-field');
                if (span) openEditFieldModal(span);
            }
        });
    }

    window._openEditFieldModal = openEditFieldModal;
    window._closeEditFieldModal = closeEditFieldModal;
})();
