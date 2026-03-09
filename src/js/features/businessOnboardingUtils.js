// ============ BUSINESS ONBOARDING FLOW ============

// Onboarding de cliente: bienvenida multi-step + T&C
function _showClientOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;

    const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
    let currentStep = 1;

    // Rellenar datos precargados
    const displayNombre = document.getElementById('onboardingDisplayNombre');
    const displayMatricula = document.getElementById('onboardingDisplayMatricula');
    if (displayNombre) displayNombre.textContent = profData.nombre || '(no configurado)';
    if (displayMatricula) displayMatricula.textContent = profData.matricula || '(no configurado)';

    // K1: Si la API key ya fue precargada por el admin, ocultar el paso.
    const apiStep = document.getElementById('onboardingApiKeyStep');
    if (apiStep) {
        const hasKey = !!(localStorage.getItem('groq_api_key'));
        apiStep.style.display = hasKey ? 'none' : '';
    }

    // Crear particulas decorativas
    _createOnboardingParticles();

    overlay.classList.add('active');

    function goToStep(step) {
        const prev = document.getElementById('onboardingStep' + currentStep);
        const next = document.getElementById('onboardingStep' + step);
        if (!prev || !next) return;

        // Ajustar ancho del modal para paso 3 (vista previa side-by-side)
        const modal = document.querySelector('.onboarding-modal');
        if (modal) {
            modal.style.maxWidth = (step === 3) ? '720px' : '520px';
            modal.style.transition = 'max-width 0.3s ease';
        }

        prev.style.animation = 'onboardingSlideOut 0.25s ease-in forwards';
        setTimeout(() => {
            prev.classList.remove('active');
            prev.style.animation = '';
            next.classList.add('active');
            currentStep = step;
            _updateOnboardingDots(step);
        }, 250);
    }

    function _updateOnboardingDots(step) {
        document.querySelectorAll('.onboarding-dot').forEach(d => {
            d.classList.toggle('active', parseInt(d.dataset.step) === step);
        });
    }

    // Botones next/back (4 pasos: Bienvenida, Datos, Config, T&C)
    const next1 = document.getElementById('onboardingNext1');
    const next2 = document.getElementById('onboardingNext2');
    const next3 = document.getElementById('onboardingNext3');
    const back2 = document.getElementById('onboardingBack2');
    const back3 = document.getElementById('onboardingBack3');
    const back4 = document.getElementById('onboardingBack4');

    if (next1) next1.addEventListener('click', () => goToStep(2));
    if (next2) next2.addEventListener('click', () => {
        _initOnbStep3();
        goToStep(3);
    });
    if (back2) back2.addEventListener('click', () => goToStep(1));
    if (back3) back3.addEventListener('click', () => goToStep(2));
    if (next3) next3.addEventListener('click', () => { _saveOnbConfig(); goToStep(4); });
    if (back4) back4.addEventListener('click', () => goToStep(3));

    const _isProUser = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.hasProMode) || ['ADMIN', 'PRO'].includes(CLIENT_CONFIG?.type);

    function _initOnbStep3() {
        const palette = document.getElementById('onbColorPalette');
        if (!palette || palette.children.length) return;
        const presetColors = ['#1a56a0', '#0f766e', '#7c3aed', '#dc2626', '#c2410c', '#0369a1', '#1d4ed8', '#374151'];
        const savedColor = (profData.headerColor || '#1a56a0').toLowerCase();
        presetColors.forEach(c => {
            const sw = document.createElement('div');
            sw.className = 'onb-color-swatch' + (c === savedColor ? ' selected' : '');
            sw.style.background = c;
            sw.dataset.color = c;
            sw.title = c;
            sw.addEventListener('click', () => {
                palette.querySelectorAll('.onb-color-swatch').forEach(s => s.classList.remove('selected'));
                sw.classList.add('selected');
                _updateOnbPreview();
            });
            palette.appendChild(sw);
        });
        if (!palette.querySelector('.onb-color-swatch.selected')) palette.firstChild?.classList.add('selected');
        document.querySelectorAll('.onb-margin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.onb-margin-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _updateOnbPreview();
            });
        });

        const firmaToggle = document.getElementById('onbToggleFirma');
        const qrToggle = document.getElementById('onbToggleQR');
        const firmaBadge = document.getElementById('onbFirmaBadge');
        if (_isProUser) {
            if (firmaToggle) firmaToggle.checked = true;
            if (qrToggle) qrToggle.checked = true;
        } else {
            if (firmaBadge) firmaBadge.style.display = '';
            if (firmaToggle) {
                firmaToggle.checked = false;
                firmaToggle.disabled = true;
                const firmaNote = firmaToggle.closest('.onb-config-card')?.querySelector('small');
                if (firmaNote) firmaNote.textContent = 'Solo disponible en plan PRO';
            }
            if (qrToggle) {
                qrToggle.disabled = true;
                const note = document.getElementById('onbQrNote');
                if (note) note.textContent = 'Solo disponible en plan PRO';
            }
        }

        const socialToggle = document.getElementById('onbToggleSocial');
        const socialBadge = document.getElementById('onbSocialBadge');
        if (socialToggle) {
            if (_isProUser) {
                socialToggle.checked = false;
            } else {
                socialToggle.checked = false;
                socialToggle.disabled = true;
                const socialNote = document.getElementById('onbSocialNote');
                if (socialNote) socialNote.textContent = 'Solo disponible en plan PRO';
            }
            if (socialBadge) socialBadge.style.display = _isProUser ? 'none' : '';
        }

        ['onbToggleFirma', 'onbToggleLogoProf', 'onbToggleLogoInst', 'onbToggleQR', 'onbTogglePhone', 'onbToggleEmail', 'onbToggleSocial'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => _updateOnbPreview());
        });
        _updateOnbPreview();
    }

    function _updateOnbPreview() {
        const preview = document.getElementById('onbPdfPreview');
        if (!preview) return;
        const selectedColor = document.querySelector('#onbColorPalette .onb-color-swatch.selected')?.dataset.color || '#1a56a0';
        const showFirma = document.getElementById('onbToggleFirma')?.checked ?? true;
        const showLogoPro = document.getElementById('onbToggleLogoProf')?.checked ?? true;
        const showLogoInst = document.getElementById('onbToggleLogoInst')?.checked ?? true;
        const showQR = document.getElementById('onbToggleQR')?.checked ?? false;
        const activeMargin = document.querySelector('.onb-margin-btn.active')?.dataset.margin || 'normal';
        const marginPx = activeMargin === 'narrow' ? '8px' : activeMargin === 'wide' ? '22px' : '14px';
        const profName = profData.nombre || 'Dr. Juan Perez';
        const profMat = profData.matricula || 'MP 12345';
        preview.innerHTML = `
            <div class="onb-prev-page" style="padding:${marginPx};">
                <div class="onb-prev-inst" style="${showLogoInst ? '' : 'opacity:0.25;'}">
                    <div class="onb-prev-inst-logo" style="${showLogoInst ? '' : 'background:#ddd;'}">🏥</div>
                    <div class="onb-prev-inst-text">
                        <div style="font-weight:700;font-size:6px;color:#333;">Centro Medico</div>
                        <div style="font-size:4.5px;color:#888;">Av. Ejemplo 1234 • Tel: 0341-4567890</div>
                    </div>
                </div>
                <div class="onb-prev-header" style="border-color:${selectedColor};">
                    <div style="display:flex;align-items:center;gap:4px;">
                        ${showLogoPro ? '<div class="onb-prev-prof-logo">👨‍⚕️</div>' : ''}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:5.5px;color:${selectedColor};">${profName}</div>
                            <div style="font-size:4.5px;color:#666;">${profMat}</div>
                        </div>
                        <div style="font-size:4px;color:#999;">01/03/2026</div>
                    </div>
                </div>
                <div class="onb-prev-patient">
                    <div class="onb-prev-field"><span class="onb-prev-lbl">Paciente</span> <span>Maria Garcia</span></div>
                    <div class="onb-prev-field"><span class="onb-prev-lbl">DNI</span> <span>30.123.456</span></div>
                    <div class="onb-prev-field"><span class="onb-prev-lbl">Edad</span> <span>45 anos</span></div>
                </div>
                <div style="margin:3px 0;padding:2px 0;border-bottom:1px solid #eee;">
                    <div style="display:flex;gap:6px;">
                        <span style="font-size:4.5px;color:${selectedColor};font-weight:700;">ESTUDIO:</span>
                        <span style="font-size:4.5px;color:#555;">Ecografia abdominal</span>
                    </div>
                </div>
                <div class="onb-prev-body">
                    <div style="font-size:5px;font-weight:700;color:${selectedColor};margin-bottom:2px;">HALLAZGOS</div>
                    <div class="onb-prev-line" style="width:100%;"></div>
                    <div class="onb-prev-line" style="width:90%;"></div>
                    <div class="onb-prev-line" style="width:95%;"></div>
                    <div class="onb-prev-line" style="width:70%;"></div>
                    <div style="font-size:5px;font-weight:700;color:${selectedColor};margin:4px 0 2px;">CONCLUSION</div>
                    <div class="onb-prev-line" style="width:85%;"></div>
                    <div class="onb-prev-line" style="width:60%;"></div>
                </div>
                <div class="onb-prev-firma" style="${showFirma ? '' : 'opacity:0.2;'}">
                    ${showFirma ? '<div style="font-size:10px;margin-bottom:1px;">✍️</div>' : ''}
                    <div style="width:40px;border-top:1px solid #666;margin:0 auto;"></div>
                    <div style="font-size:4.5px;color:#555;margin-top:1px;">${profName}</div>
                    <div style="font-size:4px;color:#888;">${profMat}</div>
                </div>
                ${showQR ? '<div class="onb-prev-qr"><div style="width:18px;height:18px;background:#f0f0f0;border:1px solid #ddd;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;">📱</div><div style="font-size:3.5px;color:#aaa;">QR Verificacion</div></div>' : ''}
            </div>
        `;
    }

    function _saveOnbConfig() {
        const selectedSwatch = document.querySelector('#onbColorPalette .onb-color-swatch.selected');
        if (selectedSwatch) {
            const color = selectedSwatch.dataset.color;
            profData.headerColor = color;
            window._profDataCache = profData;
            localStorage.setItem('prof_data', JSON.stringify(profData));
            if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
        }
        const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        pdfCfg.showSignImage = document.getElementById('onbToggleFirma')?.checked ?? true;
        pdfCfg.showHeader = document.getElementById('onbToggleLogoInst')?.checked ?? true;
        pdfCfg.showLogoProfessional = document.getElementById('onbToggleLogoProf')?.checked ?? true;
        pdfCfg.showQR = document.getElementById('onbToggleQR')?.checked ?? false;
        pdfCfg.showPhone = document.getElementById('onbTogglePhone')?.checked ?? true;
        pdfCfg.showEmail = document.getElementById('onbToggleEmail')?.checked ?? true;
        pdfCfg.showSocial = document.getElementById('onbToggleSocial')?.checked ?? false;
        const activeMarginBtn = document.querySelector('.onb-margin-btn.active');
        if (activeMarginBtn) pdfCfg.margins = activeMarginBtn.dataset.margin;
        localStorage.setItem('pdf_config', JSON.stringify(pdfCfg));
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', pdfCfg);
    }

    function _initOnbStep4() {
        const container = document.getElementById('onbWpCards');
        if (!container) return;
        container.innerHTML = '';
        const wps = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        if (wps.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:0.84rem;padding:1.2rem 0;">Sin lugares de trabajo precargados.<br><small>Podes agregar uno despues en Configuracion.</small></p>';
            return;
        }
        wps.forEach((wp, i) => {
            const card = document.createElement('label');
            card.className = 'onb-wp-card' + (i === 0 ? ' selected' : '');
            card.innerHTML = `<input type="radio" name="onbWp" value="${i}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--primary);flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.87rem;color:var(--text-primary)">${wp.name || 'Lugar ' + (i + 1)}</div>
                    ${wp.address ? `<div style="font-size:0.73rem;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${wp.address}</div>` : ''}
                </div>`;
            card.addEventListener('click', () => {
                container.querySelectorAll('.onb-wp-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
            container.appendChild(card);
        });
    }

    function _saveOnbWorkplace() {
        const selected = document.querySelector('input[name="onbWp"]:checked');
        if (!selected) return;
        const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        pdfCfg.activeWorkplaceIndex = parseInt(selected.value);
        localStorage.setItem('pdf_config', JSON.stringify(pdfCfg));
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', pdfCfg);
    }

    const acceptTerms = document.getElementById('acceptTerms');
    const submitBtn = document.getElementById('btnSubmitOnboarding');
    if (acceptTerms && submitBtn) {
        acceptTerms.addEventListener('change', () => {
            submitBtn.disabled = !acceptTerms.checked;
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (!acceptTerms?.checked) return;

            // K1: Si no hay API key precargada, exigir ingreso valido en primer uso.
            const apiStepVisible = apiStep && apiStep.style.display !== 'none';
            const currentStoredKey = String(localStorage.getItem('groq_api_key') || '').trim();
            const onbKeyEl = document.getElementById('onboardingApiKey');
            const inputKey = String(onbKeyEl?.value || '').trim();
            const resolvedKey = currentStoredKey || inputKey;

            if (apiStepVisible && (!resolvedKey || !resolvedKey.startsWith('gsk_'))) {
                if (typeof showToast === 'function') {
                    showToast('🔑 Para continuar, ingresá una API Key válida (gsk_)', 'warning');
                }
                if (onbKeyEl) {
                    onbKeyEl.focus();
                    onbKeyEl.style.outline = '2px solid #f59e0b';
                    setTimeout(() => { onbKeyEl.style.outline = ''; }, 1600);
                }
                return;
            }

            if (typeof appDB !== 'undefined') appDB.set('onboarding_accepted', 'true');
            localStorage.setItem('onboarding_accepted', 'true');

            _launchConfetti();

            setTimeout(() => {
                overlay.classList.remove('active');

                const onbKey = document.getElementById('onboardingApiKey');
                if (onbKey && onbKey.value.trim() && onbKey.value.trim().startsWith('gsk_')) {
                    if (typeof appDB !== 'undefined') appDB.set('groq_api_key', onbKey.value.trim());
                    localStorage.setItem('groq_api_key', onbKey.value.trim());
                }

                window.GROQ_API_KEY = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
                console.info('[Onboarding] API Key loaded:', window.GROQ_API_KEY ? 'gsk_...' + window.GROQ_API_KEY.slice(-4) : 'NONE');
                _initCommonModules();

                try {
                    if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
                    if (typeof updatePersonalization === 'function') updatePersonalization(profData);
                    if (typeof initializeMode === 'function') initializeMode();
                } catch (err) {
                    console.error('Error tras onboarding cliente:', err);
                }

                _showSettingsGear();

                const saludo = profData.nombre ? `¡Bienvenido/a, ${profData.nombre}! 🎉` : '¡Bienvenido/a! 🎉';
                if (typeof showToast === 'function') showToast(saludo, 'success');

                _tryPwaInstall(3);

                _launchSessionAssistant();
            }, 800);
        });
    }
}
