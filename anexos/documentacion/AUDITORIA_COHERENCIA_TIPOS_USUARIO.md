# AUDITORÍA DE COHERENCIA POR TIPO DE USUARIO — Transcriptor Pro
**Fecha:** 8 de marzo de 2026  
**Estado:** Análisis completado, correcciones pendientes

---

## CONTEXTO DEL PROYECTO

- **Stack:** HTML5 + CSS3 + JS vanilla (IIFEs), sin frameworks
- **Build:** `node build.js` concatena ~30 archivos JS → bundle en index.html
- **Deploy:** `node build.js` → `git add -A` → `git commit -m "msg"` → `git push origin main`
- **Tests:** `node tests/run_tests.js` (670+ tests)
- **REGLA CRÍTICA:** NUNCA usar PowerShell Get-Content/Set-Content para editar archivos
- **Backend:** Google Apps Script
- **URL del script:** `https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec`

### Tipos de usuario (CLIENT_CONFIG.type)

| Plan contratado | CLIENT_CONFIG.type | hasProMode | canGenerateApps | Descripción |
|---|---|---|---|---|
| trial | TRIAL | false | false | Prueba gratuita 7 días |
| normal | NORMAL | false | false | Plan básico, 1 dispositivo |
| pro | PRO | true | false | Pro, 3 dispositivos, firma, QR |
| gift | PRO | true | false | Regalo (mismo que PRO) |
| clinic | PRO | true | true | Clínica, hasta 5 profesionales |
| enterprise | PRO | true | false | Enterprise |
| (admin) | ADMIN | true | true | Administrador del sistema |

### Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `src/js/features/settingsPanel.js` | Modal ⚙️ Configuración con 10 acordeones |
| `src/js/features/business.js` | Init de app: factory setup, onboarding, _initClient/_initAdmin |
| `src/js/features/sessionAssistant.js` | Modal de inicio de sesión (elegir lugar/profesional/plantilla) |
| `src/js/features/formHandler.js` | Manejo de formulario de pacientes |
| `src/js/features/structurer.js` | Estructurador de transcripciones con IA |
| `src/js/features/pdfMaker.js` | Generación de PDF |
| `src/js/features/patientRegistry.js` | Registro CRUD de pacientes |
| `src/js/config/templates.js` | 37 plantillas médicas (MEDICAL_TEMPLATES) |
| `index.html` | HTML principal con settings modal, onboarding, etc. |
| `tests/create-demo-users.js` | Script que creó 4 usuarios demo (sin API key) |
| `backend/google_apps_script.js` | Endpoints del backend |

---

## PROBLEMAS ENCONTRADOS — ORDENADOS POR PRIORIDAD

---

### 🔴 A1 — Settings: Acordeón API Key visible para clientes

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** El acordeón `data-stg="apikey"` (sección "🔑 API Key de Groq") se muestra a TODOS los usuarios, incluidos clientes (NORMAL, PRO, CLINIC). Los clientes NO deberían ver ni modificar la API Key — el admin la precarga durante el factory setup.

**Qué hacer:**  
En `settingsPanel.js`, en la función `populateSettingsModal()` (o al abrir el modal), agregar lógica que oculte el acordeón `apikey` si `CLIENT_CONFIG.type !== 'ADMIN'`.

```javascript
// Pseudocódigo — agregar al inicio de populateSettingsModal() o en open()
const apiKeyAccordion = document.querySelector('.stg-accordion[data-stg="apikey"]');
if (apiKeyAccordion && typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type !== 'ADMIN') {
    apiKeyAccordion.style.display = 'none';
}
```

**Verificación:** Abrir la app como clone (usuario NORMAL/PRO) → abrir ⚙️ Settings → la sección "API Key de Groq" NO debe aparecer.

---

### 🔴 A2 — Demo users creados sin API Key

**Archivo:** `tests/create-demo-users.js`  
**Problema:** Los 4 usuarios demo se crearon sin campo `API_Key`. Cuando el factory setup (`_handleFactorySetup` en business.js) hace:
```javascript
const apiKey = doctor.API_Key || regDatos.apiKey || '';
```
...obtiene string vacío → no guarda nada en localStorage → la app queda sin key para llamar a Groq.

**Qué hacer:**  
Agregar el campo `API_Key` con una key válida de Groq a cada usuario demo en `create-demo-users.js`. Luego re-ejecutar el script para actualizar los usuarios en el backend.

