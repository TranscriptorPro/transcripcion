# Checklist QA Automatizado Integral (Playwright) - 2026-03-09

## Criterio de orden
- Orden primario: prioridad de negocio (P0 a P3).
- Orden secundario: complejidad tecnica (Baja -> Media -> Alta) dentro de cada prioridad.
- Estado inicial: todo pendiente.
- Regla de seguridad: no tocar logica productiva sin test de regresion verde (`node tests/run_tests.js`).

## P0 - Nucleo critico de la app (audio -> transcripcion -> estructuracion -> descarga)

- [ ] `P0-C01` | Complejidad: Baja | Smoke E2E: carga app, UI base, estado inicial, sin errores de consola JS.
- [ ] `P0-C02` | Complejidad: Baja | Flujo subir audio (archivo valido) y validaciones de formato/tamano.
- [ ] `P0-C03` | Complejidad: Baja | Flujo grabar audio (start/stop), preview y manejo de blobs/cleanup.
- [ ] `P0-C04` | Complejidad: Baja | Transcribir con API key valida (Groq), estados UI y reintentos basicos.
- [ ] `P0-C05` | Complejidad: Media | Estructurar informe desde transcripcion, deteccion de plantilla y salida HTML editable.
- [ ] `P0-C06` | Complejidad: Media | Vista previa PDF: coherencia visual con editor (cabecera, secciones, firma, QR, footer).
- [ ] `P0-C07` | Complejidad: Media | Descarga multi-formato (PDF/RTF/TXT/HTML) segun plan activo.
- [ ] `P0-C08` | Complejidad: Alta | Integridad end-to-end: mismo contenido entre editor, preview e informe descargado.
- [ ] `P0-C09` | Complejidad: Alta | Matriz de errores criticos: API caida, timeout, audio corrupto, respuesta IA vacia, recuperacion UI.

## P1 - Reglas de negocio de usuarios, planes y clones

- [ ] `P1-C10` | Complejidad: Baja | Verificar mapeo de tipos usuario: ADMIN/TRIAL/NORMAL/PRO/GIFT/CLINIC.
- [ ] `P1-C11` | Complejidad: Baja | Verificar permisos por plan: botones visibles, formatos descarga, funciones bloqueadas.
- [ ] `P1-C12` | Complejidad: Media | Clon por flujo GIFT: persistencia de config, prof_data, firma/logo, key y tipo final.
- [ ] `P1-C13` | Complejidad: Media | Clon por formulario de registro: campos requeridos, defaults y restricciones por plan.
- [ ] `P1-C14` | Complejidad: Media | Clon por alta de nuevo usuario (admin): consistencia de datos y licenciamiento.
- [ ] `P1-C15` | Complejidad: Alta | Pruebas de degradacion/upgrade (trial->normal/pro) y efectos en UI + descargas.
- [ ] `P1-C16` | Complejidad: Alta | Pruebas de no-regresion de panel admin (CRUD usuarios/planes/logs/config).

## P1 - Plantillas medicas y estructuracion (40+)

- [ ] `P1-C17` | Complejidad: Media | Cobertura automatizada de deteccion para todas las plantillas (corpus representativo por key).
- [ ] `P1-C18` | Complejidad: Media | Validar que cada plantilla tenga prompt, keywords, name y placeholders permitidos.
- [ ] `P1-C19` | Complejidad: Alta | E2E por lote de plantillas: transcribir simulado -> estructurar -> validar secciones esperadas.
- [ ] `P1-C20` | Complejidad: Alta | Prueba de precision basica: evitar template equivocada en textos ambiguos (thresholds/empates).

## P2 - Modulos funcionales alrededor del nucleo

- [ ] `P2-C21` | Complejidad: Baja | Historial de informes: crear/ver/exportar/borrar/importar sin corrupcion de datos.
- [ ] `P2-C22` | Complejidad: Baja | Registro de pacientes: alta/edicion/busqueda/borrado y contador de visitas.
- [ ] `P2-C23` | Complejidad: Media | Diccionario medico: deteccion de terminos, correcciones, persistencia custom/base.
- [ ] `P2-C24` | Complejidad: Media | Configuracion del informe: flags de inclusion (firma/logo/QR/footer) reflejadas en preview/PDF.
- [ ] `P2-C25` | Complejidad: Media | Onboarding primer uso (K1/K2): solicitud API key, separacion admin vs usuario final.
- [ ] `P2-C26` | Complejidad: Alta | Contacto (K3): modal, validaciones, envio (Apps Script/mailto), cola de reintentos.

## P3 - Plataforma, compatibilidad y resiliencia

- [ ] `P3-C27` | Complejidad: Baja | PWA base: manifest, registro SW, beforeinstallprompt, boton instalar.
- [ ] `P3-C28` | Complejidad: Media | Estrategias cache SW (app shell cache-first, API network-first sin cache sensible).
- [ ] `P3-C29` | Complejidad: Media | Multi-tab y restore session/autosave: consistencia de estados sin pisado de datos.
- [ ] `P3-C30` | Complejidad: Alta | Pruebas cross-browser (Chromium/Firefox/WebKit) y responsive (desktop/mobile).
- [ ] `P3-C31` | Complejidad: Alta | Pruebas de performance y estabilidad (lotes largos, memoria, tiempos maximos aceptables).

## Plan de ejecucion automatizada (sin danar la app)

- [ ] `RUN-01` Preparar entorno aislado de pruebas (URL local/staging, storage limpio por suite).
- [ ] `RUN-02` Inyectar secretos por variables de entorno (no hardcode en repo ni logs).
- [ ] `RUN-03` Ejecutar base actual: `node tests/run_tests.js` (gate previo).
- [ ] `RUN-04` Ejecutar smoke Playwright y bloquear avance si falla P0-C01..C04.
- [ ] `RUN-05` Ejecutar suites por prioridad (P0 -> P1 -> P2 -> P3).
- [ ] `RUN-06` Guardar evidencias: screenshots, videos, traces y reporte Markdown/JUnit.
- [ ] `RUN-07` Re-ejecutar regresion completa tras cada lote de fixes.

## Evidencias minimas obligatorias por caso
- [ ] Captura antes/despues del paso critico.
- [ ] Resultado de assertion principal.
- [ ] Logs de consola/pagina filtrados (error/warn).
- [ ] Artefacto descargado cuando aplique (PDF/RTF/TXT/HTML).
- [ ] Hash o comparacion textual minima entre preview y descarga.

## Lo pendiente para poder ejecutar TODO al 100%

- [ ] Confirmar URL objetivo de pruebas E2E: `localhost` o `https://transcriptorpro.github.io/transcripcion/`.
- [ ] Confirmar si los tests que envian mails pueden usar el entorno productivo real sin limite.
- [ ] Proveer 1-2 audios de referencia por especialidad critica (si queres cobertura real de STT, no solo mocks).
- [ ] Confirmar criterios de aceptacion cuantitativos:
  - tiempos maximos (transcripcion/estructuracion/preview)
  - tasa de fallos permitida
  - umbral minimo de coincidencia preview vs exportado
- [ ] Confirmar si queres que agregue pipeline CI (GitHub Actions) para correr Playwright automatico en cada push.

## Notas de seguridad
- Las credenciales/API keys se usaran solo en ejecucion local via variables de entorno.
- No se versionaran secretos en codigo, reportes ni capturas.
- Se permite datos de prueba en DB segun tu instruccion actual.
