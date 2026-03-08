/**
 * Script de prueba: crea 4 usuarios demo via API
 * Ejecutar con: node tests/create-demo-users.js
 *
 * Usuarios creados:
 *  1. NORMAL  — Dr. Carlos Fernández, 1 dispositivo
 *  2. PRO     — Dra. Laura Méndez, 1 lugar de trabajo, 3 dispositivos
 *  3. PRO_2WP — Dr. Martín Rodríguez, 2 lugares de trabajo, 3 dispositivos
 *  4. CLINIC  — Clínica San Marcos, 5 médicos de distintas especialidades
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const APP_BASE   = 'https://transcriptorpro.github.io/transcripcion/';
const ADMIN_KEY  = 'ADMIN_SECRET_2026';

// ── Imágenes demo en base64 (SVG minimalistas) ──────────────────────────────
// Logo cuadrado simple (azul con iniciales)
const makeDemoLogo = (initials, bg = '#1a56a0') => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="10" fill="${bg}"/>
  <text x="40" y="52" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="white">${initials}</text>
</svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

// Firma: línea ondulada con nombre
const makeDemoFirma = (name) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
  <path d="M10 30 Q30 10, 50 30 T90 30 T130 30 T170 30" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <text x="10" y="55" font-family="cursive" font-size="12" fill="#333">${name}</text>
</svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

// Logo institucional
const makeDemoInstLogo = (name, bg = '#0f766e') => {
    const initials = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50">
  <rect width="120" height="50" rx="6" fill="${bg}"/>
  <text x="10" y="20" font-family="Arial" font-size="11" font-weight="bold" fill="white">${initials}</text>
  <text x="10" y="36" font-family="Arial" font-size="9" fill="rgba(255,255,255,.85)">${name.substring(0,18)}</text>
</svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeId(prefix) {
    return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
}

function addDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

const ALL_TEMPLATES = [
    'espirometria','test_marcha','pletismografia','oximetria_nocturna',
    'campimetria','oct_retinal','topografia_corneal','fondo_ojo',
    'tac','resonancia','mamografia','densitometria','petct','radiografia','ecografia',
    'gastroscopia','colonoscopia','broncoscopia','laringoscopia',
    'gammagrafia','holter','mapa','cinecoronariografia','ecg','eco_stress',
    'pap','colposcopia',
    'informe_evolutivo','epicrisis','certificado',
    'protocolo_operatorio','parte_cirugia',
    'ecocardiograma','eco_doppler','nota_evolucion'
];

async function createUser(userData, label) {
    // Para el GET, eliminar imágenes base64 del registroDatos (muy grandes para URL)
    // — la app carga correctamente sin ellas; el admin puede cargarlas después
    let userDataClean = { ...userData };
    try {
        const rd = JSON.parse(userDataClean.Registro_Datos || '{}');
        rd.firma   = null;
        rd.proLogo = null;
        // Mantener logo institucional como null también (SVG base64 demasiado largo)
        if (rd.workplace)    rd.workplace.logo    = null;
        if (rd.extraWorkplaces) rd.extraWorkplaces.forEach(wp => { wp.logo = null; });
        userDataClean.Registro_Datos = JSON.stringify(rd);
    } catch(_) {}

    const url = `${SCRIPT_URL}?action=admin_create_user&adminKey=${encodeURIComponent(ADMIN_KEY)}&updates=${encodeURIComponent(JSON.stringify(userDataClean))}`;

    const resp = await fetch(url);
    const result = await resp.json();

    const link = `${APP_BASE}?id=${encodeURIComponent(userData.ID_Medico)}`;

    if (result.error) {
        console.error(`❌ [${label}] Error: ${result.error}`);
        return null;
    }
    console.log(`✅ [${label}] ${userData.Nombre} — ${link}`);
    return { label, nombre: userData.Nombre, plan: userData.Plan, link, id: userData.ID_Medico };
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIO 1 — NORMAL
// ════════════════════════════════════════════════════════════════════════════
async function createNormal() {
    const id    = makeId('DEMO_N_');
    const nombre = 'Dr. Carlos Fernández';
    const wp = { name: 'Consultorio Privado Fernández', address: 'Av. Rivadavia 1250, CABA', phone: '+54 9 11 4455-6677', email: 'consultorio@fernandez.com', logo: makeDemoInstLogo('Consultorio Fernández', '#1a56a0') };

    const registroDatos = {
        workplace:       wp,
        extraWorkplaces: [],
        headerColor:     '#1a56a0',
        footerText:      'Dr. Carlos Fernández — MP 45678',
        firma:           makeDemoFirma('C. Fernández'),
        proLogo:         null,
        proLogoSize:     60,
        firmaSize:       60,
        instLogoSize:    60,
        hasProMode:      false
    };

    return createUser({
        ID_Medico:            id,
        Nombre:               nombre,
        Email:                'carlos.fernandez@demo.com',
        Matricula:            'MP 45678',
        Telefono:             '+54 9 11 4455-6677',
        Especialidad:         'General',
        Plan:                 'NORMAL',
        Estado:               'active',
        Fecha_Registro:       new Date().toISOString(),
        Fecha_Vencimiento:    addDays(365),
        Devices_Max:          1,
        Allowed_Templates:    JSON.stringify(['informe_evolutivo','epicrisis','certificado']),
        Usage_Count:          0,
        Devices_Logged:       '[]',
        Diagnostico_Pendiente:'false',
        Registro_Datos:       JSON.stringify(registroDatos),
        Notas_Admin:          '🧪 DEMO NORMAL — 1 dispositivo, 3 plantillas, sin logo profesional'
    }, 'NORMAL');
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIO 2 — PRO (1 lugar de trabajo)
// ════════════════════════════════════════════════════════════════════════════
async function createPro() {
    const id    = makeId('DEMO_P_');
    const nombre = 'Dra. Laura Méndez';
    const wp = { name: 'Centro de Diagnóstico Méndez', address: 'Corrientes 3456, Rosario', phone: '+54 9 341 555-8899', email: 'mendez@diagnostico.com', logo: makeDemoInstLogo('Centro Méndez', '#0f766e') };

    const registroDatos = {
        workplace:       wp,
        extraWorkplaces: [],
        headerColor:     '#0f766e',
        footerText:      'Dra. Laura Méndez — MN 78901 — Cardiología',
        firma:           makeDemoFirma('L. Méndez'),
        proLogo:         makeDemoLogo('LM', '#0f766e'),
        proLogoSize:     60,
        firmaSize:       60,
        instLogoSize:    60,
        hasProMode:      true
    };

    return createUser({
        ID_Medico:            id,
        Nombre:               nombre,
        Email:                'laura.mendez@demo.com',
        Matricula:            'MN 78901',
        Telefono:             '+54 9 341 555-8899',
        Especialidad:         'Cardiología',
        Plan:                 'PRO',
        Estado:               'active',
        Fecha_Registro:       new Date().toISOString(),
        Fecha_Vencimiento:    addDays(365),
        Devices_Max:          3,
        Allowed_Templates:    JSON.stringify(ALL_TEMPLATES.filter(t => ['holter','mapa','cinecoronariografia','ecg','eco_stress','ecocardiograma','eco_doppler'].includes(t))),
        Usage_Count:          0,
        Devices_Logged:       '[]',
        Diagnostico_Pendiente:'false',
        Registro_Datos:       JSON.stringify(registroDatos),
        Notas_Admin:          '🧪 DEMO PRO — 1 lugar de trabajo, 3 dispositivos, logo profesional, Cardiología'
    }, 'PRO 1-workplace');
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIO 3 — PRO (2 lugares de trabajo)
// ════════════════════════════════════════════════════════════════════════════
async function createProDualWp() {
    const id    = makeId('DEMO_P2_');
    const nombre = 'Dr. Martín Rodríguez';
    const wp1 = { name: 'Hospital Central de Córdoba', address: 'Libertad 890, Córdoba', phone: '+54 9 351 444-2233', email: 'rodriguez@hospitalcentral.com', logo: makeDemoInstLogo('Hospital Central', '#db2777') };
    const wp2 = { name: 'Consultorio Privado Rodríguez', address: 'Bv. San Juan 500, Córdoba', phone: '+54 9 351 444-5566', email: 'consultorios@rodriguez.com', logo: makeDemoInstLogo('Consultorio Rodríguez', '#7c3aed') };

    const registroDatos = {
        workplace:       wp1,
        extraWorkplaces: [wp2],
        headerColor:     '#db2777',
        footerText:      'Dr. Martín Rodríguez — MN 34567 — Neumología',
        firma:           makeDemoFirma('M. Rodríguez'),
        proLogo:         makeDemoLogo('MR', '#db2777'),
        proLogoSize:     60,
        firmaSize:       60,
        instLogoSize:    60,
        hasProMode:      true
    };

    return createUser({
        ID_Medico:            id,
        Nombre:               nombre,
        Email:                'martin.rodriguez@demo.com',
        Matricula:            'MN 34567',
        Telefono:             '+54 9 351 444-2233',
        Especialidad:         'Neumología',
        Plan:                 'PRO',
        Estado:               'active',
        Fecha_Registro:       new Date().toISOString(),
        Fecha_Vencimiento:    addDays(365),
        Devices_Max:          3,
        Allowed_Templates:    JSON.stringify(ALL_TEMPLATES.filter(t => ['espirometria','test_marcha','pletismografia','oximetria_nocturna'].includes(t))),
        Usage_Count:          0,
        Devices_Logged:       '[]',
        Diagnostico_Pendiente:'false',
        Registro_Datos:       JSON.stringify(registroDatos),
        Notas_Admin:          '🧪 DEMO PRO — 2 lugares de trabajo, 3 dispositivos, Neumología'
    }, 'PRO 2-workplaces');
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIO 4 — CLINIC (5 médicos distintas especialidades)
// ════════════════════════════════════════════════════════════════════════════
async function createClinic() {
    const id     = makeId('DEMO_C_');
    const nombre = 'Clínica San Marcos';
    const wpMain = { name: 'Clínica San Marcos — Sede Central', address: 'Av. Santa Fe 2100, CABA', phone: '+54 9 11 5555-1234', email: 'info@sanmarcos.com', logo: makeDemoInstLogo('Clínica San Marcos', '#1e293b') };

    const profesionales = [
        { nombre: 'Dr. Sergio Vega',      matricula: 'MN 11111', especialidad: 'Cardiología',  email: 'svega@sanmarcos.com'   },
        { nombre: 'Dra. Ana Ibáñez',       matricula: 'MN 22222', especialidad: 'Neumología',   email: 'aibanez@sanmarcos.com' },
        { nombre: 'Dr. Pablo Castillo',   matricula: 'MN 33333', especialidad: 'Oftalmología', email: 'pcastillo@sanmarcos.com'},
        { nombre: 'Dra. Sofía Herrera',   matricula: 'MN 44444', especialidad: 'Imágenes',     email: 'sherrera@sanmarcos.com'},
        { nombre: 'Dr. Nicolás Torres',   matricula: 'MN 55555', especialidad: 'Endoscopía',   email: 'ntorres@sanmarcos.com' }
    ];

    const registroDatos = {
        workplace:       wpMain,
        extraWorkplaces: [],
        headerColor:     '#1e293b',
        footerText:      'Clínica San Marcos — CUIT 30-12345678-9',
        firma:           makeDemoFirma('San Marcos'),
        proLogo:         makeDemoLogo('SM', '#1e293b'),
        proLogoSize:     70,
        firmaSize:       60,
        instLogoSize:    70,
        hasProMode:      true,
        profesionales:   profesionales
    };

    return createUser({
        ID_Medico:            id,
        Nombre:               nombre,
        Email:                'info@sanmarcos.com',
        Matricula:            'CUIT 30-12345678-9',
        Telefono:             '+54 9 11 5555-1234',
        Especialidad:         'Cardiología,Neumología,Oftalmología,Imágenes,Endoscopía',
        Plan:                 'CLINIC',
        Estado:               'active',
        Fecha_Registro:       new Date().toISOString(),
        Fecha_Vencimiento:    addDays(365),
        Devices_Max:          5,
        Allowed_Templates:    JSON.stringify(ALL_TEMPLATES),
        Usage_Count:          0,
        Devices_Logged:       '[]',
        Diagnostico_Pendiente:'false',
        Registro_Datos:       JSON.stringify(registroDatos),
        Profesionales:        JSON.stringify(profesionales),
        Notas_Admin:          '🧪 DEMO CLINIC — 5 médicos (Cardiología, Neumología, Oftalmología, Imágenes, Endoscopía)'
    }, 'CLINIC 5-profesionales');
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
(async () => {
    console.log('\n🚀 Creando usuarios demo...\n');

    const results = [];
    for (const fn of [createNormal, createPro, createProDualWp, createClinic]) {
        const r = await fn();
        if (r) results.push(r);
        await new Promise(res => setTimeout(res, 800)); // pequeña pausa entre requests
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 RESUMEN — Links generados:');
    console.log('═══════════════════════════════════════════════════════\n');

    results.forEach(r => {
        console.log(`[${r.plan} — ${r.label}]`);
        console.log(`  Nombre : ${r.nombre}`);
        console.log(`  Link   : ${r.link}`);
        console.log(`  ID     : ${r.id}`);
        console.log('');
    });

    console.log('═══════════════════════════════════════════════════════\n');
})();
