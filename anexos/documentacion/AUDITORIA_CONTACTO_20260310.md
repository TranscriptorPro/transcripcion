# Auditoria Rapida Contacto y Suite - 2026-03-10

## Objetivo
- Opcion 2: fijar correo oficial de soporte en configuracion central.
- Opcion 4: ejecutar auditoria rapida E2E + suite completa y dejar evidencia.

## Cambios aplicados
- `src/js/config/config.js`
  - Nuevo `DEFAULT_SUPPORT_CONTACT_EMAIL = 'aldowagner78@gmail.com'`.
  - Nuevo helper global `window.getResolvedSupportContactEmail()` con persistencia en:
    - `CLIENT_CONFIG.contactEmail`
    - `client_config_stored`
    - `localStorage.contact_email`
    - `appDB.contact_email`
- `src/js/features/contact.js`
  - Reemplazo de defaults hardcodeados por `getResolvedSupportContactEmail()`.
  - Reintentos de pendientes usan `msg.to` y fallback central.
- `src/js/features/editorExportRenderUtils.js`
  - Fix bug E2E: eliminada referencia rota `profTitle` en firma HTML.
- `tests/run_tests.js`
  - Regresion de contacto actualizada para helper central y default operativo.

## Ejecuciones
1. Suite completa:
- Comando: `node tests/run_tests.js`
- Resultado: `858/858` PASS

2. E2E integral en URL productiva (referencia):
- Comando: `node tests/e2e-full-qa-playwright.js`
- Resultado: FAIL en `DOWNLOAD-INTEGRITY-HTML` por `profTitle is not defined` en bundle productivo viejo.

3. E2E integral en entorno local actualizado:
- Servidor: `py -m http.server 4173`
- Comando: `$env:APP_URL='http://127.0.0.1:4173/'; $env:CASES_PER_TEMPLATE='1'; node tests/e2e-full-qa-playwright.js`
- Resultado: PASS
  - `CONTACT-NO-MAILTO` PASS
  - `DOWNLOAD-INTEGRITY-HTML` PASS
  - 40/40 casos de plantillas ejecutados (2 WARN no bloqueantes).

## Evidencia de artefactos
- `anexos/accesorios/E2E_QA_INTEGRAL_PLAYWRIGHT_20260310_112317.md` (corrida productiva con FAIL)
- `anexos/accesorios/E2E_QA_INTEGRAL_PLAYWRIGHT_20260310_112630.md` (corrida local con PASS)

## Conclusion
- El flujo de contacto ya consume un correo oficial centralizado y operativo.
- La suite completa esta en verde.
- El E2E integral en local (codigo actual) esta en verde.
- La URL productiva necesita desplegar el ultimo commit para reflejar el fix de `profTitle`.
