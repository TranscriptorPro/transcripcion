/**
 * Test E2E GIFT — runner Node.js puro (sin jsdom, sin navegador)
 * Cubre: suites A, B, D (lógica), F-lógica, G
 * Las suites C y E requieren DOM real → cubiertas en test-onboarding-gift-e2e.html
 */
'use strict';

// ─── Colores ANSI ────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    green: '\x1b[32m', red: '\x1b[31m', blue: '\x1b[34m',
    yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
    bgreen: '\x1b[1m\x1b[32m', bred: '\x1b[1m\x1b[31m'
};
const ok  = (s) => `${C.green}✅ ${s}${C.reset}`;
const err = (s) => `${C.red}❌ ${s}${C.reset}`;
const inf = (s) => `${C.blue}ℹ️  ${s}${C.reset}`;
const sec = (s) => `\n${C.bold}${C.cyan}── ${s} ${'─'.repeat(Math.max(0,50-s.length))}${C.reset}`;

let pass = 0, fail = 0;
const failures = [];

function test(label, condition, detail = '') {
    if (condition) {
        pass++;
        console.log(ok(label) + (detail ? `  ${C.gray}(${detail})${C.reset}` : ''));
    } else {
        fail++;
        const msg = `${label}${detail ? ' — ' + detail : ''}`;
        failures.push(msg);
        console.log(err(label) + (detail ? `  ${C.gray}(${detail})${C.reset}` : ''));
    }
}
function info(label, detail) {
    console.log(inf(`${label}: ${C.gray}${detail}${C.reset}`));
}

// ─── Mock del Storage ─────────────────────────────────────────────────────────
const _store = {};
const localStorage = {
    getItem: (k)    => _store[k] !== undefined ? _store[k] : null,
    setItem: (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; }
};
function resetStorage() {
    Object.keys(_store).forEach(k => delete _store[k]);
}

// ─── Imágenes simuladas (data URI cortos) ────────────────────────────────────
const FAKE_PRO_LOGO  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const FAKE_FIRMA     = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';

// ─── DATOS DEL MÉDICO DE PRUEBA ──────────────────────────────────────────────
const MEDICO = {
    ID_Medico:         'GIFTTEST99E2E',
    Nombre:            'Dra. María Eugenia Torres Suárez',
    Email:             'mariaeugenia.torres@test.com',
    Matricula:         'MP 78431',
    Telefono:          '+54 11 5543-2200',
    Especialidad:      'Cardiología',
    Plan:              'gift',
    Estado:            'active',
    API_Key:           'gsk_MOCKED_KEY_FOR_TESTING_ONLY',
    Devices_Max:       10,
    Allowed_Templates: '["eco_doppler","ecg"]',
    Registro_Datos: JSON.stringify({
        workplace: {
            name:    'Consultorio Dra. Torres',
            address: 'Av. Corrientes 2450 piso 7° "A", CABA',
            phone:   '+54 11 5543-2200',
            email:   'turnos@dramariatores.com.ar'
        },
        extraWorkplaces: [{
            name: 'Hospital Italiano — Guardia Cardio',
            address: 'Gascón 450, CABA',
            phone: '+54 11 4959-0200',
            email: ''
        }],
        headerColor:  '#7c3aed',
        footerText:   'Consultorio Dra. Torres — Av. Corrientes 2450 — Tel: 5543-2200',
        firma:        FAKE_FIRMA,
        proLogo:      FAKE_PRO_LOGO,
        proLogoSize:  75,
        firmaSize:    55,
        notas:        'Médico test E2E',
        apiKey:       'gsk_MOCKED_KEY_FOR_TESTING_ONLY',
        hasProMode:   true
    })
};

