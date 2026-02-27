# Transcriptor Médico Pro — Hoja de Ruta
> Actualizado: 27 de febrero de 2026 (commit 7cc140e)  
> Documento de planificación interna. No subir como parte del deploy.

---

## ✅ LO QUE YA ESTÁ HECHO

### Base de la aplicación
| Bloque | Descripción |
|--------|-------------|
| Core de grabación y transcripción | Audio en vivo + subida de archivo → Whisper Groq |
| Editor WYSIWYG | Negrita, cursiva, listas, tablas, edición inline con undo/redo |
| Exportación PDF | jsPDF con encabezado profesional, firma, QR, perfiles de consultorio, color de acento |
| Exportación Word | .docx desde el editor |
| Modo Normal / Modo Pro | Control según `CLIENT_CONFIG.type` |
| 37+ plantillas médicas | Estructuración automática por especialidad (LLaMA 3.3-70b) |
| Detección automática de plantilla | `autoDetectTemplateKey` con scoring y proximidad |
| Vista previa tipo A4 | Preview HTML multipágina con imprimir y email |
| Perfiles de salida | CRUD de perfiles nombrados (lugar + profesional + formato) |

### Features F1 — Todas completadas ✅
| ID | Descripción | Estado |
|----|-------------|--------|
| F1-A1+A2 | Formato por órgano con s/p + conclusión solo positivos | ✅ |
| F1-B1 | Ocultar tab Grabar en modal edición (Modo Normal) | ✅ |
| F1-B2 | Tab Grabar con candado 🔒 en Modo Normal | ✅ |
| F1-C1 | Nombre del campo en título del modal de edición | ✅ |
| F1-C2 | Botón "Dejar en blanco" + "Eliminar campo" en modal | ✅ |
| F1-D1 | Nueva plantilla: Ecocardiograma transtorácico (ETT) | ✅ |
| F1-D2 | Nueva plantilla: Eco Doppler vascular | ✅ |
| F1-D3 | Nueva plantilla: Nota de evolución (SOAP) | ✅ |
| F1-D4 | Nueva plantilla: Epicrisis / Resumen de internación | ✅ |
| F1-E1 | Toast con plantilla detectada + opción "Cambiar" (auto-confirma 5s) | ✅ |
| F1-G1 | Panel de gestión del registro de pacientes (tabla, editar, borrar, export/import) | ✅ |
| F1-G2 | Unificación patientHistory → patientRegistry (bridge + migración automática) | ✅ |
| F1-K1 | Flujo de primer uso: bienvenida + T&C + datos precargados por admin | ✅ |
| F1-K2 | UI separada admin vs cliente (sección API key oculta para clientes) | ✅ |
| F1-K3 | Botón "Contacto" con modal (motivo + detalle + mailto) — solo visible para clientes | ✅ |
| F1-PWA1 | manifest.json con shortcuts | ✅ |
| F1-PWA2 | Service Worker cache-first (~35 recursos) + network-first para API Groq | ✅ |
| F1-PWA3 | Botón de instalación (beforeinstallprompt) | ✅ |
| F1-PWA4 | Íconos PWA 192×192 y 512×512 | ✅ |

### Backend + Infraestructura — Completado ✅

**URL unificada (deploy v5 — 2026-02-26):**
```
https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec
```

✅ URL única en todos los archivos · ✅ ADMIN_KEY en Script Properties (no hardcodeada) · ✅ Sesiones SHA-256 con expiración 8h

| Endpoint | Método | Estado | Descripción |
|----------|--------|--------|-------------|
| `validate` | GET | ✅ | Valida usuario + deviceId, registra dispositivo, enforces device limit |
| `admin_login` | GET | ✅ | Login admin con hoja Admin_Users separada, devuelve session token |
| `admin_list_users` | GET | ✅ | Lista usuarios (autenticado) |
| `admin_create_user` | GET | ✅ | Crea usuario nuevo con ID auto-generado |
| `admin_update_user` | GET+POST | ✅ | Actualiza campos (ambos métodos soportados) |
| `admin_get_logs` | GET | ✅ | Logs reales desde hoja Admin_Logs |
| `admin_get_metrics` | GET | ✅ | Métricas por usuario desde hoja Metricas_Uso |
| `admin_get_global_stats` | GET | ✅ | Stats globales (total usuarios, usos, planes, etc.) |
| `admin_request_diagnostic` | GET | ✅ | Solicita diagnóstico remoto a un cliente |
| `admin_get_diagnostic` | GET | ✅ | Recupera diagnóstico enviado por cliente |
| `admin_generate_config` | GET | ✅ | Genera CLIENT_CONFIG para clon de app cliente |
| `update_usage` | POST | ✅ | Incrementa uso + registra en Metricas_Uso |
| `save_diagnostic` | POST | ✅ | Cliente guarda su diagnóstico |
| `send_email` | POST | ✅ | Envío de contacto/soporte |

