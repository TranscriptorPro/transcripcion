/**
 * test-backend-api.js - Tests automaticos contra el backend desplegado
 * Ejecutar: node tests/test-backend-api.js
 *
 * Cubre endpoints publicos, login admin y verificacion de auth sin tocar datos reales.
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const ERR = '\x1b[31mERROR\x1b[0m';

let passed = 0;
let failed = 0;

async function testGET(name, url, checkFn) {
    try {
        const res = await fetch(url, { redirect: 'follow' });
        const json = await res.json();
        const result = checkFn(json);
        if (result === true) {
            console.log(`${PASS} ${name}`);
            passed++;
        } else {
            console.log(`${FAIL} ${name}`);
            console.log(`  -> ${result}`);
            console.log(`  -> body: ${JSON.stringify(json)}`);
            failed++;
        }
    } catch (e) {
        console.log(`${ERR} ${name}`);
        console.log(`  -> ${e.message}`);
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
            console.log(`${PASS} ${name}`);
            passed++;
        } else {
            console.log(`${FAIL} ${name}`);
            console.log(`  -> ${result}`);
            console.log(`  -> body: ${JSON.stringify(json)}`);
            failed++;
        }
    } catch (e) {
        console.log(`${ERR} ${name}`);
        console.log(`  -> ${e.message}`);
        failed++;
    }
}

async function run() {
    console.log('\n=== TESTS BACKEND API ===\n');

    await testGET(
        'T01 GET / validate sin ID -> error controlado',
        BASE,
        (j) => j.error === 'Falta ID de M\u00e9dico' || `esperado "Falta ID de M\u00e9dico", recibido "${j.error}"`
    );

    await testGET(
        'T02 GET validate ID inexistente -> NOT_FOUND',
        `${BASE}?id=FAKE_AUTOTEST_NOEXIT`,
        (j) => j.code === 'NOT_FOUND' || `esperado code=NOT_FOUND, recibido "${j.code}" error="${j.error}"`
    );

    await testGET(
        'T03 GET accion invalida -> error controlado',
        `${BASE}?action=accion_invalida_xyz`,
        (j) => j.error === 'Acci\u00f3n no v\u00e1lida' || `esperado "Acci\u00f3n no v\u00e1lida", recibido "${j.error}"`
    );

    await testGET(
        'T04 GET admin_list_users sin auth -> Unauthorized',
        `${BASE}?action=admin_list_users`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T05 GET admin_update_user sin auth -> Unauthorized',
        `${BASE}?action=admin_update_user&userId=X`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T06 GET admin_list_registrations sin auth -> Unauthorized',
        `${BASE}?action=admin_list_registrations`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T07 GET admin_approve_registration sin auth -> Unauthorized',
        `${BASE}?action=admin_approve_registration&regId=X`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T08 GET admin_reject_registration sin auth -> Unauthorized',
        `${BASE}?action=admin_reject_registration&regId=X`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testGET(
        'T09 GET admin_login con credenciales incorrectas -> error controlado',
        `${BASE}?action=admin_login&username=admin&password=x`,
        (j) => /incorrect/i.test(String(j.error || '')) || `esperado error de credenciales, recibido "${j.error}"`
    );

    await testGET(
        'T10 GET admin_login con credenciales validas -> success + sessionToken',
        `${BASE}?action=admin_login&username=admin&password=admin2026`,
        (j) => (j.success === true && j.sessionToken && j.tokenExpiry) || `esperado success/sessionToken/tokenExpiry, recibido ${JSON.stringify(j)}`
    );

    await testGET(
        'T11 GET admin_generate_config sin auth -> Unauthorized',
        `${BASE}?action=admin_generate_config&userId=X`,
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    await testPOST(
        'T12 POST register_doctor email invalido -> error controlado',
        { action: 'register_doctor', email: 'noesunemail', nombre: 'Test Autotest' },
        (j) => j.error === 'Email inv\u00e1lido' || `esperado "Email inv\u00e1lido", recibido "${j.error}"`
    );

    await testPOST(
        'T13 POST accion invalida -> error controlado',
        { action: 'accion_invalida_post_xyz' },
        (j) => j.error === 'Acci\u00f3n no v\u00e1lida' || `esperado "Acci\u00f3n no v\u00e1lida", recibido "${j.error}"`
    );

    await testPOST(
        'T14 POST admin_create_user sin auth -> Unauthorized',
        { action: 'admin_create_user', sessionToken: '', sessionUser: '', sessionNivel: '', sessionExpiry: 0, userData: { ID_Medico: 'TEST' } },
        (j) => String(j.error || '').includes('Unauthorized') || `esperado Unauthorized, recibido "${j.error}"`
    );

    const total = passed + failed;
    console.log(`\nRESUMEN: ${passed}/${total} OK | ${failed} FAIL`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
});
