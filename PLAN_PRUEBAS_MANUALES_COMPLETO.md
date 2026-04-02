# 📋 PLAN DE PRUEBAS MANUALES — Transcriptor Médico Pro

**Objetivo:** Validar todos los flujos de la aplicación antes de cada release de producción.
**Tiempo estimado:** 90–120 minutos (completo) · 45 min (críticos solamente ★)
**Fecha de creación:** 2026-04-01
**Versión:** 1.0

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ★ | Test CRÍTICO — ejecutar siempre |
| ☐ | Checkbox de validación |
| ⚠️ | Requiere precondición |
| 🔁 | Repetir en otro navegador/dispositivo |

---

## PARTE 1 — REGISTRO Y ONBOARDING

### 1.1 ★ Registro Plan NORMAL
**URL:** `recursos/registro.html`

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Abrir formulario de registro | Steps bar visible (7 pasos), pricing cards cargadas | ☐ |
| 2 | Seleccionar plan **Normal** | Card resaltada, botón "Siguiente" habilitado | ☐ |
| 3 | Completar datos: Nombre, Matrícula, Email, Teléfono | Campos validan formato | ☐ |
| 4 | Seleccionar especialidades | Grid de estudios se actualiza según especialidad | ☐ |
| 5 | Configurar lugar de trabajo | Campos de institución, dirección, logo | ☐ |
| 6 | Subir firma (PNG) | Preview visible | ☐ |
| 7 | Paso Carrito — verificar que extras aparecen | Dispositivos extra, plantillas, branding | ☐ |
| 8 | Paso Resumen — verificar precios | Pago único + suscripción mensual correctos | ☐ |
| 9 | Enviar registro | Loader + paso 7 éxito: "Registro enviado" | ☐ |
| 10 | Verificar email de transferencia | Email con datos bancarios y QR | ☐ |
| 11 | Portal de pago visible (QR + alias) | Tabs ARS/USD, datos bancarios correctos | ☐ |
| 12 | Subir comprobante de pago | Upload exitoso, estado → "comprobante_recibido" | ☐ |

### 1.2 Registro Plan PRO
Repetir pasos 1.1 seleccionando plan **Pro**.

| # | Verificación adicional | ☐ |
|---|------------------------|---|
| 1 | Badge "⭐ Más popular" visible | ☐ |
| 2 | Logo profesional habilitado (no bloqueado) | ☐ |
| 3 | Plantillas: "Todas las de tu especialidad" | ☐ |
| 4 | Dispositivos base: 3 | ☐ |
| 5 | Lugares de trabajo base: 2 | ☐ |

### 1.3 Registro Plan CLÍNICA
Repetir pasos 1.1 seleccionando plan **Clínica**.

| # | Verificación adicional | ☐ |
|---|------------------------|---|
| 1 | Sección "Profesionales del equipo" visible en paso 3 | ☐ |
| 2 | Puede agregar hasta 5 profesionales | ☐ |
| 3 | Dispositivos base: 5 | ☐ |
| 4 | PDF con logo + firma + color | ☐ |
| 5 | Historial ilimitado | ☐ |

### 1.4 Selector de moneda

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Cambiar a ARS | Precios se actualizan a pesos | ☐ |
| 2 | Cambiar a USD | Precios vuelven a dólares | ☐ |

### 1.5 Email duplicado (Edge Case)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Registrar con email ya existente | Error: "Ya existe un registro pendiente con este email" | ☐ |

---

## PARTE 2 — PANEL DE ADMINISTRACIÓN

### 2.1 ★ Login Admin
**URL:** `recursos/login.html`

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Login con credenciales válidas | Redirige a admin.html, token generado | ☐ |
| 2 | Login con contraseña incorrecta | Error: "Usuario o contraseña incorrectos" | ☐ |
| 3 | Login con cuenta deshabilitada | Error: "Cuenta deshabilitada" | ☐ |
| 4 | Token expira después de 8h | Al refrescar → redirige a login | ☐ |

### 2.2 ★ Gestión de Registros Pendientes
**Tab:** Registros

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver lista de registros pendientes | Tabla con datos del profesional | ☐ |
| 2 | Ver imágenes del registro (firma, logo) | Previsualización desde Drive | ☐ |
| 3 | **Marcar pago** (💳) | Estado → "pago_confirmado" | ☐ |
| 4 | Ver comprobante subido por el usuario | Imagen/PDF visible | ☐ |