**6 Hojas en Google Sheets:**
Usuarios · Metricas_Uso · Dispositivos · Admin_Logs · Diagnosticos · Admin_Users

**Bugs B1-B7 — Todos resueltos:**

| Bug | Descripción | Resolución |
|-----|-------------|------------|
| B1 | `admin_login` no existía | ✅ Endpoint creado + hoja Admin_Users con auto-creación |
| B2 | `admin_create_user` no existía | ✅ Endpoint creado con ID auto-generado |
| B3 | `admin_update_user` solo POST, llamado como GET | ✅ Soporta ambos métodos |
| B4 | Dos URLs distintas en archivos | ✅ URL v5 unificada en los 9 archivos |
| B5 | `adminKey` hardcodeada | ✅ ADMIN_KEY en Script Properties, ingresada por admin en browser |
| B6 | Columnas no documentadas | ✅ GOOGLE_SHEET_SETUP.md actualizado |
| B7 | App no valida licencia | ✅ licenseManager.js creado (validate + usage + device_id) |

### Diccionario Médico + Terminología — Completado ✅

| Componente | Descripción |
|------------|-------------|
| medDictionary.js | 200+ correcciones Whisper ASR organizadas por especialidad + scan IA con Groq |
| studyTerminology.js | Metadatos de 54 estudios médicos (keywords, abreviaturas, clasificaciones, unidades, templateKeys) |

### Módulos auxiliares implementados

| Módulo | Propósito |
|--------|-----------|
| sessionAssistant.js | Asistente de inicio: elige profesional/lugar/plantilla según tipo de licencia |
| business.js | Gestión de perfiles de trabajo (CRUD), onboarding espectacular, punto de entrada principal |
| settingsPanel.js | **NUEVO** — Mega panel de configuración con 11 secciones en acordeón |
| diagnostic.js | Diagnóstico remoto del cliente enviado al backend |
| userGuide.js | Tour interactivo de 6 pasos + modal de ayuda con pestañas |
| licenseManager.js | Validación de licencia al iniciar, flush métricas cada 15min, sendBeacon on unload |
| contact.js | Modal de contacto con motivo + detalle + mailto (visible solo para clientes) |
| patientRegistry.js | CRUD de pacientes (hasta 500) + panel admin con tabla, búsqueda, export/import |
| outputProfiles.js | CRUD de perfiles de salida (lugar + profesional + formato PDF) |
| pdfPreview.js | Vista previa tipo A4 multipágina con QR, imprimir, email |

### UX y Personalización — Completado ✅ (commit 7cc140e)

| Componente | Descripción |
|------------|-------------|
| Onboarding espectacular | Multi-step (3 pasos): bienvenida con partículas + confirmar datos + T&C con confetti 🎉 |
| Settings Panel (⚙️) | 11 acordeones: Cuenta, API Key, Lugar, Perfiles rápidos, PDF, Editor, Herramientas, Apariencia, Estadísticas, Backup, Info |
| PRO slider oculto | GIFT/Clinic/Enterprise siempre en modo PRO — toggle oculto automáticamente |
| Admin button oculto | Botón "Panel de Administración" oculto para todos los clones |
| Settings gear (⚙️) | Visible para admin Y clientes — abre el mega panel de configuración |
| Auto-guardado | Borrador del editor guardado cada 30s en localStorage (recuperable < 24h) |
| Quick profiles | Perfiles rápidos: guardar/cargar/eliminar combinaciones de lugar + profesional |
| Backup/Restore | Export/import JSON de toda la configuración local |
| Estadísticas | Informes generados, transcripciones, pacientes, entradas diccionario |
| Editor prefs | Tamaño de fuente (S/M/L), autosave, historial de cambios |

