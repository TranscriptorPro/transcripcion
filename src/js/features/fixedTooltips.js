// ============ FIXED TOOLTIPS (click on small ?) ============

(function initFixedTooltips() {
    const TIPS = [
        { selector: '#proInputSourceSwitch', text: 'Elegí la fuente para generar el informe. En Audio usa grabación/subida; en Texto permite pegar o adjuntar texto médico.' },
        { selector: '#recordBtn', text: 'Inicia o detiene la grabación de voz. Al finalizar, el audio queda listo para transcribir.' },
        { selector: '#dropZone', text: 'Arrastrá o tocá para subir audios. Podés cargar varios archivos y procesarlos juntos.' },
        { selector: '#chkNormalize', text: 'Normaliza volumen para mejorar claridad de voz y reducir diferencias de intensidad.' },
        { selector: '#chkNoise', text: 'Aplica limpieza básica de ruido para mejorar resultados de transcripción.' },
        { selector: '#chkJoinAudios', text: 'Une varios audios en un solo informe. Útil cuando el estudio fue grabado por partes.' },
        { selector: '#transcribeBtn', text: 'Convierte el audio en texto sin estructurarlo automáticamente.' },
        { selector: '#transcribeAndStructureBtn', text: 'Transcribe audio y luego estructura con IA en un solo paso (modo Pro).' },
        { selector: '#proTextInput', text: 'Pegá aquí texto médico para estructurarlo con IA sin pasar por transcripción de audio.' },
        { selector: '#btnAttachTextFile', text: 'Carga un archivo de texto (.txt/.md/.rtf) para estructurarlo.' },
        { selector: '#btnStructureTextPro', text: 'Toma el texto actual y genera el informe estructurado con IA.' },
        { selector: '#templateSelect', text: 'Seleccioná una plantilla clínica para guiar la estructuración del informe.' },
        { selector: '#btnStructureAI', text: 'Estructura con IA el texto actual del editor usando la plantilla activa.' },
        { selector: '#btnConfigPdfMain', text: 'Abre configuración de PDF para definir formato, firma, logo y datos de salida.' },
        { selector: '#btnDownloadFromPreview', text: 'Descarga el informe desde la vista previa en el formato permitido por tu plan.' }
    ];

    let pop = null;
    let activeBtn = null;

    function ensurePopover() {
        if (pop) return pop;
        pop = document.createElement('div');
        pop.className = 'fixed-tip-popover';
        pop.id = 'fixedTipPopover';
        document.body.appendChild(pop);
        return pop;
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
        const width = Math.min(340, window.innerWidth - 24);

        let left = rect.left + rect.width + 8;
        if (left + width > window.innerWidth - margin) {
            left = Math.max(margin, rect.right - width);
        }

        let top = rect.top - 2;
        if (top + 70 > window.innerHeight - margin) {
            top = Math.max(margin, window.innerHeight - 78);
        }

        p.style.left = `${Math.round(left)}px`;
        p.style.top = `${Math.round(top)}px`;
    }

    function openTip(btn, text) {
        const p = ensurePopover();
        p.innerHTML = `<strong>Ayuda rápida:</strong> ${String(text || '').trim()}`;
        positionPopover(btn);
        p.classList.add('active');
        activeBtn = btn;
    }

    function attachTip(target, text) {
        if (!target || target.dataset.fixedTipBound === '1') return;
        target.dataset.fixedTipBound = '1';

        const anchor = target.closest('.card, .drop-zone, .join-audios-option, .btn, .btn-full, .btn-ai-magic, .toolbar-select, .audio-option') || target;
        anchor.classList.add('fixed-tip-anchor');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fixed-tip-btn';
        btn.textContent = '?';
        btn.setAttribute('aria-label', 'Ayuda');
        btn.title = 'Ayuda';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeBtn === btn && pop && pop.classList.contains('active')) {
                closeTip();
                return;
            }
            openTip(btn, text);
        });

        anchor.appendChild(btn);
    }

    function bindAll() {
        TIPS.forEach((entry) => {
            const el = document.querySelector(entry.selector);
            if (el) attachTip(el, entry.text);
        });
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }
})();