El admin tiene el api key de Grok que se puede consultar revisando el localStorage del navegador en la app desplegada, o buscando en el código/config donde se use `groq_api_key`. El campo en el backend se llama `API_Key`.

**IDs de los demo users creados:**
- NORMAL: `DEMO_N_MMHYRU1T5CO`
- PRO: `DEMO_P_MMHYRYF5WXO`
- PRO 2-WP: `DEMO_P2_MMHYS1D5NSJ`
- CLINIC: `DEMO_C_MMHYS53WJQJ`

**Alternativa:** En vez de actualizar los demo users, simplemente asegurarse de que el usuario pueda ingresar su API key en el onboarding. El paso `onboardingApiKeyStep` existe en el HTML pero está oculto con `display:none` por regla K1. Para clientes sin key preconfigurada, mostrarlo.

**Verificación:** Abrir `?id=DEMO_P_MMHYRYF5WXO` → factory setup debe guardar la API key → en localStorage debe aparecer `groq_api_key` con valor válido.

---

### 🔴 A3 — PDF: Logo/firma sin restricción por plan

**Archivo:** `src/js/features/pdfMaker.js`  
**Problema:** El plan NORMAL (que NO incluye logo profesional ni firma digital según PRICING) puede generar PDFs con logo y firma igualmente. NO hay ningún check de `CLIENT_CONFIG.type` o `CLIENT_CONFIG.hasProMode` antes de incluir estos elementos.

**Qué hacer:**  
En la función que genera el PDF (buscar `downloadPDFWrapper` o la función principal de generación), agregar validación:

```javascript
// Antes de usar logoB64 y sigB64:
const isPro = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.hasProMode;
if (!isPro) {
    // Plan NORMAL/TRIAL: sin logo profesional ni firma
    profLogoB64 = '';
    sigB64 = '';
}
```

**Nota:** El logo INSTITUCIONAL (del lugar de trabajo) sí puede mostrarse para todos. Lo que se restringe es el logo del PROFESIONAL y la firma digital.

**Verificación:** Generar PDF como usuario NORMAL → no debe tener logo profesional ni firma digital. Generar como PRO → sí debe tenerlos.

---

### 🔴 A4 — formHandler duplica pacientes (migración G2 incompleta)

**Archivo:** `src/js/features/formHandler.js`  
**Problema:** Coexisten `savePatientToHistory()` (sistema viejo, `patient_history`, últimos 50) y `savePatientToRegistry()` (sistema nuevo, `patient_registry`, CRUD completo). Esto genera registros duplicados.

**Qué hacer:**  
En `formHandler.js`, hacer que `savePatientToHistory` sea un alias de `savePatientToRegistry`:

```javascript
// Reemplazar la función savePatientToHistory por:
window.savePatientToHistory = function(patient) {
    if (typeof savePatientToRegistry === 'function') {
        return savePatientToRegistry(patient);
    }
};
```

O directamente eliminar todas las llamadas a `savePatientToHistory` y usar `savePatientToRegistry` en su lugar.

**Verificación:** Guardar un paciente → debe aparecer SOLO en `patient_registry` (no duplicado en `patient_history`). Revisar localStorage.

---

### 🟠 B1 — Settings: Secciones NO se adaptan por tipo de usuario

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** Los 10 acordeones del modal de configuración son idénticos sin importar el tipo de usuario. No existe una función `_applyPlanVisibility()` o similar.

**Qué hacer:**  
Crear una función `_applyPlanVisibility()` que se ejecute al abrir el settings modal. Tabla de visibilidad:

| Acordeón (data-stg) | ADMIN | PRO | NORMAL | TRIAL | CLINIC (PRO+) |
|---|---|---|---|---|---|
| cuenta | ✅ | ✅ | ✅ | ✅ | ✅ + profesional activo |
| apikey | ✅ | ❌ | ❌ | ❌ | ❌ |
| workplace | ✅ | ✅ | ✅ | ✅ | ✅ |
| profiles | ✅ | ✅ | ✅ | ✅ | ❌ |
| pdf | ✅ | ✅ | ✅ (limitado) | ✅ (limitado) | ✅ |
| editor | ✅ | ✅ | ✅ | ✅ | ✅ |
| tools | ✅ | ✅ | ✅ | ✅ | ✅ |
| theme | ✅ | ✅ | ✅ | ✅ | ✅ |
| skins | ✅ | ✅ | ✅ (limitado) | ❌ | ✅ |
| stats | ✅ | ✅ | ✅ | ✅ | ✅ (filtrado por prof) |
| backup | ✅ | ✅ | ✅ | ✅ | ❌ o restringido |
| info | ✅ | ✅ | ✅ | ✅ | ✅ |

