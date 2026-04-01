#!/usr/bin/env node
/**
 * test-comprehensive-plans.js
 * Test diagnóstico comprensivo: Valida múltiples planes y configuraciones
 * Para mayor amplitud en la validación del sistema
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = 'ADMIN_SECRET_2026';

const log = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

async function testPlans() {
  log('═'.repeat(80));
  log('TEST DIAGNÓSTICO COMPRENSIVO — Múltiples Planes y Configuraciones');
  log('═'.repeat(80));

  const plans = [
    { name: 'NORMAL',      maxDevices: 1, templates: ['generico'] },
    { name: 'PRO',         maxDevices: 3, templates: ['generico', 'cardio'] },
    { name: 'ENTERPRISE',  maxDevices: 999, templates: ['*'] }
  ];

  let totalTests = 0;
  let passedTests = 0;

  try {
    for (const planConfig of plans) {
      log('\n' + '─'.repeat(80));
      log(`TEST PLAN: ${planConfig.name}`);
      log('─'.repeat(80));

      const testId = Date.now() + '_' + planConfig.name;
      const email = `test_${planConfig.name.toLowerCase()}_${testId}@demo.test`;
      const nombre = `Dr. ${planConfig.name} ${testId}`;
      const apiKey = `gsk_test_${planConfig.name.toLowerCase()}_${testId}`;

      // PASO 1: Crear usuario directo
      log(`\n[${planConfig.name}/1] Crear usuario (plan=${planConfig.name}, maxDevices=${planConfig.maxDevices})`);

      const createRes = await fetchJson(BASE, {
        method: 'POST',
        body: JSON.stringify({
          action: 'admin_create_user',
          adminKey: ADMIN_KEY,
          userData: {
            ID_Medico: `TEST${planConfig.name[0].toUpperCase()}_${Date.now().toString(36).toUpperCase()}`,
            Nombre: nombre,
            Email: email,
            Telefono: '+54 9 11 1234-5678',
            Plan: planConfig.name,
            Estado: 'active',
            Devices_Max: planConfig.maxDevices,
            Allowed_Templates: JSON.stringify(planConfig.templates),
            API_Key: apiKey
          }
        })
      });

      totalTests++;

      if (!createRes.success) {
        log(`❌ Error creando usuario: ${createRes.error || JSON.stringify(createRes)}`);
        continue;
      }

      const medicoId = createRes.userId;
      log(`✅ Usuario creado: ${medicoId}`);
      passedTests++;

      // PASO 2: Verificar en lista
      log(`[${planConfig.name}/2] Verificar en admin_list_users`);

      let found = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const listRes = await fetchJson(BASE + '?action=admin_list_users&adminKey=' + ADMIN_KEY);
        const users = listRes.users || [];
        found = users.find(u => u.Email === email);
        
        if (found) {
          log(`✅ Usuario encontrado en intento ${attempt}`);
          log(`   Plan: ${found.Plan}, Devices_Max: ${found.Devices_Max}`);
          passedTests++;
          totalTests++;
          break;
        }

        if (attempt < 3) await new Promise(r => setTimeout(r, 500));
      }

      if (!found) {
        log(`❌ Usuario no encontrado en admin_list_users`);
        totalTests++;
      }

      // PASO 3: Validar límites de dispositivo
      log(`[${planConfig.name}/3] Validar límites de dispositivo`);

      const deviceTests = [
        { devNum: 1, shouldAllow: true },
        { devNum: Math.min(planConfig.maxDevices, 2), shouldAllow: true },
        { devNum: planConfig.maxDevices + 1, shouldAllow: false }
      ];

      let planDeviceTestsPassed = true;

      for (const devTest of deviceTests) {
        if (devTest.devNum === deviceTests[1]?.devNum && deviceTests[0]?.devNum === deviceTests[1]?.devNum) continue; // Skip duplicate
        
        const validateRes = await fetchJson(
          BASE + '?action=validate&id=' + medicoId + '&deviceId=test_' + planConfig.name + '_dev_' + devTest.devNum
        );

        totalTests++;

        const isBlocked = validateRes.error && validateRes.code === 'DEVICE_LIMIT';
        const testPassed = isBlocked === !devTest.shouldAllow;

        if (testPassed) {
          const status = devTest.shouldAllow ? 'Aceptado' : 'Bloqueado (DEVICE_LIMIT)';
          log(`✅ Device ${devTest.devNum}: ${status}`);
          passedTests++;
        } else {
          const expected = devTest.shouldAllow ? 'Aceptado' : 'Bloqueado';
          const actual = isBlocked ? 'Bloqueado' : 'Aceptado';
          log(`❌ Device ${devTest.devNum}: Esperado ${expected}, Got ${actual}`);
        }
      }
        for (const devTest of deviceTests) {
          // Skip primero si es duplicado
          if (devTest.devNum === deviceTests[0]?.devNum && devTest !== deviceTests[0]) continue;
        
          await new Promise(r => setTimeout(r, 800)); // Esperar entre validaciones
        
          const validateRes = await fetchJson(
            BASE + '?action=validate&id=' + medicoId + '&deviceId=test_' + planConfig.name + '_v2_' + devTest.devNum
          );

          totalTests++;

          const isBlocked = validateRes.error && validateRes.code === 'DEVICE_LIMIT';
          const testPassed = isBlocked === !devTest.shouldAllow;

          if (testPassed) {
            const status = devTest.shouldAllow ? 'Aceptado' : 'Bloqueado (DEVICE_LIMIT)';
            log(`✅ Device ${devTest.devNum}: ${status}`);
            passedTests++;
          } else {
            const expected = devTest.shouldAllow ? 'Aceptado' : 'Bloqueado';
            const actual = isBlocked ? 'Bloqueado' : 'Aceptado';
            log(`❌ Device ${devTest.devNum}: Esperado ${expected}, Got ${actual}`);
          }
        }

      // PASO 4: Validar templates
      log(`[${planConfig.name}/4] Validar templates permitidas`);

      totalTests++;

      const validateRes = await fetchJson(BASE + '?action=validate&id=' + medicoId + '&deviceId=test_' + planConfig.name + '_tpl');
      
      if (validateRes.allowed_templates) {
        const allowed = Array.isArray(validateRes.allowed_templates) 
          ? validateRes.allowed_templates 
          : (typeof validateRes.allowed_templates === 'string' ? JSON.parse(validateRes.allowed_templates) : []);
        
        log(`✅ Templates permitidas: ${allowed.join(', ') || '(todas)'}`);
        passedTests++;
      } else {
        log(`ℹ️  Templates info no disponible en validate response`);
      }
    }

    // RESUMEN FINAL
    log('\n' + '═'.repeat(80));
    log(`RESUMEN: ${passedTests}/${totalTests} tests pasados`);
    
    if (passedTests === totalTests) {
      log('✅ TODOS LOS TESTS PASARON');
      log('═'.repeat(80));
      return true;
    } else {
      log('❌ ALGUNOS TESTS FALLARON');
      log('═'.repeat(80));
      return false;
    }

  } catch (err) {
    log(`\n❌ Error fatal: ${err.message}`);
    console.error(err);
    return false;
  }
}

testPlans().then(success => {
  process.exit(success ? 0 : 1);
});
