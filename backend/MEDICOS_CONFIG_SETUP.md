# Configuración de la Hoja Medicos_Configuracion

## 📊 Estructura

Esta hoja almacena configuración detallada de cada médico.

### Columnas

1. **ID_Medico** (Text) - Clave primaria, vincula con Usuarios_Transcriptor
2. **Especialidades** (JSON) - Array: `["Neumología","Cardiología"]`
3. **Estudios** (JSON) - Array de objetos: `[{"nombre":"Espirometría","esp":"Neumología"}]`
4. **Lugares_Trabajo** (Text) - Separados por `\n`
5. **Logo_Medico_URL** (Text) - URL de Google Drive
6. **Firma_URL** (Text) - URL de Google Drive
7. **Logos_Instituciones** (JSON) - Array de URLs
8. **Config_PDF** (JSON) - Configuración personalizada
9. **Telefono** (Text) - Número de teléfono
10. **Fecha_Creacion** (Date) - Auto
11. **Fecha_Actualizacion** (DateTime) - Auto

## 🔧 Setup Manual

1. Abrir Google Sheet "Usuarios_Transcriptor"
2. Crear nueva hoja: Click en ➕ → Renombrar a `Medicos_Configuracion`
3. Agregar headers en fila 1:
   - A1: `ID_Medico`
   - B1: `Especialidades`
   - C1: `Estudios`
   - D1: `Lugares_Trabajo`
   - E1: `Logo_Medico_URL`
   - F1: `Firma_URL`
   - G1: `Logos_Instituciones`
   - H1: `Config_PDF`
   - I1: `Telefono`
   - J1: `Fecha_Creacion`
   - K1: `Fecha_Actualizacion`

## 🚀 Endpoints

- `GET ?action=get_medico_config&userId=DR001&adminKey=XXX`
- `GET ?action=save_medico_config&userId=DR001&configData={...}&adminKey=XXX`
- `GET ?action=delete_medico_config&userId=DR001&adminKey=XXX`

## ✅ Testing

```javascript
// Obtener config
const config = await API.getMedicoConfig('DR001');

// Guardar config
await API.saveMedicoConfig('DR001', {
    Especialidades: ['Neumología'],
    Estudios: [{ nombre: 'Espirometría', esp: 'Neumología' }],
    Lugares_Trabajo: 'Clínica ABC',
    Telefono: '+54 9 11 1234-5678'
});

// Eliminar config
await API.deleteMedicoConfig('DR001');
```

## ⚠️ Notas Importantes

- La hoja debe crearse **manualmente** en Google Sheets antes de deployar el script
- El script **NO** crea la hoja automáticamente
- Los campos JSON se almacenan como strings en la hoja
- El parsing/stringify es automático en los endpoints
- Los timestamps son automáticos (no enviar desde frontend)
