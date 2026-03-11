## Prompt para IA con acceso a navegador — Auditoría completa de Transcriptor Pro (flujo GIFT)

**Objetivo:** Realizar una auditoría exhaustiva del flujo de creación de usuario GIFT y de toda la configuración del informe PDF en Transcriptor Pro. Registrar CADA problema visual, funcional o de UX encontrado con capturas de pantalla.

---

### INSTRUCCIONES

Vas a testear la aplicación web Transcriptor Pro. Tu trabajo es encontrar TODOS los bugs, problemas visuales, inconsistencias y errores. Necesito un informe detallado con capturas de pantalla de cada cosa que encuentres.

---

### PASO 1: Acceder al panel de administración

1. Abrí `https://transcriptorpro.github.io/transcripcion/`
2. Esperá a que cargue completamente.
3. Abrí el panel de administración: usuario **admin**, contraseña **admin2026**.
4. **Captura** del panel de admin abierto.

---

### PASO 2: Crear un usuario GIFT de prueba

1. Presioná el botón de **Crear usuario GIFT**.
2. Completá los campos con datos ficticios:
   - Nombre: `Dr. Test Auditoría`
   - Matrícula: `MP 99999`
   - Especialidad: la que quieras
   - Lugar de trabajo: `Clínica Test`, dirección `Av. Prueba 1234`, teléfono `0341-5551234`, email `test@clinica.com`
3. **Subí un logo institucional** (cualquier imagen PNG/JPG). **Captura** cómo se ve el logo después de subirlo.
4. **Subí un logo profesional** (otra imagen). **Captura**.
5. **Subí una firma digital** (otra imagen). **Captura**.
6. Configurá un **color de encabezado** distinto al default (ej: rojo o violeta).
7. **Captura** de todo el formulario completado antes de generar el link.
8. Generá el link GIFT.
9. **Captura** del link generado.

---

### PASO 3: Abrir el link GIFT y pasar el wizard de onboarding

1. Abrí el link GIFT generado en una **nueva pestaña** (o en modo incógnito para que no tenga datos previos).
2. Debería aparecer el **wizard de onboarding** (modal con pasos).

**Para CADA paso del wizard, hacé lo siguiente:**
- **Captura** de cómo se ve el paso.
- Verificá que los datos precargados sean correctos (nombre, matrícula).
- Anotá cualquier error visual: textos cortados, elementos desalineados, colores incorrectos.

**Paso 3 del wizard — "Configuración rápida":**

Esto es lo MÁS IMPORTANTE. Verificá TODO:

a) **Vista previa del informe**: ¿Se muestra una mini vista previa del PDF al costado derecho? ¿Se actualiza en tiempo real?

b) **Color de encabezados del informe**:
   - Hacé clic en cada color de la paleta.
   - ¿La vista previa refleja el cambio de color?
   - **VERIFICAR**: ¿Cambiar el color de encabezado del informe cambia también el color de la app (header, botones)? **NO debería**. Son independientes. Si cambia el color de la app, es un BUG.

c) **Toggle Firma digital**:
   - ¿Está activado o desactivado por defecto?
   - Activalo/desactivalo y verificá que la vista previa refleje el cambio.
   - **Captura** con firma ON y otra con firma OFF.

d) **Toggle Logo profesional**:
   - Mismo test que firma. ¿La vista previa muestra/oculta el logo?

e) **Toggle Logo institucional**:
   - Mismo test. ¿La vista previa lo refleja?

f) **Toggle QR**:
   - ¿Está habilitado para usuario GIFT (PRO)?
   - ¿La vista previa muestra el QR?

g) **Márgenes del PDF**:
   - Probá los 3 botones (Estrecho, Normal, Amplio).
   - ¿La vista previa refleja el cambio de márgenes?

h) **Captura** final de la configuración completa con todos los toggles activados.

**Paso 4 — Términos y condiciones:**
- ¿Funciona el checkbox de aceptar T&C?
- ¿El botón se habilita al aceptar?
- **Captura**.

Completá el wizard.

---

### PASO 4: Verificar la Configuración Asistida post-wizard

Después de completar el wizard, debería aparecer un panel de "Configuración Asistida" (para elegir lugar de trabajo, profesional, etc.).
- **Captura** de este panel.
- ¿Se muestran los datos correctos?
- Seleccioná el lugar de trabajo y confirmá.

