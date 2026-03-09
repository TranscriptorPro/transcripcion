# E2E QA Integral - Playwright

- Fecha: 2026-03-09T21:25:39.932Z
- URL: https://transcriptorpro.github.io/transcripcion/
- Plantillas detectadas: 40
- Casos estructuracion ejecutados: 6
- Resumen: PASS=10 WARN=1 FAIL=0
- Artifacts: C:\Users\kengy\Desktop\Transcriptor-pro\anexos\accesorios\e2e_full_qa_artifacts_20260309_182519

| ID | Estado | Detalle |
|---|---|---|
| SMOKE-LOAD | PASS | App cargada en entorno objetivo |
| STRUCT-TEMPLATES | PASS | Plantillas detectadas: 40 |
| STRUCT-CASES | PASS | Casos a ejecutar: 6 (2 por plantilla) |
| STRUCT-001 | PASS | espirometria s1 ok=true t=1671ms |
| STRUCT-002 | PASS | espirometria s2 ok=true t=1199ms |
| STRUCT-003 | PASS | test_marcha s1 ok=true t=1284ms |
| STRUCT-004 | PASS | test_marcha s2 ok=true t=3234ms |
| STRUCT-005 | PASS | pletismografia s1 ok=true t=1080ms |
| STRUCT-006 | PASS | pletismografia s2 ok=true t=1202ms |
| CONTACT-NO-MAILTO | PASS | No se abrio cliente de correo externo |
| DOWNLOAD-INTEGRITY-HTML | WARN | Export HTML sin snippet esperado |

## Criterios de performance usados
- Objetivo de rapidez por estructuracion: <= 30s por caso (WARN si excede).
- Timeout del runner Playwright segun defaults del entorno de ejecucion.