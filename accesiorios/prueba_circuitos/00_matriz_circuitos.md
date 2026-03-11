# Matriz de Circuitos - Transcriptor Pro

Estado: plan inicial para pruebas end-to-end.
Escala usada:
- Riesgo: Bajo / Medio / Alto / Critico
- Prioridad: P1 (maxima) a P4 (baja)
- Tiempo estimado: tiempo de prueba manual por circuito

| ID | Circuito | Riesgo | Prioridad | Tiempo estimado | Estado |
|---|---|---|---|---|---|
| C01 | Inicializacion y estado base (IDLE) | Medio | P1 | 20 min | En curso |
| C02 | Persistencia de preferencias locales | Medio | P1 | 15 min | Pendiente |
| C03 | Autosave y restauracion de borrador | Alto | P1 | 25 min | Pendiente |
| C04 | Editor basico (formato, undo/redo) | Medio | P2 | 25 min | Pendiente |
| C05 | Buscar y reemplazar | Bajo | P3 | 15 min | Pendiente |
| C06 | Copiar al portapapeles | Bajo | P3 | 10 min | Pendiente |
| C07 | Tabs (crear/cambiar/cerrar) | Medio | P2 | 20 min | Pendiente |
| C08 | Datos de paciente manuales | Medio | P1 | 20 min | Pendiente |
| C09 | Registro de pacientes CRUD | Alto | P1 | 35 min | Pendiente |
| C10 | Import/Export de pacientes (JSON/CSV) | Alto | P1 | 30 min | Pendiente |
| C11 | Ingreso de texto pegado/manual | Medio | P2 | 20 min | Pendiente |
| C12 | Carga de texto desde archivo | Medio | P2 | 20 min | Pendiente |
| C13 | Grabacion de audio local | Alto | P1 | 25 min | Pendiente |
| C14 | Carga de audios por archivos | Alto | P1 | 25 min | Pendiente |
| C15 | Preprocesado de audio | Medio | P2 | 20 min | Pendiente |
| C16 | Transcripcion simple (1 archivo) | Critico | P1 | 30 min | Pendiente |
| C17 | Transcripcion batch (multiarchivo) | Critico | P1 | 40 min | Pendiente |
| C18 | Reintentos y recuperacion de transcripcion | Critico | P1 | 45 min | Pendiente |
| C19 | Auto deteccion de plantilla | Alto | P1 | 30 min | Pendiente |
| C20 | Estructuracion IA estandar | Critico | P1 | 40 min | Pendiente |
| C21 | Fallback no medico + warning contextual | Alto | P1 | 25 min | Pendiente |
| C22 | Edicion de campos vacios [No especificado] | Alto | P1 | 35 min | Pendiente |
| C23 | Vista original/estructurada/comparacion | Alto | P1 | 30 min | Pendiente |
| C24 | Vista previa de impresion | Critico | P1 | 30 min | Pendiente |
| C25 | Exportaciones PDF/RTF/TXT/HTML | Critico | P1 | 40 min | Pendiente |
| C26 | Envio por email desde preview | Alto | P1 | 35 min | Pendiente |
| C27 | Gestion de profesionales y workplaces | Critico | P1 | 45 min | Pendiente |
| C28 | Visibilidad de contacto/redes en informe | Alto | P1 | 30 min | Pendiente |
| C29 | Onboarding primer uso cliente | Alto | P1 | 30 min | Pendiente |
| C30 | Flujo clone/factory setup por ID | Critico | P1 | 60 min | Pendiente |
| C31 | Gestion de usuarios/licencias admin | Critico | P1 | 60 min | Pendiente |
| C32 | Resiliencia de API keys y pendientes | Critico | P1 | 45 min | Pendiente |
| C33 | PWA (install, manifest, service worker) | Alto | P2 | 35 min | Pendiente |
| C34 | E2E de negocio completo (alta a informe final) | Critico | P1 | 90 min | Pendiente |

## Orden de ejecucion sugerido
1. C01-C03
2. C04-C12
3. C13-C18
4. C19-C23
5. C24-C28
6. C29-C34

## Regla de avance
- No avanzar al siguiente circuito si el actual tiene bloqueo P1 sin workaround documentado.
- Registrar evidencia minima por paso (captura o nota con hora y resultado).
