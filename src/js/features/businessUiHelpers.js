// ============ BUSINESS UI HELPERS ============

// Particulas decorativas para onboarding
function _createOnboardingParticles() {
    const container = document.getElementById('onboardingParticles');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#14b8a6', '#0f766e', '#f59e0b', '#6366f1', '#ec4899'];
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('span');
        p.className = 'onboarding-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = 60 + Math.random() * 40 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = Math.random() * 4 + 's';
        p.style.animationDuration = 3 + Math.random() * 3 + 's';
        p.style.width = 4 + Math.random() * 6 + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
}

// Confetti burst al activar la app
function _launchConfetti() {
    const colors = ['#14b8a6', '#0f766e', '#f59e0b', '#6366f1', '#ec4899', '#22c55e', '#ef4444'];
    for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + 's';
        el.style.animationDuration = 2 + Math.random() * 2 + 's';
        el.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// Settings Gear: mostrar boton e inicializar panel
function _showSettingsGear() {
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.style.display = '';
    if (typeof initSettingsPanel === 'function') initSettingsPanel();
}

// PWA Install: intentar mostrar prompt con reintentos
function _tryPwaInstall(maxRetries) {
    if (window._pwaInstallFlowStarted) return;
    window._pwaInstallFlowStarted = true;

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        return;
    }

    let attempt = 0;
    const interval = setInterval(() => {
        attempt++;
        if (window._pwaInstallPrompt) {
            clearInterval(interval);
            _showPwaInstallBanner();
            return;
        }
        if (attempt >= maxRetries) {
            clearInterval(interval);
            // No hay prompt disponible: escuchar si llega despues
            window.addEventListener('beforeinstallprompt', () => {
                if (!sessionStorage.getItem('pwa_banner_dismissed')) {
                    _showPwaInstallBanner();
                }
            }, { once: true });
            // Mostrar instruccion manual como fallback
            _showManualInstallHint();
        }
    }, 2000);
}

function _showPwaInstallBanner() {
    // Mostrar banner llamativo de instalacion
    let banner = document.getElementById('pwaInstallBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#1a56a0,#2563eb);color:white;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,.3);animation:slideUp .4s ease-out;';
        banner.innerHTML = `
            <div style="flex:1;">
                <strong>📱 Instalá la app en tu dispositivo</strong>
                <p style="margin:2px 0 0;font-size:.82rem;opacity:.85;">Accedé más rápido desde tu escritorio o pantalla de inicio</p>
            </div>
            <button id="pwaInstallBannerBtn" style="background:white;color:#1a56a0;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;white-space:nowrap;font-size:.9rem;">Instalar</button>
            <button id="pwaInstallBannerClose" style="background:transparent;border:none;color:white;font-size:1.3rem;cursor:pointer;padding:4px 8px;opacity:.7;">✕</button>
        `;
        // Agregar animacion
        const style = document.createElement('style');
        style.textContent = '@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
        document.head.appendChild(style);
        document.body.appendChild(banner);

        document.getElementById('pwaInstallBannerBtn').addEventListener('click', () => {
            if (window._pwaInstallPrompt) {
                window._pwaInstallPrompt.prompt();
                window._pwaInstallPrompt.userChoice.then(choice => {
                    console.info('[PWA] Install from banner:', choice.outcome);
                    window._pwaInstallPrompt = null;
                    banner.remove();
                    const btnInstall = document.getElementById('btnInstallPwa');
                    if (btnInstall) btnInstall.style.display = 'none';
                    if (choice.outcome === 'accepted' && typeof showToast === 'function') {
                        showToast('✅ ¡App instalada! La encontrarás en tu escritorio.', 'success');
                    }
                });
            }
        });

        document.getElementById('pwaInstallBannerClose').addEventListener('click', () => {
            banner.remove();
            sessionStorage.setItem('pwa_banner_dismissed', 'true');
        });
    }
}

function _showManualInstallHint() {
    // No mostrar si ya fue descartado o ya esta instalada
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;

    // Detectar navegador para instrucciones especificas
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    let msg = '📱 Podés instalar esta app: ';
    if (isChrome || isEdge) {
        msg += 'clicá el ícono ⬇️ en la barra de direcciones del navegador.';
    } else if (isSafari) {
        msg += 'tocá el botón Compartir → "Agregar a pantalla de inicio".';
    } else {
        msg += 'usá el menú del navegador → "Instalar app" o "Agregar a pantalla de inicio".';
    }

    if (typeof showToast === 'function') {
        showToast(msg, 'info', 8000);
    }
}

// Helper: inicializar y abrir Session Assistant
function _launchSessionAssistant() {
    if (typeof initSessionAssistant === 'function') initSessionAssistant();
    // Pequeno delay para que la UI se estabilice
    setTimeout(() => {
        if (typeof openSessionAssistant === 'function') openSessionAssistant();
    }, 350);
}
