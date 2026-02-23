// ============ REGISTRO DE PACIENTES ============
// Almacena pacientes en localStorage bajo la clave 'patient_registry'.
// Cada entrada: { name, dni, age, sex, insurance, affiliateNum, lastSeen }
// Permite buscar por apellido (parcial) o DNI y autocompletar el modal de datos.

const REGISTRY_KEY = 'patient_registry';
const REGISTRY_MAX = 500; // máximo de pacientes almacenados

// ---- Leer / escribir ----
function getRegistry() {
    try { return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]'); }
    catch (_) { return []; }
}

function setRegistry(arr) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(arr));
}

// ---- Guardar paciente ----
// Si ya existe un paciente con el mismo DNI → actualizar; si no → agregar.
window.savePatientToRegistry = function(patient) {
    if (!patient || !patient.name) return;
    const reg    = getRegistry();
    const normDni = (patient.dni || '').replace(/\D/g, '');
    let idx = -1;

    if (normDni) {
        idx = reg.findIndex(p => p.dni && p.dni.replace(/\D/g, '') === normDni);
    }
    if (idx === -1) {
        idx = reg.findIndex(p => _normStr(p.name) === _normStr(patient.name));
    }

    const entry = {
        name:         patient.name.trim(),
        dni:          patient.dni  || '',
        age:          patient.age  || '',
        sex:          patient.sex  || '',
        insurance:    patient.insurance    || '',
        affiliateNum: patient.affiliateNum || '',
        lastSeen:     new Date().toISOString()
    };

    if (idx >= 0) {
        reg[idx] = { ...reg[idx], ...entry };
    } else {
        reg.unshift(entry);
        if (reg.length > REGISTRY_MAX) reg.pop();
    }

    setRegistry(reg);
};

// ---- Buscar pacientes (apellido parcial o DNI parcial) ----
window.searchPatientRegistry = function(query) {
    if (!query || query.length < 2) return [];
    const q       = _normStr(query.replace(/\D/g, '') ? query : query);
    const normQ   = _normStr(q);
    const dniQ    = q.replace(/\D/g, '');
    return getRegistry()
        .filter(p =>
            (p.name && _normStr(p.name).includes(normQ)) ||
            (p.dni  && dniQ && p.dni.replace(/\D/g, '').includes(dniQ))
        )
        .slice(0, 20);
};

// ---- Poblar datalist del modal ----
window.populatePatientDatalist = function() {
    const datalist = document.getElementById('reqPatientDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    const reg = getRegistry().slice(0, 100); // top 100 recientes
    reg.forEach(p => {
        const opt  = document.createElement('option');
        const label = p.dni ? `${p.name} — DNI ${p.dni}` : p.name;
        opt.value  = label;
        datalist.appendChild(opt);
    });
};

// ---- Autocompletar campos al seleccionar del datalist ----
window.initPatientRegistrySearch = function() {
    const searchInput = document.getElementById('reqPatientSearch');
    if (!searchInput) return;

    populatePatientDatalist();

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 2) return;

        // Buscar coincidencia exacta (usuario seleccionó del datalist)
        const reg     = getRegistry();
        const normQ   = _normStr(query);
        const dniOnly = query.replace(/\D/g, '');

        const found = reg.find(p =>
            (p.name && (_normStr(`${p.name} — DNI ${p.dni}`) === normQ ||
                        _normStr(p.name) === normQ)) ||
            (p.dni  && dniOnly && p.dni.replace(/\D/g, '') === dniOnly)
        );

        if (found) {
            const setVal = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
            setVal('reqPatientName',        found.name);
            setVal('reqPatientDni',         found.dni);
            setVal('reqPatientAge',         found.age);
            setVal('reqPatientInsurance',   found.insurance);
            setVal('reqPatientAffiliateNum',found.affiliateNum);
            const sexEl = document.getElementById('reqPatientSex');
            if (sexEl && found.sex) sexEl.value = found.sex;
            if (typeof showToast === 'function')
                showToast(`✅ Paciente cargado: ${found.name}`, 'success');
        }
    });
};

