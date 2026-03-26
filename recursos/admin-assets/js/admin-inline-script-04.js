/* ── Configuration ──────────────────────────────────────────────────── */
        const CONFIG = {
            scriptUrl: 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec',
            sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours in ms
        };

        // Exponer configuración para scripts auxiliares (planes/extras) que la leen desde window.
        if (typeof window !== 'undefined') {
            window.CONFIG = CONFIG;
        }

        /* Helper: obtener credenciales de la sesión para API calls */
        function _getSessionAuthParams() {
            try {
                const s = JSON.parse(sessionStorage.getItem('adminSession') || '{}');
                if (s.sessionToken) {
                    return `sessionToken=${encodeURIComponent(s.sessionToken)}&sessionUser=${encodeURIComponent(s.username)}&sessionNivel=${encodeURIComponent(s.nivel || '')}&sessionExpiry=${encodeURIComponent(s.tokenExpiry || '')}`;
                }
            } catch(e) {}
            // Fallback: admin key hardcodeada
            return `adminKey=${encodeURIComponent('ADMIN_SECRET_2026')}`;
        }

        /* ── Authentication (ya verificada en <head>, esto es solo cleanup) ── */
        (function checkAuth() {
            const raw = sessionStorage.getItem('adminSession');
            if (!raw) {
                window.location.replace('login.html');
                return;
            }
            try {
                const session = JSON.parse(raw);
                // Verificar tokenExpiry del backend (fuente de verdad)
                if (session.tokenExpiry && Date.now() > session.tokenExpiry) {
                    sessionStorage.removeItem('adminSession');
                    dashAlert('⏰ Tu sesión expiró (8 horas). Volvé a iniciar sesión.', '⏰').then(() => {
                        window.location.href = 'login.html';
                    });
                    return;
                }
                // Fallback: verificar por timestamp si no hay tokenExpiry
                const hoursSinceLogin = (Date.now() - session.timestamp) / (1000 * 60 * 60);
                if (hoursSinceLogin >= 8) {
                    sessionStorage.removeItem('adminSession');
                    dashAlert('⏰ Tu sesión expiró (8 horas). Volvé a iniciar sesión.', '⏰').then(() => {
                        window.location.href = 'login.html';
                    });
                    return;
                }
            } catch (e) {
                sessionStorage.removeItem('adminSession');
                window.location.href = 'login.html';
                return;
            }
            // Limpiar param ?fromApp de la URL si existe
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('fromApp')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        })();

        /* Auto-refresh de sesión (nunca expira, solo renueva el timestamp) */
        let _inactivityTimer = null;
        function resetInactivityTimer() {
            clearTimeout(_inactivityTimer);
            // Solo renovamos el timestamp, no redirigimos a ningún lado
            _inactivityTimer = setTimeout(() => {
                const raw = sessionStorage.getItem('adminSession');
                if (raw) {
                    const s = JSON.parse(raw);
                    s.timestamp = Date.now();
                    sessionStorage.setItem('adminSession', JSON.stringify(s));
                }
            }, CONFIG.sessionTimeout);
        }
        ['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt =>
            document.addEventListener(evt, resetInactivityTimer, { passive: true })
        );
        resetInactivityTimer();

        /* Sample data used when the backend URL has not been configured yet */
        const SAMPLE_USERS = [
            {
                ID_Medico: 'DR001',
                Nombre: 'Dr. Juan Pérez',
                Matricula: 'MN 12345',
                Email: 'juan.perez@example.com',
                Especialidad: 'Cardiología',
                Plan: 'trial',
                Estado: 'trial',
                Fecha_Registro: '2026-02-15',
                Fecha_Vencimiento: '2026-02-22',
                Devices_Max: 3,
                Usage_Count: 5,
                Notas_Admin: 'Usuario de prueba - trial activo'
            },
            {
                ID_Medico: 'DR002',
                Nombre: 'Dra. María García',
                Matricula: 'MP 67890',
                Email: 'maria.garcia@example.com',
                Especialidad: 'ORL',
                Plan: 'pro',
                Estado: 'active',
                Fecha_Registro: '2026-01-10',
                Fecha_Vencimiento: '2026-12-31',
                Devices_Max: 3,
                Usage_Count: 127,
                Notas_Admin: 'Cliente pagado - plan anual'
            },
            {
                ID_Medico: 'DR003',
                Nombre: 'Dr. Carlos Rodríguez',
                Matricula: 'MN 11111',
                Email: 'carlos.r@example.com',
                Especialidad: 'Gastroenterología',
                Plan: 'trial',
                Estado: 'expired',
                Fecha_Registro: '2026-01-20',
                Fecha_Vencimiento: '2026-01-27',
                Devices_Max: 3,
                Usage_Count: 23,
                Notas_Admin: 'Trial expirado - seguimiento pendiente'
            }
        ];

        /* ── Enhanced API ────────────────────────────────────────────────────── */
        const API = {
            async call(endpoint) {
                const authParams = _getSessionAuthParams();
                const separator = endpoint.includes('?') ? '&' : '?';
                const url = `${CONFIG.scriptUrl}${endpoint}${separator}${authParams}`;

                try {
                    const response = await fetch(url, {
                        method: 'GET'
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (data.error) {
                        throw new Error(data.error);
                    }

                    return data;
                } catch (error) {
                    console.error('API Error:', error);
                    showNotification(`Error: ${error.message}`, 'error');
                    throw error;
                }
            },

            async getUsers() {
                return await this.call('?action=admin_list_users');
            },

            async updateUser(userId, updates) {
                const updatesJson = encodeURIComponent(JSON.stringify(updates));
                return await this.call(`?action=admin_update_user&userId=${encodeURIComponent(userId)}&updates=${updatesJson}`);
            },

            async getUserMetrics(userId) {
                return await this.call(`?action=admin_get_metrics&userId=${encodeURIComponent(userId)}`);
            },

            async getGlobalStats() {
                return await this.call('?action=admin_get_global_stats');
            },

            async getLogs(filterDate, filterType) {
                let qs = '?action=admin_get_logs';
                if (filterDate) qs += `&date=${encodeURIComponent(filterDate)}`;
                if (filterType) qs += `&type=${encodeURIComponent(filterType)}`;
                return await this.call(qs);
            },

            async clearLogs() {
                return await this.call('?action=admin_clear_logs');
            },

            async logAction(action, userId, details) {
                try {
                    const raw = sessionStorage.getItem('adminSession');
                    const session = raw ? JSON.parse(raw) : {};
                    const adminUser = encodeURIComponent(session.username || 'unknown');
                    await this.call(`?action=admin_log_action&adminUser=${adminUser}&logAction=${encodeURIComponent(action)}&userId=${encodeURIComponent(userId)}&details=${encodeURIComponent(details)}`);
                } catch (err) { console.warn('logAction failed (non-blocking):', err); }
            },

            async getDiagnostic(userId) {
                return await this.call(`?action=admin_get_diagnostic&userId=${encodeURIComponent(userId)}`);
            },

            async deleteUser(userId) {
                return await this.call(`?action=admin_delete_user&userId=${encodeURIComponent(userId)}`);
            },

            async listSupport(status) {
                return await this.call(`?action=admin_list_support&status=${encodeURIComponent(status || 'pendiente')}`);
            },

            async resolveSupport(requestId, nota) {
                return await this.call(`?action=admin_resolve_support&requestId=${encodeURIComponent(requestId)}&nota=${encodeURIComponent(nota || '')}`);
            },

            async releaseDevices(userId) {
                return await this.call(`?action=admin_release_devices&userId=${encodeURIComponent(userId)}`);
            }
        };

        /* ── State ───────────────────────────────────────────────────────────── */
        let allUsers = [];
        let currentEditUser = null;
        let refreshInterval = null;
        let notificationTimer = null;
        let metricsLoaded = false;
        let logsLoaded = false;
        let registrosLoaded = false;
        let soporteLoaded = false;
        let templatesAdminLoaded = false;
        let currentTemplateAdminEditKey = '';
        let allRegistrations = [];
        let currentActiveTab = 'usuarios';
        let activeRefreshInFlight = false;

        /* ── API ─────────────────────────────────────────────────────────────── */
        async function fetchUsers() {
            if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                /* Backend not yet configured — use sample data */
                return SAMPLE_USERS;
            }
            try {
                const url = `${CONFIG.scriptUrl}?action=admin_list_users&${_getSessionAuthParams()}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                // Detectar error de autenticación del backend
                if (data.error) {
                    const errLower = (data.error || '').toLowerCase();
                    if (errLower.includes('unauthorized') || errLower.includes('expired') || errLower.includes('invalid session')) {
                        console.warn('Session expired on backend:', data.error);
                        sessionStorage.removeItem('adminSession');
                        dashAlert('⏰ Tu sesión expiró. Volvé a iniciar sesión.', '⏰').then(() => {
                            window.location.href = 'login.html';
                        });
                        return [];
                    }
                    throw new Error(data.error);
                }

                const users = data.users || [];
                // Guardar en caché con timestamp para stale-while-revalidate
                try {
                    sessionStorage.setItem('_adminUsersCache', JSON.stringify({ ts: Date.now(), users }));
                } catch (_) {}
                return users;
            } catch (error) {
                console.error('Error fetching users:', error);
                showToast('Error al cargar usuarios. Usando datos de muestra.', 'warning');
                return SAMPLE_USERS;
            }
        }

        async function updateUser(userId, updates) {
            if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                /* Simulate success when backend is not configured */
                return { success: true };
            }
            try {
                const updatesJson = encodeURIComponent(JSON.stringify(updates));
                const url = `${CONFIG.scriptUrl}?action=admin_update_user&userId=${encodeURIComponent(userId)}&updates=${updatesJson}&${_getSessionAuthParams()}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error updating user:', error);
                return { error: error.message };
            }
        }

        /* ── Helpers ─────────────────────────────────────────────────────────── */
        function getStatusText(estado) {
            const map = {
                active: '✅ Activo',
                trial: '⏰ Trial',
                expired: '⚠️ Expirado',
                banned: '🚫 Bloqueado'
            };
            return map[estado] || estado;
        }

        function formatDate(dateStr) {
            if (!dateStr) return '—';
            // Limpiar string de fecha (remover hora si existe)
            const cleanDate = String(dateStr).split('T')[0];
            try {
                const [y, m, d] = cleanDate.split('-');
                if (!y || !m || !d) return dateStr;
                return `${d}/${m}/${y}`;
            } catch (_) {
                return dateStr;
            }
        }

        function showToast(message, type = 'info') {
            const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '×';
            closeBtn.setAttribute('aria-label', 'Cerrar');
            closeBtn.addEventListener('click', () => toast.remove());
            const iconEl = document.createElement('div');
            iconEl.className = 'toast-icon';
            iconEl.textContent = icons[type] || icons.info;
            const msgEl = document.createElement('div');
            msgEl.className = 'toast-message';
            msgEl.textContent = message;
            toast.append(iconEl, msgEl, closeBtn);
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 50);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        function showNotification(message, type = 'info') {
            let notification = document.getElementById('notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'notification';
                notification.className = 'notification';
                // Insert after tabs nav (before tab content) to not overlap
                const tabsNav = document.querySelector('.tabs-nav');
                if (tabsNav && tabsNav.nextSibling) {
                    tabsNav.parentNode.insertBefore(notification, tabsNav.nextSibling);
                } else {
                    document.body.appendChild(notification);
                }
            }

            notification.textContent = message;
            notification.className = `notification notification-${type} show`;

            clearTimeout(notificationTimer);
            notificationTimer = setTimeout(() => {
                notification.classList.remove('show');
            }, 4000);
        }

        // ── Custom Modal (reemplaza alert/confirm/prompt del navegador) ──
        let _dashModalResolve = null;

        function dashAlert(msg, icon = '⚠️') {
            return new Promise(resolve => {
                _dashModalResolve = resolve;
                document.getElementById('dashModalIcon').textContent = icon;
                document.getElementById('dashModalMsg').innerHTML = msg;
                document.getElementById('dashModalInput').style.display = 'none';
                document.getElementById('dashModalActions').innerHTML = '<button class="btn-primary" onclick="closeDashModal(true)" style="min-width:100px;">Aceptar</button>';
                document.getElementById('dashModalOverlay').classList.add('show');
            });
        }

        function dashConfirm(msg, icon = '❓') {
            return new Promise(resolve => {
                _dashModalResolve = resolve;
                document.getElementById('dashModalIcon').textContent = icon;
                document.getElementById('dashModalMsg').innerHTML = msg;
                document.getElementById('dashModalInput').style.display = 'none';
                document.getElementById('dashModalActions').innerHTML = `
                    <button class="btn-secondary" onclick="closeDashModal(false)" style="min-width:90px;">Cancelar</button>
                    <button class="btn-primary" onclick="closeDashModal(true)" style="min-width:90px;">Aceptar</button>
                `;
                document.getElementById('dashModalOverlay').classList.add('show');
            });
        }

        function dashPrompt(msg, defaultVal = '', icon = '✏️') {
            return new Promise(resolve => {
                _dashModalResolve = resolve;
                document.getElementById('dashModalIcon').textContent = icon;
                document.getElementById('dashModalMsg').innerHTML = msg;
                const inputDiv = document.getElementById('dashModalInput');
                const inputField = document.getElementById('dashModalInputField');
                inputDiv.style.display = 'block';
                inputField.value = defaultVal;
                inputField.placeholder = 'Escribí acá...';
                document.getElementById('dashModalActions').innerHTML = `
                    <button class="btn-secondary" onclick="closeDashModal(null)" style="min-width:90px;">Cancelar</button>
                    <button class="btn-primary" onclick="closeDashModal(document.getElementById('dashModalInputField').value)" style="min-width:90px;">Aceptar</button>
                `;
                document.getElementById('dashModalOverlay').classList.add('show');
                setTimeout(() => inputField.focus(), 100);
            });
        }

        function closeDashModal(result) {
            document.getElementById('dashModalOverlay').classList.remove('show');
            if (_dashModalResolve) { _dashModalResolve(result); _dashModalResolve = null; }
        }

        /* ── Tab Navigation ─────────────────────────────────────────────────── */
        function showTab(tabName) {
            currentActiveTab = tabName;

            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            // Remove active from all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show selected tab
            const selectedTab = document.getElementById(`tab-${tabName}`);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }

            // Activate button
            const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeBtn) activeBtn.classList.add('active');

            // Load data lazily
            // Load data — stale-while-revalidate en cada pestaña
            if (tabName === 'registros') {
                ensureRegQuickLinkButton();
                loadRegistrations();
            } else if (tabName === 'metricas') {
                loadGlobalStats();
            } else if (tabName === 'logs') {
                loadLogs();
            } else if (tabName === 'planes') {
                _initPlansEditor();
            } else if (tabName === 'extras') {
                _initExtrasEditor();
            } else if (tabName === 'plantillas') {
                _initTemplatesAdminPanel();
            } else if (tabName === 'soporte') {
                loadSupportRequests();
            }
        }

        function ensureRegQuickLinkButton() {
            const controls = document.getElementById('regFilterEstado')?.parentElement;
            if (!controls) return;

            let quickBtn = document.getElementById('btnCopyRegLinkQuick');
            if (!quickBtn) {
                quickBtn = document.createElement('button');
                quickBtn.id = 'btnCopyRegLinkQuick';
                quickBtn.type = 'button';
                quickBtn.className = 'btn-outline';
                quickBtn.title = 'Copiar link del formulario de registro';
                quickBtn.style.padding = '6px 10px';
                quickBtn.style.fontSize = '.82rem';
                quickBtn.textContent = '🔗 Copiar formulario';
                quickBtn.addEventListener('click', copyRegLink);
            }

            if (!controls.contains(quickBtn)) {
                controls.appendChild(quickBtn);
            }
        }

        function ensureLogsClearButton() {
            const refreshBtn = document.getElementById('btnRefreshLogs');
            const controls = refreshBtn?.parentElement;
            if (!controls) return;

            let clearBtn = document.getElementById('btnClearLogs');
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'btnClearLogs';
                clearBtn.type = 'button';
                clearBtn.className = 'btn-outline';
                clearBtn.style.padding = '6px 10px';
                clearBtn.style.fontSize = '.82rem';
                clearBtn.textContent = '🧹 Vaciar logs';
                clearBtn.addEventListener('click', clearLogs);
            }

            if (!controls.contains(clearBtn)) {
                controls.appendChild(clearBtn);
            }
        }

        async function clearLogs() {
            const ok = await dashConfirm('¿Vaciar todos los logs y dejar solo los de esta sesión?', '🧹');
            if (!ok) return;

            try {
                const result = await API.clearLogs();
                showNotification('🧹 Logs vaciados' + (result && typeof result.deleted === 'number' ? ` (${result.deleted})` : ''), 'success');
                logsLoaded = false;
                loadLogs();
            } catch (err) {
                await dashAlert('Error al vaciar logs: ' + err.message, '❌');
            }
        }

        function _ensureTemplatesAdminTab() {
            const tabsContainer = document.querySelector('.tabs-nav .container');
            if (!tabsContainer) return;

            if (!tabsContainer.querySelector('[data-tab="plantillas"]')) {
                const btn = document.createElement('button');
                btn.className = 'tab-btn';
                btn.dataset.tab = 'plantillas';
                btn.textContent = '🧩 Plantillas';
                btn.addEventListener('click', () => showTab('plantillas'));

                const extrasBtn = tabsContainer.querySelector('[data-tab="extras"]');
                if (extrasBtn && extrasBtn.nextSibling) tabsContainer.insertBefore(btn, extrasBtn.nextSibling);
                else tabsContainer.appendChild(btn);
            }

            if (document.getElementById('tab-plantillas')) return;

            const tab = document.createElement('div');
            tab.id = 'tab-plantillas';
            tab.className = 'tab-content';
            tab.innerHTML = `
                <section class="plans-section">
                    <div class="container">
                        <h2 style="margin-bottom:1rem;color:var(--text-primary);">🧩 Gestión de Plantillas</h2>
                        <p style="color:var(--text-secondary);margin-bottom:1.2rem;">
                            Agregá o editá plantillas médicas sin tocar código. Los cambios impactan en app, registro y panel admin desde el registro compartido.
                        </p>

                        <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;">
                            <button class="btn-primary" id="tplBtnNew">➕ Nueva plantilla</button>
                            <button class="btn-secondary" id="tplBtnExport">⬇️ Exportar JSON</button>
                            <button class="btn-secondary" id="tplBtnImport">⬆️ Importar JSON</button>
                            <button class="btn-secondary" id="tplBtnReset">↩️ Restaurar defaults</button>
                            <input type="file" id="tplImportFile" accept="application/json" style="display:none;">
                            <span id="tplCountBadge" style="font-size:.82rem;color:var(--text-secondary);align-self:center;"></span>
                        </div>

                        <div class="table-wrapper" style="margin-bottom:1.1rem;">
                            <table class="users-table" id="tplTable">
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>Nombre</th>
                                        <th>Categoría</th>
                                        <th>Keywords</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="tplTableBody">
                                    <tr><td colspan="6" class="text-center">⏳ Cargando plantillas...</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div style="background:var(--bg-secondary,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:1rem;">
                            <h3 style="margin:0 0 .8rem;color:var(--text-primary);font-size:1rem;">✏️ Editor de plantilla</h3>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
                                <div>
                                    <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:.25rem;">Key (slug)</label>
                                    <input id="tplKey" type="text" placeholder="eco_transesofagico" style="width:100%;padding:.55rem .7rem;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--bg-primary,#fff);color:var(--text-primary);">
                                </div>
                                <div>
                                    <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:.25rem;">Nombre visible</label>
                                    <input id="tplName" type="text" placeholder="Ecocardiograma transesofágico" style="width:100%;padding:.55rem .7rem;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--bg-primary,#fff);color:var(--text-primary);">
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:.7rem;">
                                <div>
                                    <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:.25rem;">Categoría</label>
                                    <select id="tplCategory" style="width:100%;padding:.55rem .7rem;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--bg-primary,#fff);color:var(--text-primary);"></select>
                                </div>
                                <div>
                                    <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:.25rem;">Keywords (coma separadas)</label>
                                    <input id="tplKeywords" type="text" placeholder="ecocardiograma transesofagico, ete, transesofagico" style="width:100%;padding:.55rem .7rem;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--bg-primary,#fff);color:var(--text-primary);">
                                </div>
                            </div>

                            <div style="margin-top:.7rem;">
                                <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:.25rem;">Prompt de estructuración</label>
                                <textarea id="tplPrompt" rows="4" placeholder="Indicaciones específicas para estructurar este estudio" style="width:100%;padding:.6rem .7rem;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--bg-primary,#fff);color:var(--text-primary);resize:vertical;"></textarea>
                            </div>

                            <div style="margin-top:.7rem;display:flex;align-items:center;gap:.45rem;">
                                <input id="tplDisabled" type="checkbox" style="width:15px;height:15px;accent-color:var(--primary,#2563eb);">
                                <label for="tplDisabled" style="font-size:.83rem;color:var(--text-secondary);cursor:pointer;">Desactivada (oculta en UI)</label>
                            </div>

                            <div style="display:flex;gap:.6rem;margin-top:.9rem;">
                                <button class="btn-primary" id="tplBtnSave">💾 Guardar plantilla</button>
                                <button class="btn-secondary" id="tplBtnCancel">Cancelar edición</button>
                            </div>
                        </div>
                    </div>
                </section>
            `;

            const tabSoporte = document.getElementById('tab-soporte');
            if (tabSoporte && tabSoporte.parentNode) tabSoporte.parentNode.insertBefore(tab, tabSoporte);
            else document.body.appendChild(tab);
        }

        function _tplAdminEscape(v) {
            const s = String(v == null ? '' : v);
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function _tplAdminApi() {
            return window.TP_TEMPLATE_CATEGORY_REGISTRY || null;
        }

        function _tplAdminLoadScript(src) {
            return new Promise((resolve, reject) => {
                if (!src) {
                    reject(new Error('Ruta inválida'));
                    return;
                }
                const existing = Array.from(document.scripts || []).find((s) => s.src && s.src.includes(src));
                if (existing) {
                    resolve(true);
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('No se pudo cargar ' + src));
                document.head.appendChild(script);
            });
        }

        async function _tplAdminEnsureRegistryReady() {
            if (window.TP_TEMPLATE_CATEGORY_REGISTRY) return true;

            const candidates = [
                'admin-assets/js/',
                '../src/js/config/',
                '../../src/js/config/',
                '/src/js/config/'
            ];

            for (const base of candidates) {
                try {
                    await _tplAdminLoadScript(base + 'templatesCatalog.js');
                    await _tplAdminLoadScript(base + 'templatesCatalogPart2.js');
                    await _tplAdminLoadScript(base + 'templatesCatalogPart3.js');
                    await _tplAdminLoadScript(base + 'templateCategoryRegistry.js');
                    if (window.TP_TEMPLATE_CATEGORY_REGISTRY) return true;
                } catch (_) {
                    // Probar siguiente base path.
                }
            }

            return !!window.TP_TEMPLATE_CATEGORY_REGISTRY;
        }

        function _tplAdminFillCategoryOptions(selected) {
            const sel = document.getElementById('tplCategory');
            if (!sel) return;

            const api = _tplAdminApi();
            const baseCats = Object.keys((api && (api.baseTemplateMapByCategory || api.templateMapByCategory)) || {});
            sel.innerHTML = baseCats.map((cat) => `<option value="${_tplAdminEscape(cat)}">${_tplAdminEscape(cat)}</option>`).join('');

            if (selected && !baseCats.includes(selected)) {
                const opt = document.createElement('option');
                opt.value = selected;
                opt.textContent = selected;
                sel.appendChild(opt);
            }
            if (selected) sel.value = selected;
        }

        function _tplAdminResetEditor() {
            currentTemplateAdminEditKey = '';
            const keyInput = document.getElementById('tplKey');
            if (keyInput) {
                keyInput.value = '';
                keyInput.readOnly = false;
                keyInput.style.opacity = '';
            }
            document.getElementById('tplName').value = '';
            document.getElementById('tplKeywords').value = '';
            document.getElementById('tplPrompt').value = '';
            document.getElementById('tplDisabled').checked = false;
            _tplAdminFillCategoryOptions('General');
        }

        function _tplAdminRenderTable() {
            const api = _tplAdminApi();
            const tbody = document.getElementById('tplTableBody');
            const badge = document.getElementById('tplCountBadge');
            if (!tbody || !badge) return;
            if (!api) {
                badge.textContent = '0 plantilla(s)';
                tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#b91c1c;">No se pudo cargar el registro de plantillas. Recargá el panel.</td></tr>';
                return;
            }

            const cfg = (typeof api.getAdminTemplatesConfig === 'function')
                ? api.getAdminTemplatesConfig()
                : { templates: [] };
            const overrideRows = Array.isArray(cfg.templates) ? cfg.templates.slice() : [];
            const overrideByKey = {};
            overrideRows.forEach((item) => {
                if (item && item.key) overrideByKey[String(item.key)] = item;
            });

            const runtimeMap = (api.templateMapByCategory && typeof api.templateMapByCategory === 'object')
                ? api.templateMapByCategory
                : {};
            const rows = [];
            const seenKeys = {};

            Object.entries(runtimeMap).forEach(([category, list]) => {
                (list || []).forEach((item) => {
                    const key = String(item && item.key || '');
                    if (!key || seenKeys[key]) return;
                    seenKeys[key] = true;

                    const ov = overrideByKey[key] || null;
                    const runtimeTpl = (window.MEDICAL_TEMPLATES && window.MEDICAL_TEMPLATES[key]) || {};
                    const rowName = (ov && ov.name) || (item && item.name) || runtimeTpl.name || key;
                    const rowCategory = (ov && ov.category) || category || 'General';

                    rows.push({
                        key,
                        name: rowName,
                        category: rowCategory,
                        keywords: (ov && Array.isArray(ov.keywords) && ov.keywords.length)
                            ? ov.keywords
                            : (Array.isArray(runtimeTpl.keywords) ? runtimeTpl.keywords : []),
                        prompt: (ov && ov.prompt) || runtimeTpl.prompt || '',
                        disabled: !!(ov && ov.disabled),
                        isOverride: !!ov
                    });
                });
            });

            overrideRows.forEach((ov) => {
                const key = String((ov && ov.key) || '');
                if (!key || seenKeys[key]) return;
                seenKeys[key] = true;
                rows.push({
                    key,
                    name: ov.name || key,
                    category: ov.category || 'General',
                    keywords: Array.isArray(ov.keywords) ? ov.keywords : [],
                    prompt: ov.prompt || '',
                    disabled: !!ov.disabled,
                    isOverride: true
                });
            });

            rows.sort((a, b) => {
                const c = String(a.category || '').localeCompare(String(b.category || ''));
                if (c !== 0) return c;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });

            const overrideCount = overrideRows.length;
            badge.textContent = `${rows.length} plantilla(s) totales · ${overrideCount} override(s)`;

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Sin overrides. Usando catálogo base.</td></tr>';
                return;
            }

            tbody.innerHTML = rows.map((t) => {
                const kwCount = Array.isArray(t.keywords) ? t.keywords.length : 0;
                const state = t.disabled
                    ? '<span style="padding:2px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:.74rem;font-weight:600;">Desactivada</span>'
                    : (t.isOverride
                        ? '<span style="padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1e40af;font-size:.74rem;font-weight:600;">Override</span>'
                        : '<span style="padding:2px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:.74rem;font-weight:600;">Base</span>');
                const restoreBtn = t.isOverride
                    ? `<button class="btn-secondary tpl-admin-action" data-action="reset" data-key="${_tplAdminEscape(t.key)}" style="padding:4px 8px;font-size:.78rem;color:#92400e;border-color:#fcd34d;">Restaurar</button>`
                    : '';
                return `
                    <tr>
                        <td style="font-family:monospace;">${_tplAdminEscape(t.key)}</td>
                        <td>${_tplAdminEscape(t.name)}</td>
                        <td>${_tplAdminEscape(t.category)}</td>
                        <td>${kwCount}</td>
                        <td>${state}</td>
                        <td>
                            <button class="btn-secondary tpl-admin-action" data-action="edit" data-key="${_tplAdminEscape(t.key)}" style="padding:4px 8px;font-size:.78rem;">Editar</button>
                            ${restoreBtn}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function _tplAdminEditByKey(key) {
            const api = _tplAdminApi();
            if (!api || typeof api.getAdminTemplatesConfig !== 'function') return;
            const cfg = api.getAdminTemplatesConfig();
            const item = (cfg.templates || []).find((t) => String(t.key) === String(key));
            const runtimeInfo = (typeof api.findTemplateByKey === 'function') ? api.findTemplateByKey(key) : null;
            const runtimeTemplate = (window.MEDICAL_TEMPLATES && window.MEDICAL_TEMPLATES[key]) || (runtimeInfo && runtimeInfo.template) || {};
            const data = item || {
                key: String(key),
                name: runtimeTemplate.name || (runtimeInfo && runtimeInfo.template && runtimeInfo.template.name) || String(key),
                category: (runtimeInfo && runtimeInfo.category) || 'General',
                keywords: Array.isArray(runtimeTemplate.keywords) ? runtimeTemplate.keywords : [],
                prompt: runtimeTemplate.prompt || '',
                disabled: false
            };

            if (!data || !data.key) return;

            currentTemplateAdminEditKey = data.key;
            const keyInput = document.getElementById('tplKey');
            keyInput.value = data.key;
            keyInput.readOnly = true;
            keyInput.style.opacity = '.75';
            document.getElementById('tplName').value = data.name || '';
            _tplAdminFillCategoryOptions(data.category || 'General');
            document.getElementById('tplKeywords').value = Array.isArray(data.keywords) ? data.keywords.join(', ') : '';
            document.getElementById('tplPrompt').value = data.prompt || '';
            document.getElementById('tplDisabled').checked = !!data.disabled;
        }

        async function _tplAdminDeleteByKey(key) {
            const api = _tplAdminApi();
            if (!api || typeof api.removeAdminTemplate !== 'function') return;
            const ok = await dashConfirm(`¿Restaurar plantilla "${key}" al valor base?`, '↩️');
            if (!ok) return;

            api.removeAdminTemplate(key);
            _tplAdminRenderTable();
            if (currentTemplateAdminEditKey === key) _tplAdminResetEditor();
            showNotification('Override restaurado a base', 'success');
        }

        function _tplAdminCollectForm() {
            const keyRaw = document.getElementById('tplKey').value;
            const name = document.getElementById('tplName').value.trim();
            const category = document.getElementById('tplCategory').value;
            const prompt = document.getElementById('tplPrompt').value.trim();
            const disabled = !!document.getElementById('tplDisabled').checked;

            const key = String(keyRaw || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .replace(/_{2,}/g, '_');

            const keywords = document.getElementById('tplKeywords').value
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean);

            if (!key) throw new Error('La key es obligatoria');
            if (!name) throw new Error('El nombre es obligatorio');
            if (!category) throw new Error('La categoría es obligatoria');
            if (!prompt) throw new Error('El prompt es obligatorio');
            if (!keywords.length) throw new Error('Ingresá al menos una keyword');

            return { key, name, category, prompt, keywords, disabled };
        }

        function _tplAdminDownloadJSON(filename, obj) {
            const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }

        async function _initTemplatesAdminPanel() {
            _ensureTemplatesAdminTab();
            const tbody = document.getElementById('tplTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">⏳ Cargando plantillas...</td></tr>';
            }

            const ready = await _tplAdminEnsureRegistryReady();
            if (!ready) {
                _tplAdminRenderTable();
                showNotification('No se pudo inicializar el registro de plantillas', 'error');
                return;
            }

            if (templatesAdminLoaded) {
                _tplAdminRenderTable();
                return;
            }
            templatesAdminLoaded = true;

            _tplAdminResetEditor();
            _tplAdminRenderTable();

            document.getElementById('tplBtnNew')?.addEventListener('click', () => {
                _tplAdminResetEditor();
            });

            document.getElementById('tplBtnCancel')?.addEventListener('click', () => {
                _tplAdminResetEditor();
            });

            document.getElementById('tplBtnSave')?.addEventListener('click', () => {
                try {
                    const api = _tplAdminApi();
                    if (!api || typeof api.upsertAdminTemplate !== 'function') {
                        throw new Error('No se encontró API de plantillas runtime');
                    }
                    const payload = _tplAdminCollectForm();
                    api.upsertAdminTemplate(payload);
                    _tplAdminRenderTable();
                    _tplAdminResetEditor();
                    showNotification('Plantilla guardada y sincronizada', 'success');
                } catch (err) {
                    showNotification(err.message || 'No se pudo guardar la plantilla', 'error');
                }
            });

            document.getElementById('tplBtnExport')?.addEventListener('click', () => {
                const api = _tplAdminApi();
                if (!api || typeof api.getAdminTemplatesConfig !== 'function') return;
                const cfg = api.getAdminTemplatesConfig();
                const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                _tplAdminDownloadJSON(`admin_templates_config_${stamp}.json`, cfg);
            });

            document.getElementById('tplBtnImport')?.addEventListener('click', () => {
                document.getElementById('tplImportFile')?.click();
            });

            document.getElementById('tplImportFile')?.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function () {
                    try {
                        const api = _tplAdminApi();
                        if (!api || typeof api.saveAdminTemplatesConfig !== 'function') {
                            throw new Error('No se encontró API de importación');
                        }
                        const parsed = JSON.parse(String(reader.result || '{}'));
                        const normalized = Array.isArray(parsed) ? { templates: parsed } : parsed;
                        api.saveAdminTemplatesConfig(normalized);
                        _tplAdminRenderTable();
                        _tplAdminResetEditor();
                        showNotification('Plantillas importadas correctamente', 'success');
                    } catch (err) {
                        showNotification('Importación inválida: ' + (err.message || 'JSON no válido'), 'error');
                    }
                };
                reader.readAsText(file);
                e.target.value = '';
            });

            document.getElementById('tplBtnReset')?.addEventListener('click', async () => {
                const ok = await dashConfirm('¿Restaurar catálogo base y eliminar todos los overrides de plantillas?', '↩️');
                if (!ok) return;
                const api = _tplAdminApi();
                if (!api || typeof api.resetAdminTemplatesConfig !== 'function') return;
                api.resetAdminTemplatesConfig();
                _tplAdminRenderTable();
                _tplAdminResetEditor();
                showNotification('Catálogo restaurado a defaults', 'success');
            });

            document.getElementById('tplTableBody')?.addEventListener('click', (e) => {
                const btn = e.target.closest('.tpl-admin-action');
                if (!btn) return;
                const action = btn.dataset.action;
                const key = btn.dataset.key;
                if (!key) return;
                if (action === 'edit') _tplAdminEditByKey(key);
                else if (action === 'reset') _tplAdminDeleteByKey(key);
            });
        }

        /* ── User Metrics Modal ──────────────────────────────────────────────── */
        async function openUserMetrics(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            const modal = document.getElementById('userMetricsModal');
            modal.dataset.userId = userId;
            const title = document.getElementById('userMetricsTitle');
            if (user) title.textContent = `📊 Métricas — ${user.Nombre}`;
            modal.style.display = 'flex';

            // Reset
            ['umTranscriptions','umWords','umMinutes'].forEach(id => document.getElementById(id).textContent = '⏳');
            document.getElementById('userDevicesList').innerHTML = '<li>Cargando...</li>';
            document.getElementById('umLastActivity').textContent = '⏳';
            document.getElementById('userUsageChart').innerHTML = '';

            try {
                await logAdminAction('view', userId, `Vista métricas usuario ${userId}`);
                const data = await API.getUserMetrics(userId);
                renderUserMetrics(data);
            } catch (_) {
                // If API not available, show mock data based on known user data
                const mockData = buildMockMetrics(userId);
                renderUserMetrics(mockData);
            }
        }

        function buildMockMetrics(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId)) || {};
            const days = Array.from({length: 7}, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                return { label: `${d.getDate()}/${d.getMonth()+1}`, value: Math.floor(Math.random() * 10) };
            });
            return {
                transcripciones: user.Usage_Count || 0,
                palabras: (user.Usage_Count || 0) * 180,
                minutos: Math.round((user.Usage_Count || 0) * 2.5),
                ultima_actividad: user.Ultima_Actividad || user.Fecha_Registro || '—',
                dispositivos: [{ nombre: 'Dispositivo principal', fecha: user.Fecha_Registro || '—' }],
                uso_7dias: days
            };
        }

        function renderUserMetrics(data) {
            const fmtNum = v => (v != null ? Number(v).toLocaleString() : '—');
            const _metricsUserId = document.getElementById('userMetricsModal')?.dataset.userId || '';
            document.getElementById('umTranscriptions').textContent = fmtNum(data.transcripciones);
            document.getElementById('umWords').textContent = fmtNum(data.palabras);
            document.getElementById('umMinutes').textContent = fmtNum(data.minutos);
            document.getElementById('umLastActivity').textContent = data.ultima_actividad || '—';

            // Devices list
            const devList = document.getElementById('userDevicesList');
            const devices = data.dispositivos || [];
            if (devices.length === 0) {
                devList.innerHTML = '<li>Sin dispositivos registrados</li>';
            } else {
                devList.innerHTML = devices.map(d =>
                    `<li>📱 <strong>${escapeHtml(d.nombre || d.id || 'Dispositivo')}</strong><small style="margin-left:auto;color:var(--text-secondary)">${escapeHtml(d.fecha || '')}</small></li>`
                ).join('') + `<li style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px;">
                    <button class="btn-outline" style="font-size:.78rem;padding:4px 12px;width:100%;" onclick="releaseDevicesFromMetrics('${escapeHtml(_metricsUserId)}')">🔓 Liberar todos los dispositivos</button>
                </li>`;
            }

            // 7-day bar chart
            const chartEl = document.getElementById('userUsageChart');
            const days = data.uso_7dias || [];
            if (days.length > 0) {
                const maxVal = Math.max(...days.map(d => d.value || 0), 1);
                chartEl.innerHTML = days.map(d => {
                    const pct = Math.round(((d.value || 0) / maxVal) * 100);
                    return `<div class="bar-wrap"><div class="bar" style="height:${pct}%" data-value="${d.value || 0}"></div><span class="bar-label">${escapeHtml(String(d.label))}</span></div>`;
                }).join('');
            } else {
                chartEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;align-self:center;">Sin datos disponibles</p>';
            }
        }

        function closeUserMetrics() {
            document.getElementById('userMetricsModal').style.display = 'none';
        }

        /* ── Soporte: cargar, renderizar, resolver ───────────────────────── */
        async function loadSupportRequests() {
            const status = document.getElementById('soporteFilter')?.value || 'pendiente';
            const cardsEl = document.getElementById('soporteCards');
            const emptyEl = document.getElementById('soporteEmpty');
            const _renderSupport = (reqs) => {
                if (reqs.length === 0) {
                    cardsEl.innerHTML = '';
                    emptyEl.style.display = 'block';
                } else {
                    emptyEl.style.display = 'none';
                    cardsEl.innerHTML = reqs.map(r => renderSupportCard(r)).join('');
                }
                if (status === 'pendiente' || status === 'todos') {
                    const pending = reqs.filter(r => (r.estado || '').toLowerCase() === 'pendiente').length;
                    updateSoporteBadge(status === 'pendiente' ? reqs.length : pending);
                }
            };
            const cacheKey = `_adminSupportCache_${status}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try { _renderSupport(JSON.parse(cached)); } catch(_) {}
            } else {
                cardsEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem;">⏳ Cargando...</p>';
                emptyEl.style.display = 'none';
            }
            try {
                const data = await API.listSupport(status);
                const reqs = data.requests || [];
                sessionStorage.setItem(cacheKey, JSON.stringify(reqs));
                _renderSupport(reqs);
            } catch (err) {
                if (!cached) cardsEl.innerHTML = `<p style="color:#ef4444;text-align:center;padding:2rem;">Error: ${escapeHtml(err.message)}</p>`;
            }
        }

        function renderSupportCard(r) {
            const isPending = (r.estado || '').toLowerCase() === 'pendiente';
            const statusBadge = isPending
                ? '<span style="background:#f59e0b;color:#fff;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px;">⏳ Pendiente</span>'
                : '<span style="background:#22c55e;color:#fff;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px;">✅ Resuelto</span>';
            const fecha = r.fecha ? new Date(r.fecha).toLocaleString('es-AR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
            const resolveBtn = isPending
                ? `<div style="display:flex;gap:.5rem;margin-top:.8rem;">
                     <button class="btn-primary" style="font-size:.8rem;padding:6px 14px;" onclick="resolveRequest('${escapeHtml(r.id)}','${escapeHtml(r.medicoId)}')">✅ Marcar como resuelto</button>
                     <button class="btn-outline" style="font-size:.8rem;padding:6px 14px;" onclick="releaseDevicesFromSupport('${escapeHtml(r.medicoId)}','${escapeHtml(r.id)}')">🔓 Liberar dispositivos</button>
                   </div>`
                : '';
            return `<div style="background:var(--bg-secondary,#f8fafc);border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem;margin-bottom:.8rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;">
                    <div>
                        <strong style="font-size:.95rem;">${escapeHtml(r.nombre || 'Sin nombre')}</strong>
                        <span style="color:#64748b;font-size:.82rem;margin-left:.5rem;">ID: ${escapeHtml(r.medicoId || '—')}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div style="font-size:.85rem;color:#0f766e;font-weight:600;margin-bottom:.3rem;">📌 ${escapeHtml(r.motivo || 'Sin motivo')}</div>
                <div style="font-size:.85rem;color:var(--text-primary);line-height:1.5;white-space:pre-wrap;">${escapeHtml(r.detalle || '—')}</div>
                <div style="font-size:.78rem;color:#94a3b8;margin-top:.5rem;">📅 ${fecha} · 📱 Device: ${escapeHtml(r.deviceId || '—')}</div>
                ${resolveBtn}
            </div>`;
        }

        async function resolveRequest(requestId, medicoId) {
            const nota = prompt('Nota de resolución (opcional):') ?? '';
            try {
                await API.resolveSupport(requestId, nota);
                showNotification('✅ Solicitud marcada como resuelta', 'success');
                await API.logAction('resolve_support', medicoId || requestId, nota || 'Resuelto');
                loadSupportRequests();
            } catch (err) {
                showNotification('Error: ' + err.message, 'error');
            }
        }

        async function releaseDevicesFromSupport(userId, requestId) {
            if (!userId || userId === '—') {
                showNotification('No se puede identificar al usuario', 'error');
                return;
            }
            if (!confirm(`¿Liberar TODOS los dispositivos del usuario ${userId}? Podrá iniciar sesión desde un nuevo dispositivo.`)) return;
            try {
                await API.releaseDevices(userId);
                showNotification('🔓 Dispositivos liberados para ' + userId, 'success');
                if (requestId) {
                    await API.resolveSupport(requestId, 'Dispositivos liberados');
                    loadSupportRequests();
                }
            } catch (err) {
                showNotification('Error: ' + err.message, 'error');
            }
        }

        function updateSoporteBadge(count) {
            const badge = document.getElementById('soporteBadge');
            if (!badge) return;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Cargar badge de soporte al iniciar sesión
        async function _checkSupportBadge() {
            try {
                const data = await API.listSupport('pendiente');
                updateSoporteBadge((data.requests || []).length);
            } catch(_) {}
        }

        // Liberar dispositivos desde el modal de métricas de usuario
        async function releaseDevicesFromMetrics(userId) {
            if (!userId) { showNotification('No se pudo identificar al usuario', 'error'); return; }
            if (!confirm(`¿Liberar TODOS los dispositivos de ${userId}?`)) return;
            try {
                await API.releaseDevices(userId);
                showNotification('🔓 Dispositivos liberados para ' + userId, 'success');
                closeUserMetrics();
                await loadDashboard(true);
            } catch (err) {
                showNotification('Error: ' + err.message, 'error');
            }
        }

        /* ── Diagnóstico Remoto ──────────────────────────────────────────── */
        async function openDiagModal(userId) {
            const modal = document.getElementById('diagModal');
            const body  = document.getElementById('diagModalBody');
            modal.dataset.userId = userId;
            document.getElementById('diagModalTitle').textContent = `🔧 Diagnóstico — ${userId}`;
            body.innerHTML = '<p style="color:var(--text-secondary);">⏳ Cargando diagnóstico...</p>';
            modal.style.display = 'flex';

            try {
                const data = await API.getDiagnostic(userId);
                renderDiagReport(data.diagnostic, body);
            } catch (err) {
                body.innerHTML = `<p style="color:var(--danger);">❌ Error: ${escapeHtml(err.message)}</p>`;
            }
        }

        function closeDiagModal() {
            document.getElementById('diagModal').style.display = 'none';
        }

        function renderDiagReport(diag, container) {
            if (!diag || !diag.report) {
                container.innerHTML = '<p style="color:var(--text-secondary);">Sin diagnóstico disponible. El reporte se envía desde la app del usuario al panel admin.</p>';
                return;
            }
            const r   = diag.report;
            const ts  = diag.Timestamp || r.timestamp || '—';
            const fmt = (v) => v == null ? '—' : String(v);
            const yesNo = (v) => v ? '✅ Sí' : '❌ No';

            const statusColor = r.api_key_last_status === 'valid'
                ? 'var(--success)' : r.api_key_last_status === 'invalid'
                ? 'var(--danger)' : 'var(--warning)';

            container.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;">

                    <div style="grid-column:1/-1;background:var(--bg-main);border-radius:6px;padding:0.6rem 0.75rem;margin-bottom:0.25rem;">
                        <strong>🗓 Enviado:</strong> ${escapeHtml(fmt(ts).replace('T',' ').slice(0,19))}
                        &nbsp;&bull;&nbsp; <strong>Device:</strong> ${escapeHtml(fmt(r.device_id))}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">Profesional</strong>
                        <span>👤 ${escapeHtml(fmt(r.nombre))}</span>
                        <span>🪪 ${escapeHtml(fmt(r.matricula))}</span>
                        <span>Perfil completo: ${yesNo(r.prof_data_complete)}</span>
                        <span>Logo: ${yesNo(r.has_logo)} &nbsp; Firma: ${yesNo(r.has_signature)}</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">API Key</strong>
                        <span>Presente: ${yesNo(r.api_key_present)}</span>
                        <span>Estado: <strong style="color:${statusColor}">${escapeHtml(fmt(r.api_key_last_status))}</strong></span>
                        <span>Último check: ${escapeHtml(fmt(r.api_key_last_check).replace('T',' ').slice(0,19))}</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">App</strong>
                        <span>Modo: ${escapeHtml(fmt(r.current_mode))}</span>
                        <span>Cola pendiente: ${escapeHtml(fmt(r.pending_queue_count))}</span>
                        <span>Cliente: ${escapeHtml(fmt(r.client_type))} / ${escapeHtml(fmt(r.client_status))}</span>
                        ${r.last_struct_error ? `<span style="color:var(--danger);font-size:0.8rem;">⚠️ ${escapeHtml(fmt(r.last_struct_error).slice(0,120))}</span>` : ''}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">Entorno</strong>
                        <span>Online: ${yesNo(r.online)} &nbsp; PWA: ${yesNo(r.pwa_installed)}</span>
                        <span>SW activo: ${yesNo(r.sw_active)}</span>
                        <span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml((r.user_agent || '').slice(0,90))}${(r.user_agent||'').length>90?'…':''}</span>
                    </div>

                </div>`;
        }

        async function loadGlobalStats() {
            const _mapStats = (resp) => {
                const s = resp.stats || resp;
                return {
                    transcripciones_mes: s.totalTranscripciones ?? s.transcripciones_mes ?? 0,
                    palabras_mes:        (s.totalTranscripciones ?? 0) * 180,
                    mrr:                 (s.pro ?? 0) * 29 + (s.enterprise ?? 0) * 99,
                    activos_hoy:         s.active ?? s.activos_hoy ?? 0,
                    activos_semana:      s.active ?? s.activos_semana ?? 0,
                    conversion:          (s.trial + s.pro + s.enterprise) > 0
                                            ? Math.round(((s.pro ?? 0) / (s.trial + s.pro + s.enterprise)) * 100)
                                            : 0,
                    crecimiento_30dias:  s.crecimiento_30dias || buildMockGlobalStats().crecimiento_30dias,
                    top_usuarios:        s.top_usuarios || buildMockGlobalStats().top_usuarios
                };
            };
            const cacheKey = '_adminMetricsCache';
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) { try { renderGlobalStats(JSON.parse(cached)); } catch(_) {} }
            try {
                const resp = await API.getGlobalStats();
                const data = _mapStats(resp);
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                renderGlobalStats(data);
            } catch (_) {
                if (!cached) renderGlobalStats(buildMockGlobalStats());
            }
        }

        function buildMockGlobalStats() {
            const proUsers = allUsers.filter(u => u.Plan === 'pro' || u.Plan === 'enterprise').length;
            const trialUsers = allUsers.filter(u => u.Plan === 'trial').length;
            const convRate = trialUsers > 0 ? Math.round((proUsers / (proUsers + trialUsers)) * 100) : 0;
            const sorted = [...allUsers].sort((a, b) => (b.Usage_Count || 0) - (a.Usage_Count || 0));
            const days = Array.from({length: 30}, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (29 - i));
                return { label: `${d.getDate()}/${d.getMonth()+1}`, value: Math.floor(Math.random() * 3) };
            });
            return {
                transcripciones_mes: allUsers.reduce((s, u) => s + (u.Usage_Count || 0), 0),
                palabras_mes: allUsers.reduce((s, u) => s + ((u.Usage_Count || 0) * 180), 0),
                mrr: proUsers * 29,
                activos_hoy: Math.min(allUsers.filter(u => u.Estado === 'active').length, 3),
                activos_semana: allUsers.filter(u => u.Estado === 'active').length,
                conversion: convRate,
                crecimiento_30dias: days,
                top_usuarios: sorted.slice(0, 5).map(u => ({
                    nombre: u.Nombre,
                    plan: u.Plan,
                    usage: u.Usage_Count || 0
                }))
            };
        }

        function renderGlobalStats(data) {
            const fmt = v => (v != null ? Number(v).toLocaleString() : '—');
            document.getElementById('mTranscriptions').textContent = fmt(data.transcripciones_mes);
            document.getElementById('mWords').textContent = fmt(data.palabras_mes);
            document.getElementById('mMrr').textContent = data.mrr != null ? `$${fmt(data.mrr)}` : '—';
            document.getElementById('mActiveToday').textContent = fmt(data.activos_hoy);
            document.getElementById('mActiveWeek').textContent = fmt(data.activos_semana);
            document.getElementById('mConversion').textContent = data.conversion != null ? `${data.conversion}%` : '—';

            // Growth chart
            const chartEl = document.getElementById('globalGrowthChart');
            const days = data.crecimiento_30dias || [];
            if (days.length > 0) {
                const maxVal = Math.max(...days.map(d => d.value || 0), 1);
                chartEl.innerHTML = days.map(d => {
                    const pct = Math.round(((d.value || 0) / maxVal) * 100);
                    return `<div class="bar-wrap"><div class="bar" style="height:${pct}%" data-value="${d.value || 0}"></div><span class="bar-label">${escapeHtml(String(d.label))}</span></div>`;
                }).join('');
            }

            // Top users
            const topEl = document.getElementById('topUsersList');
            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
            const top = data.top_usuarios || [];
            if (top.length > 0) {
                topEl.innerHTML = top.map((u, i) => `
                    <div class="top-user-row">
                        <span class="top-user-rank">${medals[i] || (i+1)}</span>
                        <div class="top-user-info">
                            <strong>${escapeHtml(u.nombre || '—')}</strong><br>
                            <small>${escapeHtml(u.plan || '—').toUpperCase()}</small>
                        </div>
                        <span class="top-user-count">${(u.usage || 0).toLocaleString()}</span>
                    </div>`).join('');
            } else {
                topEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;">Sin datos</p>';
            }
        }

        /* ── Logs ────────────────────────────────────────────────────────────── */
        async function loadLogs() {
            const tbody = document.getElementById('logsTableBody');
            const filterDate = document.getElementById('logFilterDate').value;
            const filterType = document.getElementById('logFilterType').value;
            const cacheKey = `_adminLogsCache_${filterDate}_${filterType}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try { renderLogs(JSON.parse(cached)); } catch(_) {}
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">⏳ Cargando logs...</td></tr>';
            }
            try {
                const data = await API.getLogs(filterDate, filterType);
                const logs = data.logs || [];
                sessionStorage.setItem(cacheKey, JSON.stringify(logs));
                renderLogs(logs);
            } catch (_) {
                if (!cached) tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sin logs disponibles</td></tr>';
            }
        }

        function renderLogs(logs) {
            const tbody = document.getElementById('logsTableBody');
            if (!logs || logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay logs registrados</td></tr>';
                return;
            }
            tbody.innerHTML = logs.map(log => {
                const type = (log.type || log.accion || 'view').toLowerCase();
                return `<tr>
                    <td><small>${escapeHtml(log.timestamp || log.fecha || '—')}</small></td>
                    <td>${escapeHtml(log.admin || '—')}</td>
                    <td><span class="log-action-badge log-${escapeHtml(type)}">${escapeHtml(log.type || log.accion || '—')}</span></td>
                    <td>${escapeHtml(log.userId || log.usuario_afectado || '—')}</td>
                    <td><small>${escapeHtml(log.details || log.detalles || '—')}</small></td>
                </tr>`;
            }).join('');
        }

        /* ── Log Admin Action ────────────────────────────────────────────────── */
        async function logAdminAction(action, userId, details) {
            try {
                await API.logAction(action, userId, details);
            } catch (_) { /* non-blocking */ }
        }

        /* ── Render ──────────────────────────────────────────────────────────── */
        function renderTable(users) {
            const tbody = document.getElementById('tableBody');
            if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay usuarios registrados</td></tr>';
                return;
            }

            const maxUsage = Math.max(...users.map(u => u.Usage_Count || 0), 1);
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            tbody.innerHTML = users.map(user => {
                const plan    = user.Plan || 'trial';
                const id      = escapeHtml(String(user.ID_Medico));
                const safeName = escapeHtml(normalizeDisplayText(user.Nombre || ''));
                const isBanned  = user.Estado === 'banned';
                const isTrial   = user.Estado === 'trial';
                const isExpired = user.Estado === 'expired';
                const usage     = user.Usage_Count || 0;
                const usagePct  = Math.round((usage / maxUsage) * 100);
                const highUsage = usagePct >= 80 ? ' high' : '';
                const lastActivity = user.Ultima_Actividad || user.Fecha_Registro || '';
                const lastActivityMs = lastActivity ? new Date(lastActivity).getTime() : NaN;
                const isActiveToday = !isNaN(lastActivityMs) && (now - lastActivityMs) < oneDayMs;
                const activityDisplay = lastActivity ? formatDate(lastActivity.split('T')[0]) : '—';
                const specialtyBadges = (user.Especialidad || '')
                    .split(',')
                    .map(s => normalizeDisplayText(s.trim()))
                    .filter(Boolean)
                    .map(s => `<span class="badge badge-specialty">${escapeHtml(s)}</span>`)
                    .join('');
                return `
                <tr data-user-id="${id}" class="${isBanned ? 'row-banned' : ''}">
                    <td data-label="Nombre" class="user-name-cell"><div class="user-name-wrap"><span class="user-full-name"><strong>${safeName}</strong>${isActiveToday ? '<span class="active-indicator" title="Activo hoy">🔥</span>' : ''}</span><span class="user-matricula">${escapeHtml(user.Matricula || '')}</span></div></td>
                    <td data-label="Especialidad"><div class="specialty-cell">${specialtyBadges}</div></td>
                    <td data-label="Plan"><span class="badge badge-plan badge-${escapeHtml(plan)}">${escapeHtml(plan.toUpperCase())}</span></td>
                    <td data-label="Estado"><span class="status-badge status-${escapeHtml(user.Estado)}">${getStatusText(user.Estado)}</span></td>
                    <td data-label="Vencimiento" class="col-expiration">${formatDate(user.Fecha_Vencimiento)}</td>
                    <td data-label="Uso" class="col-usage">
                        <div class="usage-bar-wrap">
                            <span class="usage-count">${usage}</span>
                            <div class="usage-bar"><div class="usage-bar-fill${highUsage}" style="width:${usagePct}%"></div></div>
                        </div>
                    </td>
                    <td data-label="Última Actividad" class="col-activity">${activityDisplay}</td>
                    <td data-label="Acciones" class="actions-cell">
                        <button class="btn-action" data-action="edit" data-user-id="${id}" title="Editar">✏️</button>
                        <button class="btn-action" data-action="metrics" data-user-id="${id}" title="Ver Métricas">📊</button>
                        <button class="btn-action" data-action="clone" data-user-id="${id}" title="Crear App para este usuario">📦</button>
                        <button class="btn-action" data-action="mail" data-user-id="${id}" title="Enviar email a ${escapeHtml(user.Nombre || user.Email)}">📧</button>
                        ${isTrial ? `<button class="btn-action" data-action="extendtrial" data-user-id="${id}" title="Extender Trial +15 días">⏳</button>` : ''}
                        ${isTrial || isExpired ? `<button class="btn-action" data-action="activate" data-user-id="${id}" title="Activar PRO">✅</button>` : ''}
                        <button class="btn-action" data-action="diag" data-user-id="${id}" title="Ver último diagnóstico">🔍</button>
                        <button class="btn-action" data-action="ban" data-user-id="${id}" title="${isBanned ? 'Desbloquear' : 'Bloquear'}">${isBanned ? '🔓' : '🚫'}</button>
                        <button class="btn-action" data-action="delete" data-user-id="${id}" title="Eliminar usuario" style="color:#ef4444;">🗑️</button>
                    </td>
                </tr>`;
            }).join('');
        }

        function normalizeDisplayText(value) {
            let text = String(value || '');
            if (!text) return '';

            if (/[ÃÂâ]/.test(text)) {
                const replacements = {
                    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
                    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú',
                    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã¼': 'ü', 'Ãœ': 'Ü',
                    'â€“': '-', 'â€”': '-'
                };
                text = text.replace(/Ã¡|Ã©|Ã­|Ã³|Ãº|Ã|Ã‰|Ã|Ã“|Ãš|Ã±|Ã‘|Ã¼|Ãœ|â€“|â€”/g, m => replacements[m] || m);
                text = text.replace(/Â/g, '');
            }

            return text.normalize('NFC');
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        /* ── Stats ───────────────────────────────────────────────────────────── */
        function updateStats(users) {
            const stats = {
                total: users.length,
                active: users.filter(u => u.Estado === 'active').length,
                trial: users.filter(u => u.Estado === 'trial').length,
                expired: users.filter(u => u.Estado === 'expired').length
            };

            document.getElementById('statTotal').textContent   = stats.total;
            document.getElementById('statActive').textContent  = stats.active;
            document.getElementById('statTrial').textContent   = stats.trial;
            document.getElementById('statExpired').textContent = stats.expired;
        }

        /* ── Filters ─────────────────────────────────────────────────────────── */
        function applyFilters() {
            const search = document.getElementById('searchInput').value.toLowerCase().trim();
            const status = document.getElementById('filterStatus').value;
            const plan   = document.getElementById('filterPlan').value;

            const filtered = allUsers.filter(user => {
                const matchSearch = !search ||
                    (user.Nombre    || '').toLowerCase().includes(search) ||
                    (user.Email     || '').toLowerCase().includes(search) ||
                    (user.Matricula || '').toLowerCase().includes(search);

                const matchStatus = !status || user.Estado === status;
                const matchPlan   = !plan   || user.Plan   === plan;

                return matchSearch && matchStatus && matchPlan;
            });

            renderTable(filtered);
        }

        /* ── Edit Modal ──────────────────────────────────────────────────────── */
        function openEditModal(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) {
                showNotification('Usuario no encontrado', 'error');
                return;
            }

            currentEditUser = user;

            document.getElementById('editUserId').value     = user.ID_Medico;
            document.getElementById('editName').value       = user.Nombre;
            document.getElementById('editEmail').value      = user.Email;
            document.getElementById('editPlan').value       = user.Plan;
            document.getElementById('editStatus').value     = user.Estado;
            document.getElementById('editExpiration').value = user.Fecha_Vencimiento || '';
            document.getElementById('editDevicesMax').value = user.Devices_Max || 2;
            document.getElementById('editNotes').value      = user.Notas_Admin || '';

            document.getElementById('editModal').style.display = 'flex';
        }

        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
            currentEditUser = null;
        }

        async function saveEdit() {
            const userId = document.getElementById('editUserId').value;
            const updates = {
                Plan:              document.getElementById('editPlan').value,
                Estado:            document.getElementById('editStatus').value,
                Fecha_Vencimiento: document.getElementById('editExpiration').value,
                Devices_Max:       parseInt(document.getElementById('editDevicesMax').value, 10) || 2,
                Notas_Admin:       document.getElementById('editNotes').value
            };

            const saveBtn = document.getElementById('btnSaveEdit');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Guardando...';

            const result = await updateUser(userId, updates);

            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Guardar Cambios';

            if (result.error) {
                showToast('Error al guardar: ' + result.error, 'error');
                return;
            }

            /* Update local state */
            const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
            if (idx !== -1) {
                allUsers[idx] = { ...allUsers[idx], ...updates };
            }

            updateStats(allUsers);
            applyFilters();
            closeEditModal();
            showToast('Usuario actualizado correctamente ✅', 'success');
        }

        async function saveUserChanges() {
            if (!currentEditUser) return;

            const userId = document.getElementById('editUserId').value;
            const updates = {
                Plan:              document.getElementById('editPlan').value,
                Estado:            document.getElementById('editStatus').value,
                Fecha_Vencimiento: document.getElementById('editExpiration').value,
                Devices_Max:       parseInt(document.getElementById('editDevicesMax').value, 10) || 2,
                Notas_Admin:       document.getElementById('editNotes').value
            };

            const saveBtn = document.getElementById('btnSaveEdit');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳ Guardando...';
            saveBtn.disabled = true;

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    /* Simulate success when backend is not configured */
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...updates };
                    showNotification('✅ Usuario actualizado correctamente', 'success');
                    await logAdminAction('edit', userId, `Plan: ${updates.Plan}, Estado: ${updates.Estado}`);
                    closeEditModal();
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.updateUser(userId, updates);
                    showNotification('✅ Usuario actualizado correctamente', 'success');
                    await logAdminAction('edit', userId, `Plan: ${updates.Plan}, Estado: ${updates.Estado}`);
                    closeEditModal();
                    await loadDashboard(true);
                }
            } catch (error) {
                showNotification(`Error al guardar: ${error.message}`, 'error');
            } finally {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        }

        /* ── Quick Ban ───────────────────────────────────────────────────────── */
        async function quickBan(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const newStatus = user.Estado === 'banned' ? 'active' : 'banned';
            const action    = newStatus === 'banned' ? 'bloquear' : 'desbloquear';

            const ok = await dashConfirm(`¿Confirmar ${action} a <b>${escapeHtml(user.Nombre)}</b>?`, newStatus === 'banned' ? '🚫' : '✅');
            if (!ok) return;

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers[idx].Estado = newStatus;
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.updateUser(userId, { Estado: newStatus });
                    await loadDashboard(true);
                }
                await logAdminAction('ban', userId, `Estado: ${newStatus}`);
                showNotification(`Usuario ${action === 'bloquear' ? 'bloqueado 🚫' : 'desbloqueado ✅'}`, newStatus === 'banned' ? 'info' : 'success');
            } catch (error) {
                showNotification(`Error al ${action} usuario`, 'error');
            }
        }

        /* ── Delete User ──────────────────────────────────────────────────── */
        async function deleteUserPermanently(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const ok = await dashConfirm(`¿Eliminar permanentemente a <b>${escapeHtml(user.Nombre)}</b>?<br><br><span style="color:#ef4444;font-size:.85rem;">Esta acción no se puede deshacer. Se eliminará del panel y del Google Sheet.</span>`, '🗑️');
            if (!ok) return;

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers.splice(idx, 1);
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.deleteUser(userId);
                    await loadDashboard(true);
                }
                await logAdminAction('delete', userId, `Usuario eliminado: ${user.Nombre}`);
                showNotification(`Usuario ${escapeHtml(user.Nombre)} eliminado 🗑️`, 'success');
            } catch (error) {
                showNotification(`Error al eliminar usuario: ${error.message}`, 'error');
            }
        }

        /* ── Activate User ───────────────────────────────────────────────────── */
        async function activateUser(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const ok = await dashConfirm(`¿Activar suscripción PRO para <b>${escapeHtml(user.Nombre)}</b>?`, '⭐');
            if (!ok) return;

            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            const formattedDate = expirationDate.toISOString().split('T')[0];

            const updates = {
                Plan:              'pro',
                Estado:            'active',
                Fecha_Vencimiento: formattedDate,
                Devices_Max:       3,
                Notas_Admin:       `Activado manualmente el ${new Date().toISOString().split('T')[0]}`
            };

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...updates };
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.updateUser(userId, updates);
                    await loadDashboard(true);
                }
                await logAdminAction('activate', userId, `Plan PRO hasta ${formattedDate}`);
                showNotification(`✅ ${user.Nombre} activado - Plan PRO hasta ${formattedDate}`, 'success');
            } catch (error) {
                showNotification('Error al activar usuario', 'error');
            }
        }

        /* ── Extend Trial ─────────────────────────────────────────────────── */
        async function extendTrial(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const days = await dashPrompt(`¿Cuántos días extender el trial de <b>${escapeHtml(user.Nombre)}</b>?`, '15', '⏳');
            if (!days || isNaN(Number(days)) || Number(days) <= 0) return;

            const daysNum = Math.round(Number(days));
            const currentExp = user.Fecha_Vencimiento ? new Date(user.Fecha_Vencimiento) : new Date();
            if (isNaN(currentExp.getTime())) currentExp.setTime(Date.now());
            currentExp.setDate(currentExp.getDate() + daysNum);
            const formattedDate = currentExp.toISOString().split('T')[0];

            const updates = {
                Fecha_Vencimiento: formattedDate,
                Estado:            'trial',
                Notas_Admin:       `Trial extendido +${daysNum}d el ${new Date().toISOString().split('T')[0]}`
            };

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...updates };
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.updateUser(userId, updates);
                    await loadDashboard(true);
                }
                await logAdminAction('extend_trial', userId, `Trial extendido +${daysNum}d hasta ${formattedDate}`);
                showNotification(`⏳ Trial de ${user.Nombre} extendido +${daysNum} días (hasta ${formattedDate})`, 'success');
            } catch (error) {
                showNotification('Error al extender trial', 'error');
            }
        }

        /* ── Load Data ───────────────────────────────────────────────────────── */
        async function loadUsers() {
            await loadDashboard();
        }

        async function loadDashboard(silent = false) {
            // STALE-WHILE-REVALIDATE: mostrar caché al instante, actualizar en background
            const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos
            let cachedData = null;
            try {
                const raw = sessionStorage.getItem('_adminUsersCache');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.users && (Date.now() - parsed.ts) < CACHE_TTL_MS) {
                        cachedData = parsed.users;
                    }
                }
            } catch (_) {}

            if (cachedData) {
                // Render inmediato con datos cacheados
                allUsers = cachedData;
                updateStats(allUsers);
                applyFilters();
                // Actualizar en background sin bloquear la UI
                fetchUsers().then(freshUsers => {
                    if (!freshUsers || freshUsers === SAMPLE_USERS) return;
                    allUsers = freshUsers;
                    updateStats(allUsers);
                    applyFilters();
                }).catch(() => {});
                return;
            }

            if (!silent) {
                document.getElementById('tableBody').innerHTML =
                    '<tr><td colspan="8" class="text-center">⏳ Cargando datos...</td></tr>';
            }

            try {
                allUsers = await fetchUsers();
                updateStats(allUsers);
                applyFilters();

                if (!silent) {
                    showNotification(`✅ ${allUsers.length} usuarios cargados`, 'success');
                }
            } catch (error) {
                document.getElementById('tableBody').innerHTML =
                    `<tr><td colspan="8" class="text-center">❌ Error al cargar datos: ${escapeHtml(error.message)}</td></tr>`;
            }
        }

        function startAutoRefresh(intervalMinutes = 5) {
            if (refreshInterval) clearInterval(refreshInterval);

            refreshInterval = setInterval(async () => {
                if (document.hidden || activeRefreshInFlight) return;
                activeRefreshInFlight = true;
                try {
                    await refreshActiveTabData(true);
                } finally {
                    activeRefreshInFlight = false;
                }
            }, intervalMinutes * 60 * 1000);
        }

        async function refreshActiveTabData(silent = true) {
            if (currentActiveTab === 'usuarios') {
                await loadDashboard(silent);
                return;
            }
            if (currentActiveTab === 'registros') {
                await loadRegistrations();
                return;
            }
            if (currentActiveTab === 'metricas') {
                await loadGlobalStats();
                return;
            }
            if (currentActiveTab === 'logs') {
                await loadLogs();
                return;
            }
            if (currentActiveTab === 'soporte') {
                await loadSupportRequests();
            }
        }

        /* ── Event Listeners ─────────────────────────────────────────────────── */
        document.getElementById('btnLogout').addEventListener('click', () => {
            sessionStorage.removeItem('adminSession');
            ['_adminUsersCache','_adminRegCache','_adminMetricsCache'].forEach(k => sessionStorage.removeItem(k));
            window.location.href = 'login.html';
        });

        document.getElementById('btnRefresh').addEventListener('click', () => loadDashboard());

        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('filterStatus').addEventListener('change', applyFilters);
        document.getElementById('filterPlan').addEventListener('change', applyFilters);

        /* Event delegation for table action buttons */
        document.getElementById('tableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const userId = btn.dataset.userId;
            if (btn.dataset.action === 'edit') openEditUserModal(userId);
            else if (btn.dataset.action === 'metrics') openUserMetrics(userId);
            else if (btn.dataset.action === 'clone') openCloneFactory(userId);
            else if (btn.dataset.action === 'ban') quickBan(userId);
            else if (btn.dataset.action === 'delete') deleteUserPermanently(userId);
            else if (btn.dataset.action === 'activate') activateUser(userId);
            else if (btn.dataset.action === 'extendtrial') extendTrial(userId);
            else if (btn.dataset.action === 'diag') openDiagModal(userId);
            else if (btn.dataset.action === 'mail') {
                openDirectEmail(userId);
            }
        });

        document.getElementById('closeModal').addEventListener('click', closeEditModal);
        document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
        document.getElementById('btnSaveEdit').addEventListener('click', saveUserChanges);

        /* Tab buttons */
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => showTab(btn.dataset.tab));
        });

        /* User metrics modal */
        document.getElementById('closeUserMetrics').addEventListener('click', closeUserMetrics);
        document.getElementById('btnCloseUserMetrics').addEventListener('click', closeUserMetrics);
        document.getElementById('userMetricsModal').addEventListener('click', function(e) {
            if (e.target === this) closeUserMetrics();
        });

        /* Diagnóstico modal */
        document.getElementById('closeDiagModal').addEventListener('click', closeDiagModal);
        document.getElementById('btnCloseDiagModal').addEventListener('click', closeDiagModal);
        document.getElementById('diagModal').addEventListener('click', function(e) {
            if (e.target === this) closeDiagModal();
        });

        /* Logs filters */
        document.getElementById('btnRefreshLogs').addEventListener('click', () => {
            logsLoaded = false;
            loadLogs();
        });
        document.getElementById('logFilterDate').addEventListener('change', loadLogs);
        document.getElementById('logFilterType').addEventListener('change', loadLogs);

        /* Close modal on backdrop click */
        document.getElementById('editModal').addEventListener('click', function (e) {
            if (e.target === this) closeEditModal();
        });

        /* Close modal on Escape key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeEditModal();
                closeUserMetrics();
                closeDiagModal();
                closeNewUserModal();
                closeEditUserModal();
                closeCloneFactory();
            }
        });

        /* ── Init ────────────────────────────────────────────────────────────── */
        document.addEventListener('DOMContentLoaded', async () => {
            // WARM-UP del Google Apps Script en paralelo (dispara el cold start lo antes posible)
            // Solo un ping, no esperamos la respuesta — reduce el cold start en futuras llamadas
            if (CONFIG.scriptUrl && CONFIG.scriptUrl !== 'PASTE_APPS_SCRIPT_URL_HERE') {
                fetch(`${CONFIG.scriptUrl}?action=ping`, { method: 'GET', cache: 'no-cache' }).catch(() => {});
            }

            ensureRegQuickLinkButton();
            ensureLogsClearButton();
            _ensureTemplatesAdminTab();

            // Enlazar acciones críticas del header al inicio para que no dependan
            // de cargas async (si falla loadDashboard, el botón debe seguir funcionando).
            document.getElementById('btnGiftUser')?.addEventListener('click', () => openGiftFactory());

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    refreshActiveTabData(true);
                }
            });

            // Limpiar el buscador (el browser puede autocompletar con la última búsqueda)
            document.getElementById('searchInput').value = '';

            // Set admin name in header
            try {
                const session = JSON.parse(sessionStorage.getItem('adminSession') || '{}');
                if (session.nombre) {
                    document.getElementById('adminName').textContent = session.nombre;
                }
            } catch (_) {}

            await loadDashboard();
            startAutoRefresh(2);

            // Cargar API Keys guardadas en el tab Mis Keys
            loadAdminKeys();

            // Load registration badge count (non-blocking)
            loadRegBadgeCount();

            // Load support badge count (non-blocking)
            _checkSupportBadge();

            // Setup new user modal close buttons (modal HTML is after the script block)
            document.getElementById('btnCloseNewUser')?.addEventListener('click', () => closeNewUserModal());
            document.getElementById('btnCancelNewUser')?.addEventListener('click', () => closeNewUserModal());
            document.getElementById('newUserModal')?.addEventListener('click', function (e) {
                if (e.target === this) closeNewUserModal();
            });

            // Setup edit user modal close buttons (modal HTML is after the script block)
            document.getElementById('btnCloseEditUser')?.addEventListener('click', () => closeEditUserModal());
            document.getElementById('btnCancelEditUser')?.addEventListener('click', () => closeEditUserModal());
            document.getElementById('editUserModal')?.addEventListener('click', function (e) {
                if (e.target === this) closeEditUserModal();
            });
            document.getElementById('editUserForm')?.addEventListener('submit', handleEditUserSubmit);

            // Fábrica de clones — listeners
            document.getElementById('btnCloseCloneFactory')?.addEventListener('click', closeCloneFactory);
            document.getElementById('cloneFactoryModal')?.addEventListener('click', function(e) {
                if (e.target === this) closeCloneFactory();
            });

            // Fábrica de clones — botones del modal (HTML está después del script)
            document.getElementById('cfBtnGenerate')?.addEventListener('click', handleCfGenerate);
            document.getElementById('cfBtnCopyLink')?.addEventListener('click', handleCfCopyLink);
            document.getElementById('cfBtnWhatsApp')?.addEventListener('click', handleCfWhatsApp);
            document.getElementById('cfBtnEmail')?.addEventListener('click', handleCfEmail);

            // ── Gift Wizard: Drag & Drop delegado para upload zones ──
            document.addEventListener('dragover', (e) => {
                const zone = e.target.closest('.gw-upload-zone');
                if (zone) { e.preventDefault(); zone.classList.add('dragover'); }
            });
            document.addEventListener('dragleave', (e) => {
                const zone = e.target.closest('.gw-upload-zone');
                if (zone) zone.classList.remove('dragover');
            });
            document.addEventListener('drop', (e) => {
                const zone = e.target.closest('.gw-upload-zone');
                if (zone) {
                    e.preventDefault();
                    zone.classList.remove('dragover');
                    const input = zone.querySelector('input[type="file"]');
                    if (e.dataTransfer.files.length && input) {
                        input.files = e.dataTransfer.files;
                        input.dispatchEvent(new Event('change'));
                    }
                }
            });
        });

        // ========== NUEVO USUARIO ==========

        const _sharedTplReg = window.TP_TEMPLATE_CATEGORY_REGISTRY || null;

        // ── Mapeo de template keys agrupados por categoría (sincronizado con templates.js) ──
        const TEMPLATE_MAP = (_sharedTplReg && _sharedTplReg.templateMapByCategory) || {
            'Neumología': [
                { key: 'espirometria', name: 'Espirometría' },
                { key: 'test_marcha', name: 'Test Marcha 6 min' },
                { key: 'pletismografia', name: 'Pletismografía' },
                { key: 'oximetria_nocturna', name: 'Oximetría Nocturna' }
            ],
            'Oftalmología': [
                { key: 'campimetria', name: 'Campimetría' },
                { key: 'oct_retinal', name: 'OCT Retinal' },
                { key: 'topografia_corneal', name: 'Topografía Corneal' },
                { key: 'fondo_ojo', name: 'Fondo de Ojo' },
                { key: 'gonioscopia', name: 'Gonioscopía' }
            ],
            'Imágenes': [
                { key: 'tac', name: 'TAC' },
                { key: 'resonancia', name: 'Resonancia' },
                { key: 'mamografia', name: 'Mamografía' },
                { key: 'densitometria', name: 'Densitometría' },
                { key: 'pet_ct', name: 'PET-CT' },
                { key: 'radiografia', name: 'Radiografía' },
                { key: 'ecografia_abdominal', name: 'Ecografía Abdominal' },
                { key: 'eco_doppler', name: 'Eco-Doppler' }
            ],
            'Endoscopía': [
                { key: 'gastroscopia', name: 'Gastroscopía' },
                { key: 'colonoscopia', name: 'Colonoscopía' },
                { key: 'broncoscopia', name: 'Broncoscopía' },
                { key: 'laringoscopia', name: 'Laringoscopía' }
            ],
            'Cardiología': [
                { key: 'gammagrafia_cardiaca', name: 'Gammagrafía Cardíaca' },
                { key: 'holter', name: 'Holter' },
                { key: 'mapa', name: 'MAPA' },
                { key: 'cinecoro', name: 'Cinecoronariografía' },
                { key: 'ecg', name: 'ECG' },
                { key: 'eco_stress', name: 'Eco-Stress' },
                { key: 'ett', name: 'Ecocardiograma TT' }
            ],
            'Ginecología': [
                { key: 'pap', name: 'PAP' },
                { key: 'colposcopia', name: 'Colposcopía' }
            ],
            'Neurología': [
                { key: 'electromiografia', name: 'Electromiografía' },
                { key: 'polisomnografia', name: 'Polisomnografía' }
            ],
            'ORL': [
                { key: 'naso', name: 'Nasofibroscopía' },
                { key: 'endoscopia_otologica', name: 'Endoscopía Otológica' }
            ],
            'Quirúrgico': [
                { key: 'protocolo_quirurgico', name: 'Protocolo Quirúrgico' }
            ],
            'General': [
                { key: 'nota_evolucion', name: 'Nota de Evolución' },
                { key: 'epicrisis', name: 'Epicrisis' },
                { key: 'generico', name: 'Informe Genérico' }
            ]
        };

        const ESPECIALIDADES = Object.keys(TEMPLATE_MAP);

        const ESTUDIOS_POR_ESPECIALIDAD = (_sharedTplReg && _sharedTplReg.studiesByCategory) || Object.fromEntries(
            Object.entries(TEMPLATE_MAP).map(([esp, templates]) => [
                esp,
                (templates || []).map((t) => t.name)
            ])
        );

        // ── Mapeo: especialidad del formulario de registro → categoría(s) de plantillas ──
        const FORM_ESP_TO_TEMPLATE_CAT = (_sharedTplReg && _sharedTplReg.formSpecialtyToTemplateCategories) || {
            'Cardiología': ['Cardiología'],
            'Ecografía General': ['Imágenes'],
            'Eco-Doppler Vascular': ['Imágenes'],
            'Diagnóstico por Imágenes': ['Imágenes'],
            'Gastroenterología / Endoscopía': ['Endoscopía'],
            'ORL (Otorrinolaringología)': ['ORL'],
            'Ginecología': ['Ginecología'],
            'Obstetricia': [],
            'Neumonología / Neumología': ['Neumología'],
            'Neurología': ['Neurología'],
            'Oftalmología': ['Oftalmología'],
            'Cirugía / Quirúrgico': ['Quirúrgico'],
            'Medicina General / Interna': ['General'],
            'Traumatología / Ortopedia': [],
            'Dermatología': [],
            'Endocrinología': [],
            'Urología': []
        };

        // ── Dispositivos por plan (fallback) ──
        const DEVICES_POR_PLAN = { NORMAL: 1, PRO: 3, CLINIC: 5, TRIAL: 3, GIFT: 10, ENTERPRISE: 999 };

        function _resolvePlanCfg(planCode) {
            const key = String(planCode || 'NORMAL').toLowerCase();
            const fallback = {
                maxDevices: DEVICES_POR_PLAN[String(planCode || 'NORMAL').toUpperCase()] || 2,
                templateMode: (key === 'gift' ? 'all' : (key === 'clinic' ? 'packs' : (key === 'pro' ? 'specialty' : 'manual'))),
                templateLimit: (key === 'normal' || key === 'trial') ? 3 : -1,
                packLimit: key === 'clinic' ? 3 : 0,
                specialtyExtraLimit: key === 'pro' ? 10 : 0,
                hasProMode: ['pro', 'clinic', 'gift', 'enterprise'].includes(key),
                hasDashboard: ['pro', 'clinic', 'gift', 'enterprise'].includes(key),
                canGenerateApps: ['clinic', 'enterprise'].includes(key)
            };
            try {
                const all = (typeof window._getAdminPlansConfig === 'function')
                    ? window._getAdminPlansConfig()
                    : JSON.parse(localStorage.getItem('admin_plans_config') || '{}');
                const cfg = all && all[key];
                return cfg ? Object.assign({}, fallback, cfg) : fallback;
            } catch(_) {
                return fallback;
            }
        }

        // ========== EDITAR USUARIO (WIZARD AVANZADO) ==========

        function _loadScriptOnce(src) {
            return new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
                if (existing) {
                    if (existing.dataset.loaded === 'true') {
                        resolve();
                        return;
                    }
                    existing.addEventListener('load', () => resolve(), { once: true });
                    existing.addEventListener('error', () => reject(new Error('No se pudo cargar: ' + src)), { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.dataset.dynamicSrc = src;
                script.addEventListener('load', () => {
                    script.dataset.loaded = 'true';
                    resolve();
                }, { once: true });
                script.addEventListener('error', () => reject(new Error('No se pudo cargar: ' + src)), { once: true });
                document.body.appendChild(script);
            });
        }

        async function _ensureAdvancedEditWizard() {
            if (window.AdminUserConfigWizard && window.AdminUserConfigRules) return;
            await _loadScriptOnce('admin-assets/js/admin-user-config-rules.js');
            await _loadScriptOnce('admin-assets/js/admin-user-config-wizard.js');
        }

        async function openEditUserModal(userId) {
            try {
                const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
                if (!user) {
                    showToast('Usuario no encontrado', 'error');
                    return;
                }

                await _ensureAdvancedEditWizard();
                if (!window.AdminUserConfigWizard) {
                    throw new Error('No se pudo inicializar el editor avanzado');
                }

                const planConfig = _resolvePlanCfg(user.Plan || 'NORMAL');
                window.AdminUserConfigWizard.open({
                    user,
                    planConfig,
                    especialidades: ESPECIALIDADES,
                    estudiosPorEspecialidad: ESTUDIOS_POR_ESPECIALIDAD,
                    saveUser: async (updates) => updateUser(user.ID_Medico, updates),
                    onSaved: (updates) => {
                        const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(user.ID_Medico));
                        if (idx !== -1) {
                            allUsers[idx] = { ...allUsers[idx], ...updates };
                        }
                        updateStats(allUsers);
                        applyFilters();
                    },
                    toast: showToast
                });
            } catch (error) {
                console.error('Error loading advanced editor:', error);
                showToast('No se pudo abrir el editor avanzado: ' + error.message, 'error');
            }
        }

        function closeEditUserModal() {
            const legacyModal = document.getElementById('editUserModal');
            if (legacyModal) legacyModal.style.display = 'none';
            if (window.AdminUserConfigWizard && typeof window.AdminUserConfigWizard.close === 'function') {
                window.AdminUserConfigWizard.close();
            }
        }

        async function handleEditUserSubmit(e) {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            showToast('Usá el editor avanzado para guardar cambios de configuración.', 'info');
        }

        // ========== FIN EDITAR USUARIO ==========

        // ========== FÁBRICA DE CLONES ==========
        const CF_APP_BASE_URL = 'https://transcriptorpro.github.io/transcripcion/';

        function _normalizeGiftSexo(rawSexo) {
            const sx = String(rawSexo || '').trim().toUpperCase();
            if (sx === 'F' || sx === 'M') return sx;
            return 'M';
        }

        function _formatGiftProfessionalDisplay(rawName, rawSexo) {
            const original = String(rawName || '').trim();
            const cleaned = original
                .replace(/^(?:\s*(?:dr\.?\s*\/\s*dra\.?|dra\.?|dr\.?))\s+/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            const baseName = cleaned || 'Profesional';
            const sexo = _normalizeGiftSexo(rawSexo);
            const title = sexo === 'F' ? 'Dra.' : 'Dr.';
            return {
                sexo,
                title,
                name: baseName,
                fullName: `${title} ${baseName}`
            };
        }

        window._formatGiftProfessionalDisplay = _formatGiftProfessionalDisplay;

        function _stripGiftProfessionalPrefix(rawName) {
            return String(rawName || '')
                .replace(/^(?:\s*(?:dr\.?\s*\/\s*dra\.?|dra\.?|dr\.?))\s+/i, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function _sanitizeGiftNameField() {
            const input = document.getElementById('giftNombre');
            if (!input) return;
            const cleaned = _stripGiftProfessionalPrefix(input.value);
            if (input.value !== cleaned) input.value = cleaned;
            if (typeof window._updatePdfSim === 'function') window._updatePdfSim();
        }

        function _bindGiftNameSanitizer() {
            const input = document.getElementById('giftNombre');
            if (!input) return;
            input.placeholder = 'Juan Perez';
            if (input.dataset.sanitizerBound === '1') return;
            input.addEventListener('blur', _sanitizeGiftNameField);
            input.addEventListener('change', _sanitizeGiftNameField);
            input.addEventListener('input', () => {
                const v = String(input.value || '');
                if (/^\s*(dr\.?\s*\/\s*dra\.?|dra\.?|dr\.?)\s+/i.test(v)) {
                    _sanitizeGiftNameField();
                }
            });
            input.dataset.sanitizerBound = '1';
        }

        function _ensureGiftSexoField() {
            if (document.getElementById('giftSexo')) return;
            const especialidadGroup = document.getElementById('giftEspecialidad')?.closest('.gw-field-group');
            if (!especialidadGroup || !especialidadGroup.parentElement) return;

            const host = especialidadGroup.parentElement;
            const sexoGroup = document.createElement('div');
            sexoGroup.className = 'gw-field-group';
            sexoGroup.innerHTML = `
                <label>Sexo <span class="gw-req">*</span></label>
                <select id="giftSexo">
                    <option value="M" selected>Masculino</option>
                    <option value="F">Femenino</option>
                </select>
                <small style="font-size:.68rem;color:#94a3b8;">Se usa para aplicar automaticamente Dr. o Dra. en informes y vista previa.</small>
            `;

            if (host.classList && host.classList.contains('gw-field-row')) {
                host.insertBefore(sexoGroup, especialidadGroup);
            } else {
                especialidadGroup.insertAdjacentElement('afterend', sexoGroup);
            }
        }

        let _cfCurrentUser = null;
        let _cfMode = 'normal'; // 'normal' | 'gift'

        /**
         * Abre la Fábrica de Clones en modo NORMAL (usuario existente)
         */
        function openCloneFactory(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;
            _cfCurrentUser = user;
            _cfMode = 'normal';

            // Título
            document.getElementById('cfModalTitle').textContent = '📦 Generar App para Usuario';

            // Mostrar modo normal, ocultar gift
            document.getElementById('cfModeNormal').style.display = 'block';
            document.getElementById('cfModeGift').style.display = 'none';
            document.getElementById('cfApiKeyLabel').textContent = '(para este usuario)';
            // Ocultar panel de preview lateral GIFT
            const _gSim = document.getElementById('imgprocSimBox');
            if (_gSim) _gSim.style.display = 'none';

            // Rellenar datos en el modal
            document.getElementById('cfUserId').textContent      = user.ID_Medico   || '—';
            document.getElementById('cfUserName').textContent     = user.Nombre      || '—';
            document.getElementById('cfMatricula').textContent    = user.Matricula   || '—';
            document.getElementById('cfEspecialidad').textContent = user.Especialidad || '—';
            document.getElementById('cfPlan').textContent         = (user.Plan || 'trial').toUpperCase();
            document.getElementById('cfEmail').textContent        = user.Email       || '—';

            // Reset estado — API Key en modo lectura (ya configurada en la aprobación)
            const cfApiKeyInput = document.getElementById('cfApiKey');
            cfApiKeyInput.value = user.API_Key || '';
            cfApiKeyInput.readOnly = true;
            cfApiKeyInput.style.background = '#f8fafc';
            cfApiKeyInput.style.opacity = '0.75';
            cfApiKeyInput.style.cursor = 'default';
            const cfHint = document.getElementById('cfApiKeyHint');
            if (cfHint) cfHint.textContent = user.API_Key
                ? '✅ Configurada durante la aprobación — solo lectura'
                : '⚠️ Sin API Key configurada — el usuario deberá ingresarla manualmente';
            // Backup keys (solo lectura en modo normal)
            const cfB1 = document.getElementById('cfApiKeyB1');
            const cfB2 = document.getElementById('cfApiKeyB2');
            if (cfB1) { cfB1.value = user.API_Key_B1 || ''; cfB1.readOnly = true; cfB1.style.background = '#f8fafc'; cfB1.style.opacity = '0.75'; cfB1.style.cursor = 'default'; }
            if (cfB2) { cfB2.value = user.API_Key_B2 || ''; cfB2.readOnly = true; cfB2.style.background = '#f8fafc'; cfB2.style.opacity = '0.75'; cfB2.style.cursor = 'default'; }
            document.getElementById('cfLinkResult').style.display = 'none';

            // Mostrar sección de API keys (visible en modo normal)
            const cfApiKeySectionNormal = document.getElementById('cfApiKeySection');
            if (cfApiKeySectionNormal) cfApiKeySectionNormal.style.display = 'flex';

            // Botón
            const btn = document.getElementById('cfBtnGenerate');
            btn.textContent = '🔗 Generar Link';
            btn.style.background = '';
            btn.style.display = '';

            document.getElementById('cloneFactoryModal').style.display = 'flex';
        }

        /**
         * Abre la Fábrica de Clones en modo GIFT (crear usuario regalo)
         */
        function openGiftFactory() {
            const requiredIds = ['cloneFactoryModal', 'cfModalTitle', 'cfModeNormal', 'cfModeGift'];
            const missingRequired = requiredIds.filter(id => !document.getElementById(id));
            if (missingRequired.length) {
                const reloadFlag = 'admin_gift_dom_reload_once';
                if (!sessionStorage.getItem(reloadFlag)) {
                    sessionStorage.setItem(reloadFlag, '1');
                    window.location.replace('admin.html?v=' + Date.now());
                    return;
                }
                dashAlert('No se pudo abrir el modo Regalo por caché desactualizada del panel. Recargá la página (Ctrl+F5).', '⚠️');
                return;
            }

            const byId = (id) => document.getElementById(id);
            const setValue = (id, value) => {
                const el = byId(id);
                if (el) el.value = value;
                return el;
            };

            _cfCurrentUser = null;
            _cfMode = 'gift';
            _ensureGiftSexoField();
            _bindGiftNameSanitizer();

            // Título
            byId('cfModalTitle').textContent = '🎁 Crear Usuario Regalo';

            // Mostrar modo gift, ocultar normal
            byId('cfModeNormal').style.display = 'none';
            byId('cfModeGift').style.display = 'block';
            const cfApiKeyLabel = byId('cfApiKeyLabel');
            if (cfApiKeyLabel) cfApiKeyLabel.textContent = '(para el usuario regalo)';

            // Reset campos gift — Paso 1
            setValue('giftNombre', '');
            const giftSexoField = document.getElementById('giftSexo');
            if (giftSexoField) giftSexoField.value = 'M';
            setValue('giftEmail', '');
            setValue('giftMatricula', '');
            setValue('giftTelefono', '');
            setValue('giftEspecialidad', '');

            // Reset campos gift — Paso 2 (Workplaces)
            _giftWpCounter = 0;
            _giftWpLogoData = {};
            const wpContainer = document.getElementById('giftWorkplacesContainer');
            if (wpContainer) wpContainer.innerHTML = '';
            renderGiftWorkplace(0, false); // Primer lugar (principal)

            // Reset campos gift — Paso 3 (Apariencia + Firma + Logo)
            _giftSelectedColor = '#1a56a0';
            _giftImageData = { firma: null, proLogo: null, proLogoSize: 60, firmaSize: 60, instLogoSize: 60 };
            const giftColorPreview = byId('giftColorPreview');
            if (giftColorPreview) giftColorPreview.style.background = '#1a56a0';
            document.querySelectorAll('#giftColorPalette .gift-color-swatch').forEach(s => {
                s.style.border = '3px solid transparent';
                s.style.boxShadow = 'none';
            });
            const firstSwatch = document.querySelector('#giftColorPalette .gift-color-swatch');
            if (firstSwatch) { firstSwatch.style.border = '3px solid #1a56a0'; firstSwatch.style.boxShadow = '0 0 0 2px white inset'; }
            const firmaPreview = document.getElementById('giftFirmaPreview');
            if (firmaPreview) firmaPreview.innerHTML = '';
            const proLogoPreview = document.getElementById('giftProLogoPreview');
            if (proLogoPreview) proLogoPreview.innerHTML = '';
            const firmaInput = document.getElementById('giftFirma');
            if (firmaInput) firmaInput.value = '';
            const proLogoInput = document.getElementById('giftProLogo');
            if (proLogoInput) proLogoInput.value = '';

            // Reset campos gift — Paso 4 (Licencia y Permisos)
            setValue('giftPlan', 'GIFT');
            setValue('giftProMode', 'true');
            setValue('giftDevices', '2');
            setValue('giftDuration', '90');
            const allTplCheck = document.getElementById('giftAllTemplates');
            if (allTplCheck) { allTplCheck.checked = true; }
            const tplGrid = document.getElementById('giftTemplatesGrid');
            if (tplGrid) { tplGrid.style.display = 'none'; tplGrid.innerHTML = ''; }
            updateGiftSummaryBadge();

            // Reset profesionales (CLINIC)
            _giftProfCounter = 0;
            _giftProfTituloData = {};
            const profContainer = document.getElementById('giftProfessionalsContainer');
            if (profContainer) profContainer.innerHTML = '';
            const profCard = document.getElementById('giftProfessionalsCard');
            if (profCard) profCard.style.display = 'none';
            _updateGiftProfCounter();

            // Wizard: empezar en paso 1
            giftGoStep(1);

            // Poblar especialidades en el select
            const sel = document.getElementById('giftEspecialidad');
            if (sel) {
                sel.innerHTML = '<option value="">— Seleccioná —</option>';
                ESPECIALIDADES.forEach(esp => {
                    sel.innerHTML += `<option value="${esp}">${esp}</option>`;
                });
            }

            // Reset estado — API Key editable para usuario regalo (nuevo usuario, sin aprobación previa)
            const cfApiKeyInputGift = document.getElementById('cfApiKey');
            if (!cfApiKeyInputGift) {
                dashAlert('No se pudo abrir el campo de API Key del modo Regalo. Recargá la página (Ctrl+F5).', '⚠️');
                return;
            }
            // Auto-llenar con las keys guardadas en Mis Keys
            cfApiKeyInputGift.value = localStorage.getItem('admin_groq_key') || '';
            cfApiKeyInputGift.readOnly = false;
            cfApiKeyInputGift.style.background = '';
            cfApiKeyInputGift.style.opacity = '';
            cfApiKeyInputGift.style.cursor = '';
            // Ocultar sección de API keys — se agregan automáticamente al generar el link
            const cfApiKeySection = document.getElementById('cfApiKeySection');
            if (cfApiKeySection) cfApiKeySection.style.display = 'none';
            const cfHintGift = document.getElementById('cfApiKeyHint');
            if (cfHintGift) cfHintGift.textContent = cfApiKeyInputGift.value
                ? '✅ Pre-llenada desde Mis Keys — podés cambiarla si necesitás'
                : 'Si lo dejás vacío, el usuario deberá ingresar su propia API Key';
            // Backup keys editables en modo gift (auto-llenadas)
            const cfB1g = document.getElementById('cfApiKeyB1');
            const cfB2g = document.getElementById('cfApiKeyB2');
            if (cfB1g) { cfB1g.value = localStorage.getItem('admin_groq_key_b1') || ''; cfB1g.readOnly = false; cfB1g.style.background = ''; cfB1g.style.opacity = ''; cfB1g.style.cursor = ''; }
            if (cfB2g) { cfB2g.value = localStorage.getItem('admin_groq_key_b2') || ''; cfB2g.readOnly = false; cfB2g.style.background = ''; cfB2g.style.opacity = ''; cfB2g.style.cursor = ''; }
            const cfLinkResult = byId('cfLinkResult');
            if (cfLinkResult) cfLinkResult.style.display = 'none';

            // Botón con estilo gift — ocultar del footer (el paso 6 tiene su propio botón)
            const btn = document.getElementById('cfBtnGenerate');
            if (btn) {
                btn.textContent = '🎁 Crear y Generar Link';
                btn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
                btn.style.display = 'none';
            }

            byId('cloneFactoryModal').style.display = 'flex';
        }

        function closeCloneFactory() {
            document.getElementById('cloneFactoryModal').style.display = 'none';
            _cfCurrentUser = null;
            _cfMode = 'normal';
            // Restaurar botón del footer para el modo normal
            const btnRestore = document.getElementById('cfBtnGenerate');
            if (btnRestore) { btnRestore.style.display = ''; btnRestore.textContent = '🔗 Generar Link'; btnRestore.style.background = ''; }
            // Reset gift wizard to step 1
            giftGoStep(1);
        }

        // ── Gift Wizard: state ──────────────────────────────────────────────
        let _giftSelectedColor = '#1a56a0';
        let _giftWpCounter = 0;
        let _giftWpLogoData = {};
        let _giftImageData = { firma: null, proLogo: null, proLogoSize: 60, firmaSize: 60, instLogoSize: 60 };
        let _giftProfCounter = 0;
        let _giftProfTituloData = {};
        var _giftActiveInstWp = 0;  // WP activo para el editor de logo institucional (var para acceso desde inline handlers)
        const _giftImagePreview = { inst: null, prof: null, firma: null };

        // ── Gift Wizard: navegación de pasos ─────────────────────────────────
        function giftGoStep(step) {
            for (let i = 1; i <= 6; i++) {
                const el = document.getElementById('giftStep' + i);
                if (el) el.style.display = (i === step) ? 'block' : 'none';
            }
            document.querySelectorAll('#giftStepper .gift-step-dot').forEach(dot => {
                const s = parseInt(dot.dataset.step);
                dot.style.background = s <= step ? '#f59e0b' : '#e5e7eb';
            });
            // Actualizar resumen al entrar al paso 6
            if (step === 6) updateGiftFinalSummary();
            // Inicializar procesador de imágenes al entrar al paso 5
            if (step === 5 && typeof _imgprocInitStep5 === 'function') _imgprocInitStep5();
            // Ocultar preview lateral si salimos de los pasos con editores
            if (step !== 2 && step !== 5) {
                const giftSim = document.getElementById('imgprocSimBox');
                if (giftSim) giftSim.style.display = 'none';
            }
            // Mostrar preview lateral en paso 2 (workplaces con logos) y paso 5 (firma/logo prof)
            if (step === 2 || step === 5) {
                const giftSim = document.getElementById('imgprocSimBox');
                if (giftSim) { giftSim.style.display = ''; _updatePdfSim(); }
            }
        }

        function selectGiftColor(color, el) {
            _giftSelectedColor = color;
            document.querySelectorAll('#giftColorPalette .gift-color-swatch').forEach(s => {
                s.style.border = '3px solid transparent';
                s.style.boxShadow = 'none';
            });
            el.style.border = `3px solid ${color}`;
            el.style.boxShadow = '0 0 0 2px white inset';
            document.getElementById('giftColorPreview').style.background = color;
        }

        function selectGiftColor(color, el) {
            _giftSelectedColor = color;
            document.querySelectorAll('#giftColorPalette .gift-color-swatch').forEach(s => {
                s.style.border = '3px solid transparent';
                s.style.boxShadow = 'none';
            });
            el.style.border = `3px solid ${color}`;
            el.style.boxShadow = '0 0 0 2px white inset';
            document.getElementById('giftColorPreview').style.background = color;
        }

        // ── Gift Step 4: Plan defaults, templates grid, summary ──────────────
        function updateGiftPlanDefaults() {
            const plan = document.getElementById('giftPlan').value;
            const devSel = document.getElementById('giftDevices');
            const proSel = document.getElementById('giftProMode');
            const durSel = document.getElementById('giftDuration');
            const defaults = {
                TRIAL:  { devices: '3',  pro: 'true',  duration: '15' },
                NORMAL: { devices: '1',  pro: 'false', duration: '365' },
                PRO:    { devices: '3',  pro: 'true',  duration: '365' },
                GIFT:   { devices: '2',  pro: 'true',  duration: '90' },
                CLINIC: { devices: '5',  pro: 'true', duration: '365' }
            };
            const d = defaults[plan] || defaults.GIFT;
            devSel.value = d.devices;
            proSel.value = d.pro;
            durSel.value = d.duration;
            // Gate redes sociales: solo GIFT/PRO/CLINIC
            const socialPlans = ['GIFT', 'PRO', 'CLINIC'];
            const socialChk = document.getElementById('giftShowSocial');
            if (socialChk) {
                socialChk.disabled = !socialPlans.includes(plan);
                if (!socialPlans.includes(plan)) socialChk.checked = false;
            }
            // Mostrar sección de profesionales SOLO para CLINIC (C3)
            const profCard = document.getElementById('giftProfessionalsCard');
            if (profCard) profCard.style.display = plan === 'CLINIC' ? '' : 'none';
            // Actualizar resumen inline en paso 3
            updateGiftSummaryBadge();
        }

        // ── C3: Profesionales del equipo (solo CLINIC) en Gift Wizard ─────────
        function renderGiftProfessional(index) {
            const container = document.getElementById('giftProfessionalsContainer');
            if (!container) return;
            const titu = _giftProfTituloData[index] || 'Dr.';
            const trustedTituOptions = ['Dr.','Dra.','Lic.','Mg.','Prof.','TM.','Enf.'];
            const titulosHtml = trustedTituOptions.map(t =>
                '<option value="' + t + '"' + (t === titu ? ' selected' : '') + '>' + t + '</option>'
            ).join('');
            const div = document.createElement('div');
            div.className = 'gw-wp-accordion';
            div.id = 'giftProf-' + index;
            div.innerHTML = [
                '<div style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.5rem 0;" onclick="this.parentElement.classList.toggle(\'collapsed\');">',
                    '<span id="giftProfNameDisplay' + index + '" style="flex:1;font-weight:600;font-size:.85rem;">',
                        '&#129657; Profesional ' + (index + 1),
                    '</span>',
                    '<button type="button" onclick="event.stopPropagation();removeGiftProfessional(' + index + ')" style="padding:2px 8px;font-size:.78rem;border:1px solid #fca5a5;border-radius:6px;color:#ef4444;background:#fff8f8;cursor:pointer;">Eliminar</button>',
                    '<span style="font-size:.7rem;color:#94a3b8;">&#9660;</span>',
                '</div>',
                '<div class="gw-wp-body" style="border-top:1px solid #f1f5f9;padding-top:.5rem;margin-top:.2rem;">',
                    '<div class="gw-field-row">',
                        '<div class="gw-field-group">',
                            '<label>Título</label>',
                            '<select id="giftProfTitulo' + index + '" onchange="_onGiftProfTituloChange(' + index + ')" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;">',
                                titulosHtml,
                            '</select>',
                        '</div>',
                        '<div class="gw-field-group" style="flex:2;">',
                            '<label>Nombre y Apellido <span style="color:red;">*</span></label>',
                            '<input type="text" id="giftProfNombre' + index + '" placeholder="Juan Pérez" oninput="_updateGiftProfName(' + index + ')" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;">',
                        '</div>',
                    '</div>',
                    '<div class="gw-field-row">',
                        '<div class="gw-field-group">',
                            '<label>Especialidad</label>',
                            '<input type="text" id="giftProfEsp' + index + '" placeholder="Cardiología" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;">',
                        '</div>',
                        '<div class="gw-field-group">',
                            '<label>Matrícula</label>',
                            '<input type="text" id="giftProfMatricula' + index + '" placeholder="MN 12345" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;">',
                        '</div>',
                    '</div>',
                    '<div class="gw-field-row">',
                        '<div class="gw-field-group">',
                            '<label>Usuario (para identificarse)</label>',
                            '<input type="text" id="giftProfUsuario' + index + '" placeholder="jpérez" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;">',
                        '</div>',
                        '<div class="gw-field-group">',
                            '<label>PIN (4 dígitos)</label>',
                            '<input type="text" id="giftProfPin' + index + '" placeholder="1234" maxlength="4" pattern="[0-9]{4}" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;font-family:monospace;">',
                        '</div>',
                    '</div>',
                    '<div class="gw-field-group">',
                        '<label>Email (opcional)</label>',
                        '<input type="email" id="giftProfEmail' + index + '" placeholder="profesional@clinica.com" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;width:100%;">',
                    '</div>',
                '</div>'
            ].join('');
            container.appendChild(div);
        }

        function _onGiftProfTituloChange(index) {
            const sel = document.getElementById('giftProfTitulo' + index);
            if (sel) _giftProfTituloData[index] = sel.value;
            _updateGiftProfName(index);
        }

        function _updateGiftProfName(index) {
            const disp = document.getElementById('giftProfNameDisplay' + index);
            if (!disp) return;
            const titu = _giftProfTituloData[index] || document.getElementById('giftProfTitulo' + index)?.value || 'Dr.';
            const name = (document.getElementById('giftProfNombre' + index)?.value || '').trim();
            disp.textContent = name ? (titu + ' ' + name) : '\uD83E\uDEC1 Profesional ' + (index + 1);
        }

        function addGiftProfessional() {
            const current = document.querySelectorAll('#giftProfessionalsContainer .gw-wp-accordion').length;
            const maxProf = 10;
            if (current >= maxProf) { dashAlert('Máximo ' + maxProf + ' profesionales permitidos', '\uD83D\uDC65'); return; }
            document.querySelectorAll('#giftProfessionalsContainer .gw-wp-accordion').forEach(a => a.classList.add('collapsed'));
            renderGiftProfessional(_giftProfCounter);
            _giftProfTituloData[_giftProfCounter] = 'Dr.';
            _giftProfCounter++;
            _updateGiftProfCounter();
        }

        function removeGiftProfessional(index) {
            const el = document.getElementById('giftProf-' + index);
            if (el) el.remove();
            delete _giftProfTituloData[index];
            _updateGiftProfCounter();
        }

        function _updateGiftProfCounter() {
            const count = document.querySelectorAll('#giftProfessionalsContainer .gw-wp-accordion').length;
            const el = document.getElementById('giftProfCounter');
            if (el) el.textContent = count ? count + ' profesional(es) configurado(s)' : 'Sin profesionales aún';
        }

        function _collectGiftProfessionals() {
            const profs = [];
            document.querySelectorAll('#giftProfessionalsContainer .gw-wp-accordion').forEach(acc => {
                const idx = parseInt(acc.id.replace('giftProf-', ''));
                const titulo = _giftProfTituloData[idx] || 'Dr.';
                const nombre = ((document.getElementById('giftProfNombre' + idx) || {}).value || '').trim();
                if (!nombre) return;
                const esp = ((document.getElementById('giftProfEsp' + idx) || {}).value || '').trim();
                const mat = ((document.getElementById('giftProfMatricula' + idx) || {}).value || '').trim();
                const usuario = ((document.getElementById('giftProfUsuario' + idx) || {}).value || '').trim();
                const pin = ((document.getElementById('giftProfPin' + idx) || {}).value || '').trim() || '1234';
                const email = ((document.getElementById('giftProfEmail' + idx) || {}).value || '').trim();
                profs.push({
                    id: String(Date.now()) + String(Math.floor(Math.random() * 100000)),
                    nombre: titulo + ' ' + nombre,
                    matricula: mat,
                    especialidades: esp ? [esp] : [],
                    usuario: usuario,
                    pin: pin,
                    email: email,
                    telefono: '',
                    firma: null,
                    logo: null,
                    redesSociales: {},
                    showPhone: true,
                    showEmail: true,
                    showSocial: false,
                    activo: true,
                    primerUso: true
                });
            });
            return profs;
        }

        function updateGiftSummaryBadge() {
            // badge eliminado — los elementos ya no existen en el DOM
        }

        function toggleGiftAllTemplates(checked) {
            const grid = document.getElementById('giftTemplatesGrid');
            grid.style.display = checked ? 'none' : 'block';
            if (!checked && grid.innerHTML === '') {
                // Poblar el grid con los template checkboxes
                let html = '';
                Object.entries(TEMPLATE_MAP).forEach(([cat, templates]) => {
                    html += '<div style="margin-bottom:.4rem;"><strong style="font-size:.75rem;color:#374151;">' + cat + '</strong><div style="display:flex;flex-wrap:wrap;gap:.3rem .8rem;margin-left:.5rem;">';
                    templates.forEach(t => {
                        html += '<label style="font-size:.78rem;display:flex;align-items:center;gap:.3rem;cursor:pointer;"><input type="checkbox" value="' + t.key + '" checked class="giftTplCheck"> ' + t.name + '</label>';
                    });
                    html += '</div></div>';
                });
                grid.innerHTML = html;
            }
            updateGiftSummaryBadge();
        }

        function _getSelectedGiftTemplates() {
            if (document.getElementById('giftAllTemplates')?.checked) {
                return _getAllTemplateKeys();
            }
            const checked = document.querySelectorAll('.giftTplCheck:checked');
            return Array.from(checked).map(c => c.value);
        }

        function updateGiftFinalSummary() {
            const plan = document.getElementById('giftPlan')?.value || 'GIFT';
            const dev = document.getElementById('giftDevices')?.value || '10';
            const dur = document.getElementById('giftDuration')?.value || '365';
            const pro = document.getElementById('giftProMode')?.value === 'true';
            const allTpl = document.getElementById('giftAllTemplates')?.checked !== false;
            const tplCount = allTpl ? _getAllTemplateKeys().length : document.querySelectorAll('.giftTplCheck:checked').length;
            const durMap = { '7': '7 días', '15': '15 días', '30': '1 mes', '90': '3 meses', '180': '6 meses', '365': '1 año', '0': 'Sin vencimiento' };

            // Datos del paso 1
            const nombreRaw = document.getElementById('giftNombre')?.value || '';
            const sexo = document.getElementById('giftSexo')?.value || 'M';
            const nombre = nombreRaw
                ? _formatGiftProfessionalDisplay(nombreRaw, sexo).fullName
                : '—';
            const matricula = document.getElementById('giftMatricula')?.value || '—';
            const email = document.getElementById('giftEmail')?.value || '—';
            const telefono = document.getElementById('giftTelefono')?.value || '';

            // Profesionales (paso 4, solo CLINIC)
            const giftPlanForSummary = document.getElementById('giftPlan')?.value || 'GIFT';
            let profsSummaryHtml = '';
            if (giftPlanForSummary === 'CLINIC') {
                const profs = _collectGiftProfessionals();
                profsSummaryHtml = profs.length
                    ? profs.map(p => p.nombre + (p.especialidades[0] ? ' &mdash; ' + p.especialidades[0] : '')).join('<br>')
                    : '<span style="color:#94a3b8;">Sin profesionales configurados</span>';
            }

            // Datos del paso 2: TODOS los workplaces (scoped al container correcto)
            const wpAccordions = document.querySelectorAll('#giftWorkplacesContainer .gw-wp-accordion');
            let wpSummaryHtml = '';
            if (wpAccordions.length === 0) {
                wpSummaryHtml = '<span style="color:#94a3b8;">Ninguno configurado</span>';
            } else {
                const wpNames = [];
                wpAccordions.forEach(acc => {
                    const idx = acc.dataset.wpIndex;
                    const n = (document.getElementById('gwWpName' + idx) || {}).value?.trim();
                    const addr = (document.getElementById('gwWpAddress' + idx) || {}).value?.trim();
                    if (n) wpNames.push('<strong>' + n + '</strong>' + (addr ? ' <span style="color:#94a3b8;font-size:.72rem;">(' + addr + ')</span>' : ''));
                });
                wpSummaryHtml = wpNames.length > 0 ? wpNames.join('<br>') : '<span style="color:#94a3b8;">Sin nombre</span>';
            }

            // Imágenes paso 3/5 — consultar _giftImageData directamente
            const hasProLogo = !!(_giftImageData && _giftImageData.proLogo);
            const hasFirma   = !!(_giftImageData && _giftImageData.firma);
            // También chequear los status badges como fallback
            const hasProLogoAlt = document.getElementById('imgProf-status')?.textContent?.includes('✅');
            const hasFirmaAlt   = document.getElementById('imgFirma-status')?.textContent?.includes('✅');
            const logoOk = hasProLogo || hasProLogoAlt;
            const firmaOk = hasFirma || hasFirmaAlt;

            // Logo institucional: al menos uno cargado
            let hasInstLogo = false;
            for (const k in _giftWpLogoData) {
                if (_giftWpLogoData[k]) { hasInstLogo = true; break; }
            }

            // Contacto en informes
            const showPhone  = document.getElementById('giftShowPhone')?.checked;
            const showEmail  = document.getElementById('giftShowEmail')?.checked;
            const showSocial = document.getElementById('giftShowSocial')?.checked;
            let contactItems = [];
            if (showPhone)  contactItems.push('📞 Tel');
            if (showEmail)  contactItems.push('📧 Email');
            if (showSocial) contactItems.push('🌐 Redes');
            const contactSummary = contactItems.length > 0 ? contactItems.join(' · ') : '<span style="color:#94a3b8;">Ninguno</span>';

            // API Key
            const apiKey = document.getElementById('cfApiKey')?.value || '';
            const apiKeyDisplay = apiKey ? '•••' + apiKey.slice(-6) : '<span style="color:#ef4444;">No configurada</span>';

            const el = document.getElementById('giftFinalSummaryContent');
            if (!el) return;
            el.innerHTML = `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem .8rem;font-size:.8rem;">
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">👤 Profesional</div>
                  <div><strong>${nombre}</strong></div>
                  <div style="color:#64748b;font-size:.75rem;">${matricula} · ${email}${telefono ? ' · ' + telefono : ''}</div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">🏥 Lugar/es de trabajo</div>
                  <div style="font-size:.78rem;">${wpSummaryHtml}</div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">🏷️ Licencia</div>
                  <div><strong>${plan}</strong> · ${durMap[dur] || dur + ' días'}</div>
                  <div style="color:#64748b;font-size:.75rem;">${dev === '999' ? 'Ilimitados' : dev} disp. · Pro Mode: ${pro ? 'Sí' : 'No'}</div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">📄 Plantillas y estilo</div>
                  <div><strong>${allTpl ? 'Todas (' + tplCount + ')' : tplCount + ' seleccionadas'}</strong></div>
                  <div style="display:flex;align-items:center;gap:.3rem;font-size:.75rem;color:#64748b;">Color: <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${_giftSelectedColor};vertical-align:middle;border:1px solid rgba(0,0,0,.15);"></span></div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">🖼️ Imágenes</div>
                  <div style="font-size:.78rem;">Logo prof: ${logoOk ? '<span style="color:#10b981;">✅ Cargado</span>' : '<span style="color:#94a3b8;">No</span>'}</div>
                  <div style="font-size:.78rem;">Firma: ${firmaOk ? '<span style="color:#10b981;">✅ Cargada</span>' : '<span style="color:#94a3b8;">No</span>'}</div>
                  <div style="font-size:.78rem;">Logo inst: ${hasInstLogo ? '<span style="color:#10b981;">✅ Cargado</span>' : '<span style="color:#94a3b8;">No</span>'}</div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">🔑 API Key</div>
                  <div style="font-family:monospace;font-size:.78rem;">${apiKeyDisplay}</div>
                </div>
                <div style="background:#f8fafc;border-radius:6px;padding:.5rem .7rem;grid-column:1/-1;">
                  <div style="font-size:.7rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">📋 Contacto en informes</div>
                  <div style="font-size:.78rem;">${contactSummary}</div>
                </div>
                ${plan === 'CLINIC' ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:.5rem .7rem;grid-column:1/-1;">
                  <div style="font-size:.7rem;color:#1d4ed8;font-weight:600;text-transform:uppercase;margin-bottom:.3rem;">👥 Profesionales del equipo</div>
                  <div style="font-size:.78rem;">${profsSummaryHtml}</div>
                </div>` : ''}
              </div>
            `;
        }

        // ── Gift Wizard: Workplace Accordion ─────────────────────────────────
        function renderGiftWorkplace(index, collapsed) {
            const container = document.getElementById('giftWorkplacesContainer');
            const isMain = index === 0;
            const div = document.createElement('div');
            div.className = 'gw-wp-accordion' + (collapsed ? ' collapsed' : '');
            div.id = 'gw-wp-' + index;
            div.dataset.wpIndex = index;

            div.innerHTML = `
                <div class="gw-wp-header" onclick="toggleGiftWorkplace(${index})">
                    <div class="gw-wp-header-info">
                        <span class="gw-wp-badge ${isMain ? '' : 'extra'}">${isMain ? 'Principal' : 'Adicional'}</span>
                        <span id="gwWpNameDisplay${index}">${isMain ? '🏥 Lugar de Trabajo Principal' : '🏢 Lugar adicional'}</span>
                    </div>
                    <div class="gw-wp-header-actions">
                        ${!isMain ? '<button type="button" class="gw-wp-remove" onclick="event.stopPropagation();removeGiftWorkplace(' + index + ')" title="Eliminar">✕</button>' : ''}
                        <span class="gw-wp-chevron">▾</span>
                    </div>
                </div>
                <div class="gw-wp-body">
                    <div class="gw-field-row">
                        <div class="gw-field-group">
                            <label>Nombre del lugar ${isMain ? '<span class="gw-req">*</span>' : ''}</label>
                            <input type="text" id="gwWpName${index}" placeholder="Clínica San Martín" oninput="updateGiftWpName(${index}); _giftActiveInstWp=${index}; _updatePdfSim();" onfocus="_giftActiveInstWp=${index}; _updatePdfSim();">
                        </div>
                        <div class="gw-field-group">
                            <label>Dirección</label>
                            <input type="text" id="gwWpAddress${index}" placeholder="Av. Corrientes 1234, CABA" oninput="_giftActiveInstWp=${index}; _updatePdfSim();" onfocus="_giftActiveInstWp=${index}; _updatePdfSim();">
                        </div>
                    </div>
                    <div class="gw-field-row">
                        <div class="gw-field-group">
                            <label>Teléfono del lugar</label>
                            <input type="tel" id="gwWpPhone${index}" placeholder="(011) 4567-8901" oninput="_giftActiveInstWp=${index}; _updatePdfSim();" onfocus="_giftActiveInstWp=${index}; _updatePdfSim();">
                        </div>
                        <div class="gw-field-group">
                            <label>Email institucional</label>
                            <input type="email" id="gwWpEmail${index}" placeholder="info@clinica.com">
                        </div>
                    </div>
                    <div class="gw-field-group" style="margin-top:.4rem;">
                        <label>Texto del pie de página</label>
                        <input type="text" id="gwWpFooter${index}" placeholder="Consultorio médico — Tel: (011) 4567-8901" oninput="_giftActiveInstWp=${index}; _updatePdfSim();" onfocus="_giftActiveInstWp=${index}; _updatePdfSim();">
                        <small style="font-size:.68rem;color:#94a3b8;">Aparece en los informes PDF de este lugar</small>
                    </div>
                    <div class="gw-field-group" style="margin-top:.4rem;">
                        <label>Logo del Lugar / Institución</label>
                        <div class="gw-upload-zone">
                            <div class="gw-upload-icon">🖼️</div>
                            <div class="gw-upload-text">Clic o arrastrá para subir<br><small>PNG o JPG, máx 2 MB</small></div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" onchange="previewGiftWpLogo(this, ${index})">
                        </div>
                        <div class="gw-upload-preview" id="gwWpLogoPreview${index}"></div>
                        <!-- Herramientas de edición del logo institucional -->
                        <div id="gwLogo${index}-editor-wrap" style="display:none;margin-top:.5rem;border:1px solid #e2e8f0;border-radius:8px;padding:.6rem;background:#fafbff;">
                            <p style="font-size:.78rem;font-weight:600;color:#1e40af;margin:0 0 .4rem;">🖼️ Editor de Logo Institucional</p>
                            <div id="gwLogo${index}-thumb-wrap" style="display:none;background:repeating-conic-gradient(#e0e0e0 0% 25%,#fff 0% 50%) 0 0/12px 12px;border-radius:6px;padding:6px;text-align:center;margin-bottom:.45rem;">
                                <img id="gwLogo${index}-thumb" style="max-height:50px;max-width:100%;object-fit:contain;">
                            </div>
                            <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem;">
                                <label class="btn-secondary" for="gwLogo${index}-file" style="padding:4px 10px;font-size:.78rem;cursor:pointer;">📂 Cambiar imagen</label>
                                <input type="file" id="gwLogo${index}-file" accept="image/*" style="display:none;">
                                <button type="button" class="btn-secondary" id="gwLogo${index}-clear" style="padding:4px 7px;font-size:.78rem;display:none;color:#ef4444;border-color:#fca5a5;" title="Quitar imagen">🗑️</button>
                                <span id="gwLogo${index}-status" style="font-size:.68rem;padding:2px 7px;border-radius:10px;background:#f1f5f9;color:#64748b;margin-left:auto;">Vacío</span>
                            </div>
                            <div id="gwLogo${index}-proc-section" style="display:none;margin-top:.35rem;padding-top:.35rem;border-top:1px solid #e2e8f0;">
                                <div style="display:flex;gap:.6rem;flex-wrap:wrap;font-size:.78rem;margin-bottom:.3rem;">
                                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="gwLogo${index}-bg" checked style="accent-color:var(--primary);"> 🤖 Quitar fondo</label>
                                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="gwLogo${index}-trim" checked style="accent-color:var(--primary);"> ✂️ Auto-recortar</label>
                                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="gwLogo${index}-scale" checked style="accent-color:var(--primary);"> 📐 Escalar</label>
                                </div>
                                <button type="button" class="btn-primary" id="gwLogo${index}-process" style="width:100%;padding:5px 0;font-size:.8rem;">⚙️ Procesar imagen</button>
                            </div>
                            <div id="gwLogo${index}-edit-section" style="display:none;margin-top:.35rem;padding-top:.35rem;border-top:1px solid #e2e8f0;">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin-bottom:.35rem;">
                                    <div><p style="font-size:.68rem;color:#64748b;margin:0 0 2px;">Original</p><div class="imgproc-checkerboard" style="border-radius:5px;min-height:50px;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img id="gwLogo${index}-orig" style="max-width:100%;max-height:120px;object-fit:contain;"></div></div>
                                    <div><p style="font-size:.68rem;color:#64748b;margin:0 0 2px;">Resultado</p><div class="imgproc-checkerboard" style="border-radius:5px;min-height:50px;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img id="gwLogo${index}-result" style="max-width:100%;max-height:120px;object-fit:contain;"></div></div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.25rem .6rem;font-size:.76rem;margin-bottom:.3rem;">
                                    <div><label style="color:#64748b;">☀️ Brillo <span id="gwLogo${index}-brval">100</span>%</label><input type="range" id="gwLogo${index}-br" min="20" max="200" value="100" style="width:100%;accent-color:var(--primary);"></div>
                                    <div><label style="color:#64748b;">🎨 Contraste <span id="gwLogo${index}-cnval">100</span>%</label><input type="range" id="gwLogo${index}-cn" min="20" max="200" value="100" style="width:100%;accent-color:var(--primary);"></div>
                                </div>
                                <div style="font-size:.76rem;margin-bottom:.3rem;">
                                    <label style="color:#475569;font-weight:600;">📐 Escala <span id="gwLogo${index}-scaleval">100</span>% <span id="gwLogo${index}-rdims" style="font-size:.63rem;color:#94a3b8;font-weight:400;margin-left:4px;"></span></label>
                                    <input type="range" id="gwLogo${index}-rscale" min="10" max="300" value="100" style="width:100%;accent-color:var(--primary);">
                                </div>
                                <div style="font-size:.76rem;margin-bottom:.3rem;">
                                    <label style="color:#64748b;">🗜️ Compresión <span id="gwLogo${index}-cmpval">92</span>%</label>
                                    <input type="range" id="gwLogo${index}-cmp" min="10" max="100" value="92" style="width:100%;accent-color:var(--primary);">
                                    <p id="gwLogo${index}-cmpinfo" style="font-size:.63rem;color:#94a3b8;margin:2px 0 0;"></p>
                                </div>
                                <div style="font-size:.76rem;margin-bottom:.3rem;">
                                    <label style="color:#64748b;">📏 Tamaño en PDF <span id="gwLogo${index}-szval">60</span>px <span id="gwLogo${index}-szdesc" style="color:#9ca3af;font-style:italic;font-size:.68rem;">(normal)</span></label>
                                    <input type="range" id="gwLogo${index}-sz" min="30" max="120" value="60" style="width:100%;accent-color:var(--primary);">
                                </div>
                                <div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-bottom:.3rem;">
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-rotL" style="padding:3px 8px;font-size:.75rem;" title="Rotar izquierda">↺90°</button>
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-rotR" style="padding:3px 8px;font-size:.75rem;" title="Rotar derecha">↻90°</button>
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-fH" style="padding:3px 8px;font-size:.75rem;" title="Voltear horizontal">⟺H</button>
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-fV" style="padding:3px 8px;font-size:.75rem;" title="Voltear vertical">⇅V</button>
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-crop" style="padding:3px 8px;font-size:.75rem;" title="Recortar imagen">✂️ Recortar</button>
                                    <button type="button" class="btn-secondary" id="gwLogo${index}-reset" style="padding:3px 8px;font-size:.75rem;margin-left:auto;" title="Resetear">↩</button>
                                </div>
                                <button type="button" class="btn-primary" id="gwLogo${index}-apply" style="width:100%;padding:5px 0;font-size:.8rem;background:#10b981;border-color:#10b981;">✅ Usar este logo</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        }

        function toggleGiftWorkplace(index) {
            const acc = document.getElementById('gw-wp-' + index);
            if (!acc) return;
            const wasCollapsed = acc.classList.contains('collapsed');
            if (wasCollapsed) {
                // Colapsar todos, expandir este
                document.querySelectorAll('#giftWorkplacesContainer .gw-wp-accordion').forEach(a => a.classList.add('collapsed'));
                acc.classList.remove('collapsed');
            } else {
                acc.classList.add('collapsed');
            }
        }

        function addGiftWorkplace() {
            document.querySelectorAll('#giftWorkplacesContainer .gw-wp-accordion').forEach(a => a.classList.add('collapsed'));
            _giftWpCounter++;
            renderGiftWorkplace(_giftWpCounter, false);
            const el = document.getElementById('gw-wp-' + _giftWpCounter);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        async function removeGiftWorkplace(index) {
            const ok = await dashConfirm('¿Eliminar este lugar de trabajo?', '🗑️');
            if (!ok) return;
            const el = document.getElementById('gw-wp-' + index);
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'scale(.95)';
                el.style.transition = 'all .2s ease';
                setTimeout(() => el.remove(), 200);
            }
            delete _giftWpLogoData[index];
        }

        function updateGiftWpName(index) {
            const input = document.getElementById('gwWpName' + index);
            const display = document.getElementById('gwWpNameDisplay' + index);
            if (input && display) {
                const icon = index === 0 ? '🏥' : '🏢';
                display.textContent = input.value.trim() || (icon + ' ' + (index === 0 ? 'Lugar de Trabajo Principal' : 'Lugar adicional'));
            }
        }

        // Store editors per workplace
        const _giftWpLogoEditors = {};

        function previewGiftWpLogo(input, index) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                dashAlert('La imagen no puede superar 2 MB', '📷');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const b64 = e.target.result;
                document.getElementById('gwWpLogoPreview' + index).innerHTML = '<img src="' + b64 + '" alt="Logo">';
                _giftWpLogoData[index] = b64;
                // Show editor and initialize if needed
                const editorWrap = document.getElementById('gwLogo' + index + '-editor-wrap');
                if (editorWrap) {
                    editorWrap.style.display = 'block';
                    _initGiftWpLogoEditor(index, b64);
                }
            };
            reader.readAsDataURL(file);
        }

        function _initGiftWpLogoEditor(index, b64) {
            if (_giftWpLogoEditors[index]) {
                // Editor already exists, just load the new image
                _giftWpLogoEditors[index].loadB64(b64);
                return;
            }
            if (!window._makeImageSection) return;
            _giftWpLogoEditors[index] = window._makeImageSection({
                type: 'inst', prefix: 'gwLogo' + index,
                getFromPrev: null,
                saveResult: (b64) => {
                    _giftWpLogoData[index] = b64;
                    const prev = document.getElementById('gwWpLogoPreview' + index);
                    if (prev && b64) prev.innerHTML = '<img src="' + b64 + '" alt="Logo" style="max-height:50px;">';
                    _giftActiveInstWp = index;
                    _giftImagePreview.inst = b64;
                    _updatePdfSim();
                },
                onPreviewUpdate: (type, b64val) => {
                    _giftActiveInstWp = index;
                    _giftImagePreview.inst = b64val;
                    _updatePdfSim();
                },
                onSizeUpdate: (type, sz) => {
                    _giftActiveInstWp = index;
                    _giftImageData.instLogoSize = sz;
                    _updatePdfSim();
                }
            });
            _giftWpLogoEditors[index].loadB64(b64);
        }

        // ── Gift Wizard: Firma/Logo preview ──────────────────────────────────
        function previewGiftImage(input, previewId, type) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                dashAlert('La imagen no puede superar 2 MB', '📷');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const container = document.getElementById(previewId);
                if (container) container.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
                _giftImageData[type] = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        /**
         * Genera todas las template keys de TEMPLATE_MAP
         */
        function _getAllTemplateKeys() {
            const keys = [];
            Object.values(TEMPLATE_MAP).forEach(cat => {
                cat.forEach(t => keys.push(t.key));
            });
            return keys;
        }

        // Botón Generar Link (Normal + Gift)
        async function handleCfGenerate() {
            const apiKey   = document.getElementById('cfApiKey').value.trim();
            const apiKeyB1 = (document.getElementById('cfApiKeyB1')?.value || '').trim();
            const apiKeyB2 = (document.getElementById('cfApiKeyB2')?.value || '').trim();
            const btn = document.getElementById('cfBtnGenerate');
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = '⏳ Procesando...';

            // Variables hoisted para que sean accesibles tras el if/else
            let selectedDuration = 0, selectedDevices = 0, selectedPlan = 'GIFT',
                selectedTemplates = [], selectedProMode = true;

            try {
                let userId;
                let userName;
                let userEmail;

                if (_cfMode === 'gift') {
                    // ── GIFT MODE: Crear usuario nuevo (wizard completo) ──
                    const nombreInput = document.getElementById('giftNombre').value.trim();
                    const nombreLimpio = _stripGiftProfessionalPrefix(nombreInput);
                    const sexo = _normalizeGiftSexo(document.getElementById('giftSexo')?.value);
                    const nombreFmt = _formatGiftProfessionalDisplay(nombreLimpio, sexo);
                    const nombre = nombreFmt.fullName;
                    const email = document.getElementById('giftEmail').value.trim();
                    const matricula = document.getElementById('giftMatricula').value.trim();
                    const telefono = document.getElementById('giftTelefono').value.trim();
                    const especialidad = document.getElementById('giftEspecialidad').value;

                    // Recoger TODOS los lugares de trabajo del accordion
                    const allWorkplaces = [];
                    document.querySelectorAll('#giftWorkplacesContainer .gw-wp-accordion').forEach(acc => {
                        const idx = acc.dataset.wpIndex;
                        allWorkplaces.push({
                            name:    (document.getElementById('gwWpName' + idx) || {}).value?.trim() || '',
                            address: (document.getElementById('gwWpAddress' + idx) || {}).value?.trim() || '',
                            phone:   (document.getElementById('gwWpPhone' + idx) || {}).value?.trim() || '',
                            email:   (document.getElementById('gwWpEmail' + idx) || {}).value?.trim() || '',
                            footer:  (document.getElementById('gwWpFooter' + idx) || {}).value?.trim() || '',
                            logo:    _giftWpLogoData[idx] || null
                        });
                    });

                    // Apariencia PDF
                    const headerColor = _giftSelectedColor || '#1a56a0';

                    // Firma y Logo profesional
                    const firma = _giftImageData.firma || null;
                    const proLogo = _giftImageData.proLogo || null;

                    // Redes sociales y visibilidad de contacto
                    const socialMedia = {
                        facebook:  document.getElementById('giftSocialFb')?.value?.trim() || '',
                        instagram: document.getElementById('giftSocialIg')?.value?.trim() || '',
                        youtube:   document.getElementById('giftSocialYt')?.value?.trim() || '',
                        x:         document.getElementById('giftSocialX')?.value?.trim()  || '',
                        whatsapp:  document.getElementById('giftSocialWa')?.value?.trim() || ''
                    };
                    const showPhone  = document.getElementById('giftShowPhone')?.checked  ?? true;
                    const showEmail  = document.getElementById('giftShowEmail')?.checked  ?? true;
                    const showSocial = document.getElementById('giftShowSocial')?.checked ?? false;

                    if (!nombreLimpio) {
                        dashAlert('Ingresá el nombre del usuario', '⚠️');
                        btn.disabled = false;
                        btn.textContent = originalText;
                        giftGoStep(1);
                        return;
                    }
                    if (!email) {
                        dashAlert('Ingresá el email del usuario', '⚠️');
                        btn.disabled = false;
                        btn.textContent = originalText;
                        giftGoStep(1);
                        return;
                    }

                    // Generar ID
                    const newId = 'GIFT' + Date.now().toString(36).toUpperCase();
                    selectedTemplates = _getSelectedGiftTemplates();
                    const allTemplatesJson = JSON.stringify(selectedTemplates);
                    const now = new Date().toISOString();

                    // Leer opciones de licencia del paso 4
                    selectedPlan     = document.getElementById('giftPlan').value || 'GIFT';
                    selectedDevices  = parseInt(document.getElementById('giftDevices').value) || 10;
                    selectedDuration = parseInt(document.getElementById('giftDuration').value);
                    selectedProMode  = document.getElementById('giftProMode').value === 'true';

                    // Calcular fecha vencimiento según duración elegida
                    let fechaVenc = '';
                    if (selectedDuration > 0) {
                        const venc = new Date();
                        venc.setDate(venc.getDate() + selectedDuration);
                        fechaVenc = venc.toISOString().split('T')[0];
                    }

                    // Datos enriquecidos (workplaces + apariencia + firma + logo) → se precargan en la app
                    // CLINIC: recoger profesionales del equipo (C3)
                    const clinicProfessionals = (selectedPlan === 'CLINIC') ? _collectGiftProfessionals() : undefined;

                    const registroDatos = {
                        workplace: allWorkplaces[0] || {},
                        extraWorkplaces: allWorkplaces.slice(1),
                        sexo: sexo,
                        headerColor: headerColor,
                        footerText: allWorkplaces[0]?.footer || '',
                        firma: firma,
                        proLogo: proLogo,
                        proLogoSize: _giftImageData.proLogoSize || 60,
                        firmaSize: _giftImageData.firmaSize || 60,
                        instLogoSize: _giftImageData.instLogoSize || 60,
                        apiKey: apiKey,
                        apiKeyB1: apiKeyB1,
                        apiKeyB2: apiKeyB2,
                        hasProMode: selectedProMode,
                        socialMedia,
                        showPhone,
                        showEmail,
                        showSocial,
                        ...(clinicProfessionals ? { profesionales: clinicProfessionals } : {})
                    };

                    const userData = {
                        ID_Medico: newId,
                        Nombre: nombre,
                        Sexo: sexo,
                        Email: email,
                        Matricula: matricula,
                        Telefono: telefono,
                        Especialidad: especialidad || 'ALL',
                        Plan: selectedPlan,
                        Estado: 'active',
                        Fecha_Registro: now,
                        Fecha_Vencimiento: fechaVenc,
                        API_Key: apiKey,
                        API_Key_B1: apiKeyB1,
                        API_Key_B2: apiKeyB2,
                        Devices_Max: selectedDevices,
                        Allowed_Templates: allTemplatesJson,
                        Usage_Count: 0,
                        Devices_Logged: '[]',
                        Diagnostico_Pendiente: 'false',
                        Registro_Datos: JSON.stringify(registroDatos),
                        Notas_Admin: selectedPlan === 'CLINIC'
                            ? '🏥 Usuario Clínica — creado desde Fábrica de Clones'
                            : '🎁 Usuario regalo — creado desde Fábrica de Clones'
                    };

                    // Mostrar barra de progreso
                    _showGiftProgress('Conectando con el servidor...', 20);

                    // Crear usuario en el backend via POST (soporta payloads grandes con imágenes)
                    const session = JSON.parse(sessionStorage.getItem('adminSession') || '{}');
                    const postPayload = {
                        action: 'admin_create_user',
                        sessionToken:  session.sessionToken  || '',
                        sessionUser:   session.username      || '',
                        sessionNivel:  session.nivel         || '',
                        sessionExpiry: session.tokenExpiry   || '',
                        userData: userData
                    };

                    _showGiftProgress('Enviando datos del usuario...', 45);

                    const resp = await fetch(CONFIG.scriptUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify(postPayload)
                    });

                    _showGiftProgress('Procesando respuesta...', 75);
                    const result = await resp.json();

                    if (result.error) throw new Error(result.error);

                    _showGiftProgress('¡Usuario creado! Generando link...', 100);

                    userId = newId;
                    userName = nombre;
                    userEmail = email;

                    // Agregar a la lista local
                    allUsers.push(userData);
                    updateStats(allUsers);
                    applyFilters();

                    // Log
                    const logUrl = `${CONFIG.scriptUrl}?action=admin_log_action&${_getSessionAuthParams()}&adminUser=${encodeURIComponent('admin')}&logAction=create_gift_user&userId=${encodeURIComponent(newId)}&details=${encodeURIComponent('GIFT: ' + nombre + ' - ' + email)}`;
                    fetch(logUrl).catch(() => {});

                } else {
                    // ── NORMAL MODE: usuario existente ──
                    if (!_cfCurrentUser) return;
                    userId = _cfCurrentUser.ID_Medico;
                    userName = _cfCurrentUser.Nombre || 'Doctor';
                    userEmail = _cfCurrentUser.Email || '';

                    // API Key ya fue guardada en la aprobación — no se re-escribe desde aquí

                    // Log
                    const logUrl = `${CONFIG.scriptUrl}?action=admin_log_action&${_getSessionAuthParams()}&adminUser=${encodeURIComponent('admin')}&logAction=generate_link&userId=${encodeURIComponent(userId)}&details=${encodeURIComponent('Link generado')}`;
                    fetch(logUrl).catch(() => {});
                }

                // ── Generar el link (común a ambos modos) ──
                const link = `${CF_APP_BASE_URL}?id=${encodeURIComponent(userId)}`;

                // Mostrar resultado
                document.getElementById('cfLinkUrl').value = link;
                document.getElementById('cfLinkResult').style.display = 'block';

                // Aviso si no hay API Key
                document.getElementById('cfApiKeyNotice').style.display = apiKey ? 'none' : 'block';

                // Guardar datos para WhatsApp/Email
                _cfCurrentUser = { ID_Medico: userId, Nombre: userName, Email: userEmail };

                if (_cfMode === 'gift') {
                    const durMap = { '7': '7 días', '15': '15 días', '30': '1 mes', '90': '3 meses', '180': '6 meses', '365': '1 año', '0': 'Sin vencimiento' };
                    const durLabel = durMap[String(selectedDuration)] || selectedDuration + ' días';
                    const devLabel = selectedDevices >= 999 ? 'Ilimitados' : selectedDevices;
                    const tplLabel = selectedTemplates.length >= _getAllTemplateKeys().length ? 'Todas las plantillas' : selectedTemplates.length + ' plantillas';
                    dashAlert(`✅ Usuario <strong>${userName}</strong> creado exitosamente\n\nID: ${userId}\nPlan: ${selectedPlan} · ${tplLabel} · ${devLabel} dispositivos · ${durLabel}`, '🎁');
                }

            } catch (err) {
                _hideGiftProgress();
                dashAlert('Error: ' + err.message, '❌');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                // Ocultar progress después de un momento
                setTimeout(() => _hideGiftProgress(), 1500);
            }
        }

        // ── Barra de progreso del Gift ──────────────────────────────
        function _showGiftProgress(text, percent) {
            let bar = document.getElementById('giftProgressBar');
            if (!bar) return;
            bar.style.display = 'block';
            const fill = bar.querySelector('.gw-progress-fill');
            const label = bar.querySelector('.gw-progress-label');
            if (fill) { fill.style.width = percent + '%'; }
            if (label) { label.textContent = text; }
        }
        function _hideGiftProgress() {
            const bar = document.getElementById('giftProgressBar');
            if (bar) bar.style.display = 'none';
        }

        // Botón Copiar Link
        function handleCfCopyLink() {
            const url = document.getElementById('cfLinkUrl').value;
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('cfBtnCopyLink');
                btn.textContent = '✅';
                setTimeout(() => btn.textContent = '📋', 2000);
            }).catch(() => {
                // Fallback
                document.getElementById('cfLinkUrl').select();
                document.execCommand('copy');
            });
        }

        // Botón WhatsApp
        function handleCfWhatsApp() {
            const url = document.getElementById('cfLinkUrl').value;
            const name = _cfCurrentUser?.Nombre || 'Doctor';
            const text = `Hola ${name}, tu app Transcriptor Médico Pro está lista.\n\nAbrí este link en tu celular o computadora para configurarla:\n${url}\n\nTe va a pedir instalar la app — aceptá para tenerla siempre a mano.`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }

        // Botón Email — usa el modal de email propio de la app (NO abre Gmail ni Outlook)
        function handleCfEmail() {
            if (!_cfCurrentUser) return;
            const url   = document.getElementById('cfLinkUrl').value;
            const name  = _cfCurrentUser.Nombre || 'Doctor';
            const email = _cfCurrentUser.Email  || '';
            if (!email) {
                dashAlert('Este usuario no tiene email configurado.', '⚠️');
                return;
            }
            // Reutilizar el modal de email directo con contenido pre-llenado
            _deCurrentUser = _cfCurrentUser;
            document.getElementById('deUserName').textContent  = name;
            document.getElementById('deUserEmail').textContent = email;
            document.getElementById('deSubject').value = 'Tu app Transcriptor Médico Pro está lista';
            document.getElementById('deBody').value    = `Hola ${name},\n\nTu app de transcripción médica está lista para usar.\n\nHacé clic en el siguiente link para configurarla:\n${url}\n\nEl navegador te va a ofrecer instalarla como aplicación — aceptá para tenerla siempre accesible.\n\nSi tenés alguna duda, respondé este correo.\n\nSaludos`;
            document.getElementById('deResult').style.display  = 'none';
            document.getElementById('deBtnSend').disabled      = false;
            document.getElementById('deBtnSend').textContent   = '📨 Enviar';
            document.getElementById('directEmailModal').style.display = 'flex';
        }

        // ========== FIN FÁBRICA DE CLONES ==========

        // ========== EMAIL DIRECTO DESDE DASHBOARD ==========
        let _deCurrentUser = null;

        function openDirectEmail(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;
            if (!user.Email) {
                showToast('Este usuario no tiene email configurado', 'error');
                return;
            }
            _deCurrentUser = user;

            document.getElementById('deUserName').textContent = user.Nombre || '—';
            document.getElementById('deUserEmail').textContent = user.Email;
            document.getElementById('deSubject').value = 'Mensaje de Transcriptor Médico Pro';
            document.getElementById('deBody').value = `Hola ${user.Nombre || ''},\n\n`;
            document.getElementById('deResult').style.display = 'none';
            document.getElementById('deBtnSend').disabled = false;
            document.getElementById('deBtnSend').textContent = '📨 Enviar';

            document.getElementById('directEmailModal').style.display = 'flex';
            // Focus en el textarea
            setTimeout(() => document.getElementById('deBody').focus(), 200);
        }

        function closeDirectEmail() {
            document.getElementById('directEmailModal').style.display = 'none';
            _deCurrentUser = null;
        }

        document.getElementById('btnCloseDirectEmail')?.addEventListener('click', closeDirectEmail);

        document.getElementById('deBtnSend')?.addEventListener('click', async () => {
            if (!_deCurrentUser) return;

            const to = _deCurrentUser.Email;
            const subject = document.getElementById('deSubject').value.trim();
            const bodyText = document.getElementById('deBody').value.trim();
            const resultDiv = document.getElementById('deResult');
            const btn = document.getElementById('deBtnSend');

            if (!bodyText) {
                resultDiv.style.display = 'block';
                resultDiv.style.background = '#fef9c3';
                resultDiv.style.border = '1px solid #fde68a';
                resultDiv.style.color = '#78350f';
                resultDiv.textContent = '⚠️ Escribí un mensaje antes de enviar.';
                return;
            }

            btn.disabled = true;
            btn.textContent = '⏳ Enviando...';
            resultDiv.style.display = 'none';

            // Convertir saltos de línea a HTML
            const htmlBody = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0f766e;color:white;padding:16px 20px;border-radius:10px 10px 0 0;">
                        <h2 style="margin:0;font-size:1.1rem;">Transcriptor Médico Pro</h2>
                    </div>
                    <div style="padding:20px;background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
                        ${bodyText.split('\n').map(l => l.trim() === '' ? '<br>' : `<p style="margin:0 0 8px;line-height:1.5;color:#1e293b;">${l}</p>`).join('')}
                    </div>
                    <p style="font-size:.75rem;color:#94a3b8;text-align:center;margin-top:12px;">
                        Enviado desde el Admin Dashboard — Transcriptor Médico Pro
                    </p>
                </div>`;

            try {
                const response = await fetch(CONFIG.scriptUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'send_email',
                        to: to,
                        subject: subject || 'Transcriptor Médico Pro',
                        htmlBody: htmlBody,
                        senderName: 'Transcriptor Pro | Soporte'
                    })
                });
                const data = await response.json();

                if (data.success) {
                    resultDiv.style.display = 'block';
                    resultDiv.style.background = '#f0fdf4';
                    resultDiv.style.border = '1px solid #bbf7d0';
                    resultDiv.style.color = '#166534';
                    resultDiv.textContent = `✅ Email enviado correctamente a ${to}`;
                    btn.textContent = '✅ Enviado';

                    // Log de la acción
                    try {
                        const logUrl = `${CONFIG.scriptUrl}?action=admin_log_action&${_getSessionAuthParams()}&adminUser=${encodeURIComponent('admin')}&logAction=send_email&userId=${encodeURIComponent(_deCurrentUser.ID_Medico)}&details=${encodeURIComponent('Email directo: ' + subject)}`;
                        fetch(logUrl).catch(() => {});
                    } catch(e) {}

                    showToast('📧 Email enviado a ' + _deCurrentUser.Nombre, 'success');
                } else {
                    throw new Error(data.error || 'Error desconocido');
                }
            } catch (err) {
                resultDiv.style.display = 'block';
                resultDiv.style.background = '#fef2f2';
                resultDiv.style.border = '1px solid #fecaca';
                resultDiv.style.color = '#991b1b';
                resultDiv.textContent = '❌ Error: ' + err.message;
                btn.disabled = false;
                btn.textContent = '📨 Reintentar';
            }
        });

        // ========== FIN EMAIL DIRECTO ==========

        // Abrir modal
        document.getElementById('btnNewUser')?.addEventListener('click', () => {
            openNewUserChooser();
        });

        function openNewUserChooser() {
            // Poblar el select con registros pendientes
            const select = document.getElementById('chooserPendingSelect');
            const pendingSection = document.getElementById('chooserPendingSection');
            const loadBtn = document.getElementById('btnChooserLoadPending');

            // Ocultar sección pendientes (vuelve al estado inicial)
            pendingSection.style.display = 'none';
            if (loadBtn) loadBtn.disabled = true;

            // Actualizar opciones del select
            select.innerHTML = '<option value="">— Seleccioná un registro —</option>';
            const pendientes = (allRegistrations || []).filter(r => ['pendiente', 'pendiente_pago', 'comprobante_recibido', 'pago_confirmado'].includes(String(r.Estado || '').toLowerCase()));
            pendientes.forEach(r => {
                const fecha = r.Fecha_Registro ? new Date(r.Fecha_Registro).toLocaleDateString('es-AR', { day:'2-digit', month:'short' }) : '—';
                const opt = document.createElement('option');
                opt.value = r.ID_Registro;
                opt.textContent = `${escapeHtml(r.Nombre || '(sin nombre)')} · ${escapeHtml(r.Plan_Solicitado || '?')} · ${fecha}`;
                select.appendChild(opt);
            });

            // Botón A: desde cero
            document.getElementById('btnChooserFromScratch').onclick = () => {
                document.getElementById('newUserChooserModal').style.display = 'none';
                _openNewUserModalEmpty();
            };

            // Botón B: mostrar selector de pendientes
            document.getElementById('btnChooserFromPending').onclick = () => {
                if (pendientes.length === 0) {
                    pendingSection.style.display = 'block';
                    select.innerHTML = '<option value="">Sin registros pendientes</option>';
                    if (loadBtn) loadBtn.disabled = true;
                } else {
                    pendingSection.style.display = 'block';
                }
            };

            // Habilitar botón Cargar cuando hay selección
            select.onchange = () => {
                if (loadBtn) loadBtn.disabled = !select.value;
            };

            // Botón Cargar
            if (loadBtn) {
                loadBtn.onclick = () => {
                    const regId = select.value;
                    if (!regId) return;
                    document.getElementById('newUserChooserModal').style.display = 'none';
                    _openNewUserModalFromPending(regId);
                };
            }

            document.getElementById('newUserChooserModal').style.display = 'flex';
        }

        function _openNewUserModalEmpty() {
            document.getElementById('newUserModal').style.display = 'flex';
            initEspecialidadesGrid();
            setDefaultExpirationDate();
        }

        function _openNewUserModalFromPending(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return _openNewUserModalEmpty();

            document.getElementById('newUserModal').style.display = 'flex';
            initEspecialidadesGrid();
            setDefaultExpirationDate();

            // Prefill campos del profesional
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('newNombre',    reg.Nombre);
            setVal('newMatricula', reg.Matricula);
            setVal('newEmail',     reg.Email);
            setVal('newTelefono',  reg.Telefono);

            // Plan
            const planSol = (reg.Plan_Solicitado || _parsePlanFromNotas(reg.Notas || '')).toUpperCase();
            if (planSol) setVal('newPlan', planSol);

            // Lugar de trabajo principal
            try {
                const wp = JSON.parse(reg.Workplace_Data || '{}');
                if (wp.name) setVal('newLugaresTrabajo', wp.name + (wp.address ? '\n' + wp.address : ''));
            } catch(_) {}

            // Notas: adjuntar referencia al reg ID
            const notasEl = document.getElementById('newNotas');
            if (notasEl) notasEl.value = `Cargado desde registro pendiente ${reg.ID_Registro}. ${reg.Notas || ''}`.trim();

            // Marcar el campo de nombre con indicador visual
            const nombreEl = document.getElementById('newNombre');
            if (nombreEl) {
                nombreEl.style.borderColor = 'var(--primary)';
                setTimeout(() => { nombreEl.style.borderColor = ''; }, 3000);
            }

            // Mostrar toast informativo
            if (typeof showToast === 'function') {
                showToast(`📋 Formulario precargado desde registro ${reg.ID_Registro}`, 'info');
            }
        }

        function closeNewUserModal() {
            document.getElementById('newUserModal').style.display = 'none';
            document.getElementById('newUserForm').reset();
            clearImagePreviews();
            document.getElementById('estudiosGrid').innerHTML = '<p style="color:var(--text-secondary);font-style:italic;">Seleccione al menos una especialidad</p>';
        }

        // Generar grid de especialidades
        function initEspecialidadesGrid() {
            const grid = document.getElementById('especialidadesGrid');
            grid.innerHTML = ESPECIALIDADES.map(esp => `
                <div class="checkbox-item">
                    <input type="checkbox" id="esp_${esp.replace(/\s+/g, '_')}" value="${esp}">
                    <label for="esp_${esp.replace(/\s+/g, '_')}">${esp}</label>
                </div>
            `).join('');

            // Add change listeners
            grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', updateEstudiosGrid);
            });
        }

        // Actualizar estudios según especialidades seleccionadas
        function updateEstudiosGrid() {
            const selectedEspecialidades = Array.from(
                document.querySelectorAll('#especialidadesGrid input:checked')
            ).map(cb => cb.value);

            const estudiosGrid = document.getElementById('estudiosGrid');

            if (selectedEspecialidades.length === 0) {
                estudiosGrid.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;">Seleccione al menos una especialidad</p>';
                return;
            }

            const estudios = selectedEspecialidades.flatMap(esp =>
                (ESTUDIOS_POR_ESPECIALIDAD[esp] || []).map(estudio => ({ esp, estudio }))
            );

            estudiosGrid.innerHTML = estudios.map(({ esp, estudio }) => `
                <div class="checkbox-item">
                    <input type="checkbox" id="est_${estudio.replace(/\s+/g, '_')}" value="${estudio}" data-especialidad="${esp}">
                    <label for="est_${estudio.replace(/\s+/g, '_')}">${estudio} <small style="color:var(--text-secondary);">(${esp})</small></label>
                </div>
            `).join('');
        }

        // Fecha de vencimiento por defecto
        function setDefaultExpirationDate() {
            const planSelect = document.getElementById('newPlan');
            const fechaInput = document.getElementById('newFechaVencimiento');
            const estadoSelect = document.getElementById('newEstado');

            const updateExpiration = () => {
                const plan = planSelect.value;
                const today = new Date();
                let expirationDate;

                if (plan === 'trial') {
                    expirationDate = new Date(today.getTime());
                    expirationDate.setDate(expirationDate.getDate() + 7);
                    estadoSelect.value = 'trial';
                } else if (plan === 'pro') {
                    expirationDate = new Date(today.getTime());
                    expirationDate.setMonth(expirationDate.getMonth() + 1);
                    estadoSelect.value = 'active';
                } else if (plan === 'enterprise') {
                    expirationDate = new Date(today.getTime());
                    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
                    estadoSelect.value = 'active';
                }

                const yyyy = expirationDate.getFullYear();
                const mm = String(expirationDate.getMonth() + 1).padStart(2, '0');
                const dd = String(expirationDate.getDate()).padStart(2, '0');
                fechaInput.value = `${yyyy}-${mm}-${dd}`;
            };

            planSelect.addEventListener('change', updateExpiration);
            updateExpiration(); // Set initial date
        }

        // Preview de imágenes
        document.getElementById('newLogoMedico')?.addEventListener('change', (e) => previewImage(e, 'previewLogoMedico'));
        document.getElementById('newFirma')?.addEventListener('change', (e) => previewImage(e, 'previewFirma'));
        document.getElementById('newLogosInstituciones')?.addEventListener('change', (e) => previewMultipleImages(e, 'previewLogosInst'));

        function previewImage(event, previewId) {
            const file = event.target.files[0];
            const preview = document.getElementById(previewId);
            preview.innerHTML = '';

            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }

        function previewMultipleImages(event, previewId) {
            const files = event.target.files;
            const preview = document.getElementById(previewId);
            preview.innerHTML = '';

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        }

        function clearImagePreviews() {
            document.getElementById('previewLogoMedico').innerHTML = '';
            document.getElementById('previewFirma').innerHTML = '';
            document.getElementById('previewLogosInst').innerHTML = '';
        }

        // Submit del formulario
        document.getElementById('newUserForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedEspecialidades = Array.from(
                document.querySelectorAll('#especialidadesGrid input:checked')
            ).map(cb => cb.value);

            const selectedEstudios = Array.from(
                document.querySelectorAll('#estudiosGrid input:checked')
            ).map(cb => ({ nombre: cb.value, especialidad: cb.dataset.especialidad }));

            if (selectedEspecialidades.length === 0) {
                showToast('Debe seleccionar al menos una especialidad', 'error');
                return;
            }

            // Generar ID único
            const newUserId = await generateUserId();

            const userData = {
                ID_Medico: newUserId,
                Nombre: document.getElementById('newNombre').value,
                Matricula: document.getElementById('newMatricula').value,
                Email: document.getElementById('newEmail').value,
                Telefono: document.getElementById('newTelefono').value || '',
                Especialidad: selectedEspecialidades.join(', '),
                Plan: document.getElementById('newPlan').value,
                Estado: document.getElementById('newEstado').value,
                Fecha_Registro: new Date().toISOString().split('T')[0],
                Fecha_Vencimiento: document.getElementById('newFechaVencimiento').value,
                Devices_Max: parseInt(document.getElementById('newDevicesMax').value),
                Devices_Logged: '[]',
                Usage_Count: 0,
                Notas_Admin: document.getElementById('newNotas').value || '',
                Lugares_Trabajo: document.getElementById('newLugaresTrabajo').value || '',
                Estudios_JSON: JSON.stringify(selectedEstudios)
            };

            const btnSave = document.getElementById('btnSaveNewUser');
            const originalText = btnSave.textContent;
            btnSave.disabled = true;
            btnSave.textContent = '⏳ Creando...';

            try {
                // Crear usuario en Google Sheets
                const result = await API.createUser(userData);

                if (!result.success) {
                    throw new Error(result.error || 'Error al crear usuario');
                }

                showToast('✅ Usuario creado exitosamente', 'success');
                closeNewUserModal();
                loadDashboard(true); // Recargar tabla
            } catch (error) {
                console.error('Error creating user:', error);
                showToast('Error al crear usuario: ' + error.message, 'error');
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = originalText;
            }
        });

        // Generar ID único
        async function generateUserId() {
            try {
                const users = await API.getUsers();
                const existingIds = users.users.map(u => u.ID_Medico);
                let newId;
                let counter = 1;

                do {
                    newId = `DR${String(counter).padStart(3, '0')}`;
                    counter++;
                } while (existingIds.includes(newId));

                return newId;
            } catch (error) {
                console.error('Error generating user ID:', error);
                // Fallback: generar ID basado en timestamp + random
                const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                return `DR${Date.now().toString().slice(-4)}${rand}`;
            }
        }

        // Agregar método al API object
        if (typeof API !== 'undefined') {
            API.createUser = async function(userData) {
                const updatesJson = encodeURIComponent(JSON.stringify(userData));
                return await this.call(`?action=admin_create_user&updates=${updatesJson}`);
            };
        }

        /* ── Form Validation ─────────────────────────────────────────────────── */
        function validateUserForm(formData) {
            const errors = [];
            if (!formData.nombre || formData.nombre.trim().length < 2) {
                errors.push({ field: 'nombre', message: 'El nombre debe tener al menos 2 caracteres' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!formData.email || !emailRegex.test(formData.email)) {
                errors.push({ field: 'email', message: 'Email inválido' });
            }
            if (!formData.tipo || !['admin', 'doctor'].includes(formData.tipo)) {
                errors.push({ field: 'tipo', message: 'Debe seleccionar un tipo de usuario válido' });
            }
            return errors;
        }

        function showFormErrors(errors) {
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            errors.forEach(error => {
                const field = document.getElementById(error.field);
                if (field) {
                    field.classList.add('is-invalid');
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    feedback.textContent = error.message;
                    field.parentNode.appendChild(feedback);
                }
            });
            if (errors.length > 0) {
                const firstErrorField = document.getElementById(errors[0].field);
                if (firstErrorField) firstErrorField.focus();
            }
        }

        function setButtonLoading(button, loading) {
            if (loading) {
                button.disabled = true;
                button.classList.add('btn-loading');
                button.dataset.originalText = button.textContent;
            } else {
                button.disabled = false;
                button.classList.remove('btn-loading');
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                }
            }
        }

        function showTableSkeleton() {
            const tbody = document.getElementById('tableBody');
            if (!tbody) return;
            tbody.innerHTML = Array(5).fill(null).map(() => `
                <tr class="skeleton-row">
                    <td><div class="skeleton-text" style="width:60%"></div></td>
                    <td><div class="skeleton-text" style="width:80%"></div></td>
                    <td><div class="skeleton-text" style="width:40%"></div></td>
                    <td><div class="skeleton-text" style="width:50%"></div></td>
                    <td><div class="skeleton-text" style="width:70%"></div></td>
                    <td><div class="skeleton-text" style="width:30%"></div></td>
                </tr>`).join('');
        }

        /* ── Dark Mode button ────────────────────────────────────────── */
        const SUN_PATH = 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z';
        const MOON_PATH = 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z';

        function updateDarkModeIcon() {
            const icon = document.getElementById('darkModeIcon');
            if (!icon) return;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            icon.innerHTML = `<path d="${isDark ? SUN_PATH : MOON_PATH}"/>`;
        }

        // Load saved theme on page load
        (function() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            if (savedTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            updateDarkModeIcon();
        })();

        document.getElementById('btnDarkMode')?.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateDarkModeIcon();
        });

        // ======== REGISTROS PENDIENTES ========

        function _ensureRegFilterOptions() {
            const sel = document.getElementById('regFilterEstado');
            if (!sel) return;
            if (
                sel.querySelector('option[value="pendiente_pago"]') &&
                sel.querySelector('option[value="comprobante_recibido"]') &&
                sel.querySelector('option[value="pago_confirmado"]')
            ) return;
            const cur = sel.value || 'pendiente';
            sel.innerHTML = [
                '<option value="pendiente">⏳ Pendientes (todos)</option>',
                '<option value="pendiente_pago">⏳ Pendiente de pago</option>',
                '<option value="comprobante_recibido">📨 Comprobante recibido</option>',
                '<option value="pago_confirmado">💳 Pago confirmado</option>',
                '<option value="aprobado">✅ Aprobados</option>',
                '<option value="rechazado">❌ Rechazados</option>',
                '<option value="">Todos</option>'
            ].join('');
            sel.value = cur;
        }

        async function loadRegistrations() {
            _ensureRegFilterOptions();
            const container = document.getElementById('registrosCards');
            const emptyState = document.getElementById('registrosEmpty');
            const filterEstado = document.getElementById('regFilterEstado')?.value || 'pendiente';

            // Set registration link
            const regLink = window.location.origin + window.location.pathname.replace('admin.html', 'registro.html');
            const regLinkEl = document.getElementById('regLinkDisplay');
            if (regLinkEl) regLinkEl.textContent = regLink;

            const _renderRegs = (registrations) => {
                allRegistrations = registrations;
                let filtered = registrations;
                if (filterEstado) {
                    const fe = filterEstado.toLowerCase();
                    if (fe === 'pendiente') {
                        filtered = registrations.filter(r => ['pendiente', 'pendiente_pago', 'comprobante_recibido', 'pago_confirmado'].includes(String(r.Estado || '').toLowerCase()));
                    } else {
                        filtered = registrations.filter(r => String(r.Estado || '').toLowerCase() === fe);
                    }
                }
                const pendientes = registrations.filter(r => ['pendiente', 'pendiente_pago', 'comprobante_recibido', 'pago_confirmado'].includes(String(r.Estado || '').toLowerCase()));
                const badge = document.getElementById('regBadge');
                if (badge) {
                    badge.textContent = pendientes.length;
                    badge.style.display = pendientes.length > 0 ? 'inline' : 'none';
                }
                if (filtered.length === 0) {
                    container.innerHTML = '';
                    emptyState.style.display = 'block';
                } else {
                    emptyState.style.display = 'none';
                    container.innerHTML = filtered.map(reg => renderRegCard(reg)).join('');
                }
            };

            const cacheKey = '_adminRegCache';
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try { _renderRegs(JSON.parse(cached)); } catch(_) {}
            } else {
                container.innerHTML = '<p style="text-align:center;padding:2rem;color:#64748b;">⏳ Cargando registros...</p>';
                emptyState.style.display = 'none';
            }
            try {
                const res = await fetch(`${CONFIG.scriptUrl}?action=admin_list_registrations&${_getSessionAuthParams()}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                const registrations = data.registrations || [];
                sessionStorage.setItem(cacheKey, JSON.stringify(registrations));
                _renderRegs(registrations);
            } catch (err) {
                if (!cached) container.innerHTML = `<p style="text-align:center;padding:2rem;color:#ef4444;">❌ ${escapeHtml(err.message)}</p>`;
            }
        }

        function _getRegPlanCode(reg) {
            const planSol = (reg && (reg.Plan_Solicitado || _parsePlanFromNotas(reg.Notas || '')) || '').toUpperCase();
            return planSol;
        }

        function _isClinicRegistration(reg) {
            return _getRegPlanCode(reg) === 'CLINIC';
        }

        function _isInvalidPhoneValue(v) {
            const s = String(v || '').trim();
            if (!s) return true;
            if (s === '—') return true;
            if (/^#(ERROR|N\/A|VALUE!)/i.test(s)) return true;
            if (/error/i.test(s) && /^#/.test(s)) return true;
            return false;
        }

        function _resolveRegPhone(reg) {
            const direct = String(reg && reg.Telefono || '').trim();
            if (!_isInvalidPhoneValue(direct)) return direct;
            try {
                const wp = JSON.parse(String(reg && reg.Workplace_Data || '{}'));
                const wpPhone = String(wp.phone || wp.telefono || '').trim();
                if (!_isInvalidPhoneValue(wpPhone)) return wpPhone;
            } catch (_) {}
            return '—';
        }

        function _parseClinicProfessionals(reg) {
            try {
                const raw = String(reg && reg.Profesionales || '').trim();
                if (!raw) return [];
                const list = JSON.parse(raw);
                if (!Array.isArray(list)) return [];
                return list.filter(Boolean);
            } catch (_) {
                return [];
            }
        }

        function renderRegCard(reg) {
            const estado = String(reg.Estado || 'pendiente_pago').toLowerCase();
            const badgeClass = estado === 'aprobado'
                ? 'reg-badge-aprobado'
                : estado === 'rechazado'
                    ? 'reg-badge-rechazado'
                    : 'reg-badge-pendiente';
            const estadoLabel = estado === 'aprobado'
                ? '✅ Aprobado'
                : estado === 'rechazado'
                    ? '❌ Rechazado'
                    : estado === 'comprobante_recibido'
                        ? '📨 Comprobante recibido'
                    : estado === 'pago_confirmado'
                        ? '💳 Pago confirmado'
                        : '⏳ Pendiente de pago';

            const fecha = reg.Fecha_Registro ? new Date(reg.Fecha_Registro).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

            let especialidades = '';
            try {
                const esps = String(reg.Especialidades || '').split(',').map(s => s.trim()).filter(Boolean);
                especialidades = esps.map(e => `<span class="badge badge-specialty">${escapeHtml(e)}</span>`).join(' ');
            } catch(_) {}

            let workplace = '—';
            try {
                const wp = JSON.parse(reg.Workplace_Data || '{}');
                workplace = wp.name || '—';
            } catch(_) { workplace = '—'; }

            // Badge del plan solicitado
            const PLANES_VALIDOS = ['NORMAL','PRO','CLINIC','GIFT','TRIAL'];
            const planSol = _getRegPlanCode(reg);
            const isClinic = planSol === 'CLINIC';
            const planBadgeHtml = (planSol && PLANES_VALIDOS.includes(planSol))
                ? _renderPlanBadgeMini(planSol)
                : '';
            const phone = _resolveRegPhone(reg);
            const idLabel = isClinic ? '🏢 CUIT / Habilitación' : '🪪 Matrícula';
            const idValue = isClinic ? (reg.Matricula || '—') : (reg.Matricula || '—');

            const isPendientePago = estado === 'pendiente' || estado === 'pendiente_pago' || estado === 'comprobante_recibido';
            const isPagoConfirmado = estado === 'pago_confirmado';
            const hasReceipt = !!((reg.Last_Receipt_Ref && String(reg.Last_Receipt_Ref).startsWith('drive:')) || _extractLastReceiptRef(reg));
            const confirmAndApproveLabel = hasReceipt
                ? '💳✅ Confirmar pago y aprobar'
                : '💳 Marcar pagado';
            const actionsHtml = (isPendientePago || isPagoConfirmado) ? `
                <button class="btn-view-details" onclick="viewRegDetail('${reg.ID_Registro}')">📋 Detalle</button>
                ${hasReceipt ? `<button class="btn-secondary" style="padding:8px 10px;" onclick="viewRegReceipt('${reg.ID_Registro}')">🧾 Ver comprobante</button>` : ''}
                <button class="btn-reject" onclick="rejectRegistration('${reg.ID_Registro}')">❌ Rechazar</button>
                ${isPendientePago
                    ? `<button class="btn-secondary" style="padding:8px 10px;" onclick="markRegistrationPaid('${reg.ID_Registro}', ${hasReceipt ? 'true' : 'false'})">${confirmAndApproveLabel}</button>`
                    : `<button class="btn-approve" onclick="openApproveModal('${reg.ID_Registro}')">✅ Aprobar</button>`}
            ` : `
                <button class="btn-view-details" onclick="viewRegDetail('${reg.ID_Registro}')">📋 Detalle</button>
                ${hasReceipt ? `<button class="btn-secondary" style="padding:8px 10px;" onclick="viewRegReceipt('${reg.ID_Registro}')">🧾 Ver comprobante</button>` : ''}
                ${estado === 'aprobado' && reg.ID_Medico_Asignado ? `<span style="font-size:.8rem;color:#64748b;">ID: ${escapeHtml(reg.ID_Medico_Asignado)}</span>` : ''}
            `;

            return `
                <div class="reg-card">
                    <div class="reg-card-header">
                        <div>
                            <h3>${escapeHtml(reg.Nombre || 'Sin nombre')}</h3>
                            <span class="reg-date">${fecha}</span>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                            <span class="badge ${badgeClass}">${estadoLabel}</span>
                            ${planBadgeHtml}
                        </div>
                    </div>
                    <dl class="reg-card-info">
                        <dt>📧 Email</dt><dd>${escapeHtml(reg.Email || '—')}</dd>
                        <dt>${idLabel}</dt><dd>${escapeHtml(idValue)}</dd>
                        <dt>📞 Teléfono</dt><dd>${escapeHtml(phone)}</dd>
                        <dt>🏥 Lugar</dt><dd>${escapeHtml(workplace)}</dd>
                    </dl>
                    <div class="reg-card-specs">${especialidades || '<span style="color:#94a3b8;font-size:.82rem;">Sin especialidades</span>'}</div>
                    <div class="reg-card-actions">${actionsHtml}</div>
                </div>
            `;
        }

        function _extractLastReceiptRef(reg) {
            if (!reg) return '';
            try {
                const history = JSON.parse(reg.Payment_History || '[]');
                if (!Array.isArray(history) || history.length === 0) return '';
                for (let i = history.length - 1; i >= 0; i--) {
                    const ref = String(history[i] && history[i].receiptRef || '');
                    if (ref.startsWith('drive:')) return ref;
                }
                return '';
            } catch (_) {
                return '';
            }
        }

        async function viewRegReceipt(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return;

            const driveRef = (reg.Last_Receipt_Ref && String(reg.Last_Receipt_Ref).startsWith('drive:'))
                ? String(reg.Last_Receipt_Ref)
                : _extractLastReceiptRef(reg);
            if (!driveRef) {
                await dashAlert('Este registro no tiene comprobante cargado todavía.', 'ℹ️');
                return;
            }

            try {
                const url = `${CONFIG.scriptUrl}?action=admin_get_payment_receipt&driveRef=${encodeURIComponent(driveRef)}&${_getSessionAuthParams()}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                const mime = String(data.mimeType || '');
                let body = '';
                if (mime.startsWith('image/')) {
                    body = `<img src="${data.dataUrl}" alt="Comprobante" style="max-width:100%;max-height:68vh;display:block;margin:0 auto;border-radius:8px;border:1px solid #e2e8f0;">`;
                } else if (mime === 'application/pdf') {
                    body = `<iframe src="${data.dataUrl}" style="width:100%;height:68vh;border:1px solid #e2e8f0;border-radius:8px;background:#fff;"></iframe>`;
                } else {
                    body = `<p style="margin-bottom:.8rem;">Formato no previsualizable (${escapeHtml(mime || 'desconocido')}).</p><a href="${data.dataUrl}" download="${escapeHtml(data.name || 'comprobante')}" class="btn-primary" style="display:inline-block;padding:7px 12px;border-radius:8px;text-decoration:none;color:#fff;background:#2563eb;">⬇️ Descargar comprobante</a>`;
                }

                await dashAlert(
                    `<div style="text-align:left;">
                        <div style="font-size:.86rem;color:#64748b;margin-bottom:.5rem;"><b>${escapeHtml(reg.Nombre || reg.ID_Registro)}</b> · ${escapeHtml(reg.ID_Registro || '')}</div>
                        ${body}
                    </div>`,
                    '🧾'
                );
            } catch (err) {
                await dashAlert('No se pudo abrir el comprobante: ' + escapeHtml(err.message), '❌');
            }
        }

        function viewRegDetail(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return;
            const planCode = _getRegPlanCode(reg);
            const isClinic = planCode === 'CLINIC';
            const phoneSafe = _resolveRegPhone(reg);

            // ── Lugar principal ──
            let wpHtml = '';
            try {
                const wp = JSON.parse(reg.Workplace_Data || '{}');
                wpHtml = `
                    <dt>Nombre</dt><dd>${escapeHtml(wp.name || '—')}</dd>
                    <dt>Dirección</dt><dd>${escapeHtml(wp.address || '—')}</dd>
                    <dt>Teléfono</dt><dd>${escapeHtml(wp.phone || '—')}</dd>
                    <dt>Email</dt><dd>${escapeHtml(wp.email || '—')}</dd>
                    ${wp.footer ? `<dt>Pie de página</dt><dd>${escapeHtml(wp.footer)}</dd>` : ''}
                    <dt>Logo</dt><dd>${(wp.logo && wp.logo !== 'null') ? '✅ Sí' : '❌ No'}</dd>
                `;
            } catch(_) {}

            // ── Lugares adicionales (parsear JSON, no mostrar raw) ──
            let extraWpHtml = '';
            try {
                let extras = [];
                if (reg.Extra_Workplaces) {
                    extras = JSON.parse(reg.Extra_Workplaces);
                    if (!Array.isArray(extras)) extras = [];
                }
                if (extras.length > 0) {
                    extraWpHtml = extras.map((wp, i) => `
                        <div style="background:#f8fafc;border-radius:8px;padding:.6rem .8rem;margin-bottom:.4rem;border:1px solid #e2e8f0;">
                            <div style="font-weight:600;font-size:.85rem;margin-bottom:.3rem;">🏢 ${escapeHtml(wp.name || 'Lugar ' + (i + 2))}</div>
                            <dl class="reg-card-info" style="margin:0;">
                                ${wp.address ? `<dt>Dirección</dt><dd>${escapeHtml(wp.address)}</dd>` : ''}
                                ${wp.phone ? `<dt>Teléfono</dt><dd>${escapeHtml(wp.phone)}</dd>` : ''}
                                ${wp.email ? `<dt>Email</dt><dd>${escapeHtml(wp.email)}</dd>` : ''}
                                ${wp.footer ? `<dt>Pie de página</dt><dd>${escapeHtml(wp.footer)}</dd>` : ''}
                                <dt>Logo</dt><dd>${(wp.logo && wp.logo !== 'null' && !wp.logo.startsWith('data:')) ? '✅ Sí' : (wp.logo && wp.logo.startsWith('data:')) ? '✅ Sí' : '❌ No'}</dd>
                            </dl>
                        </div>
                    `).join('');
                }
            } catch(_) {}

            // ── Estudios agrupados por especialidad ──
            let estudiosHtml = '';
            try {
                const est = JSON.parse(reg.Estudios || '[]');
                if (est.length > 0) {
                    const grouped = {};
                    est.forEach(e => {
                        const esp = typeof e === 'string' ? 'General' : (e.especialidad || 'General');
                        const nombre = typeof e === 'string' ? e : (e.nombre || '');
                        if (!grouped[esp]) grouped[esp] = [];
                        if (nombre) grouped[esp].push(nombre);
                    });
                    estudiosHtml = Object.entries(grouped).map(([esp, estudios]) => `
                        <div style="margin-bottom:.6rem;">
                            <div style="font-weight:600;font-size:.8rem;color:#0f766e;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:4px;">${escapeHtml(esp)}</div>
                            <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                ${estudios.map(n => `<span class="badge badge-specialty">${escapeHtml(n)}</span>`).join('')}
                            </div>
                        </div>
                    `).join('');
                }
            } catch(_) {}

            // ── Especialidades como badges ──
            let especialidadesHtml = '';
            try {
                const esps = String(reg.Especialidades || '').split(',').map(s => s.trim()).filter(Boolean);
                especialidadesHtml = esps.map(e => `<span class="badge badge-specialty">${escapeHtml(e)}</span>`).join(' ');
            } catch(_) {}

            // ── Color: nombre legible ──
            const colorNames = {
                '#1a56a0': 'Azul', '#0f766e': 'Verde', '#db2777': 'Rosa',
                '#1e293b': 'Negro', '#b8860b': 'Dorado', '#708090': 'Plateado'
            };
            const hdrColor = reg.Header_Color || '#1a56a0';
            const colorName = colorNames[hdrColor] || hdrColor;

            // ── Firma / Logo check ──
            const hasFirma = reg.Firma && reg.Firma !== 'no' && reg.Firma !== 'null' && reg.Firma !== '';
            const hasProLogo = reg.Pro_Logo && reg.Pro_Logo !== 'no' && reg.Pro_Logo !== 'null' && reg.Pro_Logo !== '';

            // ── Profesionales de clínica ──
            const clinicPros = _parseClinicProfessionals(reg);
            const clinicProsHtml = clinicPros.length
                ? `<h4 style="font-size:.9rem;margin-top:1rem;">👨‍⚕️ Profesionales de la clínica (${clinicPros.length})</h4>
                   <div style="display:grid;gap:.45rem;margin-top:.45rem;">${clinicPros.map((p, idx) => {
                       const esp = Array.isArray(p.especialidades) ? p.especialidades.join(', ') : (p.especialidad || '—');
                       const pName = p.nombre || `Profesional ${idx + 1}`;
                       const pMat = p.matricula || '—';
                       const pUser = p.usuario || '—';
                       const pTel = !_isInvalidPhoneValue(p.telefono) ? p.telefono : '—';
                       const pEmail = p.email || '—';
                       const pFirma = p.firma ? '✅ Sí' : '❌ No';
                       const pLogo = p.logo ? '✅ Sí' : '❌ No';
                       return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.55rem .7rem;">
                                <div style="font-weight:700;font-size:.84rem;">${escapeHtml(pName)}</div>
                                <div style="font-size:.78rem;color:#64748b;margin-top:.15rem;">${escapeHtml(esp)}</div>
                                <div style="font-size:.77rem;margin-top:.25rem;display:flex;flex-wrap:wrap;gap:10px;">
                                    <span>🪪 ${escapeHtml(pMat)}</span>
                                    <span>👤 ${escapeHtml(pUser)}</span>
                                    <span>📞 ${escapeHtml(pTel)}</span>
                                    <span>📧 ${escapeHtml(pEmail)}</span>
                                    <span>✍️ ${pFirma}</span>
                                    <span>🩺 ${pLogo}</span>
                                </div>
                              </div>`;
                   }).join('')}</div>`
                : '';

            const identityHtml = isClinic
                ? `<dl class="reg-card-info" style="margin:1rem 0;">
                    <dt>🏥 Razón social / Nombre comercial</dt><dd>${escapeHtml(reg.Nombre || '—')}</dd>
                    <dt>📧 Email administrativo</dt><dd>${escapeHtml(reg.Email || '—')}</dd>
                    <dt>🏢 CUIT / Habilitación</dt><dd>${escapeHtml(reg.Matricula || '—')}</dd>
                    <dt>📞 Teléfono administrativo</dt><dd>${escapeHtml(phoneSafe)}</dd>
                    <dt>🎨 Color header</dt><dd><span style="display:inline-block;width:20px;height:14px;border-radius:3px;background:${escapeHtml(hdrColor)};vertical-align:middle;border:1px solid rgba(0,0,0,.15);"></span> ${escapeHtml(colorName)}</dd>
                    <dt>📝 Pie de página</dt><dd>${escapeHtml(reg.Footer_Text || '—')}</dd>
                    <dt>🏢 Firma institucional</dt><dd>No aplica</dd>
                  </dl>`
                : `<dl class="reg-card-info" style="margin:1rem 0;">
                    <dt>👤 Nombre</dt><dd>${escapeHtml(reg.Nombre || '—')}</dd>
                    <dt>📧 Email</dt><dd>${escapeHtml(reg.Email || '—')}</dd>
                    <dt>🪪 Matrícula</dt><dd>${escapeHtml(reg.Matricula || '—')}</dd>
                    <dt>📞 Teléfono</dt><dd>${escapeHtml(phoneSafe)}</dd>
                    <dt>🎨 Color header</dt><dd><span style="display:inline-block;width:20px;height:14px;border-radius:3px;background:${escapeHtml(hdrColor)};vertical-align:middle;border:1px solid rgba(0,0,0,.15);"></span> ${escapeHtml(colorName)}</dd>
                    <dt>📝 Pie de página</dt><dd>${escapeHtml(reg.Footer_Text || '—')}</dd>
                    <dt>✍️ Firma</dt><dd>${hasFirma ? '✅ Sí' : '❌ No'}</dd>
                    <dt>🩺 Logo profesional</dt><dd>${hasProLogo ? '✅ Sí' : '❌ No'}</dd>
                  </dl>`;

            const content = `
                ${identityHtml}

                ${clinicProsHtml}

                <h4 style="font-size:.9rem;margin-top:1rem;">🏥 Lugar de trabajo principal</h4>
                <dl class="reg-card-info" style="margin:.5rem 0;">${wpHtml}</dl>

                ${extraWpHtml ? `<h4 style="font-size:.9rem;margin-top:1rem;">🏢 Lugares adicionales</h4>${extraWpHtml}` : ''}

                <h4 style="font-size:.9rem;margin-top:1rem;">🩺 Especialidades</h4>
                <div style="margin:.5rem 0;display:flex;flex-wrap:wrap;gap:4px;">${especialidadesHtml || '<span style="color:#94a3b8;">—</span>'}</div>

                <h4 style="font-size:.9rem;margin-top:1rem;">📋 Estudios seleccionados</h4>
                <div style="margin:.5rem 0;">${estudiosHtml || '<span style="color:#94a3b8;">Ninguno seleccionado</span>'}</div>

                ${reg.Notas ? `<h4 style="font-size:.9rem;margin-top:1rem;">💬 Notas</h4><p style="font-size:.85rem;background:#fff7ed;padding:.6rem;border-radius:8px;border:1px solid #fed7aa;">${escapeHtml(reg.Notas)}</p>` : ''}

                ${_renderSocialSection(reg)}

                ${_renderFinancialSection(reg)}

                <p style="font-size:.73rem;color:#94a3b8;margin-top:1.2rem;border-top:1px solid #e2e8f0;padding-top:.5rem;">🆔 ${escapeHtml(reg.ID_Registro)} — Origen: ${escapeHtml(reg.Origen || '—')}</p>
            `;

            document.getElementById('detailModalContent').innerHTML = content;
            document.getElementById('detailModalOverlay').classList.add('show');
        }

        function closeDetailModal() {
            document.getElementById('detailModalOverlay').classList.remove('show');
        }

        // ── Estado interno del modal de aprobación (imágenes) ──
        let _approveImageData = { firma: null, proLogo: null, instLogo: null };
        let _approveImagePreview = { inst: null, prof: null, firma: null };
        let _approveImageSizes = { inst: 60, prof: 60, firma: 60 };
        let _apvFirmaEditor = null;
        let _apvProfEditor = null;
        let _approveActiveInstWp = 0;  // WP activo para preview

        function _renderSocialSection(reg) {
            let sm = {};
            try { sm = JSON.parse(reg.Social_Media || '{}'); } catch(_) {}
            const entries = Object.entries(sm).filter(([,v]) => v);
            if (!entries.length) return '';
            const icons = { facebook: '📘', instagram: '📷', youtube: '🎬', x: '𝕏', whatsapp: '📱' };
            const rows = entries.map(([k, v]) => `<dt>${icons[k] || '🌐'} ${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');
            const showPhone = reg.Show_Phone === 'true' ? '✅' : '❌';
            const showEmail = reg.Show_Email === 'true' ? '✅' : '❌';
            const showSocial = reg.Show_Social === 'true' ? '✅' : '❌';
            return `<h4 style="font-size:.9rem;margin-top:1rem;">🌐 Redes Sociales</h4>
                <dl class="reg-card-info" style="margin:.5rem 0;">${rows}</dl>
                <div style="font-size:.8rem;color:#64748b;display:flex;gap:12px;flex-wrap:wrap;">
                    <span>${showPhone} Mostrar teléfono</span>
                    <span>${showEmail} Mostrar email</span>
                    <span>${showSocial} Mostrar redes</span>
                </div>`;
        }

        function _renderFinancialSection(reg) {
            if (!reg.Plan_Solicitado && !reg.License_Amount) return '';
            const cycle = reg.Billing_Cycle === 'annual' ? 'Anual' : 'Mensual';
            let addonsHtml = '';
            try {
                const addons = JSON.parse(reg.Addons_Cart || '{}');
                const items = [];
                if (addons.templates?.length) items.push(`${addons.templates.length} plantilla(s) extra`);
                if (addons.packs?.length) items.push(`${addons.packs.length} pack(s)`);
                if (addons.extraDevices) items.push(`+${addons.extraDevices} dispositivo(s)`);
                if (addons.extraWorkplaces) items.push(`+${addons.extraWorkplaces} lugar(es)`);
                if (items.length) addonsHtml = `<dt>🛒 Add-ons</dt><dd>${escapeHtml(items.join(', '))}</dd>`;
            } catch(_) {}
            return `<h4 style="font-size:.9rem;margin-top:1rem;">💰 Datos Financieros</h4>
                <dl class="reg-card-info" style="margin:.5rem 0;">
                    <dt>📋 Plan</dt><dd>${escapeHtml(reg.Plan_Solicitado || '—')}</dd>
                    <dt>🔄 Ciclo</dt><dd>${escapeHtml(cycle)}</dd>
                    <dt>💳 Licencia</dt><dd>$${escapeHtml(String(reg.License_Amount || '—'))}</dd>
                    <dt>📅 Suscripción</dt><dd>$${escapeHtml(String(reg.Subscription_Amount || '—'))}</dd>
                    <dt>💵 Total hoy</dt><dd><strong>$${escapeHtml(String(reg.Total_Hoy || '—'))}</strong></dd>
                    ${addonsHtml}
                </dl>`;
        }

        function _updateApprovePreview() {
            const simBox = document.getElementById('apvSimBox');
            if (!simBox) return;
            const nombre = (document.getElementById('approveEditNombre') || {}).value?.trim() || 'Dr. Nombre';
            const matricula = (document.getElementById('approveEditMatricula') || {}).value?.trim() || 'MP-000';
            const especialidad = (document.getElementById('approveEditEspecialidades') || {}).value?.trim() || '';
            const accent = (document.getElementById('approveEditHeaderColor') || {}).value || '#1a56a0';
            const wpIdx = _approveActiveInstWp;
            const wpFields = document.querySelectorAll('.approve-wp-field[data-wp="' + wpIdx + '"]');
            let wpName = '', wpAddress = '', wpPhone = '';
            wpFields.forEach(f => {
                if (f.dataset.field === 'name') wpName = f.value.trim();
                if (f.dataset.field === 'address') wpAddress = f.value.trim();
                if (f.dataset.field === 'phone') wpPhone = f.value.trim();
            });
            const instB64 = _approveImagePreview.inst || (_approveWpLogos[wpIdx] || null);
            const profB64 = _approveImagePreview.prof;
            const firmaB64 = _approveImagePreview.firma;
            const instSize = _approveImageSizes.inst || 60;
            const profSize = _approveImageSizes.prof || 60;
            const firmaSize = _approveImageSizes.firma || 60;

            // Color de acento en la página
            const simPage = simBox.querySelector('.pdf-sim-page');
            if (simPage) simPage.style.setProperty('--sim-accent', accent);

            const simBanner = document.getElementById('apvSimBanner');
            const simLL = document.getElementById('apvSimLogoLeft');
            if (simBanner) {
                const hasWpData = wpName || wpAddress || wpPhone || instB64;
                simBanner.style.display = hasWpData ? 'flex' : 'none';
                simBanner.style.background = accent;
                if (simLL) {
                    simLL.innerHTML = '';
                    if (instB64) {
                        const i = document.createElement('img');
                        i.src = instB64; i.style.maxHeight = Math.round(instSize * 0.75) + 'px';
                        i.style.maxWidth = Math.round(instSize * 1.2) + 'px'; i.style.objectFit = 'contain';
                        simLL.appendChild(i);
                    }
                }
                const wpN = document.getElementById('apvSimWpName');
                const wpD = document.getElementById('apvSimWpDetails');
                if (wpN) wpN.textContent = wpName ? wpName.toUpperCase() : '';
                if (wpD) wpD.textContent = [wpAddress, wpPhone ? 'Tel: ' + wpPhone : ''].filter(Boolean).join(' · ');
            }
            const simProfName = document.getElementById('apvSimProfName');
            const simProfSpec = document.getElementById('apvSimProfSpec');
            if (simProfName) simProfName.textContent = nombre;
            if (simProfSpec) simProfSpec.textContent = [especialidad, matricula ? 'Mat. ' + matricula : ''].filter(Boolean).join(' · ');
            const simLR = document.getElementById('apvSimLogoRight');
            if (simLR) {
                simLR.innerHTML = '';
                if (profB64) {
                    const i = document.createElement('img');
                    i.src = profB64; i.style.height = Math.round(profSize * 0.55) + 'px';
                    i.style.width = 'auto'; i.style.objectFit = 'contain';
                    simLR.appendChild(i);
                }
            }
            const simStudy = document.getElementById('apvSimStudy');
            if (simStudy) simStudy.textContent = especialidad || 'Estudio';
            const simDate = document.getElementById('apvSimDate');
            if (simDate) simDate.textContent = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
            const simFirma = document.getElementById('apvSimFirma');
            const simFirmaImg = document.getElementById('apvSimFirmaImg');
            const simFirmaName = document.getElementById('apvSimFirmaName');
            if (simFirma && simFirmaImg) {
                if (firmaB64) {
                    simFirma.style.display = 'block';
                    simFirmaImg.innerHTML = '';
                    const i = document.createElement('img');
                    i.src = firmaB64; i.style.maxWidth = Math.round(firmaSize * 1.5) + 'px';
                    i.style.maxHeight = Math.round(firmaSize * 0.7) + 'px'; i.style.objectFit = 'contain';
                    simFirmaImg.appendChild(i);
                } else { simFirma.style.display = 'none'; }
            }
            if (simFirmaName) simFirmaName.textContent = nombre + ' · Mat. ' + matricula;

            // ── Nota de pie de página del lugar activo ──
            let wpFooter = '';
            wpFields.forEach(f => { if (f.dataset.field === 'footer') wpFooter = f.value.trim(); });
            if (!wpFooter) wpFooter = (document.getElementById('approveEditFooterText')?.value || '').trim();
            const simFooterApv = document.getElementById('apvSimFooter');
            if (simFooterApv) simFooterApv.textContent = wpFooter || '© Transcriptor Médico Pro';

            simBox.style.display = (instB64 || profB64 || firmaB64) ? 'block' : 'none';
        }

        function _initApproveImageEditors() {
            if (!window._makeImageSection) return;
            const _apvPreviewCb = (type, b64) => { _approveImagePreview[type] = b64; _updateApprovePreview(); };
            const _apvSizeCb = (type, sz) => { _approveImageSizes[type] = sz; _updateApprovePreview(); };
            if (!_apvFirmaEditor) {
                _apvFirmaEditor = window._makeImageSection({
                    type: 'firma', prefix: 'apvFirma',
                    getFromPrev: null,
                    saveResult: (b64) => { _approveImageData.firma = b64; },
                    onPreviewUpdate: _apvPreviewCb, onSizeUpdate: _apvSizeCb
                });
            }
            if (!_apvProfEditor) {
                _apvProfEditor = window._makeImageSection({
                    type: 'prof', prefix: 'apvProf',
                    getFromPrev: null,
                    saveResult: (b64) => { _approveImageData.proLogo = b64; },
                    onPreviewUpdate: _apvPreviewCb, onSizeUpdate: _apvSizeCb
                });
            }
        }

        function _renderApproveWorkplaces(mainWp, extraWps) {
            const container = document.getElementById('approveWorkplacesContainer');
            if (!container) return;
            const allWps = [mainWp || {}];
            if (Array.isArray(extraWps)) allWps.push(...extraWps);

            container.innerHTML = allWps.map((wp, i) => {
                const label = i === 0 ? '🏥 Lugar de trabajo principal' : `🏢 Lugar de trabajo ${i + 1}`;
                const id = `approveWp${i}`;
                const hasLogo = wp.logo && wp.logo !== 'null' && wp.logo !== 'no';
                const logoPreview = hasLogo
                    ? `<img src="${wp.logo.startsWith('data:') ? wp.logo : 'data:image/png;base64,' + wp.logo}" style="max-height:40px;max-width:100%;object-fit:contain;">`
                    : '<span style="font-size:.72rem;color:#94a3b8;">Sin logo</span>';
                return `
                <details ${i === 0 ? 'open' : ''} style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:.65rem;margin-bottom:.6rem;">
                    <summary style="font-size:.8rem;font-weight:600;color:#475569;cursor:pointer;list-style:none;display:flex;align-items:center;gap:4px;">${label} ▾</summary>
                    <div style="margin-top:.55rem;display:flex;flex-direction:column;gap:.45rem;">
                        <div class="form-row">
                            <div class="form-group">
                                <label style="font-size:.78rem;">Nombre del lugar</label>
                                <input type="text" class="approve-wp-field" data-wp="${i}" data-field="name" value="${escapeHtml(wp.name || wp.nombre || '')}" style="font-size:.84rem;" placeholder="Clínica / Hospital">
                            </div>
                            <div class="form-group">
                                <label style="font-size:.78rem;">Dirección</label>
                                <input type="text" class="approve-wp-field" data-wp="${i}" data-field="address" value="${escapeHtml(wp.address || wp.direccion || '')}" style="font-size:.84rem;" placeholder="Calle 123, Ciudad">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label style="font-size:.78rem;">Teléfono del lugar</label>
                                <input type="tel" class="approve-wp-field" data-wp="${i}" data-field="phone" value="${escapeHtml(wp.phone || wp.telefono || '')}" style="font-size:.84rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:.78rem;">Email del lugar</label>
                                <input type="email" class="approve-wp-field" data-wp="${i}" data-field="email" value="${escapeHtml(wp.email || '')}" style="font-size:.84rem;">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label style="font-size:.78rem;">📄 Pie de página del lugar</label>
                                <input type="text" class="approve-wp-field" data-wp="${i}" data-field="footer" value="${escapeHtml(wp.footer || '')}" style="font-size:.84rem;" placeholder="Texto al pie del informe" oninput="_approveActiveInstWp=${i}; _updateApprovePreview();">
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.2rem;">
                            <span style="font-size:.78rem;color:#64748b;">Logo institucional:</span>
                            <div id="${id}-logo-preview" style="min-height:40px;min-width:60px;background:repeating-conic-gradient(#e0e0e0 0% 25%,#fff 0% 50%) 0 0/10px 10px;border-radius:4px;display:flex;align-items:center;justify-content:center;padding:3px;">
                                ${logoPreview}
                            </div>
                            <label class="btn-secondary" for="${id}-logo-file" style="padding:2px 7px;font-size:.72rem;cursor:pointer;">📂</label>
                            <input type="file" id="${id}-logo-file" accept="image/*" style="display:none;" onchange="_approveWpLogoChange(${i}, this)">
                            <button type="button" class="btn-secondary" onclick="_approveWpLogoClear(${i})" style="padding:2px 7px;font-size:.72rem;color:#ef4444;border-color:#fca5a5;">🗑️</button>
                        </div>
                        <!-- Editor de logo institucional inline -->
                        <div id="apvWpLogo${i}-editor-wrap" style="display:${hasLogo ? 'block' : 'none'};margin-top:.4rem;border:1px solid #e2e8f0;border-radius:7px;padding:.5rem;background:#fafbff;">
                            <p style="font-size:.74rem;font-weight:600;color:#1e40af;margin:0 0 .35rem;">🖼️ Editor de Logo</p>
                            <div id="apvWpLogo${i}-thumb-wrap" style="display:none;background:repeating-conic-gradient(#e0e0e0 0% 25%,#fff 0% 50%) 0 0/12px 12px;border-radius:5px;padding:5px;text-align:center;margin-bottom:.35rem;">
                                <img id="apvWpLogo${i}-thumb" style="max-height:45px;max-width:100%;object-fit:contain;">
                            </div>
                            <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.35rem;">
                                <label class="btn-secondary" for="apvWpLogo${i}-file" style="padding:3px 8px;font-size:.72rem;cursor:pointer;">📂 Cambiar</label>
                                <input type="file" id="apvWpLogo${i}-file" accept="image/*" style="display:none;">
                                <button type="button" class="btn-secondary" id="apvWpLogo${i}-clear" style="padding:3px 6px;font-size:.72rem;display:none;color:#ef4444;border-color:#fca5a5;">🗑️</button>
                                <span id="apvWpLogo${i}-status" style="font-size:.65rem;padding:2px 6px;border-radius:10px;background:#f1f5f9;color:#64748b;margin-left:auto;">Vacío</span>
                            </div>
                            <div id="apvWpLogo${i}-proc-section" style="display:none;margin-top:.3rem;padding-top:.3rem;border-top:1px solid #e2e8f0;">
                                <div style="display:flex;gap:.5rem;flex-wrap:wrap;font-size:.72rem;margin-bottom:.25rem;">
                                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;"><input type="checkbox" id="apvWpLogo${i}-bg" checked style="accent-color:var(--primary);"> 🤖 Fondo</label>
                                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;"><input type="checkbox" id="apvWpLogo${i}-trim" checked style="accent-color:var(--primary);"> ✂️ Recortar</label>
                                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;"><input type="checkbox" id="apvWpLogo${i}-scale" checked style="accent-color:var(--primary);"> 📐 Escalar</label>
                                </div>
                                <button type="button" class="btn-primary" id="apvWpLogo${i}-process" style="width:100%;padding:4px 0;font-size:.74rem;">⚙️ Procesar</button>
                            </div>
                            <div id="apvWpLogo${i}-edit-section" style="display:none;margin-top:.3rem;padding-top:.3rem;border-top:1px solid #e2e8f0;">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;margin-bottom:.3rem;">
                                    <div><p style="font-size:.64rem;color:#64748b;margin:0 0 2px;">Original</p><div class="imgproc-checkerboard" style="border-radius:4px;min-height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img id="apvWpLogo${i}-orig" style="max-width:100%;max-height:100px;object-fit:contain;"></div></div>
                                    <div><p style="font-size:.64rem;color:#64748b;margin:0 0 2px;">Resultado</p><div class="imgproc-checkerboard" style="border-radius:4px;min-height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img id="apvWpLogo${i}-result" style="max-width:100%;max-height:100px;object-fit:contain;"></div></div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.2rem .5rem;font-size:.72rem;margin-bottom:.25rem;">
                                    <div><label style="color:#64748b;">☀️ Brillo <span id="apvWpLogo${i}-brval">100</span>%</label><input type="range" id="apvWpLogo${i}-br" min="20" max="200" value="100" style="width:100%;accent-color:var(--primary);"></div>
                                    <div><label style="color:#64748b;">🎨 Contraste <span id="apvWpLogo${i}-cnval">100</span>%</label><input type="range" id="apvWpLogo${i}-cn" min="20" max="200" value="100" style="width:100%;accent-color:var(--primary);"></div>
                                </div>
                                <div style="font-size:.72rem;margin-bottom:.25rem;">
                                    <label style="color:#475569;font-weight:600;">📐 Escala <span id="apvWpLogo${i}-scaleval">100</span>% <span id="apvWpLogo${i}-rdims" style="font-size:.6rem;color:#94a3b8;font-weight:400;margin-left:4px;"></span></label>
                                    <input type="range" id="apvWpLogo${i}-rscale" min="10" max="300" value="100" style="width:100%;accent-color:var(--primary);">
                                </div>
                                <div style="font-size:.72rem;margin-bottom:.25rem;">
                                    <label style="color:#64748b;">🗜️ Compresión <span id="apvWpLogo${i}-cmpval">92</span>%</label>
                                    <input type="range" id="apvWpLogo${i}-cmp" min="10" max="100" value="92" style="width:100%;accent-color:var(--primary);">
                                    <p id="apvWpLogo${i}-cmpinfo" style="font-size:.6rem;color:#94a3b8;margin:2px 0 0;"></p>
                                </div>
                                <div style="font-size:.72rem;margin-bottom:.25rem;">
                                    <label style="color:#64748b;">📏 PDF <span id="apvWpLogo${i}-szval">60</span>px <span id="apvWpLogo${i}-szdesc" style="color:#9ca3af;font-style:italic;font-size:.64rem;">(normal)</span></label>
                                    <input type="range" id="apvWpLogo${i}-sz" min="30" max="120" value="60" style="width:100%;accent-color:var(--primary);">
                                </div>
                                <div style="display:flex;gap:.2rem;flex-wrap:wrap;margin-bottom:.25rem;">
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-rotL" style="padding:2px 7px;font-size:.7rem;">↺90°</button>
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-rotR" style="padding:2px 7px;font-size:.7rem;">↻90°</button>
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-fH" style="padding:2px 7px;font-size:.7rem;">⟺H</button>
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-fV" style="padding:2px 7px;font-size:.7rem;">⇅V</button>
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-crop" style="padding:2px 7px;font-size:.7rem;" title="Recortar">✂️</button>
                                    <button type="button" class="btn-secondary" id="apvWpLogo${i}-reset" style="padding:2px 7px;font-size:.7rem;margin-left:auto;">↩</button>
                                </div>
                                <button type="button" class="btn-primary" id="apvWpLogo${i}-apply" style="width:100%;padding:4px 0;font-size:.74rem;background:#10b981;border-color:#10b981;">✅ Usar este logo</button>
                            </div>
                        </div>
                    </div>
                </details>`;
            }).join('');

            // Initialize editors for WPs that already have logos
            allWps.forEach((wp, i) => {
                const hasLogo = wp.logo && wp.logo !== 'null' && wp.logo !== 'no';
                if (hasLogo) {
                    const logoB64 = wp.logo.startsWith('data:') ? wp.logo : 'data:image/png;base64,' + wp.logo;
                    _approveWpLogos[i] = logoB64;
                    setTimeout(() => _initApproveWpLogoEditor(i, logoB64), 50);
                }
            });
        }

        // Editors for approve workplace logos
        const _approveWpLogoEditors = {};

        function _initApproveWpLogoEditor(wpIndex, b64) {
            if (_approveWpLogoEditors[wpIndex]) {
                _approveWpLogoEditors[wpIndex].loadB64(b64);
                return;
            }
            if (!window._makeImageSection) return;
            _approveWpLogoEditors[wpIndex] = window._makeImageSection({
                type: 'inst', prefix: 'apvWpLogo' + wpIndex,
                getFromPrev: null,
                saveResult: (b64) => {
                    _approveWpLogos[wpIndex] = b64;
                    _approveImageData.instLogo = b64;
                    const preview = document.getElementById('approveWp' + wpIndex + '-logo-preview');
                    if (preview && b64) preview.innerHTML = '<img src="' + b64 + '" style="max-height:40px;max-width:100%;object-fit:contain;">';
                    _approveActiveInstWp = wpIndex;
                    _approveImagePreview.inst = b64;
                    _updateApprovePreview();
                },
                onPreviewUpdate: (type, b64val) => {
                    _approveActiveInstWp = wpIndex;
                    _approveImagePreview.inst = b64val;
                    _updateApprovePreview();
                },
                onSizeUpdate: (type, sz) => {
                    _approveActiveInstWp = wpIndex;
                    _approveImageSizes.inst = sz;
                    _updateApprovePreview();
                }
            });
            _approveWpLogoEditors[wpIndex].loadB64(b64);
        }

        // State for workplace logos
        let _approveWpLogos = {};

        function _approveWpLogoChange(wpIndex, input) {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                _approveWpLogos[wpIndex] = reader.result;
                const preview = document.getElementById(`approveWp${wpIndex}-logo-preview`);
                if (preview) preview.innerHTML = `<img src="${reader.result}" style="max-height:40px;max-width:100%;object-fit:contain;">`;
                // Show editor and initialize
                const editorWrap = document.getElementById('apvWpLogo' + wpIndex + '-editor-wrap');
                if (editorWrap) {
                    editorWrap.style.display = 'block';
                    _initApproveWpLogoEditor(wpIndex, reader.result);
                }
            };
            reader.readAsDataURL(file);
        }

        function _approveWpLogoClear(wpIndex) {
            _approveWpLogos[wpIndex] = null;
            const preview = document.getElementById(`approveWp${wpIndex}-logo-preview`);
            if (preview) preview.innerHTML = '<span style="font-size:.72rem;color:#94a3b8;">Sin logo</span>';
            const editorWrap = document.getElementById('apvWpLogo' + wpIndex + '-editor-wrap');
            if (editorWrap) editorWrap.style.display = 'none';
            if (_approveWpLogoEditors[wpIndex]) {
                _approveWpLogoEditors[wpIndex].clear();
                _approveWpLogoEditors[wpIndex] = null;
            }
            _approveImagePreview.inst = null;
            _updateApprovePreview();
        }

        function _collectApproveWorkplaces() {
            const workplaces = [];
            const fields = document.querySelectorAll('.approve-wp-field');
            const wpMap = {};
            fields.forEach(f => {
                const i = parseInt(f.dataset.wp);
                if (!wpMap[i]) wpMap[i] = {};
                wpMap[i][f.dataset.field] = f.value.trim();
            });
            Object.keys(wpMap).sort((a,b) => a-b).forEach(i => {
                const wp = wpMap[i];
                // Include logo from state
                if (_approveWpLogos[i] !== undefined) {
                    wp.logo = _approveWpLogos[i];
                }
                workplaces.push(wp);
            });
            return workplaces;
        }

        function openApproveModal(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return;

            document.getElementById('approveRegId').value = regId;
            const espStr = reg.Especialidades || '';
            document.getElementById('approveRegEspecialidades').value = espStr;
            document.getElementById('approveAddonsCart').value = reg.Addons_Cart || '';

            // Auto-detectar plan
            const planSolicitado = (reg.Plan_Solicitado || _parsePlanFromNotas(reg.Notas || '')).toUpperCase();
            const isClinic = planSolicitado === 'CLINIC';

            document.getElementById('approveModalInfo').textContent =
                `Reg. ${reg.ID_Registro} · ${reg.Fecha_Registro ? new Date(reg.Fecha_Registro).toLocaleDateString('es-ES') : '—'} · Plan: ${planSolicitado || '(sin especificar)'}`;

            // ── Campos del profesional ──
            document.getElementById('approveEditNombre').value         = reg.Nombre         || '';
            document.getElementById('approveEditMatricula').value      = reg.Matricula      || '';
            document.getElementById('approveEditEmail').value          = reg.Email          || '';
            document.getElementById('approveEditTelefono').value       = _resolveRegPhone(reg);
            document.getElementById('approveEditEspecialidades').value = reg.Especialidades || '';
            const _hc = reg.Header_Color || '#1a56a0';
            document.getElementById('approveEditHeaderColor').value    = _hc;
            document.getElementById('approveEditHeaderColorVal').textContent = _hc;
            document.getElementById('approveEditFooterText').value     = reg.Footer_Text    || '';

            // ── Social (desde Registro_Datos si disponible) ──
            try {
                const rd = JSON.parse(reg.Registro_Datos || '{}');
                const sm = rd.socialMedia || {};
                document.getElementById('apvSocialFb').value = sm.facebook  || '';
                document.getElementById('apvSocialIg').value = sm.instagram || '';
                document.getElementById('apvSocialYt').value = sm.youtube   || '';
                document.getElementById('apvSocialX').value  = sm.x         || '';
                document.getElementById('apvSocialWa').value = sm.whatsapp  || '';
                document.getElementById('apvShowPhone').checked  = rd.showPhone  !== false;
                document.getElementById('apvShowEmail').checked  = rd.showEmail  !== false;
                document.getElementById('apvShowSocial').checked = rd.showSocial === true;
            } catch(_) {}

            // ── Workplaces: principal + extras ──
            let mainWp = {};
            try { mainWp = JSON.parse(reg.Workplace_Data || '{}'); } catch(_) {}
            let extraWps = [];
            try {
                if (reg.Extra_Workplaces) {
                    extraWps = JSON.parse(reg.Extra_Workplaces);
                    if (!Array.isArray(extraWps)) extraWps = [];
                }
            } catch(_) {}

            // Store initial logos
            _approveWpLogos = {};
            const allWps = [mainWp, ...extraWps];
            allWps.forEach((wp, i) => {
                if (wp.logo && wp.logo !== 'null' && wp.logo !== 'no') {
                    _approveWpLogos[i] = wp.logo;
                }
            });

            _renderApproveWorkplaces(mainWp, extraWps);
            // Resetear WP activo y poblar selector
            _approveActiveInstWp = 0;
            // Listeners en campos de workplace para actualizar preview
            setTimeout(() => {
                document.querySelectorAll('.approve-wp-field').forEach(f => {
                    if (!f._apvListenerAdded) {
                        f.addEventListener('input', () => { _approveActiveInstWp = parseInt(f.dataset.wp) || 0; _updateApprovePreview(); });
                        f.addEventListener('focus', () => { _approveActiveInstWp = parseInt(f.dataset.wp) || 0; _updateApprovePreview(); });
                        f._apvListenerAdded = true;
                    }
                });
            }, 50);

            // ── Imágenes: inicializar editores y cargar datos existentes ──
            _approveImageData = { firma: null, proLogo: null, instLogo: null };
            _approveImagePreview = { inst: null, prof: null, firma: null };
            _approveImageSizes = { inst: 60, prof: 60, firma: 60 };
            _initApproveImageEditors();

            // Limpiar editores
            if (_apvFirmaEditor) _apvFirmaEditor.clear();
            if (_apvProfEditor) _apvProfEditor.clear();

            // Listeners para actualizar preview al editar campos del profesional
            ['approveEditNombre','approveEditMatricula','approveEditEspecialidades'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el._apvListenerAdded) { el.addEventListener('input', _updateApprovePreview); el._apvListenerAdded = true; }
            });
            const _hcEl = document.getElementById('approveEditHeaderColor');
            if (_hcEl && !_hcEl._apvListenerAdded) { _hcEl.addEventListener('input', _updateApprovePreview); _hcEl._apvListenerAdded = true; }

            // Helper para cargar una imagen en un editor
            const _loadImgToEditor = (editor, src, field) => {
                if (!editor || !src) return;
                editor.loadB64(src);
                _approveImageData[field] = src;
            };

            // Si las imágenes están en Drive (drive:FILE_ID), fetchear el base64 real
            const firmaRef = String(reg.Firma || '');
            const proLogoRef = String(reg.Pro_Logo || '');
            const wpLogoRef = String(reg.Workplace_Logo || '');
            const hasWpLogoDrive = _approveWpLogos[0] === 'drive' || wpLogoRef.startsWith('drive:');
            const hasDriveImages = firmaRef.startsWith('drive:') || proLogoRef.startsWith('drive:') || wpLogoRef.startsWith('drive:');

            if (hasDriveImages) {
                // Usar cualquier drive ref disponible (todos apuntan al mismo archivo)
                const driveRef = firmaRef.startsWith('drive:') ? firmaRef : proLogoRef.startsWith('drive:') ? proLogoRef : wpLogoRef;
                const authStr = _getSessionAuthParams();
                const url = `${CONFIG.scriptUrl}?action=admin_get_registration_images&driveRef=${encodeURIComponent(driveRef)}&${authStr}`;
                // Mostrar indicador de carga
                const _firmaStatus = document.getElementById('apvFirma-status');
                const _profStatus = document.getElementById('apvProf-status');
                const _instStatus = document.getElementById('apvInst-status');
                if (_firmaStatus) { _firmaStatus.textContent = '⏳ Cargando...'; _firmaStatus.style.background = '#fef3c7'; _firmaStatus.style.color = '#92400e'; }
                if (_profStatus) { _profStatus.textContent = '⏳ Cargando...'; _profStatus.style.background = '#fef3c7'; _profStatus.style.color = '#92400e'; }
                if (_instStatus && hasWpLogoDrive) { _instStatus.textContent = '⏳ Cargando...'; _instStatus.style.background = '#fef3c7'; _instStatus.style.color = '#92400e'; }

                fetch(url).then(r => r.json()).then(data => {
                    if (data.success && data.images) {
                        if (data.images.firma) _loadImgToEditor(_apvFirmaEditor, data.images.firma, 'firma');
                        else if (_firmaStatus) { _firmaStatus.textContent = 'Sin firma'; _firmaStatus.style.background = '#f1f5f9'; _firmaStatus.style.color = '#64748b'; }
                        if (data.images.proLogo) _loadImgToEditor(_apvProfEditor, data.images.proLogo, 'proLogo');
                        else if (_profStatus) { _profStatus.textContent = 'Sin logo'; _profStatus.style.background = '#f1f5f9'; _profStatus.style.color = '#64748b'; }
                        // Logo institucional del workplace principal
                        if (data.images.instLogo) {
                            _approveWpLogos[0] = data.images.instLogo;
                            const _wpPrev0 = document.getElementById('approveWp0-logo-preview');
                            if (_wpPrev0) _wpPrev0.innerHTML = '<img src="' + data.images.instLogo + '" style="max-height:40px;max-width:100%;object-fit:contain;">';
                            const _edWrap0 = document.getElementById('apvWpLogo0-editor-wrap');
                            if (_edWrap0) { _edWrap0.style.display = 'block'; _initApproveWpLogoEditor(0, data.images.instLogo); }
                        } else if (_instStatus && hasWpLogoDrive) {
                            _instStatus.textContent = 'Sin logo';
                            _instStatus.style.background = '#f1f5f9';
                            _instStatus.style.color = '#64748b';
                        }
                        // Logos de workplaces extra almacenados en Drive
                        Object.keys(data.images).forEach(key => {
                            const m = key.match(/^extraLogo_(\d+)$/);
                            if (m) {
                                const wpIdx = parseInt(m[1]) + 1; // extraLogo_0 → WP 1
                                _approveWpLogos[wpIdx] = data.images[key];
                                const prev = document.getElementById('approveWp' + wpIdx + '-logo-preview');
                                if (prev) prev.innerHTML = '<img src="' + data.images[key] + '" style="max-height:40px;max-width:100%;object-fit:contain;">';
                            }
                        });
                    } else {
                        console.warn('Respuesta sin imágenes:', data);
                        if (_firmaStatus) { _firmaStatus.textContent = '⚠️ Error'; _firmaStatus.style.background = '#fee2e2'; _firmaStatus.style.color = '#991b1b'; }
                        if (_profStatus) { _profStatus.textContent = '⚠️ Error'; _profStatus.style.background = '#fee2e2'; _profStatus.style.color = '#991b1b'; }
                        if (_instStatus && hasWpLogoDrive) { _instStatus.textContent = '⚠️ Error'; _instStatus.style.background = '#fee2e2'; _instStatus.style.color = '#991b1b'; }
                    }
                }).catch(err => {
                    console.warn('Error cargando imágenes del registro:', err);
                    if (_firmaStatus) { _firmaStatus.textContent = '⚠️ Error de red'; _firmaStatus.style.background = '#fee2e2'; _firmaStatus.style.color = '#991b1b'; }
                    if (_profStatus) { _profStatus.textContent = '⚠️ Error de red'; _profStatus.style.background = '#fee2e2'; _profStatus.style.color = '#991b1b'; }
                    if (_instStatus && hasWpLogoDrive) { _instStatus.textContent = '⚠️ Error de red'; _instStatus.style.background = '#fee2e2'; _instStatus.style.color = '#991b1b'; }
                    if (typeof dashAlert === 'function') dashAlert('No se pudieron cargar las imágenes del registro. Verificá que el Google Apps Script esté actualizado con el endpoint admin_get_registration_images.', '⚠️');
                });
            } else {
                // Fallback: imágenes inline (base64 directo en la celda)
                if (firmaRef && firmaRef !== 'no' && firmaRef !== 'null' && firmaRef !== 'yes') {
                    const firmaSrc = firmaRef.startsWith('data:') ? firmaRef : 'data:image/png;base64,' + firmaRef;
                    _loadImgToEditor(_apvFirmaEditor, firmaSrc, 'firma');
                }
                if (proLogoRef && proLogoRef !== 'no' && proLogoRef !== 'null' && proLogoRef !== 'yes') {
                    const profSrc = proLogoRef.startsWith('data:') ? proLogoRef : 'data:image/png;base64,' + proLogoRef;
                    _loadImgToEditor(_apvProfEditor, profSrc, 'proLogo');
                }
            }

            // Cargar logo institucional desde Workplace_Data (fallback para registros antiguos)
            const firstWpLogo = _approveWpLogos[0];
            if (firstWpLogo && firstWpLogo !== 'null' && firstWpLogo !== 'no' && firstWpLogo !== 'drive') {
                const instSrc = firstWpLogo.startsWith('data:') ? firstWpLogo : 'data:image/png;base64,' + firstWpLogo;
                const _wpPrevFb = document.getElementById('approveWp0-logo-preview');
                if (_wpPrevFb) _wpPrevFb.innerHTML = '<img src="' + instSrc + '" style="max-height:40px;max-width:100%;object-fit:contain;">';
                const _edWrapFb = document.getElementById('apvWpLogo0-editor-wrap');
                if (_edWrapFb) { _edWrapFb.style.display = 'block'; _initApproveWpLogoEditor(0, instSrc); }
            }

            // En CLINIC la firma/logo global del registro no representan bien a la institución.
            const _firmaWrap = document.getElementById('apvFirma-editor-wrap');
            const _profWrap = document.getElementById('apvProf-editor-wrap');
            if (_firmaWrap) _firmaWrap.style.display = isClinic ? 'none' : 'block';
            if (_profWrap) _profWrap.style.display = isClinic ? 'none' : 'block';
            const _firmaStatus = document.getElementById('apvFirma-status');
            const _profStatus = document.getElementById('apvProf-status');
            if (isClinic) {
                if (_firmaStatus) {
                    _firmaStatus.textContent = 'No aplica para CLINIC';
                    _firmaStatus.style.background = '#f1f5f9';
                    _firmaStatus.style.color = '#64748b';
                }
                if (_profStatus) {
                    _profStatus.textContent = 'Gestionado por profesional';
                    _profStatus.style.background = '#f1f5f9';
                    _profStatus.style.color = '#64748b';
                }
            }

            // Expandir verificación por defecto
            const _vb = document.getElementById('approveVerifyBody');
            const _vi = document.getElementById('approveVerifyToggleIcon');
            if (_vb) _vb.style.display = 'block';
            if (_vi) _vi.textContent = '▲ colapsar';

            const PLANES_VALIDOS = ['NORMAL','PRO','CLINIC','GIFT','TRIAL'];
            const planBadgeRow  = document.getElementById('approvePlanBadgeRow');
            const planSelectRow = document.getElementById('approvePlanSelectRow');

            if (planSolicitado && PLANES_VALIDOS.includes(planSolicitado)) {
                document.getElementById('approvePlan').value = planSolicitado;
                document.getElementById('approvePlanBadge').innerHTML =
                    _renderPlanBadge(planSolicitado) +
                    ' <span style="font-size:.78rem;color:#64748b;margin-left:.4rem;">elegido por el usuario</span>';
                planBadgeRow.style.display  = '';
                planSelectRow.style.display = 'none';
            } else {
                document.getElementById('approvePlan').value = 'NORMAL';
                planBadgeRow.style.display  = 'none';
                planSelectRow.style.display = '';
            }

            // Auto-llenar keys
            document.getElementById('approveApiKey').value   = localStorage.getItem('admin_groq_key')    || '';
            document.getElementById('approveApiKeyB1').value = localStorage.getItem('admin_groq_key_b1') || '';
            document.getElementById('approveApiKeyB2').value = localStorage.getItem('admin_groq_key_b2') || '';

            const keysEdit = document.getElementById('approveKeysEditSection');
            const hasPrimaryKey = !!(document.getElementById('approveApiKey').value || '').trim();
            if (keysEdit) keysEdit.style.display = hasPrimaryKey ? 'none' : 'block';
            _updateApproveKeysStatus();

            document.getElementById('approveModalOverlay').classList.add('show');
            updateApproveTemplateUI();
        }

        function closeApproveModal() {
            document.getElementById('approveModalOverlay').classList.remove('show');
            const apvSim = document.getElementById('apvSimBox');
            if (apvSim) apvSim.style.display = 'none';
        }

        function _toggleApproveVerify() {
            const body = document.getElementById('approveVerifyBody');
            const icon = document.getElementById('approveVerifyToggleIcon');
            if (!body) return;
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            if (icon) icon.textContent = isOpen ? '▼ expandir' : '▲ colapsar';
        }

        /** Parsea el plan desde el campo Notas o cualquier texto que lo contenga */
        function _parsePlanFromNotas(notas) {
            if (!notas) return '';
            const s = String(notas);
            // Formato explícito: "Plan: PRO" o "Plan PRO"
            const m = s.match(/Plan[:\s]+([A-Z]{2,10})/i);
            if (m) return m[1].toUpperCase();
            // Detectar palabra clave suelta (ej: "...Cardiología NORMAL")
            // Orden importante: más largo primero para evitar falsos positivos
            const planes = ['CLINIC', 'NORMAL', 'GIFT', 'TRIAL', 'PRO'];
            for (const p of planes) {
                if (new RegExp('\\b' + p + '\\b', 'i').test(s)) return p;
            }
            return '';
        }

        /** Genera el HTML del badge grande del plan (para el modal) */
        function _renderPlanBadge(plan) {
            const cfg = {
                NORMAL: { color: '#1d4ed8', bg: '#dbeafe', icon: '📋' },
                PRO:    { color: '#7c3aed', bg: '#ede9fe', icon: '⭐' },
                CLINIC: { color: '#0f766e', bg: '#ccfbf1', icon: '🏥' },
                GIFT:   { color: '#b45309', bg: '#fef3c7', icon: '🎁' },
                TRIAL:  { color: '#9a3412', bg: '#fee2e2', icon: '🔬' }
            };
            const c = cfg[plan] || { color: '#475569', bg: '#f1f5f9', icon: '📄' };
            return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 14px;background:${c.bg};color:${c.color};border-radius:20px;font-weight:700;font-size:.95rem;">${c.icon} ${plan}</span>`;
        }

        /** Genera el HTML del badge pequeño del plan (para las tarjetas) */
        function _renderPlanBadgeMini(plan) {
            const cfg = {
                NORMAL: { color: '#1d4ed8', bg: '#dbeafe', icon: '📋' },
                PRO:    { color: '#7c3aed', bg: '#ede9fe', icon: '⭐' },
                CLINIC: { color: '#0f766e', bg: '#ccfbf1', icon: '🏥' },
                GIFT:   { color: '#b45309', bg: '#fef3c7', icon: '🎁' },
                TRIAL:  { color: '#9a3412', bg: '#fee2e2', icon: '🔬' }
            };
            const c = cfg[plan] || { color: '#475569', bg: '#f1f5f9', icon: '📄' };
            return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:${c.bg};color:${c.color};border-radius:12px;font-weight:700;font-size:.74rem;">${c.icon} ${plan}</span>`;
        }

        /** Actualiza el bloque de estado de keys en el modal de aprobación */
        function _updateApproveKeysStatus() {
            const statusEl = document.getElementById('approveKeysStatus');
            if (!statusEl) return;
            const k  = (document.getElementById('approveApiKey')?.value  || '').trim();
            const b1 = (document.getElementById('approveApiKeyB1')?.value || '').trim();
            const b2 = (document.getElementById('approveApiKeyB2')?.value || '').trim();
            const editBtn = `<button type="button" onclick="toggleApproveKeysEdit()" style="margin-left:.6rem;padding:2px 9px;font-size:.77rem;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;background:#f1f5f9;color:#334155;">✏️ Editar</button>`;
            if (k) {
                const bkParts = [b1 ? 'B1 ✓' : '', b2 ? 'B2 ✓' : ''].filter(Boolean).join(', ');
                statusEl.innerHTML = `<span style="color:#15803d;font-weight:600;">✅ Keys configuradas</span>` +
                    (bkParts ? ` <span style="color:#64748b;font-size:.78rem;">(respaldos: ${bkParts})</span>` : '') + editBtn;
            } else {
                statusEl.innerHTML = `<span style="color:#dc2626;font-weight:600;">⚠️ Sin keys — configurá las claves en la pestaña "🔑 Mis Keys"</span>` +
                    `<button type="button" onclick="toggleApproveKeysEdit()" style="margin-left:.6rem;padding:2px 9px;font-size:.77rem;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;background:#fef2f2;color:#b91c1c;">⚙️ Ingresar</button>`;
            }
        }

        /** Muestra/oculta el panel de edición de keys */
        function toggleApproveKeysEdit() {
            const el = document.getElementById('approveKeysEditSection');
            if (!el) return;
            const hidden = el.style.display === 'none' || el.style.display === '';
            el.style.display = hidden ? 'block' : 'none';
        }

        /** Guarda las keys editadas en localStorage y sincroniza con Mis Keys */
        function _approveKeysSave() {
            const k  = (document.getElementById('approveApiKey')?.value  || '').trim();
            const b1 = (document.getElementById('approveApiKeyB1')?.value || '').trim();
            const b2 = (document.getElementById('approveApiKeyB2')?.value || '').trim();
            if (k) {
                localStorage.setItem('admin_groq_key',    k);
                localStorage.setItem('admin_groq_key_b1', b1);
                localStorage.setItem('admin_groq_key_b2', b2);
                // Sincronizar con el tab Mis Keys
                const inp   = document.getElementById('adminKeyPrincipal');
                const inpB1 = document.getElementById('adminKeyB1');
                const inpB2 = document.getElementById('adminKeyB2');
                if (inp)   inp.value   = k;
                if (inpB1) inpB1.value = b1;
                if (inpB2) inpB2.value = b2;
            }
            document.getElementById('approveKeysEditSection').style.display = 'none';
            _updateApproveKeysStatus();
        }

        /** Carga las keys guardadas en localStorage y las muestra en los inputs del tab */
        function loadAdminKeys() {
            const k  = localStorage.getItem('admin_groq_key')    || '';
            const b1 = localStorage.getItem('admin_groq_key_b1') || '';
            const b2 = localStorage.getItem('admin_groq_key_b2') || '';
            const inp  = document.getElementById('adminKeyPrincipal');
            const inpB1 = document.getElementById('adminKeyB1');
            const inpB2 = document.getElementById('adminKeyB2');
            if (inp)   inp.value   = k;
            if (inpB1) inpB1.value = b1;
            if (inpB2) inpB2.value = b2;
        }

        /** Guarda las keys en localStorage */
        function saveAdminKeys() {
            const k  = (document.getElementById('adminKeyPrincipal')?.value || '').trim();
            const b1 = (document.getElementById('adminKeyB1')?.value || '').trim();
            const b2 = (document.getElementById('adminKeyB2')?.value || '').trim();
            localStorage.setItem('admin_groq_key',    k);
            localStorage.setItem('admin_groq_key_b1', b1);
            localStorage.setItem('admin_groq_key_b2', b2);
            const msg = document.getElementById('adminKeysSavedMsg');
            if (msg) { msg.style.display = 'inline'; setTimeout(() => { msg.style.display = 'none'; }, 2500); }
        }

        /** Copia el valor de un input al portapapeles */
        function copyAdminKey(inputId) {
            const el = document.getElementById(inputId);
            if (!el || !el.value.trim()) { showNotification('El campo está vacío', 'warning'); return; }
            navigator.clipboard.writeText(el.value.trim())
                .then(() => showNotification('✅ Key copiada al portapapeles', 'success'))
                .catch(() => { el.select(); document.execCommand('copy'); showNotification('✅ Key copiada', 'success'); });
        }

        /** Alterna visibilidad del campo de key */
        function toggleKeyVisibility(inputId, btnId) {
            const el  = document.getElementById(inputId);
            const btn = document.getElementById(btnId);
            if (!el) return;
            if (el.type === 'password') { el.type = 'text'; if (btn) btn.textContent = '🙈'; }
            else                        { el.type = 'password'; if (btn) btn.textContent = '👁️'; }
        }

        /** Obtiene las categorías de plantillas relevantes para las especialidades del doctor */
        function _getDoctorTemplateCategories() {
            const espStr = document.getElementById('approveRegEspecialidades').value || '';
            const esps = espStr.split(',').map(s => s.trim()).filter(Boolean);
            const cats = new Set();
            esps.forEach(esp => {
                const mapped = FORM_ESP_TO_TEMPLATE_CAT[esp];
                if (mapped) mapped.forEach(c => cats.add(c));
            });
            // Siempre incluir General como opción
            cats.add('General');
            return cats;
        }

        /** Renderiza la sección de plantillas según el plan seleccionado */
        function updateApproveTemplateUI() {
            const plan = document.getElementById('approvePlan').value;
            const section = document.getElementById('approveTemplateSection');
            const devicesInfo = document.getElementById('approveDevicesInfo');
            const planCfg = _resolvePlanCfg(plan);
            const devices = Number(planCfg.maxDevices) || 2;
            devicesInfo.textContent = devices >= 999 ? '∞ (ilimitados)' : devices;
            const templateMode = String(planCfg.templateMode || '').toLowerCase();
            const templateLimit = Number(planCfg.templateLimit);
            const packLimit = Number(planCfg.packLimit) || 0;
            const specialtyExtraLimit = Number(planCfg.specialtyExtraLimit) || 0;

            const doctorCats = _getDoctorTemplateCategories();
            const allCats = Object.keys(TEMPLATE_MAP);

            if (templateMode === 'all') {
                // GIFT: todas las plantillas, sin selección
                const allTemplates = [];
                allCats.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => allTemplates.push(t.name));
                });
                section.innerHTML = `
                    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;border-radius:10px;padding:.8rem 1rem;text-align:center;">
                        <span style="font-size:1.5rem;">🎁</span>
                        <p style="font-weight:600;font-size:.88rem;color:#92400e;margin:.3rem 0 .2rem;">Plan REGALO — TODAS las plantillas incluidas</p>
                        <p style="font-size:.75rem;color:#a16207;margin:0;">${allTemplates.length} plantillas · ${devices >= 999 ? '∞' : devices} dispositivos · Funcionalidades PRO</p>
                        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:.5rem;justify-content:center;">
                            ${allTemplates.map(n => `<span style="padding:2px 6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;font-size:.7rem;color:#9a3412;">${escapeHtml(n)}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else if (templateMode === 'packs') {
                // Packs por categoría (límite configurable)
                const maxPacks = packLimit > 0 ? packLimit : 3;
                let html = `
                    <label style="font-weight:600;font-size:.85rem;">📦 Packs de especialidad <span style="color:#94a3b8;font-weight:400;">(máx. ${maxPacks})</span></label>
                    <div id="approvePackCounter" data-max="${maxPacks}" style="font-size:.78rem;color:#64748b;margin:.3rem 0;">0/${maxPacks} packs seleccionados</div>
                    <div class="tpl-pack-grid" style="display:grid;gap:.4rem;margin-top:.4rem;">
                `;
                allCats.forEach(cat => {
                    const templates = TEMPLATE_MAP[cat];
                    const isRelevant = doctorCats.has(cat);
                    html += `
                        <label class="tpl-pack-item ${isRelevant ? 'tpl-relevant' : ''}" style="display:flex;align-items:flex-start;gap:.5rem;padding:.5rem .7rem;background:#f8fafc;border:1px solid ${isRelevant ? '#0ea5e9' : '#e2e8f0'};border-radius:8px;cursor:pointer;transition:all .2s;">
                            <input type="checkbox" class="approve-pack-cb" value="${cat}" ${isRelevant ? 'checked' : ''} onchange="onPackChange()">
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:.83rem;">${cat}</div>
                                <div style="font-size:.73rem;color:#94a3b8;">${templates.map(t => t.name).join(', ')}</div>
                            </div>
                            <span style="font-size:.7rem;color:#64748b;white-space:nowrap;">${templates.length} plantillas</span>
                        </label>
                    `;
                });
                html += '</div>';
                section.innerHTML = html;
                onPackChange();
                // Pre-seleccionar packs del formulario de registro
                try {
                    const cartStr = document.getElementById('approveAddonsCart')?.value;
                    if (cartStr) {
                        const cart = JSON.parse(cartStr);
                        const preSelectedPacks = (cart.packs || []).map(p => p.category);
                        if (preSelectedPacks.length > 0) {
                            section.querySelectorAll('.approve-pack-cb').forEach(cb => {
                                cb.checked = preSelectedPacks.includes(cb.value);
                            });
                            onPackChange();
                        }
                    }
                } catch(_) {}
            } else if (templateMode === 'specialty') {
                // PRO: todas las plantillas de sus especialidades (auto), + extras opcionales
                const autoKeys = [];
                const autoNames = [];
                doctorCats.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => {
                        autoKeys.push(t.key);
                        autoNames.push(t.name);
                    });
                });

                let html = `
                    <label style="font-weight:600;font-size:.85rem;">📋 Plantillas incluidas por especialidad</label>
                    <div style="font-size:.78rem;color:#0f766e;margin:.3rem 0;">✅ ${autoKeys.length} plantillas de sus especialidades (incluidas automáticamente)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin:.4rem 0 .8rem;">
                        ${autoNames.map(n => `<span class="badge badge-specialty">${escapeHtml(n)}</span>`).join('')}
                    </div>
                `;

                // Plantillas extra (de otras categorías)
                const otherCats = allCats.filter(c => !doctorCats.has(c));
                if (otherCats.length > 0) {
                    html += `
                        <label style="font-weight:600;font-size:.85rem;">➕ Plantillas extra <span style="color:#94a3b8;font-weight:400;">(opcional, de otras especialidades${specialtyExtraLimit > 0 ? ', máx. ' + specialtyExtraLimit : ''})</span></label>
                        <div class="tpl-extras-grid" style="margin-top:.4rem;">
                    `;
                    otherCats.forEach(cat => {
                        html += `<div style="margin-bottom:.5rem;"><div style="font-weight:600;font-size:.78rem;color:#64748b;margin-bottom:.2rem;">${cat}</div><div style="display:flex;flex-wrap:wrap;gap:4px;">`;
                        (TEMPLATE_MAP[cat] || []).forEach(t => {
                            html += `
                                <label class="tpl-cb-item" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:.78rem;cursor:pointer;">
                                    <input type="checkbox" class="approve-extra-cb" value="${t.key}"> ${escapeHtml(t.name)}
                                </label>
                            `;
                        });
                        html += '</div></div>';
                    });
                    html += '</div>';
                }
                section.innerHTML = html;
            } else {
                // Modo manual: elegir hasta N plantillas de sus especialidades
                const maxTpl = templateLimit > 0 ? templateLimit : 3;
                let html = `
                    <label style="font-weight:600;font-size:.85rem;">📋 Plantillas permitidas <span style="color:#94a3b8;font-weight:400;">(máx. ${maxTpl})</span></label>
                    <div id="approveTplCounter" style="font-size:.78rem;color:#64748b;margin:.3rem 0;">0/${maxTpl} seleccionadas</div>
                    <div class="tpl-individual-grid" style="margin-top:.4rem;">
                `;

                // Primero las categorías del doctor
                const orderedCats = [...doctorCats, ...allCats.filter(c => !doctorCats.has(c))];
                const seen = new Set();
                orderedCats.forEach(cat => {
                    if (seen.has(cat)) return;
                    seen.add(cat);
                    const isRelevant = doctorCats.has(cat);
                    html += `<div style="margin-bottom:.5rem;${!isRelevant ? 'opacity:.5;' : ''}">
                        <div style="font-weight:600;font-size:.78rem;color:${isRelevant ? '#0f766e' : '#94a3b8'};margin-bottom:.2rem;">${cat} ${isRelevant ? '★' : ''}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">`;
                    (TEMPLATE_MAP[cat] || []).forEach(t => {
                        html += `
                            <label class="tpl-cb-item" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:${isRelevant ? '#f0fdf4' : '#f8fafc'};border:1px solid ${isRelevant ? '#86efac' : '#e2e8f0'};border-radius:6px;font-size:.78rem;cursor:pointer;">
                                <input type="checkbox" class="approve-tpl-cb" value="${t.key}" ${!isRelevant ? 'disabled' : ''} onchange="onTplChange(${maxTpl})"> ${escapeHtml(t.name)}
                            </label>
                        `;
                    });
                    html += '</div></div>';
                });
                html += '</div>';
                section.innerHTML = html;
                onTplChange(maxTpl);
                // Pre-seleccionar plantillas: primero del carrito (compra), luego auto por especialidad
                let prefilledFromCart = false;
                try {
                    const cartStr = document.getElementById('approveAddonsCart')?.value;
                    if (cartStr) {
                        const cart = JSON.parse(cartStr);
                        const preSelectedKeys = (cart.templates || []).map(t => t.key);
                        if (preSelectedKeys.length > 0) {
                            prefilledFromCart = true;
                            section.querySelectorAll('.approve-tpl-cb').forEach(cb => { if (!cb.disabled) cb.checked = false; });
                            preSelectedKeys.forEach(key => {
                                const cb = section.querySelector(`.approve-tpl-cb[value="${key}"]`);
                                if (cb) {
                                    cb.disabled = false;
                                    cb.checked = true;
                                    const lbl = cb.closest('label');
                                    if (lbl) { lbl.style.opacity = '1'; lbl.style.background = '#f0fdf4'; lbl.style.borderColor = '#86efac'; }
                                }
                            });
                            onTplChange(maxTpl);
                        }
                    }
                } catch(_) {}
                // Sin datos del carrito → auto-seleccionar las primeras N de la especialidad del médico
                if (!prefilledFromCart) {
                    let autoCount = 0;
                    section.querySelectorAll('.approve-tpl-cb').forEach(cb => {
                        if (!cb.disabled && autoCount < maxTpl) {
                            cb.checked = true;
                            autoCount++;
                            const lbl = cb.closest('label');
                            if (lbl) { lbl.style.background = '#f0fdf4'; lbl.style.borderColor = '#86efac'; }
                        }
                    });
                    onTplChange(maxTpl);
                }
            }
        }

        /** Maneja cambio en checkboxes de templates individuales (NORMAL/TRIAL) */
        function onTplChange(max) {
            const cbs = document.querySelectorAll('.approve-tpl-cb');
            const checked = Array.from(cbs).filter(cb => cb.checked);
            const counter = document.getElementById('approveTplCounter');
            if (counter) counter.textContent = `${checked.length}/${max} seleccionadas`;

            // Deshabilitar unchecked si se alcanzó el máximo
            cbs.forEach(cb => {
                if (!cb.checked && !cb.disabled) {
                    cb.disabled = checked.length >= max;
                    cb.closest('label').style.opacity = checked.length >= max ? '.4' : '1';
                }
                if (cb.checked) {
                    cb.disabled = false;
                    cb.closest('label').style.opacity = '1';
                }
            });

            // Actualizar color del contador
            if (counter) {
                counter.style.color = checked.length >= max ? '#dc2626' : '#64748b';
            }
        }

        /** Maneja cambio en checkboxes de packs (CLINIC) */
        function onPackChange() {
            const counter = document.getElementById('approvePackCounter');
            const max = Number(counter?.dataset?.max || 3);
            const cbs = document.querySelectorAll('.approve-pack-cb');
            const checked = Array.from(cbs).filter(cb => cb.checked);
            if (counter) counter.textContent = `${checked.length}/${max} packs seleccionados`;

            cbs.forEach(cb => {
                if (!cb.checked) {
                    cb.disabled = checked.length >= max;
                    cb.closest('label').style.opacity = checked.length >= max ? '.4' : '1';
                }
                if (cb.checked) {
                    cb.disabled = false;
                    cb.closest('label').style.opacity = '1';
                    cb.closest('label').style.borderColor = '#0ea5e9';
                    cb.closest('label').style.background = '#f0f9ff';
                }
                if (!cb.checked) {
                    cb.closest('label').style.borderColor = '#e2e8f0';
                    cb.closest('label').style.background = '#f8fafc';
                }
            });

            if (counter) {
                counter.style.color = checked.length >= max ? '#dc2626' : '#64748b';
            }
        }

        async function confirmApproval() {
            const regId = document.getElementById('approveRegId').value;
            const plan = document.getElementById('approvePlan').value;
            const apiKey  = document.getElementById('approveApiKey').value.trim();
            const apiKeyB1 = document.getElementById('approveApiKeyB1').value.trim();
            const apiKeyB2 = document.getElementById('approveApiKeyB2').value.trim();
            const planCfg = _resolvePlanCfg(plan);
            const maxDevices = Number(planCfg.maxDevices) || 2;
            const templateMode = String(planCfg.templateMode || '').toLowerCase();
            const templateLimit = Number(planCfg.templateLimit);
            const packLimit = Number(planCfg.packLimit) || 0;
            const specialtyExtraLimit = Number(planCfg.specialtyExtraLimit) || 0;

            // Leer campos editados en la sección de verificación
            const _editNombre      = (document.getElementById('approveEditNombre')?.value      || '').trim();
            const _editMatricula   = (document.getElementById('approveEditMatricula')?.value   || '').trim();
            const _editEmail       = (document.getElementById('approveEditEmail')?.value       || '').trim();
            const _editTelefono    = (document.getElementById('approveEditTelefono')?.value    || '').trim();
            const _editEsp         = (document.getElementById('approveEditEspecialidades')?.value || '').trim();
            const _editHeaderColor = document.getElementById('approveEditHeaderColor')?.value   || '#1a56a0';
            const _editFooterText  = (document.getElementById('approveEditFooterText')?.value  || '').trim();
            const _editSocialMedia = {
                facebook:  (document.getElementById('apvSocialFb')?.value?.trim() || ''),
                instagram: (document.getElementById('apvSocialIg')?.value?.trim() || ''),
                youtube:   (document.getElementById('apvSocialYt')?.value?.trim() || ''),
                x:         (document.getElementById('apvSocialX')?.value?.trim()  || ''),
                whatsapp:  (document.getElementById('apvSocialWa')?.value?.trim() || '')
            };
            const _editShowPhone  = document.getElementById('apvShowPhone')?.checked  ?? true;
            const _editShowEmail  = document.getElementById('apvShowEmail')?.checked  ?? true;
            const _editShowSocial = document.getElementById('apvShowSocial')?.checked ?? false;

            // Imágenes — priorizar las ya aplicadas, fallback al editor si procesó sin aplicar
            let _editFirma = _approveImageData.firma || '';
            let _editProLogo = _approveImageData.proLogo || '';
            if (!_editFirma && _apvFirmaEditor) {
                const fb = await _apvFirmaEditor.getEditedB64();
                if (fb) _editFirma = fb;
            }
            if (!_editProLogo && _apvProfEditor) {
                const fb = await _apvProfEditor.getEditedB64();
                if (fb) _editProLogo = fb;
            }
            // Logo institucional: sincronizar desde editor WP 0 si existe
            if (!_approveWpLogos[0] && _approveWpLogoEditors[0]) {
                const instB64 = await _approveWpLogoEditors[0].getEditedB64();
                if (instB64) _approveWpLogos[0] = instB64;
            }

            // Recopilar todos los workplaces editados (después de sincronizar logo inst)
            const allWorkplaces = _collectApproveWorkplaces();
            const _editWp = JSON.stringify(allWorkplaces[0] || {});
            const _editExtraWps = JSON.stringify(allWorkplaces.slice(1));

            if (!apiKey) {
                await dashAlert('Debés ingresar una API Key para este profesional. Usá el botón ⚙️ Ingresar para configurarla.', '🔑');
                document.getElementById('approveKeysEditSection').style.display = 'block';
                _updateApproveKeysStatus();
                document.getElementById('approveApiKey').focus();
                return;
            }

            // Recopilar plantillas según plan
            let selectedTemplates = [];

            if (templateMode === 'all') {
                // GIFT: todas las plantillas
                Object.values(TEMPLATE_MAP).forEach(cat => {
                    cat.forEach(t => selectedTemplates.push(t.key));
                });
            } else if (templateMode === 'packs') {
                const packs = Array.from(document.querySelectorAll('.approve-pack-cb:checked')).map(cb => cb.value);
                if (packs.length === 0) {
                    await dashAlert('Seleccioná al menos 1 pack de especialidad', '📦');
                    return;
                }
                if (packLimit > 0 && packs.length > packLimit) {
                    await dashAlert(`Este plan permite máximo ${packLimit} packs`, '📦');
                    return;
                }
                packs.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => selectedTemplates.push(t.key));
                });
            } else if (templateMode === 'specialty') {
                // Auto: todas las de sus especialidades
                const doctorCats = _getDoctorTemplateCategories();
                doctorCats.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => selectedTemplates.push(t.key));
                });
                // + extras
                const extras = Array.from(document.querySelectorAll('.approve-extra-cb:checked')).map(cb => cb.value);
                if (specialtyExtraLimit > 0 && extras.length > specialtyExtraLimit) {
                    await dashAlert(`Este plan permite máximo ${specialtyExtraLimit} plantillas extras`, '📋');
                    return;
                }
                selectedTemplates.push(...extras);
            } else {
                // NORMAL / TRIAL
                selectedTemplates = Array.from(document.querySelectorAll('.approve-tpl-cb:checked')).map(cb => cb.value);
                if (selectedTemplates.length === 0) {
                    await dashAlert('Seleccioná al menos 1 plantilla', '📋');
                    return;
                }
                if (templateLimit > 0 && selectedTemplates.length > templateLimit) {
                    await dashAlert(`Este plan permite máximo ${templateLimit} plantillas`, '📋');
                    return;
                }
            }

            // Deduplicate
            selectedTemplates = [...new Set(selectedTemplates)];
            const templatesStr = JSON.stringify(selectedTemplates);

            const btn = document.getElementById('btnConfirmApprove');
            btn.disabled = true;
            btn.textContent = '⏳ Procesando...';

            try {
                const authStr = _getSessionAuthParams();
                // Usar POST para enviar datos grandes (imágenes base64)
                const postBody = {
                    action: 'admin_approve_registration',
                    regId, plan, apiKey, apiKeyB1, apiKeyB2,
                    maxDevices: String(maxDevices),
                    allowedTemplates: templatesStr,
                    editedHasProMode: !!planCfg.hasProMode,
                    editedHasDashboard: !!planCfg.hasDashboard,
                    editedCanGenerateApps: !!planCfg.canGenerateApps,
                    editedNombre: _editNombre,
                    editedMatricula: _editMatricula,
                    editedEmail: _editEmail,
                    editedTelefono: _editTelefono,
                    editedEspecialidades: _editEsp,
                    editedHeaderColor: _editHeaderColor,
                    editedFooterText: _editFooterText,
                    editedWorkplace: _editWp,
                    editedExtraWorkplaces: _editExtraWps,
                    editedFirma: _editFirma,
                    editedProLogo: _editProLogo,
                    editedSocialMedia: JSON.stringify(_editSocialMedia),
                    editedShowPhone: _editShowPhone,
                    editedShowEmail: _editShowEmail,
                    editedShowSocial: _editShowSocial
                };
                // Agregar auth params
                const authPairs = authStr.split('&').filter(Boolean);
                authPairs.forEach(p => { const [k,v] = p.split('='); postBody[k] = decodeURIComponent(v); });

                const res = await fetch(CONFIG.scriptUrl, {
                    method: 'POST',
                    body: JSON.stringify(postBody)
                });
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                closeApproveModal();
                showNotification(`✅ ${data.nombre} aprobado — ID: ${data.medicoId}`, 'success');

                // Ofrecer generar link
                if (data.medicoId) {
                    const generateLink = await dashConfirm(
                        `<b>Usuario creado:</b> ${data.medicoId}<br><b>Plan:</b> ${plan}<br><b>Plantillas:</b> ${selectedTemplates.length}<br><b>Dispositivos:</b> ${maxDevices >= 999 ? '∞' : maxDevices}<br><br>¿Querés abrir la Fábrica de Clones para generar el link de instalación?`,
                        '🏭'
                    );
                    if (generateLink) {
                        await _openCloneFactoryWhenReady(data.medicoId);
                    }
                }

                registrosLoaded = false;
                loadRegistrations();
            } catch (err) {
                await dashAlert('Error al aprobar: ' + err.message, '❌');
            } finally {
                btn.disabled = false;
                btn.textContent = '✅ Aprobar y Crear Usuario';
            }
        }

        async function rejectRegistration(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            const nombre = reg ? reg.Nombre : regId;

            const ok = await dashConfirm(`¿Estás seguro de rechazar el registro de <b>${escapeHtml(nombre)}</b>?`, '❌');
            if (!ok) return;

            const motivo = await dashPrompt('Motivo del rechazo (opcional):', '', '📝');
            if (motivo === null) return; // Canceló

            try {
                const authStr = _getSessionAuthParams();
                const reason = motivo || 'Rechazado por el administrador';
                const url = `${CONFIG.scriptUrl}?action=admin_reject_registration&regId=${encodeURIComponent(regId)}&motivo=${encodeURIComponent(reason)}&${authStr}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                showNotification('❌ Registro rechazado', 'info');
                registrosLoaded = false;
                loadRegistrations();
            } catch (err) {
                await dashAlert('Error al rechazar: ' + err.message, '❌');
            }
        }

        async function _openCloneFactoryWhenReady(userId, maxAttempts = 8) {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                await loadDashboard(true);
                const exists = (allUsers || []).some(u => String(u.ID_Medico) === String(userId));
                if (exists) {
                    openCloneFactory(userId);
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 700));
            }
            await dashAlert(`Usuario creado (${escapeHtml(String(userId))}) pero todavía no aparece en la tabla. Actualizá Usuarios y abrí la Fábrica manualmente con el botón 📦.`, 'ℹ️');
            return false;
        }

        async function markRegistrationPaid(regId, autoOpenApprove = false) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            const nombre = reg ? reg.Nombre : regId;

            const ok = await dashConfirm(`¿Confirmar pago del registro de <b>${escapeHtml(nombre)}</b>?`, '💳');
            if (!ok) return;

            try {
                const authStr = _getSessionAuthParams();
                const url = `${CONFIG.scriptUrl}?action=admin_mark_registration_paid&regId=${encodeURIComponent(regId)}&${authStr}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                showNotification('💳 Pago marcado como confirmado', 'success');
                registrosLoaded = false;
                await loadRegistrations();

                if (autoOpenApprove) {
                    // Esperar una refrescada más para evitar carreras de estado en el backend.
                    await new Promise(resolve => setTimeout(resolve, 700));
                    await loadRegistrations();
                    const regFresh = allRegistrations.find(r => String(r.ID_Registro) === String(regId));
                    const st = String(regFresh && regFresh.Estado || '').toLowerCase();
                    if (st === 'pago_confirmado' || st === 'comprobante_recibido' || st === 'pendiente' || st === 'pendiente_pago') {
                        openApproveModal(regId);
                    }
                }
            } catch (err) {
                await dashAlert('Error al marcar pago: ' + err.message, '❌');
            }
        }

        function copyRegLink() {
            const link = window.location.origin + window.location.pathname.replace('admin.html', 'registro.html');
            navigator.clipboard.writeText(link).then(() => {
                showNotification('📋 Link de registro copiado', 'success');
            }).catch(() => {
                dashAlert(`Copiá este link:<br><br><input type="text" value="${link}" readonly style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem;" onclick="this.select()">`, '🔗');
            });
        }

        // Load registration count on init (for badge)
        async function loadRegBadgeCount() {
            try {
                const res = await fetch(`${CONFIG.scriptUrl}?action=admin_list_registrations&${_getSessionAuthParams()}`);
                const data = await res.json();
                if (data.registrations) {
                    allRegistrations = data.registrations;
                    const pendientes = data.registrations.filter(r => ['pendiente', 'pendiente_pago', 'comprobante_recibido', 'pago_confirmado'].includes(String(r.Estado || '').toLowerCase()));
                    const badge = document.getElementById('regBadge');
                    if (badge && pendientes.length > 0) {
                        badge.textContent = pendientes.length;
                        badge.style.display = 'inline';
                    }
                }
            } catch(_) {}
        }

        // Escape key handler for new modals
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeApproveModal();
                closeDetailModal();
            }
        });
    