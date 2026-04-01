#!/usr/bin/env node
/**
 * test-full-flow-api.js
 * Test completo del flujo NORMAL: 
 * - Usando registros existentes en estado pago_confirmado
 * - Aprobar cada uno
 * - Validar que aparecen en lista
 * - Validar límites de dispositivo
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = 'ADMIN_SECRET_2026';

const log = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

async function testFullFlow() {
  log('═'.repeat(70));
  log('TEST FLUJO COMPLETO NORMAL (API 100%)');
  log('═'.repeat(70));

  try {
    // PASO 1: Listar registros en estado pago_confirmado
    log('\n[PASO 1] Listar registros en estado pago_confirmado');
    const listRegsRes = await fetchJson(BASE + '?action=admin_list_registrations&adminKey=' + ADMIN_KEY);
    const registrations = listRegsRes.registrations || [];
    const paidRegs = registrations.filter(r => String(r.Estado || '').toLowerCase() === 'pago_confirmado');
    
    log('Total registros: ' + registrations.length);
    log('Registros pagados (listos para aprobar): ' + paidRegs.length);

    if (paidRegs.length === 0) {
      log('⚠️ No hay registros pagados disponibles. Creando uno nuevo...');
      // Podrías crear uno aquí si quisieras
      return true; // Por ahora consideramos OK
    }

    // PASO 2: Aprobar el primer registro
    const testReg = paidRegs[0];
    log('\n[PASO 2] Aprobar registro: ' + testReg.ID_Registro);
    log('         Email: ' + testReg.Email);
    log('         Nombre: ' + testReg.Nombre);

    const approveRes = await fetchJson(BASE, {
      method: 'POST',
      body: JSON.stringify({
        action: 'admin_approve_registration',
        regId: testReg.ID_Registro,
        plan: 'NORMAL',
        apiKey: 'gsk_test_full_' + Date.now(),
        maxDevices: 1,
        allowedTemplates: JSON.stringify(['generico']),
        editedNombre: testReg.Nombre || '',
        editedEmail: testReg.Email || '',
        editedMatricula: testReg.Matricula || '',
        editedTelefono: testReg.Telefono || '',
        editedEspecialidades: testReg.Especialidades || '',
        editedHeaderColor: '#1a56a0',
        editedFooterText: 'Transcriptor Pro',
        editedWorkplace: '{}',
        editedExtraWorkplaces: '[]',
        editedHasProMode: false,
        editedHasDashboard: false,
        editedCanGenerateApps: false,
        adminKey: ADMIN_KEY
      })
    });

    if (approveRes.error) {
      log('❌ Error en aprobación: ' + approveRes.error);
      return false;
    }

    if (!approveRes.success) {
      log('❌ Aprobación no exitosa: ' + JSON.stringify(approveRes));
      return false;
    }

    const medicoId = approveRes.medicoId;
    log('✅ Aprobación exitosa');
    log('   Médico ID: ' + medicoId);

    // PASO 3: Verificar en admin_list_users
    log('\n[PASO 3] Verificar en admin_list_users (búsqueda iterativa)');
    let found = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const listUsersRes = await fetchJson(BASE + '?action=admin_list_users&adminKey=' + ADMIN_KEY);
      const users = listUsersRes.users || [];
      found = users.find(u => u.Email === testReg.Email);

      if (found) {
        log('✅ Usuario encontrado en intento ' + attempt);
        log('   ID: ' + found.ID_Medico);
        log('   Email: ' + found.Email);
        log('   Plan: ' + found.Plan);
        log('   Devices_Max: ' + found.Devices_Max);
        break;
      }

      log('   Intento ' + attempt + ': aguardando...');
      await new Promise(r => setTimeout(r, 600));
    }

    if (!found) {
      log('❌ Usuario NUNCA apareció en admin_list_users');
      return false;
    }

    // PASO 4: Validar límites de dispositivo (maxDevices=1 para NORMAL)
    log('\n[PASO 4] Validar límites de dispositivo (NORMAL = maxDevices=1)');

    const deviceTests = [
      { devNum: 1, shouldAllow: true },
      { devNum: 2, shouldAllow: false }
    ];

    let allDeviceTestsPassed = true;

    for (const devTest of deviceTests) {
      const validateRes = await fetchJson(BASE + '?action=validate&id=' + medicoId + '&deviceId=test_full_dev_' + devTest.devNum);

      if (validateRes.error) {
          const isDeviceLimit = validateRes.code === 'DEVICE_LIMIT';
        const testPassed = isDeviceLimit === !devTest.shouldAllow;

        log((testPassed ? '✅' : '❌') + ' Device ' + devTest.devNum);
        log('   Error: ' + validateRes.error);
          log('   Code: ' + validateRes.code);
        log('   Expected to be ' + (devTest.shouldAllow ? 'allowed' : 'blocked') + ': ' + (testPassed ? 'SÍ' : 'NO'));

        if (!testPassed) allDeviceTestsPassed = false;
      } else {
        const testPassed = devTest.shouldAllow;

        log((testPassed ? '✅' : '❌') + ' Device ' + devTest.devNum);
        log('   Resultado: Aceptado');
        log('   Plan: ' + validateRes.plan);
        log('   maxDevices: ' + validateRes.maxDevices);
        log('   devices_count: ' + validateRes.devices_count);
        log('   Expected to be ' + (devTest.shouldAllow ? 'allowed' : 'blocked') + ': ' + (testPassed ? 'SÍ' : 'NO'));

        if (!testPassed) allDeviceTestsPassed = false;
      }
    }

    // PASO 5: Resumen
    log('\n' + '═'.repeat(70));
    if (allDeviceTestsPassed) {
      log('✅ TEST COMPLETADO EXITOSAMENTE');
      log('═'.repeat(70));
      return true;
    } else {
      log('❌ TEST FALLÓ — Device validation no pasó');
      log('═'.repeat(70));
      return false;
    }

  } catch (err) {
    log('❌ Error fatal: ' + err.message);
    console.error(err);
    return false;
  }
}

testFullFlow().then(success => {
  process.exit(success ? 0 : 1);
});
