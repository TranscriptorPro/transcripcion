/**
 * test-create-demo-users.js
 * Crea un set completo de usuarios demo en el backend (GAS).
 * Run: node tests/test-create-demo-users.js
 *
 * Las credenciales sensibles se leen de variables de entorno:
 *   GROQ_KEY   — API Key de Groq
 *   BACKEND    — URL del Google Apps Script (opcional, hay default)
 */
'use strict';

// ─── Config ──────────────────────────────────────────────────────────────────
const BACKEND    = process.env.BACKEND    || 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const GROQ_KEY   = process.env.GROQ_KEY   || '';
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2026';
const ADMIN_KEY  = process.env.ADMIN_KEY  || '';
const USER_EMAIL = 'aldowagner78@gmail.com'; // tu email real — lo usamos en el usuario GIFT

// ─── Colores ANSI ─────────────────────────────────────────────────────────────
const C = {
    reset:'\x1b[0m', bold:'\x1b[1m',
    green:'\x1b[32m', red:'\x1b[31m', blue:'\x1b[34m',
    yellow:'\x1b[33m', cyan:'\x1b[36m', gray:'\x1b[90m'
};
const ok  = s => `${C.green}✅ ${s}${C.reset}`;
const err = s => `${C.red}❌ ${s}${C.reset}`;
const inf = s => `${C.blue}ℹ️  ${s}${C.reset}`;
const sec = s => `\n${C.bold}${C.cyan}── ${s} ${'─'.repeat(Math.max(0,52-s.length))}${C.reset}`;
const warn = s => `${C.yellow}⚠️  ${s}${C.reset}`;

let pass = 0, fail = 0;
const failures = [];
const createdIds = [];

