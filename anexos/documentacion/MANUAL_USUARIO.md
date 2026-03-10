# 📘 Manual de Usuario — Transcriptor Médico Pro

> **Versión:** 2.1.0  
> **Última actualización:** 10 de marzo de 2026  
> **Plataforma:** Aplicación web progresiva (PWA)

---

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Instalación y acceso](#3-instalación-y-acceso)
4. [Primer uso (Onboarding)](#4-primer-uso-onboarding)
5. [Tour guiado (adaptativo)](#5-tour-guiado-adaptativo)
6. [Interfaz principal](#6-interfaz-principal)
7. [Grabación de audio](#7-grabación-de-audio)
8. [Carga de archivos de audio](#8-carga-de-archivos-de-audio)
9. [Transcripción automática](#9-transcripción-automática)
10. [Modo Normal vs Modo Pro](#10-modo-normal-vs-modo-pro)
11. [Estructuración inteligente (Modo Pro)](#11-estructuración-inteligente-modo-pro)
12. [Estructuración desde texto y archivos](#12-estructuración-desde-texto-y-archivos)
11. [Editor de informes](#11-editor-de-informes)
12. [Datos del paciente](#12-datos-del-paciente)
13. [Registro de pacientes](#13-registro-de-pacientes)
14. [Configuración de impresión](#14-configuración-de-impresión)
15. [Perfiles de salida](#15-perfiles-de-salida)
16. [Exportación de informes](#16-exportación-de-informes)
17. [Vista previa de impresión](#17-vista-previa-de-impresión)
18. [Diccionario médico](#18-diccionario-médico)
19. [Atajos de teclado](#19-atajos-de-teclado)
20. [Guardado automático](#20-guardado-automático)
21. [Apariencia y personalización](#21-apariencia-y-personalización)
22. [Asistente de sesión](#22-asistente-de-sesión)
23. [Historial de informes](#23-historial-de-informes)
24. [Versionado y snapshots](#24-versionado-y-snapshots)
25. [Solución de problemas (FAQ)](#25-solución-de-problemas-faq)
26. [Contacto y soporte](#26-contacto-y-soporte)
27. [Privacidad y seguridad](#27-privacidad-y-seguridad)

---

## 1. Introducción

**Transcriptor Médico Pro** es una aplicación web profesional que permite a profesionales de la salud:

- **Grabar** dictados médicos en tiempo real o subir archivos de audio
- **Transcribir** automáticamente usando inteligencia artificial (Whisper de Groq)
- **Estructurar** informes médicos con plantillas por especialidad (LLaMA 3.3)
- **Exportar** como PDF profesional, Word (RTF), texto plano o HTML

La app funciona 100% en el navegador. No requiere instalación de software adicional.

---

## 2. Requisitos del sistema

| Requisito | Detalle |
|-----------|---------|
| **Navegador** | Google Chrome 90+, Microsoft Edge 90+, Firefox 90+, Safari 15+ |
| **Conexión a internet** | Necesaria para transcripción y estructuración IA |
| **Micrófono** | Necesario solo para grabación en vivo |
| **Sistema operativo** | Windows, macOS, Linux, Android, iOS |
| **Espacio** | ~5 MB en localStorage para datos y configuración |

> **Nota:** El editor, la configuración y la exportación a PDF funcionan sin conexión a internet si la app fue instalada como PWA.

---

## 3. Instalación y acceso

### Acceso web
Abrí la URL proporcionada por tu administrador en un navegador compatible.

### Instalar como app (PWA)
1. Abrí la app en Chrome o Edge
2. Si aparece el botón **📥 Instalar app** en el encabezado, hacé clic
3. Confirmá la instalación en el diálogo del navegador
4. La app aparecerá en tu escritorio / pantalla de inicio como una aplicación independiente

**En iOS (Safari):**
1. Abrí la URL en Safari
2. Tocá el botón **Compartir** (ícono de caja con flecha)
3. Seleccioná **"Agregar a pantalla de inicio"**

### Ventajas de instalar como PWA
- Se abre en ventana propia (sin barra de navegador)
- Acceso rápido desde escritorio o pantalla de inicio
- Funciona offline para edición y exportación
- Actualizaciones automáticas

---

## 4. Primer uso (Onboarding)

Al abrir la app por primera vez, se muestra una pantalla de bienvenida:

1. **Verificá tus datos:** Nombre profesional y matrícula (precargados por tu administrador)
2. **Aceptá los términos y condiciones** de uso
3. Pulsá **"Comenzar a usar la app"**

Después del onboarding, se inicia un **tour interactivo** que te guía por las funciones principales. Podés repetirlo en cualquier momento desde el botón **❓ Ayuda** → **🎯 Iniciar tour interactivo**.

---

## 5. Tour guiado (adaptativo)

El tour interactivo ahora se adapta al perfil de usuario y al estado real de la interfaz.

- **Por perfil:** muestra pasos diferentes para ADMIN, PRO, GIFT, CLINIC y NORMAL.
- **Paso Modo Pro:** solo aparece cuando realmente aplica (ej: usuario NORMAL en contexto normal).
- **Responsive:** omite automáticamente pasos cuyo elemento esté oculto en ese layout.
- **Reanudación por perfil:** si cerrás el tour antes de terminar, continúa desde el último paso al volver a abrirlo.
- **Reinicio manual:** podés forzar inicio desde el paso 1 con:
   - Ayuda -> **♻ Reiniciar desde el inicio**
   - Configuración -> Herramientas -> **♻ Reiniciar tutorial desde el inicio**

Si finalizás todos los pasos, el tour se marca como completado para ese usuario.

---

## 6. Interfaz principal

La interfaz se divide en:

### Encabezado (Header)
- **Logo y título** de la app
- **Toggle Pro/Normal:** Cambia entre modos de operación
- **Botones:** Panel admin (🛡️), Contacto (✉️), Ayuda (❓), Instalar PWA (📥), Tema (🌙/☀️), Configuración (⚙️)

### Panel lateral (Sidebar)
- **Grabar o Subir:** Botón de grabación + zona de carga
- **Opciones de audio:** Normalizar volumen, reducir ruido, unir audios
- **Botón Transcribir**
- **Configuración:** API Key, datos del profesional

### Área principal (Editor)
- **Pestañas** de archivos transcritos
- **Barra de herramientas:** Formato, buscar/reemplazar, diccionario médico
- **Editor WYSIWYG:** Texto editable con formato
- **Botones de acción:** Configurar impresión, previsualizar, copiar, imprimir, descargar

### Panel de Configuración (⚙️)
Pulsá el botón **⚙️** en el encabezado para abrir el modal de Configuración. Contiene los siguientes acordeones:

| Sección | Qué incluye |
|---------|-------------|
| **👤 Mi Cuenta** | Datos del profesional (nombre, matrícula, especialidad) |
| **🔑 API Key** | Clave de acceso a los servicios de IA |
| **🏥 Lugar de trabajo** | Consultorios y centros donde trabajás |
| **⚡ Perfiles rápidos** | Combinaciones guardadas de lugar + profesional |
| **📝 Configuración del editor** | Opciones del editor de texto (fuente, tamaño, etc.) |
| **🛠️ Herramientas** | Diccionario médico, respaldo, diagnósticos automáticos |
| **🎨 Apariencia** | Toggle modo oscuro/claro + selector de color corporativo |
| **🎭 Skins** | 3 temas visuales (*Por Defecto*, *Cyberpunk Neon*, *Light Minimal*) + botón "🛒 Más skins y complementos" |
| **📊 Estadísticas** | Uso de la app, conteo de transcripciones e informes |
| **💾 Respaldo** | Exportar/importar configuración y datos |
| **ℹ️ Info de la app** | Versión, estado de la licencia, ID del dispositivo |

### Comportamiento por tipo de usuario en "Mi Cuenta"
- **App ADMIN:** podés editar nombre, matrícula y especialidad desde Configuración.
- **Clones/usuarios finales:** "Mi Cuenta" es solo lectura; esos datos se administran desde el panel admin.

---

## 7. Grabación de audio

### Grabar en vivo
1. Pulsá **🎙️ Grabar Audio**
2. Permití el acceso al micrófono cuando el navegador lo solicite
3. Dictá tu informe. El indicador muestra el tiempo de grabación
4. Pulsá **⏹️ Detener** para finalizar
5. El audio queda listo para transcribir

### Consejos para mejor calidad
- Usá un ambiente silencioso, con poca reverberación
- Hablá a ritmo constante, con buena dicción
- Mantené el micrófono a 15-20 cm de la boca
- Evitá golpes en la mesa o ruidos ambientales fuertes
- Si usás auriculares con micrófono, los resultados suelen ser mejores

---

## 8. Carga de archivos de audio

### Formatos soportados
MP3, WAV, OGG, M4A, WebM — máximo 25 MB por archivo

### Cómo cargar
- **Arrastrar y soltar:** Arrastrá uno o varios archivos a la zona punteada "Arrastra audios aquí"
- **Seleccionar:** Hacé clic en la zona de carga para abrir el explorador de archivos

### Múltiples archivos
- Cada archivo se muestra como una entrada en la lista
- **🔗 Unir todos los audios:** Combina varios archivos en una sola transcripción
- Sin unir: Cada archivo se transcribe en una pestaña separada

### Opciones de preprocesamiento
- **🔊 Normalizar:** Ajusta el volumen para audio bajo o inconsistente
- **🪄 Reducir ruido:** Filtra ruido de fondo (útil para grabaciones en consultorio)

---

## 9. Transcripción automática

1. Una vez cargado(s) el/los audio(s), pulsá **⚡ Transcribir Todo**
2. Aparece una barra de progreso con el estado de cada archivo
3. El texto transcrito aparece en el editor, en pestañas separadas por archivo

### Tecnología
La transcripción usa **Whisper** de Groq, un modelo de IA de última generación para reconocimiento de voz en español.

### Tiempo estimado
- ~10 segundos por cada minuto de audio
- Depende de la velocidad de tu conexión a internet

### Si hay errores en la transcripción
1. Revisá el texto en el editor
2. Usá el **Diccionario Médico** (📚) para corregir términos técnicos
3. Editá manualmente los errores restantes

---

## 10. Modo Normal vs Modo Pro

### Modo Normal
- Transcripción directa de audio a texto
- Plantillas básicas aplicables manualmente
- Ideal para notas rápidas o consultas simples

### Modo Pro ✨
- **Detección automática** del tipo de estudio
- **Estructuración inteligente** con IA (LLaMA 3.3-70b)
- Informes organizados en secciones por especialidad
- Conclusión generada automáticamente
- Pipeline completo: transcripción → estructura → PDF en un flujo

### Cambiar de modo
Usá el toggle **Pro/Normal** en el encabezado de la app.

> **Nota:** Según tu plan de suscripción, el Modo Pro puede no estar disponible.

---

## 11. Estructuración inteligente (Modo Pro)

### Cómo funciona
1. Tras la transcripción, la app analiza el texto y detecta el tipo de estudio
2. Selecciona automáticamente la plantilla más adecuada (ej: "Ecocardiograma transtorácico", "Colonoscopía", "Espirometría")
3. Un toast muestra: **"Plantilla detectada: [nombre]"** con opción de **Cambiar**
4. La IA estructura el texto en secciones según la plantilla:
   - Datos del paciente
   - Técnica / Preparación
   - Hallazgos por sección/órgano
   - Conclusión / Impresión diagnóstica

### Plantillas disponibles (36+)
Organizadas por especialidad:

| Especialidad | Plantillas |
|-------------|-----------|
| **Cardiología** | Ecocardiograma, ECG, Eco-stress, Holter, Cinecoronariografía, Eco Doppler vascular |
| **Gastroenterología** | Endoscopía digestiva alta, Colonoscopía, CPRE, Cápsula endoscópica |
| **Neumología** | Espirometría, Broncoscopía, Polisomnografía |
| **Diagnóstico por imagen** | Ecografía abdominal, Eco renal, Eco tiroidea, Mamografía, RMN, TC |
| **Oftalmología** | Topografía corneal, Campimetría, OCT, Fondo de ojo |
| **Ginecología** | Ecografía obstétrica, Eco ginecológica, Colposcopía, Papanicolaou |
| **Neurología** | EEG, Electromiografía, Potenciales evocados |
| **ORL** | Laringoscopía, Audiometría, Nasofibrolaringoscopía |
| **Urología** | Ecografía prostática, Cistoscopía, Urodinamia |
| **General** | Nota de evolución, Epicrisis/Resumen de internación |

### Cambiar la plantilla
- Al recibir el toast de detección, pulsá **Cambiar**
- Seleccioná manualmente desde el selector de plantillas en la barra lateral
- Re-estructurá con el botón **🤖 Estructurar con IA** o el atajo **Ctrl+Shift+R**

---

## 12. Estructuración desde texto y archivos

Además de audio, podés estructurar directamente desde texto en contexto Pro.

### Dónde está
- En el panel de entrada, cambiá la fuente a **Texto**.

### Formatos soportados para adjuntar
- **TXT**
- **DOCX**
- **PDF** (con texto seleccionable)
- **DOC** (compatibilidad extendida)

### Flujo recomendado
1. Pegá texto manual o adjuntá archivo.
2. Revisá que el contenido cargado sea correcto.
3. Pulsá **Estructurar texto**.

### Nota sobre archivos DOC
- Si un `.doc` antiguo viene dañado o con codificación extraña, la app puede pedir convertirlo a `.docx` para mejor compatibilidad.

---

## 11. Editor de informes

### Funciones del editor
- **Negrita** (Ctrl+B), **Cursiva** (Ctrl+I), **Subrayado** (Ctrl+U)
- Listas con viñetas y numeradas
- Tablas
- Encabezados (H1, H2, H3)
- Deshacer (Ctrl+Z) / Rehacer (Ctrl+Y)
- Buscar y reemplazar (🔍)

### Campos vacíos
Los campos que la IA no pudo completar aparecen como:
**[No especificado]** — resaltados en amarillo

Para completarlos:
1. Hacé clic en el botón **✏️** junto al campo
2. Se abre un modal con el nombre del campo y un input
3. Escribí el valor o pulsá **"Dejar en blanco"** para omitirlo
4. Confirmá con **✅ Guardar**

### Pestañas
Si subiste varios archivos, cada transcripción aparece en una pestaña. Podés:
- Hacer clic en una pestaña para cambiar de archivo
- Cerrar pestañas con la ✕

---

## 12. Datos del paciente

Antes de exportar, podés completar los datos del paciente:

| Campo | Ejemplo |
|-------|---------|
| Nombre completo | Juan Pérez |
| DNI | 30.456.789 |
| Edad | 54 años |
| Sexo | Masculino |
| Obra social | OSDE |
| Nº de afiliado | 12345678 |
| Teléfono | (011) 4567-8901 |
| Fecha de nacimiento | 1971-05-15 |

Los datos se extraen automáticamente del texto transcrito cuando es posible.

---

## 13. Registro de pacientes

La app mantiene un registro local de pacientes para autocompletado rápido.

### Acceder al registro
Hacé clic en el botón **📋 Registro de Pacientes** en la barra lateral.

### Funciones
- **Buscar:** Por nombre, DNI o cualquier dato
- **Ver:** Tabla con todos los pacientes guardados
- **Editar:** Modificar datos de un paciente existente
- **Eliminar:** Con confirmación
- **Exportar:** Descargar como JSON o CSV
- **Importar:** Cargar un archivo JSON con registros previos

### Autocompletado
Al escribir el nombre o DNI de un paciente en el formulario, la app sugiere coincidencias del registro.

---

## 14. Configuración de impresión

Abrí el modal con el botón **🖨️ Configurar Impresión** en la barra de herramientas.

### Secciones configurables

#### Datos del profesional
- Nombre completo
- Matrícula profesional
- Especialidad(es)

#### Lugar de trabajo
- Nombre de la institución
- Dirección
- Teléfono
- Email
- Logo (imagen PNG)

#### Datos del estudio
- Tipo de estudio
- Fecha y hora
- Motivo de consulta
- Médico derivante
- Equipo utilizado
- Técnica empleada

#### Opciones del documento
- Tamaño de página (A4, Carta, Legal, Oficio)
- Orientación (Vertical / Horizontal)
- Márgenes (Normal / Estrecho / Amplio)
- Fuente y tamaño
- Interlineado

#### Encabezado y pie
- Mostrar/ocultar encabezado, pie, número de página, fecha
- Texto personalizado de pie de página
- QR de verificación (opcional)

#### Firma
- Línea de firma (Sí/No)
- Nombre debajo de firma
- Matrícula debajo de firma
- Firma digital (imagen PNG con fondo transparente)

### Semáforo de completitud
El botón de configuración muestra un indicador de color:
- 🟢 **Verde:** Configuración completa
- 🟡 **Amarillo:** Faltan algunos datos (el PDF sale pero incompleto)
- 🔴 **Rojo:** Faltan datos críticos (nombre/matrícula). Al intentar descargar PDF, se abre el configurador automáticamente

---

## 15. Perfiles de salida

Podés guardar múltiples configuraciones como perfiles (ej: un perfil por consultorio).

### Crear un perfil
1. Configurá todos los datos en el modal de impresión
2. Pulsá **💾 Guardar** en la barra de perfiles
3. Escribí un nombre (ej: "Clínica San Martín") y confirmá

### Gestionar perfiles
- **🔄 Actualizar:** Sobrescribe el perfil seleccionado con la config actual
- **⭐ Predeterminado:** Marca un perfil como el que carga automáticamente
- **🗑️ Eliminar:** Borra el perfil seleccionado

### Selector rápido
En la barra de herramientas aparece un selector rápido de perfil. Cambiá de perfil sin abrir el modal completo.

---

## 16. Exportación de informes

### Botón de descarga
El botón de descarga tiene dos partes:
- **Botón principal:** Descarga en el formato favorito (1 clic)
- **Chevron (▾):** Abre el menú con todos los formatos

### Formatos disponibles

| Formato | Descripción |
|---------|-------------|
| **📄 PDF Profesional** | Con encabezado, logo, firma, datos del paciente. Ideal para entregar al paciente o archivar |
| **📝 Word (RTF)** | Compatible con Microsoft Word, LibreOffice, Google Docs |
| **🗒️ Texto Simple** | Archivo .txt plano, sin formato |
| **🌐 HTML** | Página web con formato, abrible en cualquier navegador |

### Formato favorito
Hacé clic en la ⭐ junto a un formato en el menú para marcarlo como favorito. El botón principal siempre descargará ese formato.

### Validación antes de PDF
Si tu configuración profesional está incompleta, la app te avisa antes de generar el PDF y te guía para completar los datos faltantes.

---

## 17. Vista previa de impresión

Pulsá **👁️ Previsualizar** para ver cómo quedará el informe impreso.

- Muestra una vista A4 con encabezado, cuerpo y pie de página
- Desde la vista previa podés **imprimir directamente** (Ctrl+P)
- Es útil para verificar el formato antes de descargar

---

## 18. Diccionario médico

El botón **📚 Diccionario Médico** abre un panel con correcciones sugeridas para términos técnicos mal transcritos.

### Cómo usarlo
1. Transcribí tu audio normalmente
2. Pulsá **📚** en la barra de herramientas
3. La app analiza el texto y sugiere correcciones (ej: "ipertrofia" → "hipertrofia")
4. Seleccioná las correcciones que querés aplicar
5. Pulsá **✅ Aplicar seleccionadas**

---

## 19. Atajos de teclado

| Atajo | Acción |
|-------|--------|
| **Ctrl+Shift+R** | Re-estructurar con IA |
| **Ctrl+Shift+S** | Guardar configuración de impresión |
| **Ctrl+Shift+P** | Previsualizar informe |
| **Ctrl+Shift+D** | Descargar en formato favorito |
| **Ctrl+B** | Negrita |
| **Ctrl+I** | Cursiva |
| **Ctrl+U** | Subrayado |
| **Ctrl+Z** | Deshacer |
| **Ctrl+Y** | Rehacer |
| **Esc** | Cerrar modal / tour |

---

## 20. Guardado automático

La app guarda automáticamente el contenido del editor cada **30 segundos** en el almacenamiento local del navegador.

### Restauración
- Si cerrás y reabrís la app, se restaura tu última sesión automáticamente
- Aparece un toast: **"♻️ Sesión anterior restaurada (hace X min)"**
- La restauración funciona hasta **2 horas** después de la última edición

### Limpieza
- El auto-guardado se borra al pulsar **🗑️ Limpiar** (botón de reset)
- También se borra automáticamente si tiene más de 2 horas

---

## 21. Apariencia y personalización

### Modo oscuro / claro
Pulsá el botón **🌙/☀️** en el encabezado para alternar entre tema claro y oscuro. La preferencia se guarda y persiste entre sesiones. Todos los elementos de la interfaz se adaptan al tema seleccionado.

### Skins (temas visuales)
Además del modo claro/oscuro, la app ofrece **skins completos** que cambian toda la estética visual.

#### Cómo cambiar el skin
1. Abrí **⚙️ Configuración** (ícono de engranaje)
2. Desplegá el acordeón **🎭 Skins**
3. Hacé clic en la tarjeta del skin que querés aplicar
4. El cambio es inmediato y se guarda automáticamente

#### Skins incluidos

| Skin | Descripción |
|------|-------------|
| **🎨 Por Defecto** | Tema original de la aplicación, equilibrado y profesional |
| **🌃 Cyberpunk Neon** | Glassmorphism oscuro con acentos neón azul, ideal para entornos con poca luz |
| **☀️ Light Minimal** | Limpio, luminoso y minimalista, con acento azul |

#### Más skins
Pulsá el botón **🛒 Más skins y complementos** debajo de la galería para ver opciones adicionales disponibles según tu plan.

### Color corporativo
En **⚙️ Configuración** → **🎨 Apariencia**, podés personalizar el color de acento de la app con el **selector de color corporativo**. Esto cambia el color primario de botones, bordes y elementos destacados para que coincida con la identidad visual de tu institución.

---

## 22. Asistente de sesión

El **Asistente de sesión** aparece al iniciar una nueva sesión de trabajo y te ayuda a configurar rápidamente el contexto.

### Qué pregunta el asistente
1. **Lugar de trabajo:** Si tenés más de un consultorio configurado, seleccioná dónde estás trabajando
2. **Profesional:** Si el lugar tiene más de un médico registrado, elegí quién dictará
3. **Plantilla:** (Opcional) Preseleccioná la plantilla del estudio. Si no la elegís, se detecta automáticamente al transcribir

### Cuándo aparece
- Al abrir la app por primera vez en la sesión
- Al pulsar el botón de **nueva sesión**
- Si cambiaste de lugar de trabajo o profesional

### Beneficio
Configura automáticamente los datos del profesional, logo, firma y perfil de salida según el lugar y el profesional seleccionados. Esto evita tener que cambiar manualmente la configuración de impresión.

---

## 23. Historial de informes

La app mantiene un historial de los informes generados para referencia rápida.

### Acceder al historial
Pulsá el botón **🕒 Historial** en la barra lateral o desde el menú.

### Funciones
- **Lista de informes:** Muestra los últimos informes generados con fecha, tipo de estudio y paciente
- **Buscar:** Filtrá por nombre de paciente, tipo de estudio o fecha
- **Re-abrir:** Hacé clic en un informe del historial para cargarlo en el editor
- **Re-exportar:** Volvé a generar el PDF o cualquier formato de salida

### Almacenamiento
Los informes se guardan en el almacenamiento local del navegador (localStorage / IndexedDB). Se recomienda exportar periódicamente como respaldo.

---

## 24. Versionado y snapshots

El editor guarda automáticamente **versiones (snapshots)** de tu informe a medida que trabajás.

### Cuándo se crean versiones
- Automáticamente antes de cada cambio estructural importante
- Antes de re-estructurar con IA
- Antes de aplicar correcciones del diccionario
- Manualmente al pulsar el botón de guardado

### Panel de versiones
1. Pulsá el botón **🕒** en la barra del editor
2. Se abre un panel lateral con la lista de versiones
3. Cada versión muestra fecha, hora y tipo de cambio
4. Hacé clic en una versión para **previsualizarla**
5. Pulsá **↩️ Restaurar** para volver a esa versión

### Límites
- Se guardan hasta **20 versiones** por sesión
- Las versiones se limpian al iniciar una nueva sesión o al pulsar **🗑️ Limpiar**

---

## 25. Solución de problemas (FAQ)

### "No se escucha la grabación" / El audio grabado está en silencio
- Verificá que el micrófono esté seleccionado correctamente en la configuración del navegador
- Revisá que el navegador tiene permiso para acceder al micrófono (ícono 🔒 en la barra de direcciones)
- Probá con otro micrófono o auriculares con mic

### "La transcripción es muy incorrecta"
- Asegurate de dictar en un ambiente silencioso
- Hablá más despacio y articulando claramente
- Si el audio es largo, probá dividirlo en segmentos más cortos
- Usá el Diccionario Médico (📚) para correcciones automáticas

### "La plantilla detectada no es la correcta"
- Pulsá **Cambiar** en el toast de detección
- Seleccioná manualmente la plantilla correcta desde el selector
- Volvé a estructurar con **Ctrl+Shift+R**

### "El PDF no muestra el logo o la firma"
- Abrí **🖨️ Configurar Impresión**
- Subí tu logo como imagen PNG
- Subí tu firma como PNG con fondo transparente
- Pulsá **💾 Guardar configuración**
- Previsualizá de nuevo

### "La app no funciona sin internet"
- La transcripción y la estructuración **requieren** internet (usan IA en la nube)
- El editor, la configuración y la exportación a PDF sí funcionan offline
- Instalá la app como PWA para mejor experiencia offline

### "¿Cómo cambio mis datos profesionales?"
- Abrí **🖨️ Configurar Impresión** → sección "Datos del Profesional"
- Si tu cuenta fue configurada por un administrador, algunos campos pueden estar bloqueados
- Contactá a tu administrador para modificar datos bloqueados

### "¿Dónde se guardan mis datos?"
- Todo se guarda en el **localStorage** de tu navegador
- Datos almacenados: configuración, perfiles de salida, registro de pacientes, auto-guardado del editor
- **No se guardan datos en servidores externos** (excepto el audio momentáneamente para transcripción)
- Si borrás los datos del navegador, se pierden

### "¿Puedo usar en celular / tablet?"
- Sí, la app es responsive y funciona en dispositivos móviles
- Instalala como PWA para mejor experiencia
- En iOS, usá Safari → Compartir → "Agregar a pantalla de inicio"

### "¿Cuántas plantillas hay?"
- 36+ plantillas organizadas por especialidad médica
- Se actualizan automáticamente con cada versión de la app
- Para solicitar nuevas plantillas, usá el botón **Contacto**

### "¿Puedo trabajar con múltiples consultorios?"
- Sí, creá múltiples **Perfiles de salida** (uno por consultorio)
- Cada perfil guarda logo, datos, firma, formato de página diferente
- Cambiá entre perfiles con el selector rápido en la barra de herramientas

### "La app se ve rara / los colores están mal"
- Probá cambiar entre modo claro y oscuro (botón 🌙/☀️)
- Si tenés un skin aplicado, probá volver a **Por Defecto** en ⚙️ Configuración → 🎭 Skins
- Limpiá la caché del navegador: Ctrl+Shift+Delete → Imágenes y archivos en caché
- Cerrá y reabrí la app, o usá `?purge` al final de la URL

### "¿Es seguro para datos de pacientes?"
- Los datos se procesan **localmente** en tu navegador
- El audio se envía a Groq para transcripción y **se descarta inmediatamente**
- Ningún dato de pacientes se almacena en servidores externos
- Es tu responsabilidad profesional la custodia de los datos según las regulaciones locales

---

## 26. Contacto y soporte

### Botón de contacto
Pulsá el botón **✉️ Contacto** en el encabezado (o desde **❓ Ayuda** → **Contactar soporte**).

### Formulario
1. Seleccioná el **motivo** de tu consulta:
   - Problema con la API
   - Consulta general
   - Sugerencia de mejora
   - Otro
2. Describí tu consulta en el **campo de detalle**
3. Pulsá **Enviar**

El mensaje se envía por email al equipo de soporte.

### Diagnóstico remoto
Si el equipo de soporte lo solicita, podés enviar un **diagnóstico técnico** con el botón 📡 en el encabezado. Esto incluye información técnica de tu navegador y configuración (sin datos de pacientes).

---

## 27. Privacidad y seguridad

| Aspecto | Detalle |
|---------|---------|
| **Almacenamiento de datos** | Todo en localStorage del navegador (local, en tu dispositivo) |
| **Audio enviado a la nube** | Solo para transcripción, se descarta inmediatamente (no se almacena) |
| **Datos del paciente** | Nunca se transmiten a servidores. Solo viven en tu navegador |
| **Conexión** | HTTPS cifrado para todas las comunicaciones |
| **Contraseñas** | No se almacenan contraseñas de pacientes |
| **Respaldo** | Exportá tu registro de pacientes periódicamente como JSON |
| **Borrado** | Podés borrar todos los datos desde el botón de reset (admin) o limpiando localStorage |

---

*Documento generado el 28/02/2026. Para distribución a usuarios finales de Transcriptor Médico Pro.*
