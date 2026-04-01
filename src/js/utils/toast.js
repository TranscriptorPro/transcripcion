function showToast(msg, type = 'success', duration = 3000) {
    let toast = document.getElementById('toast');
    let toastMessage = document.getElementById('toastMessage');

    // Crear elementos defensivamente si no existen
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:20px;left:20px;width:300px;max-width:90%;background:#333;color:#fff;padding:15px;border-radius:4px;z-index:9999;display:none;';
        document.body.appendChild(toast);
    }
    if (!toastMessage) {
        toastMessage = document.createElement('span');
        toastMessage.id = 'toastMessage';
        toast.insertBefore(toastMessage, toast.firstChild);
    }

    toastMessage.textContent = msg;
    toast.className = `toast ${type} show`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.display = 'none';
    }, duration);
}

// Toast con botón de acción opcional
window.showToastWithAction = function(msg, type = 'error', actionText = 'Ver', actionFn = null, duration = 5000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) { console.warn('Toast not found:', msg); return; }

    // Limpiar botón previo si existía
    const existing = toast.querySelector('.toast-action-btn');
    if (existing) existing.remove();

    toastMessage.textContent = msg;

    if (actionFn) {
        const btn = document.createElement('button');
        btn.className = 'toast-action-btn';
        btn.textContent = actionText;
        btn.onclick = () => { toast.classList.remove('show'); actionFn(); };
        toast.appendChild(btn);
    }

    toast.className = `toast ${type} show`;
    const timer = setTimeout(() => {
        toast.classList.remove('show');
        const b = toast.querySelector('.toast-action-btn');
        if (b) b.remove();
    }, duration);
    // Cancelar timer si el usuario hace clic en el botón
    const btn2 = toast.querySelector('.toast-action-btn');
    if (btn2) btn2.addEventListener('click', () => clearTimeout(timer), { once: true });
};

/**
 * Muestra un diálogo inline junto al botón Transcribir preguntando si unir audios.
 * Devuelve una Promise<boolean>: true = sí unir, false = no.
 * No tiene tiempo de expiración: espera la decisión del usuario.
 */
window.askJoinAudiosPromise = function(fileCount) {
    return new Promise((resolve) => {
        const dialog  = document.getElementById('joinAudiosDialog');
        const title   = document.getElementById('joinAudiosDialogTitle');
        const btnYes  = document.getElementById('joinAudiosYes');
        const btnNo   = document.getElementById('joinAudiosNo');

        if (!dialog || !btnYes || !btnNo) { resolve(false); return; }

        if (title) title.textContent = `Subiste ${fileCount} audio${fileCount !== 1 ? 's' : ''}`;

        // Mostrar
        dialog.style.display = 'block';

        let resolved = false;
        const finish = (value) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(safetyTimer);
            dialog.style.display = 'none';
            // Clonar para limpiar listeners anteriores
            btnYes.replaceWith(btnYes.cloneNode(true));
            btnNo.replaceWith(btnNo.cloneNode(true));
            resolve(value);
        };

        // Safety timeout: si el diálogo es ocultado externamente, resolver en false
        const safetyTimer = setTimeout(() => {
            if (!resolved && dialog.style.display === 'none') finish(false);
        }, 30000);

        document.getElementById('joinAudiosYes').addEventListener('click', () => finish(true),  { once: true });
        document.getElementById('joinAudiosNo') .addEventListener('click', () => finish(false), { once: true });
    });
};
