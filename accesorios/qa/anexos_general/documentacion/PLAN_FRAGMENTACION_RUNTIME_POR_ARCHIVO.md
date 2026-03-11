# Plan de Fragmentacion Runtime (sin riesgo)

Estado: solo planificacion. No se elimina ni modifica codigo productivo en esta fase.

## 1) Inventario de archivos grandes (runtime)
Fuente: `anexos/workbench_fragmentacion/targets_runtime_fragmentacion.json`

Top candidatos por tamano/lineas:
- `recursos/admin.html` (~521 KB, 8438 lineas)
- `index.html` (~198 KB, 2607 lineas)
- `src/css/components.css` (~145 KB, 4401 lineas)
- `src/js/features/editor.js` (~92 KB, 1692 lineas)
- `src/js/features/business.js` (~81 KB, 1410 lineas)
- `backend/google_apps_script.js` (~80 KB, 1664 lineas)
- `src/js/utils/ui.js` (~78 KB, 1388 lineas)
- `src/js/features/pdfPreview.js` (~53 KB, 906 lineas)
- `src/js/config/templates.js` (~53 KB, 899 lineas)
- `src/js/features/settingsPanel.js` (~52 KB, 1028 lineas)

## 2) Reglas de ejecucion segura
- Trabajar por archivo, en pasos chicos, 1 commit por subpaso.
- Primero extraer a modulo nuevo con API estable; no borrar original.
- Mantener wrapper en archivo original que delega al nuevo modulo.
- Validar cada subpaso: `node build.js` + `node tests/run_tests.js`.
- Revertir solo el subpaso fallido.

## 3) Carpeta de trabajo sin riesgo
- Analisis y borradores en: `anexos/workbench_fragmentacion/`.
- Si se necesita prototipar cortes, hacerlo primero en esa carpeta.
- Recien cuando pase validacion, replicar corte en `src/`.

## 4) Orden recomendado de fragmentacion (de menor riesgo a mayor riesgo)

### Fase A - CSS y diccionarios (riesgo bajo)
1. `src/css/components.css`
- Objetivo: separar por dominio visual.
- Cortes propuestos:
  - `src/css/print.css`
  - `src/css/preview.css`
  - `src/css/modals.css`
  - `src/css/forms.css`
- Estrategia: mover bloques completos con comentarios delimitadores.
- Verificacion: preview, modales, impresión.

2. `src/js/config/templates.js`
- Objetivo: dividir catálogo en chunks por especialidad.
- Cortes propuestos:
  - `src/js/config/templates-core.js`
  - `src/js/config/templates-imagenes.js`
  - `src/js/config/templates-endoscopia.js`
  - `src/js/config/templates-cardiologia.js`
- Estrategia: merge final en un export unificado para compatibilidad.

### Fase B - Features runtime medias (riesgo medio)
3. `src/js/features/settingsPanel.js`
- Cortes propuestos:
  - `settingsPanel.tabs.js`
  - `settingsPanel.bindings.js`
  - `settingsPanel.persist.js`

4. `src/js/features/pdfPreview.js`
- Cortes propuestos:
  - `pdfPreview.render.js`
  - `pdfPreview.print.js`
  - `pdfPreview.email.js`
  - `pdfPreview.navigation.js`

5. `src/js/features/pdfMaker.js`
- Cortes propuestos:
  - `pdfMaker.layout.js`
  - `pdfMaker.assets.js`
  - `pdfMaker.content.js`
  - `pdfMaker.footer.js`

### Fase C - Core de UI (riesgo medio/alto)
6. `src/js/utils/ui.js`
- Cortes propuestos:
  - `ui.modals.js`
  - `ui.config.js`
  - `ui.notifications.js`
  - `ui.handlers.js`

7. `src/js/features/business.js`
- Cortes propuestos:
  - `business.workplaces.js`
  - `business.professionals.js`
  - `business.registrySync.js`

8. `src/js/features/editor.js`
- Cortes propuestos:
  - `editor.export.js`
  - `editor.templates.js`
  - `editor.createHtml.js`
  - `editor.events.js`

### Fase D - HTML grandes (riesgo alto)
9. `index.html`
- Objetivo: bajar tamano del archivo principal.
- Estrategia segura:
  - mantener `index.html` como shell
  - mover bloques JS inline a `src/js/bootstrap/*.js`
  - mover estilos inline a `src/css/*.css`
  - no tocar ids/clases/orden sin tests visuales

10. `recursos/admin.html`
- Estrategia: misma que `index.html` (shell + js/css externos).

### Fase E - Backend script grande (riesgo alto)
11. `backend/google_apps_script.js`
- Cortes propuestos:
  - `gas.users.js`
  - `gas.licenses.js`
  - `gas.email.js`
  - `gas.logs.js`
- Nota: mantener un entrypoint central que importe/concatene para despliegue Apps Script.

## 5) Plan de validacion por archivo
Por cada archivo fragmentado:
- Paso 1: extraer 1 bloque a modulo nuevo (sin borrar original).
- Paso 2: reemplazar bloque original por wrapper/call.
- Paso 3: build + tests.
- Paso 4: smoke manual del flujo afectado.
- Paso 5: commit.

## 6) Condicion de borrado del codigo viejo
Solo se elimina codigo original cuando:
- hay equivalencia funcional comprobada,
- build y tests pasan,
- smoke manual pasa,
- y existe commit previo estable para rollback.

## 7) Riesgos UTF-8 y mitigacion
- No usar herramientas que cambien encoding automaticamente.
- Guardar siempre UTF-8 (idealmente sin BOM).
- Evitar reemplazos masivos ciegos.
- Revisar caracteres especiales en textos medicos y labels UI.
