# Plan para función de estructuración automática de informes escritos

## Objetivo
Agregar una función en la app (sidebar, solo usuarios pro) que permita copiar/pegar o subir informes médicos no estructurados. El modelo Groq debe inferir automáticamente la plantilla adecuada y estructurar el texto según el formato estándar de la app, sin intervención manual del usuario.

---

## Flujo propuesto

1. **UI/UX**
   - Botón en el sidebar: "Estructurar informe escrito" (solo usuarios pro).
   - Modal/panel:
     - Campo para pegar texto o subir archivo (.txt, .docx, .pdf).
     - Botón "Estructurar".

2. **Procesamiento IA**
   - El usuario sube el texto sin indicar la plantilla.
   - El modelo debe:
     - Inferir la plantilla correcta (de la lista de plantillas de la app).
     - Estructurar el texto según el formato JSON estándar de esa plantilla.
     - Detectar campos clave, resultados, conclusiones, etc.

3. **Validación**
   - Mostrar el resultado estructurado en una vista previa editable (identoco a como se hace con los textos transcriptos a partir de audios)
   - Permitir corrección manual antes de guardar. (identico a como se hace con los textos transcriptos a partir de audios)

4. **Guardado**
   - Al confirmar, guardar el informe estructurado en el sistema (igual que transcripciones).

5. **Batch/Importación**
   - Opcional: permitir subir varios archivos para estructuración masiva.

6. **Auditoría y métricas**
   - Registrar métricas de éxito/error para mejorar prompts y procesos.

7. **Restricción**
   - Solo visible para usuarios pro (verificación en frontend y backend).

---

## Requerimientos para el modelo IA

- Inferir la plantilla adecuada a partir del texto (sin ayuda del usuario).
- Estructurar el informe en formato JSON según la plantilla detectada.
- Detectar campos clave, resultados, conclusiones, etc.
- Manejar textos ambiguos o incompletos.
- Indicar si hay campos faltantes o dudas en la estructuración.

---

## Brainstorming para Claude Opus

1. ¿Cómo mejorar la inferencia de plantilla? ¿Qué señales o patrones usar?
2. ¿Cómo manejar informes ambiguos o con datos faltantes?
3. ¿Qué hacer si el texto corresponde a más de una plantilla?
4. ¿Cómo validar la calidad de la estructuración automática?
5. ¿Qué métricas de éxito/error serían útiles?
6. ¿Cómo optimizar el prompt para minimizar fallos?
7. ¿Qué ejemplos de input/output serían ideales para entrenar?
8. ¿Cómo manejar la importación masiva de archivos?
9. ¿Qué feedback pedir al usuario para mejorar el sistema?
10. ¿Cómo auditar y mejorar el proceso de inferencia y estructuración?

---

## Preguntas para profundizar

- ¿Qué nivel de precisión esperas en la inferencia de plantilla?
- ¿Prefieres que el modelo indique dudas o campos faltantes?
- ¿Qué formatos de archivo necesitas soportar?
- ¿Quieres métricas de calidad por plantilla?
- ¿Qué ejemplos de informes antiguos tienes para entrenar?
- ¿Cómo debe manejar el sistema los informes que no encajan en ninguna plantilla?

---

> Claude: Por favor, profundiza en los puntos del brainstorming, haz preguntas adicionales y sugiere mejoras para el flujo y el prompt. El objetivo es lograr una estructuración automática robusta y eficiente, sin intervención manual del usuario en la selección de plantilla.

---

## Referencia

- Listado de plantillas: ver LISTADO_PLANTILLAS.md
- Formato JSON estándar: ver ejemplos de la app

---

