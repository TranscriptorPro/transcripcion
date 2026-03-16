# Guia de salida a produccion - Transcriptor Pro

Esta guia define un proceso repetible para publicar sin sorpresas.

## 1) Criterio de aprobado (Go/No-Go)

Publicar SOLO si se cumplen todos estos puntos:

1. Tests base: 100% en verde.
2. E2E integral: sin fallos criticos.
3. Build de produccion generado sin errores.
4. Smoke postdeploy en verde.
5. Checklist manual de UX y flujos criticos aprobado.

Si falla cualquier punto, la salida es NO-GO.

## 2) Flujo recomendado de release

Ejecutar desde la raiz del repo:

```powershell
node tests/run_tests.js
node tests/e2e-full-qa-playwright.js
node build.js
node tests/smoke-postdeploy-version.js
```

## 3) Que valida cada prueba automatica

1. `node tests/run_tests.js`
- Regresion funcional amplia (logica, integraciones internas, seguridad basica, plantillas, formatos, PWA, etc).

2. `node tests/e2e-full-qa-playwright.js`
- Flujo E2E real en navegador y cobertura de casos de estructuracion.

3. `node build.js`
- Integridad del empaquetado para produccion en `dist/`.

4. `node tests/smoke-postdeploy-version.js`
- Verificacion rapida del deploy publicado (carga/version/rutas base).

## 4) Checklist manual minima (obligatoria)

Aunque todo lo automatico este verde, ejecutar esta pasada manual corta:

1. Onboarding primer uso
- Usuario sin API key: debe ver flujo de bienvenida y guardar key.

2. Modo por tipo de usuario
- Validar ADMIN, NORMAL, PRO, GIFT y CLINIC en UI y permisos visibles.

3. Audio real
- Probar grabacion con micro real y transcripcion en navegador objetivo.

4. Estructuracion y edicion
- Transcribir + estructurar + editar + guardar sin errores visuales.

5. Exportaciones
- Validar TXT/PDF/RTF/HTML segun plan.

6. PDF visual
- Revisar header, logo, firma, saltos de pagina y QR (si aplica).

7. PWA
- Verificar install prompt, manifest y comportamiento offline basico.

## 5) Riesgos que suelen escapar a pruebas automaticas

1. Permisos reales de micro y diferencias entre navegadores.
2. Render PDF en datos extremos (textos largos o caracteres raros).
3. Latencia/red inestable y timeouts intermitentes.
4. Diferencias de UX en mobile real (especialmente iOS).

## 6) Recomendacion de despliegue seguro

1. Publicar en ventana controlada.
2. Ejecutar smoke inmediatamente despues del deploy.
3. Si smoke falla, rollback inmediato a ultimo commit estable.
4. Si smoke pasa, monitorear 30-60 minutos con casos reales.

## 7) Estado tecnico validado en esta auditoria

1. Tests base: en verde.
2. Build de produccion: en verde.
3. Smoke postdeploy: en verde.
4. E2E integral: en verde (con warnings no bloqueantes reportados por el runner).
5. Verificacion de logo principal: la clase `.header-logo` no aplica borde circular en app/admin.

## 8) Prioridades de desarrollo para salir a produccion rapido

Objetivo: reducir riesgo real de operacion en el menor tiempo posible.

### Prioridad 1 - Bloqueo de release por calidad (inmediato)

1. Mantener gate de auditoria quick antes de deploy.
2. Exigir smoke postdeploy obligatorio en URL publicada.
3. Si smoke falla: tratar release como NO-GO y corregir antes de nueva salida.

### Prioridad 2 - Cobertura de circuitos de negocio faltantes (48-72h)

Implementar y automatizar en perfil full:

1. Compra y activacion inicial de plan.
2. Upgrade y downgrade de plan con persistencia de permisos.
3. Transferencia/rotacion de dispositivo y bloqueos por limite.
4. Flujo de licencia vencida y renovacion sin perdida de configuracion.

### Prioridad 3 - Confiabilidad operativa (siguiente bloque)

1. Estandarizar telemetria minima de errores criticos (UI, API, PDF, licencias).
2. Definir alertas operativas basicas (error rate, fallos de smoke, fallos de E2E criticos).
3. Consolidar reporte diario de estado usando trend de auditorias.

### Prioridad 4 - Endurecimiento de experiencia real (pre-go-live)

1. Pruebas de microfono real y permisos por navegador objetivo.
2. Pruebas mobile reales (Android e iOS) en onboarding, audio y exportacion.
3. Validacion de PDF en casos extremos (texto largo, logos grandes, firmas complejas).

## 9) Plan corto de ejecucion recomendado

### Dia 1

1. Cerrar smoke postdeploy bloqueante en CI.
2. Definir criterio de severidad (critico/alto/medio) para Go/No-Go.

### Dia 2-3

1. Desarrollar tests de compra/upgrade/transferencia.
2. Integrarlos en auditoria full y verificar green continuo.

### Dia 4

1. Prueba piloto controlada con usuarios internos.
2. Corregir hallazgos de mayor impacto.

### Dia 5

1. Re-ejecutar release verify completo.
2. Publicar con monitoreo intensivo 30-60 minutos.
