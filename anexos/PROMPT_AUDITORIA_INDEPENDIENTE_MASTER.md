# Prompt Maestro — Auditoría Independiente de Producción

Quiero una auditoría independiente, exhaustiva y extremadamente detallista de este proyecto para decidir salida a producción.
No confíes en conclusiones previas de este chat.
Trabajá desde evidencia verificable en código, tests y documentación.

## Objetivo principal

1. Determinar estado real actual del sistema.
2. Medir porcentaje exacto de avance total hacia producción.
3. Calcular cuánto trabajo queda y en qué orden.
4. Identificar riesgos críticos para:
5. Clones perfectos.
6. Compras y upgrades sin fricción.
7. Alta y edición de más plantillas en producción.

## Alcance obligatorio

1. Revisar evolución desde el inicio del proyecto usando historial git.
2. Comparar cumplimiento contra etapas y planes documentados.
3. Auditar funcionalidad, calidad, seguridad, operación y negocio.
4. Validar desktop y mobile.
5. Diferenciar claramente:
6. Lo comprobado por ejecución.
7. Lo inferido por lectura.
8. Lo no verificado.

## Fuentes mínimas a revisar

1. README.md
2. RELEASE_PRODUCCION.md
3. anexos/CHECKLIST_QA_30MIN_PRODUCCION.md
4. tests/run_tests.js
5. tests/e2e-full-qa-playwright.js
6. tests/e2e-factory-clone.js
7. tests/e2e-gift-clone-comprehensive.js
8. tests/test-create-demo-users.js
9. src/js/features/structurer.js
10. src/js/features/business.js
11. src/js/config/config.js
12. src/js/utils/ui.js
13. backend/google_apps_script.js
14. index.html

## Ejecuciones mínimas obligatorias

1. node tests/run_tests.js
2. node tests/e2e-full-qa-playwright.js
3. node tests/e2e-factory-clone.js
4. node tests/e2e-gift-clone-comprehensive.js
5. node tests/test-backend-api.js
6. node tests/test-create-demo-users.js
7. node build.js

## Además

1. Hacer revisión de historial git completo para comparar etapas propuestas vs implementadas.
2. Señalar desvíos entre documentación y realidad de código.
3. Listar componentes críticos no cubiertos por pruebas automatizadas.
4. Si algo no puede verificarse, explicarlo y proponer prueba alternativa concreta.

## Formato de salida requerido

1. Resumen ejecutivo, máximo 15 líneas.
2. Matriz de cumplimiento por etapa:
3. Etapa.
4. Estado: Completada, Parcial, No iniciada.
5. Evidencia concreta.
6. Riesgo residual.
7. Porcentaje de avance por dominio:
8. Producto funcional.
9. Clones y licenciamiento.
10. Compras y upgrades.
11. Plantillas y administración.
12. Seguridad.
13. Operación y release.
14. Porcentaje global final con fórmula explícita.
15. Lista priorizada de pendientes:
16. Severidad.
17. Impacto negocio.
18. Esfuerzo estimado.
19. Dependencias.
20. Plan de cierre:
21. Quick wins 24 a 48 horas.
22. Bloque de estabilización 7 días.
23. Criterio GO y NO-GO objetivo.
24. Riesgos de salida, top 10, con mitigación.
25. Dictamen final:
26. GO.
27. GO condicional.
28. NO-GO.
29. Justificación técnica y de negocio.

## Reglas de calidad del informe

1. No maquillar resultados.
2. No asumir que algo funciona si no hay evidencia.
3. Cada conclusión importante debe tener evidencia.
4. Marcar explícitamente falsos positivos de tests y tests frágiles.
5. Incluir recomendación de porcentaje de confianza del dictamen final.
