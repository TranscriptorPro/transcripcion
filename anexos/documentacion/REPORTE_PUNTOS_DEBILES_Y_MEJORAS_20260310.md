# Reporte de Puntos Debiles y Mejoras

Fecha: 2026-03-10
Repositorio: Transcriptor Pro
Criterio: revision tecnica sin inventar hallazgos, con foco en seguridad, robustez operativa, calidad y mantenibilidad.

## Hallazgos Prioritarios

1. Critico - Clave de admin hardcodeada en front-end.
Evidencia:
- `recursos/login.html:266` define `const adminKey = 'ADMIN_SECRET_2026'`.
- `recursos/admin-assets/js/admin-inline-script-04.js:16` retorna fallback `adminKey=ADMIN_SECRET_2026`.
Riesgo:
- Cualquier persona con acceso al codigo cliente puede extraer la clave legacy y probar endpoints admin.
Mejora sugerida:
- Eliminar fallback por `adminKey` en cliente y usar solo `sessionToken` firmado.
- En backend, deshabilitar ruta legacy por `adminKey` o restringirla por allowlist/IP temporal.
- Rotar inmediatamente `ADMIN_KEY` en Apps Script Properties.

2. Alto - Deriva de entorno entre local y produccion (riesgo de regresiones no desplegadas).
Evidencia:
- En auditorias recientes, E2E productivo fallo por bundle antiguo mientras local pasaba (caso `profTitle is not defined`).
- Reportes en `anexos/accesorios/E2E_QA_INTEGRAL_PLAYWRIGHT_20260310_112317.md` y `anexos/accesorios/E2E_QA_INTEGRAL_PLAYWRIGHT_20260310_112630.md`.
- Smoke nuevo `tests/smoke-postdeploy-version.js`: FAIL actual en prod (`window.APP_VERSION no esta definido en runtime`) al ejecutar con `EXPECTED_APP_VERSION=v58`.
Riesgo:
- Se valida algo en local que no refleja lo que usa el cliente final.
Mejora sugerida:
- Agregar gate post-push: smoke E2E contra URL productiva antes de dar por cerrado un bloque.
- Publicar hash/version visible en UI para comparar rapidamente local vs deploy.
Estado:
- En seguimiento. Smoke postdeploy validado en produccion: PASS (`APP_VERSION=v58`).

3. Alto - Superficie XSS por restauracion HTML sin sanitizar en autosave.
Evidencia:
- `src/js/utils/uiAutosaveUtils.js:55` hace `editor.innerHTML = saved` directamente.
Riesgo:
- Si se guarda HTML malicioso en borrador, podria reinyectarse al restaurar.
Mejora sugerida:
- Sanitizar con DOMPurify antes de asignar `innerHTML` en restore.
- Guardar version de autosave como markdown/texto plano cuando sea posible.

4. Medio - Uso extensivo de `innerHTML` con datos dinamicos en varios modulos.
Evidencia:
- Ejemplos: `src/js/features/business.js:53`, `src/js/features/structurer.js:407`, `src/js/features/pdfPreview.js:392`.
Riesgo:
- Aumenta probabilidad de introducir XSS en futuros cambios.
Mejora sugerida:
- Estandarizar utilitario `safeSetHTML` con sanitizacion obligatoria.
- Para datos simples, preferir `textContent` + creacion de nodos DOM.

5. Medio - Estado de API key aun inconsistente entre helper central y escrituras directas.
Evidencia:
- Existe helper central en `src/js/core/state.js` (`setGroqApiKey`, `getResolvedGroqApiKey`).
- Persisten escrituras/lecturas directas en `localStorage` en varios archivos, por ejemplo `src/js/features/settingsApiUtils.js:47`, `src/js/utils/uiApiManagementUtils.js:73`.
Riesgo:
- Condiciones de carrera y comportamientos distintos entre pestañas/modulos.
Mejora sugerida:
- Migrar todo acceso a key al helper central y prohibir writes directos por regla de lint/review.
Estado:
- En progreso. Se migro lectura de key a helper central en `ui.js`, `business.js`, `businessClientAdminUtils.js`, `businessOnboardingUtils.js`, `settingsApiUtils.js`, `uiApiManagementUtils.js` y `transcriptor.js`.

6. Medio - Contacto de soporte centralizado, pero dependiente de un mailbox personal unico.
Evidencia:
- Default actual en `src/js/config/config.js` usa `DEFAULT_SUPPORT_CONTACT_EMAIL = 'aldowagner78@gmail.com'`.
Riesgo:
- Punto unico de fallo operativo/organizativo.
Mejora sugerida:
- Definir cuenta de soporte corporativa con ownership compartido y fallback secundario.
- Agregar health-check periodico de entrega (monitor de rebotes).

7. Bajo - Uso de `document.write` en flujo de recarga de version.
Evidencia:
- Resuelto en `index.html`: se reemplazo `document.write` por render seguro en `DOMContentLoaded`.
Riesgo:
- Patrón fragil y dificil de mantener; potencial de incompatibilidades futuras.
Mejora sugerida:
- Reemplazar por render de overlay/modal de actualizacion sin `document.write`.
Estado:
- Resuelto (commit `ef58bf3`).

8. Bajo - Test de contacto legacy aun menciona dominio viejo `.app`.
Evidencia:
- Resuelto en `tests/test-k3-contact.html`: fallback actualizado a `.com`.
Riesgo:
- Confusion al interpretar resultados de pruebas manuales antiguas.
Mejora sugerida:
- Alinear fixture al helper real `getResolvedSupportContactEmail()`.
Estado:
- Resuelto (commit `ef58bf3`).

## Recomendaciones de Implementacion (orden sugerido)

1. Seguridad inmediata (hoy): quitar hardcode `ADMIN_SECRET_2026` del cliente y rotar clave.
2. Robustez de release (hoy): checklist obligatorio de smoke productivo post-push.
3. Higiene XSS (esta semana): sanitizar restauracion de autosave y estandarizar `safeSetHTML`.
4. Consistencia de estado (esta semana): migracion total a `setGroqApiKey/getResolvedGroqApiKey`.
5. Operacion de soporte (esta semana): cuenta corporativa y fallback secundario.

## Nota de integridad

Este reporte se basa en evidencia observable en archivos del repositorio y ejecuciones recientes de test/E2E. No se incluyen afirmaciones sin respaldo ni supuestos de explotacion no verificados.