// Función auxiliar normalización (definida en structurer.js, redefinir por si carga antes)
if (typeof _normStr === 'undefined') {
    window._normStr = function(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
}

// ============ G1: PANEL DE GESTIÓN DEL REGISTRO ============
window.initPatientRegistryPanel = function () {
    const overlay  = document.getElementById('registryPanelOverlay');
    const openBtn  = document.getElementById('btnOpenRegistryPanel');
    const closeBtn = document.getElementById('btnCloseRegistryPanel');
    if (!overlay || !openBtn) return;

    function fmtDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
    }

    // ---- Render tabla ----
    function renderTable(filter) {
        const tbody = document.getElementById('registryTbody');
        if (!tbody) return;
        let reg = getRegistry();
        if (filter) {
            const q = _normStr(filter);
            reg = reg.filter(p =>
                (p.name && _normStr(p.name).includes(q)) ||
                (p.dni  && p.dni.includes(q))
            );
        }
        if (reg.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay pacientes registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = reg.map((p, i) => `
            <tr data-idx="${i}">
                <td>${p.name || '—'}</td>
                <td>${p.dni  || '—'}</td>
                <td>${p.age  ? p.age + ' años' : '—'}</td>
                <td>${fmtDate(p.lastSeen)}</td>
                <td>${(p.visits || 1)}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.75rem;"
                        onclick="registryEditRow(${i},${JSON.stringify(JSON.stringify(p))})">&#9998;</button>
                    <button class="btn" style="padding:.25rem .5rem;font-size:.75rem;background:var(--error);"
                        onclick="registryDeleteRow('${(p.dni||'').replace(/'/g,'')}','${p.name.replace(/'/g,'')}')">&#x1F5D1;</button>
                </td>
            </tr>`).join('');
    }

    // ---- Abrir / cerrar ----
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        renderTable();
        document.getElementById('registrySearch')?.focus();
    });
    function closePanel() { overlay.classList.remove('active'); }
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });

    // ---- Búsqueda en tiempo real ----
    document.getElementById('registrySearch')?.addEventListener('input', e => renderTable(e.target.value));

    // ---- Editar ----
    window.registryEditRow = function(idx, pJson) {
        const p = JSON.parse(pJson);
        const form = document.getElementById('registryEditForm');
        if (!form) return;
        form.style.display = 'block';
        form.dataset.idx   = idx;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('reName',  p.name);  set('reDni',  p.dni);
        set('reAge',   p.age);   set('reSex',   p.sex);
        set('reInsurance', p.insurance); set('reAffiliateNum', p.affiliateNum);
        document.getElementById('reName')?.focus();
    };

    document.getElementById('btnSaveRegistryEdit')?.addEventListener('click', () => {
        const form = document.getElementById('registryEditForm');
        const idx  = parseInt(form?.dataset.idx);
        if (isNaN(idx)) return;
        const reg  = getRegistry();
        if (!reg[idx]) return;
        const get = id => document.getElementById(id)?.value?.trim() || '';
        reg[idx] = {
            ...reg[idx],
            name:         get('reName'),
            dni:          get('reDni'),
            age:          get('reAge'),
            sex:          get('reSex'),
            insurance:    get('reInsurance'),
            affiliateNum: get('reAffiliateNum'),
        };
        setRegistry(reg);
        form.style.display = 'none';
        renderTable(document.getElementById('registrySearch')?.value);
        if (typeof showToast === 'function') showToast('Paciente actualizado ✓', 'success');
    });

    document.getElementById('btnCancelRegistryEdit')?.addEventListener('click', () => {
        const form = document.getElementById('registryEditForm');
        if (form) form.style.display = 'none';
    });

    // ---- Eliminar ----
    window.registryDeleteRow = function(dni, name) {
        if (!confirm(`¿Eliminar al paciente "${name}"? Esta acción no se puede deshacer.`)) return;
        const reg = getRegistry().filter(p =>
            !(p.name === name && ((!dni && !p.dni) || (dni && p.dni === dni)))
        );
        setRegistry(reg);
        renderTable(document.getElementById('registrySearch')?.value);
        if (typeof showToast === 'function') showToast('Paciente eliminado', 'info');
    };

    // ---- Exportar JSON ----
    document.getElementById('btnExportRegistryJson')?.addEventListener('click', () => {
        const json = JSON.stringify(getRegistry(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `registro_pacientes_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
    });

    // ---- Exportar CSV ----
    document.getElementById('btnExportRegistryCsv')?.addEventListener('click', () => {
        const reg  = getRegistry();
        const cols = ['name','dni','age','sex','insurance','affiliateNum','lastSeen','visits'];
        const rows = [cols.join(','),
            ...reg.map(p => cols.map(c => `"${(p[c]||'').toString().replace(/"/g,'""')}"`).join(','))
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `registro_pacientes_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    });

    // ---- Importar JSON ----
    document.getElementById('inputImportRegistry')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Formato inválido');
                const existing = getRegistry();
                let added = 0;
                data.forEach(p => {
                    if (!p.name) return;
                    const exists = existing.some(e =>
                        (p.dni && e.dni === p.dni) || _normStr(e.name) === _normStr(p.name)
                    );
                    if (!exists) { existing.unshift(p); added++; }
                });
                setRegistry(existing.slice(0, REGISTRY_MAX));
                renderTable();
                if (typeof showToast === 'function') showToast(`${added} pacientes importados ✓`, 'success');
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error al importar: ' + err.message, 'error');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });
};

// ============ G2: Incrementar contador de visitas al guardar en registry ============
const _origSavePatient = window.savePatientToRegistry;
window.savePatientToRegistry = function(patient) {
    // Incrementar contador de visitas si el paciente ya existe
    const reg    = getRegistry();
    const normDni = (patient?.dni || '').replace(/\D/g,'');
    const existing = normDni
        ? reg.find(p => p.dni && p.dni.replace(/\D/g,'') === normDni)
        : reg.find(p => _normStr(p.name) === _normStr(patient?.name || ''));
    if (existing) existing.visits = (existing.visits || 1) + 1;
    if (_origSavePatient) _origSavePatient(patient);
};
