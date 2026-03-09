// ============ BUSINESS FACTORY UI OVERLAYS ============

// Overlay de carga durante el setup
function _showSetupLoadingOverlay() {
    let overlay = document.getElementById('factorySetupOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'factorySetupOverlay';
        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
                <div style="font-size:48px;margin-bottom:16px;">⚙️</div>
                <h2 style="margin:0 0 8px;color:#1a56a0;font-size:1.3rem;">Configurando tu app...</h2>
                <p style="color:#666;font-size:.9rem;margin:0 0 20px;">Conectando con el servidor y preparando tu espacio de trabajo</p>
                <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#1a56a0;border-radius:50%;animation:factorySpinner 1s linear infinite;margin:0 auto;"></div>
            </div>
        `;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);';
        // Agregar animacion CSS
        const style = document.createElement('style');
        style.textContent = '@keyframes factorySpinner{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function _hideSetupLoadingOverlay() {
    const overlay = document.getElementById('factorySetupOverlay');
    if (overlay) overlay.remove();
}

// Pantalla de error en el setup
function _showSetupError(message, code) {
    _hideSetupLoadingOverlay();
    let overlay = document.getElementById('factoryErrorOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'factoryErrorOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);';
        document.body.appendChild(overlay);
    }

    const codeLabels = {
        NOT_FOUND: 'El enlace no corresponde a ningún usuario registrado.',
        BANNED: 'Esta cuenta ha sido suspendida. Contactá al administrador.',
        INACTIVE: 'Esta cuenta está desactivada. Contactá al administrador.',
        EXPIRED: 'La licencia ha expirado. Contactá al administrador para renovar.',
        DEVICE_LIMIT: 'Se alcanzó el límite de dispositivos. Contactá al administrador.',
        NETWORK: message
    };

    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
            <div style="font-size:48px;margin-bottom:16px;">❌</div>
            <h2 style="margin:0 0 8px;color:#dc2626;font-size:1.2rem;">No se pudo configurar la app</h2>
            <p style="color:#666;font-size:.9rem;margin:0 0 20px;">${codeLabels[code] || message}</p>
            <button onclick="location.reload()" style="background:#1a56a0;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:.9rem;">Reintentar</button>
        </div>
    `;
    overlay.style.display = 'flex';
}
