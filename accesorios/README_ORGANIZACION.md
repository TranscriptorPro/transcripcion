# Accesorios - Organizacion del workspace

Esta carpeta contiene material NO esencial para la ejecucion de la app.

## Estructura
- `archivos_sueltos_raiz/`: recursos sueltos movidos desde la carpeta principal para mantener la raiz limpia.
- `logs/`: salidas de pruebas recientes para diagnostico rapido.
- `reportes/`: reportes consolidados y documentacion ejecutiva.
- `qa/circuitos/`: matriz y circuitos de QA utiles para regresion manual.
- `qa/anexos_general/`: anexos tecnicos/documentales consolidados.
- `qa/anexos_general/accesorios_historicos/`: evidencias historicas (artefactos, screenshots, reportes QA).
- `qa/historico_reportes/`: reportes antiguos movidos desde raiz.

## Criterio aplicado
- Se mantuvo en raiz solo lo necesario para funcionamiento/desarrollo de la app (`index.html`, `src/`, `recursos/`, `backend/`, `assets/`, `manifest.json`, `sw.js`, `package*.json`, etc.).
- Se removieron temporales no utiles (`tmp` y archivos de scratch).
- Se dejaron logs minimos para trazabilidad (`test_output_latest.txt`).

## Nota
Si necesitas auditar decisiones previas de otras IAs, consulta primero `qa/historico_reportes/` y luego `qa/anexos_general/accesorios_historicos/`.