Implementación sugerida:

```javascript
function _applyPlanVisibility() {
    const type = (typeof CLIENT_CONFIG !== 'undefined') ? CLIENT_CONFIG.type : 'ADMIN';
    const isAdmin = type === 'ADMIN';
    const isClinic = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;

    // API Key: solo admin
    _toggleAccordion('apikey', isAdmin);
    
    // Perfiles rápidos: ocultar para clínica
    if (isClinic) _toggleAccordion('profiles', false);
    
    // Backup: ocultar o restringir para clínica
    if (isClinic) _toggleAccordion('backup', false);
}

function _toggleAccordion(stgKey, visible) {
    const el = document.querySelector('.stg-accordion[data-stg="' + stgKey + '"]');
    if (el) el.style.display = visible ? '' : 'none';
}
```

**Verificación:** Abrir settings como cada tipo de usuario → ver que las secciones coincidan con la tabla.

---

### 🟠 B2 — Settings: "Mi Cuenta" no muestra profesional activo para CLINIC

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** En modo clínica (múltiples profesionales), la sección "Mi Cuenta" muestra los datos del primer profesional fijo. Debería mostrar el profesional ACTIVO y un dropdown para cambiar.

**Qué hacer:**  
En `_populateAccountSection()` (o equivalente), si `isClinicMode()`:
1. Mostrar "Profesional actual: Dr. [nombre]"  
2. Agregar un `<select>` con todos los profesionales del workplace activo
3. Al cambiar → llamar a `loadProfessionalProfile(wpIndex, profIndex)` + actualizar nombre/matrícula/especialidad

**Verificación:** Abrir settings como CLINIC → "Mi Cuenta" muestra profesional activo con dropdown → al cambiar el dropdown se actualizan los datos.

---

### 🟠 B3 — Settings: Backup accesible para CLINIC sin filtrar

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** Usuarios CLINIC pueden exportar datos de TODOS los profesionales de la clínica. Debería estar restringido o exportar solo datos del profesional activo.

**Qué hacer:**  
Opción A: Ocultar sección backup para CLINIC (ya cubierto en B1).  
Opción B: Filtrar el export para que solo incluya datos del profesional activo.

**Verificación:** Como usuario CLINIC → intentar exportar → solo debe incluir datos del profesional actual.

---

### 🟠 B4 — sessionAssistant: modal puede quedar vacío

**Archivo:** `src/js/features/sessionAssistant.js`  
**Problema:** La función `open()` no valida que `workplace_profiles` tenga datos antes de renderizar los selectores. Si la carga falla (IDB lento, localStorage corrupto), el modal muestra selectores vacíos.

**Qué hacer:**  
Al inicio de `open()`, validar:
```javascript
const profiles = _getWpProfiles();
if (!profiles || profiles.length === 0) {
    console.warn('SessionAssistant: no hay workplace_profiles');
    // Opción: mostrar mensaje de error en el modal
    // Opción: intentar recargar desde appDB
    return;
}
```

**Verificación:** Borrar `workplace_profiles` de localStorage → abrir app → modal debe mostrar mensaje de error en vez de quedar vacío.

---

### 🟠 B5 — structurer: mutex `_structuring` no previene 2 tabs simultáneos

**Archivo:** `src/js/features/structurer.js`  
**Problema:** La variable `_structuring = true/false` es local a cada pestaña. Si el usuario abre 2 tabs, ambas pueden estructurar en paralelo → consumo doble de API Key.

**Qué hacer:**  
Usar `navigator.locks.request()` (Web Locks API) para mutex cross-tab:

```javascript
async function autoStructure() {
    if (!navigator.locks) {
        // Fallback: usar flag global
        if (_structuring) return;
    }
    await navigator.locks.request('transcriptor_structuring', async () => {
        // ... lógica de estructurado
    });
}
```

**Verificación:** Abrir 2 tabs → iniciar transcripción en ambas → solo una debe estructurar a la vez.

---

### 🟡 C1 — Settings: Skins sin restricción por plan

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** NORMAL y TRIAL ven todas las skins y el botón "🛒 Más skins y complementos". Deberían tener acceso limitado.

