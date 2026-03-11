# E2E QA Integral - Playwright

- Fecha: 2026-03-09T21:50:38.962Z
- URL: https://transcriptorpro.github.io/transcripcion/
- Plantillas detectadas: 40
- Casos estructuracion ejecutados: 40
- Resumen: PASS=42 WARN=3 FAIL=0
- Artifacts: C:\Users\kengy\Desktop\Transcriptor-pro\anexos\accesorios\e2e_full_qa_artifacts_20260309_185009

| ID | Estado | Detalle |
|---|---|---|
| SMOKE-LOAD | PASS | App cargada en entorno objetivo |
| STRUCT-TEMPLATES | PASS | Plantillas detectadas: 40 |
| STRUCT-CASES | PASS | Casos a ejecutar: 40 (1 por plantilla) |
| STRUCT-001 | PASS | espirometria s1 ok=true t=111ms |
| STRUCT-002 | PASS | test_marcha s1 ok=true t=45ms |
| STRUCT-003 | PASS | pletismografia s1 ok=true t=28ms |
| STRUCT-004 | PASS | oximetria_nocturna s1 ok=true t=26ms |
| STRUCT-005 | PASS | campimetria s1 ok=true t=27ms |
| STRUCT-006 | WARN | oct_retinal s1 ok=true t=25ms |
| STRUCT-007 | PASS | topografia_corneal s1 ok=true t=32ms |
| STRUCT-008 | PASS | fondo_ojo s1 ok=true t=24ms |
| STRUCT-009 | PASS | tac s1 ok=true t=25ms |
| STRUCT-010 | PASS | resonancia s1 ok=true t=28ms |
| STRUCT-011 | PASS | mamografia s1 ok=true t=67ms |
| STRUCT-012 | PASS | densitometria s1 ok=true t=34ms |
| STRUCT-013 | PASS | pet_ct s1 ok=true t=24ms |
| STRUCT-014 | PASS | radiografia s1 ok=true t=30ms |
| STRUCT-015 | PASS | ecografia_abdominal s1 ok=true t=32ms |
| STRUCT-016 | PASS | gastroscopia s1 ok=true t=27ms |
| STRUCT-017 | PASS | colonoscopia s1 ok=true t=21ms |
| STRUCT-018 | PASS | broncoscopia s1 ok=true t=20ms |
| STRUCT-019 | PASS | laringoscopia s1 ok=true t=23ms |
| STRUCT-020 | PASS | gammagrafia_cardiaca s1 ok=true t=43ms |
| STRUCT-021 | PASS | eco_stress s1 ok=true t=28ms |
| STRUCT-022 | PASS | ett s1 ok=true t=30ms |
| STRUCT-023 | PASS | ecografia_renal s1 ok=true t=78ms |
| STRUCT-024 | PASS | ecografia_tiroidea s1 ok=true t=25ms |
| STRUCT-025 | PASS | ecografia_mamaria s1 ok=true t=24ms |
| STRUCT-026 | PASS | ecografia_obstetrica s1 ok=true t=26ms |
| STRUCT-027 | PASS | eco_doppler s1 ok=true t=28ms |
| STRUCT-028 | PASS | nota_evolucion s1 ok=true t=35ms |
| STRUCT-029 | PASS | epicrisis s1 ok=true t=28ms |
| STRUCT-030 | WARN | holter s1 ok=true t=25ms |
| STRUCT-031 | PASS | mapa s1 ok=true t=24ms |
| STRUCT-032 | PASS | cinecoro s1 ok=true t=26ms |
| STRUCT-033 | PASS | ecg s1 ok=true t=26ms |
| STRUCT-034 | PASS | pap s1 ok=true t=28ms |
| STRUCT-035 | PASS | colposcopia s1 ok=true t=27ms |
| STRUCT-036 | PASS | electromiografia s1 ok=true t=28ms |
| STRUCT-037 | PASS | polisomnografia s1 ok=true t=28ms |
| STRUCT-038 | PASS | naso s1 ok=true t=24ms |
| STRUCT-039 | PASS | endoscopia_otologica s1 ok=true t=27ms |
| STRUCT-040 | PASS | protocolo_quirurgico s1 ok=true t=44ms |
| CONTACT-NO-MAILTO | PASS | No se abrio cliente de correo externo |
| DOWNLOAD-INTEGRITY-HTML | WARN | Export HTML sin snippet esperado |

## Criterios de performance usados
- Objetivo de rapidez por estructuracion mock: <= 5s por caso (WARN si excede).
- Timeout del runner Playwright segun defaults del entorno de ejecucion.