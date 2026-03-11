# Plan de Fragmentacion Segura (sin romper la app)

Objetivo: dividir archivos grandes de forma incremental, con rollback facil y sin romper runtime ni codificacion UTF-8.

## 1. Principios de seguridad
- No tocar logica funcional y estructura en el mismo commit.
- Separar por fases: mover, cablear imports, validar, recien luego borrar original.
- Cada fase: build + tests + smoke manual basico.
- Commits pequenos y reversibles.
- Mantener UTF-8 sin BOM en todos los archivos JS/HTML/CSS.
- Evitar herramientas que reescriban encoding automaticamente.

## 2. Carpeta de trabajo segura
- Usar carpeta temporal para extracciones: `anexos/workbench_fragmentacion/`.
- Nunca editar primero el archivo original para cortes grandes.
- Copiar bloques al workbench, validar, y luego insertar en `src/`.

## 3. Orden de fragmentacion recomendado
1. Identificar archivo grande candidato y dependencias.
2. Crear modulo nuevo en `src/js/...` con una sola pieza extraida.
3. Exportar API explicita (funciones/constantes).
4. Reemplazar en el original con import + llamada al modulo nuevo.
5. Mantener compatibilidad temporal (wrappers) cuando haga falta.
6. Validar build/tests.
7. Repetir con el siguiente bloque.
8. Cuando todo este estable, eliminar codigo duplicado del original.

## 4. Criterios de corte (para no romper)
- Cortar por fronteras naturales: utilidades puras, handlers de UI, renderizadores.
- Evitar cortar funciones que dependen de mucho estado global en la primera pasada.
- Si hay estado global, encapsular en objeto contexto antes de extraer.

## 5. Checklist por cada sub-paso
- [ ] Build OK (`node build.js`)
- [ ] Tests OK (`node tests/run_tests.js`)
- [ ] App abre y transcribe
- [ ] Preview y exportes siguen funcionando
- [ ] No hay errores de consola
- [ ] Sin cambios de encoding (UTF-8)

## 6. Estrategia de rollback
- Un commit por sub-paso.
- Si falla algo: revertir solo ese commit, no rehacer todo.
- Nunca mezclar refactor + feature en el mismo commit.

## 7. Archivos de alto riesgo (prioridad de cuidado)
- `src/js/features/editor.js`
- `src/js/features/pdfPreview.js`
- `src/js/features/pdfMaker.js`
- `src/js/features/business.js`
- `src/js/features/formHandler.js`

## 8. Regla final
- No borrar archivo original grande hasta tener equivalencia funcional comprobada.
- Borrado solo despues de una pasada completa de build/tests y validacion manual.
