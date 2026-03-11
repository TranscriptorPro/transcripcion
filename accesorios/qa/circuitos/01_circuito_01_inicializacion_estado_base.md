# C01 - Inicializacion y Estado Base (IDLE) - Formato Operativo

Objetivo:
Probar en Firefox que la app arranca limpia en IDLE, sin errores JS, con botones correctos y persistencia basica de modo.

Modo de ejecucion (interactivo por chat):
- Este circuito se ejecuta una accion por interaccion para ahorrar tokens.
- En cada interaccion: 1 orden operativa + 1 pregunta con opciones para marcar.
- El usuario responde seleccionando la opcion que mejor describe el resultado observado.
- Luego se pasa al siguiente paso del circuito.
- Formato de referencia de cada paso: C01-1a, C01-1b, C01-2c, etc.

Como reportarme fallas:
- Usa este formato: `C01-1a`, `C01-1b`, `C01-2c`, etc.
- Ejemplo: `Falla C01-3b: el boton Transcribir aparece habilitado sin archivos`.

## URLs de prueba (Firefox)

1. URL principal (produccion):
   - `https://transcriptorpro.github.io/transcripcion/`
2. Si no abre o no refleja cambios, usar local:
   - `file:///C:/Users/kengy/Desktop/Transcriptor-pro/index.html`

## Circuito C01 - Ordenes paso a paso

### Bloque 1 - Apertura limpia

1a. Abre Firefox.
1b. Abre una ventana privada nueva (Ctrl+Shift+P).
1c. Pega la URL principal y presiona Enter.
1d. Verifica que la app carga completa (sin pantalla blanca, sin bloqueo).
Resultado esperado:
- Interfaz visible completa.
- No crash al cargar.

### Bloque 2 - Consola y estado inicial

2a. Presiona F12 y abre pestaña Console.
2b. Recarga la pagina (Ctrl+R).
2c. Verifica que no aparezcan errores rojos bloqueantes.
Resultado esperado:
- 0 errores JS criticos de inicio.

### Bloque 3 - Controles en IDLE

3a. Sin cargar archivos ni pegar texto, revisa boton Transcribir.
3b. Revisa boton Estructurar IA.
3c. Revisa boton Vista previa/Imprimir/Descargar.
3d. Revisa que el editor este visible y editable.
Resultado esperado:
- Transcribir deshabilitado sin contenido.
- Estructurar no operativo en IDLE.
- Preview/Imprimir/Descargar no disponibles.
- Editor visible y vacio.

### Bloque 4 - Modo Normal/Pro y persistencia

4a. Cambia el toggle de modo (Normal <-> Pro).
4b. Confirma que el cambio visual es inmediato.
4c. Recarga la pagina (Ctrl+R).
4d. Verifica que el modo elegido se conserva.
Resultado esperado:
- El modo persiste tras recarga.

### Bloque 5 - Robustez basica de UI

5a. Intenta hacer clic en botones que deberian estar deshabilitados en IDLE.
5b. Verifica que no ejecuten acciones invalidas.
5c. Verifica que no aparezcan errores nuevos en consola.
Resultado esperado:
- Sin accion indebida.
- Sin errores JS nuevos.

## Checklist rapido (marca manual)

- [ ] C01-1d OK
- [ ] C01-2c OK
- [ ] C01-3a OK
- [ ] C01-3b OK
- [ ] C01-3c OK
- [ ] C01-3d OK
- [ ] C01-4d OK
- [ ] C01-5c OK

## Criterio de aprobado C01

Se aprueba C01 solo si:
1. No hay errores JS criticos al inicio.
2. Estado IDLE consistente (botones correctos).
3. Persistencia de modo funciona.
4. Ningun boton invalido dispara flujo.

## Plantilla de reporte para vos

Usa este formato al pasarme hallazgos:

`C01-<paso>: <que hiciste> -> <que paso> -> <que esperabas>`

Ejemplo:
`C01-2c: recargue con F12 abierto -> error TypeError en consola -> esperaba 0 errores`.
