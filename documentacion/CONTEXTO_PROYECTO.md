# Contexto del Proyecto: Transcriptor Médico IA (Offline)

**ESTE ARCHIVO SIRVE COMO CONTEXTO PARA CUALQUIER AGENTE O MODELO DE IA QUE TRABAJE EN ESTE PROYECTO.**

## 🎯 Objetivo Principal
Desarrollar una aplicación web gratuita, privada y offline para transcribir informes médicos a partir de audios (MP3, OGG, WAV, etc.) con alta precisión, sin depender de servidores o APIs en la nube.

## 🛠 Estado Actual (Versión 3.0) - ACTUALIZADO
El proyecto es una *Single Page Application* (SPA) pura contenida en `index.html`.

- **Stack Tecnológico:** HTML5, CSS3 Moderno, JavaScript Vanilla.
- **Librería Core:** [Transformers.js](https://huggingface.co/docs/transformers.js) para inferencia de ML en el navegador.
- **Librerías Auxiliares:** `docx` (para exportar Word).

### Configuración Actual de IA
- **Modelo Instalado:** `Xenova/whisper-small` ✅
- **Tamaño:** ~150MB (se cachea localmente tras la primera descarga)
- **Optimizaciones:** 
  - Idioma forzado a 'es' (español)
  - Chunk length: 30s con stride: 5s para mejor contexto
  - Sin timestamps para transcripción más fluida
- **Resultado:** Alta precisión en español con terminología médica

## 🚀 Características Actuales
1. ✅ **Alta Precisión:** Modelo Whisper Small optimizado para español médico
2. ✅ **100% Offline:** Funciona completamente en el navegador tras la primera carga
3. ✅ **Privacidad Total:** No se envía ningún dato a servidores externos
4. ✅ **Múltiples formatos:** Soporta MP3, WAV, OGG, M4A, WebM, FLAC, AAC, WMA, Opus
5. ✅ **Exportación:** Descarga como Word (.docx) o impresión directa
6. ✅ **Editor integrado:** Edición con formato (negrita, cursiva, subrayado)
7. ✅ **Interfaz moderna:** Diseño profesional con drag & drop

## 📝 Historial de Cambios
**Versión 3.0 (Febrero 2026):**
- ⬆️ Actualizado a modelo Whisper Small para mejor precisión
- 🎯 Optimizaciones específicas para español médico
- 🗑️ Eliminado archivo duplicado transcriptor-medico.html
- 📊 Mejor configuración de chunks y stride para contexto continuo

**Versión 2.0:**
- Se agregó soporte para archivos OGG.
- Se implementó un botón de "Limpiar / Nuevo Informe".
- Se agregó persistencia (`localStorage`) para no mostrar el aviso de descarga del modelo tras el primer uso.

## 🧹 Limpieza del Repositorio (PR #10 - Feb 2026)

### Cambios Realizados
- ✅ **Bug Fix:** Agregado elemento `tabsContainer` faltante
- ✅ **Bug Fix:** Agregado elemento `toast` con `toastMessage` faltante
- ✅ **Bug Fix:** Corregida función `showPdfControls()` para mostrar botones PDF
- 🗑️ **Limpieza:** Eliminadas carpetas `recursos/`, `generar_apps/`, `dist/` (contenían archivos de prueba y código muerto)
- 📚 **Documentación:** README actualizado con estructura clara

### Estructura Final del Proyecto
```
transcripcion/
├── index.html          # ✅ Aplicación principal (CORREGIDA)
├── backend/            # ✅ Scripts de backend (Google Apps Script)
└── documentacion/      # ✅ Documentación del proyecto
```

### ¿Por qué se eliminaron esos archivos?
- `recursos/`: Contenía backups, tests y código experimental no usado
- `generar_apps/`: Scripts Python para generar versiones personalizadas (no usado en GitHub Pages)
- `dist/`: Directorio vacío

### Resultado
- ✅ Repositorio limpio y organizado
- ✅ Todos los bugs críticos corregidos
- ✅ Descargable como ZIP funcional para trabajar en local
- ✅ Código mantenible y documentado
