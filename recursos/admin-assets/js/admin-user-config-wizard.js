(function() {
    'use strict';

    let current = null;

    function esc(str) {
        return String(str || '').replace(/[&<>"']/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function parseJson(raw, fallback) {
        try { return JSON.parse(raw); } catch (_) { return fallback; }
    }

    function fileToDataUrl(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function buildModalShell() {
        if (document.getElementById('adminUserCfgOverlay')) return;
        const style = document.createElement('style');
        style.id = 'adminUserCfgStyle';
        style.textContent = [
            '#adminUserCfgOverlay{position:fixed;inset:0;background:rgba(2,6,23,.55);display:none;z-index:3000;padding:18px;overflow:auto;}',
            '#adminUserCfgModal{max-width:980px;margin:0 auto;background:var(--bg-card,#fff);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);}',
            '#adminUserCfgHead{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e2e8f0;}',
            '#adminUserCfgTitle{font-weight:800;font-size:1.05rem;}',
            '#adminUserCfgPlan{font-size:.8rem;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;padding:3px 8px;border-radius:999px;}',
            '#adminUserCfgTabs{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px;border-bottom:1px solid #e2e8f0;}',
            '.auc-tab{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:999px;padding:7px 12px;cursor:pointer;font-weight:700;font-size:.82rem;}',
            '.auc-tab.active{background:#0ea5e9;color:#fff;border-color:#0284c7;}',
            '#adminUserCfgBody{padding:14px 18px;}',
            '.auc-panel{display:none;}',
            '.auc-panel.active{display:block;}',
            '.auc-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
            '.auc-field{margin-bottom:10px;}',
            '.auc-field label{display:block;font-size:.8rem;font-weight:700;color:#475569;margin-bottom:4px;}',
            '.auc-field input,.auc-field textarea{width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.88rem;}',
            '.auc-hint{font-size:.73rem;color:#64748b;}',
            '.auc-box{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc;}',
            '.auc-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;}',
            '.auc-check-item{display:flex;align-items:center;gap:6px;font-size:.84rem;}',
            '.auc-wp{border:1px solid #dbeafe;border-radius:10px;padding:10px;background:#f8fbff;margin-bottom:8px;}',
            '.auc-wp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:.8rem;font-weight:800;color:#1d4ed8;}',
            '#adminUserCfgFoot{padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;}',
            '.auc-btn{border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700;background:#fff;}',
            '.auc-btn.primary{background:#0ea5e9;color:#fff;border-color:#0284c7;}',
            '.auc-btn.danger{background:#fff1f2;border-color:#fecdd3;color:#be123c;}',
            '#aucWarn{display:none;border:1px solid #fca5a5;background:#fff1f2;color:#991b1b;padding:8px 10px;border-radius:8px;margin-bottom:10px;font-size:.8rem;}',
            '@media (max-width:800px){.auc-row{grid-template-columns:1fr}.auc-check-grid{grid-template-columns:1fr}}'
        ].join('');
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'adminUserCfgOverlay';
        overlay.innerHTML = [
            '<div id="adminUserCfgModal">',
            '  <div id="adminUserCfgHead">',
            '    <div>',
            '      <div id="adminUserCfgTitle">Configuración avanzada de usuario</div>',
            '      <div class="auc-hint" id="adminUserCfgSub"></div>',
            '    </div>',
            '    <div style="display:flex;align-items:center;gap:8px;">',
            '      <span id="adminUserCfgPlan"></span>',
            '      <button class="auc-btn" id="aucCloseTop">Cerrar</button>',
            '    </div>',
            '  </div>',
            '  <div id="adminUserCfgTabs">',
            '    <button class="auc-tab active" data-tab="datos">Datos</button>',
            '    <button class="auc-tab" data-tab="esp">Especialidades</button>',
            '    <button class="auc-tab" data-tab="trabajo">Trabajo</button>',
            '    <button class="auc-tab" data-tab="pdf">PDF</button>',
            '  </div>',
            '  <div id="adminUserCfgBody">',
            '    <div id="aucWarn"></div>',
            '    <div class="auc-panel active" data-panel="datos"></div>',
            '    <div class="auc-panel" data-panel="esp"></div>',
            '    <div class="auc-panel" data-panel="trabajo"></div>',
            '    <div class="auc-panel" data-panel="pdf"></div>',
            '  </div>',
            '  <div id="adminUserCfgFoot">',
            '    <button class="auc-btn" id="aucCancelBottom">Cancelar</button>',
            '    <button class="auc-btn primary" id="aucSaveBtn">Guardar cambios</button>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) close();
        });
        document.getElementById('aucCloseTop').addEventListener('click', close);
        document.getElementById('aucCancelBottom').addEventListener('click', close);
        document.getElementById('adminUserCfgTabs').addEventListener('click', function(e) {
            const btn = e.target.closest('.auc-tab');
            if (!btn || !current) return;
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.auc-tab').forEach(function(x) {
                x.classList.toggle('active', x === btn);
            });
            document.querySelectorAll('.auc-panel').forEach(function(p) {
                p.classList.toggle('active', p.getAttribute('data-panel') === tab);
            });
        });
        document.getElementById('aucSaveBtn').addEventListener('click', async function() {
            if (!current) return;
            await save();
        });
    }

    function readInitialWorkplaces(user, rd) {
        const items = [];
        if (rd && rd.workplace && typeof rd.workplace === 'object') {
            items.push(Object.assign({}, rd.workplace));
        }
        if (Array.isArray(rd && rd.extraWorkplaces)) {
            rd.extraWorkplaces.forEach(function(wp) {
                if (wp && typeof wp === 'object') items.push(Object.assign({}, wp));
            });
        }
        if (!items.length && user && user.Lugares_Trabajo) {
            items.push({ name: String(user.Lugares_Trabajo) });
        }
        if (!items.length) items.push({ name: '', address: '', phone: '', email: '', footer: '' });
        return items;
    }

    function render() {
        const overlay = document.getElementById('adminUserCfgOverlay');
        const user = current.user;
        const state = current.state;
        const rules = current.rules;

        document.getElementById('adminUserCfgTitle').textContent = 'Editar configuración: ' + (user.Nombre || user.ID_Medico || 'Usuario');
        document.getElementById('adminUserCfgSub').textContent = 'Flujo de edición administrativa con límites por plan y persistencia en Registro_Datos.';
        document.getElementById('adminUserCfgPlan').textContent = 'Plan: ' + String(user.Plan || 'NORMAL').toUpperCase();

        const warn = document.getElementById('aucWarn');
        if (state.workplaces.length > rules.maxWorkplaces) {
            warn.style.display = 'block';
            warn.textContent = 'Este usuario tiene ' + state.workplaces.length + ' lugares configurados y su plan permite ' + rules.maxWorkplaces + '. No se eliminarán, pero no se pueden agregar más.';
        } else {
            warn.style.display = 'none';
            warn.textContent = '';
        }

        renderDatos();
        renderEspecialidades();
        renderTrabajo();
        renderPdf();

        overlay.style.display = 'block';
    }

    function renderDatos() {
        const p = document.querySelector('.auc-panel[data-panel="datos"]');
        const s = current.state;
        p.innerHTML = [
            '<div class="auc-row">',
            '  <div class="auc-field"><label>Nombre</label><input id="aucNombre" value="' + esc(s.nombre) + '"></div>',
            '  <div class="auc-field"><label>Matrícula</label><input id="aucMatricula" value="' + esc(s.matricula) + '"></div>',
            '</div>',
            '<div class="auc-row">',
            '  <div class="auc-field"><label>Email</label><input id="aucEmail" type="email" value="' + esc(s.email) + '"></div>',
            '  <div class="auc-field"><label>Teléfono</label><input id="aucTelefono" value="' + esc(s.telefono) + '"></div>',
            '</div>',
            '<div class="auc-row">',
            '  <div class="auc-field"><label>Estado</label><input id="aucEstado" value="' + esc(s.estado) + '"></div>',
            '  <div class="auc-field"><label>Dispositivos máximos</label><input id="aucDevices" type="number" min="1" value="' + esc(String(s.devicesMax || 1)) + '"><div class="auc-hint">Límite recomendado del plan: ' + current.rules.maxDevices + '</div></div>',
            '</div>'
        ].join('');
    }

    function buildStudiesList() {
        const studies = [];
        const map = current.studiesMap;
        current.state.especialidades.forEach(function(esp) {
            const arr = map[esp] || [];
            arr.forEach(function(st) {
                studies.push({ nombre: st, especialidad: esp });
            });
        });
        return studies;
    }

    function renderEspecialidades() {
        const p = document.querySelector('.auc-panel[data-panel="esp"]');
        const s = current.state;
        const rules = current.rules;
        const selectedStudies = new Set(s.estudios.map(function(x) { return x.nombre; }));
        const studies = buildStudiesList();
        const studyLimit = rules.studyLimit;

        let html = '<div class="auc-box"><div style="font-weight:800;margin-bottom:6px;">Especialidades</div><div class="auc-check-grid">';
        current.especialidades.forEach(function(esp) {
            const checked = s.especialidades.includes(esp) ? 'checked' : '';
            html += '<label class="auc-check-item"><input type="checkbox" class="auc-esp" value="' + esc(esp) + '" ' + checked + '> ' + esc(esp) + '</label>';
        });
        html += '</div></div>';

        html += '<div class="auc-box" style="margin-top:8px;"><div style="font-weight:800;margin-bottom:6px;">Estudios</div>';
        html += '<div class="auc-hint" style="margin-bottom:6px;">';
        if (studyLimit > 0) {
            html += 'Plan con límite: ' + studyLimit + ' estudios.';
        } else {
            html += 'Sin límite de estudios para este plan.';
        }
        html += '</div>';
        html += '<div class="auc-check-grid">';

        studies.forEach(function(st) {
            const isChecked = selectedStudies.has(st.nombre);
            const blocked = (studyLimit > 0 && !isChecked && selectedStudies.size >= studyLimit);
            html += '<label class="auc-check-item" style="opacity:' + (blocked ? '0.5' : '1') + '"><input type="checkbox" class="auc-study" data-esp="' + esc(st.especialidad) + '" value="' + esc(st.nombre) + '" ' + (isChecked ? 'checked' : '') + ' ' + (blocked ? 'disabled' : '') + '> ' + esc(st.nombre) + ' <small>(' + esc(st.especialidad) + ')</small></label>';
        });

        if (!studies.length) {
            html += '<div class="auc-hint">Seleccioná al menos una especialidad para ver estudios.</div>';
        }

        html += '</div></div>';
        p.innerHTML = html;

        p.querySelectorAll('.auc-esp').forEach(function(cb) {
            cb.addEventListener('change', function() {
                const list = Array.from(p.querySelectorAll('.auc-esp:checked')).map(function(x) { return x.value; });
                current.state.especialidades = list;
                current.state.estudios = current.state.estudios.filter(function(st) {
                    return list.includes(st.especialidad);
                });
                renderEspecialidades();
            });
        });

        p.querySelectorAll('.auc-study').forEach(function(cb) {
            cb.addEventListener('change', function() {
                const next = Array.from(p.querySelectorAll('.auc-study:checked')).map(function(x) {
                    return { nombre: x.value, especialidad: x.getAttribute('data-esp') || '' };
                });
                current.state.estudios = next;
                renderEspecialidades();
            });
        });
    }

    function renderTrabajo() {
        const p = document.querySelector('.auc-panel[data-panel="trabajo"]');
        const s = current.state;
        const maxWp = current.rules.maxWorkplaces;
        let html = '<div class="auc-hint" style="margin-bottom:8px;">Lugares configurables por plan: ' + maxWp + '.</div>';
        html += '<div id="aucWpList">';
        s.workplaces.forEach(function(wp, idx) {
            html += [
                '<div class="auc-wp" data-idx="' + idx + '">',
                '  <div class="auc-wp-head">',
                '    <span>' + (idx === 0 ? 'Principal' : 'Adicional ' + idx) + '</span>',
                idx > 0 ? '    <button class="auc-btn danger aucWpRemove" data-rm="' + idx + '">Quitar</button>' : '',
                '  </div>',
                '  <div class="auc-row">',
                '    <div class="auc-field"><label>Nombre</label><input class="aucWpName" data-wp="' + idx + '" value="' + esc(wp.name || '') + '"></div>',
                '    <div class="auc-field"><label>Dirección</label><input class="aucWpAddress" data-wp="' + idx + '" value="' + esc(wp.address || '') + '"></div>',
                '  </div>',
                '  <div class="auc-row">',
                '    <div class="auc-field"><label>Teléfono</label><input class="aucWpPhone" data-wp="' + idx + '" value="' + esc(wp.phone || '') + '"></div>',
                '    <div class="auc-field"><label>Email</label><input class="aucWpEmail" data-wp="' + idx + '" value="' + esc(wp.email || '') + '"></div>',
                '  </div>',
                '  <div class="auc-field"><label>Footer PDF</label><input class="aucWpFooter" data-wp="' + idx + '" value="' + esc(wp.footer || '') + '"></div>',
                '</div>'
            ].join('');
        });
        html += '</div>';

        const canAdd = s.workplaces.length < maxWp;
        html += '<button class="auc-btn" id="aucAddWp" ' + (canAdd ? '' : 'disabled') + '>Agregar lugar</button>';
        p.innerHTML = html;

        const bindField = function(sel, key) {
            p.querySelectorAll(sel).forEach(function(el) {
                el.addEventListener('input', function() {
                    const idx = Number(el.getAttribute('data-wp'));
                    if (!s.workplaces[idx]) return;
                    s.workplaces[idx][key] = el.value;
                });
            });
        };
        bindField('.aucWpName', 'name');
        bindField('.aucWpAddress', 'address');
        bindField('.aucWpPhone', 'phone');
        bindField('.aucWpEmail', 'email');
        bindField('.aucWpFooter', 'footer');

        p.querySelectorAll('.aucWpRemove').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const idx = Number(btn.getAttribute('data-rm'));
                s.workplaces.splice(idx, 1);
                renderTrabajo();
            });
        });

        const addBtn = document.getElementById('aucAddWp');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                s.workplaces.push({ name: '', address: '', phone: '', email: '', footer: '' });
                renderTrabajo();
            });
        }
    }

    function renderPdf() {
        const p = document.querySelector('.auc-panel[data-panel="pdf"]');
        const s = current.state;
        const rules = current.rules;

        p.innerHTML = [
            '<div class="auc-row">',
            '  <div class="auc-field"><label>Color encabezado</label><input id="aucHeaderColor" type="color" value="' + esc(s.headerColor || '#1a56a0') + '"></div>',
            '  <div class="auc-field"><label>Firma (imagen)</label><input id="aucFirmaFile" type="file" accept="image/*"><div class="auc-hint" id="aucFirmaHint">' + (s.firma ? 'Cargada' : 'Sin imagen') + '</div></div>',
            '</div>',
            '<div class="auc-row">',
            '  <div class="auc-field"><label>Logo profesional</label><input id="aucLogoFile" type="file" accept="image/*" ' + (rules.allowPdfLogo ? '' : 'disabled') + '><div class="auc-hint">' + (rules.allowPdfLogo ? (s.proLogo ? 'Cargado' : 'Sin imagen') : 'Bloqueado por plan') + '</div></div>',
            '  <div class="auc-field">',
            '    <label>Visibilidad en PDF</label>',
            '    <label class="auc-check-item"><input type="checkbox" id="aucShowPhone" ' + (s.showPhone ? 'checked' : '') + '> Mostrar teléfono</label>',
            '    <label class="auc-check-item"><input type="checkbox" id="aucShowEmail" ' + (s.showEmail ? 'checked' : '') + '> Mostrar email</label>',
            '    <label class="auc-check-item" style="opacity:' + (rules.allowSocial ? '1' : '0.5') + '"><input type="checkbox" id="aucShowSocial" ' + (s.showSocial ? 'checked' : '') + ' ' + (rules.allowSocial ? '' : 'disabled') + '> Mostrar redes sociales</label>',
            '  </div>',
            '</div>'
        ].join('');

        document.getElementById('aucHeaderColor').addEventListener('input', function(e) {
            s.headerColor = e.target.value || '#1a56a0';
        });
        document.getElementById('aucShowPhone').addEventListener('change', function(e) {
            s.showPhone = !!e.target.checked;
        });
        document.getElementById('aucShowEmail').addEventListener('change', function(e) {
            s.showEmail = !!e.target.checked;
        });
        const social = document.getElementById('aucShowSocial');
        if (social) {
            social.addEventListener('change', function(e) {
                s.showSocial = !!e.target.checked;
            });
        }

        const firmaInput = document.getElementById('aucFirmaFile');
        firmaInput.addEventListener('change', async function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            s.firma = await fileToDataUrl(file);
            document.getElementById('aucFirmaHint').textContent = 'Cargada';
        });

        const logoInput = document.getElementById('aucLogoFile');
        if (logoInput) {
            logoInput.addEventListener('change', async function(e) {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                s.proLogo = await fileToDataUrl(file);
            });
        }
    }

    function collectDatosPanel() {
        const s = current.state;
        s.nombre = document.getElementById('aucNombre').value.trim();
        s.matricula = document.getElementById('aucMatricula').value.trim();
        s.email = document.getElementById('aucEmail').value.trim();
        s.telefono = document.getElementById('aucTelefono').value.trim();
        s.estado = document.getElementById('aucEstado').value.trim() || 'active';
        s.devicesMax = Math.max(1, Number(document.getElementById('aucDevices').value) || 1);
    }

    async function save() {
        const saveBtn = document.getElementById('aucSaveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            collectDatosPanel();
            const s = current.state;

            const workplaceMain = s.workplaces[0] || {};
            const extraWorkplaces = s.workplaces.slice(1);

            const nextReg = Object.assign({}, current.rd || {});
            nextReg.workplace = workplaceMain;
            nextReg.extraWorkplaces = extraWorkplaces;
            nextReg.headerColor = s.headerColor || '#1a56a0';
            nextReg.firma = s.firma || null;
            if (current.rules.allowPdfLogo) {
                nextReg.proLogo = s.proLogo || null;
            }
            nextReg.showPhone = !!s.showPhone;
            nextReg.showEmail = !!s.showEmail;
            nextReg.showSocial = current.rules.allowSocial ? !!s.showSocial : false;
            nextReg.estudios = s.estudios;

            const updates = {
                Nombre: s.nombre,
                Matricula: s.matricula,
                Email: s.email,
                Telefono: s.telefono,
                Especialidad: s.especialidades.join(', '),
                Estado: s.estado,
                Devices_Max: s.devicesMax,
                Lugares_Trabajo: s.workplaces.map(function(wp) { return wp.name; }).filter(Boolean).join(' | '),
                Estudios_JSON: JSON.stringify(s.estudios),
                Registro_Datos: JSON.stringify(nextReg)
            };

            const result = await current.saveUser(updates);
            if (!result || result.error) {
                throw new Error(result && result.error ? result.error : 'No se pudieron guardar los cambios');
            }

            if (typeof current.onSaved === 'function') {
                current.onSaved(updates);
            }
            if (typeof current.toast === 'function') {
                current.toast('✅ Configuración actualizada', 'success');
            }
            close();
        } catch (err) {
            if (typeof current.toast === 'function') {
                current.toast('Error al guardar: ' + err.message, 'error');
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar cambios';
        }
    }

    function close() {
        const overlay = document.getElementById('adminUserCfgOverlay');
        if (overlay) overlay.style.display = 'none';
        current = null;
    }

    function open(options) {
        buildModalShell();

        const user = options.user || {};
        const rd = parseJson(user.Registro_Datos || '{}', {});
        const planCfg = options.planConfig || {};
        const rules = window.AdminUserConfigRules
            ? window.AdminUserConfigRules.getPlanRules(user.Plan, planCfg)
            : { maxWorkplaces: 1, maxDevices: 1, studyLimit: 3, allowPdfLogo: false, allowSocial: false };

        const especialidades = Array.isArray(options.especialidades) ? options.especialidades.slice() : [];
        const userEsp = String(user.Especialidad || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);

        const parsedEstudios = parseJson(user.Estudios_JSON || '[]', []);
        const normalizedEstudios = Array.isArray(parsedEstudios)
            ? parsedEstudios.map(function(x) {
                if (typeof x === 'string') return { nombre: x, especialidad: '' };
                return { nombre: x && x.nombre ? x.nombre : '', especialidad: x && x.especialidad ? x.especialidad : '' };
            }).filter(function(x) { return x.nombre; })
            : [];

        current = {
            user,
            rd,
            rules: Object.assign({}, rules, {
                maxWorkplaces: window.AdminUserConfigRules
                    ? window.AdminUserConfigRules.countAllowedWorkplaces(rules, readInitialWorkplaces(user, rd).length)
                    : Math.max(1, rules.maxWorkplaces || 1)
            }),
            especialidades,
            studiesMap: options.estudiosPorEspecialidad || {},
            saveUser: options.saveUser,
            onSaved: options.onSaved,
            toast: options.toast,
            state: {
                nombre: user.Nombre || '',
                matricula: user.Matricula || '',
                email: user.Email || '',
                telefono: user.Telefono || '',
                estado: user.Estado || 'active',
                devicesMax: Number(user.Devices_Max) || Number(rules.maxDevices) || 1,
                especialidades: userEsp,
                estudios: normalizedEstudios,
                workplaces: readInitialWorkplaces(user, rd),
                headerColor: rd.headerColor || '#1a56a0',
                firma: rd.firma || null,
                proLogo: rd.proLogo || null,
                showPhone: rd.showPhone !== false,
                showEmail: rd.showEmail !== false,
                showSocial: !!rd.showSocial
            }
        };

        render();
    }

    window.AdminUserConfigWizard = {
        open,
        close
    };
})();
