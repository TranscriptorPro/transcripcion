# Transcriptor Pro — Estado actual, problemas y brainstorm de mejoras

> Documento generado el 22/02/2026. Para uso interno de planificación.
> Marcar con ✅ lo que se decide implementar, con ❌ lo que se descarta.

---

## 1. ESTADO ACTUAL DEL SISTEMA

### Módulos funcionales
| Módulo | Archivo | Estado |
|--------|---------|--------|
| Grabación de audio | `core/audio.js` | ✅ OK |
| Transcripción Whisper (Groq) | `features/transcriptor.js` | ✅ OK |
| Detección automática de plantilla | `features/structurer.js` → `autoDetectTemplateKey` | ✅ OK (MIN_SCORE=7, proximity checks) |
| Estructurado con LLaMA 3 | `features/structurer.js` → `structureTranscription` | ✅ OK |
| Renderizado del informe | `features/structurer.js` → `markdownToHtml` | ✅ OK (párrafos fluidos, h1/h2/h3) |
| Editor WYSIWYG | `features/editor.js` | ✅ OK |
| Campos vacíos `[No especificado]` | `features/editor.js` (modal editFieldModal) | ✅ OK (botón lápiz hover, modal con tabs) |
| Registro de pacientes | `features/patientRegistry.js` | ✅ OK (localStorage, search, autocomplete) |
| Modal datos del paciente | `index.html`, `utils/ui.js` | ✅ OK (search, insurance, affiliateNum) |
| Generación PDF | `features/pdfMaker.js` | ✅ OK |
| Preview de impresión | `features/pdfPreview.js` | ✅ OK |
| Diccionario médico | `features/medDictionary.js` | ✅ OK |
| Tests automatizados | `tests/run_tests.js` | ✅ 27/27 pasando |

### Plantillas disponibles (templates.js)
- **Neumología:** Espirometría, Test Marcha, Pletismografía, Oximetría Nocturna
- **Imágenes:** TAC, Resonancia, Mamografía, Densitometría, PET-CT, Radiografía, Ecografía Abdominal
- **Endoscopía:** Gastroscopía, Colonoscopía, Broncoscopía, Laringoscopía
- **Cardiología:** Gammagrafía SPECT, Holter, MAPA, Cinecoronariografía, ECG, Eco-Stress
- **Ginecología:** PAP, Colposcopía
- **Neurología:** Electromiografía, Polisomnografía
- **ORL:** Videonaso-Laringoscopía, Endoscopía Otológica
- **Quirúrgico:** Protocolo Operatorio
- **General:** Informe Médico General (genérico)

### Flujo actual (Modo Pro)
```
[Grabar audio] → [Transcribir con Whisper] → [Texto crudo en editor]
  → [Detectar plantilla automáticamente] → [Estructurar con LLaMA 3.3-70b]
  → [Renderizar HTML en editor] → [Pedir datos del paciente]
  → [Editar campos vacíos con botón lápiz] → [Preview / PDF]
```

### Limitaciones conocidas en el flujo actual
1. **El prompt genérico** (`generico`) solo dice "estructura profesionalmente" — sin instrucciones específicas de formato por órgano
2. **Los prompts específicos** estructuran por secciones fijas de la plantilla, pero algunos no contemplan el patrón "por órgano + s/p si sin hallazgos + conclusión positiva"
3. **El modal "Editar campo vacío"** muestra la pestaña Grabar aunque no haya API Key (se oculta solo si `window.GROQ_API_KEY` es falsy, pero en Modo Normal no se debería mostrar)
4. **No existe separación de roles/modos** en la UI del modal de edición — no hay chequeo explícito de "Modo Normal" vs "Modo Pro"

---

## 2. PROBLEMA PRIORITARIO: ESTRUCTURA DEL INFORME POR ÓRGANO

### Situación actual
Los prompts de ecografía y estudios similares piden *descripción sistemática de cada órgano*, pero no imponen el formato exacto que vos querés. El resultado depende de cómo el modelo interpreta "descripción sistemática".

### Lo que vos querés
```
## HÍGADO
Tamaño conservado, ecotextura homogénea, sin lesiones ocupantes de espacio. Sin dilatación de vías biliares intrahepáticas.

## VESÍCULA
s/p

## VÍAS BILIARES
Colédoco de calibre normal, diámetro 4mm. Sin cálculos.

## PÁNCREAS
s/p

## BAZO
s/p

## RIÑÓN DERECHO
Tamaño y morfología conservados. Sin dilatación pielocalicial.

## RIÑÓN IZQUIERDO
s/p

## CONCLUSIÓN
Hepatomegalia leve con esteatosis hepática grado I-II. Colelitiasis. Se recomienda correlación clínico-laboratorial.
```