### 2.3 ★ Aprobación de Usuario

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Click "✅ Aprobar" en registro pagado | Modal con campos editables | ☐ |
| 2 | Verificar: Nombre, Email, Plan, Devices_Max | Pre-rellenados desde registro | ☐ |
| 3 | Ingresar API Key válida (gsk_...) | Campo acepta la key | ☐ |
| 4 | Confirmar aprobación | Success: usuario creado, ID_Medico generado | ☐ |
| 5 | Verificar en tab "Usuarios" | Usuario aparece inmediatamente | ☐ |
| 6 | Email de bienvenida enviado | Verificar casilla del usuario | ☐ |

### 2.4 Rechazo de Registro

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Click "❌ Rechazar" | Modal pide motivo | ☐ |
| 2 | Ingresar motivo y confirmar | Estado → "rechazado" | ☐ |

### 2.5 ★ Gestión de Usuarios

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver lista completa de usuarios | Tabla con ID, Nombre, Plan, Estado | ☐ |
| 2 | Editar usuario (Plan, Estado) | Cambios guardados | ☐ |
| 3 | Liberar dispositivos | Devices_Logged → [] | ☐ |
| 4 | Crear usuario manual | Validación, usuario en lista | ☐ |
| 5 | Eliminar usuario de prueba | Confirmación → eliminado | ☐ |
| 6 | Generar config.js para clon | JSON correcto | ☐ |

### 2.6 Solicitudes de Compra (Upgrades)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver lista de compras pendientes | Tabla con datos | ☐ |
| 2 | Marcar pago de compra | Estado → pago_confirmado | ☐ |
| 3 | Aprobar compra | Plan/templates actualizados | ☐ |

### 2.7 Solicitudes de Soporte

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver solicitudes pendientes | Lista visible | ☐ |
| 2 | Marcar como resuelto | Estado cambia | ☐ |

### 2.8 Logs y Estadísticas

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver Admin_Logs | Lista de acciones recientes | ☐ |
| 2 | Filtrar por fecha y tipo | Filtrado funciona | ☐ |
| 3 | Ver estadísticas globales | Totales correctos | ☐ |
| 4 | Ver métricas de un usuario | Transcripciones, palabras | ☐ |
| 5 | Limpiar logs | Logs borrados, cabecera permanece | ☐ |

### 2.9 Configuración de Planes y Precios

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Editar precios de un plan | Guardado en Script Properties | ☐ |
| 2 | Editar precios de addons | Reflejado en registro | ☐ |
| 3 | Editar datos de pago (alias, CBU) | Visible en portal de pago | ☐ |

---

## PARTE 3 — VALIDACIÓN Y LÍMITE DE DISPOSITIVOS

### 3.1 ★ Plan NORMAL (max 1 dispositivo)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Login en navegador principal | ✅ Acceso permitido | ☐ |
| 2 | Verificar Devices_Logged en Sheets | ["device1"] | ☐ |
| 3 | Login mismo ID en pestaña incógnito | ❌ "Límite de dispositivos alcanzado" | ☐ |
| 4 | Liberar dispositivos desde admin | Devices_Logged → [] | ☐ |
| 5 | Re-login en nuevo dispositivo | ✅ Acceso restaurado | ☐ |

### 3.2 ★ Plan PRO (max 3 dispositivos)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Login en dispositivo 1, 2, 3 | ✅ Todos OK | ☐ |
| 2 | Login en dispositivo 4 | ❌ DEVICE_LIMIT | ☐ |

### 3.3 Plan ENTERPRISE (max 999)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Login en múltiples dispositivos | ✅ Sin límite práctico | ☐ |

### 3.4 ★ Expiración de Trial/Plan

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Usuario con Fecha_Vencimiento pasada | Error EXPIRED | ☐ |
| 2 | Estado cambia automáticamente a "expired" | ☐ |
| 3 | Renovar fecha → re-login | ✅ Acceso restaurado | ☐ |

### 3.5 Estado de cuenta

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Estado=banned → login | Error: "Cuenta suspendida" | ☐ |
| 2 | Estado=inactive → login | Error: "Cuenta desactivada" | ☐ |

---

## PARTE 4 — TRANSCRIPCIÓN DE AUDIO

