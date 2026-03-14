// ============ EDITOR: DOWNLOAD FAVORITES UI ============

(function initEditorDownloadFavoritesUtils() {
    const downloadDropdown = document.getElementById('downloadDropdown');
    const downloadBtnMain = document.getElementById('downloadBtnMain');
    const downloadBtnChevron = document.getElementById('downloadBtn');
    const FORMAT_LABELS = { pdf: 'PDF', rtf: 'RTF', html: 'HTML' };

    let _prefFmtCache = null;
    if (typeof appDB !== 'undefined') {
        appDB.get('preferred_download_format').then(function(v) { if (v) _prefFmtCache = v; }).catch(function() {});
    }

    function getPreferredFormat() {
        return _prefFmtCache || localStorage.getItem('preferred_download_format') || 'pdf';
    }

    function setPreferredFormat(fmt) {
        _prefFmtCache = fmt;
        if (typeof appDB !== 'undefined') appDB.set('preferred_download_format', fmt);
        else localStorage.setItem('preferred_download_format', fmt);
        updateFavUI();
    }

    function updateFavUI() {
        const fav = getPreferredFormat();
        const label = document.getElementById('downloadFavLabel');
        if (label) label.textContent = FORMAT_LABELS[fav] || 'PDF';
        document.querySelectorAll('#downloadDropdown .fav-star').forEach(star => {
            const fmt = star.dataset.fmt;
            star.textContent = fmt === fav ? '⭐' : '☆';
            star.classList.toggle('active', fmt === fav);
        });
    }

    if (downloadBtnMain) {
        downloadBtnMain.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fmt = getPreferredFormat();
            try {
                if (typeof window.downloadFile === 'function') {
                    await window.downloadFile(fmt);
                    return;
                }
                const fallback = window['download' + String(fmt || '').toUpperCase()];
                if (typeof fallback === 'function') {
                    await fallback();
                    return;
                }
                if (typeof showToast === 'function') showToast('No se encontró el módulo de descarga', 'error');
            } catch (err) {
                console.warn('Download main button error:', err);
                if (typeof showToast === 'function') showToast('Error al descargar. Reintentá.', 'error');
            }
        });
    }

    if (downloadBtnChevron && downloadDropdown) {
        downloadBtnChevron.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadDropdown.classList.toggle('open');
        });

        document.addEventListener('click', e => {
            if (!downloadBtnChevron.contains(e.target) && !downloadDropdown.contains(e.target)
                && !(downloadBtnMain && downloadBtnMain.contains(e.target))) {
                downloadDropdown.classList.remove('open');
            }
        });
    }

    document.querySelectorAll('#downloadDropdown .fav-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setPreferredFormat(star.dataset.fmt);
            if (typeof showToast === 'function') showToast(`⭐ Formato favorito: ${FORMAT_LABELS[star.dataset.fmt]}`, 'success');
        });
    });

    updateFavUI();

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async () => {
            const format = item.dataset.format;
            try {
                if (typeof window.downloadFile === 'function') {
                    await window.downloadFile(format);
                }
            } catch (err) {
                console.warn('Download dropdown item error:', err);
                if (typeof showToast === 'function') showToast('Error al descargar formato', 'error');
            }
            if (downloadDropdown) downloadDropdown.classList.remove('open');
        });
    });

    window.getPreferredFormat = getPreferredFormat;
})();
