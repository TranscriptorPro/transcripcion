# Prompt de Correcciones — Gift Clone E2E

> **Instrucción:** Eres un desarrollador senior. Lee los archivos indicados, comprende el contexto, y aplica EXACTAMENTE las correcciones descritas. No modifiques nada más.

---

## Contexto

Se ejecutó un test E2E exhaustivo del flujo Gift Clone de Transcriptor Pro (`tests/e2e-gift-clone-comprehensive.js`). El resultado fue **63/68 checks pasados**. Hay **1 bug real** y **3 mejoras de robustez** que necesitan corrección.

### Archivos que DEBES leer antes de empezar:
1. `src/js/features/businessFactorySetupUtils.js` — lógica de factory setup
2. `src/js/features/themeManager.js` — gestión de skins/temas
3. `REPORTE_GIFT_CLONE_E2E.md` — reporte completo con resultados

---

## BUG 1: `app_skin` no se persiste durante factory setup

**Archivo:** `src/js/features/businessFactorySetupUtils.js`  
**Línea ~279:** `localStorage.setItem('app_skin', 'default');`

### Problema:
Cuando un clon GIFT se configura por primera vez (via `?id=`), la línea que setea `app_skin = 'default'` en localStorage no se ejecuta. Esto causa que `themeManager.js` no encuentre un skin al inicializar, y el usuario puede ver un tema incorrecto o sin tema.

### Fix:
Asegurarse de que `localStorage.setItem('app_skin', 'default')` se ejecuta **siempre** al final de `handleFactorySetupCore()`, **fuera** de cualquier bloque `if` condicional. Debe ser una de las últimas operaciones, junto con los otros `localStorage.setItem()`. También verificar que la línea `appDB.set('app_skin', 'default')` en la línea ~280 se ejecuta.

### Verificación:
Después del fix, ejecutar:
```js
// En consola del navegador, tras cargar un clon:
console.log(localStorage.getItem('app_skin')); // debe ser "default"
```

---

## MEJORA 1: IDs semánticos para elementos de UI

**Archivos:** `index.html` + scripts que crean elementos dinámicamente

### Problema:
Varios elementos de la app no tienen IDs estáticos accesibles para testing:
- **Botón de contacto/soporte** → no tiene `id="btnContacto"` ni similar
- **Barra de tabs** → no tiene `id="tabBar"` ni clase `.tab-bar`
- **Buscar/Reemplazar** → no tiene `id="btnFindReplace"` ni `id="findReplaceBar"`
- **Botón de vista previa** → no tiene `id="togglePreviewBtn"` ni `id="btnPreview"`

### Fix:
Agregar atributos `id` o `data-testid` a estos elementos para hacerlos accesibles a tests automatizados:
```html
<!-- Ejemplo de IDs a agregar -->
<button id="btnContacto" ...>Contacto</button>
<div id="tabBar" ...>...</div>
<button id="btnFindReplace" ...>Buscar</button>
<button id="togglePreviewBtn" ...>Vista Previa</button>
```

Si los elementos se crean dinámicamente en JS, agregar el `id` en el código que los crea.

### Verificación:
```js
// Cada uno debe retornar un elemento:
document.getElementById('btnContacto');
document.getElementById('tabBar');
document.getElementById('btnFindReplace');
document.getElementById('togglePreviewBtn');
```

---

## MEJORA 2: Verificar que preview PDF muestra datos del profesional

**No es un bug**, pero se recomienda agregar un check en el flow de preview que confirme:
- Nombre del profesional aparece en el encabezado
- Matrícula visible
- Firma renderizada (si se configuró)
- Footer con datos del workplace

Buscar en los scripts que generan la vista previa del PDF (probablemente `script-07.js` o similar) y confirmar que se leen desde `localStorage`:
- `prof_data` → nombre, matrícula, especialidad
- `pdf_signature` → firma
- `pdf_logo` → logo
- `pdf_config` → footerText

---

## MEJORA 3: Log de factory setup para debugging

**Archivo:** `src/js/features/businessFactorySetupUtils.js`

Agregar un log al final de `handleFactorySetupCore()` que confirme qué valores se guardaron:
```js
console.log('[FactorySetup] Setup completado:', {
    medicoId: localStorage.getItem('medico_id'),
    type: JSON.parse(localStorage.getItem('client_config_stored') || '{}').type,
    skin: localStorage.getItem('app_skin'),
    workplaces: JSON.parse(localStorage.getItem('workplace_profiles') || '[]').length,
    hasFirma: !!localStorage.getItem('pdf_signature'),
    hasLogo: !!localStorage.getItem('pdf_logo')
});
```

---

## Resultado esperado post-correcciones

Ejecutar `node tests/e2e-gift-clone-comprehensive.js` y obtener **68/68 pass** (0 fail, 0 skip).

> **URL de producción para pruebas:** `https://transcriptorpro.github.io/transcripcion/`  
> **URL de clones:** `https://transcriptorpro.github.io/transcripcion/?id=<ID_MEDICO>`