### 4.1 ★ Flujo básico
⚠️ Precondición: usuario logueado con API Key válida

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Subir archivo de audio (.mp3/.wav/.m4a) | Archivo en lista, estado "pending" | ☐ |
| 2 | Click "Transcribir" | Progreso visible, texto generado | ☐ |
| 3 | Verificar texto transcrito | Texto legible | ☐ |
| 4 | Múltiples archivos | Transcripción en lote funciona | ☐ |

### 4.2 Grabar audio en vivo

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Click "Grabar" | Indicador activo, timer visible | ☐ |
| 2 | Hablar y detener | Audio en lista | ☐ |
| 3 | Transcribir audio grabado | Texto correcto | ☐ |

### 4.3 Errores de API Key

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Sin API Key | Toast: "Configurá tu API Key" | ☐ |
| 2 | Key inválida (no gsk_) | Toast: "API Key inválida" | ☐ |
| 3 | Key expirada (admin) | Toast + botón "⚙️ Configurar" | ☐ |
| 4 | Key expirada (usuario) | Toast + botón "📧 Contactar" | ☐ |

### 4.4 Transcribir y Estructurar (un paso)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Click "Transcribir y Estructurar" | Ambos procesos en secuencia | ☐ |

---

## PARTE 5 — ESTRUCTURACIÓN CON PLANTILLAS

### 5.1 ★ Estructuración automática (IA — PRO/CLINIC)
⚠️ Precondición: texto transcrito, plan PRO+

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Seleccionar plantilla (ej: Espirometría) | Campos definidos cargados | ☐ |
| 2 | Click "Estructurar" | IA llena campos desde texto | ☐ |
| 3 | Verificar campos | Datos médicos correctos | ☐ |
| 4 | Detección automática de plantilla | Toast: "Plantilla detectada: <Nombre>" | ☐ |

### 5.2 Estructuración manual (NORMAL)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Modo manual: editar campo por campo | Modal abre | ☐ |
| 2 | Tab "Grabar" oculto/bloqueado | No permite grabar sobre texto | ☐ |
| 3 | Botón "Dejar en blanco" | Campo se vacía | ☐ |

### 5.3 Plantillas por plan

| Plan | Plantillas esperadas | ☐ |
|------|---------------------|---|
| NORMAL | 3 a elección (allowed_templates) | ☐ |
| PRO | Todas las de su especialidad | ☐ |
| CLINIC | 3 packs completos | ☐ |
| GIFT / ENTERPRISE | Todas | ☐ |

**Muestra representativa a probar:**

| Especialidad | Plantilla | ☐ |
|-------------|-----------|---|
| Neumología | Espirometría | ☐ |
| Cardiología | Ecocardiograma TT (ETT) | ☐ |
| Cardiología | Holter / ECG | ☐ |
| Imágenes | Eco-Doppler / TAC | ☐ |
| Endoscopía | Colonoscopía | ☐ |
| Oftalmología | Campimetría | ☐ |
| General | Nota de Evolución / Epicrisis | ☐ |
| Quirúrgico | Protocolo Quirúrgico | ☐ |

---

## PARTE 6 — EDITOR DE INFORME

### 6.1 ★ Editor de campos

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Click en campo → modal de edición | Nombre del campo visible | ☐ |
| 2 | Editar texto | Cambios en preview | ☐ |
| 3 | "Dejar en blanco" | Campo vacío | ☐ |
| 4 | Buscar/reemplazar | Funcional | ☐ |
| 5 | Snapshots (guardar/restaurar) | Funcional | ☐ |

### 6.2 Copiar y Exportar

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Copiar al portapapeles | Texto copiado | ☐ |
| 2 | Imprimir (Ctrl+P) | Preview de impresión correcto | ☐ |

### 6.3 Editor en mobile 🔁

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Layout responsive | Campos accesibles | ☐ |
| 2 | Modal en mobile | Sin overflow | ☐ |
| 3 | Tabs con scroll horizontal | Funcional | ☐ |

---

## PARTE 7 — GENERACIÓN DE PDF

### 7.1 ★ PDF básico

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | "Descargar PDF" | PDF descarga | ☐ |
| 2 | Contenido del PDF | Datos correctos | ☐ |
| 3 | Encabezado | Logo + institución (si aplica) | ☐ |
| 4 | Firma | Visible | ☐ |
| 5 | Pie de página | Matrícula, contacto | ☐ |

### 7.2 PDF con branding (PRO/CLINIC)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Logo de institución en header | ☐ |
| 2 | Color de encabezado personalizado | ☐ |
| 3 | Firma + logo profesional | ☐ |

