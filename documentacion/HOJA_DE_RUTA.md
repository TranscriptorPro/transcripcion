# Transcriptor Médico Pro — Hoja de Ruta
> Actualizado: 23 de febrero de 2026  
> Documento de planificación interna. No subir como parte del deploy.

---

## ✅ LO QUE YA ESTÁ HECHO

### Base de la aplicación
| Bloque | Descripción |
|--------|-------------|
| Core de grabación y transcripción | Audio en vivo + subida de archivo → Whisper Groq |
| Editor WYSIWYG | Negrita, cursiva, listas, tablas, edición inline |
| Exportación PDF | jsPDF con encabezado, firma, QR, perfiles de consultorio |
| Exportación Word | .docx desde el editor |
| Modo Normal / Modo Pro | Control según `CLIENT_CONFIG.type` |
| 32+ plantillas médicas | Estructuración automática por especialidad (LLaMA 3.3-70b) |
| Detección automática de plantilla | `autoDetectTemplateKey` con scoring y proximidad |

### Mejoras del sprint actual (F1-*)
| ID | Descripción | Estado |
|----|-------------|--------|
| F1-A1+A2 | Formato por órgano con s/p + conclusión solo positivos | ✅ Hecho |
| F1-B1 | Ocultar tab Grabar en modal edición (Modo Normal) | ✅ Hecho |
| F1-B2 | Tab Grabar con candado 🔒 en Modo Normal | ✅ Hecho |
| F1-C1 | Nombre del campo en título del modal de edición | ✅ Hecho |
| F1-C2 | Botón "Dejar en blanco" en modal de edición | ✅ Hecho |
| F1-D1 | Nueva plantilla: Ecocardiograma transtorácico (ETT) | ✅ Hecho |
| F1-D2 | Nueva plantilla: Eco Doppler vascular | ✅ Hecho |
| F1-D3 | Nueva plantilla: Nota de evolución | ✅ Hecho |
| F1-D4 | Nueva plantilla: Epicrisis / Resumen de internación | ✅ Hecho |
| F1-E1 | Toast con plantilla detectada + opción "Cambiar" | ✅ Hecho |
| F1-G1 | Panel de gestión del registro de pacientes (modal) | ✅ Hecho |
| F1-G2 | Unificación patientHistory + patientRegistry (bridge) | ✅ Hecho |
| F1-K1 | Flujo de primer uso: bienvenida + T&C + datos precargados | ✅ Hecho |
| F1-K2 | UI separada admin vs cliente (adminApiKeyCard oculto para clientes) | ✅ Hecho |
| F1-K3 | Botón "Contacto" con modal motivo + detalle + mailto | ✅ Hecho |
| F1-PWA1 | manifest.json (instalación como app) | ✅ Hecho |
| F1-PWA2 | Service Worker (cache offline del app shell) | ✅ Hecho |
| F1-PWA3 | Botón de instalación (beforeinstallprompt) | ✅ Hecho |
| F1-PWA4 | Íconos PWA 192×192 y 512×512 | ✅ Hecho |

---

## � DIAGNÓSTICO DEL SISTEMA BACKEND + DASHBOARD — ESTADO REAL

> Investigación hecha sobre los archivos reales. Sin suposiciones.

### `backend/google_apps_script.js` — Script desplegado en producción

**URL en `backend/admin_config.json` / `DEPLOYMENT_INFO.md`:**
`AKfycbw9xT0IdmPbpIsncavlktd3a9vJgao1wR-kwaEZA2PUUVXEo2GIIfV-FgJpBHE_-u9ofg`

**URL en `recursos/admin.html` y `recursos/login.html`:**
`AKfycby2VEaj2Qy4TGrjL7ZG_YjfEO4ttI6fynnWLgAMafU8VMWoYoWgqJX48D5okxKOrgQiaw`

⚠️ **Son dos URLs distintas.** Una de ellas está desactualizada.

#### Endpoints que SÍ existen en el script:

| Método | Acción | Descripción |
|--------|--------|-------------|
| GET | `validate` (default) | Valida usuario por `id` + `deviceId`, registra device en `Devices_Logged`, devuelve todos sus datos |
| GET | `admin_list_users` | Lista todos los usuarios de la hoja (requiere `adminKey`) |
| POST | `update_usage` | Incrementa `Usage_Count` del médico en 1 |
| POST | `admin_update_user` | Actualiza campos del usuario (requiere `adminKey` en body) |