### Reglas implícitas del formato que describís
- Cada órgano es un `##` separado
- Si no hay hallazgos relevantes → `s/p` (sin particularidades)
- La conclusión **solo** contiene los hallazgos positivos (los que no son s/p), redactados como párrafo fluido
- La conclusión no repite datos normales

---

## 3. BRAINSTORM — OPCIONES DE MEJORA

### 🔴 A. FORMATO DEL INFORME POR ÓRGANO

#### A1 — Modificar el prompt de cada plantilla aplicable
Cambiar los prompts de `ecografia_abdominal`, `gastroscopia`, `colonoscopia`, `cinecoro`, etc. para que sigan el patrón "por órgano + s/p + conclusión solo positivos".

**Pros:** Resultado muy preciso y predecible. Control total.  
**Cons:** Hay que hacerlo plantilla por plantilla (trabajo manual).  
**Impacto:** Alto. El informe queda exactamente como vos querés.

#### A2 — Agregar una regla global al sistema prompt (REGLAS ABSOLUTAS #9)
Añadir a las reglas comunes que ya se envían con cada prompt:  
> "Para estudios que evalúan múltiples órganos o segmentos, dedica una sección `##` a cada uno. Si una sección/órgano no presenta hallazgos relevantes, escribe únicamente `s/p`. La conclusión solo debe mencionar los hallazgos positivos, redactados como un párrafo fluido."

**Pros:** Se aplica a todas las plantillas sin tocarlas una por una.  
**Cons:** La IA puede no interpretarlo correctamente en todos los casos.  
**Impacto:** Medio-alto. Riesgo de inconsistencia en plantillas muy distintas (ej. ECG vs Ecografía).

#### A3 — Combinación A1 + A2
Regla global + ajuste fino en las plantillas más usadas (ecografía, colonoscopía, gastroscopía, cinecoronariografía).

**Pros:** Lo mejor de ambas opciones.  
**Cons:** Más trabajo inicial.  
**Impacto:** Muy alto.

---

### 🟡 B. TAB "GRABAR" EN MODO NORMAL (bug actual)

#### B1 — Ocultar la pestaña según `window.GROQ_API_KEY`
Ya existe la condición `isPro()` en el modal, pero parece que el tab se muestra de todas formas. Revisar si la lógica de ocultamiento se ejecuta antes de abrir el modal.

**Pros:** Corrección simple y directa.  
**Cons:** Ninguno.  
**Impacto:** Bajo (bug visual, no funcional — la transcripción fallaría de todos modos sin key).

#### B2 — Reemplazar el tab por un mensaje "Disponible en Modo Pro"
En lugar de ocultar, mostrar el tab con un candado 🔒 y tooltip "Requiere API Key Groq".

**Pros:** El usuario de Modo Normal sabe que la función existe y puede activarla.  
**Cons:** Agrega un poco más de complejidad visual.  
**Impacto:** Bajo-medio (mejora de UX y conversión a Pro).

---

### 🟡 C. MEJORAS EN EL MODAL "EDITAR CAMPO"

#### C1 — Mostrar el nombre del campo que se está editando
Actualmente el modal muestra el texto del párrafo completo como contexto. Mejor extraer el label del campo anterior al span (lo que hay antes del `:`).

**Ejemplo:** Si el span está en `Fonación: [No especificado]`, el título del modal diría **"Completar: Fonación"**.

**Pros:** Claridad inmediata.  
**Cons:** Requiere buscar el texto previo al span en el DOM.  
**Impacto:** Bajo (UX).

#### C2 — Agregar botón "Dejar en blanco" (eliminar el campo del informe)
Opción para eliminar completamente el campo vacío del informe si no es relevante para el caso.

**Pros:** Más control sobre el contenido final.  
**Cons:** El usuario podría borrar campos necesarios por error.  
**Impacto:** Medio.

#### C3 — Autocompletar con valores frecuentes por campo
Detectar el campo (ej. "Sexo", "Preparación", "Acceso") y mostrar sugerencias rápidas como chips clicables.

**Pros:** Velocidad de completado muy alta para campos estandarizados.  
**Cons:** Requiere definir listas de valores por campo/plantilla.  
**Impacto:** Alto para campos predecibles. Menor para campos libres.

---

### 🟢 D. PLANTILLAS NUEVAS O FALTANTES

#### D1 — Ecocardiograma transtorácico (ETT)
Existe `eco_stress` pero **no hay plantilla específica para ecocardiograma standard**. Es uno de los estudios más frecuentes.

Secciones sugeridas: Ventrículo izquierdo (dimensiones, FEVI, motilidad), Ventrículo derecho, Válvulas (mitral, aórtica, tricúspide, pulmonar), Pericardio, Aorta, Conclusión.

**Impacto:** Alto. Muy alta frecuencia de uso.

