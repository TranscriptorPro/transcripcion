// ============ MEDICAL TEMPLATES CATALOG (PART 2) ============

window.MEDICAL_TEMPLATES = Object.assign(window.MEDICAL_TEMPLATES || {}, {
ett: {
        name: "Ecocardiograma Transtorácico (ETT)",
        category: "Cardiología",
        keywords: ["ecocardiograma", "ecografía cardíaca", "ETT", "FEVI", "fracción de eyección", "ventrículo izquierdo", "ventrículo derecho", "válvula mitral", "válvula aórtica", "pericardio", "diastólico", "sistólico", "SIV", "DDVI", "DSVI"],
        prompt: `Actúa como cardiólogo ecocardiografista. Estructura este informe de ecocardiograma transtorácico (ETT) con el siguiente formato:

# INFORME DE ECOCARDIOGRAMA TRANSTORÁCICO (ETT)

## VENTRÍCULO IZQUIERDO
Dimensiones (DDVI, DSVI), espesor septal (SIV) y pared posterior (PP) en mm, fracción de eyección (FE%), función sistólica y diastólica, motilidad segmentaria.

## VENTRÍCULO DERECHO
Tamaño, función, TAPSE si fue mencionado.

## VÁLVULA MITRAL
Morfología, apertura, gradientes, presencia de regurgitación y su grado, o s/p.

## VÁLVULA AÓRTICA
Morfología (tri/bicúspide), apertura, gradientes (máx/medio), área si fue mencionada, regurgitación y su grado, o s/p.

## VÁLVULA TRICÚSPIDE
Hallazgos, regurgitación y estimación de PSAP, o s/p.

## VÁLVULA PULMONAR
Hallazgos o s/p.

## AORTA
Diámetros de raíz aórtica y aorta ascendente si fueron mencionados, o s/p.

## PERICARDIO
Hallazgos o s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos/patológicos. Incluir FE% si fue dictada. No repetir lo normal.

REGLA DE CONCLUSIÓN: Párrafo conciso con todos los hallazgos relevantes y la FE%. PROHIBIDO inventar valores. Si no se mencionó un dato, omitirlo o escribir s/p.`
    },

    // ── ECOGRAFÍA RENAL ──────────────────────────────────────────
    ecografia_renal: {
        name: "Ecografía Renal",
        category: "Imágenes",
        keywords: ["ecografía renal", "ecografía renovesical", "ultrasonido renal", "ecografía de riñones", "ecografía vesical", "riñón derecho", "riñón izquierdo", "ectasia piélica", "litiasis renal", "hidronefrosis", "parénquima renal", "ecografía de vías urinarias", "cólico nefrítico", "ureteropélica", "riñones"],
        prompt: `Actúa como radiólogo/nefrólogo. Estructura este informe de ecografía renal:

# INFORME DE ECOGRAFÍA RENAL / RENOVESICAL

## RIÑÓN DERECHO
Forma, tamaño (eje mayor en cm), ecoestructura del parénquima, diferenciación cortico-medular, espesor cortical, sistema pielocalicial (ectasia, litiasis), quistes, masas, o s/p.

## RIÑÓN IZQUIERDO
Forma, tamaño (eje mayor en cm), ecoestructura del parénquima, diferenciación cortico-medular, espesor cortical, sistema pielocalicial (ectasia, litiasis), quistes, masas, o s/p.

## VEJIGA
Distensión, paredes, contenido, residuo post-miccional si fue evaluado, o s/p.

## VÍAS URINARIAS
Uréteres visualizados, dilatación, o s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos positivos o patológicos. Si el estudio es normal, indicarlo.

IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si no se evaluó una estructura, omitirla o escribir s/p.`
    },

    // ── ECOGRAFÍA TIROIDEA ────────────────────────────────────────
    ecografia_tiroidea: {
        name: "Ecografía Tiroidea",
        category: "Imágenes",
        keywords: ["ecografía tiroidea", "ecografía de tiroides", "ultrasonido tiroideo", "nódulo tiroideo", "lóbulo tiroideo", "istmo tiroideo", "tiroides", "TIRADS", "nódulo coloide", "bocio", "tiroiditis", "glándula tiroides"],
        prompt: `Actúa como radiólogo/endocrinólogo. Estructura este informe de ecografía tiroidea:

# INFORME DE ECOGRAFÍA TIROIDEA

## LÓBULO DERECHO
Dimensiones (AP × T × L en mm), volumen, ecoestructura, presencia de nódulos (tamaño, ecogenicidad, bordes, microcalcificaciones, vascularización, categoría TIRADS), o s/p.

## ISTMO
Espesor, ecoestructura, nódulos, o s/p.

## LÓBULO IZQUIERDO
Dimensiones (AP × T × L en mm), volumen, ecoestructura, presencia de nódulos (tamaño, ecogenicidad, bordes, microcalcificaciones, vascularización, categoría TIRADS), o s/p.

## GANGLIOS CERVICALES
Adenomegalias, ganglios de aspecto reactivo, cadenas cervicales evaluadas, o s/p.

## VASCULARIZACIÓN
Patrón vascular al Doppler si fue evaluado, o s/p.

## CONCLUSIÓN
Mencionar SOLO hallazgos patológicos. Incluir clasificación TIRADS si fue dictada.

IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    // ── ECOGRAFÍA MAMARIA ─────────────────────────────────────────
    ecografia_mamaria: {
        name: "Ecografía Mamaria",
        category: "Imágenes",
        keywords: ["ecografía mamaria", "ecografía de mama", "ultrasonido mamario", "ecografía bilateral de mamas", "nódulo mamario", "quiste mamario", "BIRADS", "tejido fibroglandular", "conductos mamarios", "axila"],
        prompt: `Actúa como radiólogo mamario. Estructura este informe de ecografía mamaria:

# INFORME DE ECOGRAFÍA MAMARIA

## MAMA DERECHA
Composición tisular (patrón ecográfico), presencia de nódulos (ubicación por cuadrante/reloj, tamaño, ecogenicidad, bordes, vascularización al Doppler, clasificación BIRADS), quistes, ectasia ductal, o s/p.

## MAMA IZQUIERDA
Composición tisular, presencia de nódulos (mismo formato), quistes, ectasia ductal, o s/p.

## REGIONES AXILARES
Ganglios axilares bilaterales: número, tamaño, morfología, hilio graso preservado o no, o s/p.

## CONCLUSIÓN
Mencionar SOLO hallazgos patológicos. Incluir clasificación BIRADS si fue dictada.

REGLA DE CONCLUSIÓN: Incluir categoría BIRADS final si el médico la dictó. PROHIBIDO inventar valores.`
    },

    // ── ECOGRAFÍA OBSTÉTRICA ──────────────────────────────────────
    ecografia_obstetrica: {
        name: "Ecografía Obstétrica",
        category: "Ginecología",
        keywords: ["ecografía obstétrica", "ecografía de embarazo", "ecografía fetal", "gestación", "feto", "biometría fetal", "placenta", "líquido amniótico", "frecuencia cardíaca fetal", "diámetro biparietal", "circunferencia cefálica", "circunferencia abdominal", "longitud femoral", "translucencia nucal", "scan morfológico", "doppler fetal", "vitalidad fetal", "semanas de gestación"],
        prompt: `Actúa como obstetra/ecografista. Estructura este informe de ecografía obstétrica:

# INFORME DE ECOGRAFÍA OBSTÉTRICA

## DATOS GESTACIONALES
Edad gestacional por FUM y por biometría, número de fetos, vitalidad (FCF), presentación.

## BIOMETRÍA FETAL
DBP, CC, CA, LF (en mm), peso estimado (en gramos), percentil si fue dictado.

## ANATOMÍA FETAL
Cráneo, cara, columna, tórax, corazón, abdomen, extremidades, genitales. Hallazgos o s/p.

## PLACENTA
Ubicación, grado de madurez (Grannum), inserción del cordón, número de vasos.

## LÍQUIDO AMNIÓTICO
Cantidad (normal/oligoamnios/polihidramnios), ILA si fue dictado.

## CÉRVIX
Longitud cervical si fue evaluada, aspecto.

## DOPPLER
Arteria umbilical, arteria cerebral media, ductus venoso, arterias uterinas si fueron evaluados, o s/p.

## CONCLUSIÓN
Resumen de hallazgos relevantes. Incluir edad gestacional, peso estimado y hallazgos patológicos si los hay.

IMPORTANTE: No inventes datos. Solo estructura lo dictado. Las secciones no evaluadas deben omitirse o indicar s/p.`
    },

    // ── ECO DOPPLER VASCULAR ─────────────────────────────────────
    eco_doppler: {
        name: "Eco Doppler Vascular",
        category: "Imágenes",
        keywords: ["eco doppler", "doppler vascular", "doppler venoso", "doppler arterial", "doppler carotídeo", "trombosis venosa", "TVP", "placa aterosclerótica", "estenosis carotídea", "reflujo venoso", "insuficiencia venosa", "índice tobillo-brazo"],
        prompt: `Actúa como médico especialista en diagnóstico por imágenes vascular. Estructura este informe de Eco Doppler vascular:

# INFORME DE ECO DOPPLER VASCULAR

## TERRITORIO ESTUDIADO
Especificar: venoso, arterial, carotídeo, miembros superiores/inferiores, u otro.

## TÉCNICA
Breve descripción de la técnica utilizada si fue dictada, o s/p.

## HALLAZGOS
Descripción ordenada por segmento anatómico o por vaso. Para cada segmento: compresibilidad, flujo, placa, estenosis (%), reflujo, índices si corresponde.
Si no hay hallazgos patológicos en un segmento, indicar s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos patológicos significativos. Si el estudio es normal, indicarlo explícitamente.

REGLA DE CONCLUSIÓN: Un párrafo corto con cada hallazgo positivo. PROHIBIDO inventar datos. Si un vaso no fue evaluado, omitirlo.`
    },

    // ── NOTA DE EVOLUCIÓN ────────────────────────────────────────
    nota_evolucion: {
        name: "Nota de Evolución",
        category: "General",
        keywords: ["nota de evolución", "evolución clínica", "plan de tratamiento", "indicaciones", "paciente internado", "paciente en sala", "guardia", "servicio de"],
        prompt: `Actúa como médico clínico. Estructura esta nota de evolución médica de forma clara y ordenada:

# NOTA DE EVOLUCIÓN

## FECHA Y SERVICIO
Fecha, hora si fue dictada, servicio o unidad.

## SUBJETIVO
Referencias del paciente, síntomas actuales, cambios desde la última evaluación.

## OBJETIVO
Signos vitales, examen físico actual, datos de laboratorio o estudios relevantes del día.

## ANÁLISIS
Interpretación clínica, diagnóstico de situación actual.

## PLAN
Indicaciones, cambios de tratamiento, estudios solicitados, interconsultas, observaciones.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si una sección no fue dictada, omitirla o escribir s/p.`
    },

    // ── EPICRISIS / RESUMEN DE INTERNACIÓN ───────────────────────
    epicrisis: {
        name: "Epicrisis / Resumen de Internación",
        category: "General",
        keywords: ["epicrisis", "resumen de internación", "alta médica", "alta hospitalaria", "diagnóstico de egreso", "tratamiento al alta", "días de internación", "internado", "egresa"],
        prompt: `Actúa como médico clínico. Estructura este resumen de internación (epicrisis):

# EPICRISIS / RESUMEN DE INTERNACIÓN

## DATOS DE LA INTERNACIÓN
Fecha de ingreso, fecha de egreso, días de internación, servicio, tipo de alta.

## MOTIVO DE INTERNACIÓN
Motivo principal por el cual el paciente fue internado.

## DIAGNÓSTICO DE INGRESO
Diagnóstico presuntivo al momento del ingreso.

## ANTECEDENTES RELEVANTES
Patologías previas, medicación habitual, alergias, antecedentes quirúrgicos si fueron mencionados.

## EVOLUCIÓN HOSPITALARIA
Resumen cronológico del curso clínico durante la internación.

## PROCEDIMIENTOS Y ESTUDIOS REALIZADOS
Intervenciones, cirugías, estudios de laboratorio e imágenes relevantes y sus resultados.

## DIAGNÓSTICO DE EGRESO
Diagnóstico definitivo al alta.

## TRATAMIENTO AL ALTA
Medicación indicada al egreso con dosis y frecuencia si fueron dictadas.

## INDICACIONES Y SEGUIMIENTO
Cuidados en domicilio, restricciones, signos de alarma, próximos turnos o controles indicados.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Las secciones sin información dictada deben omitirse o mostrar s/p.`
    },

    // ── GENERAL ─────────────────────────────────────────────────
    generico: {
        name: "Informe Médico General",
        category: "General",
        keywords: [],
        prompt: `Actúa como médico especialista. Estructura profesionalmente esta transcripción médica usando Markdown con títulos y secciones lógicas según el tipo de documento.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".`
    }
});
