// ============ USER GUIDE — TOUR INTERACTIVO + HELP TABS ============

(function initUserGuide() {

    const AUTO_TOUR_KEY = 'auto_tour_enabled';

    async function getAutoTourEnabled() {
        try {
            if (typeof appDB !== 'undefined') {
                const fromDb = await appDB.get(AUTO_TOUR_KEY);
                if (fromDb === true || fromDb === false) return fromDb;
            }
            const fromLs = localStorage.getItem(AUTO_TOUR_KEY);
            if (fromLs === null) return true; // default: activado
            return fromLs === 'true';
        } catch (_) {
            return true;
        }
    }

    function setAutoTourEnabled(enabled) {
        const value = !!enabled;
        try {
            localStorage.setItem(AUTO_TOUR_KEY, value ? 'true' : 'false');
        } catch (_) {}
        if (typeof appDB !== 'undefined') {
            try { appDB.set(AUTO_TOUR_KEY, value); } catch (_) {}
        }
    }

    // ── Help Modal Tab Switching ──
    document.querySelectorAll('.help-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.dataset.helpTab;
            // Deactivate all tabs & panels
            document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
            // Activate clicked
            tab.classList.add('active');
            const panel = document.querySelector(`[data-help-panel="${targetPanel}"]`);
            if (panel) panel.classList.add('active');
        });
    });

    // Contact button inside help modal
    const btnContactFromHelp = document.getElementById('btnContactFromHelp');
    if (btnContactFromHelp) {
        btnContactFromHelp.addEventListener('click', () => {
            // Close help modal
            document.getElementById('helpModal')?.classList.remove('active');
            // Open contact modal
            setTimeout(() => {
                document.getElementById('contactModalOverlay')?.classList.add('active');
            }, 200);
        });
    }

    // ── Interactive Tour (Spotlight) ──
    const TOUR_STEPS_BASE = [
        {
            id: 'record',
            target: '#recordBtn',
            title: '🎙️ Paso 1: Grabá o subí tu audio',
            text: 'Tocá este botón para dictar en vivo. También podés arrastrar archivos de audio a la zona de carga que está debajo.',
            position: 'right'
        },
        {
            id: 'drop-zone',
            target: '#dropZone',
            title: '📁 Zona de carga',
            text: 'Arrastrá archivos MP3, WAV, M4A u OGG acá. Podés subir varios a la vez.',
            position: 'right'
        },
        {
            id: 'transcribe',
            target: '#transcribeBtn',
            title: '⚡ Paso 2: Transcribí',
            text: 'Una vez cargado el audio, pulsá este botón. La IA convierte tu dictado a texto en segundos.',
            position: 'right'
        },
        {
            id: 'pro-activation',
            target: '#proToggleContainer',
            title: '✨ Modo Pro',
            text: 'Si activás el Modo Pro, la app puede estructurar automáticamente tus informes con IA y plantillas médicas especializadas.',
            position: 'bottom',
            when: (ctx) => !!ctx.showProActivationStep
        },
        {
            id: 'pro-input',
            target: '#proInputSourceSwitch',
            title: '🧠 Entrada de texto estructurada',
            text: 'En contexto Pro podés estructurar directamente desde texto sin grabar audio.',
            position: 'bottom',
            when: (ctx) => !!ctx.isProLike
        },
        {
            id: 'admin-panel',
            target: '#btnAdminAccess',
            title: '🛡️ Panel de administración',
            text: 'Desde acá gestionás usuarios, planes y configuración avanzada de la plataforma.',
            position: 'bottom'
            ,
            when: (ctx) => !!ctx.isAdmin
        },
        {
            id: 'editor',
            target: '#editor',
            title: '📝 Paso 3: Editá el informe',
            text: 'Acá aparece tu texto transcrito y estructurado. Podés editar directamente, usar negrita, cursiva, listas y tablas.',
            position: 'left'
        },
        {
            id: 'export',
            target: '#btnConfigPdfMain, #downloadBtnContainer',
            title: '📄 Paso 4: Exportá',
            text: 'Configurá tus datos profesionales, previsualizá y descargá tu informe como PDF, Word, TXT o HTML.',
            position: 'bottom'
        }
    ];

    let currentStep = -1;
    let tourActive = false;
    let tourElements = {};
    let activeTourSteps = [];
    let activeTourContext = null;

    function getTourContext() {
        const cfg = window.CLIENT_CONFIG || {};
        const type = String(cfg.type || 'NORMAL').toUpperCase();
        const planCode = String(cfg.planCode || '').toLowerCase();
        const mode = String(window.currentMode || 'normal').toLowerCase();
        const proToggleContainer = document.getElementById('proToggleContainer');
        const proToggleVisible = !!(proToggleContainer && proToggleContainer.offsetParent !== null);
        const isAdmin = type === 'ADMIN';
        const isNormal = type === 'NORMAL';
        const isProLike = (type === 'PRO') || !!cfg.hasProMode || mode === 'pro';
        const isClinic = !!cfg.canGenerateApps || planCode === 'clinic';
        const isGift = planCode === 'gift';
        const isPro = type === 'PRO' && !isClinic && !isGift;

        return {
            type,
            planCode,
            mode,
            isAdmin,
            isNormal,
            isProLike,
            isClinic,
            isGift,
            isPro,
            showProActivationStep: isNormal && proToggleVisible && mode !== 'pro'
        };
    }

    function resolveStepText(step, ctx) {
        const id = step && step.id;
        const context = ctx || {};

        if (id === 'pro-input') {
            if (context.isClinic) {
                return 'Modo clínica: estructurá textos por profesional y mantené un flujo consistente para todo el equipo.';
            }
            if (context.isGift) {
                return 'Tu clon GIFT ya viene listo para estructurar desde texto sin grabar audio.';
            }
            if (context.isAdmin) {
                return 'Como admin podés validar la estructuración desde texto para testear plantillas y flujo IA.';
            }
            if (context.isPro) {
                return 'Tu plan Pro permite estructurar directamente desde texto sin depender del audio.';
            }
        }

        if (id === 'admin-panel' && context.isAdmin) {
            return 'Desde este panel administrás usuarios, planes, licencias y configuración de clones.';
        }

        return step.text;
    }

    function buildTourSteps() {
        const ctx = getTourContext();
        const filtered = TOUR_STEPS_BASE.filter((step) => {
            if (typeof step.when === 'function') {
                try { return !!step.when(ctx); } catch (_) { return false; }
            }
            return true;
        });

        const ordered = reorderTourSteps(filtered, ctx);
        return ordered.filter((step) => hasVisibleTarget(step && step.target));
    }

    function hasVisibleTarget(selector) {
        if (!selector) return false;
        const selectors = String(selector).split(',').map((s) => s.trim()).filter(Boolean);
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) return true;
        }
        return false;
    }

    function reorderTourSteps(steps, ctx) {
        const list = Array.isArray(steps) ? steps.slice() : [];
        const context = ctx || {};

        let preferredOrder = [
            'record',
            'drop-zone',
            'transcribe',
            'pro-activation',
            'pro-input',
            'editor',
            'export',
            'admin-panel'
        ];

        if (context.isAdmin) {
            preferredOrder = [
                'admin-panel',
                'record',
                'drop-zone',
                'transcribe',
                'pro-input',
                'editor',
                'export'
            ];
        } else if (context.isClinic) {
            preferredOrder = [
                'record',
                'drop-zone',
                'transcribe',
                'pro-input',
                'editor',
                'export'
            ];
        } else if (context.isGift) {
            preferredOrder = [
                'record',
                'transcribe',
                'pro-input',
                'editor',
                'export',
                'drop-zone'
            ];
        } else if (context.isPro) {
            preferredOrder = [
                'record',
                'drop-zone',
                'transcribe',
                'pro-input',
                'editor',
                'export'
            ];
        }

        const byId = new Map();
        list.forEach((step) => {
            if (step && step.id) byId.set(step.id, step);
        });

        const ordered = [];
        preferredOrder.forEach((id) => {
            const step = byId.get(id);
            if (step) {
                ordered.push(step);
                byId.delete(id);
            }
        });

        byId.forEach((step) => ordered.push(step));
        return ordered;
    }

    function findTarget(selector) {
        // Support comma-separated selectors (pick first visible)
        const selectors = selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) return el;
        }
        return null;
    }

    function refreshActiveTourStepsLive() {
        if (!tourActive) return;

        const prevStep = (currentStep >= 0 && currentStep < activeTourSteps.length)
            ? activeTourSteps[currentStep]
            : null;
        const prevId = prevStep && prevStep.id;

        activeTourContext = getTourContext();
        const rebuilt = buildTourSteps();
        if (!Array.isArray(rebuilt) || rebuilt.length === 0) {
            return;
        }

        activeTourSteps = rebuilt;

        if (tourElements.dots) {
            tourElements.dots.innerHTML = activeTourSteps.map((_, i) =>
                `<div class="tour-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`
            ).join('');
        }

        let nextIndex = 0;
        if (prevId) {
            const found = activeTourSteps.findIndex((s) => s && s.id === prevId);
            if (found >= 0) nextIndex = found;
        } else if (currentStep >= 0) {
            nextIndex = Math.min(currentStep, activeTourSteps.length - 1);
        }

        showStep(nextIndex);
    }

    function createTourUI() {
        // Remove existing
        document.getElementById('tourContainer')?.remove();

        const container = document.createElement('div');
        container.id = 'tourContainer';
        container.className = 'tour-overlay';
        container.innerHTML = `
            <div class="tour-backdrop" id="tourBackdrop"></div>
            <div class="tour-spotlight" id="tourSpotlight"></div>
            <div class="tour-tooltip" id="tourTooltip">
                <h4 id="tourTitle"></h4>
                <p id="tourText"></p>
                <div class="tour-tooltip-footer">
                    <div class="tour-dots" id="tourDots"></div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-outline" id="tourSkip">Salir</button>
                        <button class="btn btn-primary" id="tourNext">Siguiente →</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        tourElements = {
            container,
            backdrop: document.getElementById('tourBackdrop'),
            spotlight: document.getElementById('tourSpotlight'),
            tooltip: document.getElementById('tourTooltip'),
            title: document.getElementById('tourTitle'),
            text: document.getElementById('tourText'),
            dots: document.getElementById('tourDots'),
            skipBtn: document.getElementById('tourSkip'),
            nextBtn: document.getElementById('tourNext')
        };

        // Build dots
        tourElements.dots.innerHTML = activeTourSteps.map((_, i) =>
            `<div class="tour-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`
        ).join('');

        tourElements.skipBtn.addEventListener('click', endTour);
        tourElements.nextBtn.addEventListener('click', nextStep);
        tourElements.backdrop.addEventListener('click', endTour);
    }

    function showStep(index) {
        if (index < 0 || index >= activeTourSteps.length) {
            endTour();
            return;
        }

        currentStep = index;
        const step = activeTourSteps[index];
        const target = findTarget(step.target);

        // Update text
        tourElements.title.textContent = step.title;
        tourElements.text.textContent = resolveStepText(step, activeTourContext || getTourContext());
        tourElements.nextBtn.textContent = index === activeTourSteps.length - 1 ? '✅ Finalizar' : 'Siguiente →';

        // Update dots
        tourElements.dots.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i <= index);
        });

        if (target) {
            // Scroll target into view
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
                const rect = target.getBoundingClientRect();
                const pad = 8;

                // Position spotlight
                const spot = tourElements.spotlight;
                spot.style.left = (rect.left - pad) + 'px';
                spot.style.top = (rect.top - pad) + 'px';
                spot.style.width = (rect.width + pad * 2) + 'px';
                spot.style.height = (rect.height + pad * 2) + 'px';

                // Position tooltip
                positionTooltip(rect, step.position);
            }, 350);
        } else {
            // Target not found — skip to next
            if (index < activeTourSteps.length - 1) {
                showStep(index + 1);
            } else {
                endTour();
            }
        }
    }

    function positionTooltip(targetRect, preferred) {
        const tt = tourElements.tooltip;
        const pad = 16;
        const ttWidth = 340;

        // Reset
        tt.style.left = '';
        tt.style.top = '';
        tt.style.right = '';
        tt.style.bottom = '';

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        switch (preferred) {
            case 'right':
                tt.style.left = Math.min(targetRect.right + pad, vw - ttWidth - 20) + 'px';
                tt.style.top = Math.max(targetRect.top, 10) + 'px';
                break;
            case 'left':
                tt.style.left = Math.max(targetRect.left - ttWidth - pad, 10) + 'px';
                tt.style.top = Math.max(targetRect.top, 10) + 'px';
                break;
            case 'bottom':
                tt.style.left = Math.max(Math.min(targetRect.left, vw - ttWidth - 20), 10) + 'px';
                tt.style.top = (targetRect.bottom + pad) + 'px';
                break;
            case 'top':
                tt.style.left = Math.max(Math.min(targetRect.left, vw - ttWidth - 20), 10) + 'px';
                tt.style.top = Math.max(targetRect.top - 200, 10) + 'px';
                break;
            default:
                tt.style.left = Math.max(targetRect.right + pad, 10) + 'px';
                tt.style.top = Math.max(targetRect.top, 10) + 'px';
        }

        // Clamp to viewport
        const ttRect = tt.getBoundingClientRect();
        if (ttRect.bottom > vh - 10) {
            tt.style.top = Math.max(vh - ttRect.height - 20, 10) + 'px';
        }
        if (ttRect.right > vw - 10) {
            tt.style.left = Math.max(vw - ttWidth - 20, 10) + 'px';
        }
    }

    function nextStep() {
        showStep(currentStep + 1);
    }

    function startTour() {
        if (tourActive) return;

        activeTourContext = getTourContext();
        activeTourSteps = buildTourSteps();
        if (!Array.isArray(activeTourSteps) || activeTourSteps.length === 0) {
            if (typeof showToast === 'function') showToast('No hay pasos de guía disponibles para este perfil.', 'info');
            return;
        }

        tourActive = true;

        // Close help modal first
        document.getElementById('helpModal')?.classList.remove('active');

        setTimeout(() => {
            createTourUI();
            currentStep = -1;
            showStep(0);
        }, 300);
    }

    function endTour() {
        tourActive = false;
        currentStep = -1;
        document.getElementById('tourContainer')?.remove();
        tourElements = {};

        // Mark tour as seen
        if (typeof appDB !== 'undefined') {
            appDB.set('tour_completed', true); // fire-and-forget
        } else {
            localStorage.setItem('tour_completed', 'true');
        }

        if (typeof showToast === 'function') {
            showToast('✅ Tour completado. Podés acceder a la ayuda desde el botón ❓', 'success', 3000);
        }
    }

    // Global access
    window.startGuideTour = startTour;
    window.setAutoTourEnabled = setAutoTourEnabled;
    window.getAutoTourEnabled = getAutoTourEnabled;

    // Button in help modal
    const btnStartTour = document.getElementById('btnStartTour');
    if (btnStartTour) {
        btnStartTour.addEventListener('click', startTour);
    }

    const tourAutoToggle = document.getElementById('tourAutoToggle');
    const tourAutoHint = document.getElementById('tourAutoHint');
    if (tourAutoToggle) {
        getAutoTourEnabled().then((enabled) => {
            tourAutoToggle.checked = !!enabled;
            if (tourAutoHint) {
                tourAutoHint.textContent = enabled
                    ? 'El tour se mostrará automáticamente en primeros usos.'
                    : 'Tour automático desactivado. Podés iniciarlo manualmente con el botón de arriba.';
            }
        });

        tourAutoToggle.addEventListener('change', () => {
            const enabled = !!tourAutoToggle.checked;
            setAutoTourEnabled(enabled);
            if (tourAutoHint) {
                tourAutoHint.textContent = enabled
                    ? 'El tour se mostrará automáticamente en primeros usos.'
                    : 'Tour automático desactivado. Podés iniciarlo manualmente con el botón de arriba.';
            }
            if (typeof showToast === 'function') {
                showToast(
                    enabled ? '✅ Tutorial automático activado' : 'ℹ️ Tutorial automático desactivado',
                    'success',
                    2200
                );
            }
        });
    }

    // ── Botón Guía Rápida (header) — abre helpModal en tab Guía ──
    const btnGuiaRapida = document.getElementById('btnGuiaRapida');
    if (btnGuiaRapida) {
        btnGuiaRapida.addEventListener('click', () => {
            const helpModal = document.getElementById('helpModal');
            if (helpModal) {
                // Activar tab de guía rápida
                document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
                const guideTab = document.querySelector('.help-tab[data-help-tab="guide"]');
                const guidePanel = document.querySelector('[data-help-panel="guide"]');
                if (guideTab) guideTab.classList.add('active');
                if (guidePanel) guidePanel.classList.add('active');
                helpModal.classList.add('active');
            }
        });
    }

    // ── Botón Manual Profesional (header) — abre overlay iframe dentro de la app ──
    const btnManual = document.getElementById('btnManual');
    if (btnManual) {
        btnManual.addEventListener('click', () => {
            const overlay = document.getElementById('manualOverlay');
            const frame = document.getElementById('manualFrame');
            if (overlay && frame) {
                frame.src = 'recursos/manual.html';
                overlay.style.display = '';
            } else {
                window.open('recursos/manual.html', '_blank');
            }
        });
    }

    // Cerrar manual overlay con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('manualOverlay');
            if (overlay && overlay.style.display !== 'none') {
                overlay.style.display = 'none';
                document.getElementById('manualFrame').src = '';
            }
        }
    });

    // ── Auto-show tour on first visit ──
    async function maybeAutoTour() {
        const autoTourEnabled = await getAutoTourEnabled();
        if (!autoTourEnabled) return;

        const tourDone = typeof appDB !== 'undefined'
            ? await appDB.get('tour_completed')
            : localStorage.getItem('tour_completed');
        const onboardingDone = typeof appDB !== 'undefined'
            ? await appDB.get('onboarding_done')
            : localStorage.getItem('onboarding_done');
        // Only auto-show if onboarding was completed and tour never seen
        if (onboardingDone && !tourDone) {
            // Small delay so the UI is fully loaded
            setTimeout(() => {
                // Only if user is past onboarding (app is usable)
                const onboardingOverlay = document.getElementById('onboardingOverlay');
                if (onboardingOverlay && onboardingOverlay.classList.contains('active')) return;
                startTour();
            }, 2000);
        }
    }

    // Handle ESC key to close tour
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tourActive) {
            endTour();
        }
    });

    // Handle window resize during tour
    window.addEventListener('resize', () => {
        if (tourActive && currentStep >= 0) {
            refreshActiveTourStepsLive();
        }
    });

    // Start check after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(maybeAutoTour, 500));
    } else {
        setTimeout(maybeAutoTour, 1500);
    }

})();
