/**
 * E2E flujo CLINIC (backend real)
 * Ejecutar: node tests/e2e-clinic-flow-backend.js
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = process.env.ADMIN_KEY || 'ADMIN_SECRET_2026';

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';

let passed = 0;
let failed = 0;

function log(ok, name, detail) {
    if (ok) {
        console.log(`${PASS} ${name}` + (detail ? ` -> ${detail}` : ''));
        passed++;
    } else {
        console.log(`${FAIL} ${name}` + (detail ? ` -> ${detail}` : ''));
        failed++;
    }
}

async function apiGet(params) {
    const query = new URLSearchParams(params).toString();
    const url = `${BASE}?${query}`;
    const res = await fetch(url, { redirect: 'follow' });
    const txt = await res.text();
    try {
        return JSON.parse(txt);
    } catch (_) {
        throw new Error(`Respuesta no JSON: ${txt.slice(0, 220)}`);
    }
}

async function run() {
    const suffix = Date.now().toString().slice(-8);
    const clinicId = `E2E_CLINIC_${suffix}`;
    const adminDni = `40${suffix}`.slice(0, 8);
    const staffId = `PRO_${suffix}`;
    const staffDni = `30${suffix}`.slice(0, 8);
    const staffMat = `MN-${suffix}`;

    console.log('\n=== E2E CLINIC FLOW (BACKEND) ===');
    console.log(`clinicId: ${clinicId}`);

    // 1) Setup de hojas
    const setup = await apiGet({ action: 'setup_sheets', adminKey: ADMIN_KEY });
    log(setup && setup.success === true, '1.setup_sheets', JSON.stringify(setup && setup.result));

    // 2) Alta admin staff
    const upsertAdmin = await apiGet({
        action: 'clinic_upsert_staff',
        clinicId,
        staffId: '__admin__',
        role: 'admin',
        nombre: 'Administrador',
        dni: adminDni,
        pass: 'clinica',
        activo: 'true'
    });
    log(upsertAdmin && upsertAdmin.success === true, '2.upsert_admin', JSON.stringify(upsertAdmin));

    // 3) Validación admin fallida
    const adminBad = await apiGet({ action: 'clinic_validate_admin', clinicId, password: 'xxxx' });
    log(adminBad && adminBad.success === true && adminBad.valid === false, '3.validate_admin_bad');

    // 4) Validación admin correcta
    const adminOk = await apiGet({ action: 'clinic_validate_admin', clinicId, password: 'clinica' });
    log(adminOk && adminOk.success === true && adminOk.valid === true, '4.validate_admin_ok');

    // 5) Cambio pass admin por DNI
    const updAdminPass = await apiGet({
        action: 'clinic_update_admin_pass',
        clinicId,
        dni: adminDni,
        newPass: 'nueva1234'
    });
    log(updAdminPass && updAdminPass.success === true, '5.update_admin_pass');

    // 6) Validación con nueva pass
    const adminNewOk = await apiGet({ action: 'clinic_validate_admin', clinicId, password: 'nueva1234' });
    log(adminNewOk && adminNewOk.success === true && adminNewOk.valid === true, '6.validate_admin_new_pass');

    // 7) Reset admin por DNI
    const resetAdmin = await apiGet({ action: 'clinic_reset_admin_pass_by_dni', clinicId, dni: adminDni });
    log(resetAdmin && resetAdmin.success === true, '7.reset_admin_pass_by_dni');
    const adminResetOk = await apiGet({ action: 'clinic_validate_admin', clinicId, password: 'clinica' });
    log(adminResetOk && adminResetOk.success === true && adminResetOk.valid === true, '7b.validate_admin_after_reset');

    // 8) Alta profesional
    const upsertPro = await apiGet({
        action: 'clinic_upsert_staff',
        clinicId,
        staffId,
        role: 'professional',
        nombre: 'Profesional E2E',
        dni: staffDni,
        matricula: staffMat,
        especialidades: 'Cardiologia, Clinica Medica',
        pin: '1234',
        primerUso: 'true',
        activo: 'true'
    });
    log(upsertPro && upsertPro.success === true, '8.upsert_profesional');

    // 9) Listado staff
    const staffList1 = await apiGet({ action: 'clinic_get_staff', clinicId });
    const hasAdmin = Array.isArray(staffList1.staff) && staffList1.staff.some(s => String(s.Staff_ID) === '__admin__');
    const hasPro = Array.isArray(staffList1.staff) && staffList1.staff.some(s => String(s.Staff_ID) === staffId);
    log(staffList1 && staffList1.success === true && hasAdmin && hasPro, '9.get_staff_includes_admin_and_pro');

    // 10) Update pin profesional
    const updPin = await apiGet({ action: 'clinic_update_pro_pin', clinicId, staffId, newPin: '9876' });
    log(updPin && updPin.success === true, '10.update_pro_pin');

    // 11) Reset pin por dni + matricula
    const resetPin = await apiGet({
        action: 'clinic_reset_pro_pin_by_dni_matricula',
        clinicId,
        dni: staffDni,
        matricula: staffMat
    });
    log(resetPin && resetPin.success === true && String(resetPin.resetPin) === '1234', '11.reset_pro_pin_by_dni_matricula');

    // 12) Desactivar profesional
    const setInactive = await apiGet({ action: 'clinic_set_staff_active', clinicId, staffId, active: 'false' });
    log(setInactive && setInactive.success === true, '12.set_staff_inactive');

    // 13) Verificar que clinic_get_staff no lo devuelva activo
    const staffList2 = await apiGet({ action: 'clinic_get_staff', clinicId });
    const proVisible = Array.isArray(staffList2.staff) && staffList2.staff.some(s => String(s.Staff_ID) === staffId);
    log(staffList2 && staffList2.success === true && !proVisible, '13.get_staff_filters_inactive');

    console.log('\n=== RESUMEN ===');
    console.log(`Total: ${passed + failed}`);
    console.log(`Pass: ${passed}`);
    console.log(`Fail: ${failed}`);

    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('E2E error:', err.message);
    process.exit(1);
});
