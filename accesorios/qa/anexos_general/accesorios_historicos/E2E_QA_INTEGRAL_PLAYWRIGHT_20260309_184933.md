# E2E QA Integral - Playwright

- Fecha: 2026-03-09T21:49:33.225Z
- URL: https://transcriptorpro.github.io/transcripcion/
- Plantillas detectadas: 40
- Casos estructuracion ejecutados: 40
- Resumen: PASS=9 WARN=1 FAIL=35
- Artifacts: C:\Users\kengy\Desktop\Transcriptor-pro\anexos\accesorios\e2e_full_qa_artifacts_20260309_184920

| ID | Estado | Detalle |
|---|---|---|
| SMOKE-LOAD | PASS | App cargada en entorno objetivo |
| STRUCT-TEMPLATES | PASS | Plantillas detectadas: 40 |
| STRUCT-CASES | PASS | Casos a ejecutar: 40 (1 por plantilla) |
| STRUCT-001 | PASS | espirometria s1 ok=true t=179ms |
| STRUCT-002 | PASS | test_marcha s1 ok=true t=29ms |
| STRUCT-003 | PASS | pletismografia s1 ok=true t=43ms |
| STRUCT-004 | PASS | oximetria_nocturna s1 ok=true t=29ms |
| STRUCT-005 | PASS | campimetria s1 ok=true t=29ms |
| STRUCT-006 | WARN | oct_retinal s1 ok=true t=32ms |
| STRUCT-007 | PASS | topografia_corneal s1 ok=true t=27ms |
| STRUCT-008 | FAIL | fondo_ojo s1: page.screenshot: Target page, context or browser has been closed Call log: [2m  - taking page screenshot[22m [2m  - waiting for fonts to load...[22m [2m  - fonts loaded[22m  |
| STRUCT-009 | FAIL | tac s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-010 | FAIL | resonancia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-011 | FAIL | mamografia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-012 | FAIL | densitometria s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-013 | FAIL | pet_ct s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-014 | FAIL | radiografia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-015 | FAIL | ecografia_abdominal s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-016 | FAIL | gastroscopia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-017 | FAIL | colonoscopia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-018 | FAIL | broncoscopia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-019 | FAIL | laringoscopia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-020 | FAIL | gammagrafia_cardiaca s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-021 | FAIL | eco_stress s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-022 | FAIL | ett s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-023 | FAIL | ecografia_renal s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-024 | FAIL | ecografia_tiroidea s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-025 | FAIL | ecografia_mamaria s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-026 | FAIL | ecografia_obstetrica s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-027 | FAIL | eco_doppler s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-028 | FAIL | nota_evolucion s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-029 | FAIL | epicrisis s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-030 | FAIL | holter s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-031 | FAIL | mapa s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-032 | FAIL | cinecoro s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-033 | FAIL | ecg s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-034 | FAIL | pap s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-035 | FAIL | colposcopia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-036 | FAIL | electromiografia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-037 | FAIL | polisomnografia s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-038 | FAIL | naso s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-039 | FAIL | endoscopia_otologica s1: page.evaluate: Target page, context or browser has been closed |
| STRUCT-040 | FAIL | protocolo_quirurgico s1: page.evaluate: Target page, context or browser has been closed |
| CONTACT-NO-MAILTO | FAIL | Error testeando contacto: page.evaluate: Target page, context or browser has been closed |
| DOWNLOAD-INTEGRITY-HTML | FAIL | Error validando descarga HTML: page.evaluate: Target page, context or browser has been closed |

## Criterios de performance usados
- Objetivo de rapidez por estructuracion mock: <= 5s por caso (WARN si excede).
- Timeout del runner Playwright segun defaults del entorno de ejecucion.