#### Endpoints que FALTAN en el script (los llaman la UI pero no están implementados):

| Llamado desde | Acción | Estado |
|---------------|--------|--------|
| `login.html` → GET | `admin_login` | ❌ NO EXISTE — el login siempre falla |
| `admin.html` `API.createUser` → GET | `admin_create_user` | ❌ NO EXISTE — "Nuevo Usuario" siempre falla |

#### Bug de método HTTP:
- `admin_update_user` está implementado como **POST** en el script
- `admin.html` `API.call()` lo llama como **GET** (línea 1987)
- Resultado: las ediciones desde el modal "Editar Usuario" fallan silenciosamente

---

### `recursos/admin.html` — Panel de administración real (3464 líneas)

**Estado:** UI completa y real, NO es un mockup.

| Funcionalidad | Estado |
|---------------|--------|
| Autenticación por sesión (8h auto-logout) | ✅ Implementado |
| Redirige a `login.html` si no hay sesión | ✅ Implementado |
| Acceso directo desde la app (`?fromApp=true`) | ✅ Implementado |
| Tab **Usuarios** — tabla con stats, filtros, búsqueda | ✅ Implementado |
| Columnas: ID, Nombre, Email, Especialidad, Plan, Estado, Vencimiento, Uso, Última actividad | ✅ Implementado |
| Acciones por fila: Editar ✏️ / Métricas 📊 / Banear 🚫 / Activar ✅ | ✅ Implementado |
| Modal "Editar Usuario" (Plan, Estado, Vencimiento, Devices_Max, Notas) | ✅ UI ok / ⚠️ Falla por bug de método HTTP |
| Modal "Métricas del usuario" (transcripciones, palabras, dispositivos) | ✅ UI ok / ⚠️ datos ficticios (no vienen del Sheet) |
| Tab **Métricas globales** (MRR, conversión trial→pro, top usuarios, gráfico) | ✅ UI ok / ⚠️ datos calculados desde la tabla (no del Sheet) |
| Tab **Logs** (historial de acciones admin con filtros) | ✅ UI ok / ⚠️ datos simulados (no hay tabla Logs en el Sheet) |
| Modal "Nuevo Usuario" (nombre, matrícula, email, teléfono, plan, especialidades, estudios, logo, firma) | ✅ UI completa / ❌ Falla: `admin_create_user` no existe en el script |
| Modal "Editar Usuario" completo (mismo form que Nuevo, pero prefilled) | ✅ Implementado |
| Auto-refresh cada 5 min | ✅ Implementado |
| Modo oscuro (toggle) | ✅ Implementado |
| URL del scriptUrl ya configurada con URL real | ✅ |

---

### `recursos/login.html` — Pantalla de login del admin

| Funcionalidad | Estado |
|---------------|--------|
| Form usuario + contraseña | ✅ UI implementada |
| Llamada a `action=admin_login` en el script | ❌ FALLA — el endpoint no existe |
| Si hay sesión activa → redirige a `admin.html` | ✅ |
| Resultado real | El login **nunca funciona** vía este form |

---

### `index.html` (app principal) — Conexión con el backend

| Funcionalidad | Estado |
|---------------|--------|
| Llamada a `validate` al iniciar (verificar licencia) | ❌ No implementada |
| Llamada a `update_usage` tras cada transcripción | ❌ No implementada |
| `device_id` generado y guardado | ❌ No implementado |
| `ID_Medico` guardado en localStorage para validar | ❌ No implementado |

**La app principal hoy no habla con el backend para nada.**

---

### `GOOGLE_SHEET_SETUP.md` — Estructura del Sheet

| Columna documentada | En el Sheet |
|---------------------|-------------|
| ID_Medico, Nombre, Matricula, Email, Especialidad, Plan, Estado, Fecha_Registro, Fecha_Vencimiento, Devices_Max, Devices_Logged, Usage_Count, Notas_Admin | ✅ Documentadas |
| Telefono | ⚠️ Usada por admin.html "Nuevo Usuario" pero NO documentada en el setup |
| Lugares_Trabajo | ⚠️ Usada por admin.html pero NO documentada |
| Estudios_JSON | ⚠️ Usada por admin.html pero NO documentada |

---

### Resumen de bugs críticos confirmados

