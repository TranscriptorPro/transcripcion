// ============ FIXED TOOLTIPS (global, all clones + admin) ============

(function initFixedTooltips() {
    const MANUAL_TIPS = {
        proInputSourceSwitch: 'Elegi la fuente para generar el informe. Audio usa grabacion/subida; Texto permite pegar o adjuntar texto.',
        recordBtn: 'Inicia o detiene la grabacion de voz para transcribir.',
        dropZone: 'Arrastra o toca para subir audios. Acepta carga multiple.',
        chkNormalize: 'Normaliza volumen para mejorar la inteligibilidad.',
        chkNoise: 'Reduce ruido de fondo para mejorar la transcripcion.',
        chkJoinAudios: 'Une varios audios en un solo informe.',
        transcribeBtn: 'Convierte audio en texto sin estructuracion.',
        transcribeAndStructureBtn: 'Transcribe y estructura con IA en un solo paso.',
        proTextInput: 'Pega texto medico para estructurarlo sin audio.',
        btnAttachTextFile: 'Adjunta archivo de texto para estructuracion IA.',
        btnStructureTextPro: 'Estructura con IA el texto actual.',
        templateSelect: 'Define la plantilla clinica para la estructura final.',
        btnStructureAI: 'Aplica estructuracion IA al contenido del editor.',
        btnConfigPdfMain: 'Abre la configuracion de salida en PDF.',
        btnDownloadFromPreview: 'Descarga el informe en el formato disponible para tu plan.',
        btnNewUser: 'Crea un usuario nuevo desde cero o desde un registro pendiente.',
        btnGiftUser: 'Inicia la fabrica de clones con configuracion guiada.',
        btnRefresh: 'Recarga datos del panel para ver el estado mas reciente.',
        btnRefreshLogs: 'Actualiza el listado de logs administrativos.',
        btnSavePlans: 'Guarda cambios de planes y precios.',
        btnSaveExtras: 'Guarda cambios de extras y add-ons.',
        btnSaveEditUser: 'Guarda los cambios del usuario editado.',
        btnSaveNewUser: 'Confirma y crea el usuario con los datos cargados.',
        btnConfirmApprove: 'Aprueba el registro y crea el usuario final.',
        btnDarkMode: 'Alterna entre tema claro y oscuro.'
    };

    const BIND_SELECTOR = [
        '[data-fixed-tip]',
        'button[id]',
        'input[id]:not([type="hidden"])',
        'select[id]',
        'textarea[id]',
        '.tab-btn[data-tab]',
        '[title][id]'
    ].join(',');

    const SKIP_SELECTOR = [
        '.fixed-tip-btn',
        '.modal-close',
        '[data-no-fixed-tip="1"]',
        '[aria-label="Cerrar"]',
        '[id^="close"]',
        '[id^="btnClose"]'
    ].join(',');

    let pop = null;
    let activeBtn = null;
    let observer = null;
    let bindQueued = false;

    function ensureStyles() {
        if (document.getElementById('fixed-tip-inline-styles')) return;
        const style = document.createElement('style');
        style.id = 'fixed-tip-inline-styles';
        style.textContent = [
            '.fixed-tip-anchor{position:relative;}',
            '.fixed-tip-btn{position:absolute;top:6px;right:6px;width:16px;height:16px;border:1px solid var(--border,#cbd5e1);border-radius:999px;background:var(--bg-card,#fff);color:var(--text-secondary,#64748b);font-size:11px;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:.92;z-index:7;}',
            '.fixed-tip-btn:hover{color:var(--primary,#0f766e);border-color:var(--primary-light,#99f6e4);}',
            '.fixed-tip-popover{position:fixed;z-index:10001;width:min(360px,calc(100vw - 24px));padding:10px 12px;border:1px solid var(--border,#cbd5e1);border-radius:10px;background:var(--bg-card,#fff);color:var(--text-primary,#0f172a);box-shadow:0 10px 28px rgba(2,6,23,.16);font-size:12px;line-height:1.4;display:none;}',
            '.fixed-tip-popover.active{display:block;}',
            '.fixed-tip-popover strong{color:var(--primary,#0f766e);font-weight:700;}'
        ].join('');
        document.head.appendChild(style);
    }

    function ensurePopover() {
        if (pop) return pop;
        pop = document.createElement('div');
        pop.className = 'fixed-tip-popover';
        pop.id = 'fixedTipPopover';
        document.body.appendChild(pop);
        return pop;
    }

    function toShortText(raw) {
        const txt = String(raw || '').replace(/\s+/g, ' ').trim();
        if (!txt) return '';
        if (txt.length <= 130) return txt;
        return `${txt.slice(0, 127).trim()}...`;
    }

    function normalizeTitle(title) {
        const cleaned = toShortText(title);
        if (!cleaned || /^ayuda$/i.test(cleaned)) return '';
        return cleaned;
    }

    function deriveLabelText(target) {
        const id = target.id || '';
        if (id && MANUAL_TIPS[id]) return MANUAL_TIPS[id];

        const custom = target.getAttribute('data-fixed-tip');
        if (custom) return toShortText(custom);

        const title = normalizeTitle(target.getAttribute('title'));
        if (title) return title;

        const aria = normalizeTitle(target.getAttribute('aria-label'));
        if (aria) return aria;

        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return `Configura: ${toShortText(label.textContent)}`;
        }

        const placeholder = normalizeTitle(target.getAttribute('placeholder'));
        if (placeholder) return `Completa: ${placeholder}`;

        if (target.matches('button, .tab-btn')) {
            const btnText = toShortText(target.textContent);
            if (btnText) return `Accion: ${btnText}`;
        }

        return '';
    }

    function closeTip() {
        if (!pop) return;
        pop.classList.remove('active');
        activeBtn = null;
    }

    function positionPopover(btn) {
        const p = ensurePopover();
        const rect = btn.getBoundingClientRect();
        const margin = 8;
        const width = Math.min(360, window.innerWidth - 24);
        let left = rect.left + rect.width + 8;
        if (left + width > window.innerWidth - margin) {
            left = Math.max(margin, rect.right - width);
        }

        let top = rect.top - 2;
        if (top + 90 > window.innerHeight - margin) {
            top = Math.max(margin, window.innerHeight - 98);
        }

        p.style.left = `${Math.round(left)}px`;
        p.style.top = `${Math.round(top)}px`;
    }

    function openTip(btn) {
        const tipText = btn.getAttribute('data-tip-text') || '';
        if (!tipText) return;
        const p = ensurePopover();
        p.innerHTML = `<strong>Ayuda rapida:</strong> ${tipText}`;
        positionPopover(btn);
        p.classList.add('active');
        activeBtn = btn;
    }

    function resolveAnchor(target) {
        if (!target) return null;
        const grouped = target.closest('[data-fixed-tip-anchor], .form-group, .field-group, .filter-group, .setting-item, .card, .gw-card, .drop-zone, .join-audios-option, .audio-option');
        if (grouped) return grouped;
        if (target.matches('button, .btn, .btn-primary, .btn-secondary, .btn-icon, .tab-btn')) return target;
        return target.parentElement || target;
    }

    function attachTip(target, tipText) {
        if (!target || !tipText) return;
        if (target.matches(SKIP_SELECTOR) || target.closest(SKIP_SELECTOR)) return;

        const anchor = resolveAnchor(target);
        if (!anchor || anchor.querySelector(':scope > .fixed-tip-btn')) return;

        anchor.classList.add('fixed-tip-anchor');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fixed-tip-btn';
        btn.textContent = '?';
        btn.setAttribute('aria-label', 'Ayuda');
        btn.title = 'Ayuda';
        btn.setAttribute('data-tip-text', tipText);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeBtn === btn && pop && pop.classList.contains('active')) {
                closeTip();
                return;
            }
            openTip(btn);
        });

        anchor.appendChild(btn);
    }

    function bindAll() {
        const elements = document.querySelectorAll(BIND_SELECTOR);
        elements.forEach((el) => {
            if (!el || el.dataset.fixedTipBound === '1') return;
            const tipText = deriveLabelText(el);
            if (!tipText) return;
            el.dataset.fixedTipBound = '1';
            attachTip(el, tipText);
        });
    }

    function queueBind() {
        if (bindQueued) return;
        bindQueued = true;
        window.requestAnimationFrame(() => {
            bindQueued = false;
            bindAll();
        });
    }

    function startObserver() {
        if (observer) return;
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes?.length || mutation.removedNodes?.length)) {
                    queueBind();
                    return;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('click', (e) => {
        if (!pop || !pop.classList.contains('active')) return;
        if (pop.contains(e.target)) return;
        if (e.target && e.target.classList && e.target.classList.contains('fixed-tip-btn')) return;
        closeTip();
    });

    window.addEventListener('resize', () => {
        if (activeBtn && pop && pop.classList.contains('active')) {
            positionPopover(activeBtn);
        }
    });

    function boot() {
        ensureStyles();
        bindAll();
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
