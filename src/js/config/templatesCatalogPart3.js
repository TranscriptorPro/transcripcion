// ============ MEDICAL TEMPLATES PART 3 ============

Object.assign(window.MEDICAL_TEMPLATES, {
    holter: {
        name: "Holter ECG",
        category: "Cardiología",
        keywords: ["Holter", "ECG", "24 horas", "arritmia", "extrasístoles", "FC media", "variabilidad"],
        prompt: `Actúa como cardiólogo electrofisiólogo. Estructura este informe de Holter ECG:

# INFORME DE HOLTER ECG

## FRECUENCIA CARDÍACA
FC media, FC máxima, FC mínima, variabilidad de la FC.

## ECTOPÍA VENTRICULAR
Número de extrasístoles ventriculares (EV), morfología, formas complejas (pares, tripletes, TV).

## ECTOPÍA SUPRAVENTRICULAR
Número de extrasístoles supraventriculares (ESV), episodios de TSV, FA/Flutter.

## SEGMENTO ST
Cambios del ST (depresión/elevación), duración, correlación con síntomas.

## CONCLUSIÓN
Diagnóstico arrítmico y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
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
IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si un vaso no fue evaluado ni mencionado, omití su sección o escribí s/p.`
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
    eco_stress: {
        name: "Eco-Stress",
        category: "Cardiología",
        keywords: ["eco-stress", "ecocardiograma de estrés", "dobutamina", "ejercicio", "isquemia", "motilidad"],
        prompt: `Actúa como cardiólogo ecocardiografista. Estructura este informe de eco-stress:

# INFORME DE ECOCARDIOGRAMA DE ESTRÉS

## PROTOCOLO
Tipo de estrés (ejercicio/dobutamina), protocolo utilizado, dosis máxima alcanzada.

## HALLAZGOS EN REPOSO
Función sistólica (FEVI), motilidad segmentaria, otras alteraciones basales.

## HALLAZGOS EN ESFUERZO
FC máxima alcanzada, % FCmax, motilidad segmentaria en estrés, aparición de nuevas alteraciones.

## CONCLUSIÓN
Resultado (positivo/negativo/no concluyente) para isquemia miocárdica inducible.

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
        prompt: `Actúa como neurofisiólogo clínico. Estructura este informe de electromiografía:

# INFORME DE ELECTROMIOGRAFÍA (EMG) Y ESTUDIOS NEUROFISIOLÓGICOS

## ESTUDIOS DE CONDUCCIÓN NERVIOSA
Tabla por nervio: nervio evaluado, latencia distal (ms), amplitud (mV/μV), velocidad de conducción (m/s), latencia onda F/H.

## ELECTROMIOGRAFÍA DE AGUJA
Músculos estudiados con: actividad espontánea, unidades motoras (morfología, reclutamiento).

## POTENCIALES EVOCADOS (si aplica)
Tipo de potenciales, latencias, amplitudes y lateralidad.

## CONCLUSIÓN
Patrón neurofisiológico (normal, axonal, desmielinizante, miopático), topografía y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    polisomnografia: {
        name: "Polisomnografía (PSG)",
        category: "Neurología",
        keywords: ["polisomnografía", "PSG", "IAH", "apnea del sueño", "SAHOS", "REM", "desaturación nocturna", "índice de apnea"],
        prompt: `Actúa como especialista en medicina del sueño. Estructura este informe de polisomnografía:

# INFORME DE POLISOMNOGRAFÍA (PSG)

## ARQUITECTURA DEL SUEÑO
Eficiencia del sueño (%), tiempo total de sueño (min), latencia de sueño, latencia REM, % de cada estadio (N1, N2, N3, REM).

## EVENTOS RESPIRATORIOS
IAH total, IAH en sueño REM y NREM, índice de apneas obstructivas/centrales/mixtas, índice de hipopneas, SpO2 mínima, T90.

## CONCLUSIÓN
Diagnóstico (SAHOS leve/moderado/grave), otros trastornos del sueño identificados y recomendaciones terapéuticas.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
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
- Usa s/p solo si una estructura NO fue mencionada en la transcripción.
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
        prompt: `Actúa como especialista ORL. Estructura este informe de endoscopía otológica:

# INFORME DE ENDOSCOPÍA OTOLÓGICA

## OÍDO DERECHO (OD)
Descripción del conducto auditivo externo y membrana timpánica.

## OÍDO IZQUIERDO (OI)
Descripción del conducto auditivo externo y membrana timpánica.

## CONCLUSIÓN
Diagnósticos y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
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
