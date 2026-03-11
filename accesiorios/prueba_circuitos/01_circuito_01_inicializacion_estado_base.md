# C01 - Inicializacion y estado base (IDLE)

Objetivo:
Validar que la app inicia en estado estable, con visibilidad/habilitacion correcta de controles y sin errores JS.

Alcance:
- Carga inicial de UI
- Estado global inicial
- Botones y acciones visibles/no visibles
- Cambio de modo y persistencia basica
- Sin transcripcion ni estructuracion

Precondiciones:
1. Abrir la app en una ventana nueva.
2. Abrir DevTools (Console + Application).
3. Recomendado para prueba limpia:
   - localStorage: limpiar claves de sesion
   - IndexedDB: limpiar DB de app
4. Tener internet activo (solo para descartar errores de carga de assets).

Elementos involucrados:
- index.html
- src/js/core/state.js
- src/js/utils/stateManager.js
- src/js/utils/ui.js

## Pasos QA

| Paso | Accion | Resultado esperado | Resultado real | Evidencia |
|---|---|---|---|---|
| 1 | Cargar la app por primera vez | La pantalla abre sin bloqueos ni pantallas rotas | Pendiente | Captura home inicial |
| 2 | Revisar consola al cargar | 0 errores rojos de JS en carga | Pendiente | Captura consola |
| 3 | Verificar editor | Editor visible y editable, sin contenido residual | Pendiente | Captura editor |
| 4 | Verificar botones de transcripcion/estructura | Transcribir deshabilitado si no hay archivo; Estructurar oculto o no habilitado en IDLE | Pendiente | Captura barra acciones |
| 5 | Verificar botones de salida | Preview/Imprimir/Descargar no disponibles en IDLE | Pendiente | Captura barra acciones |
| 6 | Cambiar toggle Normal/Pro | El modo cambia visualmente sin refrescar la app | Pendiente | Captura antes/despues |
| 7 | Recargar pagina | El modo seleccionado se conserva tras reload | Pendiente | Captura toggle post-reload |
| 8 | Verificar estado vacio tras reload | No aparecen tabs basura, ni texto, ni paciente anterior | Pendiente | Captura area central |
| 9 | Probar click en botones no habilitados | No debe ejecutar acciones invalidas ni tirar error | Pendiente | Nota + captura consola |
| 10 | Revisar performance basica | Carga inicial razonable y sin freeze visible | Pendiente | Nota de tiempo aprox |

## Criterios de aprobacion
- A1: Carga limpia sin errores JS bloqueantes.
- A2: Estado IDLE consistente (sin elementos de estados avanzados visibles).
- A3: Persistencia correcta del toggle de modo.
- A4: Ningun boton ejecuta flujo invalido en IDLE.

## Severidad de fallas
- Critica: crash, pantalla en blanco, errores JS que bloquean uso.
- Alta: botones habilitados cuando no corresponde en IDLE.
- Media: inconsistencias visuales o de estado que se recuperan con reload.
- Baja: detalles de estilo/texto sin impacto funcional.

## Registro de incidencias (completar durante prueba)
| ID | Paso | Severidad | Descripcion | Reproducible | Estado |
|---|---|---|---|---|---|
| C01-BUG-001 |  |  |  |  | Abierto |

## Nota para siguiente circuito
Si C01 queda aprobado, continuar con C02 (persistencia de preferencias locales).
