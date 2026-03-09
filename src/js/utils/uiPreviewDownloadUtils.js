// ============ UI PREVIEW DOWNLOAD DROPDOWN UTILS ============

window.initPreviewDownloadDropdown = function (btnDownloadFromPreview) {
    const btnDownloadPreviewMore = document.getElementById('btnDownloadPreviewMore');
    const previewDownloadDropdown = document.getElementById('previewDownloadDropdown');
    if (!btnDownloadPreviewMore || !previewDownloadDropdown) return;

    // SVG inside the button may capture click events.
    const svgInBtn = btnDownloadPreviewMore.querySelector('svg');
    if (svgInBtn) svgInBtn.style.pointerEvents = 'none';

    const getAllowedFormats = () => {
        const cfg = window.CLIENT_CONFIG || {};
        const type = (cfg.type || 'ADMIN').toUpperCase();
        if (type === 'ADMIN' || type === 'PRO') return ['pdf', 'rtf', 'txt', 'html'];
        if (type === 'NORMAL') return ['pdf'];
        return ['txt'];
    };

    const applyFormatRestrictions = () => {
        const allowed = getAllowedFormats();
        previewDownloadDropdown.querySelectorAll('button[data-format]').forEach(btn => {
            const fmt = btn.dataset.format;
            btn.style.display = allowed.includes(fmt) ? 'block' : 'none';
        });

        if (btnDownloadFromPreview) {
            if (allowed.includes('pdf')) {
                btnDownloadFromPreview.textContent = '📥 Descargar PDF';
                btnDownloadFromPreview._forceTxt = false;
            } else {
                btnDownloadFromPreview.textContent = '📥 Descargar TXT';
                btnDownloadFromPreview._forceTxt = true;
            }
        }

        btnDownloadPreviewMore.style.display = allowed.length > 1 ? '' : 'none';
    };

    applyFormatRestrictions();

    btnDownloadPreviewMore.addEventListener('click', (e) => {
        e.stopPropagation();
        applyFormatRestrictions();
        const isOpen = previewDownloadDropdown.style.display !== 'none';
        if (isOpen) {
            previewDownloadDropdown.style.display = 'none';
            return;
        }

        const rect = btnDownloadPreviewMore.getBoundingClientRect();
        previewDownloadDropdown.style.position = 'fixed';
        previewDownloadDropdown.style.top = 'auto';
        previewDownloadDropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        previewDownloadDropdown.style.left = rect.left + 'px';
        previewDownloadDropdown.style.right = 'auto';
        previewDownloadDropdown.style.width = 'max-content';
        previewDownloadDropdown.style.display = 'block';
    });

    previewDownloadDropdown.querySelectorAll('button[data-format]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            previewDownloadDropdown.style.display = 'none';
            const fmt = btn.dataset.format;
            if (fmt === 'pdf') {
                btnDownloadFromPreview?.click();
            } else if (typeof window['download' + fmt.toUpperCase()] === 'function') {
                window['download' + fmt.toUpperCase()]();
            } else if (typeof showToast === 'function') {
                showToast(`Formato .${fmt} no disponible aun`, 'info');
            }
        });

        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
    });

    document.addEventListener('click', (e) => {
        if (!previewDownloadDropdown.contains(e.target) && !btnDownloadPreviewMore.contains(e.target)) {
            previewDownloadDropdown.style.display = 'none';
        }
    });
};
