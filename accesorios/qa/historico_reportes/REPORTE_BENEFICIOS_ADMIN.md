# Reporte de Diagnóstico: Configuración de Beneficios en el Panel de Administración

## Estado Actual
He revisado a fondo el panel de administración (`recursos/admin.html`), la página de registro (`recursos/registro.html`), y la lógica subyacente (`src/js/features/pricingCart.js`). 

**Fallo Principal:** 
Actualmente **no existe** ninguna sección en el Panel de Administrador que permita configurar los beneficios, precios o características de los modos (Normal, Pro, Clínica) a tu antojo. Tampoco hay conexión dinámica con el formulario de registro.
1. En el **Panel de Admin**, solo se puede seleccionar qué plan *asignarle* a un usuario mediante un `select` estático, pero no se pueden editar los beneficios o precios que componen a cada plan.
2. En la ventana emergente de tarjetas y en la **Página de Registro** (`recursos/registro.html`), los beneficios y precios (p. ej., "3 dispositivos", "Hasta 3 perfiles", "$152.99", etc.) están **escritos de forma estática (hardcoded)** directamente en el HTML.
3. En el archivo `src/js/features/pricingCart.js`, los planes están configurados estáticamente en memoria (ej. `clinic: { order: 3, label: 'Clínica', ... }`).

## Requisitos para el Arreglo
Para lograr lo que pides, es necesario:
1. **Crear una nueva pestaña o sección** en el `admin.html` llamada "Configuración de Planes/Beneficios".
2. **Implementar lógica en el backend** (Apps Script) para guardar y leer un JSON con la configuración global de qué trae cada plan (nombre, precio, opciones, lista de beneficios).
3. **Modificar `registro.html` y `pricingCart.js`** para que hagan un fetch inicial (o lean del caché) la configuración de los planes desde el backend, y entonces dibujen (rendericen) dinámicamente las tarjetas de Normal, Pro y Clínica en base a las opciones configuradas a "tu antojo" por el administrador.

---

## Prompt para la otra IA

Copia y pega el siguiente prompt a la otra IA para que construya la característica:

> ¡Hola! Necesito que resuelvas un problema grave en la plataforma: Actualmente los planes y beneficios (Normal, Pro, Clínica) están hardcodeados tanto en el frontend (`recursos/registro.html` y `src/js/features/pricingCart.js`) como en la lógica del sistema. El usuario final requiere poder configurar los beneficios y características de cada plan a su antojo desde el **Panel de Administrador**, y que esto se refleje dinámicamente durante el registro y pagos.
> 
> **Tareas a realizar:**
> 1. **Modificar `recursos/admin.html`**: Agrega una nueva pestaña/sección llamada "Configuración de Beneficios". Debe tener formularios que permitan al administrador editar dinámicamente las características (texto), los precios, iconos y restricciones (pj. `maxDevices`) de los planes: NORMAL, PRO, GIFT, y CLINIC.
> 2. **Actualizar el Backend (Apps Script via `backend/admin_config.json` o endpoints)**: Añade los endpoints necesarios (`action=admin_get_plans_config` y `action=admin_save_plans_config`) para poder leer y guardar la configuración maestra de planes en la base de datos de Google Sheets de la app.
> 3. **Modificar `recursos/registro.html`**: Elimina las tarjetas de precios estáticas (HTML hardcodeado). Implementa un script que, al cargar la página, consulte la configuración de planes en el servidor y genere el DOM de las tarjetas (pricing-cards) con los precios, insignias y `<li class="feat-icon">` dinámicamente configurados desde el panel admin.
> 4. **Modificar `src/js/features/pricingCart.js`**: Reemplaza el objeto duro `const PLANS = { normal: {...}, pro: {...}, clinic: {...} }` para que provenga de la misma configuración global.
> 5. **Asegurar la retrocompatibilidad**: Mantén intactas las funciones o parámetros que usen los nombres de `pro`, `clinic`, etc., solo abstrae la visual y los beneficios otorgados.
> 
> Trabaja por pasos. Revisa la UI requerida para que se vea premium y acorde al resto del panel de admin. ¡Avisa cuando esté listo para probar!