**Qué hacer:**  
En la sección de skins, si `CLIENT_CONFIG.type === 'NORMAL' || CLIENT_CONFIG.type === 'TRIAL'`:
- Mostrar solo skin "Por defecto"
- Agregar badge "PRO" en las otras skins
- Mantener botón "Más skins" como upsell

**Verificación:** Como NORMAL → skins Cyberpunk y Light Minimal deben tener badge PRO y estar deshabilitadas (o dejar como upsell visual).

---

### 🟡 C2 — Settings: Estadísticas no filtran por profesional (CLINIC)

**Archivo:** `src/js/features/settingsPanel.js`  
**Problema:** Las 4 tarjetas de estadísticas (informes, transcripciones, pacientes, diccionario) suman TODO, sin separar por profesional en modo CLINIC.

**Qué hacer:**  
Si `isClinicMode()`, filtrar `report_history` por el profesional activo antes de contar.

**Verificación:** Como CLINIC → stats deben mostrar solo números del profesional actualmente seleccionado.

---

### 🟡 C3 — formHandler: Búsqueda de paciente devuelve solo TOP-1

**Archivo:** `src/js/features/formHandler.js`  
**Problema:** La búsqueda en el input `patientSearch` solo muestra el primer resultado, ocultando homónimos.

**Qué hacer:**  
Cambiar para que muestre un dropdown con hasta 5-10 resultados. Al seleccionar uno, auto-rellenar los campos.

**Verificación:** Tener 2 pacientes "García" → buscar "García" → debe mostrar lista con ambos para elegir.

---

### 🟡 C4 — patientRegistry: `visits` nunca se incrementa

**Archivo:** `src/js/features/patientRegistry.js`  
**Problema:** El campo `visits` siempre queda en 1 al crear y nunca se incrementa cuando se vuelve a atender al mismo paciente.

**Qué hacer:**  
En `savePatientToRegistry()`, si el paciente ya existe (match por DNI), incrementar `visits++` y actualizar `lastSeen`.

**Verificación:** Guardar paciente DNI 12345 → guardarlo de nuevo → `visits` debe ser 2.

---

### 🟡 C5 — business: 1 profesional → selector oculto sin feedback

**Archivo:** `src/js/features/business.js`  
**Problema:** Si hay solo 1 profesional en el workplace, el dropdown se oculta pero no hay indicación visual de quién está activo.

**Qué hacer:**  
Cuando hay 1 profesional, mostrar un label estático:
```javascript
if (profs.length === 1) {
    group.style.display = 'none';
    // Mostrar badge/label con nombre del profesional
    showActiveProfBadge(profs[0].nombre);
}
```

**Verificación:** Como PRO con 1 profesional → debe verse un badge/label con el nombre.

---

### 🟡 C6 — structurer: autoDetectTemplateKey() no es case-insensitive

**Archivo:** `src/js/features/structurer.js`  
**Problema:** Las keywords se comparan sin normalizar mayúsculas/minúsculas. "Eco" no matchea con "eco".

**Qué hacer:**  
Normalizar el texto a minúsculas antes de buscar keywords:
```javascript
const normalizedText = text.toLowerCase();
// Y comparar contra keywords también en minúsculas
```

**Verificación:** Transcribir "ECO DOPPLER ARTERIAL" → debe detectar template `eco_doppler`.

---

### 🟡 C7 — structurer: toast "Configurar" apunta a elemento oculto

**Archivo:** `src/js/features/structurer.js` (línea ~396)  
**Problema:** Cuando la API key no está configurada, el toast dice "⚙️ Configurar" y hace `scrollIntoView` a `adminApiKeyCard`, que está `display:none` para clientes.

**Qué hacer:**  
Cambiar la acción del toast para que abra el settings modal en vez de scrollear al card oculto:
```javascript
showToastWithAction('🔑 API Key no configurada.', 'error', '⚙️ Configurar', () => {
    // En vez de scrollear al card oculto:
    if (typeof openSettingsModal === 'function') {
        openSettingsModal();
    }
});
```

Pero ojo: si el acordeón de API Key está oculto para clientes (fix A1), entonces este toast no debe ofrecer "Configurar" a clientes, sino "Contactar soporte" o similar:
```javascript
const isAdmin = typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN';
if (isAdmin) {
    showToastWithAction('🔑 API Key no configurada.', 'error', '⚙️ Configurar', () => openSettingsModal());
} else {
    showToastWithAction('🔑 Error de conexión con IA. Contacta a soporte.', 'error', '📧 Contactar', () => openContactModal());
}
```

