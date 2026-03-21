# Prompt Maestro V2 — Auditoría de Monetización y Operación Comercial

Quiero una auditoría independiente, exhaustiva y extremadamente detallista del circuito comercial y de monetización de este proyecto.
No confíes en conclusiones previas del chat.
Trabajá con evidencia verificable en código, pruebas y documentación.

## Objetivo principal

1. Determinar si el sistema está listo para cobrar en producción sin fricción.
2. Validar de punta a punta el flujo: registro, selección de plan, carrito, solicitud, activación, upgrades, límites y soporte.
3. Identificar todo punto de fuga de ingresos, errores de permisos o inconsistencias de plan.
4. Calcular porcentaje exacto de completitud comercial y cuánto trabajo falta.

## Alcance obligatorio

1. Auditar reglas de planes, precios, addons, monedas y límites por tipo de usuario.
2. Auditar consistencia entre frontend, backend y admin panel.
3. Auditar persistencia de estado comercial en localStorage/appDB.
4. Auditar seguridad mínima del flujo de compra y administración.
5. Auditar resiliencia ante errores de red, backend caído, y datos incompletos.
6. Auditar experiencia real de usuario en desktop y mobile para compra/upgrade.

## Circuitos obligatorios a verificar

### A. Registro y alta comercial

1. Flujo de registro en recursos/registro.html.
2. Selección de plan mensual/anual.
3. Addons y cálculo de totales.
4. Envío de solicitud comercial al backend.
5. Manejo de errores (backend down, payload inválido, timeout).

### B. Activación y provisión

1. Generación de configuración por admin/backend.
2. Provisioning de clones por tipo: TRIAL, NORMAL, PRO, GIFT, CLINIC.
3. Persistencia de client_config_stored, planCode, maxDevices, hasProMode.
4. Integridad de datos profesionales y workplace en onboarding.

### C. Upgrade / downgrade / renovación

1. Cambio de plan sin romper configuración del usuario.
2. Aplicación correcta de permisos post-upgrade.
3. Flujo de licencia vencida y degradación controlada.
4. Comportamiento de features bloqueadas por plan.

### D. Límites y cumplimiento por plan

1. Dispositivos máximos por plan.
2. Formatos de descarga permitidos por plan.
3. Acceso a plantillas según allowedTemplates.
4. Restricciones de modo pro y funciones premium.

### E. Panel admin

1. Login admin y protección de endpoints.
2. Gestión de usuarios (crear, aprobar, rechazar, editar).
3. Config dinámica de planes/precios/addons.
4. Gestión runtime de plantillas (alta/edición/persistencia).
5. Logs y trazabilidad mínima de acciones críticas.

### F. Conciliación funcional frontend-backend

1. Lo que promete la UI debe coincidir con lo que aplica backend.
2. No debe haber caminos para escalar privilegios desde cliente.
3. Validar fallback cuando falta config remota.
4. Verificar paridad entre defaults y admin_plans_config dinámico.

## Fuentes mínimas a revisar

1. README.md
2. RELEASE_PRODUCCION.md
3. anexos/CHECKLIST_QA_30MIN_PRODUCCION.md
4. backend/google_apps_script.js
5. backend/GOOGLE_SHEET_SETUP.md
6. src/js/config/config.js
7. src/js/features/business.js
8. src/js/features/pricingCart.js
9. src/js/features/settingsPanel.js
10. src/js/features/licenseManager.js
11. src/js/features/patientRegistry.js
12. src/js/utils/ui.js
13. recursos/registro.html
14. recursos/admin.html
15. tests/test-backend-api.js
16. tests/test-create-demo-users.js
17. tests/e2e-factory-clone.js
18. tests/e2e-gift-clone-comprehensive.js
19. tests/test-pricing-cart.html
20. tests/test-k1k2-primer-uso.html
21. tests/test-k3-contact.html

## Ejecuciones mínimas obligatorias

1. node tests/test-backend-api.js
2. node tests/test-create-demo-users.js
3. node tests/e2e-factory-clone.js
4. node tests/e2e-gift-clone-comprehensive.js
5. node tests/e2e-admin-user-edit-wizard.js
6. node tests/e2e-full-qa-playwright.js
7. node tests/run_tests.js
8. node build.js

## Reglas para la auditoría

1. No asumir funcionamiento por “presencia de código”.
2. Diferenciar:
3. Evidencia ejecutada.
4. Evidencia estática.
5. Riesgo no validado.
6. Señalar tests rotos o scripts no ejecutables como deuda crítica.
7. Reportar inconsistencias entre documentación y realidad.
8. Reportar explícitamente “falsos verdes” de QA.

## Formato de salida requerido

1. Resumen ejecutivo comercial (máx. 15 líneas).
2. Score por dominio (0-100):
3. Checkout y registro comercial.
4. Activación/provisioning.
5. Gestión de planes y upgrades.
6. Restricciones/licencias/dispositivos.
7. Panel admin y operación.
8. Seguridad de monetización.
9. Operación de soporte.
10. Porcentaje global comercial con fórmula explícita.
11. Matriz de hallazgos:
12. Severidad (Crítico/Alto/Medio/Bajo).
13. Impacto en ingresos.
14. Probabilidad.
15. Evidencia.
16. Esfuerzo estimado.
17. Plan de cierre por fases:
18. 24-48 horas.
19. 7 días.
20. 30 días.
21. Criterio GO/NO-GO comercial.
22. Top 10 riesgos de facturación y mitigación.
23. Dictamen final: GO, GO condicional o NO-GO.

## Preguntas obligatorias que debes responder al final

1. ¿Podemos cobrar sin fricción hoy? (sí/no + por qué)
2. ¿Qué 5 problemas pueden hacer perder ventas o generar soporte masivo?
3. ¿Qué porcentaje exacto de trabajo falta para tener monetización robusta?
4. ¿Cuál es el orden de implementación óptimo para maximizar ingresos y minimizar riesgo?
5. ¿Qué validarías en un piloto comercial de 7 días antes de escalar?
