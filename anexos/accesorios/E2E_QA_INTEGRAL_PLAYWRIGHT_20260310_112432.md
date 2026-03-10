# E2E QA Integral - Playwright

- Fecha: 2026-03-10T14:24:32.926Z
- URL: https://transcriptorpro.github.io/transcripcion/
- Plantillas detectadas: 40
- Casos estructuracion ejecutados: 1
- Resumen: PASS=5 WARN=0 FAIL=1
- Artifacts: C:\Users\kengy\Desktop\Transcriptor-pro\anexos\accesorios\e2e_full_qa_artifacts_20260310_112423

| ID | Estado | Detalle |
|---|---|---|
| SMOKE-LOAD | PASS | App cargada en entorno objetivo |
| STRUCT-TEMPLATES | PASS | Plantillas detectadas: 40 |
| STRUCT-CASES | PASS | Casos a ejecutar: 1 (1 por plantilla) |
| STRUCT-001 | PASS | espirometria s1 ok=true t=87ms |
| CONTACT-NO-MAILTO | PASS | No se abrio cliente de correo externo |
| DOWNLOAD-INTEGRITY-HTML | FAIL | Error validando descarga HTML: page.evaluate: ReferenceError: profTitle is not defined     at window.createHTML (https://transcriptorpro.github.io/transcripcion/app.mmkoxz7a.min.js:1:182423)     at async eval (eval at evaluate (:290:30), <anonymous>:3:35)     at async <anonymous>:316:30 |

## Criterios de performance usados
- Objetivo de rapidez por estructuracion mock: <= 5s por caso (WARN si excede).
- Timeout del runner Playwright segun defaults del entorno de ejecucion.