**Verificación:** Como cliente sin API key → intentar transcribir → toast debe decir "Contactar soporte" (no "Configurar").

---

### 🔵 D1 — Backup keys B1/B2 no documentadas

**Archivo:** `src/js/features/structurer.js`  
**Problema:** Las backup keys (`groq_api_key_b1`, `groq_api_key_b2`) se usan en retry pero el usuario no puede configurarlas.

**Qué hacer:** Documentar en la sección de API Key del settings (para admin) o eliminar la funcionalidad.

---

### 🔵 D2 — inst_logo_size_px en localStorage, no en pdf_config

**Archivo:** `src/js/features/pdfMaker.js`  
**Problema:** El tamaño del logo institucional se almacena en `localStorage.inst_logo_size_px` en vez de en `pdf_config` → se pierde al hacer reset parcial.

**Qué hacer:** Mover a `pdf_config.instLogoSizePx`.

---

### 🔵 D3 — generateReportNumber() global por dispositivo

**Archivo:** `src/js/features/formHandler.js`  
**Problema:** En CLINIC, todos los profesionales comparten el mismo contador de report number.

**Qué hacer:** Prefijar con ID del profesional: `${profId}_${counter}`.

---

## ORDEN DE EJECUCIÓN RECOMENDADO

### Fase 1 — Arreglar lo que está roto (A1 → A4)
**Prioridad máxima.** Sin estos fixes la app funciona mal para clientes.

1. **A1** — Ocultar acordeón API Key para clientes en `settingsPanel.js`
2. **A2** — Agregar API Key a demo users en `create-demo-users.js` y re-ejecutar (o hacer visible el paso K1 del onboarding si no hay key)
3. **A3** — Agregar restricción de logo/firma por plan en `pdfMaker.js`
4. **A4** — Completar migración G2: `savePatientToHistory` → `savePatientToRegistry` en `formHandler.js`

### Fase 2 — Coherencia del Settings Panel (B1 → B3)
5. **B1** — Crear `_applyPlanVisibility()` en `settingsPanel.js`
6. **B2** — Agregar selector de profesional activo en "Mi Cuenta" para CLINIC
7. **B3** — Restringir/ocultar backup para CLINIC

### Fase 3 — Robustez de sesión (B4 → B5)
8. **B4** — Validar workplace_profiles en `sessionAssistant.js`
9. **B5** — Mutex cross-tab en `structurer.js`

### Fase 4 — Mejoras UX (C1 → C7)
10. **C7** — Toast "Configurar" → abrir settings o contactar soporte
11. **C6** — autoDetect case-insensitive
12. **C5** — Badge de profesional activo cuando hay 1 solo
13. **C4** — Incrementar visits en patientRegistry
14. **C3** — Búsqueda multi-resultado en formHandler
15. **C2** — Stats filtradas por profesional en CLINIC
16. **C1** — Skins restringidas por plan

### Fase 5 — Menores (D1 → D3)
17. **D1** — Documentar backup keys
18. **D2** — Mover inst_logo_size_px a pdf_config
19. **D3** — Report number por profesional

---

## DESPUÉS DE CADA FASE

1. `node build.js` — compilar
2. `node tests/run_tests.js` — verificar que no se rompió nada
3. `git add -A && git commit -m "descripción" && git push origin main` — deploy

---

## NOTAS TÉCNICAS IMPORTANTES

- **CLIENT_CONFIG** es un objeto global (`window.CLIENT_CONFIG`) que se establece en `_handleFactorySetup()` de `business.js` y se persiste en localStorage como JSON.
- **isClinicMode()** está definida en `sessionAssistant.js` y detecta si algún workplace tiene >1 profesional.
- **appDB** es un wrapper de IndexedDB definido en `src/js/core/appDB.js`.
- Los acordeones del settings usan la estructura: `<div class="stg-accordion" data-stg="nombre">`.
- La función `populateSettingsModal()` en `settingsPanel.js` se llama cada vez que se abre el modal.
- El onboarding paso de API Key tiene ID `onboardingApiKeyStep` y está oculto con `display:none` en `_showClientOnboarding()` de business.js (regla K1).