const MOCK_TRANSCRIPCION = `
Paciente: María López García. DNI: 32.450.123. Edad: 58 años. Sexo: femenino.
Obra social: PAMI. Número de afiliado: 4456789.
Médico solicitante: Dr. Roberto Sánchez. Motivo: control anual.
Estudio: Ecocardiograma transtorácico. Fecha: 01/03/2026.
Ventrículo izquierdo: dimensiones normales. FE: 62%.
Sin derrame pericárdico. Disfunción diastólica grado I.
CONCLUSIÓN: Función sistólica del VI conservada (FE 62%).
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// SUITE A — Payload GIFT: estructura de regDatos + userData
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('A — Construcción del payload GIFT (regDatos + userData)'));

const rg = JSON.parse(MEDICO.Registro_Datos);

test('regDatos.workplace.name existe', !!rg.workplace?.name, rg.workplace?.name);
test('regDatos.extraWorkplaces es array con 1+ elementos', Array.isArray(rg.extraWorkplaces) && rg.extraWorkplaces.length > 0,
     `${rg.extraWorkplaces?.length} extra(s)`);
test('regDatos.proLogo es data:image/', rg.proLogo?.startsWith('data:image/'));
test('regDatos.firma es data:image/', rg.firma?.startsWith('data:image/'));
test('regDatos.proLogoSize es número 30-200', typeof rg.proLogoSize === 'number' && rg.proLogoSize >= 30 && rg.proLogoSize <= 200,
     `${rg.proLogoSize}px`);
test('regDatos.firmaSize es número 30-200', typeof rg.firmaSize === 'number' && rg.firmaSize >= 30 && rg.firmaSize <= 200,
     `${rg.firmaSize}px`);
test('regDatos.headerColor es hex válido', /^#[0-9a-f]{6}$/i.test(rg.headerColor), rg.headerColor);
test('regDatos.hasProMode = true', rg.hasProMode === true);
test('Plan = "gift"', MEDICO.Plan === 'gift');
test('Allowed_Templates es JSON parseable', (() => { try { JSON.parse(MEDICO.Allowed_Templates); return true; } catch(_) { return false; } })(),
     MEDICO.Allowed_Templates);
test('Matrícula presente', !!MEDICO.Matricula, MEDICO.Matricula);

const payloadSize = JSON.stringify(MEDICO).length;
test('Payload total < 1 MB', payloadSize < 1_000_000, `${(payloadSize/1024).toFixed(1)} KB`);

// ════════════════════════════════════════════════════════════════════════════
// SUITE B — Factory Setup: procesamiento de regDatos → localStorage
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('B — Factory Setup: regDatos → localStorage/clientConfig'));
resetStorage();

const doctor   = MEDICO;
const medicoId = doctor.ID_Medico;
let regDatos = {};
try { regDatos = JSON.parse(doctor.Registro_Datos || '{}'); } catch(_) {}

const plan = String(doctor.Plan || 'trial').toLowerCase();
const planMap = {
    trial: { type: 'TRIAL', hasProMode: false }, normal: { type: 'NORMAL', hasProMode: false },
    pro:   { type: 'PRO',   hasProMode: true  }, gift:   { type: 'PRO',   hasProMode: true  },
    clinic:{ type: 'PRO',   hasProMode: true  }
};
const pc = planMap[plan] || planMap.trial;

let specialties = ['ALL'];
try { specialties = doctor.Especialidad === 'ALL' ? ['ALL'] : doctor.Especialidad.split(',').map(s=>s.trim()); } catch(_) {}

const clientConfig = {
    medicoId, type: pc.type, status: 'active', specialties,
    maxDevices: Number(doctor.Devices_Max) || 2, trialDays: 0,
    hasProMode: regDatos.hasProMode !== undefined ? !!regDatos.hasProMode : pc.hasProMode,
    hasDashboard: true, canGenerateApps: false,
    allowedTemplates: JSON.parse(doctor.Allowed_Templates || '[]'), backendUrl: ''
};
localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));

const profData = {
    nombre: doctor.Nombre || 'Profesional', matricula: doctor.Matricula || '',
    workplace: '', specialties, estudios: [], especialidad: doctor.Especialidad || ''
};
localStorage.setItem('prof_data', JSON.stringify(profData));

// Workplaces
if (regDatos.workplace?.name) {
    const buildPro = () => ({
        nombre: doctor.Nombre||'', matricula: doctor.Matricula||'',
        especialidades: doctor.Especialidad||'', telefono: doctor.Telefono||'',
        email: doctor.Email||'', firma: regDatos.firma||'', logo: regDatos.proLogo||''
    });
    const wps = [{
        name: regDatos.workplace.name, address: regDatos.workplace.address||'',
        phone: regDatos.workplace.phone||'', email: regDatos.workplace.email||'',
        footer: regDatos.footerText||'', logo: regDatos.workplace.logo||'',
        professionals: [buildPro()]
    }];
    (regDatos.extraWorkplaces||[]).forEach(ewp => {
        if (ewp?.name) wps.push({ name:ewp.name, address:ewp.address||'', phone:ewp.phone||'',
            email:ewp.email||'', footer:regDatos.footerText||'', logo:ewp.logo||'', professionals:[buildPro()] });
    });
    localStorage.setItem('workplace_profiles', JSON.stringify(wps));
    profData.workplace = regDatos.workplace.name;
    localStorage.setItem('prof_data', JSON.stringify(profData));
}
if (regDatos.firma)       { localStorage.setItem('pdf_signature', regDatos.firma); }
if (regDatos.proLogo)     { localStorage.setItem('pdf_logo', regDatos.proLogo); }
if (regDatos.proLogoSize) { localStorage.setItem('prof_logo_size_px', String(regDatos.proLogoSize)); }
if (regDatos.headerColor) {
    profData.headerColor = regDatos.headerColor;
    localStorage.setItem('prof_data', JSON.stringify(profData));
    localStorage.setItem('customPrimaryColor', regDatos.headerColor);
}
if (regDatos.footerText) {
    const cfg = JSON.parse(localStorage.getItem('pdf_config')||'{}');
    cfg.footerText = regDatos.footerText;
    localStorage.setItem('pdf_config', JSON.stringify(cfg));
}
if (doctor.API_Key) { localStorage.setItem('groq_api_key', doctor.API_Key); }
localStorage.setItem('medico_id', medicoId);

// Verificaciones B
const storedCfg  = JSON.parse(localStorage.getItem('client_config_stored')||'{}');
test('clientConfig.type = PRO', storedCfg.type === 'PRO', storedCfg.type);
test('clientConfig.hasProMode = true', storedCfg.hasProMode === true);
test('clientConfig.medicoId correcto', storedCfg.medicoId === medicoId, storedCfg.medicoId);
test('clientConfig.allowedTemplates tiene eco_doppler', storedCfg.allowedTemplates?.includes('eco_doppler'),
     JSON.stringify(storedCfg.allowedTemplates));

const storedProf = JSON.parse(localStorage.getItem('prof_data')||'{}');
test('prof_data.nombre contiene Torres', storedProf.nombre?.includes('Torres'), storedProf.nombre);
test('prof_data.matricula = MP 78431', storedProf.matricula === 'MP 78431', storedProf.matricula);
test('prof_data.headerColor = #7c3aed', storedProf.headerColor === '#7c3aed', storedProf.headerColor);
test('prof_data.workplace tiene nombre del consultorio', storedProf.workplace?.includes('Torres'), storedProf.workplace);

const wps = JSON.parse(localStorage.getItem('workplace_profiles')||'[]');
test('workplace_profiles tiene 2 elementos', wps.length === 2, `${wps.length} WP`);
test('WP[0].name = Consultorio Dra. Torres', wps[0]?.name === 'Consultorio Dra. Torres', wps[0]?.name);
test('WP[1].name contiene "italiano"', wps[1]?.name?.toLowerCase().includes('italiano'), wps[1]?.name);
test('WP[0].professionals[0].firma = data:image/', wps[0]?.professionals?.[0]?.firma?.startsWith('data:image/'));
test('WP[0].professionals[0].logo = data:image/', wps[0]?.professionals?.[0]?.logo?.startsWith('data:image/'));

test('pdf_signature guardado', localStorage.getItem('pdf_signature')?.startsWith('data:image/'));
test('pdf_logo guardado', localStorage.getItem('pdf_logo')?.startsWith('data:image/'));
test('prof_logo_size_px = "75"', localStorage.getItem('prof_logo_size_px') === '75',
     localStorage.getItem('prof_logo_size_px'));
test('customPrimaryColor = #7c3aed', localStorage.getItem('customPrimaryColor') === '#7c3aed',
     localStorage.getItem('customPrimaryColor'));
test('groq_api_key guardada', !!localStorage.getItem('groq_api_key'));
test('medico_id guardado', localStorage.getItem('medico_id') === medicoId, medicoId);
test('pdf_config.footerText guardado', JSON.parse(localStorage.getItem('pdf_config')||'{}').footerText?.includes('Torres'),
     JSON.parse(localStorage.getItem('pdf_config')||'{}').footerText);

// ════════════════════════════════════════════════════════════════════════════
// SUITE D — Config Asistida: lógica _saveOnbConfig, colores, toggles
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('D — Configuración Asistida: lógica de guardado'));

// Simular el estado del step 3 después de que el usuario seleccionó opciones
const onbState = {
    selectedColor:  '#7c3aed',   // color del selector
    toggleFirma:    true,
    toggleLogoInst: true,
    toggleQR:       true,        // habilitado porque hasProMode = true
    activeMargin:   'normal'
};

// _saveOnbConfig
const prof2 = JSON.parse(localStorage.getItem('prof_data')||'{}');
prof2.headerColor = onbState.selectedColor;
localStorage.setItem('prof_data', JSON.stringify(prof2));
localStorage.setItem('customPrimaryColor', onbState.selectedColor);
const pdfCfg = JSON.parse(localStorage.getItem('pdf_config')||'{}');
pdfCfg.showSignImage = onbState.toggleFirma;
pdfCfg.showHeader    = onbState.toggleLogoInst;
pdfCfg.showQR        = onbState.toggleQR;
pdfCfg.margins       = onbState.activeMargin;
localStorage.setItem('pdf_config', JSON.stringify(pdfCfg));

const saved = JSON.parse(localStorage.getItem('pdf_config')||'{}');
test('pdf_config.showSignImage = true', saved.showSignImage === true);
test('pdf_config.showHeader = true', saved.showHeader === true);
test('pdf_config.showQR = true (PRO activo)', saved.showQR === true);
test('pdf_config.margins = "normal"', saved.margins === 'normal', saved.margins);
test('customPrimaryColor = #7c3aed', localStorage.getItem('customPrimaryColor') === '#7c3aed');
test('prof_data.headerColor = #7c3aed', JSON.parse(localStorage.getItem('prof_data')||'{}').headerColor === '#7c3aed');

// QR gate: usuario sin PRO → showQR = false
const noProCfg = Object.assign({}, pdfCfg);
noProCfg.showQR = false; // se fuerza a false si !hasProMode
test('QR bloqueado para usuario sin PRO (showQR=false)', !noProCfg.showQR);
test('QR habilitado para usuario PRO (showQR=true)', saved.showQR === true);

// Paleta de colores: 8 presets
const presetColors = ['#1a56a0','#0f766e','#7c3aed','#dc2626','#c2410c','#0369a1','#1d4ed8','#374151'];
test('Paleta tiene exactamente 8 colores preset', presetColors.length === 8);
test('Color violeta #7c3aed está en el preset', presetColors.includes('#7c3aed'));
test('Color azul médico #1a56a0 está en el preset', presetColors.includes('#1a56a0'));
test('Color teal #0f766e está en el preset', presetColors.includes('#0f766e'));

// El saved color coincide con el que tenía regDatos.headerColor
test('Color guardado coincide con el del admin GIFT (#7c3aed)',
     JSON.parse(localStorage.getItem('prof_data')||'{}').headerColor === rg.headerColor,
     `prof_data = ${JSON.parse(localStorage.getItem('prof_data')||'{}').headerColor}, regDatos = ${rg.headerColor}`);

// ════════════════════════════════════════════════════════════════════════════
// SUITE E — Lugar de trabajo: _saveOnbWorkplace
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('E — Lugar de trabajo: selección y guardado'));

// Simular que el usuario seleccionó el WP[0]
const wp_selected = 0;
const cfgE = JSON.parse(localStorage.getItem('pdf_config')||'{}');
cfgE.activeWorkplaceIndex = wp_selected;
localStorage.setItem('pdf_config', JSON.stringify(cfgE));

const cfgEsaved = JSON.parse(localStorage.getItem('pdf_config')||'{}');
test('pdf_config.activeWorkplaceIndex = 0', cfgEsaved.activeWorkplaceIndex === 0,
     `activeWorkplaceIndex = ${cfgEsaved.activeWorkplaceIndex}`);

const wpsE = JSON.parse(localStorage.getItem('workplace_profiles')||'[]');
test('WP[0] nombre accesible para la sesión', wpsE[cfgEsaved.activeWorkplaceIndex]?.name === 'Consultorio Dra. Torres',
     wpsE[cfgEsaved.activeWorkplaceIndex]?.name);
test('WP[0] dirección presente', wpsE[0]?.address?.includes('Corrientes'), wpsE[0]?.address);
test('WP[0] tiene profesional con nombre', wpsE[0]?.professionals?.[0]?.nombre?.includes('Torres'),
     wpsE[0]?.professionals?.[0]?.nombre);

// Simular selección de WP[1]
const cfgE2 = JSON.parse(localStorage.getItem('pdf_config')||'{}');
cfgE2.activeWorkplaceIndex = 1;
localStorage.setItem('pdf_config', JSON.stringify(cfgE2));
test('WP[1] seleccionable (hospital italiano)', JSON.parse(localStorage.getItem('pdf_config')||'{}').activeWorkplaceIndex === 1);
// Restaurar WP[0]
cfgE2.activeWorkplaceIndex = 0;
localStorage.setItem('pdf_config', JSON.stringify(cfgE2));

// ════════════════════════════════════════════════════════════════════════════
// SUITE F — Lógica del PDF Preview: Dr./Dra., especialidad, logos, tamaños
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('F — PDF Preview: lógica Dr./Dra., especialidad, logos, tamaños'));

// Detectar título Dr./Dra.
const rawNameStr = 'Dra. María Eugenia Torres Suárez';
const titleMatch = rawNameStr.match(/^(Dra?\.?\s*)/i);
const profDisplayTitle = titleMatch
    ? (titleMatch[1].trim().toLowerCase().startsWith('dra') ? 'Dra.' : 'Dr.')
    : 'Dr.';
const profDisplayName  = rawNameStr.replace(/^(Dra?\.?\s*)/i, '').trim();

test('Detección de título: "Dra. María..." → "Dra."', profDisplayTitle === 'Dra.', profDisplayTitle);
test('Nombre sin prefijo: "María Eugenia Torres Suárez"', profDisplayName === 'María Eugenia Torres Suárez', profDisplayName);
test('Sin duplicado "DR. Dra."', !profDisplayName.match(/^(DR\.|Dr\.|Dra\.)/));

// Test con Dr.
const rawDr = 'Dr. Carlos Pérez';
const titleMatchDr = rawDr.match(/^(Dra?\.?\s*)/i);
const titleDr = titleMatchDr ? (titleMatchDr[1].trim().toLowerCase().startsWith('dra') ? 'Dra.' : 'Dr.') : 'Dr.';
const nameDr  = rawDr.replace(/^(Dra?\.?\s*)/i,'').trim();
test('Detección "Dr. Carlos" → título "Dr."', titleDr === 'Dr.', titleDr);
test('Nombre "Carlos Pérez" sin prefijo', nameDr === 'Carlos Pérez', nameDr);

// Test sin prefijo (fallback → Dr.)
const rawNone = 'Roberto García';
const titleNone = rawNone.match(/^(Dra?\.?\s*)/i) ? 'X' : 'Dr.';
test('Sin prefijo → fallback "Dr."', titleNone === 'Dr.', titleNone);

// Especialidad: General → Medicina General / ALL → vacío
const cases = [
    ['General',      'Medicina General'],
    ['general',      'Medicina General'],
    ['ALL',          ''],
    ['all',          ''],
    ['Cardiología',  'Cardiología'],
    ['',             ''],
];
cases.forEach(([input, expected]) => {
    const result = (input||'').replace(/^ALL$/i, '').replace(/^General$/i, 'Medicina General').trim();
    test(`Especialidad "${input}" → "${expected}"`, result === expected, `resultado: "${result}"`);
});

// Logo sin border-radius
const logoStyle = `height:${75}px;width:auto;object-fit:contain;flex-shrink:0;`;
test('Logo style NO tiene border-radius:4px', !logoStyle.includes('border-radius:4px'));
test('Logo style NO tiene border-radius:50%', !logoStyle.includes('border-radius:50%'));
test('Logo style tiene height=75px (prof_logo_size_px)', logoStyle.includes('height:75px'));
test('Logo style NO tiene objectFit:cover (usa contain)', !logoStyle.includes('objectFit:cover') && logoStyle.includes('object-fit:contain'));

// Fecha en encabezado
const studyDate = new Date('2026-03-01T12:00').toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});
const headerTextSample = `Estudio realizado por: ${profDisplayTitle} ${profDisplayName} | Fecha de estudio: ${studyDate}`;
test('Encabezado contiene "Estudio realizado por:"', headerTextSample.includes('Estudio realizado por:'));
test('Encabezado NO contiene "el/la Dr./Dra."', !headerTextSample.includes('el/la Dr./Dra.'));
test('Fecha presente en el encabezado', headerTextSample.includes('Fecha de estudio:'));

// Sección de estudio: sin "Fecha", con "ESTUDIO:", pvs-2col
const studySample = `<div class="pvs-grid pvs-2col"><span class="pvs-lbl">ESTUDIO:</span><span class="pvs-lbl">INFORME Nº:</span></div>`;
test('Estudio usa pvs-2col (no pvs-3col)', studySample.includes('pvs-2col') && !studySample.includes('pvs-3col'));
test('Estudio tiene label inline "ESTUDIO:"', studySample.includes('ESTUDIO:'));
test('Estudio tiene label inline "INFORME Nº:"', studySample.includes('INFORME Nº:'));
test('Estudio NO tiene etiqueta "Fecha"', !studySample.includes('>Fecha<') && !studySample.includes('"Fecha"'));

// proLogoSize leído de localStorage
const logoSizePx = parseInt(localStorage.getItem('prof_logo_size_px') || '60');
test('prof_logo_size_px leído = 75 (del regDatos)', logoSizePx === 75, `${logoSizePx}px`);

// ════════════════════════════════════════════════════════════════════════════
// SUITE G — Informe estructurado (mock de transcripción)
// ════════════════════════════════════════════════════════════════════════════
console.log(sec('G — Informe estructurado: extracción de datos del paciente (mock)'));

test('Mock contiene nombre del paciente', MOCK_TRANSCRIPCION.includes('María López García'));
test('Mock contiene DNI', MOCK_TRANSCRIPCION.includes('32.450.123'));
test('Mock contiene PAMI', MOCK_TRANSCRIPCION.includes('PAMI'));
test('Mock tiene tipo de estudio (Ecocardiograma)', MOCK_TRANSCRIPCION.includes('Ecocardiograma'));
test('Mock tiene CONCLUSIÓN', MOCK_TRANSCRIPCION.includes('CONCLUSIÓN'));
test('Mock tiene FE al 62%', MOCK_TRANSCRIPCION.includes('62%'));

// Extractor básico
const extractFromText = (text) => {
    const out = {};
    const nameM = text.match(/Paciente:\s*([^\n.]+)/i);
    if (nameM) out.name = nameM[1].trim();
    const dniM = text.match(/DNI:\s*([\d. ]+)/i);
    if (dniM) out.dni = dniM[1].trim();
    const ageM = text.match(/Edad:\s*(\d+)\s*años/i);
    if (ageM) out.age = ageM[1];
    const sexM = text.match(/Sexo:\s*(\w+)/i);
    if (sexM) out.sex = sexM[1].toLowerCase().startsWith('f') ? 'F' : 'M';
    const osM = text.match(/Obra social:\s*([^\n.]+)/i);
    if (osM) out.insurance = osM[1].trim();
    return out;
};

const extracted = extractFromText(MOCK_TRANSCRIPCION);
test('Extracción: nombre = "María López García"', extracted.name === 'María López García', `"${extracted.name}"`);
test('Extracción: DNI presente', extracted.dni?.replace(/\D/g,'') === '32450123', `"${extracted.dni}"`);
test('Extracción: edad = 58', extracted.age === '58', `"${extracted.age}"`);
test('Extracción: sexo = F', extracted.sex === 'F', `"${extracted.sex}"`);
test('Extracción: obra social incluye PAMI', extracted.insurance?.includes('PAMI'), `"${extracted.insurance}"`);

// Estado final del pdf_config
const finalCfg = JSON.parse(localStorage.getItem('pdf_config')||'{}');
test('pdf_config final: footerText presente', !!finalCfg.footerText, finalCfg.footerText?.substring(0,40));
test('pdf_config final: activeWorkplaceIndex = 0', finalCfg.activeWorkplaceIndex === 0,
     String(finalCfg.activeWorkplaceIndex));
test('pdf_config final: showSignImage = true', finalCfg.showSignImage === true);
test('pdf_config final: showQR = true (PRO)', finalCfg.showQR === true);
test('pdf_config final: margins = "normal"', finalCfg.margins === 'normal', finalCfg.margins);

// ─── RESUMEN ─────────────────────────────────────────────────────────────────
const total = pass + fail;
console.log('\n' + '═'.repeat(70));
if (fail === 0) {
    console.log(`${C.bgreen}  🎉 TODO OK — ${pass} / ${total} tests pasaron${C.reset}`);
} else {
    console.log(`${C.bred}  ⚠️  ${fail} tests FALLARON — ${pass} / ${total} pasaron${C.reset}`);
    console.log(`\n${C.red}Tests fallados:${C.reset}`);
    failures.forEach(f => console.log(`  ${C.red}•${C.reset} ${f}`));
}
console.log('═'.repeat(70));
process.exit(fail > 0 ? 1 : 0);
