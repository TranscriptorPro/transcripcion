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

    const _hasInlineReviewPlan = () =>
        (typeof CLIENT_CONFIG !== 'undefined'
            && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));

    // Early-init: ensure the flag is set before any decoration runs
    if (typeof window.inlineParagraphReviewEnabled !== 'boolean') {
        try {
            const _p = JSON.parse(localStorage.getItem('settings_prefs') || '{}');
            window.inlineParagraphReviewEnabled = _p.inlineParagraphReview === true;
        } catch (_) {
            window.inlineParagraphReviewEnabled = false;
        }
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

    function _removeFieldHistoryEntry(fieldName, value) {
        if (!fieldName || !value) return;
        const h = _getFieldHistory();
        const key = fieldName.toLowerCase().trim();
        if (!h[key]) return;
        h[key] = h[key].filter(v => v !== value);
        if (h[key].length === 0) delete h[key];
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
                // Wrap with delete button for history items
                const wrap = document.createElement('span');
                wrap.className = 'ef-chip-wrap';
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'ef-chip-del';
                delBtn.title = 'Eliminar sugerencia';
                delBtn.dataset.key = fieldName.toLowerCase().trim();
                delBtn.dataset.val = val;
                delBtn.textContent = '✕';
                wrap.appendChild(btn);
                wrap.appendChild(delBtn);
                container.appendChild(wrap);
            } else {
                btn.style.borderColor = 'var(--border)';
                btn.title = 'Sugerencia';
                container.appendChild(btn);
            }
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

    function _isInlineReviewEnabled() {
        if (!_hasInlineReviewPlan()) return false;
        // Check the visible toggle as ultimate source of truth
        const toggle = document.getElementById('inlineReviewQuickToggle');
        if (toggle) return toggle.checked;
        if (typeof window.inlineParagraphReviewEnabled === 'boolean') return window.inlineParagraphReviewEnabled;
        try {
            const prefs = JSON.parse(localStorage.getItem('settings_prefs') || '{}');
            return prefs.inlineParagraphReview === true;
        } catch (_) {
            return false;
        }
    }

    function _setInlineReviewEnabled(enabled) {
        const value = enabled !== false;
        window.inlineParagraphReviewEnabled = value;
        try {
            const prefs = JSON.parse(localStorage.getItem('settings_prefs') || '{}');
            prefs.inlineParagraphReview = value;
            localStorage.setItem('settings_prefs', JSON.stringify(prefs));
            if (typeof appDB !== 'undefined') appDB.set('settings_prefs', prefs);
        } catch (_) {}
    }

    function _syncQuickToggleUI() {
        const quick = document.getElementById('inlineReviewQuickToggle');
        if (quick) quick.checked = _isInlineReviewEnabled();
    }

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
            // F1-B1/B2: en Modo Normal mostrar tab como upgrade prompt (visible, no disabled)
            tabRecord.classList.remove('btn-pro-animated');
            tabRecord.style.background = 'var(--bg-card)';
            tabRecord.style.color = 'var(--text-secondary)';
            tabRecord.style.opacity = '1';
            tabRecord.style.cursor = 'pointer';
            tabRecord.disabled = false;
            // Reemplazar texto del tab con ícono de candado
            const recordLbl = tabRecord.querySelector('#efTabRecordLabel') || tabRecord;
            if (recordLbl === tabRecord) {
                // Parchear el HTML del tab solo la primera vez
                if (!tabRecord.dataset.lockedSetup) {
                    tabRecord.innerHTML = '🔒 Grabar <span class="pro-badge">Pro</span>';
                    tabRecord.dataset.lockedSetup = '1';
                }
            }
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
            // F1-B1/B2: ofrecer upgrade en vez de simplemente bloquear
            if (typeof window.openContactModal === 'function') {
                window.openContactModal('upgrade');
            } else {
                showToast('🔒 Grabar y transcribir es una función Pro. Contactá soporte para activarla.', 'info', 5000);
            }
            return;
        }
        if (!isPro()) { showToast('🔑 API Key requerida para grabar y transcribir', 'info'); return; }
        _switchTab('record');
    });

    document.getElementById('efPanelWrite')?.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.ef-chip-del');
        if (delBtn) {
            e.stopPropagation();
            _removeFieldHistoryEntry(delBtn.dataset.key, delBtn.dataset.val);
            const titleEl = document.getElementById('editFieldModalTitle');
            const fieldLabel = titleEl ? titleEl.textContent.replace(/^[▶✏️]\s*/, '').trim() : '';
            _renderDynamicChips(fieldLabel);
            return;
        }
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
            .replace(/\.{3,}|…+/g, '. ')
            .replace(/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+realiz[oó]\s+o\s+no\s+se\s+(?:especific[oó]|inform[oó])\.?(?:\s+|$)/gi, ' ')
            .replace(/(?:la\s+)?gonioscop[ií]a\s+din[aá]mica(?:\/indentaci[oó]n)?\s+no\s+se\s+inform[oó]\.?(?:\s+|$)/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        // Evitar que la IA devuelva encabezados o prefijos explicativos.
        out = out.replace(/^(?:Campo|Resultado|Revisi[oó]n)\s*:\s*/i, '').trim();
        // Normalizar residuos de puntuación tras limpiezas agresivas.
        out = out
            .replace(/\s+([,.;:])/g, '$1')
            .replace(/([,;:])\s*\./g, '.')
            .replace(/\.{2,}/g, '.')
            .replace(/,\s*,/g, ',')
            .replace(/\s{2,}/g, ' ')
            .trim();
        // Unificar variantes de no evaluado.
        if (/^(?:no se evalu[oó]|no fue evaluad[ao]|sin datos disponibles|no evaluad[ao])\.?$/i.test(out)) {
            return '[No especificado]';
        }
        return out;
    }

    function _normalizeEditorVerticalRhythm() {
        if (!editor) return;
        editor.querySelectorAll('p.report-p, li').forEach((n) => {
            const clone = n.cloneNode(true);
            clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn, .no-data-field').forEach(el => el.remove());
            const txt = String(clone.textContent || '').replace(/[\u00A0\s]+/g, '').trim();
            const htmlNoBreaks = String(clone.innerHTML || '')
                .replace(/<br\s*\/?>/gi, '')
                .replace(/&nbsp;/gi, '')
                .trim();
            const hasField = !!n.querySelector('.no-data-field');
            if ((!txt || !/[\p{L}\p{N}]/u.test(txt)) && !hasField && !htmlNoBreaks) n.remove();
        });
        editor.querySelectorAll('ul, ol').forEach((list) => {
            if (!list.querySelector('li')) list.remove();
        });
        Array.from(editor.children || []).forEach((child) => {
            if (child && child.tagName === 'BR') child.remove();
        });
        editor.querySelectorAll('h2.report-h2, h3.report-h3').forEach((h) => {
            const prev = h.previousElementSibling;
            if (prev && /^H[23]$/.test(prev.tagName)) prev.remove();
        });
    }

    function _decorateInlineReviewButtons() {
        if (!editor) return;
        const enabled = _isInlineReviewEnabled();

        // Limpiar botones heredados en títulos para evitar duplicación visual.
        editor.querySelectorAll('h2.report-h2 .inline-review-btn, h3.report-h3 .inline-review-btn').forEach((b) => b.remove());
        // Siempre limpiar ▶ de <li> — las listas no deben tener botón de revisión inline.
        editor.querySelectorAll('li .inline-review-btn').forEach((b) => b.remove());

        if (!enabled) {
            editor.querySelectorAll('.inline-review-btn').forEach(b => b.remove());
            return;
        }

            if (!_hasInlineReviewPlan()) {
                editor.querySelectorAll('.inline-review-btn').forEach(b => b.remove());
                return;
            }
        // Nunca mostrar botón de revisión en líneas de campo vacío.
        editor.querySelectorAll('p.report-p').forEach((node) => {
            if (node.querySelector('.no-data-field')) {
                node.querySelectorAll('.inline-review-btn').forEach(b => b.remove());
            }
        });

        editor.querySelectorAll('p.report-p').forEach((node) => {
            if (node.querySelector('.no-data-field')) return;
            /* Deduplicación robusta: remover cualquier botón inline preexistente
               (incluyendo anidados), luego volver a insertar solo uno si corresponde. */
            node.querySelectorAll('.inline-review-btn').forEach((b) => b.remove());
            const clone = node.cloneNode(true);
            clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn, .no-data-field').forEach(el => el.remove());
            const txt = String(clone.textContent || '').replace(/[\u00A0\s]+/g, ' ').trim();
            if (!txt || !/[\p{L}\p{N}]/u.test(txt)) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'inline-review-btn';
            btn.title = '2da/3ra revisión del párrafo';
            btn.textContent = '▶';
            btn.setAttribute('contenteditable', 'false');
            node.appendChild(btn);
        });
    }

    function _createEmptyFieldBadge() {
        const span = document.createElement('span');
        span.className = 'no-data-field';
        span.setAttribute('contenteditable', 'false');
        span.setAttribute('data-field-empty', '1');
        span.innerHTML = '<span class="no-data-text">— campo vacío —</span><button class="no-data-edit-btn" tabindex="0" title="Editar campo vacío" type="button">✏️</button>';
        return span;
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

    // Revisión IA ahora es directa con botones inline en el editor (sin modal).

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
        // F1-C2: "Dejar en blanco" — elimina el badge y deja el campo vacío en el informe
        if (!_targetSpan) { closeEditFieldModal(); return; }
        // Reemplazar el span badge con nodo de texto vacío
        const emptyNode = document.createTextNode('');
        _targetSpan.replaceWith(emptyNode);
        if (editor) editor.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
    }
    document.getElementById('btnBlankEditField')?.addEventListener('click', clearFieldValue);

    function removeOrphanSectionHeadings() {
        if (!editor) return;
        editor.querySelectorAll('h2.report-h2, h3.report-h3').forEach((heading) => {
            let node = heading.nextElementSibling;
            let hasContent = false;
            while (node && !/^H[23]$/.test(node.tagName)) {
                const clone = node.cloneNode(true);
                clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn').forEach(el => el.remove());
                const txt = String(clone.textContent || '').replace(/[\u00A0\s]+/g, '').trim();
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
                const clone = para.cloneNode(true);
                clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn').forEach(el => el.remove());
                const remaining = String(clone.textContent || '')
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
        _normalizeEditorVerticalRhythm();
        _decorateInlineReviewButtons();

        editor.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
        if (typeof showToast === 'function') showToast('🗑️ Campo eliminado del informe', 'info');
    }

    function _getSectionBodyForHeading(heading) {
        const parts = [];
        let node = heading?.nextElementSibling;
        while (node && !/^H[23]$/.test(node.tagName)) {
            const clone = node.cloneNode(true);
            clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn').forEach(el => el.remove());
            const txt = String(clone.textContent || '').replace(/[\u00A0]+/g, ' ').trim();
            if (txt) parts.push(txt);
            node = node.nextElementSibling;
        }
        return parts.join(' ');
    }

    async function _runInlineParagraphReview(targetNode) {
        if (!targetNode || !editor) return;
        const key = _resolveGroqApiKey();
        if (!key) {
            if (typeof showToast === 'function') showToast('🔑 API Key requerida para Revisión IA', 'info');
            return;
        }

        const btn = targetNode.querySelector('.inline-review-btn');
        const isHeadingTarget = /^H[23]$/.test(targetNode.tagName || '');
        const paragraph = isHeadingTarget
            ? _getSectionBodyForHeading(targetNode)
            : (() => {
                const clone = targetNode.cloneNode(true);
                clone.querySelectorAll('.inline-review-btn, .inline-undo-btn, .no-data-edit-btn').forEach(el => el.remove());
                return String(clone.textContent || '').replace(/[\u00A0]+/g, ' ').trim();
            })();
        if (!paragraph) return;

        // Save original HTML before modifying (for undo)
        const originalHTML = isHeadingTarget ? null : targetNode.innerHTML;

        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳';
        }

        try {
            const model = (Array.isArray(window.GROQ_MODELS) && window.GROQ_MODELS[0]) || 'llama-3.1-8b-instant';
            const rawSource = String(window._lastRawTranscription || '').slice(0, 4000);
            const templateKey = String(window.selectedTemplate || 'generico');
            const templateName = window.MEDICAL_TEMPLATES?.[templateKey]?.name || templateKey;
            const templateRules = _getTemplateSpecificReviewRules(templateKey);
            const systemContent = [
                'Eres un asistente de redacción médica.',
                'Tarea: revisar y mejorar SOLO el párrafo dado, sin alterar hechos clínicos.',
                'Reglas absolutas:',
                '1) No inventar, no inferir, no agregar datos.',
                '2) No incluir acciones/estudios no realizados ni no especificados dentro del párrafo.',
                '3) Prohibido usar puntos suspensivos, frases truncadas o muletillas.',
                '4) Si falta dato indispensable del párrafo, devolver [No especificado].',
                '5) Solo español médico formal.',
                '6) Responder SOLO el párrafo final, sin encabezados ni prefijos.',
                '7) PROHIBICIÓN ABSOLUTA: jamás escribas «no evaluado», «no fue evaluado», «no se evaluó», «no explorado», «no fue explorado», «no examinado», «no valorado», «sin datos registrados» ni ninguna variante. Si algo no fue dictado, devuelve [No especificado] o conserva solo lo que sí fue dictado.',
                templateRules
            ].join('\n');
            const userContent = [
                `Plantilla activa: ${templateName}`,
                isHeadingTarget ? `Sección objetivo: ${String(targetNode.textContent || '').replace(/▶/g, '').trim()}` : '',
                `Párrafo actual: ${paragraph}`,
                `Fuente transcripta: ${rawSource || '[No disponible]'}`
            ].filter(Boolean).join('\n\n');

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

            if (isHeadingTarget) {
                let firstBody = targetNode.nextElementSibling;
                while (firstBody && /^H[23]$/.test(firstBody.tagName || '')) firstBody = firstBody.nextElementSibling;
                if (!firstBody || /^H[23]$/.test(firstBody?.tagName || '')) return;
                firstBody.innerHTML = '';
                if (/^\[No especificado\]$/i.test(revised)) {
                    firstBody.appendChild(_createEmptyFieldBadge());
                } else {
                    firstBody.appendChild(document.createTextNode(revised));
                }
            } else {
                targetNode.innerHTML = '';
                if (/^\[No especificado\]$/i.test(revised)) {
                    targetNode.appendChild(_createEmptyFieldBadge());
                } else {
                    targetNode.appendChild(document.createTextNode(revised));
                }
            }
            _decorateInlineReviewButtons();
            // Add undo button (non-heading case only)
            if (!isHeadingTarget && originalHTML !== null) {
                targetNode.querySelectorAll('.inline-undo-btn').forEach(b => b.remove());
                const undoBtn = document.createElement('button');
                undoBtn.type = 'button';
                undoBtn.className = 'inline-undo-btn';
                undoBtn.title = 'Deshacer revisión IA';
                undoBtn.setAttribute('contenteditable', 'false');
                undoBtn.textContent = '↩';
                undoBtn.dataset.originalHtml = originalHTML;
                const existingReviewBtn = targetNode.querySelector('.inline-review-btn');
                if (existingReviewBtn) {
                    targetNode.insertBefore(undoBtn, existingReviewBtn);
                } else {
                    targetNode.appendChild(undoBtn);
                }
            }
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof showToast === 'function') showToast('✅ Párrafo revisado', 'success');
        } catch (err) {
            if (typeof showToast === 'function') showToast('❌ Error en revisión del párrafo', 'error');
            console.warn('Inline paragraph review error:', err);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '▶';
            }
        }
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
        _decorateInlineReviewButtons();
        _syncQuickToggleUI();
        editor.addEventListener('click', (e) => {
            const reviewBtn = e.target.closest('.inline-review-btn');
            if (reviewBtn) {
                e.preventDefault();
                e.stopPropagation();
                const container = reviewBtn.closest('p.report-p, li');
                if (container) _runInlineParagraphReview(container);
                return;
            }
            const undoBtn = e.target.closest('.inline-undo-btn');
            if (undoBtn) {
                e.preventDefault();
                e.stopPropagation();
                const container = undoBtn.closest('p.report-p, li');
                if (container && undoBtn.dataset.originalHtml !== undefined) {
                    container.innerHTML = undoBtn.dataset.originalHtml;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    if (typeof showToast === 'function') showToast('↩ Revisión deshecha', 'info');
                }
                return;
            }
            const btn = e.target.closest('.no-data-edit-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const span = btn.closest('.no-data-field');
                if (span) openEditFieldModal(span);
            }
        });
        var _inputDecorateTimer = null;
        editor.addEventListener('input', () => {
            clearTimeout(_inputDecorateTimer);
            _inputDecorateTimer = setTimeout(() => {
                _decorateInlineReviewButtons();
                _normalizeEditorVerticalRhythm();
            }, 150);
        });
    }

    document.getElementById('inlineReviewQuickToggle')?.addEventListener('change', (e) => {
        const enabled = !!e.target.checked;
        _setInlineReviewEnabled(enabled);
        _decorateInlineReviewButtons();
        const cfgToggle = document.getElementById('settingsInlineReviewToggle');
        if (cfgToggle) cfgToggle.checked = enabled;
        if (typeof showToast === 'function') {
            showToast(enabled ? 'Revisión IA activada' : 'Revisión IA desactivada', 'info');
        }
    });

    window._openEditFieldModal = openEditFieldModal;
    window._closeEditFieldModal = closeEditFieldModal;
    window._refreshInlineReviewButtons = function () {
        _decorateInlineReviewButtons();
        _syncQuickToggleUI();
    };
    window._syncInlineReviewQuickToggle = _syncQuickToggleUI;
})();