### 7.3 Envío por email

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Enviar PDF por email | Recibido con adjunto | ☐ |
| 2 | Nombre remitente correcto | Nombre del médico | ☐ |

---

## PARTE 8 — HISTORIAL, PACIENTES, DICCIONARIO

### 8.1 ★ Historial de informes

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Guardar informe | Aparece en historial | ☐ |
| 2 | Abrir desde historial | Datos restaurados | ☐ |
| 3 | Límite por plan | NORMAL:10, PRO:30, CLINIC:∞ | ☐ |
| 4 | Persistencia tras cerrar browser | Datos en IndexedDB | ☐ |

### 8.2 Registro de pacientes

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Crear paciente | Guardado | ☐ |
| 2 | Buscar (autocompletar) | Funciona | ☐ |
| 3 | Editar datos | Cambios guardados | ☐ |

### 8.3 Diccionario médico

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Agregar término | Guardado | ☐ |
| 2 | Términos en Whisper prompt | Incluidos en transcripción | ☐ |

---

## PARTE 9 — SETTINGS Y TEMAS

### 9.1 ★ Panel de configuración

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Cambiar datos del profesional | Reflejados en PDF | ☐ |
| 2 | Cambiar lugar de trabajo | Reflejado en PDF | ☐ |
| 3 | Configurar API Key | Key guardada | ☐ |
| 4 | Cambiar tema (Cyberpunk, Light Minimal) | UI actualiza | ☐ |

### 9.2 Perfiles de salida

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Crear perfil | Guardado | ☐ |
| 2 | Cambiar entre perfiles | PDF cambia | ☐ |
| 3 | Límite por plan | NORMAL:1, PRO:3, CLINIC:∞ | ☐ |

---

## PARTE 10 — ASISTENTE IA Y CONTACTO

### 10.1 Session Assistant (PRO/CLINIC)

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Abrir asistente | Panel disponible | ☐ |
| 2 | Hacer consulta | Respuesta IA | ☐ |
| 3 | NORMAL sin acceso | Bloqueado/oculto | ☐ |

### 10.2 Contacto/soporte

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Abrir modal contacto | Motivos predefinidos | ☐ |
| 2 | Enviar solicitud | Guardada en Sheets | ☐ |
| 3 | Visible en admin → Soporte | Pendiente | ☐ |

---

## PARTE 11 — PWA

### 11.1 ★ Instalabilidad

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Chrome muestra opción instalar | Botón visible | ☐ |
| 2 | Instalar app | Abre standalone | ☐ |
| 3 | manifest.json correcto | Nombre, iconos, start_url | ☐ |
| 4 | Iconos 192 y 512 cargan | Sin errores | ☐ |

### 11.2 ★ Offline

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Desconectar internet | App abre desde caché | ☐ |
| 2 | Navegar offline | UI funciona | ☐ |
| 3 | Transcribir offline | Error amigable | ☐ |
| 4 | Reconectar → transcribir | Funciona | ☐ |

### 11.3 Service Worker

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | F12 → Application → SW | Registrado y activo | ☐ |
| 2 | Cache Storage | App shell cacheado | ☐ |
| 3 | Nuevo deploy | SW se actualiza | ☐ |

---

## PARTE 12 — FLUJOS ESPECIALES

### 12.1 ★ Plan GIFT

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Crear usuario GIFT desde admin | PRO, 10 devices, todas plantillas | ☐ |
| 2 | Login | Acceso completo | ☐ |
| 3 | Funciones PRO disponibles | IA, asistente, branding | ☐ |

### 12.2 Plan TRIAL

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Crear TRIAL 15 días | Acceso completo | ☐ |
| 2 | days_remaining correcto | En response de validate | ☐ |
| 3 | Simular expiración | Error EXPIRED | ☐ |

### 12.3 Upgrade de plan

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | NORMAL solicita upgrade a PRO | Solicitud en Compras_Pendientes | ☐ |
| 2 | Email con datos de transferencia | Recibido | ☐ |
| 3 | Admin marca pago → aprueba | Plan actualizado | ☐ |
| 4 | Purchase_Message al usuario | Toast de confirmación | ☐ |

### 12.4 Clínica — Staff