| # | Problema | Impacto |
|---|----------|---------|
| B1 | `action=admin_login` no existe en el script | Login del admin SIEMPRE falla |
| B2 | `action=admin_create_user` no existe en el script | "Nuevo Usuario" SIEMPRE falla |
| B3 | `admin_update_user` esperado por POST, llamado como GET | Ediciones SIEMPRE fallan |
| B4 | Dos URLs distintas en los archivos (backend/ vs recursos/) | Una URL es obsoleta |
| B5 | `adminKey` hardcodeada en admin.html y login.html como `ADMIN_SECRET_2026` | Inseguro si no se cambió en Apps Script Properties |
| B6 | Columnas `Telefono`, `Lugares_Trabajo`, `Estudios_JSON` no documentadas | Setup del Sheet está incompleto |
| B7 | App principal no valida licencia ni reporta uso | El sistema de licencias no opera |

---

## �🗺️ LO QUE FALTA — ETAPAS PENDIENTES

Las etapas están ordenadas por impacto estimado en el producto. **Nada aquí está decidido todavía.**  
Cada sección termina con una pregunta concreta que necesito que respondas antes de escribir código.

---

### ETAPA 1 — Reparar el Apps Script (bugs B1, B2, B3)

**Qué hay que hacer:**
- Agregar `action=admin_login` al script (necesita una segunda tabla `Admins` en el Sheet con `Username`, `Password`, `Nombre`, `Nivel`, o usar las Script Properties)
- Agregar `action=admin_create_user` al script (recibe los datos del nuevo usuario y crea una fila en el Sheet)
- Corregir `admin_update_user`: o cambiar admin.html para que use POST correctamente, o re-implementar el endpoint como GET

**Preguntas antes de escribir código:**
> 1. ¿Los admins (usuarios que acceden al dashboard) están en el mismo Sheet `Usuarios_Transcriptor`, o querés una hoja separada `Admins`?
> 2. ¿La contraseña del admin se guarda en texto plano en el Sheet, o preferís que sea una verificación contra `ADMIN_KEY` en las Script Properties? (modo simple: solo 1 admin)
> 3. ¿Cuál de las dos URLs es la correcta y activa hoy? ¿La del `backend/admin_config.json` o la del `recursos/admin.html`?

---

### ETAPA 2 — Unificar URLs y asegurar el adminKey (bugs B4, B5, B6)

**Qué hay que hacer:**
- Decidir cuál URL del script es la activa y actualizarla en TODOS los archivos (`admin.html`, `login.html`, `admin_config.json`, `DEPLOYMENT_INFO.md`)
- Cambiar `adminKey` de `ADMIN_SECRET_2026` por una clave real en Apps Script Properties
- Actualizar `GOOGLE_SHEET_SETUP.md` con las columnas faltantes (`Telefono`, `Lugares_Trabajo`, `Estudios_JSON`)

**Preguntas:**
> 1. ¿Tenés acceso al Apps Script desplegado? ¿Ya cambiaste la `ADMIN_KEY` en Script Properties, o sigue siendo `ADMIN_SECRET_2026`?
> 2. ¿Cuál URL querés mantener como definitiva?

---

### ETAPA 3 — Conectar la app principal al backend (bug B7)

**Qué hay que hacer:**  
El endpoint `validate` ya existe en el script y devuelve todo el perfil del usuario. La app solo necesita llamarlo.

Flujo esperado:
1. En primer uso: generar `device_id` único → guardar en `localStorage`
2. Al abrir la app: llamar `?id=ID_Medico&deviceId=device_id`
3. El script devuelve `{ Estado, Plan, Fecha_Vencimiento, Devices_Logged, ... }`
4. Si `Estado === 'expired'` o `Estado === 'banned'` → mostrar pantalla de licencia vencida
5. Si `Estado === 'active'` o `'trial'` → continuar, sobrescribir `CLIENT_CONFIG.type` con el `Plan` del Sheet
6. Llamar `POST update_usage` cuando se complete una transcripción exitosa

**El `ID_Medico` del cliente:** debe llegar pre-configurado en `config.js` antes de entregar la app (igual que nombre y matrícula).

**Preguntas:**
> 1. ¿Qué pasa si el cliente no tiene internet? ¿Gracia offline (usar última validación guardada si tiene menos de N días)?
> 2. ¿El rol ADMIN también llama al `validate`, o el admin nunca necesita licencia?
> 3. ¿El `ID_Medico` se agrega a `CLIENT_CONFIG` en `config.js`?

---

### ETAPA 4 — Historial de informes por paciente

