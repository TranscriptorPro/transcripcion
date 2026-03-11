# Circuito 1: Inicialización + Persistencia — Reporte

- **Fecha**: 2026-03-11T00:38:02.394Z
- **URL**: https://transcriptorpro.github.io/transcripcion/
- **Resultado**: ✅ PASS=16  ⚠️ WARN=0  ❌ FAIL=1

## Tabla de resultados

| Paso | Estado | Detalle |
|------|--------|---------|
| C1-01 | ✅ PASS | App cargada con storage limpio |
| C1-02 | ✅ PASS | Editor visible y vacío |
| C1-03 | ✅ PASS | Botones IDLE: transcribeBtn:disabled✓, btnStructureAI:hidden✓, btnConfigPdfMain:hidden✓, copyBtn:hidden✓ |
| C1-04 | ✅ PASS | appState === IDLE |
| C1-05 | ✅ PASS | Modo cambiado a Pro correctamente |
| C1-06 | ✅ PASS | Modo Pro persistió tras recarga (currentMode="pro", toggle=true) |
| C1-07 | ✅ PASS | Modo cambiado a Normal correctamente |
| C1-08 | ❌ FAIL | Modo NO persistió: currentMode="pro", toggle=true |
| C1-09 | ✅ PASS | Texto escrito en editor (175 chars) |
| C1-10 | ✅ PASS | Autosave guardado (175 chars en localStorage) |
| C1-11 | ✅ PASS | Botón restaurar visible: "♻️ Restaurar sesión anterior (hace menos de 1 min)" |
| C1-12 | ✅ PASS | Borrador restaurado íntegro (175 chars) |
| C1-13 | ✅ PASS | Negrita aplicada correctamente |
| C1-14 | ✅ PASS | Cursiva aplicada correctamente |
| C1-15 | ✅ PASS | Undo ejecutado: contenido cambió |
| C1-16 | ✅ PASS | Redo ejecutado: contenido cambió |
| C1-17 | ✅ PASS | 0 errores JS en consola |

## Criterios usados
- Estado IDLE: transcribeBtn/structureBtn disabled, export buttons hidden
- Persistencia: last_profile_type en IndexedDB o localStorage
- Autosave: clave editor_autosave con contenido > 50 chars
- Restauración: contenido recuperado con keywords del texto original
- Formato: <strong>/<b> para negrita, <em>/<i> para cursiva
- Consola: 0 errores JS (excluye errores de red/favicon)