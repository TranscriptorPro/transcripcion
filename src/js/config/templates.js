// ============ MEDICAL TEMPLATES & PROMPTS ============

window.MEDICAL_SPECIALTIES = {
    "Cardiología": ["Ecocardiograma", "ECG", "Eco-Stress", "Cinecoronariografía", "Holter"],
    "Ecografía": ["Abdominal", "Renal", "Partes Blandas", "Eco-Doppler Vascular", "Obstétrica"],
    "Gastroenterología": ["Endoscopía Digestiva Alta", "Colonoscopía", "Video-Cápsula"],
    "ORL": ["Videonaso / Laringoscopía", "Endoscopía Otológica", "Audiometría"],
    "General": ["Informe Evolutivo", "Epicrisis", "Certificado"],
    "Quirúrgico": ["Protocolo Operatorio", "Parte de Cirugía"]
};

window.MEDICAL_TEMPLATES = {
    // ── NEUMOLOGÍA ──────────────────────────────────────────────
    espirometria: {
        name: "Espirometría",
        category: "Neumología",
        keywords: ["espirometría", "CVF", "VEF1", "broncodilatador", "función pulmonar", "FEF"],
        prompt: `Actúa como neumólogo especializado. Estructura este informe de espirometría con las siguientes secciones:

# INFORME DE ESPIROMETRÍA CLÍNICA

## DATOS DEMOGRÁFICOS
Nombre, Edad, Sexo, Peso, Talla, IMC.

## VALORES PRE-BRONCODILATADOR
Tabla con: CVF (L), VEF1 (L), VEF1/CVF, FEF 25-75 — cada uno con Mejor valor, % Pred, z-score.

## RESPUESTA POST-BRONCODILATADOR
(Si se menciona broncodilatador) Tabla con: CVF, VEF1, % Cambio, Variación (ml).

## CALIDAD DEL EXAMEN
Grado (A-F), Nivel de esfuerzo.

## CONCLUSIÓN
Interpretación del patrón funcional (Normal/Obstructivo/Restrictivo/Mixto) y grado de severidad.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    test_marcha: {
        name: "Test de Marcha 6 min",
        category: "Neumología",
        keywords: ["marcha", "6 minutos", "TM6M", "saturación", "distancia recorrida", "Borg"],
        prompt: `Actúa como neumólogo especializado. Estructura este informe del Test de Marcha de 6 Minutos:

# INFORME DE TEST DE MARCHA DE 6 MINUTOS (TM6M)

## PARÁMETROS INICIALES
FC basal, SpO2 basal, TA basal, Escala Borg disnea, Escala Borg fatiga.

## DESEMPEÑO
Distancia recorrida (m), % valor predicho, Número de pausas, Motivo de interrupción (si aplica).

## DINÁMICA DE SATURACIÓN
SpO2 mínima, SpO2 final, Necesidad de O2 suplementario.

## CONCLUSIÓN
Interpretación funcional, comparativa con valor predicho y significancia clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    pletismografia: {
        name: "Pletismografía",
        category: "Neumología",
        keywords: ["pletismografía", "TLC", "RV", "FRC", "volumen residual", "capacidad pulmonar total"],
        prompt: `Actúa como neumólogo especializado. Estructura este informe de pletismografía corporal:

# INFORME DE PLETISMOGRAFÍA CORPORAL

## DATOS DEMOGRÁFICOS
Nombre, Edad, Sexo, Peso, Talla, IMC.

## VOLÚMENES PULMONARES
Tabla con: TLC, FRC, RV, RV/TLC — con valor absoluto, % predicho y z-score.

## CAPACIDAD DE DIFUSIÓN (DLCO)
DLCO absoluta, % predicho, KCO.

## CONCLUSIÓN
Patrón encontrado, grado de compromiso y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    oximetria_nocturna: {
        name: "Oximetría Nocturna",
        category: "Neumología",
        keywords: ["oximetría nocturna", "SpO2", "desaturación", "T90", "IAH", "sueño"],
        prompt: `Actúa como neumólogo especializado. Estructura este informe de oximetría nocturna:

# INFORME DE OXIMETRÍA NOCTURNA

## DATOS DEL ESTUDIO
Fecha, duración del registro, calidad de señal.

## RESULTADOS
SpO2 media, SpO2 mínima, T90 (% tiempo con SpO2 < 90%), Índice de desaturación (ODI).

## EVENTOS RESPIRATORIOS
Número de eventos, índice de eventos por hora.

## CONCLUSIÓN
Interpretación del patrón de oxigenación nocturna y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── OFTALMOLOGÍA ────────────────────────────────────────────
    campimetria: {
        name: "Campimetría Humphrey",
        category: "Oftalmología",
        keywords: ["campimetría", "Humphrey", "campo visual", "MD", "PSD", "defecto", "perimetría"],
        prompt: `Actúa como oftalmólogo especializado. Estructura este informe de campimetría computarizada:

# INFORME DE CAMPIMETRÍA COMPUTARIZADA (HUMPHREY)

## IDENTIFICACIÓN
Ojo examinado, programa utilizado, fecha.

## CONFIABILIDAD
Pérdidas de fijación, falsos positivos, falsos negativos.

## RESULTADOS
MD (dB), PSD (dB), VFI (%), AGFI.

## MAPAS DE DESVIACIÓN
Descripción del mapa de desviación total y patrón.

## CONCLUSIÓN
Tipo y grado del defecto campimétrico, correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    oct_retinal: {
        name: "OCT Retinal",
        category: "Oftalmología",
        keywords: ["OCT", "tomografía de coherencia óptica", "RNFL", "mácula", "retina", "grosor macular"],
        prompt: `Actúa como oftalmólogo especializado. Estructura este informe de OCT retinal:

# INFORME DE TOMOGRAFÍA DE COHERENCIA ÓPTICA (OCT)

## MÁCULA
Grosor macular central, mapa de grosor, volumen macular, hallazgos morfológicos.

## RNFL (Capa de Fibras Nerviosas)
Grosor promedio RNFL, valores por sectores (superior, inferior, nasal, temporal), comparación con normativa.

## HALLAZGOS PATOLÓGICOS
Descripción de alteraciones encontradas (drusen, líquido, atrofia, membranas, etc.).

## CONCLUSIÓN
Diagnóstico basado en hallazgos, correlación con glaucoma o patología macular.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    topografia_corneal: {
        name: "Topografía Corneal",
        category: "Oftalmología",
        keywords: ["topografía corneal", "queratometría", "queratocono", "K1", "K2", "Kmax", "curvatura corneal"],
        prompt: `Actúa como oftalmólogo especializado. Estructura este informe de topografía corneal:

# INFORME DE TOPOGRAFÍA CORNEAL

## DATOS DEL EXAMEN
Ojo examinado, equipo utilizado, calidad de la imagen.

## QUERATOMETRÍA
K1, K2, Kmax, eje del astigmatismo, índice de asimetría.

## PAQUIMETRÍA
Espesor corneal central, mapa de espesor, punto más delgado.

## CONCLUSIÓN
Patrón topográfico, diagnóstico (normal, astigmatismo, queratocono, etc.) y grado.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    fondo_ojo: {
        name: "Fondo de Ojo",
        category: "Oftalmología",
        keywords: ["fondo de ojo", "retinografía", "papila", "mácula", "vasos retinianos", "vítreo"],
        prompt: `Actúa como oftalmólogo especializado. Estructura este informe de fondo de ojo:

# INFORME DE FONDO DE OJO (RETINOGRAFÍA)

## PAPILA ÓPTICA
Forma, bordes, relación E/P (excavación/papila), coloración.

## MÁCULA
Brillo foveal, presencia de alteraciones maculares.

## VASOS RETINIANOS
Calibre arterial/venoso, relación AV, cruces arteriovenosos, alteraciones.

## PERIFERIA RETINAL
Descripción de hallazgos periféricos.

## CONCLUSIÓN
Diagnóstico y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── IMÁGENES ────────────────────────────────────────────────
    tac: {
        name: "TAC / Tomografía",
        category: "Imágenes",
        keywords: ["TAC", "tomografía", "TC", "cortes axiales", "contraste", "Hounsfield"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe de TAC:

# INFORME DE TOMOGRAFÍA AXIAL COMPUTARIZADA

## TÉCNICA
Región estudiada, protocolo, uso de contraste, grosor de cortes.

## DESCRIPCIÓN POR ESTRUCTURA
Descripción sistemática de cada estructura anatómica relevante.

## LESIONES / HALLAZGOS RELEVANTES
Descripción detallada de hallazgos patológicos: localización, tamaño, densidad, características.

## CONCLUSIÓN
Diagnóstico radiológico principal y hallazgos incidentales.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    resonancia: {
        name: "Resonancia Magnética (RMN)",
        category: "Imágenes",
        keywords: ["resonancia", "RMN", "MRI", "T1", "T2", "FLAIR", "gadolinio", "secuencias"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe de resonancia magnética:

# INFORME DE RESONANCIA MAGNÉTICA (RMN)

## PROTOCOLO
Región estudiada, secuencias utilizadas, uso de contraste (gadolinio).

## DESCRIPCIÓN
Descripción sistemática por estructura anatómica.

## HALLAZGOS
Descripción detallada de hallazgos patológicos: señal, localización, tamaño, extensión.

## CONCLUSIÓN
Diagnóstico por imágenes, correlación clínica y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    mamografia: {
        name: "Mamografía Digital",
        category: "Imágenes",
        keywords: ["mamografía", "BI-RADS", "mama", "nódulo mamario", "microcalcificaciones", "densidad mamaria"],
        prompt: `Actúa como radiólogo especializado en mama. Estructura este informe de mamografía:

# INFORME DE MAMOGRAFÍA DIGITAL

## COMPOSICIÓN MAMARIA
Tipo de densidad mamaria (A, B, C o D según ACR).

## HALLAZGOS
Descripción de nódulos, calcificaciones, asimetrías, distorsiones arquitecturales y hallazgos asociados.

## BI-RADS
Categoría BI-RADS asignada (0-6) con justificación.

## CONCLUSIÓN
Interpretación final y recomendación de seguimiento o acción.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    densitometria: {
        name: "Densitometría Ósea (DXA)",
        category: "Imágenes",
        keywords: ["densitometría", "DXA", "T-score", "Z-score", "osteoporosis", "osteopenia", "densidad mineral ósea"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe de densitometría ósea:

# INFORME DE DENSITOMETRÍA ÓSEA (DXA)

## SEGMENTOS ESTUDIADOS
Regiones evaluadas: columna lumbar, cadera total, cuello femoral, antebrazo.

## RESULTADOS
Tabla con: Segmento, DMO (g/cm²), T-score, Z-score, % respecto a adulto joven.

## CLASIFICACIÓN OMS
Normal / Osteopenia / Osteoporosis según T-score.

## CONCLUSIÓN
Diagnóstico densitométrico, riesgo fracturario y recomendaciones terapéuticas.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    pet_ct: {
        name: "PET-CT",
        category: "Imágenes",
        keywords: ["PET", "PET-CT", "FDG", "SUV", "captación", "hipermetabólico", "glucosa"],
        prompt: `Actúa como médico nuclear especializado. Estructura este informe de PET-CT:

# INFORME DE PET-CT

## TÉCNICA
Radiofármaco utilizado, actividad administrada, tiempo de captación, glucemia basal.

## HALLAZGOS POR REGIÓN
Descripción sistemática de hallazgos en cabeza/cuello, tórax, abdomen, pelvis y esqueleto.

## SUV MÁXIMO
Valores de SUVmax de las lesiones más relevantes.

## CONCLUSIÓN
Interpretación de los hallazgos metabólicos, estadificación y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    radiografia: {
        name: "Radiografía Convencional",
        category: "Imágenes",
        keywords: ["radiografía", "Rx", "proyección", "tórax", "columna", "hueso", "radiopaco"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe de radiografía:

# INFORME DE RADIOGRAFÍA CONVENCIONAL

## PROYECCIONES
Proyecciones obtenidas, calidad técnica.

## DESCRIPCIÓN
Descripción sistemática de las estructuras anatómicas visualizadas.

## CONCLUSIÓN
Diagnóstico radiológico y hallazgos relevantes.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    ecografia_abdominal: {
        name: "Ecografía Abdominal / Doppler",
        category: "Imágenes",
        keywords: ["ecografía", "ecografía abdominal", "ultrasonido", "Doppler", "hígado", "riñón", "vesícula"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe ecográfico:

# INFORME ECOGRÁFICO

## TIPO DE ESTUDIO
Tipo de ecografía realizada (abdominal, pélvica, vascular, partes blandas, etc.).

## HALLAZGOS POR ÓRGANO
Descripción sistemática de cada órgano o estructura evaluada.

## DOPPLER
(Si aplica) Velocidades, índices de resistencia, flujo.

## CONCLUSIÓN
Diagnóstico ecográfico y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── ENDOSCOPÍA ──────────────────────────────────────────────
    gastroscopia: {
        name: "Gastroscopía / EDA",
        category: "Endoscopía",
        keywords: ["gastroscopía", "endoscopía digestiva", "EDA", "esófago", "estómago", "duodeno", "Helicobacter"],
        prompt: `Actúa como gastroenterólogo especializado. Estructura este informe de gastroscopía:

# INFORME DE GASTROSCOPÍA / ENDOSCOPÍA DIGESTIVA ALTA

## PREPARACIÓN
Sedación utilizada, calidad de preparación, tolerancia del paciente.

## HALLAZGOS
Descripción sistemática: esófago, unión gastroesofágica, estómago (fondo, cuerpo, antro), píloro, duodeno (1ª y 2ª porción).

## MANIOBRAS
Biopsias tomadas (localización, número), polipectomías, otras intervenciones.

## CONCLUSIÓN
Diagnósticos endoscópicos y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    colonoscopia: {
        name: "Colonoscopía",
        category: "Endoscopía",
        keywords: ["colonoscopía", "colon", "recto", "pólipo", "Boston", "íleon", "mucosa colónica"],
        prompt: `Actúa como gastroenterólogo especializado. Estructura este informe de colonoscopía:

# INFORME DE COLONOSCOPÍA

## PREPARACIÓN
Tipo de preparación, calidad (escala de Boston), sedación.

## HALLAZGOS
Descripción sistemática: recto, colon sigmoideo, colon descendente, colon transverso, colon ascendente, ciego, válvula ileocecal, íleon terminal (si se exploró).

## MANIOBRAS
Biopsias, polipectomías (localización, tamaño, morfología, técnica), otras intervenciones.

## CONCLUSIÓN
Diagnósticos endoscópicos y recomendaciones de seguimiento.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    broncoscopia: {
        name: "Broncoscopía",
        category: "Endoscopía",
        keywords: ["broncoscopía", "bronquios", "tráquea", "BAL", "lavado broncoalveolar", "biopsia bronquial"],
        prompt: `Actúa como neumólogo intervencionista. Estructura este informe de broncoscopía:

# INFORME DE BRONCOSCOPÍA

## DESCRIPCIÓN DEL PROCEDIMIENTO
Sedación, acceso, equipo utilizado, tolerancia.

## HALLAZGOS ENDOBRONQUIALES
Descripción sistemática: cuerdas vocales, tráquea, carina, bronquios principales, lobares y segmentarios.

## MUESTRAS OBTENIDAS
Tipo de muestras (BAL, biopsia, cepillado, BACAF), localización y destino.

## CONCLUSIÓN
Diagnósticos broncoscópicos y correlación clínica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    laringoscopia: {
        name: "Laringoscopía",
        category: "Endoscopía",
        keywords: ["laringoscopía", "laringe", "cuerdas vocales", "glotis", "epiglotis", "fonación"],
        prompt: `Actúa como otorrinolaringólogo especializado. Estructura este informe de laringoscopía:

# INFORME DE LARINGOSCOPÍA

## HALLAZGOS
Descripción de: epiglotis, repliegues ariepiglóticos, aritenoides, cuerdas vocales (movilidad, color, morfología), glotis, subglotis.

## FONACIÓN
Cierre glótico, calidad vibratoria, simetría.

## CONCLUSIÓN
Diagnóstico laringoscópico y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    // ── CARDIOLOGÍA ─────────────────────────────────────────────
    gammagrafia_cardiaca: {
        name: "Gammagrafía Cardíaca (SPECT)",
        category: "Cardiología",
        keywords: ["gammagrafía", "SPECT", "perfusión miocárdica", "talio", "tecnecio", "FEVI", "isquemia"],
        prompt: `Actúa como médico nuclear cardiólogo. Estructura este informe de gammagrafía de perfusión cardíaca:

# INFORME DE GAMMAGRAFÍA DE PERFUSIÓN CARDÍACA (SPECT)

## PROTOCOLO
Radiofármaco, protocolo (estrés/reposo), tipo de estrés (físico/farmacológico).

## PERFUSIÓN MIOCÁRDICA
Descripción por territorios: anterior (DA), inferior (CD), lateral (CX). Defectos fijos o reversibles.

## FUNCIÓN VENTRICULAR
FEVI en estrés y reposo, volúmenes ventriculares, motilidad regional.

## CONCLUSIÓN
Interpretación del patrón de perfusión, territorio comprometido y correlación con enfermedad coronaria.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
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
        prompt: `Actúa como cardiólogo intervencionista. Estructura este informe de cinecoronariografía:

# INFORME DE CINECORONARIOGRAFÍA

## ACCESO
Vía de acceso, tipo de catéter.

## VENTRICULOGRAFÍA
FEVI, motilidad segmentaria, presiones.

## CORONARIAS
Descripción de: TCI, DA (y diagonales), CX (y marginales), CD (y ramas). Para cada vaso: dominancia, lesiones, grado de estenosis (%).

## CONCLUSIÓN
Diagnóstico angiográfico, enfermedad coronaria (uni/bi/trivascular) y recomendación terapéutica.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
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
        keywords: ["videonasofibrolaringoscopía", "nasofibroscopía", "fosas nasales", "rinofaringe", "laringe", "cuerdas vocales"],
        prompt: `Actúa como especialista ORL. Estructura este informe de videonasofibrolaringoscopía:

# INFORME DE VIDEONASOFIBROLARINGOSCOPÍA

## I. FOSAS NASALES Y RINOFARINGE
Descripción de cornetes, tabique, cavum y adenoides (si aplica).

## II. FARINGE Y LARINGE
Orofaringe, hipofaringe, epiglotis, cuerdas vocales (movilidad, morfología), glotis.

## III. CONCLUSIÓN DIAGNÓSTICA
Diagnósticos y recomendaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },
    endoscopia_otologica: {
        name: "Endoscopía Otológica",
        category: "ORL",
        keywords: ["endoscopía otológica", "oído", "tímpano", "conducto auditivo", "OD", "OI"],
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

    // ── GENERAL ─────────────────────────────────────────────────
    generico: {
        name: "Informe Médico General",
        category: "General",
        keywords: [],
        prompt: `Actúa como médico especialista. Estructura profesionalmente esta transcripción médica usando Markdown con títulos y secciones lógicas según el tipo de documento.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    }
};

window.TEMPLATE_CATEGORIES = {
    "Neumología": ["espirometria", "test_marcha", "pletismografia", "oximetria_nocturna"],
    "Oftalmología": ["campimetria", "oct_retinal", "topografia_corneal", "fondo_ojo"],
    "Imágenes": ["tac", "resonancia", "mamografia", "densitometria", "pet_ct", "radiografia", "ecografia_abdominal"],
    "Endoscopía": ["gastroscopia", "colonoscopia", "broncoscopia", "laringoscopia"],
    "Cardiología": ["gammagrafia_cardiaca", "holter", "mapa", "cinecoro", "ecg", "eco_stress"],
    "Ginecología": ["pap", "colposcopia"],
    "Neurología": ["electromiografia", "polisomnografia"],
    "ORL": ["naso", "endoscopia_otologica"],
    "Quirúrgico": ["protocolo_quirurgico"],
    "General": ["generico"]
};

window.detectStudyType = function (text) {
    let maxScore = 0;
    let detectedType = 'generico';
    const lowerText = text.toLowerCase();

    for (const [key, template] of Object.entries(window.MEDICAL_TEMPLATES)) {
        if (!template.keywords || template.keywords.length === 0) continue;
        let score = 0;
        template.keywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                score++;
            }
        });
        if (score > maxScore) {
            maxScore = score;
            detectedType = key;
        }
    }

    return { type: detectedType, confidence: maxScore };
}

window.populateTemplateDropdown = function () {
    const buildDropdown = (selectEl) => {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="generico">📋 Plantilla General</option>';
        const catIcons = {
            "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
            "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
            "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
        };
        for (const [cat, keys] of Object.entries(window.TEMPLATE_CATEGORIES)) {
            const group = document.createElement('optgroup');
            group.label = `${catIcons[cat] || ''} ${cat}`;
            let added = false;
            keys.forEach(key => {
                if (key === 'generico') return;
                const t = window.MEDICAL_TEMPLATES[key];
                if (!t) return;
                const option = document.createElement('option');
                option.value = key;
                option.textContent = t.name;
                group.appendChild(option);
                added = true;
            });
            if (added) selectEl.appendChild(group);
        }
    };

    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) buildDropdown(templateSelect);

    const toolbarDropdown = document.getElementById('templateDropdownMain');
    if (toolbarDropdown) buildDropdown(toolbarDropdown);

    const normalSelect = document.getElementById('normalTemplateSelect');
    if (normalSelect) buildDropdown(normalSelect);

    // Build custom styled list for normal-mode template dropdown
    const normalList = document.getElementById('normalTemplateList');
    if (normalList) {
        const catIcons = {
            "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
            "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
            "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
        };
        normalList.innerHTML = '';
        // General option
        const generalItem = document.createElement('li');
        generalItem.dataset.value = 'generico';
        generalItem.textContent = '📋 Plantilla General';
        generalItem.className = 'tmpl-list-general';
        normalList.appendChild(generalItem);

        for (const [cat, keys] of Object.entries(window.TEMPLATE_CATEGORIES || {})) {
            const hasItems = keys.some(key => key !== 'generico' && window.MEDICAL_TEMPLATES[key]);
            if (!hasItems) continue;
            const header = document.createElement('li');
            header.textContent = `${catIcons[cat] || ''} ${cat}`;
            header.className = 'tmpl-list-header';
            normalList.appendChild(header);
            keys.forEach(key => {
                if (key === 'generico') return;
                const t = window.MEDICAL_TEMPLATES[key];
                if (!t) return;
                const item = document.createElement('li');
                item.dataset.value = key;
                item.textContent = t.name;
                item.className = 'tmpl-list-item';
                normalList.appendChild(item);
            });
        }
    }
}
