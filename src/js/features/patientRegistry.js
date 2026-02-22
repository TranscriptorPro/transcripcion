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
