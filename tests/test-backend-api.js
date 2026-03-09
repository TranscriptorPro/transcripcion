/**
 * test-backend-api.js — Tests automáticos contra el backend desplegado
 * Ejecutar: node tests/test-backend-api.js
 *
 * Cubre endpoints públicos y verificación de auth — SIN tocar datos reales.
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const ERR  = '\x1b[31m⚠️ ERROR\x1b[0m';

let passed = 0, failed = 0;

async function testGET(name, url, checkFn) {
    try {
        const res = await fetch(url, { redirect: 'follow' });
        const json = await res.json();
        const result = checkFn(json);
        if (result === true) {
            console.log(`${PASS}  ${name}`);
            passed++;
        } else {
            console.log(`${FAIL}  ${name}`);
            console.log(`       → ${result}`);
            console.log(`       → body: ${JSON.stringify(json)}`);
            failed++;
        }
    } catch (e) {
        console.log(`${ERR}  ${name}`);
        console.log(`       → ${e.message}`);
        failed++;
    }
}

async function testPOST(name, body, checkFn) {
    try {
        const res = await fetch(BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            redirect: 'follow'
        });
        const json = await res.json();
        const result = checkFn(json);
        if (result === true) {
            console.log(`${PASS}  ${name}`);
            passed++;
        } else {
            console.log(`${FAIL}  ${name}`);
            console.log(`       → ${result}`);
            console.log(`       → body: ${JSON.stringify(json)}`);
            failed++;
        }
    } catch (e) {
        console.log(`${ERR}  ${name}`);
        console.log(`       → ${e.message}`);
        failed++;
    }
}

async function run() {
    console.log('\n\x1b[36m══════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[36m  TESTS AUTOMÁTICOS — TranscriptorPro Backend API\x1b[0m');
    console.log('\x1b[36m══════════════════════════════════════════════════════\x1b[0m\n');

    // ── GET: endpoints públicos ──────────────────────────────────────────────

    await testGET(
        'T01  GET /  — validate sin ID → error controlado',
        BASE,
        j => j.error === 'Falta ID de Médico' || `esperado "Falta ID de Médico", recibido "${j.error}"`
    );

    await testGET(
        'T02  GET validate ID inexistente → NOT_FOUND',
        `${BASE}?id=FAKE_AUTOTEST_NOEXIT`,
        j => j.code === 'NOT_FOUND' || `esperado code=NOT_FOUND, recibido "${j.code}" error="${j.error}"`
    );

    await testGET(
        'T03  GET acción inválida → error controlado',
        `${BASE}?action=accion_invalida_xyz`,
        j => j.error === 'Acción no válida' || `esperado "Acción no válida", recibido "${j.error}"`
    );

    // ── GET: auth rechazada (sin credenciales) ──────────────────────────────

    await testGET(
        'T04  GET admin_list_users sin auth → Unauthorized',
        `${BASE}?action=admin_list_users`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T05  GET admin_update_user sin auth → Unauthorized',
        `${BASE}?action=admin_update_user&userId=X`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T06  GET admin_list_registrations sin auth → Unauthorized',
        `${BASE}?action=admin_list_registrations`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T07  GET admin_approve_registration sin auth → Unauthorized',
        `${BASE}?action=admin_approve_registration&regId=X`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T08  GET admin_reject_registration sin auth → Unauthorized',
        `${BASE}?action=admin_reject_registration&regId=X`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T09  GET admin_login con adminKey incorrecta → Unauthorized',
        `${BASE}?action=admin_login&adminKey=WRONGKEY_TEST&username=admin&password=x`,
        j => j.error === 'Unauthorized' || `esperado "Unauthorized", recibido "${j.error}"`
    );

    await testGET(
        'T10  GET admin_generate_config sin auth → Unauthorized',
        `${BASE}?action=admin_generate_config&userId=X`,
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    // ── POST: validación de inputs ──────────────────────────────────────────

    await testPOST(
        'T11  POST register_doctor email inválido → error controlado',
        { action: 'register_doctor', email: 'noesunemail', nombre: 'Test Autotest' },
        j => j.error === 'Email inválido' || `esperado "Email inválido", recibido "${j.error}"`
    );

    await testPOST(
        'T12  POST acción inválida → error controlado',
        { action: 'accion_invalida_post_xyz' },
        j => j.error === 'Acción no válida' || `esperado "Acción no válida", recibido "${j.error}"`
    );

    await testPOST(
        'T13  POST admin_create_user sin auth → Unauthorized',
        { action: 'admin_create_user', sessionToken: '', sessionUser: '', sessionNivel: '', sessionExpiry: 0, userData: { ID_Medico: 'TEST' } },
        j => (j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    // ── Resumen ─────────────────────────────────────────────────────────────

    const total = passed + failed;
    console.log('\n\x1b[36m══════════════════════════════════════════════════════\x1b[0m');
    if (failed === 0) {
        console.log(`\x1b[32m  ✅ TODOS LOS TESTS PASARON: ${passed}/${total}\x1b[0m`);
    } else {
        console.log(`\x1b[33m  RESULTADO: ${passed}/${total} OK  |  ${failed} FALLARON\x1b[0m`);
    }
    console.log('\x1b[36m══════════════════════════════════════════════════════\x1b[0m\n');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Error fatal:', e); process.exit(1); });