| # | Acción | Resultado esperado | ☐ |
|---|--------|--------------------|---|
| 1 | Ver lista staff | Admin + profesionales | ☐ |
| 2 | Validar clave admin | Login correcto | ☐ |
| 3 | Agregar profesional | Staff creado con PIN | ☐ |
| 4 | Actualizar PIN | Cambiado | ☐ |
| 5 | Desactivar profesional | Activo=false | ☐ |
| 6 | Reset admin pass por DNI | Pass → "clinica" | ☐ |
| 7 | Reset PIN pro por DNI+matrícula | PIN → "1234" | ☐ |

---

## PARTE 13 — SEGURIDAD Y VALIDACIONES

### 13.1 ★ Autenticación

| # | Verificar | ☐ |
|---|-----------|---|
| 1 | Endpoints admin sin auth → "Unauthorized" | ☐ |
| 2 | Token expirado → rechazado | ☐ |
| 3 | ADMIN_KEY en Script Properties (no hardcoded) | ☐ |
| 4 | Email de registro validado (@) | ☐ |
| 5 | Telemetría: max 20 errores por batch | ☐ |
| 6 | Drive: archivos con link, no público | ☐ |

---

## PARTE 14 — GOOGLE SHEETS (Datos)

### 14.1 ★ Integridad

| # | Hoja | Verificar | ☐ |
|---|------|-----------|---|
| 1 | Usuarios | ID_Medico único, Plan, Devices_Max | ☐ |
| 2 | Usuarios | Email lowercase, Telefono sin #ERROR! | ☐ |
| 3 | Registros_Pendientes | Estados correctos | ☐ |
| 4 | Registros_Pendientes | ID_Medico_Asignado conecta | ☐ |
| 5 | Admin_Logs | Timestamp, Accion completos | ☐ |
| 6 | Metricas_Uso | Filas por transcripción | ☐ |
| 7 | Dispositivos | Ultima_Conexion actualizada | ☐ |
| 8 | Compras_Pendientes | Flujo de estados | ☐ |
| 9 | Solicitudes_Soporte | Motivo y estado | ☐ |
| 10 | Clinic_Staff | Roles correctos | ☐ |

---

## PARTE 15 — RESPONSIVE Y CROSS-BROWSER 🔁

### Desktop

| Navegador | ☐ |
|-----------|---|
| Chrome (último) | ☐ |
| Firefox (último) | ☐ |
| Edge (último) | ☐ |

### Mobile

| Dispositivo | ☐ |
|------------|---|
| Chrome Android | ☐ |
| Safari iOS | ☐ |

### Puntos críticos mobile

| # | Verificar | ☐ |
|---|-----------|---|
| 1 | Sin overflow horizontal | ☐ |
| 2 | Modales se cierran | ☐ |
| 3 | Botones sin hover | ☐ |
| 4 | Teclado no oculta inputs | ☐ |

---

## PARTE 16 — CONSOLA

### ★ Sin errores JS

| Página | Sin errores | ☐ |
|--------|------------|---|
| index.html | ☐ |
| recursos/registro.html | ☐ |
| recursos/admin.html | ☐ |
| recursos/login.html | ☐ |
| recursos/manual.html | ☐ |

---

## RESUMEN

| Parte | Tests | Prioridad |
|-------|-------|-----------|
| 1. Registro | 16+ | ★ Alta |
| 2. Admin | 30+ | ★ Alta |
| 3. Dispositivos | 12 | ★ Crítica |
| 4. Transcripción | 10 | ★ Alta |
| 5. Estructuración | 10 | ★ Alta |
| 6. Editor | 8 | Media |
| 7. PDF | 8 | ★ Alta |
| 8. Historial/Pacientes | 8 | Media |
| 9. Settings | 8 | Media |
| 10. Asistente/Contacto | 6 | Media |
| 11. PWA | 10 | ★ Alta |
| 12. Flujos especiales | 16 | ★ Alta |
| 13. Seguridad | 6 | ★ Crítica |
| 14. Google Sheets | 10 | ★ Alta |
| 15. Responsive | 8 | Media |
| 16. Consola | 5 | ★ Alta |

**Total: ~175 tests manuales**
**Mínimo por release (solo ★): ~90 tests, ~45 min**

---

## NOTAS

- **Datos de prueba:** Usar `prueba.YYYYMMDD.NNN@testpro.demo`
- **Limpieza:** `admin_delete_test_users` para borrar usuarios test
- **Sheets:** Verificar directamente en el spreadsheet
- **Capturas:** Screenshots de cada parte como evidencia
- **Regresiones:** Anotar exactamente qué se ve si algo falla
