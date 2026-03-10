# 🧪 Plan de Pruebas Manuales — Transcriptor Médico Pro

> **Instrucciones:** Probá cada punto en orden. Marcá el checkbox si funciona.  
> Si algo falla, escribí el motivo debajo del punto.  
> Al terminar, compartí este archivo y trabajo en los puntos negativos.  
> **URL:** https://transcriptorpro.github.io/transcripcion/  
> **Antes de empezar:** Ctrl+Shift+R (hard refresh) para limpiar caché.

---

## 🔹 SECCIÓN 0: Tour adaptativo + estructuración desde archivos de texto

### 0.1 Tour NORMAL muestra paso de activar Modo Pro
- **Hacer:** Ingresar con usuario NORMAL en modo normal. Abrir Ayuda y lanzar tour.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.2 Tour PRO/GIFT/CLINIC NO muestra paso de activar Modo Pro
- **Hacer:** Ingresar con usuario PRO/GIFT/CLINIC. Lanzar tour y verificar que no aparezca ese paso.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.3 Tour ADMIN incluye paso de Panel de administración
- **Hacer:** En admin, lanzar tour y verificar paso de panel admin.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.4 Tour reanuda último paso por perfil
- **Hacer:** Iniciar tour, avanzar 2-3 pasos, cerrar con Salir. Volver a iniciar tour.
- **Esperado:** Retoma donde quedó.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.5 Reiniciar tour desde Ayuda inicia en paso 1
- **Hacer:** Usar botón "♻️ Reiniciar desde el inicio" en Ayuda.
- **Esperado:** Empieza desde el primer paso del perfil actual.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.6 Reiniciar tour desde Configuración inicia en paso 1
- **Hacer:** Configuración -> Herramientas -> "♻️ Reiniciar tutorial desde el inicio".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.7 Estructuración: subir TXT
- **Hacer:** Ir a fuente Texto, adjuntar `.txt`, estructurar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.8 Estructuración: subir DOCX
- **Hacer:** Adjuntar `.docx`, verificar carga de contenido y estructuración.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.9 Estructuración: subir PDF
- **Hacer:** Adjuntar `.pdf` con texto seleccionable, estructurar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### 0.10 Estructuración: subir DOC legacy
- **Hacer:** Adjuntar `.doc`.
- **Esperado:** Si se puede leer, carga y estructura; si no, mensaje para convertir a `.docx`.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN A: Carga inicial y UI base

### A1. Página carga sin errores
- **Hacer:** Abrir la URL. Abrir consola (F12 → Console). Verificar que no hay errores rojos.
- [SI] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A2. Tema claro se ve correctamente
- **Hacer:** Verificar que la app carga en tema claro con colores teal/blancos armónicos.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A3. Tema oscuro se ve correctamente
- **Hacer:** Click en el ícono de sol/luna (toggle tema). Verificar que todo cambia a oscuro sin elementos rotos.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A4. Toggle Pro/Normal visible
- **Hacer:** Verificar que el switch Pro/Normal está visible en el header o sidebar.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A5. API Key — carga correctamente si ya está guardada
- **Hacer:** Si ya tenías API key guardada, verificar que muestra "Conectada ✓" (badge verde).
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A6. API Key — card colapsada cuando conectada
- **Hacer:** Con key guardada, la card de API key debe mostrar solo el badge verde, no el input/botones.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### A7. API Key — click en badge expande para editar
- **Hacer:** Click en "Conectada ✓" → debe expandir mostrando el input y botones Guardar/Probar.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN B: Botón animado Gemini (T+S)

### B1. Botón T+S visible en modo Pro
- **Hacer:** Activar modo Pro. Verificar que aparece "Transcribir y Estructurar" debajo de los botones principales.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B2. Botón T+S oculto en modo Normal
- **Hacer:** Cambiar a modo Normal. Verificar que el botón T+S desaparece.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B3. Botón T+S DESHABILITADO — aspecto gris sin animación
- **Hacer:** En modo Pro, SIN archivos cargados, verificar que el botón se ve gris/apagado, sin animación.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B4. Botón T+S HABILITADO — animación Gemini visible
- **Hacer:** Cargar uno o más archivos de audio. Verificar que el botón cobra vida con gradiente animado azul/púrpura/rosa/dorado moviéndose.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B5. Botón T+S — resplandor (glow) visible
- **Hacer:** Con el botón habilitado, verificar que tiene un resplandor difuso colorido detrás/alrededor.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B6. Botón T+S — ícono sparkle animado
- **Hacer:** Verificar que el ícono de estrella/sparkle del botón tiene una micro-animación de rotación/escala.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B7. Botón T+S — hover intensifica el efecto
- **Hacer:** Pasar el mouse sobre el botón habilitado. Debe elevarse ligeramente y el glow se intensifica.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### B8. Botón T+S — animación en tema oscuro
- **Hacer:** Cambiar a tema oscuro. Verificar que la animación Gemini sigue viéndose bien con contraste.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN C: Flujo de transcripción simple (solo Transcribir)

