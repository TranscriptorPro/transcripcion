function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastMessage) {
        toastMessage.textContent = msg;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
        console.warn('Toast elements not found in DOM', msg);
    }
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
        btn.style.cssText = 'margin-left:8px;background:rgba(255,255,255,0.9);color:#1a1a1a;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;font-size:0.78rem;font-weight:700;flex-shrink:0;';
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
 * Muestra un toast preguntando si unir los audios.
 * Devuelve una Promise<boolean>: true = sí unir, false = no (timeout o botón No).
 * Se muestra cuando hay múltiples archivos y el checkbox no está tildado.
 */
window.askJoinAudiosPromise = function(fileCount, timeoutMs = 7000) {
    return new Promise((resolve) => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        if (!toast || !toastMessage) { resolve(false); return; }

        // Limpiar botones previos
        toast.querySelectorAll('.toast-action-btn').forEach(b => b.remove());

        toastMessage.textContent = `Subiste ${fileCount} audios. ¿Querés unirlos en una sola pestaña?`;

        const btnYes = document.createElement('button');
        btnYes.className = 'toast-action-btn';
        btnYes.textContent = 'Sí, unir';
        btnYes.style.cssText = 'margin-left:8px;background:rgba(255,255,255,0.95);color:#1a56a0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;font-size:0.78rem;font-weight:700;flex-shrink:0;';

        const btnNo = document.createElement('button');
        btnNo.className = 'toast-action-btn';
        btnNo.textContent = 'No';
        btnNo.style.cssText = 'margin-left:4px;background:rgba(255,255,255,0.3);color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:0.78rem;flex-shrink:0;';

        let resolved = false;
        const finish = (value) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            toast.classList.remove('show');
            toast.querySelectorAll('.toast-action-btn').forEach(b => b.remove());
            resolve(value);
        };

        btnYes.addEventListener('click', () => finish(true),  { once: true });
        btnNo.addEventListener ('click', () => finish(false), { once: true });

        toast.appendChild(btnYes);
        toast.appendChild(btnNo);
        toast.className = 'toast info show';

        const timer = setTimeout(() => finish(false), timeoutMs);
    });
};
