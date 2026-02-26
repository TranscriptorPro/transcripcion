/**
 * ══════════════════════════════════════════════════════════════════
 * DATOS DE DEMOSTRACIÓN — Transcriptor Pro
 * ══════════════════════════════════════════════════════════════════
 *
 * Este archivo contiene los datos de prueba que se usaban para
 * poblar la app automáticamente en modo ADMIN.
 *
 * NO se carga en producción. Para reutilizarlos:
 *   1. Abrí la consola del navegador (F12).
 *   2. Copiá y pegá la sección que necesites.
 *   3. O bien, importá los pacientes desde el panel de Registro.
 *
 * Fecha de extracción: 2026-02-26
 * ══════════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════════
// ██ LUGARES DE TRABAJO + PROFESIONALES
// ══════════════════════════════════════════════════════════════════
const DEMO_WORKPLACES = [

    // ───── 0: CLÍNICA GRANDE — Clínica del Sur (4 médicos) ──────
    {
        name: 'Clínica del Sur — Sede Lanús',
        address: 'Hipólito Yrigoyen 3850, Lanús, Buenos Aires',
        phone: '(011) 4241-5500',
        email: 'info@clinicadelsur.com.ar',
        footer: 'Clínica del Sur — Compromiso con tu salud desde 1998',
        logo: null,
        professionals: [
            { nombre: 'Dr. Alejandro Ruiz',   matricula: 'MP 22.510', especialidades: 'Cardiología, Ecocardiografía, Eco-stress, Holter',     telefono: '(011) 4241-5501', email: 'a.ruiz@clinicadelsur.com.ar',   firma: null, logo: null },
            { nombre: 'Dr. Fernando Suárez',   matricula: 'MP 28.190', especialidades: 'ORL, Laringoscopía, Nasofibroscopía, Audiometría',     telefono: '(011) 4241-5503', email: 'f.suarez@clinicadelsur.com.ar', firma: null, logo: null },
            { nombre: 'Dra. Mariana López',    matricula: 'MP 41.005', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta',     telefono: '(011) 4241-5504', email: 'm.lopez@clinicadelsur.com.ar',  firma: null, logo: null },
            { nombre: 'Dr. Ignacio Ríos',      matricula: 'MP 33.415', especialidades: 'Neumonología, Espirometría, Pletismografía',           telefono: '(011) 4241-5505', email: 'i.rios@clinicadelsur.com.ar',   firma: null, logo: null }
        ]
    },

    // ───── 1: CLÍNICA MEDIANA — Centro Médico San Martín (4 médicos) ─
    {
        name: 'Centro Médico San Martín',
        address: 'Av. Rivadavia 4500, Piso 3, CABA',
        phone: '(011) 4902-3344',
        email: 'turnos@centrosanmartin.com.ar',
        footer: 'Centro Médico San Martín — Atención integral del paciente',
        logo: null,
        professionals: [
            { nombre: 'Dra. Lucía Fernández',  matricula: 'MN 52.310', especialidades: 'Gastroenterología, Endoscopía, Colonoscopía, CPRE',   telefono: '(011) 5555-0102', email: 'l.fernandez@centrosanmartin.com.ar', firma: null, logo: null },
            { nombre: 'Dr. Martín Álvarez',    matricula: 'MN 38.675', especialidades: 'Neumonología, Espirometría, Test de marcha',           telefono: '(011) 5555-0103', email: 'm.alvarez@centrosanmartin.com.ar',   firma: null, logo: null },
            { nombre: 'Dra. Carolina Paz',      matricula: 'MN 34.821', especialidades: 'Neurología, Electromiografía, Polisomnografía',       telefono: '(011) 5555-0104', email: 'c.paz@centrosanmartin.com.ar',       firma: null, logo: null },
            { nombre: 'Dra. Paula Iglesias',    matricula: 'MN 47.102', especialidades: 'Ginecología, Colposcopía, PAP',                       telefono: '(011) 5555-0105', email: 'p.iglesias@centrosanmartin.com.ar',  firma: null, logo: null }
        ]
    },

    // ───── 2: CLÍNICA GRANDE — Instituto de Diagnóstico del Litoral (4 médicos) ─
    {
        name: 'Instituto de Diagnóstico del Litoral',
        address: 'Bv. Oroño 1200, Rosario, Santa Fe',
        phone: '(0341) 449-6000',
        email: 'turnos@idlitoral.com.ar',
        footer: 'IDL — Diagnóstico por imágenes y estudios funcionales',
        logo: null,
        professionals: [
            { nombre: 'Dr. Gonzalo Peralta',     matricula: 'MP 8.215',  especialidades: 'Imágenes, Ecografía Abdominal, Eco Doppler',         telefono: '(0341) 449-6001', email: 'g.peralta@idlitoral.com.ar',    firma: null, logo: null },
            { nombre: 'Dra. Sofía Ramírez',      matricula: 'MP 12.740', especialidades: 'Cardiología, Eco-stress, Ecocardiograma, ECG',       telefono: '(0341) 449-6002', email: 's.ramirez@idlitoral.com.ar',    firma: null, logo: null },
            { nombre: 'Dr. Emilio Córdoba',       matricula: 'MP 7.603',  especialidades: 'Gastroenterología, Endoscopía, Broncoscopía',        telefono: '(0341) 449-6005', email: 'e.cordoba@idlitoral.com.ar',    firma: null, logo: null },
            { nombre: 'Dra. Natalia Vega',        matricula: 'MP 14.892', especialidades: 'Neurología, EEG, Potenciales evocados',               telefono: '(0341) 449-6004', email: 'n.vega@idlitoral.com.ar',       firma: null, logo: null }
        ]
    },

    // ───── 3: CONSULTORIO PERSONAL — Dr. Gómez (Neumólogo, 3 lugares) ─
    {
        name: 'Consultorio Dr. Gómez — Costa',
        address: 'Av. Colón 1500, Mar del Plata, Buenos Aires',
        phone: '(0223) 495-3210',
        email: 'gomez.neumo@gmail.com',
        footer: 'Dr. Ramiro Gómez — Neumonología',
        logo: null,
        professionals: [
            { nombre: 'Dr. Ramiro Gómez', matricula: 'MP 18.440', especialidades: 'Neumonología, Espirometría, Test de marcha, Pletismografía', telefono: '(0223) 495-3210', email: 'gomez.neumo@gmail.com', firma: null, logo: null }
        ]
    },
    {
        name: 'Consultorio Dr. Gómez — Miramar',
        address: 'Calle 21 Nº 854, Miramar, Buenos Aires',
        phone: '(02291) 43-2100',
        email: 'gomez.neumo@gmail.com',
        footer: 'Dr. Ramiro Gómez — Neumonología',
        logo: null,
        professionals: [
            { nombre: 'Dr. Ramiro Gómez', matricula: 'MP 18.440', especialidades: 'Neumonología, Espirometría, Test de marcha, Pletismografía', telefono: '(02291) 43-2100', email: 'gomez.neumo@gmail.com', firma: null, logo: null }
        ]
    },

    // ───── 5: CONSULTORIO PERSONAL — Dra. Méndez (Oftalmóloga, 2 lugares) ─
    {
        name: 'Consultorio Dra. Méndez — CABA',
        address: 'Juncal 1280, 2ºB, CABA',
        phone: '(011) 4815-7722',
        email: 'valeria@dramendez.com.ar',
        footer: 'Dra. Valeria Méndez — Oftalmología',
        logo: null,
        professionals: [
            { nombre: 'Dra. Valeria Méndez', matricula: 'MN 61.204', especialidades: 'Oftalmología, Campimetría, Topografía corneal, Fondo de ojo, OCT', telefono: '(011) 4815-7722', email: 'valeria@dramendez.com.ar', firma: null, logo: null }
        ]
    },
    {
        name: 'Consultorio Dra. Méndez — Pilar',
        address: 'Las Magnolias 350, Pilar, Buenos Aires',
        phone: '(0230) 445-1100',
        email: 'valeria@dramendez.com.ar',
        footer: 'Dra. Valeria Méndez — Oftalmología',
        logo: null,
        professionals: [
            { nombre: 'Dra. Valeria Méndez', matricula: 'MN 61.204', especialidades: 'Oftalmología, Campimetría, Topografía corneal, Fondo de ojo, OCT', telefono: '(0230) 445-1100', email: 'valeria@dramendez.com.ar', firma: null, logo: null }
        ]
    },

    // ───── 7: CONSULTORIO PERSONAL — Dr. Navarro (Cirujano, 2 lugares) ─
    {
        name: 'Consultorio Dr. Navarro — Rosario',
        address: 'Corrientes 2150, 5ºA, Rosario, Santa Fe',
        phone: '(0341) 421-8900',
        email: 'pablo@drnavarro.com.ar',
        footer: 'Dr. Pablo Navarro — Cirugía General',
        logo: null,
        professionals: [
            { nombre: 'Dr. Pablo Navarro', matricula: 'MP 15.330', especialidades: 'Cirugía General, Protocolo quirúrgico', telefono: '(0341) 421-8900', email: 'pablo@drnavarro.com.ar', firma: null, logo: null }
        ]
    },

    // ───── 8: CONSULTORIO PERSONAL — Dra. Herrera (Cardióloga, 2 lugares) ─
    {
        name: 'Consultorio Dra. Herrera — Belgrano',
        address: 'Av. Cabildo 2340, 8ºC, CABA',
        phone: '(011) 4788-9200',
        email: 'mherrera.cardio@gmail.com',
        footer: 'Dra. Marcela Herrera — Cardiología',
        logo: null,
        professionals: [
            { nombre: 'Dra. Marcela Herrera', matricula: 'MN 55.890', especialidades: 'Cardiología, Ecocardiograma, ECG, Eco-stress, Holter, MAPA, Cinecoronariografía', telefono: '(011) 4788-9200', email: 'mherrera.cardio@gmail.com', firma: null, logo: null }
        ]
    },
    {
        name: 'Consultorio Dra. Herrera — Quilmes',
        address: 'Mitre 550, Quilmes, Buenos Aires',
        phone: '(011) 4254-3300',
        email: 'mherrera.cardio@gmail.com',
        footer: 'Dra. Marcela Herrera — Cardiología',
        logo: null,
        professionals: [
            { nombre: 'Dra. Marcela Herrera', matricula: 'MN 55.890', especialidades: 'Cardiología, Ecocardiograma, ECG, Eco-stress, Holter, MAPA, Cinecoronariografía', telefono: '(011) 4254-3300', email: 'mherrera.cardio@gmail.com', firma: null, logo: null }
        ]
    },

    // ───── 10: CONSULTORIO PERSONAL — Dr. Campos (Gastro, 2 lugares) ─
    {
        name: 'Consultorio Dr. Campos — Córdoba',
        address: 'Av. Colón 680, Córdoba Capital',
        phone: '(0351) 423-7800',
        email: 'dcampos.gastro@gmail.com',
        footer: 'Dr. Diego Campos — Gastroenterología',
        logo: null,
        professionals: [
            { nombre: 'Dr. Diego Campos', matricula: 'MP 31.550', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta, Broncoscopía', telefono: '(0351) 423-7800', email: 'dcampos.gastro@gmail.com', firma: null, logo: null }
        ]
    },
    {
        name: 'Consultorio Dr. Campos — Villa Carlos Paz',
        address: 'San Martín 120, Villa Carlos Paz, Córdoba',
        phone: '(03541) 42-6500',
        email: 'dcampos.gastro@gmail.com',
        footer: 'Dr. Diego Campos — Gastroenterología',
        logo: null,
        professionals: [
            { nombre: 'Dr. Diego Campos', matricula: 'MP 31.550', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta, Broncoscopía', telefono: '(03541) 42-6500', email: 'dcampos.gastro@gmail.com', firma: null, logo: null }
        ]
    }
];

// Para cargar en localStorage:
// localStorage.setItem('workplace_profiles', JSON.stringify(DEMO_WORKPLACES));


// ══════════════════════════════════════════════════════════════════
// ██ PERFILES DE SALIDA — 20 combinaciones para testing rápido
// ══════════════════════════════════════════════════════════════════
const DEMO_OUTPUT_PROFILES = (() => {
    const ts = Date.now();
    const std = { pageSize: 'a4', orientation: 'portrait', margins: 'normal', font: 'helvetica', fontSize: '11', lineSpacing: '1.5', showHeader: true, showFooter: true, showPageNum: true, showDate: true, showSignLine: true, showSignName: true, showSignMatricula: true };
    return [
        // ── CLÍNICA DEL SUR (lugar 0) — 4 médicos × sus estudios
        { id: 'tp_01', ...std, name: '🫀 Eco-stress — Dr. Ruiz — Clínica del Sur',           workplaceIndex: '0', professionalIndex: '0', footerText: 'Clínica del Sur', isDefault: true,  createdAt: ts,    lastUsed: ts },
        { id: 'tp_02', ...std, name: '🫀 Ecocardiograma — Dr. Ruiz — Clínica del Sur',       workplaceIndex: '0', professionalIndex: '0', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+1,  lastUsed: ts+1 },
        { id: 'tp_03', ...std, name: '👂 Laringoscopía — Dr. Suárez — Clínica del Sur',       workplaceIndex: '0', professionalIndex: '1', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+2,  lastUsed: ts+2, font: 'times', fontSize: '12' },
        { id: 'tp_04', ...std, name: '👂 Nasofibroscopía — Dr. Suárez — Clínica del Sur',     workplaceIndex: '0', professionalIndex: '1', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+3,  lastUsed: ts+3, font: 'times', fontSize: '12' },
        { id: 'tp_05', ...std, name: '🔭 Colonoscopía — Dra. López — Clínica del Sur',        workplaceIndex: '0', professionalIndex: '2', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+4,  lastUsed: ts+4, margins: 'compact', fontSize: '10' },
        { id: 'tp_06', ...std, name: '🫁 Espirometría — Dr. Ríos — Clínica del Sur',          workplaceIndex: '0', professionalIndex: '3', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+5,  lastUsed: ts+5 },

        // ── CENTRO SAN MARTÍN (lugar 1) — 4 médicos
        { id: 'tp_07', ...std, name: '🔭 Endoscopía alta — Dra. Fernández — San Martín',      workplaceIndex: '1', professionalIndex: '0', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+6,  lastUsed: ts+6 },
        { id: 'tp_08', ...std, name: '🫁 Test de marcha — Dr. Álvarez — San Martín',           workplaceIndex: '1', professionalIndex: '1', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+7,  lastUsed: ts+7 },
        { id: 'tp_09', ...std, name: '🧠 Electromiografía — Dra. Paz — San Martín',            workplaceIndex: '1', professionalIndex: '2', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+8,  lastUsed: ts+8 },
        { id: 'tp_10', ...std, name: '🌸 Colposcopía — Dra. Iglesias — San Martín',            workplaceIndex: '1', professionalIndex: '3', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+9,  lastUsed: ts+9 },

        // ── IDL ROSARIO (lugar 2) — 4 médicos
        { id: 'tp_11', ...std, name: '🖼️ Eco Doppler — Dr. Peralta — IDL Rosario',             workplaceIndex: '2', professionalIndex: '0', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+10, lastUsed: ts+10 },
        { id: 'tp_12', ...std, name: '🫀 Ecocardiograma — Dra. Ramírez — IDL Rosario',         workplaceIndex: '2', professionalIndex: '1', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+11, lastUsed: ts+11 },
        { id: 'tp_13', ...std, name: '🔭 Broncoscopía — Dr. Córdoba — IDL Rosario',            workplaceIndex: '2', professionalIndex: '2', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+12, lastUsed: ts+12 },

        // ── CONSULTORIOS PERSONALES
        { id: 'tp_14', ...std, name: '🫁 Espirometría — Dr. Gómez — Consultorio Costa',        workplaceIndex: '3', professionalIndex: '0', footerText: 'Dr. Ramiro Gómez — Neumonología', isDefault: false, createdAt: ts+13, lastUsed: ts+13 },
        { id: 'tp_15', ...std, name: '🫁 Pletismografía — Dr. Gómez — Consultorio Miramar',    workplaceIndex: '4', professionalIndex: '0', footerText: 'Dr. Ramiro Gómez — Neumonología', isDefault: false, createdAt: ts+14, lastUsed: ts+14 },
        { id: 'tp_16', ...std, name: '👁️ Campimetría — Dra. Méndez — CABA',                    workplaceIndex: '5', professionalIndex: '0', footerText: 'Dra. Valeria Méndez — Oftalmología', isDefault: false, createdAt: ts+15, lastUsed: ts+15 },
        { id: 'tp_17', ...std, name: '👁️ Topografía corneal — Dra. Méndez — Pilar',            workplaceIndex: '6', professionalIndex: '0', footerText: 'Dra. Valeria Méndez — Oftalmología', isDefault: false, createdAt: ts+16, lastUsed: ts+16 },
        { id: 'tp_18', ...std, name: '🔪 Protocolo quirúrgico — Dr. Navarro — Rosario',        workplaceIndex: '7', professionalIndex: '0', footerText: 'Dr. Pablo Navarro — Cirugía General', isDefault: false, createdAt: ts+17, lastUsed: ts+17 },
        { id: 'tp_19', ...std, name: '🫀 Cinecoronariografía — Dra. Herrera — Belgrano',       workplaceIndex: '8', professionalIndex: '0', footerText: 'Dra. Marcela Herrera — Cardiología', isDefault: false, createdAt: ts+18, lastUsed: ts+18 },
        { id: 'tp_20', ...std, name: '🔭 Colonoscopía — Dr. Campos — Córdoba',                 workplaceIndex: '10', professionalIndex: '0', footerText: 'Dr. Diego Campos — Gastroenterología', isDefault: false, createdAt: ts+19, lastUsed: ts+19 },
    ];
})();

// Para cargar en localStorage:
// localStorage.setItem('output_profiles', JSON.stringify(DEMO_OUTPUT_PROFILES));


// ══════════════════════════════════════════════════════════════════
// ██ REGISTRO DE PACIENTES — 15 pacientes ficticios
// ══════════════════════════════════════════════════════════════════
const DEMO_PATIENTS = [
    { name: 'María Elena Rodríguez',   dni: '25.890.145', sex: 'F', age: '54', insurance: 'OSDE 310',      affiliateNum: '1100-25890145-03', lastSeen: '2026-02-20T10:00:00Z', visits: 3 },
    { name: 'Jorge Alberto Sánchez',    dni: '18.432.567', sex: 'M', age: '68', insurance: 'PAMI',          affiliateNum: '10-18432567-01',   lastSeen: '2026-02-18T14:30:00Z', visits: 7 },
    { name: 'Ana Laura Martínez',       dni: '32.150.890', sex: 'F', age: '41', insurance: 'Swiss Medical', affiliateNum: 'SM-832150890',     lastSeen: '2026-02-22T09:15:00Z', visits: 1 },
    { name: 'Carlos Eduardo Pérez',     dni: '20.765.432', sex: 'M', age: '59', insurance: 'Galeno',        affiliateNum: 'GAL-207654',       lastSeen: '2026-02-15T11:00:00Z', visits: 5 },
    { name: 'Silvia Beatriz Gómez',     dni: '28.901.234', sex: 'F', age: '47', insurance: 'OSECAC',        affiliateNum: 'OSE-289012-00',    lastSeen: '2026-02-24T16:45:00Z', visits: 2 },
    { name: 'Ricardo Daniel Moreno',    dni: '14.567.890', sex: 'M', age: '73', insurance: 'IOMA',          affiliateNum: 'IOMA-14567890',    lastSeen: '2026-01-30T08:20:00Z', visits: 12 },
    { name: 'Laura Cristina Díaz',      dni: '35.234.567', sex: 'F', age: '36', insurance: 'Medifé',        affiliateNum: 'MED-352345',       lastSeen: '2026-02-10T15:00:00Z', visits: 4 },
    { name: 'Héctor Raúl Fernández',    dni: '22.345.678', sex: 'M', age: '62', insurance: 'Accord Salud',  affiliateNum: 'ACC-223456-02',    lastSeen: '2026-02-21T10:30:00Z', visits: 2 },
    { name: 'Graciela Marta Aguirre',   dni: '16.789.012', sex: 'F', age: '71', insurance: 'PAMI',          affiliateNum: '10-16789012-01',   lastSeen: '2026-02-12T09:00:00Z', visits: 9 },
    { name: 'Roberto Fabián Castro',    dni: '30.456.789', sex: 'M', age: '44', insurance: 'OSDE 210',      affiliateNum: '1100-30456789-01', lastSeen: '2026-02-19T13:00:00Z', visits: 1 },
    { name: 'Claudia Susana Benítez',   dni: '27.123.456', sex: 'F', age: '52', insurance: 'Sancor Salud',  affiliateNum: 'SAN-271234-05',    lastSeen: '2026-02-23T11:20:00Z', visits: 6 },
    { name: 'Omar Darío Villalba',      dni: '21.654.321', sex: 'M', age: '65', insurance: 'IOMA',          affiliateNum: 'IOMA-21654321',    lastSeen: '2026-01-28T17:00:00Z', visits: 3 },
    { name: 'Verónica Soledad Ruiz',    dni: '33.987.654', sex: 'F', age: '38', insurance: 'Swiss Medical', affiliateNum: 'SM-833987654',     lastSeen: '2026-02-25T08:45:00Z', visits: 2 },
    { name: 'Ernesto Julio Domínguez',  dni: '19.876.543', sex: 'M', age: '70', insurance: 'Galeno',        affiliateNum: 'GAL-198765',       lastSeen: '2026-02-14T14:00:00Z', visits: 8 },
    { name: 'Alejandra Noemí Torres',   dni: '29.345.678', sex: 'F', age: '49', insurance: 'OSECAC',        affiliateNum: 'OSE-293456-00',    lastSeen: '2026-02-17T10:10:00Z', visits: 4 }
];

// Para cargar en localStorage:
// localStorage.setItem('patient_registry', JSON.stringify(DEMO_PATIENTS));


// ══════════════════════════════════════════════════════════════════
// ██ CARGA RÁPIDA (pegar en consola del navegador)
// ══════════════════════════════════════════════════════════════════
/*
// 1. Copiar DEMO_WORKPLACES, DEMO_OUTPUT_PROFILES, DEMO_PATIENTS arriba
// 2. Ejecutar:
localStorage.setItem('workplace_profiles', JSON.stringify(DEMO_WORKPLACES));
localStorage.setItem('output_profiles', JSON.stringify(DEMO_OUTPUT_PROFILES));
localStorage.setItem('patient_registry', JSON.stringify(DEMO_PATIENTS));
location.reload();
*/