### C1. Cargar archivo de audio
- **Hacer:** Click en zona de carga o botón. Seleccionar un archivo de audio (mp3, wav, m4a).
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C2. Archivo aparece en la lista
- **Hacer:** Verificar que el archivo aparece con nombre, duración y botón de play.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C3. Reproducir audio desde la lista
- **Hacer:** Click en play ▶ del archivo. Verificar que el audio se reproduce.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C4. Botón Transcribir se habilita
- **Hacer:** Con archivo cargado, verificar que "Transcribir" pasa de gris a activo.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C5. Transcripción exitosa
- **Hacer:** Click en "Transcribir". Esperar. Verificar que el texto transcripto aparece en el editor.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C6. Barra de progreso durante transcripción
- **Hacer:** Durante la transcripción, verificar que se muestra un indicador de progreso/procesamiento.
- [Si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C7. Botones copiar/imprimir se habilitan tras transcripción
- **Hacer:** Después de transcribir, verificar que los botones de copiar, imprimir y descargar aparecen.
- [si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### C8. Word count se actualiza
- **Hacer:** Verificar que el contador de palabras refleja el texto transcripto.
- [si] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN D: Flujo T+S (Transcribir y Estructurar)

### D1. Click en T+S inicia transcripción
- **Hacer:** Con archivo cargado en modo Pro, click en "Transcribir y Estructurar". Debe iniciar la transcripción.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### D2. Después de transcribir, auto-detecta plantilla
- **Hacer:** Verificar que tras la transcripción, aparece un toast indicando la plantilla detectada.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### D3. Estructuración automática con IA
- **Hacer:** Verificar que después de la detección, el texto se estructura automáticamente con headings H2/H3.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### D4. Campos editables clickeables (spans con borde)
- **Hacer:** En el texto estructurado, verificar que los valores de cada campo tienen un borde punteado y son clickeables.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### D5. Banner de datos del paciente aparece
- **Hacer:** Verificar que arriba del editor aparece un banner "📋 Agregar datos del paciente" si no hay datos cargados.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN E: Modal de edición de campo

### E1. Click en campo abre modal "Completar campo"
- **Hacer:** Click en cualquier campo editable del informe estructurado → debe abrir el modal.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E2. Modal muestra nombre del campo en el título
- **Hacer:** Verificar que el título dice "✏️ [Nombre del campo]" (ej: "✏️ Ventrículo izquierdo").
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E3. Tabs Escribir / Grabar presentes
- **Hacer:** Verificar que hay dos tabs: "✏️ Escribir" y "🎙️ Grabar y transcribir (Pro)".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E4. Opciones rápidas: s/p, Sin particularidades, No evaluado
- **Hacer:** En tab Escribir, verificar que están los 3 botones rápidos.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E5. Click en opción rápida rellena el textarea
- **Hacer:** Click en "s/p" → el textarea debe llenarse con "s/p".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E6. Botón Aplicar guarda el valor
- **Hacer:** Escribir texto o elegir opción rápida → click "✅ Aplicar" → el campo en el informe se actualiza.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E7. Botón "Dejar en blanco" limpia el campo
- **Hacer:** Click en "🗑️ Dejar en blanco" → el campo queda vacío en el informe.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E8. Botón "Eliminar campo" — modal custom (NO del navegador)
- **Hacer:** Click en "🗑️ Eliminar campo" → debe aparecer un modal PROPIO de la app (NO el popup gris del navegador).
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E9. Eliminar campo — sin espacio residual
- **Hacer:** Confirmar eliminar → el campo, su heading y todo su contenido desaparecen SIN dejar un espacio vacío en el informe.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E10. Tab Grabar — grabación funciona
- **Hacer:** Click en tab "🎙️ Grabar", luego "Iniciar grabación" → grabar unos segundos → detener. Verificar que transcribe.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### E11. Cancelar cierra el modal sin cambios
- **Hacer:** Abrir modal, escribir algo, click "Cancelar" → campo original sin cambios.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN F: Vista comparativa (side-by-side)

### F1. Botón "⧉ Comparar" aparece tras estructurar
- **Hacer:** Después de T+S exitoso, verificar que aparece el botón "⧉ Comparar" en la toolbar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F2. Botón "⧉ Comparar" oculto antes de estructurar
- **Hacer:** Antes de estructurar (solo texto plano), verificar que el botón NO aparece.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F3. Click en Comparar muestra dos paneles lado a lado
- **Hacer:** Click en "⧉ Comparar" → aparecen dos paneles: "📝 Original" y "✨ Estructurado (IA)".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F4. Panel Original muestra texto sin formato
- **Hacer:** Verificar que el panel izquierdo muestra el texto original plano (pre-estructurado).
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F5. Panel Estructurado muestra texto con formato
- **Hacer:** Verificar que el panel derecho muestra el texto estructurado con headings y formato.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F6. Botón Copiar en panel Original
- **Hacer:** Click en el botón copiar del panel Original → toast confirmando. Pegar en un editor para verificar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F7. Botón Copiar en panel Estructurado
- **Hacer:** Click en el botón copiar del panel Estructurado → toast confirmando.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F8. Botón Imprimir en cada panel
- **Hacer:** Click en imprimir de cualquier panel → abre ventana de impresión con solo ese contenido.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F9. Botones principales (copiar/imprimir) deshabilitados en comparación
- **Hacer:** En modo comparación, los botones copiar/imprimir principales deben estar deshabilitados con tooltip explicativo.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F10. Salir de comparación
- **Hacer:** Click de nuevo en "⧉ Comparar" → vuelve al editor normal con texto estructurado.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### F11. Responsive — paneles apilados en móvil
- **Hacer:** Reducir ventana a < 768px (o usar F12 → toggle device). Los paneles deben apilarse verticalmente.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN G: Toggle original/estructurado

### G1. Botón "↩ Original" aparece tras estructurar
- **Hacer:** Tras T+S exitoso, verificar que aparece "↩ Original" en la toolbar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### G2. Click alterna entre texto original y estructurado
- **Hacer:** Click en "↩ Original" → muestra texto plano. Click de nuevo → vuelve al estructurado.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### G3. Banner naranja indica que estás viendo el original
- **Hacer:** En vista original, verificar que aparece un banner "Estás viendo el texto original".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN H: Botón Continuar Grabando (append)

### H1. Botón 🎙️+ visible en Pro tras transcripción
- **Hacer:** En modo Pro, después de transcribir, verificar que aparece un ícono de micrófono con "+" junto a copiar/imprimir.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### H2. Botón oculto en modo Normal
- **Hacer:** Cambiar a modo Normal con texto transcripto → el botón de micrófono+ NO debe verse.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### H3. Click inicia grabación (botón se pone rojo pulsante)
- **Hacer:** Click en 🎙️+ → el botón debe ponerse rojo con animación pulsante (recording).
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### H4. Click de nuevo detiene y transcribe
- **Hacer:** Grabar unos segundos, click de nuevo → detiene, muestra toast "Transcribiendo...", luego agrega texto al final.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### H5. Texto nuevo se agrega al final (no reemplaza)
- **Hacer:** Verificar que el texto nuevo aparece DEBAJO del existente, sin borrar nada.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### H6. Editor hace scroll al nuevo texto
- **Hacer:** Si el informe es largo, verificar que el editor hace scroll automático al texto recién agregado.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN I: Restaurar sesión anterior

### I1. Botón "♻️ Restaurar sesión anterior" aparece al recargar
- **Hacer:** Transcribir algo → esperar 30s (autosave) → recargar la página. Verificar que aparece el botón.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### I2. NO restaura automáticamente
- **Hacer:** Al recargar, el editor debe estar VACÍO hasta que presiones el botón.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### I3. Click restaura el borrador
- **Hacer:** Click en "♻️ Restaurar sesión anterior" → el texto previo aparece en el editor.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### I4. Toast informativo
- **Hacer:** Verificar que al cargar la página aparece un toast discreto informando que hay borrador disponible.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### I5. Botón desaparece tras restaurar
- **Hacer:** Después de click en restaurar, el botón debe ocultarse.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### I6. Reset (Limpiar) borra el borrador
- **Hacer:** Tras restaurar → click en "Limpiar" → recargar → NO debe ofrecer restaurar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN J: Botón Limpiar (reset)

### J1. Limpiar borra el editor
- **Hacer:** Con texto en el editor, click "Limpiar" → editor queda vacío.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### J2. Limpiar NO borra la API key
- **Hacer:** Después de Limpiar, verificar que la API key sigue mostrando "Conectada ✓".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### J3. Limpiar vuelve al estado IDLE
- **Hacer:** Tras Limpiar, botones de copiar/imprimir/descargar deben desaparecer/deshabilitarse.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### J4. Toast de confirmación
- **Hacer:** Click Limpiar → debe aparecer toast "Limpiado ✓".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN K: Datos del paciente

### K1. Banner placeholder aparece tras estructurar
- **Hacer:** Tras T+S, verificar que arriba del informe aparece "📋 Agregar datos del paciente".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### K2. Click en banner abre modal de paciente
- **Hacer:** Click en el banner → se abre modal con campos Nombre, DNI, Obra Social, etc.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### K3. Guardar datos del paciente
- **Hacer:** Completar nombre y otros datos → Guardar → datos se insertan en el encabezado del informe.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### K4. Autocompletado de pacientes previos
- **Hacer:** Empezar a escribir nombre de un paciente guardado previamente → debe sugerir autocompletado.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN L: Descarga de archivos

### L1. Descarga sin datos de paciente — modal custom
- **Hacer:** Sin datos del paciente, click en descargar → debe aparecer modal PROPIO (no el del navegador) preguntando si descargar así.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### L2. Descargar PDF
- **Hacer:** Click en descargar → PDF → se genera y descarga correctamente.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### L3. Descargar RTF (Word)
- **Hacer:** Click en el chevron ▼ → Word (RTF) → se descarga archivo .rtf.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### L4. Descargar TXT
- **Hacer:** Click en chevron ▼ → Texto Simple → se descarga archivo .txt.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### L5. Descargar HTML
- **Hacer:** Click en chevron ▼ → HTML → se descarga archivo .html.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### L6. Formato favorito (⭐)
- **Hacer:** Click en la estrella ☆ de un formato (ej: RTF) → se marca como favorito. El botón principal de descarga cambia a ese formato.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN M: Copiar e Imprimir

### M1. Botón copiar — copia texto al portapapeles
- **Hacer:** Click en copiar → toast "Copiado" → pegar en un editor para verificar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### M2. Botón imprimir — abre ventana de impresión
- **Hacer:** Click en imprimir → se abre el diálogo de impresión del navegador.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN N: Modo Normal vs Pro

### N1. Modo Normal — botón T+S oculto
- **Hacer:** En Normal, verificar que "Transcribir y Estructurar" NO aparece.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### N2. Modo Normal — botón IA (PL) aparece tras transcribir
- **Hacer:** En Normal, transcribir → verificar que aparece botón "PL" (aplicar plantilla) con dropdown de plantillas.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### N3. Modo Normal — seleccionar plantilla manualmente
- **Hacer:** Click en PL → elegir una plantilla del dropdown → se estructura con esa plantilla.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### N4. Modo Normal — botón continuar grabando NO visible
- **Hacer:** En Normal con texto transcripto, verificar que el 🎙️+ NO aparece.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### N5. Cambio Pro→Normal actualiza UI correctamente
- **Hacer:** Estar en Pro con texto estructurado → cambiar a Normal → verificar que botones Pro desaparecen.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN O: Grabación desde el micrófono

### O1. Botón grabar inicia grabación
- **Hacer:** Click en 🔴 Grabar → se activa el micrófono, botón se pone rojo pulsante.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### O2. Timer de grabación corre
- **Hacer:** Durante grabación, verificar que se muestra 00:01, 00:02, etc.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### O3. Detener grabación crea archivo
- **Hacer:** Click de nuevo → detiene → el archivo grabado aparece en la lista de archivos.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN P: Múltiples archivos de audio

### P1. Cargar 2+ archivos
- **Hacer:** Seleccionar 2 o más archivos de audio a la vez.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### P2. Diálogo "Unir audios" aparece (si Pro)
- **Hacer:** En Pro con 2+ archivos, verificar que aparece pregunta "¿Unir en una sola transcripción?".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### P3. Opción "Sí, unir" combina los archivos
- **Hacer:** Click "Sí, unir" → se transcriben como uno solo.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### P4. Opción "No, separado" crea tabs
- **Hacer:** Click "No, separado" → se crean tabs (uno por archivo).
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN Q: Configuración de impresión (PDF)

### Q1. Botón configurar impresión visible
- **Hacer:** Tras estructurar, verificar que aparece el botón ⚙️ de configuración PDF.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### Q2. Modal de configuración abre
- **Hacer:** Click en ⚙️ → se abre modal con opciones de margen, tipografía, logo, etc.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### Q3. Vista previa PDF
- **Hacer:** Click en botón "Vista previa" (ojo) → se muestra preview del PDF.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN R: Diccionario médico

### R1. Botón 🩺 aparece tras transcripción
- **Hacer:** Tras transcribir/estructurar, verificar que aparece el botón de estetoscopio.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### R2. Modal del diccionario abre
- **Hacer:** Click en 🩺 → se abre modal con tabs "Revisión" y "Diccionario".
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### R3. Agregar término al diccionario
- **Hacer:** Tab "Diccionario" → escribir palabra incorrecta y corrección → "Agregar" → aparece en la lista.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN S: Perfiles de salida

### S1. Selector de perfil visible tras transcripción
- **Hacer:** Tras transcribir, verificar que aparece el select "📋 Perfil de salida" en la toolbar.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### S2. Cambiar perfil altera los campos visibles
- **Hacer:** Seleccionar un perfil diferente → el formato/estructura del informe cambia.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN T: PWA (Instalación)

### T1. Botón "Instalar app" visible
- **Hacer:** En Chrome/Edge, verificar si aparece opción de instalar (puede estar en el header o en configuración).
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### T2. Instalar como PWA
- **Hacer:** Click en instalar → la app se instala y se puede abrir desde el escritorio/dock.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN U: Centro de ayuda

### U1. Botón ❓ abre centro de ayuda
- **Hacer:** Click en el botón de ayuda → se abre modal con tabs.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### U2. Tabs: Guía rápida, FAQ, Atajos, Acerca de
- **Hacer:** Verificar que existen los 4 tabs y que cada uno muestra contenido.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN V: Contacto

### V1. Botón de contacto visible
- **Hacer:** Verificar que hay un botón "Contacto" o "Soporte" accesible.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### V2. Modal de contacto con motivos
- **Hacer:** Click → se abre modal con select de motivo y textarea libre.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 🔹 SECCIÓN W: Edición del texto en el editor

### W1. Texto editable directamente
- **Hacer:** Click en el editor y escribir/borrar texto libremente.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### W2. Buscar y reemplazar (Ctrl+H)
- **Hacer:** Ctrl+H → se abre barra de Find & Replace.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

### W3. Toolbar de formato (negrita, cursiva, etc.)
- **Hacer:** Seleccionar texto → usar los botones de formato de la toolbar del editor.
- [ ] ✅ Funciona
- [ ] ❌ No funciona → Motivo: _____

---

## 📊 RESUMEN

| Sección | Total | ✅ OK | ❌ Fallas |
|---------|-------|-------|----------|
| A. Carga inicial | 7 | | |
| B. Botón Gemini | 8 | | |
| C. Transcripción simple | 8 | | |
| D. Flujo T+S | 5 | | |
| E. Modal edición campo | 11 | | |
| F. Vista comparativa | 11 | | |
| G. Toggle original | 3 | | |
| H. Continuar grabando | 6 | | |
| I. Restaurar sesión | 6 | | |
| J. Limpiar (reset) | 4 | | |
| K. Datos paciente | 4 | | |
| L. Descarga | 6 | | |
| M. Copiar/Imprimir | 2 | | |
| N. Modo Normal vs Pro | 5 | | |
| O. Grabación | 3 | | |
| P. Múltiples archivos | 4 | | |
| Q. Config impresión | 3 | | |
| R. Diccionario médico | 3 | | |
| S. Perfiles de salida | 2 | | |
| T. PWA | 2 | | |
| U. Centro de ayuda | 2 | | |
| V. Contacto | 2 | | |
| W. Editor | 3 | | |
| **TOTAL** | **108** | | |

---

> **Al terminar:** Compartí este archivo con los resultados.  
> Trabajo en cada ❌ que reportes con el motivo.
