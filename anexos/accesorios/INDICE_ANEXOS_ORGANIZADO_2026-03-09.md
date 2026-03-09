# Indice Organizado de `anexos` (para busqueda rapida e IA)

## Convencion sugerida de nombres
- Prefijo por tipo:
  - `AUD_` auditorias
  - `PLAN_` planes
  - `ROADMAP_` hoja de ruta por fecha
  - `MAN_` manuales
  - `PROMPT_` prompts de trabajo
  - `TEST_` evidencias y resultados de testing
  - `CTX_` contexto de sesion/proyecto
- Fechas sugeridas: `YYYY-MM-DD`.
- Ejemplo: `AUD_CODIGO_2025-01.md`, `PLAN_FRAGMENTACION_RUNTIME_2026-03-09.md`.

## Mapa actual (sin renombrar archivos fuente)

### Raiz `anexos/`
- `AUDITORIA_IA.md`: auditoria principal de IA.
- `LISTADO_PLANTILLAS.md`: inventario de plantillas medicas.
- `PLAN_ESTRUCTURACION_INFORMES.md`: estrategia de estructuracion.
- `PRUEBAS_MANUALES.md`: checklist y evidencias manuales.
- `test-button-anim.html`: prueba visual de animacion de boton.

### `anexos/documentacion/`
- `AUDITORIA_CODIGO_2025.md`: revision tecnica de codigo.
- `AUDITORIA_COHERENCIA_TIPOS_USUARIO.md`: consistencia de roles/tipos.
- `AUDITORIA_COMPLETA_APP_2025.md`: auditoria integral historica.
- `AUDITORIA_FLUJOS_COMPLETA.md`: auditoria de flujos funcionales.
- `BRAINSTORM_MEJORAS.md`: ideas de mejora.
- `CONTEXTO_PROYECTO.md`: contexto estable del proyecto.
- `CONTEXTO_SESION.md`: contexto operativo de sesion.
- `DATOS_DEMO.js`: dataset/demo de apoyo.
- `diagrama-flujos.mmd`: fuente Mermaid de flujos.
- `diagrama-flujos.png`: export visual del diagrama.
- `DICCIONARIO_RESEARCH.md`: investigacion de terminologia/diccionario.
- `GUIA_RAPIDA.md`: guia corta operativa.
- `HOJA_DE_RUTA.html`: version visual de roadmap.
- `HOJA_DE_RUTA.md`: roadmap en markdown.
- `INFORME_COMPLETO_APP.md`: informe largo consolidado.
- `INVENTARIO_FUNCIONALIDADES.md`: mapa de features.
- `MANUAL_PROFESIONAL.md`: manual para profesional.
- `MANUAL_USUARIO.md`: manual para usuario final.
- `PLAN_FRAGMENTACION_RUNTIME_POR_ARCHIVO.md`: plan de fragmentacion por archivo.
- `PLAN_FRAGMENTACION_SEGURA_UTF8.md`: lineamientos de fragmentacion segura UTF8.
- `RESPUESTAS_AUDITORIA.md`: respuestas y decisiones de auditoria.
- `ROADMAP_24_FEB_2026.md`: roadmap fechado.
- `ROADMAP_8_MARZO_2026.md`: roadmap fechado.
- `ROLES_Y_FUNCIONES.md`: definicion de roles.

### `anexos/prompts/`
- `auditoria_navegador_gift.md`: prompt de auditoria de navegador/gift.
- `gestion_api_key_contacto.md`: prompt para API key/contacto.
- `herramienta_logos_firmas_admin.md`: prompt para logos/firmas admin.
- `migracion_indexeddb.md`: prompt de migracion a IndexedDB.
- `plan_sesion_28feb.md`: plan de sesion.
- `sesion_estetica_ui.md`: prompt de estetica/UI.
- `testing_exhaustivo_v58.md`: prompt de testing exhaustivo.

### `anexos/scripts/`
- `test-editor.js`: script de test puntual del editor.

### `anexos/workbench_fragmentacion/`
- `inventario_top_120.json`: top archivos por tamano/deuda.
- `targets_runtime_fragmentacion.json`: objetivos de runtime split.

### `anexos/local_workspace/`
- Archivos de salida local y temporales de pruebas/reportes:
  - `fail_lines.txt`
  - `test_output.txt`
  - `test_output_full.txt`
  - `test_run_output.txt`
  - `*.pdf`, `*.rtf`
- Recomendacion: tratar esta carpeta como artefactos de ejecucion local.

## Pendiente recomendado de organizacion (fase siguiente, opcional)
1. Estandarizar nombres con prefijos por tipo (`AUD_`, `PLAN_`, `ROADMAP_`, `MAN_`, `PROMPT_`, `TEST_`).
2. Separar historicos vs vigentes en subcarpetas:
   - `anexos/documentacion/historico/`
   - `anexos/documentacion/vigente/`
3. Mover salidas volatiles a `anexos/local_workspace/` (ya existe) y excluir de flujos de release.
4. Mantener este indice como punto de entrada para nueva IA/sesion.
