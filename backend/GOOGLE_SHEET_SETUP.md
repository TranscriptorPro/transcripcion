# Google Sheet Setup - Transcriptor Médico Pro

## Instrucciones

1. Ir a [Google Sheets](https://sheets.google.com) y crear una nueva hoja de cálculo.
2. Nombrar la hoja **`Usuarios_Transcriptor`**.
3. En la primera fila, crear las siguientes columnas en orden:

## Columnas Requeridas

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `ID_Medico` | Texto | Identificador único | `DR001`, `DR002` |
| `Nombre` | Texto | Nombre completo | `Dr. Juan Pérez` |
| `Matricula` | Texto | Matrícula médica | `MN 12345` |
| `Email` | Texto | Email (único) | `juan@example.com` |
| `Especialidad` | Texto | Especialidad médica | `Cardiología` |
| `Plan` | Texto | Plan de suscripción | `trial`, `pro`, `enterprise` |
| `Estado` | Texto | Estado de la cuenta | `active`, `trial`, `expired`, `banned` |
| `Fecha_Registro` | Fecha | Fecha de registro | `2026-02-20` |
| `Fecha_Vencimiento` | Fecha | Fecha de vencimiento | `2026-02-27` |
| `Devices_Max` | Número | Máximo de dispositivos permitidos | `2`, `5`, `999` |
| `Devices_Logged` | JSON Array (Texto) | IDs de dispositivos conectados | `["dev123", "dev456"]` |
| `Usage_Count` | Número | Total de transcripciones realizadas | `0`, `15`, `342` |
| `Notas_Admin` | Texto | Notas del administrador | Campo opcional |

## Configuración de Apps Script

1. En la hoja de cálculo, ir a **Extensiones → Apps Script**.
2. Eliminar el código existente y pegar el contenido de `google_apps_script.js`.
3. Cambiar la constante `SHEET_NAME` al nombre de tu hoja si es diferente a `Usuarios_Transcriptor`.
4. Ir a **Implementar → Nueva implementación**.
5. Tipo: **Aplicación web**.
6. Ejecutar como: **Yo**.
7. Quién tiene acceso: **Cualquier persona, incluso anónima**.
8. Copiar la URL de la aplicación web generada.
9. Pegar esa URL en el campo `scriptUrl` de `admin_config.json`.

## Seguridad

- Cambiar el valor de `ADMIN_SECRET_2026` por una clave secreta aleatoria segura.
- **Nunca** guardar la clave real en el repositorio de GitHub.
- Considerar usar las propiedades del script de Apps Script para almacenar la clave:
  ```javascript
  PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  ```

## Datos de Ejemplo

Ver el archivo `sample_users.json` para ejemplos de datos de usuarios.
