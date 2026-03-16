// ============ FIXED TOOLTIPS (global, all clones + admin) ============

(function initFixedTooltips() {
    const MANUAL_TIPS = {
        proInputSourceSwitch: 'Elegi la fuente para generar el informe. Audio usa grabacion/subida; Texto permite pegar o adjuntar texto.',
        recordBtn: 'Inicia o detiene la grabacion de voz para transcribir.',
        dropZone: 'Arrastra o toca para subir audios. Acepta carga multiple.',
        transcribeBtn: 'Convierte audio en texto sin estructuracion.',
        transcribeAndStructureBtn: 'Transcribe y estructura con IA en un solo paso.',
        proTextInput: 'Pega texto medico para estructurarlo sin audio.',
        btnStructureTextPro: 'Estructura con IA el texto actual.',
        templateSelect: 'Define la plantilla clinica para la estructura final.',
        btnStructureAI: 'Aplica estructuracion IA al contenido del editor.',
        btnConfigPdfMain: 'Abre la configuracion de salida en PDF.',
        btnDownloadFromPreview: 'Descarga el informe en el formato disponible para tu plan.',
        btnNewUser: 'Crea un usuario nuevo desde cero o desde un registro pendiente.',
        btnGiftUser: 'Inicia la fabrica de clones con configuracion guiada.',
        btnDarkMode: 'Alterna entre tema claro y oscuro.'
    };

    const KEY_TARGET_IDS = Object.keys(MANUAL_TIPS);
    const BIND_SELECTOR = '[data-fixed-tip]';

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
    let boundCount = 0;

    function ensureStyles() {
        if (document.getElementById('fixed-tip-inline-styles')) return;
        const style = document.createElement('style');
        style.id = 'fixed-tip-inline-styles';
        style.textContent = [
            '.fixed-tip-anchor{position:relative;}',
            '.fixed-tip-anchor.fixed-tip-anchor--safe{padding-right:22px;}',
            '.fixed-tip-anchor.fixed-tip-anchor--button{overflow:visible;}',
            '.fixed-tip-btn{position:absolute;top:6px;right:6px;transform:none;width:14px;height:14px;border:1.5px solid #60a5fa;border-radius:999px;background:transparent;color:#60a5fa;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:.88;z-index:8;padding:0;}',
            '.fixed-tip-anchor--button>.fixed-tip-btn{top:-7px;right:-7px;}',
            '.fixed-tip-btn:hover{color:#38bdf8;border-color:#38bdf8;background:rgba(56,189,248,.08);opacity:1;}',
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

    function hasNativeTooltip(target) {
        if (!target) return false;
        const ownTitle = normalizeTitle(target.getAttribute('title'));
        if (ownTitle) return true;
        const anchor = target.closest('[title]');
        if (!anchor) return false;
        return !!normalizeTitle(anchor.getAttribute('title'));
    }

    function hasOwnTipButton(anchor) {
        if (!anchor) return false;
        const children = anchor.children || [];
        for (let i = 0; i < children.length; i += 1) {
            const child = children[i];
            if (child && child.classList && child.classList.contains('fixed-tip-btn')) return true;
        }
        return false;
    }

    function attachTip(target, tipText) {
        if (!target || !tipText) return false;
        if (target.matches(SKIP_SELECTOR) || target.closest(SKIP_SELECTOR)) return false;
        if (hasNativeTooltip(target)) return false;

        const anchor = resolveAnchor(target);
        if (!anchor || hasOwnTipButton(anchor)) return false;
        if (hasNativeTooltip(anchor)) return false;

        anchor.classList.add('fixed-tip-anchor');
        if (anchor.matches('button, .btn, .btn-primary, .btn-secondary, .btn-icon, .tab-btn')) {
            anchor.classList.add('fixed-tip-anchor--button');
        } else {
            anchor.classList.add('fixed-tip-anchor--safe');
        }
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
        return true;
    }

    function collectKeyElements() {
        const seen = new Set();
        const out = [];

        KEY_TARGET_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (!el || seen.has(el)) return;
            seen.add(el);
            out.push(el);
        });

        document.querySelectorAll(BIND_SELECTOR).forEach((el) => {
            if (!el || seen.has(el)) return;
            seen.add(el);
            out.push(el);
        });

        return out;
    }

    function bindAll() {
        const elements = collectKeyElements();
        elements.forEach((el) => {
            if (!el || el.dataset.fixedTipBound === '1' || el.dataset.fixedTipBound === 'skip') return;
            if (hasNativeTooltip(el)) {
                el.dataset.fixedTipBound = 'skip';
                return;
            }
            const tipText = deriveLabelText(el);
            if (!tipText) {
                el.dataset.fixedTipBound = 'skip';
                return;
            }
            const attached = attachTip(el, tipText);
            if (attached) {
                el.dataset.fixedTipBound = '1';
                boundCount += 1;
            } else {
                el.dataset.fixedTipBound = 'skip';
            }
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

        // Reintentos suaves por si hay contenido que termina de renderizar tarde.
        setTimeout(queueBind, 250);
        setTimeout(queueBind, 900);
        setTimeout(queueBind, 1800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
