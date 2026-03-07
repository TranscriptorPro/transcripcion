/* ════════════════════════════════════════════════════
   PWA — Service Worker + Install Prompt (beforeinstallprompt)
   Extraído de index.html (líneas 2495-2613)
════════════════════════════════════════════════════ */

        (function () {
            // Registrar Service Worker
            if ('serviceWorker' in navigator) {
                // Recargar cuando un nuevo SW toma el control (solo en UPDATES, no en primera instalaciÃ³n)
                let refreshing = false;
                let hadController = !!navigator.serviceWorker.controller;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    if (!hadController) {
                        // Primera activaciÃ³n del SW â€” no recargar (evita interrumpir factory setup)
                        hadController = true;
                        console.log('[SW] Primera activaciÃ³n del SW â€” sin recarga');
                        return;
                    }
                    refreshing = true;
                    console.log('[SW] Nuevo SW tomÃ³ el control, recargando...');
                    window.location.reload();
                });

                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
                        .then(reg => {
                            console.log('[SW] Registrado:', reg.scope);
                            // Forzar check de update en cada carga
                            reg.update().catch(() => {});

                            // Check periÃ³dico de updates cada 30 segundos
                            setInterval(() => {
                                reg.update().catch(() => {});
                            }, 30000);

                            // Cuando hay un SW esperando (ej: de una visita anterior), activarlo
                            if (reg.waiting) {
                                console.log('[SW] SW en espera detectado, activando...');
                                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                            }

                            // Detectar nuevas instalaciones
                            reg.addEventListener('updatefound', () => {
                                const newSW = reg.installing;
                                if (!newSW) return;
                                newSW.addEventListener('statechange', () => {
                                    // Cuando el nuevo SW termina de instalarse y queda en waiting
                                    if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                                        console.log('[SW] Nuevo SW instalado, activando...');
                                        newSW.postMessage({ type: 'SKIP_WAITING' });
                                    }
                                });
                            });
                        })
                        .catch(err => console.warn('[SW] Error al registrar:', err));
                });
            }

            // PWA3: capturar beforeinstallprompt
            let deferredPrompt = null;
            window._pwaInstallPrompt = null; // Exponer globalmente
            const btnInstall   = document.getElementById('btnInstallPwa');

            // Si la app ya estÃ¡ instalada (standalone), ocultar botÃ³n
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                              || window.navigator.standalone === true;
            if (isStandalone) {
                console.log('[PWA] App ya instalada (standalone mode)');
                if (btnInstall) btnInstall.style.display = 'none';
            } else {
                console.log('[PWA] App en navegador â€” botÃ³n instalar visible');
                if (btnInstall) btnInstall.style.display = '';  // siempre visible si no instalada
            }

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                window._pwaInstallPrompt = e; // Para que business.js pueda usarlo
                console.log('[PWA] beforeinstallprompt capturado');
                if (btnInstall) btnInstall.style.display = '';
            });

            if (btnInstall) {
                btnInstall.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        // Navegador soporta install prompt nativo
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log('[PWA] Install outcome:', outcome);
                        deferredPrompt = null;
                        window._pwaInstallPrompt = null;
                        if (outcome === 'accepted') {
                            btnInstall.style.display = 'none';
                            if (typeof showToast === 'function') showToast('âœ… Â¡App instalada! La encontrarÃ¡s en tu escritorio.', 'success');
                        }
                    } else {
                        // Fallback: instrucciones manuales
                        const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
                        const isEdge = /Edg/.test(navigator.userAgent);
                        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
                        let msg = 'ðŸ“± Para instalar: ';
                        if (isChrome || isEdge) {
                            msg += 'hacÃ© clic en el Ã­cono â¬‡ï¸ en la barra de direcciones del navegador.';
                        } else if (isSafari) {
                            msg += 'tocÃ¡ el botÃ³n Compartir â†’ "Agregar a pantalla de inicio".';
                        } else {
                            msg += 'usÃ¡ el menÃº del navegador â†’ "Instalar app" o "Agregar a pantalla de inicio".';
                        }
                        if (typeof showToast === 'function') showToast(msg, 'info', 8000);
                    }
                });
            }

            // Ocultar botÃ³n si se instala
            window.addEventListener('appinstalled', () => {
                if (btnInstall) btnInstall.style.display = 'none';
                deferredPrompt = null;
                window._pwaInstallPrompt = null;
                console.log('[PWA] App instalada â€” botÃ³n oculto');
            });
        })();
