// ============ MEDICAL TEMPLATES CATALOG (PART 2) ============

window.MEDICAL_TEMPLATES = Object.assign(window.MEDICAL_TEMPLATES || {}, {
ett: {
        name: "Ecocardiograma Transtorácico (ETT)",
        category: "Cardiología",
        keywords: ["ecocardiograma", "ecografía cardíaca", "ETT", "FEVI", "fracción de eyección", "ventrículo izquierdo", "ventrículo derecho", "válvula mitral", "válvula aórtica", "pericardio", "diastólico", "sistólico", "SIV", "DDVI", "DSVI"],
        prompt: `Actúa como cardiólogo ecocardiografista. Estructura este informe de ecocardiograma transtorácico (ETT) EXACTAMENTE con el siguiente formato. Usa los valores numéricos que aparezcan textualmente en el informe — NO inventes ningún valor.

# INFORME DE ECOCARDIOGRAMA TRANSTORÁCICO (ETT)

## METODOLOGÍA
Descripción breve de la técnica usada (modo M, bidimensional, Doppler) y calidad de ventana, si fueron mencionadas.

## MEDICIONES CUANTITATIVAS
Crea tablas markdown con TODOS los valores numéricos presentes en el texto. Omite filas de parámetros no mencionados.

**Modo M — Ventrículo izquierdo y Aorta**

| Parámetro | Valor | Unidad |
|---|---|---|
| DDVI (diámetro diastólico VI) | {valor o omitir} | mm |
| DSVI (diámetro sistólico VI) | {valor o omitir} | mm |
| SIVD (septo interventricular diástole) | {valor o omitir} | mm |
| PPDIA (pared posterior diástole) | {valor o omitir} | mm |
| FE (fracción de eyección) | {valor o omitir} | % |
| Fracción de acortamiento | {valor o omitir} | % |
| Masa VI | {valor o omitir} | g |
| Diámetro Ao (aorta) | {valor o omitir} | mm |
| Diámetro AI (aurícula izquierda) | {valor o omitir} | mm |
| Índice DAI/DAO | {valor o omitir} | — |

**B-Mode — Volúmenes aurícula izquierda**

| Parámetro | Valor | Unidad |
|---|---|---|
| Área AI 4C sistólica | {valor o omitir} | cm² |
| Longitud AI (LAI) | {valor o omitir} | mm |
| Volumen AI (VAI) | {valor o omitir} | mL |

**Doppler Mitral (flujo transmitral)**

| Parámetro | Valor | Unidad |
|---|---|---|
| VPem (vel. pico onda E mitral) | {valor o omitir} | m/s |
| VPam (vel. pico onda A mitral) | {valor o omitir} | m/s |
| Relación E/A mitral | {valor o omitir} | — |
| GRPem (grad. presión onda E) | {valor o omitir} | mmHg |
| GRPam (grad. presión onda A) | {valor o omitir} | mmHg |
| TDEm (tiempo desaceleración E) | {valor o omitir} | ms |
| THPM (tiempo hemipresión) | {valor o omitir} | ms |
| AVM (área válvula mitral) | {valor o omitir} | cm² |

**Doppler Tisular del anillo mitral (TV tisular)**

| Parámetro | Valor | Unidad |
|---|---|---|
| VPE'm (vel. pico e' sistólica) | {valor o omitir} | m/s |
| VPA'm (vel. pico a' diastólica) | {valor o omitir} | m/s |
| Relación E'/A' mitral | {valor o omitir} | — |
| Relación E/E' mitral | {valor o omitir} | — |

**Doppler Aórtico**

| Parámetro | Valor | Unidad |
|---|---|---|
| Vel AO (vel. pico flujo aórtico) | {valor o omitir} | m/s |
| GRP AOD (grad. presión aórtico) | {valor o omitir} | mmHg |
| Vel TAOVI (vel. TSVI) | {valor o omitir} | m/s |
| Grad TAOV | {valor o omitir} | mmHg |
| Área aórtica efectiva | {valor o omitir} | cm² |

REGLA DE TABLAS: Reemplaza {valor o omitir} con el número real del texto. Si un parámetro NO aparece en el texto, elimina esa fila por completo. Mantén las unidades exactamente como se muestran.

## VENTRÍCULO IZQUIERDO
Dimensiones (DDVI, DSVI mm), espesores parietales (SIV, PP mm), FE%, función sistólica y diastólica, descripción del patrón de llenado, motilidad segmentaria, masa VI.

## VENTRÍCULO DERECHO
Tamaño, función, TAPSE si fue mencionado.

## VÁLVULA MITRAL
Morfología, apertura, distancia mitro-septal, patrón Doppler de llenado, Doppler tisular del anillo, insuficiencia (grado o s/p).

## VÁLVULA AÓRTICA
Morfología (tri/bicúspide), apertura, gradientes Doppler, insuficiencia (grado o s/p).

## VÁLVULA TRICÚSPIDE
Hallazgos, estimación de PSAP si disponible, o s/p.

## VÁLVULA PULMONAR
Hallazgos o s/p.

## AORTA
Calibre y diámetro(s) si fueron mencionados.

## PERICARDIO
Hallazgos o s/p.

## CONCLUSIÓN
Párrafo conciso. Mencionar SOLO hallazgos positivos/patológicos relevantes. Incluir siempre la FE% si fue dictada. No repetir hallazgos normales.

REGLAS GLOBALES:
- PROHIBIDO inventar o inferir valores numéricos. Solo usar los que aparecen explícitamente en el texto.
- Si un parámetro no fue mencionado, omitirlo de las tablas y escribir s/p en el texto descriptivo cuando corresponda.
- NO crear sección de datos del paciente (nombre, apellido, DNI). La app los gestiona por separado.`
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
Composición tisular (patrón ecográfico), presencia de nódulos (ubicación por cuadrante/reloj, tamaño, ecogenicidad, bordes, vascularización al Doppler, clasificación BI-RADS), quistes, ectasia ductal, o s/p.

## MAMA IZQUIERDA
Composición tisular, presencia de nódulos (mismo formato), quistes, ectasia ductal, o s/p.

## REGIONES AXILARES
Ganglios axilares bilaterales: número, tamaño, morfología, hilio graso preservado o no, o s/p.

## CONCLUSIÓN
Mencionar SOLO hallazgos patológicos. Incluir clasificación BI-RADS si fue dictada.

REGLA DE CONCLUSIÓN: Incluir categoría BI-RADS final si el médico la dictó. PROHIBIDO inventar valores.`
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

| Parámetro | Valor | Unidad |
|---|---|---|
| DBP (diámetro biparietal) | {valor o omitir} | mm |
| CC (circunferencia cefálica) | {valor o omitir} | mm |
| CA (circunferencia abdominal) | {valor o omitir} | mm |
| LF (longitud femoral) | {valor o omitir} | mm |
| Peso estimado | {valor o omitir} | g |
| Percentil | {valor o omitir} | — |

REGLA DE TABLAS: Reemplaza {valor o omitir} con el número real. Omite filas no dictadas.

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

IMPORTANTE: No inventes datos ni omisiones. Solo estructura lo dictado. Si una sección no fue mencionada, omitirla o escribir únicamente [No especificado]. PROHIBIDO escribir «no evaluado», «no fue evaluado», «no se exploró» o equivalentes — esas frases NUNCA deben aparecer.`
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

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si una sección no fue dictada, omitirla o marcar con [No especificado].`
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

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Las secciones sin información dictada deben omitirse o marcarse con [No especificado].`
    },

    // ── GENERAL ─────────────────────────────────────────────────
    generico: {
        name: "Informe Médico General",
        category: "General",
        keywords: [],
        prompt: `Actúa como médico especialista. Estructura profesionalmente esta transcripción médica usando Markdown con títulos y secciones lógicas según el tipo de documento.

IMPORTANTE: No inventes datos. Solo estructura lo que está en la transcripción. Si falta información, deja el campo con "[No especificado]".
NO crees secciones de "Datos del Paciente", "Datos Generales", "Datos Demográficos" ni similares. Los datos demográficos los gestiona la aplicación por separado. El informe debe contener SOLO secciones clínicas.`
    }
});