#### D2 — Eco Doppler vascular (arterial/venoso miembros)
Común en angiología. Secciones: por segmento vascular (ilíaco, femoral, poplíteo, tibial) + s/p + conclusión.

#### D3 — Informe evolutivo / Nota de evolución
Plantilla genérica para consultas médicas: Motivo, Examen físico por aparato, Laboratorio, Impresión diagnóstica, Plan.

#### D4 — Epicrisis / Resumen de internación
Alta hospitalaria con diagnóstico de ingreso, diagnóstico de egreso, evolución, procedimientos realizados, medicación al alta.

---

### 🟢 E. MEJORAS EN EL FLUJO DE DETECCIÓN AUTOMÁTICA

#### E1 — Mostrar el nombre de la plantilla detectada con opción de cambiarla
Actualmente la plantilla se detecta y se aplica sin aviso visual. Agregar un pequeño toast/badge que diga "Detectado: Cinecoronariografía" con un link "Cambiar".

**Pros:** El usuario sabe qué plantilla se usó y puede corregirla si fue incorrecta.  
**Cons:** Un paso más en el flujo (aunque opcional).  
**Impacto:** Medio (UX y confianza en el sistema).

#### E2 — Modo "confirmación antes de estructurar"
Antes de enviar a la IA: mostrar la plantilla detectada y pedir confirmación con opción de cambiar.

**Pros:** Control total. Ningún gasto de API inesperado en la plantilla equivocada.  
**Cons:** Un paso extra que puede sentirse lento.  
**Impacto:** Medio.

---

### 🔵 F. MEJORAS EN EL PDF

#### F1 — Campo "s/p" en PDF se muestra más discreto
Si el contenido de una sección es solo `s/p`, mostrarlo en gris claro o en formato reducido en el PDF para que visualmente no tenga el mismo peso que un hallazgo positivo.

#### F2 — Firma digital / QR de autenticidad
El PDF ya tiene opción de QR. Agregar un QR que apunte a una URL de verificación del informe (requeriría backend).

#### F3 — Logo de institución en el encabezado PDF
El profesional puede cargar su logo y que aparezca en el encabezado junto al nombre.

---

### 🔵 G. MEJORAS EN EL REGISTRO DE PACIENTES

#### G1 — Ver/editar lista de pacientes guardados
Modal de administración del registro con tabla de todos los pacientes, opción de editar o borrar.

#### G2 — Historial de informes por paciente
Guardar en localStorage los últimos N informes de cada paciente (HTML + fecha + tipo de estudio). Poder acceder desde el registro.

#### G3 — Exportar/importar registro de pacientes
Botón para exportar el registro como JSON o CSV, e importarlo desde otro dispositivo.

---

### 🔵 H. MEJORAS TÉCNICAS / INFRAESTRUCTURA

#### H1 — Internacionalización del prompt (idioma del informe)
Permitir al profesional elegir el idioma del informe: español (default), inglés, portugués. El prompt se envía en el idioma elegido.

#### H2 — Modo offline parcial
Cachear las plantillas y el editor en un Service Worker para que la app funcione sin conexión (excepto la llamada a Groq).

#### H3 — Versionado del informe en el editor
Guardar automáticamente versiones del informe (antes/después de estructurar, antes/después de ediciones manuales) con botón "comparar versiones".

---

## 4. PRIORIDADES SUGERIDAS (sin decidir)

| Prioridad | Ítem | Complejidad | Impacto |
|-----------|------|-------------|---------|
| 🔴 Urgente | A1+A2 — Formato por órgano + s/p | Media | Muy alto |
| 🔴 Urgente | B1 — Ocultar tab Grabar en Modo Normal | Baja | Bajo |
| 🟡 Alta | D1 — Plantilla Ecocardiograma ETT | Baja | Alto |
| 🟡 Alta | C1 — Título del campo en modal edición | Baja | Bajo |
| 🟡 Alta | E1 — Toast con plantilla detectada + cambiar | Media | Medio |
| 🟢 Media | D2/D3/D4 — Nuevas plantillas | Baja c/u | Medio |
| 🟢 Media | G1 — Lista/administración de pacientes | Media | Medio |
| 🔵 Baja | F1 — s/p discreto en PDF | Baja | Bajo |
| 🔵 Baja | H2 — Modo offline | Alta | Medio |

---

## 5. PRÓXIMOS PASOS RECOMENDADOS

1. **Confirmás** cuáles cambios de la sección 3 querés implementar (marcá con ✅/❌)
2. Empezamos por los de mayor impacto y menor complejidad
3. Cada cambio se testea, commiteamos y hacemos push en el mismo paso para que GitHub Pages se actualice inmediatamente

---

*Este documento no debe commitearse como parte del deploy — es solo para planificación interna.*