function test(label, condition, detail = '') {
    if (condition) { pass++; console.log(ok(label) + (detail ? `  ${C.gray}(${detail})${C.reset}` : '')); }
    else           { fail++; failures.push(label + (detail ? ' — ' + detail : '')); console.log(err(label) + (detail ? `  ${C.gray}(${detail})${C.reset}` : '')); }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function apiGet(params) {
    const url = BACKEND + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPost(payload) {
    const res = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ─── Login (obtiene sessionToken) ────────────────────────────────────────────
async function login() {
    const data = await apiGet({ action: 'admin_login', username: ADMIN_USER, password: ADMIN_PASS, adminKey: ADMIN_KEY });
    if (data.error) throw new Error('Login falló: ' + data.error);
    return {
        sessionToken:  data.sessionToken,
        sessionUser:   data.user.Username,
        sessionNivel:  data.user.Nivel,
        sessionExpiry: data.tokenExpiry
    };
}

function withAuth(session, extra = {}) {
    return { ...session, ...extra };
}

// ─── Crear usuario via POST ───────────────────────────────────────────────────
async function createUser(session, userData) {
    const payload = {
        action: 'admin_create_user',
        sessionToken:  session.sessionToken,
        sessionUser:   session.sessionUser,
        sessionNivel:  session.sessionNivel,
        sessionExpiry: session.sessionExpiry,
        userData
    };
    return apiPost(payload);
}

// ─── Validar usuario (simula llamada del clon al arrancar) ────────────────────
async function validateUser(id, deviceId) {
    return apiGet({ action: 'validate', id, deviceId });
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Templates por plan ───────────────────────────────────────────────────────
const TPL_ALL  = JSON.stringify([
    'ecografia_abdominal','ecografia_renal','ecografia_tiroidea','ecografia_mamaria',
    'ecografia_obstetrica','eco_doppler','ett','eco_stress','cinecoro','holter','mapa','ecg',
    'tac','resonancia','mamografia','densitometria','pet_ct','radiografia',
    'gastroscopia','colonoscopia','broncoscopia','laringoscopia','naso','endoscopia_otologica',
    'gammagrafia_cardiaca','espirometria','test_marcha','pletismografia','oximetria_nocturna',
    'campimetria','oct_retinal','topografia_corneal','fondo_ojo',
    'pap','colposcopia','electromiografia','polisomnografia','protocolo_quirurgico',
    'nota_evolucion','epicrisis','generico'
]);
const TPL_NORMAL_CARDIO = JSON.stringify(['ecg','holter','mapa','ett','eco_stress','cinecoro','nota_evolucion','epicrisis','generico']);
const TPL_NORMAL_IMAG   = JSON.stringify(['tac','resonancia','radiografia','ecografia_abdominal','ecografia_renal','nota_evolucion','generico']);
const TPL_PRO_NEUMOLOGIA = JSON.stringify(['espirometria','test_marcha','pletismografia','oximetria_nocturna','tac','nota_evolucion','epicrisis','generico']);
const TPL_PRO_IMAGENES   = JSON.stringify(['tac','resonancia','mamografia','densitometria','pet_ct','radiografia','ecografia_abdominal','ecografia_renal','ecografia_tiroidea','ecografia_mamaria','ecografia_obstetrica','eco_doppler','nota_evolucion','generico']);

// ─── Datos de workplaces (ficticios) ──────────────────────────────────────────
const WP_CARDIO_1  = { name:'Consultorio Mendez', address:'Av. Corrientes 1234, CABA', phone:'011-4321-5678', email:USER_EMAIL };
const WP_CARDIO_2  = { name:'Clínica Los Robles', address:'Calle 50 Nº123, La Plata', phone:'0221-456-7890', email:'clinica.losrobles@example.com' };
const WP_NORMAL_1  = { name:'Centro Médico Del Sur', address:'Rivadavia 980, Rosario', phone:'0341-555-1111', email:'centrosur@example.com' };
const WP_NORMAL_2  = { name:'Consultorio González', address:'San Martín 450 2°B, Rosario', phone:'0341-555-2222', email:'gonzalez.clinica@example.com' };
const WP_PRO_NEUM_1 = { name:'Instituto Respiratorio', address:'Callao 678, CABA', phone:'011-4800-3333', email:'info@respiratorio.example.com' };
const WP_PRO_NEUM_2 = { name:'Hospital Italiano — Neumología', address:'Gascón 450, CABA', phone:'011-4959-0200', email:'neumologia@italiano.example.com' };
const WP_PRO_IMG_1  = { name:'Diagnóstico por Imágenes SA', address:'Maipú 234, Mendoza', phone:'0261-444-5555', email:'info@diag-img.example.com' };
const WP_PRO_IMG_2  = { name:'Centro Radiológico Cuyo', address:'San Martín 100, Godoy Cruz', phone:'0261-444-6666', email:'cuyo@radiologia.example.com' };
const WP_CLINIC_A  = { name:'Clínica Integral Patagonia', address:'Av. San Martín 2000, Bariloche', phone:'0294-440-1000', email:'admin@clinicapatagonia.example.com' };
const WP_CLINIC_B  = { name:'Sanatorio Norte — Sucursal 2', address:'Moreno 800, Bariloche', phone:'0294-440-2000', email:'norte2@clinicapatagonia.example.com' };

// ─── Registro_Datos builder ────────────────────────────────────────────────────
function makeRegDatos(wp1, wp2, opts = {}) {
    return JSON.stringify({
        workplace:       wp1,
        extraWorkplaces: wp2 ? [wp2] : [],
        headerColor:     opts.color    || '#1a56a0',
        footerText:      opts.footer   || '',
        firma:           '',
        proLogo:         '',
        proLogoSize:     60,
        firmaSize:       60,
        instLogoSize:    60,
        apiKey:          GROQ_KEY,
        apiKeyB1:        opts.apiKeyB1 || '',
        apiKeyB2:        opts.apiKeyB2 || '',
        hasProMode:      opts.proMode  !== false
    });
}

// ─── Definición de todos los usuarios demo ────────────────────────────────────
function buildUsers() {
    const now = new Date().toISOString();
    const futurePRO  = new Date(Date.now() + 365 * 2 * 24*60*60*1000).toISOString().split('T')[0]; // 2 años
    const futureGIFT = new Date(Date.now() + 365     * 24*60*60*1000).toISOString().split('T')[0]; // 1 año
    const futureTRIAL = new Date(Date.now() + 7      * 24*60*60*1000).toISOString().split('T')[0]; // 7 días

    return [

        // ────────────────────────────────────────────────
        // 1. GIFT — Dr. Roberto Méndez (con tu email real)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'GIFTDR_TEST001',
            Nombre:            'Dr. Roberto Méndez',
            Email:             USER_EMAIL,
            Matricula:         'MP 98765',
            Telefono:          '011-4321-5678',
            Especialidad:      'Cardiología',
            Plan:              'GIFT',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futureGIFT,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: TPL_ALL,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       '🎁 Usuario demo GIFT — Doctor con tu email real para test de envío',
            Registro_Datos:    makeRegDatos(WP_CARDIO_1, WP_CARDIO_2, { color: '#1a56a0', proMode: true,
                footer: 'Dr. Roberto Méndez | Cardiología | MP 98765' })
        },

        // ────────────────────────────────────────────────
        // 2. GIFT — Dra. Fernanda Ríos
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'GIFTDR_TEST002',
            Nombre:            'Dra. Fernanda Ríos',
            Email:             'fernanda.rios.demo@txpro.test',
            Matricula:         'MN 55432',
            Telefono:          '011-5555-9988',
            Especialidad:      'Gastroenterología',
            Plan:              'GIFT',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futureGIFT,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: TPL_ALL,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       '🎁 Usuario demo GIFT — Gastroenterología',
            Registro_Datos:    makeRegDatos(
                { name:'Consultorio Ríos', address:'Lavalle 1500 of. 12, CABA', phone:'011-4862-3344', email:'fernanda.rios.demo@txpro.test' },
                { name:'Endoscopía del Centro', address:'Corrientes 2200, CABA', phone:'011-4862-4455', email:'endoscopia@centro.example.com' },
                { color: '#0f766e', proMode: true, footer: 'Dra. Fernanda Ríos | Gastroenterología | MN 55432' }
            )
        },

        // ────────────────────────────────────────────────
        // 3. NORMAL — Dra. Laura González
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'NORMDR_TEST001',
            Nombre:            'Dra. Laura González',
            Email:             'laura.gonzalez.demo@txpro.test',
            Matricula:         'MP 34567',
            Telefono:          '0341-555-1111',
            Especialidad:      'Clínica Médica',
            Plan:              'NORMAL',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       2,
            Allowed_Templates: TPL_NORMAL_CARDIO,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo NORMAL — Clínica Médica',
            Registro_Datos:    makeRegDatos(WP_NORMAL_1, WP_NORMAL_2, { color: '#374151', proMode: false,
                footer: 'Dra. Laura González | Clínica Médica | MP 34567' })
        },

        // ────────────────────────────────────────────────
        // 4. NORMAL — Dr. Matías Herrera (Imagenología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'NORMDR_TEST002',
            Nombre:            'Dr. Matías Herrera',
            Email:             'matias.herrera.demo@txpro.test',
            Matricula:         'MN 78901',
            Telefono:          '0261-333-4444',
            Especialidad:      'Imágenes',
            Plan:              'NORMAL',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       2,
            Allowed_Templates: TPL_NORMAL_IMAG,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo NORMAL — Imágenes',
            Registro_Datos:    makeRegDatos(
                { name:'Centro Diagnóstico Herrera', address:'Las Heras 560, Mendoza', phone:'0261-333-4444', email:'matias.herrera.demo@txpro.test' },
                { name:'Radiología San Rafael', address:'H. Yrigoyen 100, San Rafael', phone:'0260-444-5500', email:'diag@sanrafael.example.com' },
                { color: '#7c3aed', proMode: false, footer: 'Dr. Matías Herrera | Imágenes | MN 78901' }
            )
        },

        // ────────────────────────────────────────────────
        // 5. PRO — Dr. Pablo Ferreyra (Neumología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'PRODR_TEST001',
            Nombre:            'Dr. Pablo Ferreyra',
            Email:             'pablo.ferreyra.demo@txpro.test',
            Matricula:         'MP 22233',
            Telefono:          '011-4800-3333',
            Especialidad:      'Neumología',
            Plan:              'PRO',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       5,
            Allowed_Templates: TPL_PRO_NEUMOLOGIA,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo PRO — Neumología',
            Registro_Datos:    makeRegDatos(WP_PRO_NEUM_1, WP_PRO_NEUM_2, { color: '#0369a1', proMode: true,
                footer: 'Dr. Pablo Ferreyra | Neumología | MP 22233 | Instituto Respiratorio' })
        },

        // ────────────────────────────────────────────────
        // 6. PRO — Dra. Valentina Salinas (Imágenes)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'PRODR_TEST002',
            Nombre:            'Dra. Valentina Salinas',
            Email:             'valentina.salinas.demo@txpro.test',
            Matricula:         'MN 43210',
            Telefono:          '0261-444-5555',
            Especialidad:      'Imágenes',
            Plan:              'PRO',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       5,
            Allowed_Templates: TPL_PRO_IMAGENES,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo PRO — Diagnóstico por Imágenes',
            Registro_Datos:    makeRegDatos(WP_PRO_IMG_1, WP_PRO_IMG_2, { color: '#dc2626', proMode: true,
                footer: 'Dra. Valentina Salinas | Imágenes | MN 43210' })
        },

        // ────────────────────────────────────────────────
        // 7. PRO — Dr. Ignacio Varela (Cardiología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'PRODR_TEST003',
            Nombre:            'Dr. Ignacio Varela',
            Email:             'ignacio.varela.demo@txpro.test',
            Matricula:         'MP 66789',
            Telefono:          '011-4959-5000',
            Especialidad:      'Cardiología',
            Plan:              'PRO',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       5,
            Allowed_Templates: TPL_NORMAL_CARDIO,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo PRO — Cardiología',
            Registro_Datos:    makeRegDatos(
                { name:'Cardiología Varela', address:'Santa Fe 3000 P3, CABA', phone:'011-4959-5000', email:'ignacio.varela.demo@txpro.test' },
                { name:'Hospital Argerich — Cardiología', address:'Pi y Margall 750, CABA', phone:'011-4121-0700', email:'cardio@argerich.example.com' },
                { color: '#c2410c', proMode: true, footer: 'Dr. Ignacio Varela | Cardiología | MP 66789' }
            )
        },

        // ────────────────────────────────────────────────
        // 8. CLINIC — Dr. Jorge Ramírez (Traumatología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'CLINICDR_TEST001',
            Nombre:            'Dr. Jorge Ramírez',
            Email:             'jorge.ramirez.demo@txpro.test',
            Matricula:         'MP 11122',
            Telefono:          '0294-440-1100',
            Especialidad:      'Traumatología',
            Plan:              'CLINIC',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: TPL_ALL,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo CLINIC — Traumatología | Clínica Patagonia',
            Registro_Datos:    makeRegDatos(WP_CLINIC_A, WP_CLINIC_B, { color: '#1a56a0', proMode: true,
                footer: 'Dr. Jorge Ramírez | Traumatología | MP 11122 | Clínica Integral Patagonia' })
        },

        // ────────────────────────────────────────────────
        // 9. CLINIC — Dra. Ana Castillo (Gastroenterología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'CLINICDR_TEST002',
            Nombre:            'Dra. Ana Castillo',
            Email:             'ana.castillo.demo@txpro.test',
            Matricula:         'MN 33344',
            Telefono:          '0294-440-1200',
            Especialidad:      'Gastroenterología',
            Plan:              'CLINIC',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: TPL_ALL,
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo CLINIC — Gastroenterología | Clínica Patagonia',
            Registro_Datos:    makeRegDatos(WP_CLINIC_A, null, { color: '#0f766e', proMode: true,
                footer: 'Dra. Ana Castillo | Gastroenterología | MN 33344 | Clínica Integral Patagonia' })
        },

        // ────────────────────────────────────────────────
        // 10. CLINIC — Dr. Luis Pereira (Neurología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'CLINICDR_TEST003',
            Nombre:            'Dr. Luis Pereira',
            Email:             'luis.pereira.demo@txpro.test',
            Matricula:         'MP 55566',
            Telefono:          '0294-440-1300',
            Especialidad:      'Neurología',
            Plan:              'CLINIC',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: JSON.stringify(['electromiografia','polisomnografia','resonancia','tac','nota_evolucion','epicrisis','generico']),
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo CLINIC — Neurología | Clínica Patagonia',
            Registro_Datos:    makeRegDatos(WP_CLINIC_A, WP_CLINIC_B, { color: '#7c3aed', proMode: true,
                footer: 'Dr. Luis Pereira | Neurología | MP 55566 | Clínica Integral Patagonia' })
        },

        // ────────────────────────────────────────────────
        // 11. CLINIC — Dra. Cecilia Torres (Ginecología)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'CLINICDR_TEST004',
            Nombre:            'Dra. Cecilia Torres',
            Email:             'cecilia.torres.demo@txpro.test',
            Matricula:         'MN 77788',
            Telefono:          '0294-440-1400',
            Especialidad:      'Ginecología',
            Plan:              'CLINIC',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futurePRO,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       10,
            Allowed_Templates: JSON.stringify(['pap','colposcopia','ecografia_obstetrica','ecografia_mamaria','mamografia','nota_evolucion','epicrisis','generico']),
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo CLINIC — Ginecología | Clínica Patagonia',
            Registro_Datos:    makeRegDatos(
                { name:'Clínica Integral Patagonia — Ginecología', address:'Av. San Martín 2000 P2, Bariloche', phone:'0294-440-1400', email:'ginecologia@clinicapatagonia.example.com' },
                null,
                { color: '#db2777', proMode: true, footer: 'Dra. Cecilia Torres | Ginecología | MN 77788 | Clínica Integral Patagonia' }
            )
        },

        // ────────────────────────────────────────────────
        // 12. TRIAL — Dra. Sofía Mora (para probar expiración futura)
        // ────────────────────────────────────────────────
        {
            ID_Medico:         'TRIALDR_TEST001',
            Nombre:            'Dra. Sofía Mora',
            Email:             'sofia.mora.demo@txpro.test',
            Matricula:         'MP 99900',
            Telefono:          '011-4000-5555',
            Especialidad:      'Cardiología',
            Plan:              'TRIAL',
            Estado:            'active',
            Fecha_Registro:    now,
            Fecha_Vencimiento: futureTRIAL,
            API_Key:           GROQ_KEY,
            API_Key_B1:        '',
            API_Key_B2:        '',
            Devices_Max:       1,
            Allowed_Templates: JSON.stringify(['ecg','holter','nota_evolucion','generico']),
            Usage_Count:       0,
            Devices_Logged:    '[]',
            Diagnostico_Pendiente: 'false',
            Notas_Admin:       'Usuario demo TRIAL — 7 días — para probar expiración',
            Registro_Datos:    makeRegDatos(
                { name:'Consultorio Mora', address:'Callao 1200, CABA', phone:'011-4000-5555', email:'sofia.mora.demo@txpro.test' },
                null,
                { color: '#374151', proMode: false, footer: 'Dra. Sofía Mora | Cardiología | MP 99900' }
            )
        }
    ];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}  Transcriptor Pro — Creación de usuarios demo${C.reset}`);
    console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════${C.reset}`);

    if (!GROQ_KEY) {
        console.log(warn('GROQ_KEY no configurada — los clones iniciarán sin API key'));
        console.log(warn('Para pasarla: $env:GROQ_KEY="gsk_..."; node tests/test-create-demo-users.js'));
    }

    // ── 1. Login ──────────────────────────────────────────────────────────────
    console.log(sec('1. Login'));
    let session;
    try {
        session = await login();
        test('Login admin exitoso', true, `token: ${session.sessionToken.slice(0,8)}...`);
        console.log(inf('Sesión válida hasta: ' + new Date(session.sessionExpiry).toLocaleString()));
    } catch(e) {
        test('Login admin', false, e.message);
        console.log(err('No se puede continuar sin sesión. Abortando.'));
        process.exit(1);
    }

    // ── 2. Limpiar usuarios de prueba anteriores y verificar estado ──────────
    console.log(sec('2. Verificar datos existentes'));
    let existingIds = new Set();
    try {
        const listData = await apiGet(withAuth(session, { action: 'admin_list_users' }));
        test('admin_list_users responde', !listData.error, `${listData.users?.length || 0} usuarios en Sheet`);
        const allUsers = listData.users || [];
        // Detectar usuarios de prueba existentes (IDs con sufijo _TEST)
        const testPrefixes = ['GIFTDR_TEST', 'NORMDR_TEST', 'PRODR_TEST', 'CLINICDR_TEST', 'TRIALDR_TEST'];
        const hasTestUsers = allUsers.some(u => testPrefixes.some(p => String(u.ID_Medico || '').startsWith(p)));
        if (hasTestUsers) {
            console.log(warn('Usuarios de prueba previos detectados — limpiando antes de recrear...'));
            const delRes = await apiGet(withAuth(session, { action: 'admin_delete_test_users' }));
            test('Limpieza usuarios test previos', !delRes.error, `Eliminados: ${delRes.deleted || 0}`);
        } else {
            allUsers.forEach(u => { if (u.ID_Medico) existingIds.add(u.ID_Medico); });
            console.log(inf(`IDs existentes (no test): ${existingIds.size}`));
        }
    } catch(e) {
        test('admin_list_users', false, e.message);
    }

    // ── 3. Crear usuarios ─────────────────────────────────────────────────────
    console.log(sec('3. Crear usuarios demo'));
    const users = buildUsers();
    let created = 0, skipped = 0;

    for (const u of users) {
        const plan = `[${u.Plan.padEnd(6)}]`;
        if (existingIds.has(u.ID_Medico)) {
            console.log(warn(`${plan} ${u.Nombre} (${u.ID_Medico}) ya existe — omitido`));
            skipped++;
            continue;
        }
        try {
            const res = await createUser(session, u);
            if (res.error) {
                test(`${plan} ${u.Nombre}`, false, res.error);
            } else {
                test(`${plan} ${u.Nombre}`, true, u.ID_Medico);
                createdIds.push(u.ID_Medico);
                created++;
            }
        } catch(e) {
            test(`${plan} ${u.Nombre}`, false, e.message);
        }
        await sleep(400); // GAS tiene rate limits — pausa entre llamadas
    }

    console.log(inf(`Creados: ${created} | Omitidos (ya existían): ${skipped}`));

    // ── 4. Validar cada usuario (simula apertura de clon) ─────────────────────
    console.log(sec('4. Validar clones (simula apertura de app)'));

    const idsToValidate = users.map(u => u.ID_Medico);
    let validated = 0;

    for (const id of idsToValidate) {
        const fakeDevice = 'TEST_DEVICE_' + id;
        try {
            const res = await validateUser(id, fakeDevice);
            const isValid = res.validated === true || (!!res.ID_Medico && !res.error);
            const plan = res.Plan || '?';
            const nombre = res.Nombre || id;
            test(`validate ${id}`, isValid, `${plan} — ${nombre}`);
            if (isValid) validated++;

            // Verificar que trae API_Key (campo crítico para que funcione el clon)
            const hasKey = !!(res.API_Key);
            test(`  └─ API_Key presente en ${id}`, hasKey, hasKey ? `${res.API_Key.slice(0,8)}...` : 'VACÍO — clon no podrá trabajar');

            // Verificar Registro_Datos (wp profiles)
            let hasWorkplace = false;
            try {
                const rd = JSON.parse(res.Registro_Datos || '{}');
                hasWorkplace = !!(rd.workplace && rd.workplace.name);
            } catch(_) {}
            test(`  └─ Registro_Datos con workplace en ${id}`, hasWorkplace);

        } catch(e) {
            test(`validate ${id}`, false, e.message);
        }
        await sleep(300);
    }

    // ── 5. Links de instalación ───────────────────────────────────────────────
    console.log(sec('5. Links de clones generados'));
    const APP_BASE = 'https://transcriptorpro.github.io/transcripcion/';
    console.log('');
    for (const u of users) {
        const link = APP_BASE + '?id=' + u.ID_Medico;
        console.log(`${C.gray}${u.Plan.padEnd(6)}${C.reset} ${C.bold}${u.Nombre}${C.reset}`);
        console.log(`       ${C.cyan}${link}${C.reset}`);
        if (u.Email === USER_EMAIL) console.log(`       ${C.yellow}↑ Tu email real — usar este para prueba de envío${C.reset}`);
    }

    // ── 6. Resumen final ──────────────────────────────────────────────────────
    console.log(sec('6. Resumen'));
    console.log(`\n  ${C.green}✅ Pasaron: ${pass}${C.reset}   ${C.red}❌ Fallaron: ${fail}${C.reset}`);
    if (failures.length) {
        console.log(`\n${C.bold}Fallos:${C.reset}`);
        failures.forEach(f => console.log(`  ${C.red}• ${f}${C.reset}`));
    }
    console.log('');
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(err('Error fatal: ' + e.message)); process.exit(1); });