**Qué es:**  
Hoy el `patientRegistry` guarda nombre, matrícula, obra social y contador de visitas.  
**No guarda los informes generados.** Si el médico quiere ver el informe de la semana pasada, no puede.

**Propuesta base:**
- Guardar en localStorage los últimos N informes por paciente (HTML + fecha + tipo de estudio)
- Poder acceder desde el modal del registro de pacientes
- "Ver informe anterior" → abre en el editor con opción de re-exportar a PDF

**Preguntas:**
> 1. ¿Cuántos informes por paciente querés guardar? (localStorage tiene ~5MB de límite)
> 2. ¿El médico puede editar un informe histórico o solo leerlo?
> 3. ¿Querés exportar/importar el historial como backup (JSON)?

---

### ETAPA 5 — Autocompletado de campos con valores frecuentes

**Qué es:**  
Cuando hay un campo `[No especificado]` y el médico lo abre, mostrar chips con valores habituales según el campo.

**Ejemplo:**
- Campo "Preparación" → chips: "Ayuno de 8hs", "Sin preparación especial", "Preparación colónica completa"
- Campo "Acceso" → chips: "Oral", "Nasal", "Transanal"
- Campo "Sexo" → chips: "Masculino", "Femenino"

**Preguntas:**
> 1. ¿Querés que los valores sugeridos sean fijos por campo (definidos por vos), o que la app aprenda de lo que el médico escribe frecuentemente?
> 2. ¿Los chips van dentro del modal de edición existente, o preferís algo más liviano (desplegable bajo el input)?

---

### ETAPA 6 — Mejoras visuales del PDF

**Qué hay planificado (brainstorm F1-F3):**
- **F1:** Los campos "s/p" en el PDF se muestran más discretos (texto gris, tamaño menor)
- **F2:** QR de autenticidad que apunte a URL de verificación (requiere backend)
- **F3:** Logo de institución en encabezado del PDF (ya hay UI para cargarlo, falta renderizarlo en PDF)

**Preguntas:**
> 1. ¿El logo en PDF es prioridad, o lo dejamos para después de las licencias?
> 2. ¿El QR actual verifica algo real, o es decorativo?

---

### ETAPA 7 — Internacionalización / idioma del informe

**Qué es:**  
El prompt se envía siempre en español. Agregar un selector de idioma del informe: español (default), inglés, portugués.

**Estado actual:** No implementado. Bajo en prioridad según el brainstorm.

**Pregunta:**
> ¿Es relevante para tu base de clientes actual, o lo dejamos para una versión futura?

---

### ETAPA 8 — Versionado del informe en el editor

**Qué es:**  
Guardar snapshots automáticos: (1) texto crudo transcrito, (2) texto estructurado por IA, (3) versión editada manualmente. Con botón "ver historial de versiones / comparar".

**Estado actual:** No implementado.

**Pregunta:**
> ¿Es útil para tu flujo de trabajo real, o el médico raramente quiere volver a una versión anterior?

---

## 🔴 PRIORIDADES SUGERIDAS (para discutir)

Esta es mi lectura del orden lógico. No tomes este orden como definitivo — consultame si cambia algo:

```
1. Reparar Apps Script — bugs B1+B2+B3  (Etapa 1)  ← sin esto login y crear usuarios fallan siempre
2. Unificar URLs + adminKey — bugs B4+B5+B6 (Etapa 2)  ← coherencia y seguridad mínima
3. Conectar app al backend — bug B7        (Etapa 3)  ← sin esto el negocio no controla licencias
4. Historial de informes por paciente      (Etapa 4)  ← alta demanda de usuarios médicos
5. Autocompletado de campos                (Etapa 5)  ← velocidad en el flujo diario
6. Mejoras visuales del PDF               (Etapa 6)  ← pedido frecuente de clientes
7. Internacionalización                   (Etapa 7)  ← según demanda de mercado
8. Versionado del editor                  (Etapa 8)  ← nice to have
```

---

## ❓ DECISIONES ABIERTAS

Antes de continuar necesito tus respuestas sobre **al menos la Etapa 1** (reparar Apps Script), ya que:
- Hay 3 bugs críticos que impiden que login.html y el botón Nuevo Usuario funcionen
- Requiere definir si hay una hoja de Admins separada o una sola contraseña en Script Properties
- Requiere confirmar cuál de las dos deploy URLs está activa hoy

El resto de las etapas las podemos ir decidiendo una por una, en orden.

---

*No se escribe código hasta que confirmes qué etapa encaramos y respondas las preguntas correspondientes.*
