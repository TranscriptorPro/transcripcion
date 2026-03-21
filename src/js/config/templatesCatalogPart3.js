// ============ MEDICAL TEMPLATES PART 3 ============

Object.assign(window.MEDICAL_TEMPLATES, {
    holter: {
        name: "Holter ECG",
        category: "Cardiología",
        keywords: ["Holter", "ECG", "24 horas", "arritmia", "extrasístoles", "FC media", "variabilidad"],
        prompt: `Actúa como cardiólogo electrofisiólogo. Estructura este informe de Holter ECG:

# INFORME DE HOLTER ECG

## FRECUENCIA CARDÍACA
FC media, FC máxima (hora), FC mínima (hora), variabilidad de la FC (SDNN si fue dictado).

## ECTOPÍA VENTRICULAR
Número de extrasístoles ventriculares (EV), morfología predominante, formas complejas (pares, tripletes, TV no sostenida/sostenida), o s/p.

## ECTOPÍA SUPRAVENTRICULAR
Número de extrasístoles supraventriculares (ESV), episodios de TSV (número, duración máxima, FC máxima), FA/Flutter si detectados, o s/p.

## SEGMENTO ST
Episodios de cambios del ST (depresión/elevación ≥ 1 mm, duración, correlación con síntomas/FC), o s/p.

## PAUSAS
Pausas ≥ 2 s (número, duración máxima), o s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos (patológicos o significativos). Si el estudio es completamente normal, escribir exactamente: "Estudio Holter dentro de límites normales."

REGLA DE CONCLUSIÓN: Párrafo conciso que incluya TODOS los hallazgos arrítmicos dictados. No incluir frecuencias cardíacas si son normales. PROHIBIDO: inventar cifras, episodios o datos no dictados. PROHIBIDO: frases de carencia ("aunque no se especificó...", "si bien falta...").
IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si una sección no fue mencionada, omitirla o marcar con [No especificado].`
    },
    mapa: {
        name: "MAPA (Presión Arterial)",
        category: "Cardiología",
        keywords: ["MAPA", "presión arterial ambulatoria", "monitoreo", "carga tensional", "dipping", "HTA"],
        prompt: `Actúa como cardiólogo especializado en hipertensión. Estructura este informe de MAPA:

# INFORME DE MAPA (MONITOREO AMBULATORIO DE PRESIÓN ARTERIAL)

## MEDIDAS GLOBALES
PA sistólica media 24h, PA diastólica media 24h, FC media 24h. Número total de medidas/medidas válidas.

## CICLO CIRCADIANO
PA media diurna (sistólica/diastólica), PA media nocturna, patrón Dipping (dipper/non-dipper/riser).

## CONCLUSIÓN
Diagnóstico de HTA (controlada/no controlada), patrón circadiano y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    cinecoro: {
        name: "Cinecoronariografía",
        category: "Cardiología",
        keywords: ["cinecoronariografía", "coronarias", "coronariografía", "stent", "estenosis", "angioplastia", "ventriculografía"],
        prompt: `Actúa como cardiólogo intervencionista. Estructura este informe de cinecoronariografía aplicando el formato por vaso con s/p:

# INFORME DE CINECORONARIOGRAFÍA

## ACCESO
Vía de acceso, tipo de catéter.

## VENTRICULOGRAFÍA
FEVI, motilidad segmentaria, presiones.

## TCI — TRONCO CORONARIO IZQUIERDO
Hallazgos o s/p

## DA — DESCENDENTE ANTERIOR
Hallazgos (lesiones, estenosis %) o s/p. Incluir diagonales si fueron evaluadas.

## CX — CIRCUNFLEJA
Hallazgos (lesiones, estenosis %) o s/p. Incluir marginales si fueron evaluadas.

## CD — CORONARIA DERECHA
Hallazgos (lesiones, estenosis %, dominancia) o s/p. Incluir ramas si fueron evaluadas.

## CONCLUSIÓN
Mencionar SOLO los vasos con lesiones significativas, tipo de enfermedad (uni/bi/trivascular) y recomendación terapéutica. No repetir vasos sin lesiones.

REGLA DE CONCLUSIÓN: Estructura la conclusión en un párrafo corto siguiendo este orden: (1) tipo de enfermedad coronaria (ej: "Enfermedad coronaria univascular/bivascular/trivascular"), (2) TODOS los vasos que tengan cualquier lesión mencionada, cada uno UNA SOLA VEZ con su localización y porcentaje de estenosis — sin importar si la lesión es significativa o no, si fue dictada debe aparecer. NO omitas ningún vaso con lesión. NO repitas el mismo dato dos veces. PROHIBIDO: inventar valores o datos que no estén en la transcripción. PROHIBIDO: indicar tratamientos concretos (stent, CABG, medicación) si el médico no los mencionó explícitamente.
IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si un vaso no fue evaluado ni mencionado, omitir su sección o marcar con [No especificado].`
    },
    ecg: {
        name: "ECG",
        category: "Cardiología",
        keywords: ["ECG", "electrocardiograma", "ritmo sinusal", "QRS", "PR", "QTc", "bloqueo"],
        prompt: `Actúa como cardiólogo especializado. Estructura este informe de ECG:

# INFORME DE ELECTROCARDIOGRAMA (ECG)

## PARÁMETROS BÁSICOS
Ritmo, Frecuencia cardíaca, Eje eléctrico.

## INTERVALOS Y DURACIÓN
PR (ms), QRS (ms), QT (ms), QTc (ms).

## ANÁLISIS DE ONDAS
Onda P, complejo QRS, segmento ST, onda T, onda U (si aplica).

## CONCLUSIÓN
Diagnóstico electrocardiográfico.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── GINECOLOGÍA ─────────────────────────────────────────────
    pap: {
        name: "Papanicolaou (PAP)",
        category: "Ginecología",
        keywords: ["PAP", "Papanicolaou", "citología cervical", "Bethesda", "ASCUS", "LSIL", "HSIL"],
        prompt: `Actúa como citopatólogo especializado. Estructura este informe de Papanicolaou:

# INFORME DE PAPANICOLAOU (CITOLOGÍA CERVICAL)

## CALIDAD DE LA MUESTRA
Tipo de muestra, adecuación (satisfactoria/insatisfactoria), presencia de células endocervicales/zona de transformación.

## CLASIFICACIÓN BETHESDA
Categoría Bethesda asignada. Descripción del hallazgo (NILM, ASCUS, LSIL, HSIL, AGC, etc.).

## RECOMENDACIÓN
Conducta sugerida según hallazgos y antecedentes.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    colposcopia: {
        name: "Colposcopía",
        category: "Ginecología",
        keywords: ["colposcopía", "zona de transformación", "epitelio acetoblanco", "puntillado", "mosaico", "biopsia cervical"],
        prompt: `Actúa como ginecólogo especializado en colposcopía. Estructura este informe:

# INFORME DE COLPOSCOPÍA

## ZONA DE TRANSFORMACIÓN
Tipo de ZT (1, 2 o 3), visibilidad completa, adecuación del examen.

## HALLAZGOS COLPOSCÓPICOS
Descripción de: epitelio acetoblanco (grado, bordes), puntillado, mosaico, leucoplasia, vasos atípicos.

## BIOPSIA
Localización de biopsias tomadas (horaria), número de muestras.

## CONCLUSIÓN
Impresión colposcópica, grado de lesión sospechada (NIC 1/2/3) y plan de manejo.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── NEUROLOGÍA ──────────────────────────────────────────────
    electromiografia: {
        name: "Electromiografía (EMG)",
        category: "Neurología",
        keywords: ["electromiografía", "EMG", "conducción nerviosa", "potenciales evocados", "latencia", "amplitud", "velocidad de conducción"],
        prompt: `Actúa como neurofisiólogo clínico. Estructura este informe de electromiografía y conducción nerviosa.

REGLAS OBLIGATORIAS:
- Solo usa los datos dictados. No inventes latencias, amplitudes ni velocidades de conducción.
- CONDUCCIÓN NERVIOSA: incluir SOLO los nervios mencionados en la transcripción. Omitir los no evaluados.
- EMG DE AGUJA: incluir SOLO los músculos mencionados. Omitir los no evaluados.
- CONCLUSIÓN: indicar patrón (Normal / Axonal / Desmielinizante / Miopático), topografía y correlación clínica.
- Si todos los estudios son normales → escribir: 'Dentro de límites normales. Sin signos neurofisiológicos de denervación activa ni neuropatía.'
- NUNCA usar [No especificado] en la CONCLUSIÓN.

# INFORME DE ELECTROMIOGRAFÍA (EMG) Y CONDUCCIÓN NERVIOSA

## ESTUDIOS DE CONDUCCIÓN NERVIOSA
Por cada nervio evaluado: lateralidad, latencia distal (ms), amplitud (mV/μV), velocidad de conducción (m/s), latencia onda F (ms).
Solo incluir los nervios mencionados en la transcripción.

## ELECTROMIOGRAFÍA DE AGUJA
Por músculo evaluado: nombre y lateralidad, actividad espontánea (fibrilaciones / ondas positivas / ninguna), unidades motoras (morfología, amplitud, duración, polifasia), patrón de reclutamiento.
Solo incluir los músculos mencionados en la transcripción.

## POTENCIALES EVOCADOS
(Solo si fue dictado) Tipo, latencias periférica y central, amplitudes, comparación inter-lado.

## REGLA DE CONCLUSIÓN
• Si hay hallazgos patológicos → indicar TODOS: patrón (axonal/desmielinizante/miopático), topografía (nervio/músculo/nivel medular), correlación clínica.
• Si todos los estudios son normales → escribir exactamente: 'Dentro de límites normales. Sin signos neurofisiológicos de denervación activa ni neuropatía.'
• NUNCA usar [No especificado] en la CONCLUSIÓN.

## CONCLUSIÓN
Patrón neurofisiológico, topografía y correlación clínica (según REGLA DE CONCLUSIÓN).

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción.`
    },
    polisomnografia: {
        name: "Polisomnografía (PSG)",
        category: "Neurología",
        keywords: ["polisomnografía", "PSG", "IAH", "apnea del sueño", "SAHOS", "REM", "desaturación nocturna", "índice de apnea"],
        prompt: `Actúa como especialista en medicina del sueño. Estructura este informe de polisomnografía diagnóstica.

REGLAS OBLIGATORIAS:
- Solo usa los datos dictados. No inventes índices ni porcentajes.
- CONCLUSIÓN: solo hallazgos positivos (patológicos). Si el estudio es completamente normal → escribir: 'Sin trastornos respiratorios del sueño significativos. Arquitectura del sueño conservada.'
- NUNCA usar [No especificado] en la CONCLUSIÓN.

# INFORME DE POLISOMNOGRAFÍA (PSG)

## ARQUITECTURA DEL SUEÑO
Tiempo total en cama (min), tiempo total de sueño (min), eficiencia del sueño (%), latencia de sueño (min), latencia REM (min).
Distribución de estadios: N1 (%), N2 (%), N3 (%), REM (%).
Índice de despertares (por hora), movimientos periódicos de extremidades (PLM index, si mencionado).

## EVENTOS RESPIRATORIOS
IAH total, IAH en sueño REM y NREM.
Índice desglosado: apneas obstructivas, centrales, mixtas, hipopneas.
SpO2 promedio, SpO2 mínima, % tiempo con SpO2 <90% (T90), registro de ronquidos (si mencionado).

## REGLA DE CONCLUSIÓN
• SAHOS leve: IAH 5-14 → indicar grado + segmento predominante (REM/supino).
• SAHOS moderado: IAH 15-29 → igual.
• SAHOS grave: IAH ≥30 → igual.
• Otros trastornos → mencionarlos (insomnio, PLM, SRVAS, apnea central, etc.).
• Si el estudio es normal → escribir exactamente: 'Sin trastornos respiratorios del sueño significativos. Arquitectura del sueño conservada.'
• NUNCA inventar valores de IAH ni SpO2 no dictados.

## CONCLUSIÓN
Diagnóstico principal, grado de severidad y recomendaciones terapéuticas (según REGLA DE CONCLUSIÓN).

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción.`
    },

    // ── ORL ─────────────────────────────────────────────────────
    naso: {
        name: "Videonaso / Laringoscopía",
        category: "ORL",
        keywords: ["videonasofibrolaringoscopía", "nasofibroscopía", "fosas nasales", "rinofaringe", "laringe", "cuerdas vocales", "videonasolaringoscopía", "cornetes", "septum nasal", "meato medio", "nasofaringe"],
        prompt: `Actúa como especialista ORL. Estructura este informe de videonasofibrolaringoscopía.

REGLAS OBLIGATORIAS:
- Crea una sección ## separada para CADA estructura evaluada.
- Si una estructura es normal, descríbela en prosa breve.
- Si una estructura NO fue mencionada en la transcripción, marcar con [No especificado].
- CONCLUSIÓN: solo hallazgos positivos (patológicos). NUNCA vacía ni [No especificado]. Si todo es normal: "Estudio dentro de parámetros normales."

# INFORME DE VIDEONASOFIBROLARINGOSCOPÍA

## FOSA NASAL DERECHA
Permeabilidad, septum, cornetes, mucosa, secreción.

## FOSA NASAL IZQUIERDA
Permeabilidad, septum, cornetes, mucosa, secreción.

## NASOFARINGE / CAVUM
Coanás, adenoides.

## ORÓFARINGE Y VELÓFARINGE
Paladar blando, pilares, pared posterior.

## AMÍGDALAS PALATINAS
Tamaño, unión, morfología.

## VÍA AÉREA Y FARINGE INFERIOR
Base de lengua, valéculas, cordones laterales, piriformes. Comportamiento dinámico.

## EPIGLOTIS
Morfología y movilidad.

## CUERDAS VOCALES Y LARINGE
Cuerdas vocales, movilidad, glotis, comisuras.

## FONACIÓN
Cierre glótico, calidad vibratoria.

## CONCLUSIÓN DIAGNÓSTICA
Solo hallazgos positivos o patológicos. Si todo es normal: "Estudio dentro de parámetros normales."

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción.`
    },
    endoscopia_otologica: {
        name: "Endoscopía Otológica",
        category: "ORL",
        keywords: ["endoscopía otológica", "oído", "tímpano", "conducto auditivo", "membrana timpánica", "oído medio"],
        prompt: `Actúa como especialista ORL. Estructura este informe de endoscopía otológica.

REGLAS OBLIGATORIAS:
- Crea secciones independientes y completas para OÍDO DERECHO y OÍDO IZQUIERDO con subsecciones.
- Si solo fue examinado un oído, omitir completamente la sección del lado no explorado.
- CONCLUSIÓN: solo hallazgos positivos (patológicos). Si todo es normal → 'Membranas timpánicas íntegras bilateralmente. Conductos auditivos sin hallazgos patológicos.'
- NUNCA usar [No especificado] en la CONCLUSIÓN.

# INFORME DE ENDOSCOPÍA OTOLÓGICA

## OÍDO DERECHO (OD)

### CONDUCTO AUDITIVO EXTERNO
Permeabilidad, calibre, estado de la piel, presencia de cerumen, secreción o cuerpo extraño.

### MEMBRANA TIMPÁNICA
Integridad (íntegra/perforada), brillo y reflejo luminoso, posición (neutra/retraída/abombada), transparencia (traslúcida/opaca/mate).

### OÍDO MEDIO (si visible)
Nivel líquido, burbujas, hallazgos patológicos.

## OÍDO IZQUIERDO (OI)

### CONDUCTO AUDITIVO EXTERNO
Permeabilidad, calibre, estado de la piel, presencia de cerumen, secreción o cuerpo extraño.

### MEMBRANA TIMPÁNICA
Integridad (íntegra/perforada), brillo y reflejo luminoso, posición (neutra/retraída/abombada), transparencia (traslúcida/opaca/mate).

### OÍDO MEDIO (si visible)
Nivel líquido, burbujas, hallazgos patológicos.

## CONCLUSIÓN DIAGNÓSTICA
Solo hallazgos positivos o patológicos (según REGLAS). Si todo es normal → 'Membranas timpánicas íntegras bilateralmente. Sin hallazgos patológicos.'

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción.`
    },

    // ── QUIRÚRGICO ──────────────────────────────────────────────
    protocolo_quirurgico: {
        name: "Protocolo Quirúrgico",
        category: "Quirúrgico",
        keywords: ["protocolo operatorio", "cirugía", "anestesia", "incisión", "técnica quirúrgica", "hallazgos intraoperatorios"],
        prompt: `Actúa como cirujano especializado. Estructura este protocolo operatorio:

# PROTOCOLO OPERATORIO

## IDENTIFICACIÓN
Paciente, fecha, cirujano, ayudante, anestesiólogo, tipo de anestesia.

## DIAGNÓSTICO PRE/POST-OPERATORIO
Diagnóstico preoperatorio y hallazgos finales.

## PROCEDIMIENTO
Descripción detallada de la técnica quirúrgica: posición, acceso, tiempo operatorio, hallazgos, maniobras realizadas.

## RESULTADO
Cierre, drenajes, estado del paciente al finalizar.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── ECOCARDIOGRAMA TRANSTORÁCICO (ETT) ──────────────────────
});
