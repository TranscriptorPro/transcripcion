# Prompt: Gestión de API Key y Contacto

Implementa el siguiente flujo para la gestión de la API key de Grok y el sistema de contacto en la aplicación. Responde siempre en español.

1. **Primer acceso del usuario**  
   - Al abrir la app por primera vez tras la compra, debe aparecer un cuadro para insertar la API key de Grok.
   - El usuario pegará la API key proporcionada por el administrador.
   - La app debe recordar la API key y no volver a pedirla, salvo que se detecte un problema.
   - El usuario no debe ver el cuadro de gestión de API key que utiliza el administrador para conectar y guardar la clave; ese cuadro es solo para el administrador.

2. **Gestión de la API key**  
   - Si hay problemas con la API key (por ejemplo, es inválida o expira), debe aparecer un mensaje indicando que contacte al soporte.
   - El usuario no debe tener acceso a la configuración ni a la gestión de la API key.

3. **Sistema de manejo de claves desde el dashboard de administrador**  
   - Crear un sistema en el dashboard de administrador para gestionar las API keys de los usuarios.
   - El administrador debe poder resetear o cambiar la API key de cualquier usuario de forma remota.
   - Los cambios realizados por el administrador deben aplicarse automáticamente en la app del usuario.

4. **Sistema de contacto para usuarios no administradores**  
   - La UI debe incluir un botón "Contacto".
   - Al hacer clic, se debe abrir un menú con opciones predefinidas (por ejemplo: problema con API, consulta general, sugerencia, etc.) y un cuadro de texto para que el usuario escriba su consulta si no está en las opciones.
   - Al enviar la consulta, el administrador debe recibirla y resolverla en un plazo de 24 a 48 horas.

Revisa el código existente relacionado con la gestión de API keys y el sistema de contacto, y asegúrate de que la implementación sea segura, eficiente y transparente para el usuario final.  
Responde siempre en español.