### Fábrica de Clones — Completado ✅

| Componente | Descripción |
|------------|-------------|
| config.js | Carga dinámica: localStorage `client_config_stored` → URL `?id=MED001` → ADMIN default |
| business.js | `_handleFactorySetup()`: fetch al backend, mapea plan, guarda config, inicia flujo cliente |
| admin.html (modal) | Campo API Key, botón "Generar Link", copiar, compartir por WhatsApp/Email |
| Google Sheet | Nueva columna `API_Key` para asignar clave Groq por usuario |

**Flujo:** Admin crea usuario → 📦 Generar Link → comparte por WhatsApp/Email → Doctor abre link → app se configura automáticamente → onboarding → instalar PWA

---

## 🗺️ LO QUE FALTA — ETAPAS PENDIENTES

---

### ETAPA 4 — Historial de informes por paciente ⬅️ SIGUIENTE

**Estado:** ❌ No implementado

**Qué falta:**  
El `patientRegistry` guarda datos del paciente (nombre, DNI, obra social, visitas) pero **no guarda los informes generados**. Si el médico quiere ver el informe de la semana pasada, no puede.

**Decisiones tomadas:**
- Sin límite de informes por paciente (hasta que se llene localStorage ~5MB)
- Solo lectura + re-exportar a PDF (no editable)
- Con export/import JSON como backup

**Implementación planificada:**
- Nuevo módulo `reportHistory.js`
- Guardar en localStorage: HTML del informe + fecha + tipo de estudio + datos del paciente
- Acceder desde el panel del registro de pacientes
- "Ver informe" → abre en modo lectura con botón re-exportar PDF
- Export/import JSON del historial completo

---

### ETAPA 5 — Autocompletado de campos con valores frecuentes

**Estado:** ❌ No implementado

**Qué es:**  
Cuando hay un campo `[No especificado]` y el médico lo abre, mostrar chips con valores habituales según el campo.

**Ejemplo:**
- Campo "Preparación" → chips: "Ayuno de 8hs", "Sin preparación especial"
- Campo "Acceso" → chips: "Oral", "Nasal", "Transanal"
- Campo "Sexo" → chips: "Masculino", "Femenino"

**Decisiones pendientes:**
- ¿Valores fijos por campo o aprendidos del uso?
- ¿Chips dentro del modal de edición o desplegable bajo el input?

---

### ETAPA 6 — Mejoras visuales del PDF (parcialmente hecho)

**Lo que ya está:**
- ✅ Encabezado profesional con logo, nombre, especialidad, institución, matrícula, color de acento
- ✅ Datos del paciente en tabla
- ✅ Firma/sello con imagen
- ✅ Pie de página configurable con fecha y paginación
- ✅ QR en vista previa HTML
- ✅ Márgenes, fuente, tamaño configurables

**Lo que falta:**
- ❌ Estilo s/p en gris/discreto en el PDF descargado (solo aparece como texto normal)
- ❌ QR en el PDF jsPDF descargado (solo está en la vista previa HTML)

---

### ETAPA 7 — Internacionalización / idioma del informe

**Estado:** ❌ No implementado · Baja prioridad

Toda la UI está en español. Agregar selector de idioma (español, inglés, portugués) para el informe generado.

---

### ETAPA 8 — Versionado del informe en el editor

**Estado:** ❌ No implementado · Prioridad media

Solo existe undo/redo en memoria (max 50 estados, se pierde al recargar).  
Propuesta: guardar snapshots automáticos (texto crudo → estructurado → editado) con navegación temporal.

---

## 📊 RESUMEN DE PROGRESO

```
Completado:  Features F1 (21/21) + Backend (14 endpoints) + Diccionario (54 estudios)
             + Bugs (7/7) + UX/Settings (10 componentes) + SW v26
Pendiente:   Etapa 4 (historial informes) · Etapa 5 (autocompletado) · Etapa 6 (2 items PDF)
             · Etapa 7 (i18n) · Etapa 8 (versionado)
Próximo:     Etapa 4 — Historial de informes por paciente
Tests:       287/287 pasando
Último push: 7cc140e — 2026-02-27
```
