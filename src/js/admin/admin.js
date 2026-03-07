/* ═══════════════════════════════════════════════════════════
   Admin Dashboard — JavaScript principal
   Extraído de recursos/admin.html (líneas 2341-5748)
═══════════════════════════════════════════════════════════ */

        /* â”€â”€ Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        const CONFIG = {
            scriptUrl: 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec',
            sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours in ms
        };

        /* Helper: obtener credenciales de la sesiÃ³n para API calls */
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

        /* â”€â”€ Authentication (ya verificada en <head>, esto es solo cleanup) â”€â”€ */
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
                    dashAlert('â° Tu sesiÃ³n expirÃ³ (8 horas). VolvÃ© a iniciar sesiÃ³n.', 'â°').then(() => {
                        window.location.href = 'login.html';
                    });
                    return;
                }
                // Fallback: verificar por timestamp si no hay tokenExpiry
                const hoursSinceLogin = (Date.now() - session.timestamp) / (1000 * 60 * 60);
                if (hoursSinceLogin >= 8) {
                    sessionStorage.removeItem('adminSession');
                    dashAlert('â° Tu sesiÃ³n expirÃ³ (8 horas). VolvÃ© a iniciar sesiÃ³n.', 'â°').then(() => {
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

        /* Auto-refresh de sesiÃ³n (nunca expira, solo renueva el timestamp) */
        let _inactivityTimer = null;
        function resetInactivityTimer() {
            clearTimeout(_inactivityTimer);
            // Solo renovamos el timestamp, no redirigimos a ningÃºn lado
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
                Nombre: 'Dr. Juan PÃ©rez',
                Matricula: 'MN 12345',
                Email: 'juan.perez@example.com',
                Especialidad: 'CardiologÃ­a',
                Plan: 'trial',
                Estado: 'trial',
                Fecha_Registro: '2026-02-15',
                Fecha_Vencimiento: '2026-02-22',
                Devices_Max: 2,
                Usage_Count: 5,
                Notas_Admin: 'Usuario de prueba - trial activo'
            },
            {
                ID_Medico: 'DR002',
                Nombre: 'Dra. MarÃ­a GarcÃ­a',
                Matricula: 'MP 67890',
                Email: 'maria.garcia@example.com',
                Especialidad: 'ORL',
                Plan: 'pro',
                Estado: 'active',
                Fecha_Registro: '2026-01-10',
                Fecha_Vencimiento: '2026-12-31',
                Devices_Max: 5,
                Usage_Count: 127,
                Notas_Admin: 'Cliente pagado - plan anual'
            },
            {
                ID_Medico: 'DR003',
                Nombre: 'Dr. Carlos RodrÃ­guez',
                Matricula: 'MN 11111',
                Email: 'carlos.r@example.com',
                Especialidad: 'GastroenterologÃ­a',
                Plan: 'trial',
                Estado: 'expired',
                Fecha_Registro: '2026-01-20',
                Fecha_Vencimiento: '2026-01-27',
                Devices_Max: 2,
                Usage_Count: 23,
                Notas_Admin: 'Trial expirado - seguimiento pendiente'
            }
        ];

        /* â”€â”€ Enhanced API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

            async requestDiagnostic(userId) {
                return await this.call(`?action=admin_request_diagnostic&userId=${encodeURIComponent(userId)}`);
            }
        };

        /* â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        let allUsers = [];
        let currentEditUser = null;
        let refreshInterval = null;
        let notificationTimer = null;
        let metricsLoaded = false;
        let logsLoaded = false;
        let registrosLoaded = false;
        let allRegistrations = [];

        /* â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function fetchUsers() {
            if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                /* Backend not yet configured â€” use sample data */
                return SAMPLE_USERS;
            }
            try {
                const url = `${CONFIG.scriptUrl}?action=admin_list_users&${_getSessionAuthParams()}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                // Detectar error de autenticaciÃ³n del backend
                if (data.error) {
                    const errLower = (data.error || '').toLowerCase();
                    if (errLower.includes('unauthorized') || errLower.includes('expired') || errLower.includes('invalid session')) {
                        console.warn('Session expired on backend:', data.error);
                        sessionStorage.removeItem('adminSession');
                        dashAlert('â° Tu sesiÃ³n expirÃ³. VolvÃ© a iniciar sesiÃ³n.', 'â°').then(() => {
                            window.location.href = 'login.html';
                        });
                        return [];
                    }
                    throw new Error(data.error);
                }

                return data.users || [];
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

        /* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        function getStatusText(estado) {
            const map = {
                active: 'âœ… Activo',
                trial: 'â° Trial',
                expired: 'âš ï¸ Expirado',
                banned: 'ðŸš« Bloqueado'
            };
            return map[estado] || estado;
        }

        function formatDate(dateStr) {
            if (!dateStr) return 'â€”';
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
            const icons = { success: 'âœ“', error: 'âœ•', info: 'â„¹', warning: 'âš ' };
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = 'Ã—';
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

        // â”€â”€ Custom Modal (reemplaza alert/confirm/prompt del navegador) â”€â”€
        let _dashModalResolve = null;

        function dashAlert(msg, icon = 'âš ï¸') {
            return new Promise(resolve => {
                _dashModalResolve = resolve;
                document.getElementById('dashModalIcon').textContent = icon;
                document.getElementById('dashModalMsg').innerHTML = msg;
                document.getElementById('dashModalInput').style.display = 'none';
                document.getElementById('dashModalActions').innerHTML = '<button class="btn-primary" onclick="closeDashModal(true)" style="min-width:100px;">Aceptar</button>';
                document.getElementById('dashModalOverlay').classList.add('show');
            });
        }

        function dashConfirm(msg, icon = 'â“') {
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

        function dashPrompt(msg, defaultVal = '', icon = 'âœï¸') {
            return new Promise(resolve => {
                _dashModalResolve = resolve;
                document.getElementById('dashModalIcon').textContent = icon;
                document.getElementById('dashModalMsg').innerHTML = msg;
                const inputDiv = document.getElementById('dashModalInput');
                const inputField = document.getElementById('dashModalInputField');
                inputDiv.style.display = 'block';
                inputField.value = defaultVal;
                inputField.placeholder = 'EscribÃ­ acÃ¡...';
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

        /* â”€â”€ Tab Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        function showTab(tabName) {
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
            if (tabName === 'registros' && !registrosLoaded) {
                loadRegistrations();
                registrosLoaded = true;
            } else if (tabName === 'metricas' && !metricsLoaded) {
                loadGlobalStats();
                metricsLoaded = true;
            } else if (tabName === 'logs' && !logsLoaded) {
                loadLogs();
                logsLoaded = true;
            } else if (tabName === 'planes') {
                _initPlansEditor();
            }
        }

        /* â”€â”€ User Metrics Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function openUserMetrics(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            const modal = document.getElementById('userMetricsModal');
            const title = document.getElementById('userMetricsTitle');
            if (user) title.textContent = `ðŸ“Š MÃ©tricas â€” ${user.Nombre}`;
            modal.style.display = 'flex';

            // Reset
            ['umTranscriptions','umWords','umMinutes'].forEach(id => document.getElementById(id).textContent = 'â³');
            document.getElementById('userDevicesList').innerHTML = '<li>Cargando...</li>';
            document.getElementById('umLastActivity').textContent = 'â³';
            document.getElementById('userUsageChart').innerHTML = '';

            try {
                await logAdminAction('view', userId, `Vista mÃ©tricas usuario ${userId}`);
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
                ultima_actividad: user.Ultima_Actividad || user.Fecha_Registro || 'â€”',
                dispositivos: [{ nombre: 'Dispositivo principal', fecha: user.Fecha_Registro || 'â€”' }],
                uso_7dias: days
            };
        }

        function renderUserMetrics(data) {
            const fmtNum = v => (v != null ? Number(v).toLocaleString() : 'â€”');
            document.getElementById('umTranscriptions').textContent = fmtNum(data.transcripciones);
            document.getElementById('umWords').textContent = fmtNum(data.palabras);
            document.getElementById('umMinutes').textContent = fmtNum(data.minutos);
            document.getElementById('umLastActivity').textContent = data.ultima_actividad || 'â€”';

            // Devices list
            const devList = document.getElementById('userDevicesList');
            const devices = data.dispositivos || [];
            if (devices.length === 0) {
                devList.innerHTML = '<li>Sin dispositivos registrados</li>';
            } else {
                devList.innerHTML = devices.map(d =>
                    `<li>ðŸ“± <strong>${escapeHtml(d.nombre || d.id || 'Dispositivo')}</strong><small style="margin-left:auto;color:var(--text-secondary)">${escapeHtml(d.fecha || '')}</small></li>`
                ).join('');
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

        /* â”€â”€ DiagnÃ³stico Remoto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function openDiagModal(userId) {
            const modal = document.getElementById('diagModal');
            const body  = document.getElementById('diagModalBody');
            modal.dataset.userId = userId;
            document.getElementById('diagModalTitle').textContent = `ðŸ”§ DiagnÃ³stico â€” ${userId}`;
            body.innerHTML = '<p style="color:var(--text-secondary);">â³ Cargando diagnÃ³stico...</p>';
            modal.style.display = 'flex';

            try {
                const data = await API.getDiagnostic(userId);
                renderDiagReport(data.diagnostic, body);
            } catch (err) {
                body.innerHTML = `<p style="color:var(--danger);">âŒ Error: ${escapeHtml(err.message)}</p>`;
            }
        }

        function closeDiagModal() {
            document.getElementById('diagModal').style.display = 'none';
        }

        function renderDiagReport(diag, container) {
            if (!diag || !diag.report) {
                container.innerHTML = '<p style="color:var(--text-secondary);">Sin diagnÃ³stico disponible. Use ðŸ“¡ para solicitar uno.</p>';
                return;
            }
            const r   = diag.report;
            const ts  = diag.Timestamp || r.timestamp || 'â€”';
            const fmt = (v) => v == null ? 'â€”' : String(v);
            const yesNo = (v) => v ? 'âœ… SÃ­' : 'âŒ No';

            const statusColor = r.api_key_last_status === 'valid'
                ? 'var(--success)' : r.api_key_last_status === 'invalid'
                ? 'var(--danger)' : 'var(--warning)';

            container.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;">

                    <div style="grid-column:1/-1;background:var(--bg-main);border-radius:6px;padding:0.6rem 0.75rem;margin-bottom:0.25rem;">
                        <strong>ðŸ—“ Enviado:</strong> ${escapeHtml(fmt(ts).replace('T',' ').slice(0,19))}
                        &nbsp;&bull;&nbsp; <strong>Device:</strong> ${escapeHtml(fmt(r.device_id))}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">Profesional</strong>
                        <span>ðŸ‘¤ ${escapeHtml(fmt(r.nombre))}</span>
                        <span>ðŸªª ${escapeHtml(fmt(r.matricula))}</span>
                        <span>Perfil completo: ${yesNo(r.prof_data_complete)}</span>
                        <span>Logo: ${yesNo(r.has_logo)} &nbsp; Firma: ${yesNo(r.has_signature)}</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">API Key</strong>
                        <span>Presente: ${yesNo(r.api_key_present)}</span>
                        <span>Estado: <strong style="color:${statusColor}">${escapeHtml(fmt(r.api_key_last_status))}</strong></span>
                        <span>Ãšltimo check: ${escapeHtml(fmt(r.api_key_last_check).replace('T',' ').slice(0,19))}</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">App</strong>
                        <span>Modo: ${escapeHtml(fmt(r.current_mode))}</span>
                        <span>Cola pendiente: ${escapeHtml(fmt(r.pending_queue_count))}</span>
                        <span>Cliente: ${escapeHtml(fmt(r.client_type))} / ${escapeHtml(fmt(r.client_status))}</span>
                        ${r.last_struct_error ? `<span style="color:var(--danger);font-size:0.8rem;">âš ï¸ ${escapeHtml(fmt(r.last_struct_error).slice(0,120))}</span>` : ''}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        <strong style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;">Entorno</strong>
                        <span>Online: ${yesNo(r.online)} &nbsp; PWA: ${yesNo(r.pwa_installed)}</span>
                        <span>SW activo: ${yesNo(r.sw_active)}</span>
                        <span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml((r.user_agent || '').slice(0,90))}${(r.user_agent||'').length>90?'â€¦':''}</span>
                    </div>

                </div>`;
        }

        async function requestDiagFromAdmin(userId) {
            try {
                await API.requestDiagnostic(userId);
                showToast(`ðŸ“¡ DiagnÃ³stico solicitado para ${userId}`, 'success');
                await logAdminAction('request_diagnostic', userId, 'Solicitud de diagnÃ³stico remoto');
            } catch (err) {
                showToast(`âŒ Error: ${err.message}`, 'error');
            }
        }
        async function loadGlobalStats() {
            try {
                const resp = await API.getGlobalStats();
                // La API devuelve { stats: {...} } â€” mapeamos a la estructura que espera renderGlobalStats
                const s = resp.stats || resp;
                const data = {
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
                renderGlobalStats(data);
            } catch (_) {
                renderGlobalStats(buildMockGlobalStats());
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
            const fmt = v => (v != null ? Number(v).toLocaleString() : 'â€”');
            document.getElementById('mTranscriptions').textContent = fmt(data.transcripciones_mes);
            document.getElementById('mWords').textContent = fmt(data.palabras_mes);
            document.getElementById('mMrr').textContent = data.mrr != null ? `$${fmt(data.mrr)}` : 'â€”';
            document.getElementById('mActiveToday').textContent = fmt(data.activos_hoy);
            document.getElementById('mActiveWeek').textContent = fmt(data.activos_semana);
            document.getElementById('mConversion').textContent = data.conversion != null ? `${data.conversion}%` : 'â€”';

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
            const medals = ['ðŸ¥‡','ðŸ¥ˆ','ðŸ¥‰','4ï¸âƒ£','5ï¸âƒ£'];
            const top = data.top_usuarios || [];
            if (top.length > 0) {
                topEl.innerHTML = top.map((u, i) => `
                    <div class="top-user-row">
                        <span class="top-user-rank">${medals[i] || (i+1)}</span>
                        <div class="top-user-info">
                            <strong>${escapeHtml(u.nombre || 'â€”')}</strong><br>
                            <small>${escapeHtml(u.plan || 'â€”').toUpperCase()}</small>
                        </div>
                        <span class="top-user-count">${(u.usage || 0).toLocaleString()}</span>
                    </div>`).join('');
            } else {
                topEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;">Sin datos</p>';
            }
        }

        /* â”€â”€ Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function loadLogs() {
            const tbody = document.getElementById('logsTableBody');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">â³ Cargando logs...</td></tr>';
            const filterDate = document.getElementById('logFilterDate').value;
            const filterType = document.getElementById('logFilterType').value;

            try {
                const data = await API.getLogs(filterDate, filterType);
                renderLogs(data.logs || []);
            } catch (_) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sin logs disponibles</td></tr>';
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
                    <td><small>${escapeHtml(log.timestamp || log.fecha || 'â€”')}</small></td>
                    <td>${escapeHtml(log.admin || 'â€”')}</td>
                    <td><span class="log-action-badge log-${escapeHtml(type)}">${escapeHtml(log.type || log.accion || 'â€”')}</span></td>
                    <td>${escapeHtml(log.userId || log.usuario_afectado || 'â€”')}</td>
                    <td><small>${escapeHtml(log.details || log.detalles || 'â€”')}</small></td>
                </tr>`;
            }).join('');
        }

        /* â”€â”€ Log Admin Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function logAdminAction(action, userId, details) {
            try {
                await API.logAction(action, userId, details);
            } catch (_) { /* non-blocking */ }
        }

        /* â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        function renderTable(users) {
            const tbody = document.getElementById('tableBody');
            if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay usuarios registrados</td></tr>';
                return;
            }

            const maxUsage = Math.max(...users.map(u => u.Usage_Count || 0), 1);
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            tbody.innerHTML = users.map(user => {
                const plan    = user.Plan || 'trial';
                const id      = escapeHtml(String(user.ID_Medico));
                const isBanned  = user.Estado === 'banned';
                const isTrial   = user.Estado === 'trial';
                const isExpired = user.Estado === 'expired';
                const usage     = user.Usage_Count || 0;
                const usagePct  = Math.round((usage / maxUsage) * 100);
                const highUsage = usagePct >= 80 ? ' high' : '';
                const lastActivity = user.Ultima_Actividad || user.Fecha_Registro || '';
                const lastActivityMs = lastActivity ? new Date(lastActivity).getTime() : NaN;
                const isActiveToday = !isNaN(lastActivityMs) && (now - lastActivityMs) < oneDayMs;
                const activityDisplay = lastActivity ? formatDate(lastActivity.split('T')[0]) : 'â€”';
                return `
                <tr data-user-id="${id}" class="${isBanned ? 'row-banned' : ''}">
                    <td data-label="ID"><span class="user-id">${id}</span></td>
                    <td data-label="Nombre" class="user-name-cell"><div class="user-name-wrap"><span class="user-full-name"><strong>${escapeHtml(user.Nombre)}</strong>${isActiveToday ? '<span class="active-indicator" title="Activo hoy">ðŸ”¥</span>' : ''}</span><span class="user-matricula">${escapeHtml(user.Matricula || '')}</span></div></td>
                    <td data-label="Especialidad"><span class="badge badge-specialty">${escapeHtml(user.Especialidad)}</span></td>
                    <td data-label="Plan"><span class="badge badge-plan badge-${escapeHtml(plan)}">${escapeHtml(plan.toUpperCase())}</span></td>
                    <td data-label="Estado"><span class="status-badge status-${escapeHtml(user.Estado)}">${getStatusText(user.Estado)}</span></td>
                    <td data-label="Vencimiento" class="col-expiration">${formatDate(user.Fecha_Vencimiento)}</td>
                    <td data-label="Uso" class="col-usage">
                        <div class="usage-bar-wrap">
                            <span class="usage-count">${usage}</span>
                            <div class="usage-bar"><div class="usage-bar-fill${highUsage}" style="width:${usagePct}%"></div></div>
                        </div>
                    </td>
                    <td data-label="Ãšltima Actividad" class="col-activity">${activityDisplay}</td>
                    <td data-label="Acciones" class="actions-cell">
                        <button class="btn-action" data-action="edit" data-user-id="${id}" title="Editar">âœï¸</button>
                        <button class="btn-action" data-action="metrics" data-user-id="${id}" title="Ver MÃ©tricas">ðŸ“Š</button>
                        <button class="btn-action" data-action="clone" data-user-id="${id}" title="Crear App para este usuario">ðŸ“¦</button>
                        <button class="btn-action" data-action="mail" data-user-id="${id}" title="Enviar email a ${escapeHtml(user.Nombre || user.Email)}">ðŸ“§</button>
                        ${isTrial || isExpired ? `<button class="btn-action" data-action="activate" data-user-id="${id}" title="Activar PRO">âœ…</button>` : ''}
                        <button class="btn-action" data-action="diag" data-user-id="${id}" title="Ver Ãºltimo diagnÃ³stico">ðŸ”</button>
                        <button class="btn-action" data-action="reqdiag" data-user-id="${id}" title="Solicitar diagnÃ³stico remoto">ðŸ“¡</button>
                        <button class="btn-action" data-action="ban" data-user-id="${id}" title="${isBanned ? 'Desbloquear' : 'Bloquear'}">${isBanned ? 'ðŸ”“' : 'ðŸš«'}</button>
                    </td>
                </tr>`;
            }).join('');
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        /* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

        /* â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

        /* â”€â”€ Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
            saveBtn.textContent = 'â³ Guardando...';

            const result = await updateUser(userId, updates);

            saveBtn.disabled = false;
            saveBtn.textContent = 'ðŸ’¾ Guardar Cambios';

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
            showToast('Usuario actualizado correctamente âœ…', 'success');
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
            saveBtn.textContent = 'â³ Guardando...';
            saveBtn.disabled = true;

            try {
                if (CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') {
                    /* Simulate success when backend is not configured */
                    const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                    if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...updates };
                    showNotification('âœ… Usuario actualizado correctamente', 'success');
                    await logAdminAction('edit', userId, `Plan: ${updates.Plan}, Estado: ${updates.Estado}`);
                    closeEditModal();
                    updateStats(allUsers);
                    applyFilters();
                } else {
                    await API.updateUser(userId, updates);
                    showNotification('âœ… Usuario actualizado correctamente', 'success');
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

        /* â”€â”€ Quick Ban â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function quickBan(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const newStatus = user.Estado === 'banned' ? 'active' : 'banned';
            const action    = newStatus === 'banned' ? 'bloquear' : 'desbloquear';

            const ok = await dashConfirm(`Â¿Confirmar ${action} a <b>${escapeHtml(user.Nombre)}</b>?`, newStatus === 'banned' ? 'ðŸš«' : 'âœ…');
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
                showNotification(`Usuario ${action === 'bloquear' ? 'bloqueado ðŸš«' : 'desbloqueado âœ…'}`, newStatus === 'banned' ? 'info' : 'success');
            } catch (error) {
                showNotification(`Error al ${action} usuario`, 'error');
            }
        }

        /* â”€â”€ Activate User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function activateUser(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;

            const ok = await dashConfirm(`Â¿Activar suscripciÃ³n PRO para <b>${escapeHtml(user.Nombre)}</b>?`, 'â­');
            if (!ok) return;

            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            const formattedDate = expirationDate.toISOString().split('T')[0];

            const updates = {
                Plan:              'pro',
                Estado:            'active',
                Fecha_Vencimiento: formattedDate,
                Devices_Max:       5,
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
                showNotification(`âœ… ${user.Nombre} activado - Plan PRO hasta ${formattedDate}`, 'success');
            } catch (error) {
                showNotification('Error al activar usuario', 'error');
            }
        }

        /* â”€â”€ Load Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        async function loadUsers() {
            await loadDashboard();
        }

        async function loadDashboard(silent = false) {
            if (!silent) {
                document.getElementById('tableBody').innerHTML =
                    '<tr><td colspan="9" class="text-center">â³ Cargando datos...</td></tr>';
            }

            try {
                allUsers = await fetchUsers();
                updateStats(allUsers);
                applyFilters();

                if (!silent) {
                    showNotification(`âœ… ${allUsers.length} usuarios cargados`, 'success');
                }
            } catch (error) {
                document.getElementById('tableBody').innerHTML =
                    `<tr><td colspan="9" class="text-center">âŒ Error al cargar datos: ${escapeHtml(error.message)}</td></tr>`;
            }
        }

        function startAutoRefresh(intervalMinutes = 5) {
            if (refreshInterval) clearInterval(refreshInterval);

            refreshInterval = setInterval(async () => {
                console.log('Auto-refreshing dashboard...');
                await loadDashboard(true);
            }, intervalMinutes * 60 * 1000);
        }

        /* â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        document.getElementById('btnLogout').addEventListener('click', () => {
            sessionStorage.removeItem('adminSession');
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
            else if (btn.dataset.action === 'activate') activateUser(userId);
            else if (btn.dataset.action === 'diag') openDiagModal(userId);
            else if (btn.dataset.action === 'reqdiag') requestDiagFromAdmin(userId);
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

        /* DiagnÃ³stico modal */
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

        /* â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        document.addEventListener('DOMContentLoaded', async () => {
            // Set admin name in header
            try {
                const session = JSON.parse(sessionStorage.getItem('adminSession') || '{}');
                if (session.nombre) {
                    document.getElementById('adminName').textContent = session.nombre;
                }
            } catch (_) {}

            await loadDashboard();
            startAutoRefresh(5);

            // Cargar API Keys guardadas en el tab Mis Keys
            loadAdminKeys();

            // Load registration badge count (non-blocking)
            loadRegBadgeCount();

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

            // FÃ¡brica de clones â€” listeners
            document.getElementById('btnCloseCloneFactory')?.addEventListener('click', closeCloneFactory);
            document.getElementById('cloneFactoryModal')?.addEventListener('click', function(e) {
                if (e.target === this) closeCloneFactory();
            });

            // BotÃ³n Regalo en header
            document.getElementById('btnGiftUser')?.addEventListener('click', () => openGiftFactory());

            // FÃ¡brica de clones â€” botones del modal (HTML estÃ¡ despuÃ©s del script)
            document.getElementById('cfBtnGenerate')?.addEventListener('click', handleCfGenerate);
            document.getElementById('cfBtnCopyLink')?.addEventListener('click', handleCfCopyLink);
            document.getElementById('cfBtnWhatsApp')?.addEventListener('click', handleCfWhatsApp);
            document.getElementById('cfBtnEmail')?.addEventListener('click', handleCfEmail);

            // â”€â”€ Gift Wizard: Drag & Drop delegado para upload zones â”€â”€
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

        const ESPECIALIDADES = [
            'NeumologÃ­a',
            'OftalmologÃ­a',
            'ImÃ¡genes',
            'EndoscopÃ­a',
            'CardiologÃ­a',
            'GinecologÃ­a',
            'General',
            'QuirÃºrgico'
        ];

        const ESTUDIOS_POR_ESPECIALIDAD = {
            'NeumologÃ­a': ['EspirometrÃ­a', 'Test Marcha 6min', 'PletismografÃ­a', 'OximetrÃ­a Nocturna'],
            'OftalmologÃ­a': ['CampimetrÃ­a', 'OCT Retinal', 'TopografÃ­a Corneal', 'Fondo de Ojo'],
            'ImÃ¡genes': ['TAC', 'RMN', 'MamografÃ­a', 'DensitometrÃ­a', 'PET-CT', 'RadiografÃ­a', 'EcografÃ­a'],
            'EndoscopÃ­a': ['GastroscopÃ­a', 'ColonoscopÃ­a', 'BroncoscopÃ­a', 'LaringoscopÃ­a'],
            'CardiologÃ­a': ['GammagrafÃ­a', 'Holter', 'MAPA', 'CinecoronariografÃ­a', 'ECG', 'Eco-Stress'],
            'GinecologÃ­a': ['PAP', 'ColposcopÃ­a'],
            'General': ['Informe Evolutivo', 'Epicrisis', 'Certificado'],
            'QuirÃºrgico': ['Protocolo Operatorio', 'Parte de CirugÃ­a']
        };

        // â”€â”€ Mapeo de template keys agrupados por categorÃ­a (sincronizado con templates.js) â”€â”€
        const TEMPLATE_MAP = {
            'NeumologÃ­a': [
                { key: 'espirometria', name: 'EspirometrÃ­a' },
                { key: 'test_marcha', name: 'Test Marcha 6 min' },
                { key: 'pletismografia', name: 'PletismografÃ­a' },
                { key: 'oximetria_nocturna', name: 'OximetrÃ­a Nocturna' }
            ],
            'OftalmologÃ­a': [
                { key: 'campimetria', name: 'CampimetrÃ­a' },
                { key: 'oct_retinal', name: 'OCT Retinal' },
                { key: 'topografia_corneal', name: 'TopografÃ­a Corneal' },
                { key: 'fondo_ojo', name: 'Fondo de Ojo' }
            ],
            'ImÃ¡genes': [
                { key: 'tac', name: 'TAC' },
                { key: 'resonancia', name: 'Resonancia' },
                { key: 'mamografia', name: 'MamografÃ­a' },
                { key: 'densitometria', name: 'DensitometrÃ­a' },
                { key: 'pet_ct', name: 'PET-CT' },
                { key: 'radiografia', name: 'RadiografÃ­a' },
                { key: 'ecografia_abdominal', name: 'EcografÃ­a Abdominal' },
                { key: 'eco_doppler', name: 'Eco-Doppler' }
            ],
            'EndoscopÃ­a': [
                { key: 'gastroscopia', name: 'GastroscopÃ­a' },
                { key: 'colonoscopia', name: 'ColonoscopÃ­a' },
                { key: 'broncoscopia', name: 'BroncoscopÃ­a' },
                { key: 'laringoscopia', name: 'LaringoscopÃ­a' }
            ],
            'CardiologÃ­a': [
                { key: 'gammagrafia_cardiaca', name: 'GammagrafÃ­a CardÃ­aca' },
                { key: 'holter', name: 'Holter' },
                { key: 'mapa', name: 'MAPA' },
                { key: 'cinecoro', name: 'CinecoronariografÃ­a' },
                { key: 'ecg', name: 'ECG' },
                { key: 'eco_stress', name: 'Eco-Stress' },
                { key: 'ett', name: 'Ecocardiograma TT' }
            ],
            'GinecologÃ­a': [
                { key: 'pap', name: 'PAP' },
                { key: 'colposcopia', name: 'ColposcopÃ­a' }
            ],
            'NeurologÃ­a': [
                { key: 'electromiografia', name: 'ElectromiografÃ­a' },
                { key: 'polisomnografia', name: 'PolisomnografÃ­a' }
            ],
            'ORL': [
                { key: 'naso', name: 'NasofibroscopÃ­a' },
                { key: 'endoscopia_otologica', name: 'EndoscopÃ­a OtolÃ³gica' }
            ],
            'QuirÃºrgico': [
                { key: 'protocolo_quirurgico', name: 'Protocolo QuirÃºrgico' }
            ],
            'General': [
                { key: 'nota_evolucion', name: 'Nota de EvoluciÃ³n' },
                { key: 'epicrisis', name: 'Epicrisis' },
                { key: 'generico', name: 'Informe GenÃ©rico' }
            ]
        };

        // â”€â”€ Mapeo: especialidad del formulario de registro â†’ categorÃ­a(s) de plantillas â”€â”€
        const FORM_ESP_TO_TEMPLATE_CAT = {
            'CardiologÃ­a': ['CardiologÃ­a'],
            'EcografÃ­a General': ['ImÃ¡genes'],
            'Eco-Doppler Vascular': ['ImÃ¡genes'],
            'DiagnÃ³stico por ImÃ¡genes': ['ImÃ¡genes'],
            'GastroenterologÃ­a / EndoscopÃ­a': ['EndoscopÃ­a'],
            'ORL (OtorrinolaringologÃ­a)': ['ORL'],
            'GinecologÃ­a': ['GinecologÃ­a'],
            'Obstetricia': [],
            'NeumonologÃ­a / NeumologÃ­a': ['NeumologÃ­a'],
            'NeurologÃ­a': ['NeurologÃ­a'],
            'OftalmologÃ­a': ['OftalmologÃ­a'],
            'CirugÃ­a / QuirÃºrgico': ['QuirÃºrgico'],
            'Medicina General / Interna': ['General'],
            'TraumatologÃ­a / Ortopedia': [],
            'DermatologÃ­a': [],
            'EndocrinologÃ­a': [],
            'UrologÃ­a': []
        };

        // â”€â”€ Dispositivos por plan â”€â”€
        const DEVICES_POR_PLAN = { NORMAL: 2, PRO: 5, CLINIC: 999, TRIAL: 2, GIFT: 10 };

        // ========== EDITAR USUARIO ==========

        async function openEditUserModal(userId) {
            try {
                const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
                if (!user) {
                    showToast('Usuario no encontrado', 'error');
                    return;
                }

                document.getElementById('editUserId2').value = user.ID_Medico;
                document.getElementById('editUserTitle').textContent = user.Nombre;
                document.getElementById('editNombre').value = user.Nombre || '';
                document.getElementById('editMatricula').value = user.Matricula || '';
                document.getElementById('editEmail').value = user.Email || '';
                document.getElementById('editTelefono').value = user.Telefono || '';
                document.getElementById('editPlanEdit').value = user.Plan || 'trial';
                document.getElementById('editEstado').value = user.Estado || 'trial';
                document.getElementById('editDevicesMaxEdit').value = user.Devices_Max || 2;
                document.getElementById('editNotasEdit').value = user.Notas_Admin || '';
                document.getElementById('editLugaresTrabajo').value = user.Lugares_Trabajo || '';

                if (user.Fecha_Vencimiento) {
                    document.getElementById('editFechaVencimiento').value = user.Fecha_Vencimiento.split('T')[0];
                }

                const selectedEsp = user.Especialidad
                    ? user.Especialidad.split(',').map(s => s.trim())
                    : [];
                initEditEspecialidadesGrid(selectedEsp);

                document.getElementById('editUserModal').style.display = 'flex';
            } catch (error) {
                console.error('Error loading user for edit:', error);
                showToast('Error al cargar usuario', 'error');
            }
        }

        function initEditEspecialidadesGrid(selectedEsp = []) {
            const grid = document.getElementById('editEspecialidadesGrid');
            grid.innerHTML = ESPECIALIDADES.map(esp => {
                const isChecked = selectedEsp.includes(esp) ? 'checked' : '';
                return `
                    <div class="checkbox-item">
                        <input type="checkbox" id="editesp_${esp.replace(/\s+/g, '_')}" value="${esp}" ${isChecked}>
                        <label for="editesp_${esp.replace(/\s+/g, '_')}">${esp}</label>
                    </div>
                `;
            }).join('');

            grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', updateEditEstudiosGrid);
            });

            updateEditEstudiosGrid();
        }

        function updateEditEstudiosGrid() {
            const selectedEspecialidades = Array.from(
                document.querySelectorAll('#editEspecialidadesGrid input:checked')
            ).map(cb => cb.value);

            const estudiosGrid = document.getElementById('editEstudiosGrid');

            if (selectedEspecialidades.length === 0) {
                estudiosGrid.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;">Seleccione al menos una especialidad</p>';
                return;
            }

            const estudios = selectedEspecialidades.flatMap(esp =>
                (ESTUDIOS_POR_ESPECIALIDAD[esp] || []).map(estudio => ({ esp, estudio }))
            );

            estudiosGrid.innerHTML = estudios.map(({ esp, estudio }) => `
                <div class="checkbox-item">
                    <input type="checkbox" id="editest_${estudio.replace(/\s+/g, '_')}" value="${estudio}" data-especialidad="${esp}">
                    <label for="editest_${estudio.replace(/\s+/g, '_')}">${estudio} <small style="color:var(--text-secondary);">(${esp})</small></label>
                </div>
            `).join('');
        }

        function closeEditUserModal() {
            const modal = document.getElementById('editUserModal');
            if (modal) modal.style.display = 'none';
        }

        async function handleEditUserSubmit(e) {
            e.preventDefault();

            const userId = document.getElementById('editUserId2').value;

            const selectedEspecialidades = Array.from(
                document.querySelectorAll('#editEspecialidadesGrid input:checked')
            ).map(cb => cb.value);

            const selectedEstudios = Array.from(
                document.querySelectorAll('#editEstudiosGrid input:checked')
            ).map(cb => ({ nombre: cb.value, especialidad: cb.dataset.especialidad }));

            const userData = {
                Nombre: document.getElementById('editNombre').value,
                Matricula: document.getElementById('editMatricula').value,
                Email: document.getElementById('editEmail').value,
                Telefono: document.getElementById('editTelefono').value,
                Especialidad: selectedEspecialidades.join(', '),
                Plan: document.getElementById('editPlanEdit').value,
                Estado: document.getElementById('editEstado').value,
                Fecha_Vencimiento: document.getElementById('editFechaVencimiento').value,
                Devices_Max: parseInt(document.getElementById('editDevicesMaxEdit').value, 10) || 2,
                Notas_Admin: document.getElementById('editNotasEdit').value,
                Lugares_Trabajo: document.getElementById('editLugaresTrabajo').value,
                Estudios_JSON: JSON.stringify(selectedEstudios)
            };

            const btnSave = document.getElementById('btnSaveEditUser');
            btnSave.disabled = true;
            btnSave.textContent = 'â³ Guardando...';

            try {
                const result = await updateUser(userId, userData);

                if (result.error) {
                    throw new Error(result.error);
                }

                // Update local state
                const idx = allUsers.findIndex(u => String(u.ID_Medico) === String(userId));
                if (idx !== -1) {
                    allUsers[idx] = { ...allUsers[idx], ...userData };
                }

                updateStats(allUsers);
                applyFilters();
                closeEditUserModal();
                showToast('âœ… Usuario actualizado correctamente', 'success');
            } catch (error) {
                console.error('Error updating user:', error);
                showToast('Error: ' + error.message, 'error');
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = 'ðŸ’¾ Guardar Cambios';
            }
        }

        // ========== FIN EDITAR USUARIO ==========

        // ========== FÃBRICA DE CLONES ==========
        const CF_APP_BASE_URL = 'https://transcriptorpro.github.io/transcripcion/';

        let _cfCurrentUser = null;
        let _cfMode = 'normal'; // 'normal' | 'gift'

        /**
         * Abre la FÃ¡brica de Clones en modo NORMAL (usuario existente)
         */
        function openCloneFactory(userId) {
            const user = allUsers.find(u => String(u.ID_Medico) === String(userId));
            if (!user) return;
            _cfCurrentUser = user;
            _cfMode = 'normal';

            // TÃ­tulo
            document.getElementById('cfModalTitle').textContent = 'ðŸ“¦ Generar App para Usuario';

            // Mostrar modo normal, ocultar gift
            document.getElementById('cfModeNormal').style.display = 'block';
            document.getElementById('cfModeGift').style.display = 'none';
            document.getElementById('cfApiKeyLabel').textContent = '(para este usuario)';

            // Rellenar datos en el modal
            document.getElementById('cfUserId').textContent      = user.ID_Medico   || 'â€”';
            document.getElementById('cfUserName').textContent     = user.Nombre      || 'â€”';
            document.getElementById('cfMatricula').textContent    = user.Matricula   || 'â€”';
            document.getElementById('cfEspecialidad').textContent = user.Especialidad || 'â€”';
            document.getElementById('cfPlan').textContent         = (user.Plan || 'trial').toUpperCase();
            document.getElementById('cfEmail').textContent        = user.Email       || 'â€”';

            // Reset estado â€” API Key en modo lectura (ya configurada en la aprobaciÃ³n)
            const cfApiKeyInput = document.getElementById('cfApiKey');
            cfApiKeyInput.value = user.API_Key || '';
            cfApiKeyInput.readOnly = true;
            cfApiKeyInput.style.background = '#f8fafc';
            cfApiKeyInput.style.opacity = '0.75';
            cfApiKeyInput.style.cursor = 'default';
            const cfHint = document.getElementById('cfApiKeyHint');
            if (cfHint) cfHint.textContent = user.API_Key
                ? 'âœ… Configurada durante la aprobaciÃ³n â€” solo lectura'
                : 'âš ï¸ Sin API Key configurada â€” el usuario deberÃ¡ ingresarla manualmente';
            // Backup keys (solo lectura en modo normal)
            const cfB1 = document.getElementById('cfApiKeyB1');
            const cfB2 = document.getElementById('cfApiKeyB2');
            if (cfB1) { cfB1.value = user.API_Key_B1 || ''; cfB1.readOnly = true; cfB1.style.background = '#f8fafc'; cfB1.style.opacity = '0.75'; cfB1.style.cursor = 'default'; }
            if (cfB2) { cfB2.value = user.API_Key_B2 || ''; cfB2.readOnly = true; cfB2.style.background = '#f8fafc'; cfB2.style.opacity = '0.75'; cfB2.style.cursor = 'default'; }
            document.getElementById('cfLinkResult').style.display = 'none';

            // BotÃ³n
            const btn = document.getElementById('cfBtnGenerate');
            btn.textContent = 'ðŸ”— Generar Link';
            btn.style.background = '';

            document.getElementById('cloneFactoryModal').style.display = 'flex';
        }

        /**
         * Abre la FÃ¡brica de Clones en modo GIFT (crear usuario regalo)
         */
        function openGiftFactory() {
            _cfCurrentUser = null;
            _cfMode = 'gift';

            // TÃ­tulo
            document.getElementById('cfModalTitle').textContent = 'ðŸŽ Crear Usuario Regalo';

            // Mostrar modo gift, ocultar normal
            document.getElementById('cfModeNormal').style.display = 'none';
            document.getElementById('cfModeGift').style.display = 'block';
            document.getElementById('cfApiKeyLabel').textContent = '(para el usuario regalo)';

            // Reset campos gift â€” Paso 1
            document.getElementById('giftNombre').value = '';
            document.getElementById('giftEmail').value = '';
            document.getElementById('giftMatricula').value = '';
            document.getElementById('giftTelefono').value = '';
            document.getElementById('giftEspecialidad').value = '';

            // Reset campos gift â€” Paso 2 (Workplaces)
            _giftWpCounter = 0;
            _giftWpLogoData = {};
            const wpContainer = document.getElementById('giftWorkplacesContainer');
            if (wpContainer) wpContainer.innerHTML = '';
            renderGiftWorkplace(0, false); // Primer lugar (principal)

            // Reset campos gift â€” Paso 3 (Apariencia + Firma + Logo)
            _giftSelectedColor = '#1a56a0';
            _giftImageData = { firma: null, proLogo: null, proLogoSize: 60, firmaSize: 60, instLogoSize: 60 };
            document.getElementById('giftFooterText').value = '';
            document.getElementById('giftColorPreview').style.background = '#1a56a0';
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
            const notasEl = document.getElementById('giftNotas');
            if (notasEl) notasEl.value = '';

            // Reset campos gift â€” Paso 4 (Licencia y Permisos)
            document.getElementById('giftPlan').value = 'GIFT';
            document.getElementById('giftProMode').value = 'true';
            document.getElementById('giftDevices').value = '10';
            document.getElementById('giftDuration').value = '365';
            const allTplCheck = document.getElementById('giftAllTemplates');
            if (allTplCheck) { allTplCheck.checked = true; }
            const tplGrid = document.getElementById('giftTemplatesGrid');
            if (tplGrid) { tplGrid.style.display = 'none'; tplGrid.innerHTML = ''; }
            updateGiftSummaryBadge();

            // Wizard: empezar en paso 1
            giftGoStep(1);

            // Poblar especialidades en el select
            const sel = document.getElementById('giftEspecialidad');
            sel.innerHTML = '<option value="">â€” SeleccionÃ¡ â€”</option>';
            ESPECIALIDADES.forEach(esp => {
                sel.innerHTML += `<option value="${esp}">${esp}</option>`;
            });

            // Reset estado â€” API Key editable para usuario regalo (nuevo usuario, sin aprobaciÃ³n previa)
            const cfApiKeyInputGift = document.getElementById('cfApiKey');
            // Auto-llenar con las keys guardadas en Mis Keys
            cfApiKeyInputGift.value = localStorage.getItem('admin_groq_key') || '';
            cfApiKeyInputGift.readOnly = false;
            cfApiKeyInputGift.style.background = '';
            cfApiKeyInputGift.style.opacity = '';
            cfApiKeyInputGift.style.cursor = '';
            const cfHintGift = document.getElementById('cfApiKeyHint');
            if (cfHintGift) cfHintGift.textContent = cfApiKeyInputGift.value
                ? 'âœ… Pre-llenada desde Mis Keys â€” podÃ©s cambiarla si necesitÃ¡s'
                : 'Si lo dejÃ¡s vacÃ­o, el usuario deberÃ¡ ingresar su propia API Key';
            // Backup keys editables en modo gift (auto-llenadas)
            const cfB1g = document.getElementById('cfApiKeyB1');
            const cfB2g = document.getElementById('cfApiKeyB2');
            if (cfB1g) { cfB1g.value = localStorage.getItem('admin_groq_key_b1') || ''; cfB1g.readOnly = false; cfB1g.style.background = ''; cfB1g.style.opacity = ''; cfB1g.style.cursor = ''; }
            if (cfB2g) { cfB2g.value = localStorage.getItem('admin_groq_key_b2') || ''; cfB2g.readOnly = false; cfB2g.style.background = ''; cfB2g.style.opacity = ''; cfB2g.style.cursor = ''; }
            document.getElementById('cfLinkResult').style.display = 'none';

            // BotÃ³n con estilo gift
            const btn = document.getElementById('cfBtnGenerate');
            btn.textContent = 'ðŸŽ Crear y Generar Link';
            btn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';

            document.getElementById('cloneFactoryModal').style.display = 'flex';
        }

        function closeCloneFactory() {
            document.getElementById('cloneFactoryModal').style.display = 'none';
            _cfCurrentUser = null;
            _cfMode = 'normal';
            // Reset gift wizard to step 1
            giftGoStep(1);
        }

        // â”€â”€ Gift Wizard: state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let _giftSelectedColor = '#1a56a0';
        let _giftWpCounter = 0;
        let _giftWpLogoData = {};
        let _giftImageData = { firma: null, proLogo: null, proLogoSize: 60, firmaSize: 60, instLogoSize: 60 };

        // â”€â”€ Gift Wizard: navegaciÃ³n de pasos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function giftGoStep(step) {
            for (let i = 1; i <= 5; i++) {
                const el = document.getElementById('giftStep' + i);
                if (el) el.style.display = (i === step) ? 'block' : 'none';
            }
            document.querySelectorAll('#giftStepper .gift-step-dot').forEach(dot => {
                const s = parseInt(dot.dataset.step);
                dot.style.background = s <= step ? '#f59e0b' : '#e5e7eb';
            });
            // Actualizar resumen si entramos al paso 4
            if (step === 4) updateGiftFinalSummary();
            // Inicializar procesador de imÃ¡genes al entrar al paso 5
            if (step === 5 && typeof _imgprocInitStep5 === 'function') _imgprocInitStep5();
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

        // â”€â”€ Gift Step 4: Plan defaults, templates grid, summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function updateGiftPlanDefaults() {
            const plan = document.getElementById('giftPlan').value;
            const devSel = document.getElementById('giftDevices');
            const proSel = document.getElementById('giftProMode');
            const durSel = document.getElementById('giftDuration');
            const defaults = {
                TRIAL:  { devices: '2',  pro: 'true',  duration: '15' },
                NORMAL: { devices: '2',  pro: 'false', duration: '365' },
                PRO:    { devices: '5',  pro: 'true',  duration: '365' },
                GIFT:   { devices: '10', pro: 'true',  duration: '365' },
                CLINIC: { devices: '999', pro: 'true', duration: '365' }
            };
            const d = defaults[plan] || defaults.GIFT;
            devSel.value = d.devices;
            proSel.value = d.pro;
            durSel.value = d.duration;
            // Actualizar resumen inline en paso 3
            updateGiftSummaryBadge();
        }

        function updateGiftSummaryBadge() {
            const plan = document.getElementById('giftPlan')?.value || 'GIFT';
            const dev = document.getElementById('giftDevices')?.value || '10';
            const dur = document.getElementById('giftDuration')?.value || '365';
            const durMap = { '7': '7 dÃ­as', '15': '15 dÃ­as', '30': '1 mes', '90': '3 meses', '180': '6 meses', '365': '1 aÃ±o', '0': 'Sin vencimiento' };
            const allTpl = document.getElementById('giftAllTemplates')?.checked !== false;
            document.getElementById('giftSummaryPlan').textContent = plan;
            document.getElementById('giftSummaryDevices').textContent = dev === '999' ? 'âˆž' : dev;
            document.getElementById('giftSummaryDuration').textContent = durMap[dur] || dur + ' dÃ­as';
            document.getElementById('giftSummaryTemplates').textContent = allTpl ? 'TODAS' : 'Seleccionadas';
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
            const durMap = { '7': '7 dÃ­as', '15': '15 dÃ­as', '30': '1 mes', '90': '3 meses', '180': '6 meses', '365': '1 aÃ±o', '0': 'Sin vencimiento' };

            const el = document.getElementById('giftFinalSummaryContent');
            el.innerHTML = `
                <span>ðŸ·ï¸ Plan: <strong>${plan}</strong></span>
                <span>ðŸ“± <strong>${dev === '999' ? 'Ilimitados' : dev}</strong> disp.</span>
                <span>ðŸ“… <strong>${durMap[dur] || dur + ' dÃ­as'}</strong></span>
                <span>â­ Pro Mode: <strong>${pro ? 'SÃ­' : 'No'}</strong></span>
                <span>ðŸ“„ <strong>${allTpl ? 'Todas' : tplCount}</strong> plantillas</span>
                <span>ðŸŽ¨ Color: <span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${_giftSelectedColor};vertical-align:middle;border:1px solid rgba(0,0,0,.2);"></span></span>
            `;
            // TambiÃ©n actualizar badge del paso 3
            updateGiftSummaryBadge();
        }

        // â”€â”€ Gift Wizard: Workplace Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        <span id="gwWpNameDisplay${index}">${isMain ? 'ðŸ¥ Lugar de Trabajo Principal' : 'ðŸ¢ Lugar adicional'}</span>
                    </div>
                    <div class="gw-wp-header-actions">
                        ${!isMain ? '<button type="button" class="gw-wp-remove" onclick="event.stopPropagation();removeGiftWorkplace(' + index + ')" title="Eliminar">âœ•</button>' : ''}
                        <span class="gw-wp-chevron">â–¾</span>
                    </div>
                </div>
                <div class="gw-wp-body">
                    <div class="gw-field-row">
                        <div class="gw-field-group">
                            <label>Nombre del lugar ${isMain ? '<span class="gw-req">*</span>' : ''}</label>
                            <input type="text" id="gwWpName${index}" placeholder="ClÃ­nica San MartÃ­n" oninput="updateGiftWpName(${index})">
                        </div>
                        <div class="gw-field-group">
                            <label>DirecciÃ³n</label>
                            <input type="text" id="gwWpAddress${index}" placeholder="Av. Corrientes 1234, CABA">
                        </div>
                    </div>
                    <div class="gw-field-row">
                        <div class="gw-field-group">
                            <label>TelÃ©fono del lugar</label>
                            <input type="tel" id="gwWpPhone${index}" placeholder="(011) 4567-8901">
                        </div>
                        <div class="gw-field-group">
                            <label>Email institucional</label>
                            <input type="email" id="gwWpEmail${index}" placeholder="info@clinica.com">
                        </div>
                    </div>
                    <div class="gw-field-group" style="margin-top:.4rem;">
                        <label>Logo del Lugar / InstituciÃ³n</label>
                        <div class="gw-upload-zone">
                            <div class="gw-upload-icon">ðŸ–¼ï¸</div>
                            <div class="gw-upload-text">Clic o arrastrÃ¡ para subir<br><small>PNG o JPG, mÃ¡x 2 MB</small></div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" onchange="previewGiftWpLogo(this, ${index})">
                        </div>
                        <div class="gw-upload-preview" id="gwWpLogoPreview${index}"></div>
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
                document.querySelectorAll('.gw-wp-accordion').forEach(a => a.classList.add('collapsed'));
                acc.classList.remove('collapsed');
            } else {
                acc.classList.add('collapsed');
            }
        }

        function addGiftWorkplace() {
            document.querySelectorAll('.gw-wp-accordion').forEach(a => a.classList.add('collapsed'));
            _giftWpCounter++;
            renderGiftWorkplace(_giftWpCounter, false);
            const el = document.getElementById('gw-wp-' + _giftWpCounter);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        async function removeGiftWorkplace(index) {
            const ok = await dashConfirm('Â¿Eliminar este lugar de trabajo?', 'ðŸ—‘ï¸');
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
                const icon = index === 0 ? 'ðŸ¥' : 'ðŸ¢';
                display.textContent = input.value.trim() || (icon + ' ' + (index === 0 ? 'Lugar de Trabajo Principal' : 'Lugar adicional'));
            }
        }

        function previewGiftWpLogo(input, index) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                dashAlert('La imagen no puede superar 2 MB', 'ðŸ“·');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('gwWpLogoPreview' + index).innerHTML = '<img src="' + e.target.result + '" alt="Logo">';
                _giftWpLogoData[index] = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        // â”€â”€ Gift Wizard: Firma/Logo preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function previewGiftImage(input, previewId, type) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                dashAlert('La imagen no puede superar 2 MB', 'ðŸ“·');
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

        // BotÃ³n Generar Link (Normal + Gift)
        async function handleCfGenerate() {
            const apiKey   = document.getElementById('cfApiKey').value.trim();
            const apiKeyB1 = (document.getElementById('cfApiKeyB1')?.value || '').trim();
            const apiKeyB2 = (document.getElementById('cfApiKeyB2')?.value || '').trim();
            const btn = document.getElementById('cfBtnGenerate');
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'â³ Procesando...';

            // Variables hoisted para que sean accesibles tras el if/else
            let selectedDuration = 0, selectedDevices = 0, selectedPlan = 'GIFT',
                selectedTemplates = [], selectedProMode = true;

            try {
                let userId;
                let userName;
                let userEmail;

                if (_cfMode === 'gift') {
                    // â”€â”€ GIFT MODE: Crear usuario nuevo (wizard completo) â”€â”€
                    const nombre = document.getElementById('giftNombre').value.trim();
                    const email = document.getElementById('giftEmail').value.trim();
                    const matricula = document.getElementById('giftMatricula').value.trim();
                    const telefono = document.getElementById('giftTelefono').value.trim();
                    const especialidad = document.getElementById('giftEspecialidad').value;

                    // Recoger TODOS los lugares de trabajo del accordion
                    const allWorkplaces = [];
                    document.querySelectorAll('.gw-wp-accordion').forEach(acc => {
                        const idx = acc.dataset.wpIndex;
                        allWorkplaces.push({
                            name:    (document.getElementById('gwWpName' + idx) || {}).value?.trim() || '',
                            address: (document.getElementById('gwWpAddress' + idx) || {}).value?.trim() || '',
                            phone:   (document.getElementById('gwWpPhone' + idx) || {}).value?.trim() || '',
                            email:   (document.getElementById('gwWpEmail' + idx) || {}).value?.trim() || '',
                            logo:    _giftWpLogoData[idx] || null
                        });
                    });

                    // Apariencia PDF
                    const headerColor = _giftSelectedColor || '#1a56a0';
                    const footerText = document.getElementById('giftFooterText').value.trim();

                    // Firma y Logo profesional
                    const firma = _giftImageData.firma || null;
                    const proLogo = _giftImageData.proLogo || null;

                    // Notas
                    const notas = (document.getElementById('giftNotas') || {}).value?.trim() || '';

                    if (!nombre) {
                        dashAlert('IngresÃ¡ el nombre del usuario', 'âš ï¸');
                        btn.disabled = false;
                        btn.textContent = originalText;
                        giftGoStep(1);
                        return;
                    }
                    if (!email) {
                        dashAlert('IngresÃ¡ el email del usuario', 'âš ï¸');
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

                    // Calcular fecha vencimiento segÃºn duraciÃ³n elegida
                    let fechaVenc = '';
                    if (selectedDuration > 0) {
                        const venc = new Date();
                        venc.setDate(venc.getDate() + selectedDuration);
                        fechaVenc = venc.toISOString().split('T')[0];
                    }

                    // Datos enriquecidos (workplaces + apariencia + firma + logo) â†’ se precargan en la app
                    const registroDatos = {
                        workplace: allWorkplaces[0] || {},
                        extraWorkplaces: allWorkplaces.slice(1),
                        headerColor: headerColor,
                        footerText: footerText,
                        firma: firma,
                        proLogo: proLogo,
                        proLogoSize: _giftImageData.proLogoSize || 60,
                        firmaSize: _giftImageData.firmaSize || 60,
                        instLogoSize: _giftImageData.instLogoSize || 60,
                        notas: notas,
                        apiKey: apiKey,
                        apiKeyB1: apiKeyB1,
                        apiKeyB2: apiKeyB2,
                        hasProMode: selectedProMode
                    };

                    const userData = {
                        ID_Medico: newId,
                        Nombre: nombre,
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
                        Notas_Admin: 'ðŸŽ Usuario regalo â€” creado desde FÃ¡brica de Clones' + (notas ? ' | ' + notas : '')
                    };

                    // Mostrar barra de progreso
                    _showGiftProgress('Conectando con el servidor...', 20);

                    // Crear usuario en el backend via POST (soporta payloads grandes con imÃ¡genes)
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

                    _showGiftProgress('Â¡Usuario creado! Generando link...', 100);

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
                    // â”€â”€ NORMAL MODE: usuario existente â”€â”€
                    if (!_cfCurrentUser) return;
                    userId = _cfCurrentUser.ID_Medico;
                    userName = _cfCurrentUser.Nombre || 'Doctor';
                    userEmail = _cfCurrentUser.Email || '';

                    // API Key ya fue guardada en la aprobaciÃ³n â€” no se re-escribe desde aquÃ­

                    // Log
                    const logUrl = `${CONFIG.scriptUrl}?action=admin_log_action&${_getSessionAuthParams()}&adminUser=${encodeURIComponent('admin')}&logAction=generate_link&userId=${encodeURIComponent(userId)}&details=${encodeURIComponent('Link generado')}`;
                    fetch(logUrl).catch(() => {});
                }

                // â”€â”€ Generar el link (comÃºn a ambos modos) â”€â”€
                const link = `${CF_APP_BASE_URL}?id=${encodeURIComponent(userId)}`;

                // Mostrar resultado
                document.getElementById('cfLinkUrl').value = link;
                document.getElementById('cfLinkResult').style.display = 'block';

                // Aviso si no hay API Key
                document.getElementById('cfApiKeyNotice').style.display = apiKey ? 'none' : 'block';

                // Guardar datos para WhatsApp/Email
                _cfCurrentUser = { ID_Medico: userId, Nombre: userName, Email: userEmail };

                if (_cfMode === 'gift') {
                    const durMap = { '7': '7 dÃ­as', '15': '15 dÃ­as', '30': '1 mes', '90': '3 meses', '180': '6 meses', '365': '1 aÃ±o', '0': 'Sin vencimiento' };
                    const durLabel = durMap[String(selectedDuration)] || selectedDuration + ' dÃ­as';
                    const devLabel = selectedDevices >= 999 ? 'Ilimitados' : selectedDevices;
                    const tplLabel = selectedTemplates.length >= _getAllTemplateKeys().length ? 'Todas las plantillas' : selectedTemplates.length + ' plantillas';
                    dashAlert(`âœ… Usuario <strong>${userName}</strong> creado exitosamente\n\nID: ${userId}\nPlan: ${selectedPlan} Â· ${tplLabel} Â· ${devLabel} dispositivos Â· ${durLabel}`, 'ðŸŽ');
                }

            } catch (err) {
                _hideGiftProgress();
                dashAlert('Error: ' + err.message, 'âŒ');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                // Ocultar progress despuÃ©s de un momento
                setTimeout(() => _hideGiftProgress(), 1500);
            }
        }

        // â”€â”€ Barra de progreso del Gift â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        // BotÃ³n Copiar Link
        function handleCfCopyLink() {
            const url = document.getElementById('cfLinkUrl').value;
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('cfBtnCopyLink');
                btn.textContent = 'âœ…';
                setTimeout(() => btn.textContent = 'ðŸ“‹', 2000);
            }).catch(() => {
                // Fallback
                document.getElementById('cfLinkUrl').select();
                document.execCommand('copy');
            });
        }

        // BotÃ³n WhatsApp
        function handleCfWhatsApp() {
            const url = document.getElementById('cfLinkUrl').value;
            const name = _cfCurrentUser?.Nombre || 'Doctor';
            const text = `Hola ${name}, tu app Transcriptor MÃ©dico Pro estÃ¡ lista.\n\nAbrÃ­ este link en tu celular o computadora para configurarla:\n${url}\n\nTe va a pedir instalar la app â€” aceptÃ¡ para tenerla siempre a mano.`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }

        // BotÃ³n Email â€” usa el modal de email propio de la app (NO abre Gmail ni Outlook)
        function handleCfEmail() {
            if (!_cfCurrentUser) return;
            const url   = document.getElementById('cfLinkUrl').value;
            const name  = _cfCurrentUser.Nombre || 'Doctor';
            const email = _cfCurrentUser.Email  || '';
            if (!email) {
                dashAlert('Este usuario no tiene email configurado.', 'âš ï¸');
                return;
            }
            // Reutilizar el modal de email directo con contenido pre-llenado
            _deCurrentUser = _cfCurrentUser;
            document.getElementById('deUserName').textContent  = name;
            document.getElementById('deUserEmail').textContent = email;
            document.getElementById('deSubject').value = 'Tu app Transcriptor MÃ©dico Pro estÃ¡ lista';
            document.getElementById('deBody').value    = `Hola ${name},\n\nTu app de transcripciÃ³n mÃ©dica estÃ¡ lista para usar.\n\nHacÃ© clic en el siguiente link para configurarla:\n${url}\n\nEl navegador te va a ofrecer instalarla como aplicaciÃ³n â€” aceptÃ¡ para tenerla siempre accesible.\n\nSi tenÃ©s alguna duda, respondÃ© este correo.\n\nSaludos`;
            document.getElementById('deResult').style.display  = 'none';
            document.getElementById('deBtnSend').disabled      = false;
            document.getElementById('deBtnSend').textContent   = 'ðŸ“¨ Enviar';
            document.getElementById('directEmailModal').style.display = 'flex';
        }

        // ========== FIN FÃBRICA DE CLONES ==========

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

            document.getElementById('deUserName').textContent = user.Nombre || 'â€”';
            document.getElementById('deUserEmail').textContent = user.Email;
            document.getElementById('deSubject').value = 'Mensaje de Transcriptor MÃ©dico Pro';
            document.getElementById('deBody').value = `Hola ${user.Nombre || ''},\n\n`;
            document.getElementById('deResult').style.display = 'none';
            document.getElementById('deBtnSend').disabled = false;
            document.getElementById('deBtnSend').textContent = 'ðŸ“¨ Enviar';

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
                resultDiv.textContent = 'âš ï¸ EscribÃ­ un mensaje antes de enviar.';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'â³ Enviando...';
            resultDiv.style.display = 'none';

            // Convertir saltos de lÃ­nea a HTML
            const htmlBody = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0f766e;color:white;padding:16px 20px;border-radius:10px 10px 0 0;">
                        <h2 style="margin:0;font-size:1.1rem;">Transcriptor MÃ©dico Pro</h2>
                    </div>
                    <div style="padding:20px;background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
                        ${bodyText.split('\n').map(l => l.trim() === '' ? '<br>' : `<p style="margin:0 0 8px;line-height:1.5;color:#1e293b;">${l}</p>`).join('')}
                    </div>
                    <p style="font-size:.75rem;color:#94a3b8;text-align:center;margin-top:12px;">
                        Enviado desde el Admin Dashboard â€” Transcriptor MÃ©dico Pro
                    </p>
                </div>`;

            try {
                const response = await fetch(CONFIG.scriptUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_email',
                        to: to,
                        subject: subject || 'Transcriptor MÃ©dico Pro',
                        htmlBody: htmlBody,
                        senderName: 'Transcriptor MÃ©dico Pro â€” Admin'
                    })
                });
                const data = await response.json();

                if (data.success) {
                    resultDiv.style.display = 'block';
                    resultDiv.style.background = '#f0fdf4';
                    resultDiv.style.border = '1px solid #bbf7d0';
                    resultDiv.style.color = '#166534';
                    resultDiv.textContent = `âœ… Email enviado correctamente a ${to}`;
                    btn.textContent = 'âœ… Enviado';

                    // Log de la acciÃ³n
                    try {
                        const logUrl = `${CONFIG.scriptUrl}?action=admin_log_action&${_getSessionAuthParams()}&adminUser=${encodeURIComponent('admin')}&logAction=send_email&userId=${encodeURIComponent(_deCurrentUser.ID_Medico)}&details=${encodeURIComponent('Email directo: ' + subject)}`;
                        fetch(logUrl).catch(() => {});
                    } catch(e) {}

                    showToast('ðŸ“§ Email enviado a ' + _deCurrentUser.Nombre, 'success');
                } else {
                    throw new Error(data.error || 'Error desconocido');
                }
            } catch (err) {
                resultDiv.style.display = 'block';
                resultDiv.style.background = '#fef2f2';
                resultDiv.style.border = '1px solid #fecaca';
                resultDiv.style.color = '#991b1b';
                resultDiv.textContent = 'âŒ Error: ' + err.message;
                btn.disabled = false;
                btn.textContent = 'ðŸ“¨ Reintentar';
            }
        });

        // ========== FIN EMAIL DIRECTO ==========

        // Abrir modal
        document.getElementById('btnNewUser')?.addEventListener('click', () => {
            document.getElementById('newUserModal').style.display = 'flex';
            initEspecialidadesGrid();
            setDefaultExpirationDate();
        });

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

        // Actualizar estudios segÃºn especialidades seleccionadas
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

        // Preview de imÃ¡genes
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

            // Generar ID Ãºnico
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
            btnSave.textContent = 'â³ Creando...';

            try {
                // Crear usuario en Google Sheets
                const result = await API.createUser(userData);

                if (!result.success) {
                    throw new Error(result.error || 'Error al crear usuario');
                }

                showToast('âœ… Usuario creado exitosamente', 'success');
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

        // Generar ID Ãºnico
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

        // Agregar mÃ©todo al API object
        if (typeof API !== 'undefined') {
            API.createUser = async function(userData) {
                const updatesJson = encodeURIComponent(JSON.stringify(userData));
                return await this.call(`?action=admin_create_user&updates=${updatesJson}`);
            };
        }

        /* â”€â”€ Form Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        function validateUserForm(formData) {
            const errors = [];
            if (!formData.nombre || formData.nombre.trim().length < 2) {
                errors.push({ field: 'nombre', message: 'El nombre debe tener al menos 2 caracteres' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!formData.email || !emailRegex.test(formData.email)) {
                errors.push({ field: 'email', message: 'Email invÃ¡lido' });
            }
            if (!formData.tipo || !['admin', 'doctor'].includes(formData.tipo)) {
                errors.push({ field: 'tipo', message: 'Debe seleccionar un tipo de usuario vÃ¡lido' });
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

        /* â”€â”€ Dark Mode button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

        async function loadRegistrations() {
            const container = document.getElementById('registrosCards');
            const emptyState = document.getElementById('registrosEmpty');
            const filterEstado = document.getElementById('regFilterEstado')?.value || 'pendiente';

            container.innerHTML = '<p style="text-align:center;padding:2rem;color:#64748b;">â³ Cargando registros...</p>';
            emptyState.style.display = 'none';

            // Set registration link
            const regLink = window.location.origin + window.location.pathname.replace('admin.html', 'registro.html');
            const regLinkEl = document.getElementById('regLinkDisplay');
            if (regLinkEl) regLinkEl.textContent = regLink;

            try {
                const res = await fetch(`${CONFIG.scriptUrl}?action=admin_list_registrations&${_getSessionAuthParams()}`);
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                allRegistrations = data.registrations || [];

                // Filter by estado
                let filtered = allRegistrations;
                if (filterEstado) {
                    filtered = allRegistrations.filter(r => String(r.Estado || '').toLowerCase() === filterEstado.toLowerCase());
                }

                // Update badge
                const pendientes = allRegistrations.filter(r => String(r.Estado || '').toLowerCase() === 'pendiente');
                const badge = document.getElementById('regBadge');
                if (badge) {
                    if (pendientes.length > 0) {
                        badge.textContent = pendientes.length;
                        badge.style.display = 'inline';
                    } else {
                        badge.style.display = 'none';
                    }
                }

                if (filtered.length === 0) {
                    container.innerHTML = '';
                    emptyState.style.display = 'block';
                    return;
                }

                container.innerHTML = filtered.map(reg => renderRegCard(reg)).join('');
            } catch (err) {
                container.innerHTML = `<p style="text-align:center;padding:2rem;color:#ef4444;">âŒ ${escapeHtml(err.message)}</p>`;
            }
        }

        function renderRegCard(reg) {
            const estado = String(reg.Estado || 'pendiente').toLowerCase();
            const badgeClass = estado === 'aprobado' ? 'reg-badge-aprobado' : estado === 'rechazado' ? 'reg-badge-rechazado' : 'reg-badge-pendiente';
            const estadoLabel = estado === 'aprobado' ? 'âœ… Aprobado' : estado === 'rechazado' ? 'âŒ Rechazado' : 'â³ Pendiente';

            const fecha = reg.Fecha_Registro ? new Date(reg.Fecha_Registro).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”';

            let especialidades = '';
            try {
                const esps = String(reg.Especialidades || '').split(',').map(s => s.trim()).filter(Boolean);
                especialidades = esps.map(e => `<span class="badge badge-specialty">${escapeHtml(e)}</span>`).join(' ');
            } catch(_) {}

            let workplace = 'â€”';
            try {
                const wp = JSON.parse(reg.Workplace_Data || '{}');
                workplace = wp.name || 'â€”';
            } catch(_) { workplace = 'â€”'; }

            // Badge del plan solicitado
            const PLANES_VALIDOS = ['NORMAL','PRO','CLINIC','GIFT','TRIAL'];
            const planSol = (reg.Plan_Solicitado || _parsePlanFromNotas(reg.Notas || '')).toUpperCase();
            const planBadgeHtml = (planSol && PLANES_VALIDOS.includes(planSol))
                ? _renderPlanBadgeMini(planSol)
                : '';

            const isPendiente = estado === 'pendiente';
            const actionsHtml = isPendiente ? `
                <button class="btn-view-details" onclick="viewRegDetail('${reg.ID_Registro}')">ðŸ“‹ Detalle</button>
                <button class="btn-reject" onclick="rejectRegistration('${reg.ID_Registro}')">âŒ Rechazar</button>
                <button class="btn-approve" onclick="openApproveModal('${reg.ID_Registro}')">âœ… Aprobar</button>
            ` : `
                <button class="btn-view-details" onclick="viewRegDetail('${reg.ID_Registro}')">ðŸ“‹ Detalle</button>
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
                        <dt>ðŸ“§ Email</dt><dd>${escapeHtml(reg.Email || 'â€”')}</dd>
                        <dt>ðŸªª MatrÃ­cula</dt><dd>${escapeHtml(reg.Matricula || 'â€”')}</dd>
                        <dt>ðŸ“ž TelÃ©fono</dt><dd>${escapeHtml(reg.Telefono || 'â€”')}</dd>
                        <dt>ðŸ¥ Lugar</dt><dd>${escapeHtml(workplace)}</dd>
                    </dl>
                    <div class="reg-card-specs">${especialidades || '<span style="color:#94a3b8;font-size:.82rem;">Sin especialidades</span>'}</div>
                    <div class="reg-card-actions">${actionsHtml}</div>
                </div>
            `;
        }

        function viewRegDetail(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return;

            // â”€â”€ Lugar principal â”€â”€
            let wpHtml = '';
            try {
                const wp = JSON.parse(reg.Workplace_Data || '{}');
                wpHtml = `
                    <dt>Nombre</dt><dd>${escapeHtml(wp.name || 'â€”')}</dd>
                    <dt>DirecciÃ³n</dt><dd>${escapeHtml(wp.address || 'â€”')}</dd>
                    <dt>TelÃ©fono</dt><dd>${escapeHtml(wp.phone || 'â€”')}</dd>
                    <dt>Email</dt><dd>${escapeHtml(wp.email || 'â€”')}</dd>
                    <dt>Logo</dt><dd>${(wp.logo && wp.logo !== 'null') ? 'âœ… SÃ­' : 'âŒ No'}</dd>
                `;
            } catch(_) {}

            // â”€â”€ Lugares adicionales (parsear JSON, no mostrar raw) â”€â”€
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
                            <div style="font-weight:600;font-size:.85rem;margin-bottom:.3rem;">ðŸ¢ ${escapeHtml(wp.name || 'Lugar ' + (i + 2))}</div>
                            <dl class="reg-card-info" style="margin:0;">
                                ${wp.address ? `<dt>DirecciÃ³n</dt><dd>${escapeHtml(wp.address)}</dd>` : ''}
                                ${wp.phone ? `<dt>TelÃ©fono</dt><dd>${escapeHtml(wp.phone)}</dd>` : ''}
                                ${wp.email ? `<dt>Email</dt><dd>${escapeHtml(wp.email)}</dd>` : ''}
                                <dt>Logo</dt><dd>${(wp.logo && wp.logo !== 'null' && !wp.logo.startsWith('data:')) ? 'âœ… SÃ­' : (wp.logo && wp.logo.startsWith('data:')) ? 'âœ… SÃ­' : 'âŒ No'}</dd>
                            </dl>
                        </div>
                    `).join('');
                }
            } catch(_) {}

            // â”€â”€ Estudios agrupados por especialidad â”€â”€
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

            // â”€â”€ Especialidades como badges â”€â”€
            let especialidadesHtml = '';
            try {
                const esps = String(reg.Especialidades || '').split(',').map(s => s.trim()).filter(Boolean);
                especialidadesHtml = esps.map(e => `<span class="badge badge-specialty">${escapeHtml(e)}</span>`).join(' ');
            } catch(_) {}

            // â”€â”€ Color: nombre legible â”€â”€
            const colorNames = {
                '#1a56a0': 'Azul', '#0f766e': 'Verde', '#db2777': 'Rosa',
                '#1e293b': 'Negro', '#b8860b': 'Dorado', '#708090': 'Plateado'
            };
            const hdrColor = reg.Header_Color || '#1a56a0';
            const colorName = colorNames[hdrColor] || hdrColor;

            // â”€â”€ Firma / Logo check â”€â”€
            const hasFirma = reg.Firma && reg.Firma !== 'no' && reg.Firma !== 'null' && reg.Firma !== '';
            const hasProLogo = reg.Pro_Logo && reg.Pro_Logo !== 'no' && reg.Pro_Logo !== 'null' && reg.Pro_Logo !== '';

            const content = `
                <dl class="reg-card-info" style="margin:1rem 0;">
                    <dt>ðŸ‘¤ Nombre</dt><dd>${escapeHtml(reg.Nombre || 'â€”')}</dd>
                    <dt>ðŸ“§ Email</dt><dd>${escapeHtml(reg.Email || 'â€”')}</dd>
                    <dt>ðŸªª MatrÃ­cula</dt><dd>${escapeHtml(reg.Matricula || 'â€”')}</dd>
                    <dt>ðŸ“ž TelÃ©fono</dt><dd>${escapeHtml(reg.Telefono || 'â€”')}</dd>
                    <dt>ðŸŽ¨ Color header</dt><dd><span style="display:inline-block;width:20px;height:14px;border-radius:3px;background:${escapeHtml(hdrColor)};vertical-align:middle;border:1px solid rgba(0,0,0,.15);"></span> ${escapeHtml(colorName)}</dd>
                    <dt>ðŸ“ Pie de pÃ¡gina</dt><dd>${escapeHtml(reg.Footer_Text || 'â€”')}</dd>
                    <dt>âœï¸ Firma</dt><dd>${hasFirma ? 'âœ… SÃ­' : 'âŒ No'}</dd>
                    <dt>ðŸ©º Logo profesional</dt><dd>${hasProLogo ? 'âœ… SÃ­' : 'âŒ No'}</dd>
                </dl>

                <h4 style="font-size:.9rem;margin-top:1rem;">ðŸ¥ Lugar de trabajo principal</h4>
                <dl class="reg-card-info" style="margin:.5rem 0;">${wpHtml}</dl>

                ${extraWpHtml ? `<h4 style="font-size:.9rem;margin-top:1rem;">ðŸ¢ Lugares adicionales</h4>${extraWpHtml}` : ''}

                <h4 style="font-size:.9rem;margin-top:1rem;">ðŸ©º Especialidades</h4>
                <div style="margin:.5rem 0;display:flex;flex-wrap:wrap;gap:4px;">${especialidadesHtml || '<span style="color:#94a3b8;">â€”</span>'}</div>

                <h4 style="font-size:.9rem;margin-top:1rem;">ðŸ“‹ Estudios seleccionados</h4>
                <div style="margin:.5rem 0;">${estudiosHtml || '<span style="color:#94a3b8;">Ninguno seleccionado</span>'}</div>

                ${reg.Notas ? `<h4 style="font-size:.9rem;margin-top:1rem;">ðŸ’¬ Notas</h4><p style="font-size:.85rem;background:#fff7ed;padding:.6rem;border-radius:8px;border:1px solid #fed7aa;">${escapeHtml(reg.Notas)}</p>` : ''}
                <p style="font-size:.73rem;color:#94a3b8;margin-top:1.2rem;border-top:1px solid #e2e8f0;padding-top:.5rem;">ðŸ†” ${escapeHtml(reg.ID_Registro)} â€” Origen: ${escapeHtml(reg.Origen || 'â€”')}</p>
            `;

            document.getElementById('detailModalContent').innerHTML = content;
            document.getElementById('detailModalOverlay').classList.add('show');
        }

        function closeDetailModal() {
            document.getElementById('detailModalOverlay').classList.remove('show');
        }

        function openApproveModal(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            if (!reg) return;

            document.getElementById('approveRegId').value = regId;
            // Guardar especialidades del registro
            const espStr = reg.Especialidades || '';
            document.getElementById('approveRegEspecialidades').value = espStr;
            // Guardar addons cart del registro
            document.getElementById('approveAddonsCart').value = reg.Addons_Cart || '';

            document.getElementById('approveModalInfo').textContent =
                `Reg. ${reg.ID_Registro} Â· ${reg.Fecha_Registro ? new Date(reg.Fecha_Registro).toLocaleDateString('es-ES') : 'â€”'} Â· Plan: ${planSolicitado || '(sin especificar)'}`;

            // â”€â”€ Poblar campos editables de verificaciÃ³n â”€â”€
            document.getElementById('approveEditNombre').value         = reg.Nombre         || '';
            document.getElementById('approveEditMatricula').value      = reg.Matricula      || '';
            document.getElementById('approveEditEmail').value          = reg.Email          || '';
            document.getElementById('approveEditTelefono').value       = reg.Telefono       || '';
            document.getElementById('approveEditEspecialidades').value = reg.Especialidades || '';
            document.getElementById('approveEditNotas').value          = reg.Notas          || '';
            const _hc = reg.Header_Color || '#1a56a0';
            document.getElementById('approveEditHeaderColor').value    = _hc;
            document.getElementById('approveEditHeaderColorVal').textContent = _hc;
            document.getElementById('approveEditFooterText').value     = reg.Footer_Text    || '';
            try {
                const _wp = JSON.parse(reg.Workplace_Data || '{}');
                document.getElementById('approveEditWpName').value      = _wp.name      || _wp.nombre        || '';
                document.getElementById('approveEditWpAddress').value   = _wp.address   || _wp.direccion     || '';
                document.getElementById('approveEditWpPhone').value     = _wp.phone     || _wp.telefono      || '';
                document.getElementById('approveEditWpSpecialty').value = _wp.specialty || _wp.especialidad  || '';
            } catch(_) {}
            // Expandir verificaciÃ³n por defecto
            const _vb = document.getElementById('approveVerifyBody');
            const _vi = document.getElementById('approveVerifyToggleIcon');
            if (_vb) _vb.style.display = 'block';
            if (_vi) _vi.textContent = 'â–² colapsar';

            // Auto-detectar plan: primero del campo Plan_Solicitado, luego parseando Notas
            const planSolicitado = (reg.Plan_Solicitado || _parsePlanFromNotas(reg.Notas || '')).toUpperCase();
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

            // Auto-llenar keys desde Mis Keys (permanecen ocultas, colapsadas)
            document.getElementById('approveApiKey').value   = localStorage.getItem('admin_groq_key')    || '';
            document.getElementById('approveApiKeyB1').value = localStorage.getItem('admin_groq_key_b1') || '';
            document.getElementById('approveApiKeyB2').value = localStorage.getItem('admin_groq_key_b2') || '';

            // Colapsar ediciÃ³n de keys y actualizar estado
            const keysEdit = document.getElementById('approveKeysEditSection');
            if (keysEdit) keysEdit.style.display = 'none';
            _updateApproveKeysStatus();

            document.getElementById('approveModalOverlay').classList.add('show');
            updateApproveTemplateUI();
        }

        function closeApproveModal() {
            document.getElementById('approveModalOverlay').classList.remove('show');
        }

        function _toggleApproveVerify() {
            const body = document.getElementById('approveVerifyBody');
            const icon = document.getElementById('approveVerifyToggleIcon');
            if (!body) return;
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            if (icon) icon.textContent = isOpen ? 'â–¼ expandir' : 'â–² colapsar';
        }

        /** Parsea el plan desde el campo Notas o cualquier texto que lo contenga */
        function _parsePlanFromNotas(notas) {
            if (!notas) return '';
            const s = String(notas);
            // Formato explÃ­cito: "Plan: PRO" o "Plan PRO"
            const m = s.match(/Plan[:\s]+([A-Z]{2,10})/i);
            if (m) return m[1].toUpperCase();
            // Detectar palabra clave suelta (ej: "...CardiologÃ­a NORMAL")
            // Orden importante: mÃ¡s largo primero para evitar falsos positivos
            const planes = ['CLINIC', 'NORMAL', 'GIFT', 'TRIAL', 'PRO'];
            for (const p of planes) {
                if (new RegExp('\\b' + p + '\\b', 'i').test(s)) return p;
            }
            return '';
        }

        /** Genera el HTML del badge grande del plan (para el modal) */
        function _renderPlanBadge(plan) {
            const cfg = {
                NORMAL: { color: '#1d4ed8', bg: '#dbeafe', icon: 'ðŸ“‹' },
                PRO:    { color: '#7c3aed', bg: '#ede9fe', icon: 'â­' },
                CLINIC: { color: '#0f766e', bg: '#ccfbf1', icon: 'ðŸ¥' },
                GIFT:   { color: '#b45309', bg: '#fef3c7', icon: 'ðŸŽ' },
                TRIAL:  { color: '#9a3412', bg: '#fee2e2', icon: 'ðŸ”¬' }
            };
            const c = cfg[plan] || { color: '#475569', bg: '#f1f5f9', icon: 'ðŸ“„' };
            return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 14px;background:${c.bg};color:${c.color};border-radius:20px;font-weight:700;font-size:.95rem;">${c.icon} ${plan}</span>`;
        }

        /** Genera el HTML del badge pequeÃ±o del plan (para las tarjetas) */
        function _renderPlanBadgeMini(plan) {
            const cfg = {
                NORMAL: { color: '#1d4ed8', bg: '#dbeafe', icon: 'ðŸ“‹' },
                PRO:    { color: '#7c3aed', bg: '#ede9fe', icon: 'â­' },
                CLINIC: { color: '#0f766e', bg: '#ccfbf1', icon: 'ðŸ¥' },
                GIFT:   { color: '#b45309', bg: '#fef3c7', icon: 'ðŸŽ' },
                TRIAL:  { color: '#9a3412', bg: '#fee2e2', icon: 'ðŸ”¬' }
            };
            const c = cfg[plan] || { color: '#475569', bg: '#f1f5f9', icon: 'ðŸ“„' };
            return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:${c.bg};color:${c.color};border-radius:12px;font-weight:700;font-size:.74rem;">${c.icon} ${plan}</span>`;
        }

        /** Actualiza el bloque de estado de keys en el modal de aprobaciÃ³n */
        function _updateApproveKeysStatus() {
            const statusEl = document.getElementById('approveKeysStatus');
            if (!statusEl) return;
            const k  = (document.getElementById('approveApiKey')?.value  || '').trim();
            const b1 = (document.getElementById('approveApiKeyB1')?.value || '').trim();
            const b2 = (document.getElementById('approveApiKeyB2')?.value || '').trim();
            const editBtn = `<button type="button" onclick="toggleApproveKeysEdit()" style="margin-left:.6rem;padding:2px 9px;font-size:.77rem;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;background:#f1f5f9;color:#334155;">âœï¸ Editar</button>`;
            if (k) {
                const bkParts = [b1 ? 'B1 âœ“' : '', b2 ? 'B2 âœ“' : ''].filter(Boolean).join(', ');
                statusEl.innerHTML = `<span style="color:#15803d;font-weight:600;">âœ… Keys configuradas</span>` +
                    (bkParts ? ` <span style="color:#64748b;font-size:.78rem;">(respaldos: ${bkParts})</span>` : '') + editBtn;
            } else {
                statusEl.innerHTML = `<span style="color:#dc2626;font-weight:600;">âš ï¸ Sin keys â€” configurÃ¡ las claves en la pestaÃ±a "ðŸ”‘ Mis Keys"</span>` +
                    `<button type="button" onclick="toggleApproveKeysEdit()" style="margin-left:.6rem;padding:2px 9px;font-size:.77rem;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;background:#fef2f2;color:#b91c1c;">âš™ï¸ Ingresar</button>`;
            }
        }

        /** Muestra/oculta el panel de ediciÃ³n de keys */
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
            if (!el || !el.value.trim()) { showNotification('El campo estÃ¡ vacÃ­o', 'warning'); return; }
            navigator.clipboard.writeText(el.value.trim())
                .then(() => showNotification('âœ… Key copiada al portapapeles', 'success'))
                .catch(() => { el.select(); document.execCommand('copy'); showNotification('âœ… Key copiada', 'success'); });
        }

        /** Alterna visibilidad del campo de key */
        function toggleKeyVisibility(inputId, btnId) {
            const el  = document.getElementById(inputId);
            const btn = document.getElementById(btnId);
            if (!el) return;
            if (el.type === 'password') { el.type = 'text'; if (btn) btn.textContent = 'ðŸ™ˆ'; }
            else                        { el.type = 'password'; if (btn) btn.textContent = 'ðŸ‘ï¸'; }
        }

        /** Obtiene las categorÃ­as de plantillas relevantes para las especialidades del doctor */
        function _getDoctorTemplateCategories() {
            const espStr = document.getElementById('approveRegEspecialidades').value || '';
            const esps = espStr.split(',').map(s => s.trim()).filter(Boolean);
            const cats = new Set();
            esps.forEach(esp => {
                const mapped = FORM_ESP_TO_TEMPLATE_CAT[esp];
                if (mapped) mapped.forEach(c => cats.add(c));
            });
            // Siempre incluir General como opciÃ³n
            cats.add('General');
            return cats;
        }

        /** Renderiza la secciÃ³n de plantillas segÃºn el plan seleccionado */
        function updateApproveTemplateUI() {
            const plan = document.getElementById('approvePlan').value;
            const section = document.getElementById('approveTemplateSection');
            const devicesInfo = document.getElementById('approveDevicesInfo');
            const devices = DEVICES_POR_PLAN[plan] || 2;
            devicesInfo.textContent = devices >= 999 ? 'âˆž (ilimitados)' : devices;

            const doctorCats = _getDoctorTemplateCategories();
            const allCats = Object.keys(TEMPLATE_MAP);

            if (plan === 'GIFT') {
                // GIFT: todas las plantillas, sin selecciÃ³n
                const allTemplates = [];
                allCats.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => allTemplates.push(t.name));
                });
                section.innerHTML = `
                    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;border-radius:10px;padding:.8rem 1rem;text-align:center;">
                        <span style="font-size:1.5rem;">ðŸŽ</span>
                        <p style="font-weight:600;font-size:.88rem;color:#92400e;margin:.3rem 0 .2rem;">Plan REGALO â€” TODAS las plantillas incluidas</p>
                        <p style="font-size:.75rem;color:#a16207;margin:0;">${allTemplates.length} plantillas Â· 10 dispositivos Â· Funcionalidades PRO</p>
                        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:.5rem;justify-content:center;">
                            ${allTemplates.map(n => `<span style="padding:2px 6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;font-size:.7rem;color:#9a3412;">${escapeHtml(n)}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else if (plan === 'CLINIC') {
                // CLINIC: seleccionar packs (categorÃ­as completas), mÃ¡x 3
                let html = `
                    <label style="font-weight:600;font-size:.85rem;">ðŸ“¦ Packs de especialidad <span style="color:#94a3b8;font-weight:400;">(mÃ¡x. 3)</span></label>
                    <div id="approvePackCounter" style="font-size:.78rem;color:#64748b;margin:.3rem 0;">0/3 packs seleccionados</div>
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
            } else if (plan === 'PRO') {
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
                    <label style="font-weight:600;font-size:.85rem;">ðŸ“‹ Plantillas incluidas por especialidad</label>
                    <div style="font-size:.78rem;color:#0f766e;margin:.3rem 0;">âœ… ${autoKeys.length} plantillas de sus especialidades (incluidas automÃ¡ticamente)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin:.4rem 0 .8rem;">
                        ${autoNames.map(n => `<span class="badge badge-specialty">${escapeHtml(n)}</span>`).join('')}
                    </div>
                `;

                // Plantillas extra (de otras categorÃ­as)
                const otherCats = allCats.filter(c => !doctorCats.has(c));
                if (otherCats.length > 0) {
                    html += `
                        <label style="font-weight:600;font-size:.85rem;">âž• Plantillas extra <span style="color:#94a3b8;font-weight:400;">(opcional, de otras especialidades)</span></label>
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
                // NORMAL / TRIAL: elegir hasta 3 plantillas individuales de sus especialidades
                const maxTpl = 3;
                let html = `
                    <label style="font-weight:600;font-size:.85rem;">ðŸ“‹ Plantillas permitidas <span style="color:#94a3b8;font-weight:400;">(mÃ¡x. ${maxTpl})</span></label>
                    <div id="approveTplCounter" style="font-size:.78rem;color:#64748b;margin:.3rem 0;">0/${maxTpl} seleccionadas</div>
                    <div class="tpl-individual-grid" style="margin-top:.4rem;">
                `;

                // Primero las categorÃ­as del doctor
                const orderedCats = [...doctorCats, ...allCats.filter(c => !doctorCats.has(c))];
                const seen = new Set();
                orderedCats.forEach(cat => {
                    if (seen.has(cat)) return;
                    seen.add(cat);
                    const isRelevant = doctorCats.has(cat);
                    html += `<div style="margin-bottom:.5rem;${!isRelevant ? 'opacity:.5;' : ''}">
                        <div style="font-weight:600;font-size:.78rem;color:${isRelevant ? '#0f766e' : '#94a3b8'};margin-bottom:.2rem;">${cat} ${isRelevant ? 'â˜…' : ''}</div>
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
                // Sin datos del carrito â†’ auto-seleccionar las primeras N de la especialidad del mÃ©dico
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

            // Deshabilitar unchecked si se alcanzÃ³ el mÃ¡ximo
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
            const max = 3;
            const cbs = document.querySelectorAll('.approve-pack-cb');
            const checked = Array.from(cbs).filter(cb => cb.checked);
            const counter = document.getElementById('approvePackCounter');
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
            const maxDevices = DEVICES_POR_PLAN[plan] || 2;

            // Leer campos editados en la secciÃ³n de verificaciÃ³n
            const _editNombre      = (document.getElementById('approveEditNombre')?.value      || '').trim();
            const _editMatricula   = (document.getElementById('approveEditMatricula')?.value   || '').trim();
            const _editEmail       = (document.getElementById('approveEditEmail')?.value       || '').trim();
            const _editTelefono    = (document.getElementById('approveEditTelefono')?.value    || '').trim();
            const _editEsp         = (document.getElementById('approveEditEspecialidades')?.value || '').trim();
            const _editNotas       = (document.getElementById('approveEditNotas')?.value       || '').trim();
            const _editHeaderColor = document.getElementById('approveEditHeaderColor')?.value   || '#1a56a0';
            const _editFooterText  = (document.getElementById('approveEditFooterText')?.value  || '').trim();
            const _editWp = JSON.stringify({
                name:      (document.getElementById('approveEditWpName')?.value      || '').trim(),
                address:   (document.getElementById('approveEditWpAddress')?.value   || '').trim(),
                phone:     (document.getElementById('approveEditWpPhone')?.value     || '').trim(),
                specialty: (document.getElementById('approveEditWpSpecialty')?.value || '').trim()
            });

            if (!apiKey) {
                await dashAlert('DebÃ©s ingresar una API Key para este profesional. UsÃ¡ el botÃ³n âš™ï¸ Ingresar para configurarla.', 'ðŸ”‘');
                document.getElementById('approveKeysEditSection').style.display = 'block';
                _updateApproveKeysStatus();
                document.getElementById('approveApiKey').focus();
                return;
            }

            // Recopilar plantillas segÃºn plan
            let selectedTemplates = [];

            if (plan === 'GIFT') {
                // GIFT: todas las plantillas
                Object.values(TEMPLATE_MAP).forEach(cat => {
                    cat.forEach(t => selectedTemplates.push(t.key));
                });
            } else if (plan === 'CLINIC') {
                const packs = Array.from(document.querySelectorAll('.approve-pack-cb:checked')).map(cb => cb.value);
                if (packs.length === 0) {
                    await dashAlert('SeleccionÃ¡ al menos 1 pack de especialidad', 'ðŸ“¦');
                    return;
                }
                packs.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => selectedTemplates.push(t.key));
                });
            } else if (plan === 'PRO') {
                // Auto: todas las de sus especialidades
                const doctorCats = _getDoctorTemplateCategories();
                doctorCats.forEach(cat => {
                    (TEMPLATE_MAP[cat] || []).forEach(t => selectedTemplates.push(t.key));
                });
                // + extras
                const extras = Array.from(document.querySelectorAll('.approve-extra-cb:checked')).map(cb => cb.value);
                selectedTemplates.push(...extras);
            } else {
                // NORMAL / TRIAL
                selectedTemplates = Array.from(document.querySelectorAll('.approve-tpl-cb:checked')).map(cb => cb.value);
                if (selectedTemplates.length === 0) {
                    await dashAlert('SeleccionÃ¡ al menos 1 plantilla', 'ðŸ“‹');
                    return;
                }
            }

            // Deduplicate
            selectedTemplates = [...new Set(selectedTemplates)];
            const templatesStr = JSON.stringify(selectedTemplates);

            const btn = document.getElementById('btnConfirmApprove');
            btn.disabled = true;
            btn.textContent = 'â³ Procesando...';

            try {
                const authStr = _getSessionAuthParams();
                const url = `${CONFIG.scriptUrl}?action=admin_approve_registration&regId=${encodeURIComponent(regId)}&plan=${encodeURIComponent(plan)}&apiKey=${encodeURIComponent(apiKey)}&apiKeyB1=${encodeURIComponent(apiKeyB1)}&apiKeyB2=${encodeURIComponent(apiKeyB2)}&maxDevices=${encodeURIComponent(maxDevices)}&allowedTemplates=${encodeURIComponent(templatesStr)}&editedNombre=${encodeURIComponent(_editNombre)}&editedMatricula=${encodeURIComponent(_editMatricula)}&editedEmail=${encodeURIComponent(_editEmail)}&editedTelefono=${encodeURIComponent(_editTelefono)}&editedEspecialidades=${encodeURIComponent(_editEsp)}&editedNotas=${encodeURIComponent(_editNotas)}&editedHeaderColor=${encodeURIComponent(_editHeaderColor)}&editedFooterText=${encodeURIComponent(_editFooterText)}&editedWorkplace=${encodeURIComponent(_editWp)}&${authStr}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                closeApproveModal();
                showNotification(`âœ… ${data.nombre} aprobado â€” ID: ${data.medicoId}`, 'success');

                // Ofrecer generar link
                if (data.medicoId) {
                    const generateLink = await dashConfirm(
                        `<b>Usuario creado:</b> ${data.medicoId}<br><b>Plan:</b> ${plan}<br><b>Plantillas:</b> ${selectedTemplates.length}<br><b>Dispositivos:</b> ${maxDevices >= 999 ? 'âˆž' : maxDevices}<br><br>Â¿QuerÃ©s abrir la FÃ¡brica de Clones para generar el link de instalaciÃ³n?`,
                        'ðŸ­'
                    );
                    if (generateLink) {
                        await loadDashboard(true);
                        openCloneFactory(data.medicoId);
                    }
                }

                registrosLoaded = false;
                loadRegistrations();
            } catch (err) {
                await dashAlert('Error al aprobar: ' + err.message, 'âŒ');
            } finally {
                btn.disabled = false;
                btn.textContent = 'âœ… Aprobar y Crear Usuario';
            }
        }

        async function rejectRegistration(regId) {
            const reg = allRegistrations.find(r => r.ID_Registro === regId);
            const nombre = reg ? reg.Nombre : regId;

            const ok = await dashConfirm(`Â¿EstÃ¡s seguro de rechazar el registro de <b>${escapeHtml(nombre)}</b>?`, 'âŒ');
            if (!ok) return;

            const motivo = await dashPrompt('Motivo del rechazo (opcional):', '', 'ðŸ“');
            if (motivo === null) return; // CancelÃ³

            try {
                const authStr = _getSessionAuthParams();
                const reason = motivo || 'Rechazado por el administrador';
                const url = `${CONFIG.scriptUrl}?action=admin_reject_registration&regId=${encodeURIComponent(regId)}&motivo=${encodeURIComponent(reason)}&${authStr}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                showNotification('âŒ Registro rechazado', 'info');
                registrosLoaded = false;
                loadRegistrations();
            } catch (err) {
                await dashAlert('Error al rechazar: ' + err.message, 'âŒ');
            }
        }

        function copyRegLink() {
            const link = window.location.origin + window.location.pathname.replace('admin.html', 'registro.html');
            navigator.clipboard.writeText(link).then(() => {
                showNotification('ðŸ“‹ Link de registro copiado', 'success');
            }).catch(() => {
                dashAlert(`CopiÃ¡ este link:<br><br><input type="text" value="${link}" readonly style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem;" onclick="this.select()">`, 'ðŸ”—');
            });
        }

        // Load registration count on init (for badge)
        async function loadRegBadgeCount() {
            try {
                const res = await fetch(`${CONFIG.scriptUrl}?action=admin_list_registrations&${_getSessionAuthParams()}`);
                const data = await res.json();
                if (data.registrations) {
                    allRegistrations = data.registrations;
                    const pendientes = data.registrations.filter(r => String(r.Estado || '').toLowerCase() === 'pendiente');
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
