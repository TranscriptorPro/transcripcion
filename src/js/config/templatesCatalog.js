
window.MEDICAL_SPECIALTIES = {
    "Cardiología": ["Ecocardiograma", "ECG", "Eco-Stress", "Cinecoronariografía", "Holter"],
    "Ecografía": ["Abdominal", "Renal", "Partes Blandas", "Eco-Doppler Vascular", "Obstétrica"],
    "Gastroenterología": ["Endoscopía Digestiva Alta", "Colonoscopía", "Video-Cápsula"],
    "ORL": ["Videonaso / Laringoscopía", "Endoscopía Otológica", "Audiometría"],
    "General": ["Informe Evolutivo", "Epicrisis", "Certificado"],
    "Quirúrgico": ["Protocolo Operatorio", "Parte de Cirugía"]
};

window.MEDICAL_TEMPLATES = {
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
    gonioscopia: {
        name: "Gonioscopía",
        category: "Oftalmología",
        keywords: ["gonioscopia", "gonioscopía", "shaffer", "spaeth", "linea de schwalbe", "línea de schwalbe", "malla trabecular", "espolon escleral", "espolón escleral", "sinequias anteriores perifericas", "sinequias anteriores periféricas", "pas", "neovasos", "rubeosis", "indentacion", "indentación", "angulo camerular", "ángulo camerular"],
        prompt: `Actúa como oftalmólogo especializado en glaucoma. Estructura este informe de gonioscopía:

# INFORME DE GONIOSCOPÍA

## OJO DERECHO (OD)
- Ángulo: grado Shaffer y condición (abierto/estrecho/cerrado).
- Estructuras visualizadas: línea de Schwalbe, malla trabecular, espolón escleral, banda del cuerpo ciliar.
- Pigmentación trabecular.
- Configuración del iris.
- Gonioscopía dinámica/indentación (si aplica).
- Hallazgos patológicos: sinequias anteriores periféricas (PAS), neovasos, línea de Sampaolesi u otros.

## OJO IZQUIERDO (OI)
- Ángulo: grado Shaffer y condición (abierto/estrecho/cerrado).
- Estructuras visualizadas: línea de Schwalbe, malla trabecular, espolón escleral, banda del cuerpo ciliar.
- Pigmentación trabecular.
- Configuración del iris.
- Gonioscopía dinámica/indentación (si aplica).
- Hallazgos patológicos: sinequias anteriores periféricas (PAS), neovasos, línea de Sampaolesi u otros.

## SISTEMA SPAETH (SI ESTÁ REPORTADO)
- OD por cuadrantes: inserción del iris, amplitud angular y configuración.
- OI por cuadrantes: inserción del iris, amplitud angular y configuración.

## IMPRESIÓN DIAGNÓSTICA
- Síntesis final clínica (p.ej. ángulos abiertos bilaterales, cierre aposicional, glaucoma neovascular, etc.).

REGLAS INTERNAS (NO INCLUIR EN LA SALIDA FINAL):
- Si la transcripción dice "AO", "ambos ojos" o "bilateral" y no detalla diferencias entre OD/OI, debes reflejar los mismos hallazgos clínicos en OD y en OI (nunca dejar OI vacío en ese escenario).
- Si se reporta Spaeth de forma global o bilateral, completar OD y OI dentro de la sección de Spaeth con la mejor correspondencia posible.
- NO escribas en el informe secciones de metainstrucciones como "Reglas", "Instrucciones" o "Notas del sistema".

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    },

    tac: {
        name: "TAC / Tomografía",
        category: "Imágenes",
        keywords: ["TAC", "tomografía", "TC", "cortes axiales", "contraste", "Hounsfield", "tomografía axial", "tomografía computarizada", "tomografía computada", "colecciones hemáticas"],
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
        keywords: ["densitometría", "DXA", "T-score", "Z-score", "osteoporosis", "osteopenia", "densidad mineral ósea", "cuello femoral", "T score", "columna lumbar"],
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
        keywords: ["ecografía abdominal", "ultrasonido abdominal", "ultrasonido", "Doppler abdominal", "hígado", "riñón", "vesícula", "bazo", "páncreas"],
        prompt: `Actúa como radiólogo especializado. Estructura este informe ecográfico aplicando el formato por órgano con s/p:

# INFORME ECOGRÁFICO

## TIPO DE ESTUDIO
Tipo de ecografía realizada (abdominal, pélvica, vascular, partes blandas, etc.).

## HÍGADO
Hallazgos o s/p

## VESÍCULA BILIAR
Hallazgos o s/p

## VÍAS BILIARES
Hallazgos o s/p

## PÁNCREAS
Hallazgos o s/p

## BAZO
Hallazgos o s/p

## RIÑÓN DERECHO
Hallazgos o s/p

## RIÑÓN IZQUIERDO
Hallazgos o s/p

## VEJIGA / PELVIS
Hallazgos o s/p — incluir solo si fue evaluada

## DOPPLER
(Incluir solo si el estudio tiene componente Doppler) Velocidades, índices de resistencia, flujos.

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos o patológicos detectados, como párrafo fluido. No repetir datos normales.

REGLA DE CONCLUSIÓN: Incluye TODOS los hallazgos patológicos o positivos — ninguno puede omitirse, aunque sea leve. No incluyas estructuras con resultado normal. Podés redactar una síntesis diagnóstica breve con terminología médica estándar derivada directamente de los hallazgos dictados. PROHIBIDO: inventar valores o datos que no estén en la transcripción. PROHIBIDO: indicar tratamientos o procedimientos concretos si el médico no los mencionó.
IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si una estructura no fue evaluada ni mencionada, omití su sección o escribí s/p.`
    },

    gastroscopia: {
        name: "Gastroscopía / EDA",
        category: "Endoscopía",
        keywords: ["gastroscopía", "endoscopía digestiva", "EDA", "esófago", "estómago", "duodeno", "Helicobacter"],
        prompt: `Actúa como gastroenterólogo especializado. Estructura este informe de gastroscopía aplicando el formato por segmento con s/p:

# INFORME DE GASTROSCOPÍA / ENDOSCOPÍA DIGESTIVA ALTA

## PREPARACIÓN
Sedación utilizada, calidad de preparación, tolerancia del paciente.

## ESÓFAGO
Hallazgos o s/p

## UNIÓN GASTROESOFÁGICA
Hallazgos o s/p

## ESTÓMAGO — FONDO
Hallazgos o s/p

## ESTÓMAGO — CUERPO
Hallazgos o s/p

## ESTÓMAGO — ANTRO
Hallazgos o s/p

## PÍLORO
Hallazgos o s/p

## DUODENO
Hallazgos o s/p (1ª y 2ª porción)

## MANIOBRAS
Biopsias tomadas (localización, número), polipectomías, otras intervenciones. Si no se realizaron: s/p

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos o patológicos detectados, como párrafo fluido. No repetir datos normales.

REGLA DE CONCLUSIÓN: Incluye TODOS los hallazgos patológicos o positivos — ninguno puede omitirse, aunque sea leve. No incluyas segmentos con resultado normal. Podés redactar una síntesis diagnóstica breve con terminología médica estándar derivada directamente de los hallazgos dictados. PROHIBIDO: inventar valores o datos que no estén en la transcripción. PROHIBIDO: indicar tratamientos o procedimientos concretos si el médico no los mencionó.
IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si un segmento no fue evaluado ni mencionado, omití su sección o escribí s/p.`
    },
    colonoscopia: {
        name: "Colonoscopía",
        category: "Endoscopía",
        keywords: ["colonoscopía", "colon", "recto", "pólipo", "Boston", "íleon", "mucosa colónica"],
        prompt: `Actúa como gastroenterólogo especializado. Estructura este informe de colonoscopía aplicando el formato por segmento con s/p:

# INFORME DE COLONOSCOPÍA

## PREPARACIÓN
Tipo de preparación, calidad (escala de Boston), sedación.

## RECTO
Hallazgos o s/p

## COLON SIGMOIDEO
Hallazgos o s/p

## COLON DESCENDENTE
Hallazgos o s/p

## COLON TRANSVERSO
Hallazgos o s/p

## COLON ASCENDENTE
Hallazgos o s/p

## CIEGO / VÁLVULA ILEOCECAL
Hallazgos o s/p

## ÍLEON TERMINAL
Hallazgos o s/p — incluir solo si fue explorado

## MANIOBRAS
Biopsias, polipectomías (localización, tamaño, morfología, técnica), otras intervenciones. Si no se realizaron: s/p

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos o patológicos detectados, como párrafo fluido. No repetir datos normales.

REGLA DE CONCLUSIÓN: Incluye TODOS los hallazgos patológicos o positivos — ninguno puede omitirse, aunque sea leve. No incluyas segmentos con resultado normal. Podés redactar una síntesis diagnóstica breve con terminología médica estándar derivada directamente de los hallazgos dictados. PROHIBIDO: inventar valores o datos que no estén en la transcripción. PROHIBIDO: indicar tratamientos o procedimientos concretos si el médico no los mencionó.
IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si un segmento no fue evaluado ni mencionado, omití su sección o escribí s/p.`
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
        prompt: `Actúa como otorrinolaringólogo especializado. Estructura este informe de laringoscopía/videonasofibrolaringoscopía.

REGLAS OBLIGATORIAS PARA ESTE INFORME:
- Crea una sección ## separada para CADA estructura anatómica evaluada.
- Si una estructura fue evaluada y es normal, descríbela en prosa breve.
- Usa s/p SOLO si una estructura NO fue mencionada ni evaluada en la transcripción.
- En la CONCLUSIÓN: incluye ÚNICAMENTE los hallazgos positivos (patológicos o anormales). NUNCA dejar vacía ni como [No especificado].

# INFORME DE LARINGOSCOPÍA

## FOSA NASAL DERECHA
Permeabilidad, tabique, cornetes, mucosa, secreción.

## FOSA NASAL IZQUIERDA
Permeabilidad, tabique, cornetes, mucosa, secreción.

## NASOFARINGE / CAVUM
Coanás, adenoides, paredes.

## ORÓFARINGE
Paladar blando, pilares, pared posterior.

## AMÍGDALAS PALATINAS
Tamaño (grado), morfología, unión.

## VÍA AÉREA SUPERIOR
Base de lengua, valéculas, cordones laterales, piriformes. Comportamiento en maniobras (ronquido, Muller).

## EPIGLOTIS
Morfología, movilidad.

## LARINGE Y CUERDAS VOCALES
Cuerdas vocales (movilidad, color, morfología), glotis, subglotis, comisuras.

## FONACIÓN
Cierre glótico, calidad vibratoria, simetría.

## CONCLUSIÓN
Solo hallazgos positivos (patológicos). No incluir estructuras normales. Si todo es normal: "Estudio dentro de parámetros normales."

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción.`
    },

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
};

var MEDICAL_SPECIALTIES = window.MEDICAL_SPECIALTIES;
var MEDICAL_TEMPLATES = window.MEDICAL_TEMPLATES;
