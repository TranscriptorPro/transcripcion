# ⚡ Guía Rápida — Transcriptor Médico Pro

> Todo lo que necesitás saber para empezar a generar informes médicos en 5 minutos.

---

## 📋 Índice rápido

1. [Primer inicio](#1-primer-inicio)
2. [Grabar o subir audio](#2-grabar-o-subir-audio)
3. [Transcribir](#3-transcribir)
4. [Estructurar el informe](#4-estructurar-el-informe)
5. [Editar campos](#5-editar-campos)
6. [Cargar datos del paciente](#6-cargar-datos-del-paciente)
7. [Exportar (PDF, Word, etc.)](#7-exportar)
8. [Configurar el PDF](#8-configurar-el-pdf)
9. [Atajos útiles](#9-atajos-útiles)
10. [Tips y mejores prácticas](#10-tips-y-mejores-prácticas)

---

## 1. Primer inicio

Al abrir la app por primera vez:

1. **Bienvenida** → Leé la presentación
2. **Datos profesionales** → Completá tu nombre, matrícula y especialidad
3. **API Key** → Pegá tu clave de Groq (obtenela gratis en [console.groq.com/keys](https://console.groq.com/keys))
4. **Configuración PDF** → Elegí el color del encabezado, subí tu logo y firma
5. **Aceptar términos** → ¡Listo!

Después, el **Asistente de sesión** te permite elegir tu lugar de trabajo y plantilla por defecto.

---

## 2. Grabar o subir audio

### Opción A: Grabar en vivo
- Clic en **🎙️ Grabar** → Dictá tu informe → Clic en **⏹ Detener**

### Opción B: Subir archivos
- Arrastrá archivos de audio a la zona de arrastre (MP3, WAV, OGG, M4A — máx 25 MB)
- Podés subir varios archivos a la vez

### Opción C: Texto directo (solo PRO)
- Pegá texto de otro sistema y hacé clic en **Estructurar texto**

---

## 3. Transcribir

1. Clic en **📥 Transcribir**
2. Esperá a que la barra de progreso llegue al 100%
3. El texto aparece en el editor

> 💡 Si falla: verificá tu API Key en ⚙️ Configuración → API Key → 🔌 Probar

---

## 4. Estructurar el informe

### Modo PRO (automático)
- La app detecta el tipo de estudio y estructura automáticamente
- Si la detección es incorrecta, usá **🔄 Cambiar plantilla**

### Modo Normal (manual)
1. Elegí la plantilla del dropdown **📋 Plantilla**
2. Clic en **Aplicar estructura**

Resultado: el texto libre se convierte en secciones formales (HALLAZGOS, MEDICIONES, CONCLUSIÓN, etc.)

---

## 5. Editar campos

Después de estructurar, **cada campo es clickeable**:

- **Clic** en cualquier campo → Se abre el editor del campo
- **Botones rápidos**: `s/p`, `Sin particularidades`, `No evaluado`
- **Chips contextuales**: Sugerencias específicas según el tipo de campo
- **Dejar en blanco**: Vacía el campo
- **Eliminar sección**: Remueve el campo completo

> 💡 En **Modo PRO**, también podés dictar con micrófono dentro de cada campo.

---

## 6. Cargar datos del paciente

Clic en **🖨️ Configurar informe** (o el panel lateral):

| Campo | Tip |
|-------|-----|
| **Nombre** | Escribí 2+ letras → se sugieren pacientes del registro |
| **DNI, Edad, Sexo** | Se auto-completan si elegís un paciente del registro |
| **Médico solicitante** | Con autocompletado del historial |
| **Motivo** | Con autocompletado del historial |

---

## 7. Exportar

### Descargar
Clic en **📥 Descargar** → Elegí formato:
- **PDF** — Con encabezado, firma, QR, número de informe (todos los planes)
- **RTF** — Compatible con Word (PRO/CLINIC)
- **HTML** — Código web (PRO/CLINIC)
- **TXT** — Texto plano (todos los planes)

### Enviar por email (PRO/CLINIC)
Clic en **📧 Enviar por email** → Ingresá el destinatario → Enviar

### Vista previa
Clic en **👁️ Vista previa** para ver exactamente cómo queda el PDF antes de descargarlo.

> 💡 Marcá un formato como favorito (⭐) para que el botón Descargar lo use directamente.

---

## 8. Configurar el PDF

**⚙️ Configuración → Configurar informes PDF** o **🖨️ Configurar informe**:

| Pestaña | Qué configurar |
|---------|---------------|
| **Encabezado** | Datos profesional, lugar de trabajo, logos |
| **Formato** | Color, papel, márgenes, fuente, QR, número de informe |
| **Firma** | Firma digital, nombre bajo firma, texto de pie |

---

## 9. Atajos útiles

| Atajo | Acción |
|-------|--------|
| `Ctrl+B` | Negrita |
| `Ctrl+I` | Cursiva |
| `Ctrl+U` | Subrayado |
| `Ctrl+Z` | Deshacer |
| `Ctrl+F` | Buscar y reemplazar |
| `Ctrl+S` | Guardar |
| `Ctrl+P` | Imprimir |
| `Esc` | Cerrar modal actual |

---

## 10. Tips y mejores prácticas

### 🎙️ Para mejor transcripción
- Hablá claro y a ritmo constante
- Evitá ruido de fondo excesivo
- Usá la opción "Reducir ruido" si el ambiente no es ideal
- Archivos de hasta 25 MB; si son más largos, cortá en partes

### 📝 Para informes eficientes
- **Dictá la conclusión**: mencioná explícitamente "conclusión: ..." en el dictado
- **No te preocupes por el orden**: la IA reordena automáticamente
- **Usá el diccionario**: definí reemplazos para abreviaturas frecuentes
- **Verificá con Medical Check** (🩺): detecta campos vacíos antes de exportar

### 💾 Para no perder datos
- Exportá un backup periódicamente: ⚙️ → Backup y datos → Exportar
- El autoguardado funciona cada 30 segundos
- Si cerrás el navegador por error: al reabrir aparece ♻️ Restaurar sesión

### 📱 Para uso móvil
- Instalá la app como PWA para acceso rápido
- En Android: Chrome → menú ⋮ → Instalar aplicación
- En iOS: Safari → Compartir → Agregar a pantalla de inicio

---

## 🆘 ¿Problemas?

| Problema | Solución |
|----------|----------|
| Transcripción falla | Verificá API Key: ⚙️ → API Key → 🔌 Probar |
| El micrófono no funciona | Comprobá permisos del navegador |
| App desactualizada | ⚙️ → Actualizar App → Forzar actualización |
| Límite de dispositivos | Contactá soporte: 📧 Contacto |

Para ayuda completa: **❓ Ayuda** (en el encabezado de la app) o consultá el **Manual Profesional Completo**.

---

*Transcriptor Médico Pro — Generá informes profesionales sin escribir ni una línea.*
