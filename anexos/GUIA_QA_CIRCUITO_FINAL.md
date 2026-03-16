# Guia QA Circuito Final (Preview-PDF-HTML-Email)

Objetivo: validar que el circuito completo sea consistente y detectar rapido cualquier deriva para corregirla.

## 1) Precondiciones

1. Tener dependencias instaladas:
   - npm install
2. Estar en rama actualizada:
   - git pull
3. Confirmar arbol limpio antes de probar:
   - git status --short

## 2) Prueba automatica (recomendada)

### Opcion A: Validacion local completa

Ejecutar:

- npm run release:verify:local

Que valida:

1. Build de dist
2. Regresion completa
3. E2E integral en localhost contra dist

Resultado esperado:

- Finaliza con mensaje DONE
- No debe haber FAIL
- WARN en overlap HTML puede aparecer en casos puntuales y se revisa en el paso manual

### Opcion B: Validacion completa local + remoto

Ejecutar:

- npm run release:verify

Que valida adicionalmente:

1. Smoke postdeploy remoto
2. E2E remoto con reintentos y cache-busting

Resultado esperado:

- DONE al final
- Si hay fallo remoto inmediato, esperar propagacion y repetir

## 3) Prueba manual paso a paso (fuente de verdad)

Usar SIEMPRE el mismo caso clinico para comparar superficies.

### Paso 1: Preparar datos de prueba

Cargar o escribir:

1. Paciente con Nombre, DNI, Edad, Sexo, Cobertura, Afiliado
2. Estudio con Tipo, Fecha, Hora, Motivo, Medico derivante
3. Profesional y lugar de trabajo completos
4. Activar/desactivar estos toggles de forma intencional:
   - Mostrar fecha en footer
   - Mostrar QR
   - Ocultar encabezado de informe

### Paso 2: Validar Preview

1. Abrir vista previa PDF
2. Verificar en orden:
   - Header correcto (logos, profesional, institucion)
   - Bloque paciente completo y sin campos cruzados
   - Bloque estudio correcto
   - Footer coherente con toggle de fecha
   - QR visible/oculto segun toggle

Criterio de inconsistencia:

- Si falta/duplica datos en Preview respecto del editor/config

### Paso 3: Validar descarga PDF

1. Descargar PDF desde el mismo estado (sin tocar nada)
2. Comparar contra Preview:
   - Mismos datos de paciente
   - Mismo estudio
   - Mismo medico derivante
   - Mismo numero de informe
   - Mismo footer y fecha
   - Mismo comportamiento de QR y header

Criterio de inconsistencia:

- Cualquier diferencia de contenido entre Preview y PDF

### Paso 4: Validar descarga HTML

1. Descargar HTML
2. Abrir archivo descargado en navegador
3. Comparar contra Preview/PDF:
   - Misma informacion clinica
   - Sin errores de runtime
   - Sin campos vacios inesperados

Criterio de inconsistencia:

- Contenido diferente o error de JavaScript al exportar/abrir

### Paso 5: Validar email

1. Abrir envio por email desde preview
2. Verificar:
   - Asunto incluye estudio + paciente + fecha
   - Cuerpo incluye remitente/profesional correcto
   - Adjuntar PDF respeta lo visto en Preview

Criterio de inconsistencia:

- Asunto/cuerpo con datos de otra fuente o adjunto desalineado

### Paso 6: Prueba de persistencia

1. Guardar configuracion
2. Recargar app
3. Reabrir preview y repetir pasos 2-5

Criterio de inconsistencia:

- Cambian defaults o toggles sin haberlos modificado

## 4) Matriz minima de combinaciones

Ejecutar al menos estas 4:

1. Header visible + QR OFF + Fecha ON
2. Header visible + QR ON + Fecha ON
3. Header oculto + QR OFF + Fecha OFF
4. Header oculto + QR ON + Fecha OFF

## 5) Que reportar si aparece inconsistencia

Enviar exactamente:

1. Superficie donde falla: Preview, PDF, HTML o Email
2. Dato inconsistente puntual (ejemplo: medico derivante)
3. Configuracion usada (QR/header/fecha)
4. Pasos exactos para reproducir
5. Captura o artifact (si aplica)

Formato sugerido:

- Caso: C3
- Superficie: PDF
- Desvio: en PDF aparece fecha, en Preview no
- Toggles: showDate=false, showQR=true, hideHeader=true
- Repro: 1) ... 2) ... 3) ...

## 6) Comandos utiles de diagnostico

1. Verificar estado local:
   - git status --short
2. Solo smoke remoto:
   - npm run test:smoke:postdeploy
3. E2E integral remoto:
   - npm run test:e2e:full
4. Pipeline remoto solamente:
   - npm run release:verify:remote

## 7) Regla operativa

Si detectas una inconsistencia:

1. No avanzar con nuevos cambios funcionales
2. Congelar caso de repro
3. Corregir solo el desvio
4. Re-ejecutar release:verify:local
5. Confirmar que no hay regresion