---

### PASO 5: Verificar la vista previa del PDF completa

1. Escribí texto de prueba en el editor: `Hígado de forma, tamaño y ecoestructura conservada. Vesícula de paredes finas, sin litiasis. Riñones de morfología normal.`
2. Presioná el botón de **Vista Previa** (o PDF Preview).
3. **Captura** de la vista previa completa.

**Verificar en la vista previa:**

a) **Logo institucional**: ¿Se ve SIN fondo? No debe tener un recuadro o background detrás. Debe ser imagen limpia.

b) **Logo profesional**: ¿Se ve SIN fondo? Igual, imagen limpia sin recuadro.

c) **Firma digital**: ¿Se ve al pie? ¿Tiene el tamaño correcto?

d) **Color de encabezados**: ¿Refleja el color elegido en el wizard?

e) **FECHA**: Debe estar en la sección de datos del estudio (junto a ESTUDIO e INFORME Nº), NO en el encabezado del profesional. Verificá esto. **Captura** de la sección de datos del estudio mostrando las 3 columnas: ESTUDIO | INFORME Nº | FECHA.

f) **QR**: ¿Aparece si fue activado?

g) **Encabezado del profesional**: Nombre, matrícula, especialidad. ¿Todo correcto?

h) **Lugar de trabajo**: Nombre, dirección, teléfono. ¿Todo en su lugar?

---

### PASO 6: Probar cambio de tamaños de logo y firma

1. Abrí la **Configuración del PDF** (menú ⚙️ Configuración → Formato del PDF, o el ícono de engranaje).
2. Buscá el **slider de tamaño del logo profesional** (debería estar en la pestaña Encabezado). Mové el slider al mínimo y al máximo. ¿Funciona? ¿El label se actualiza? **Captura** al mínimo y al máximo.
3. Buscá el **slider de tamaño de la firma digital** (debería estar en la pestaña Pie de Página). Mové el slider. ¿Funciona? **Captura** al mínimo y al máximo.
4. Guardá la configuración y abrí la vista previa de nuevo. ¿Los tamaños se reflejan? **Captura** comparativa.

---

### PASO 7: Verificar el editor

1. **Texto no estructurado**: Con el texto plano que escribiste, verificá que NO aparezca un botón "Grabar y agregar +" dentro del editor. Ese botón solo debe aparecer después de que el texto sea estructurado por la IA. **Captura**.

2. **Botón "Grabar y agregar +"**: Si por algún motivo aparece en texto plano, es un **BUG**. Reportalo.

---

### PASO 8: Verificar que el color del informe NO afecta la app

1. Abrí Configuración → verificá el color actual de la app (botones, header, acentos).
2. Cambiá el color de encabezado del informe en la configuración del PDF.
3. **El color de la app (botones, header) NO debe cambiar**. Si cambia, es un BUG CRÍTICO.
4. **Captura** comparativa: antes y después de cambiar el color del informe.

---

### FORMATO DEL INFORME

Entregá el informe con esta estructura:

```
## Informe de Auditoría — Transcriptor Pro (Flujo GIFT)
Fecha: [fecha]
URL: https://transcriptorpro.github.io/transcripcion/

### Resumen
- Total de problemas encontrados: X
- Críticos: X
- Moderados: X  
- Menores: X

### Problemas encontrados

#### [BUG-001] [CRÍTICO/MODERADO/MENOR] Título del problema
- **Dónde**: Paso X del wizard / Vista previa / Editor / etc.
- **Qué pasa**: Descripción exacta.
- **Qué debería pasar**: Comportamiento esperado.
- **Captura**: [adjuntar]

(repetir para cada problema)

### Funcionalidades que funcionan correctamente
- Lista de todo lo que SÍ funciona bien.

### Capturas de referencia
- Todas las capturas tomadas durante la auditoría.
```

**IMPORTANTE:**
- NO te saltees ningún paso.
- Tomá captura de ABSOLUTAMENTE TODO.
- Si algo no funciona, intentá de nuevo antes de reportar.
- La API Key de Groq NO es necesaria para esta auditoría, si te la pide saltéala.
- Sé extremadamente detallista. Cada píxel fuera de lugar, cada texto que no corresponde, cada elemento mal alineado debe ser reportado.
- Si encontrás un error, seguí probando el resto. No pares.
