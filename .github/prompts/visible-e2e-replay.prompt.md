---
name: visible-e2e-replay
description: Ejecuta o diseña E2E visibles con evidencia paso a paso y reporte reproducible para este proyecto.
agent: agent
---

Usa este prompt cuando el objetivo sea correr o preparar un circuito E2E visible, monitoreable y con evidencia reproducible.

Reglas:

1. Prioriza navegador visible sobre headless salvo pedido explícito contrario.
2. Captura evidencia de pasos relevantes con screenshots ordenadas.
3. Si hay submit con backend asíncrono, mide tiempos y separa fallo de UI de latencia de backend.
4. Mantén una pausa final si el usuario quiere inspección visual del estado final.
5. Si el flujo toca uploads, usa archivos reales de ejemplo cuando existan.

Salida esperada:

1. Plan corto del circuito.
2. Ejecución o propuesta de script E2E.
3. Evidencia generada.
4. Diagnóstico final con tiempos, errores JS y estado visual.