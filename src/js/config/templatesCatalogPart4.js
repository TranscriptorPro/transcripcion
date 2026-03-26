// ============ MEDICAL TEMPLATES PART 4 ============

Object.assign(window.MEDICAL_TEMPLATES, {
    // ── Cardiología ─────────────────────────────────────────────────────────
    ergometria: {
        name: "Ergometría (Prueba de Esfuerzo)",
        category: "Cardiología",
        keywords: ["prueba de esfuerzo", "prueba de esfuerzo graduada", "ergometría", "treadmill", "METs", "capacidad funcional", "isquemia inducida", "protocolo Bruce"],
        prompt: `Actúa como cardiólogo especializado en ergometría. Estructura este informe de prueba de esfuerzo graduada:

# INFORME DE ERGOMETRÍA (PRUEBA DE ESFUERZO GRADUADA)

## DATOS DEL ESTUDIO
Protocolo empleado (ej: Bruce), duración total del ejercicio y METs alcanzados, motivo de finalización (fatiga/disnea/dolor/cambios ECG/arritmia/PA/metaobjetivo), medicación recibida en el momento del estudio.

## RESPUESTA HEMODINÁMICA
FC en reposo, FC máxima alcanzada (% de la FC máxima teórica), PA en reposo, PA máxima durante el ejercicio, respuesta presora (adecuada / exagerada / hipotensiva), tiempo de recuperación de FC.

## REGISTRO ELECTROCARDIOGRÁFICO
ECG basal: ritmo, FC, hallazgos relevantes o s/p.
Durante el ejercicio: cambios del segmento ST (depresión/elevación ≥ 1 mm, derivaciones involucradas, patrón horizontal/descendente/ascendente), cambios de onda T, arritmias (tipo, cantidad, momento de aparición), o s/p.
En recuperación: persistencia o resolución de cambios.

## SÍNTOMAS DURANTE LA PRUEBA
Angina (típica/atípica), disnea, claudicación, palpitaciones, mareo, o s/p (sin síntomas).

## CONCLUSIÓN
Respuesta al esfuerzo (normal/anormal), interpretación de los hallazgos isquémicos o arrítmicos, capacidad funcional alcanzada en METs. Si la prueba fue negativa para isquemia, consignar: "Prueba de esfuerzo negativa para isquemia miocárdica inducible a la carga alcanzada."

REGLA DE CONCLUSIÓN: Incluir TODOS los hallazgos patológicos dictados. Si la prueba fue limitada o submáxima, aclararlo. PROHIBIDO: inventar cambios ECG, valores de PA/FC o síntomas no dictados. PROHIBIDO: frases de carencia ("si bien no se registraron..."). Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si una sección no fue mencionada, marcar con [No especificado].`
    },

    eco_te: {
        name: "Ecocardiograma Transesofágico (ETE)",
        category: "Cardiología",
        keywords: ["ecocardiograma transesofágico", "ETE", "sonda transesofágica", "orejuela izquierda", "trombo intracavitario", "válvula mitral", "foramen oval permeable", "FOP", "endocarditis"],
        prompt: `Actúa como cardiólogo ecocardiografista especializado en ETE. Estructura este informe de ecocardiograma transesofágico:

# INFORME DE ECOCARDIOGRAMA TRANSESOFÁGICO (ETE)

## VENTANAS Y CALIDAD DEL ESTUDIO
Vía de acceso, ventanas utilizadas (esofágicas altas/medias/transgástricas), calidad de la imagen (buena/regular).

## AORTA TORÁCICA
Aorta ascendente (diámetro en mm), arco aórtico, aorta descendente; presencia de placas de ateroma (grado, movilidad), disección u otras alteraciones, o s/p.

## CAVIDADES IZQUIERDAS
Aurícula izquierda: dimensiones, morfología. Orejuela izquierda: trombo (presente/ausente), velocidad de vaciado (cm/s), presencia de contraste espontáneo, o s/p. Ventrículo izquierdo: FEy estimada, motilidad segmentaria.

## CAVIDADES DERECHAS
Aurícula derecha y ventrículo derecho: tamaño estimado, función, VCI.

## TABIQUE INTERAURICULAR
Foramen oval permeable (FOP): presente/ausente; si presente: tamaño estimado, movilidad del septo, presencia de aneurisma del septo auricular (ASA), paso de contraste derecha-izquierda, o s/p.

## VÁLVULA MITRAL
Morfología (normal/engrosada/degenerativa/reumática/prolapso/perforación), gradiente medio, área valvular si estenosis, grado de insuficiencia (0-IV) con mecanismo y jets, vegetaciones, o s/p.

## VÁLVULA AÓRTICA
Morfología (tricúspide/bicúspide), número de valvas, calcificación, grado de insuficiencia o estenosis, vegetaciones, o s/p.

## VÁLVULAS TRICÚSPIDE Y PULMONAR
Hallazgos relevantes o s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos patológicos relevantes (trombo en orejuela, FOP, valvulopatía significativa, vegetaciones, aterosclerosis aórtica, etc.). Si el estudio es normal en los parámetros evaluados, consignar: "ETE sin hallazgos que justifiquen los síntomas del paciente / sin imagen trombótica en orejuela izquierda."

REGLA DE CONCLUSIÓN: Párrafo conciso ordenado por relevancia clínica. Incluir TODOS los hallazgos patológicos dictados. PROHIBIDO: inventar medidas, grados o hallazgos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    // ── Ginecología ─────────────────────────────────────────────────────────
    eco_gineco: {
        name: "Ecografía Ginecológica (TVS/TA)",
        category: "Ginecología",
        keywords: ["ecografía transvaginal", "ecografía ginecológica", "útero", "endometrio", "ovarios", "folículos", "miometrio", "DIU", "ecografía transabdominal"],
        prompt: `Actúa como ginecólogo/ecografista especializado. Estructura este informe de ecografía ginecológica:

# INFORME DE ECOGRAFÍA GINECOLÓGICA

## VÍA DE ACCESO
Transvaginal (TV), transabdominal (TA), o ambas.

## ÚTERO
Posición (AVF/RVF), tamaño (longitud × anteroposterior × transverso en mm o cm), contorno (regular/irregular), ecoestructura miometrial (homogénea/inhomogénea). Hallazgos miometriales: miomas (número, localización —submucoso/intramural/subseroso—, tamaño, ecoestructura), adenomiosis (signos ecográficos), otras lesiones, o s/p.

## ENDOMETRIO
Grosor (mm), ecoestructura (homogéneo/heterogéneo/hiperecogénico/hipoerecogénico), regularidad de bordes, línea endometrial visible, hallazgos (pólipos, hiperplasia, DIU —posición y tipo—, colección endometrial), o s/p.

## OVARIO DERECHO
Tamaño (longitudinal × AP × transverso en mm), ecoestructura, folículos (número, tamaño del dominante si aplica), quistes (tamaño, características —simple/complejo/endometrioma—), cuerpo lúteo, hallazgos patológicos, o s/p.

## OVARIO IZQUIERDO
Igual estructura que ovario derecho, o s/p.

## DOUGLAS Y PELVIS
Presencia de líquido libre en Douglas (cantidad estimada), otras colecciones pélvicas, o s/p.

## CONCLUSIÓN
Mencionar SOLO los hallazgos patológicos o significativos. Si el estudio es normal, consignar: "Ecografía ginecológica dentro de parámetros normales para la edad de la paciente."

REGLA DE CONCLUSIÓN: Ordenado por relevancia clínica. Incluir TODOS los hallazgos patológicos dictados. No repetir medidas normales. PROHIBIDO: inventar medidas, quistes o hallazgos no dictados. PROHIBIDO: frases de carencia. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si no se evaluó una estructura, consignar "[No visualizado]".`
    },

    histeroscopia: {
        name: "Histeroscopía",
        category: "Ginecología",
        keywords: ["histeroscopía", "cavidad uterina", "endometrio", "cuello uterino", "canal cervical", "pólipos endometriales", "mioma submucoso", "sinequias", "ostium tubárico"],
        prompt: `Actúa como ginecólogo endoscopista especializado en histeroscopía. Estructura este informe:

# INFORME DE HISTEROSCOPÍA

## DATOS DEL PROCEDIMIENTO
Indicación, tipo (diagnóstica/quirúrgica), medio de distensión, cervicometría (longitud del canal), calidad de la imagen.

## CANAL CERVICAL
Permeabilidad, longitud (cm), hallazgos (pólipos endocervicales, estenosis, irregularidades), o s/p.

## CAVIDAD UTERINA
Forma de la cavidad, dimensiones estimadas. Paredes (anterior, posterior, fondo): descripción del endometrio (aspecto: atrófico/proliferativo/secretor/irregular/heterogéneo), hallazgos (pólipos —número, localización, tamaño estimado—, miomas submucosos —número, tamaño, base de implantación—, sinequias —grado, extensión—, tabique uterino —completo/parcial—, otras lesiones), o s/p.

## OSTIA TUBÁRICOS
Derecho: visible/no visible, aspecto. Izquierdo: visible/no visible, aspecto.

## PROCEDIMIENTO QUIRÚRGICO (si aplica)
Técnica empleada (polipectomía/miomectomía/lisis de sinequias/metroplastia/etc.), hallazgos intraoperatorios, material resecado.

## CONCLUSIÓN
Diagnóstico histeroscópico. Mencionar SOLO los hallazgos patológicos. Si el estudio es normal, consignar: "Cavidad uterina ecográficamente normal. Ostia permeables. Sin hallazgos endocavitarios."

REGLA DE CONCLUSIÓN: Párrafo conciso con diagnóstico y conducta si fue quirúrgica. PROHIBIDO: inventar hallazgos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    // ── Neurología ──────────────────────────────────────────────────────────
    eeg: {
        name: "EEG (Electroencefalograma)",
        category: "Neurología",
        keywords: ["electroencefalograma", "EEG", "actividad eléctrica cerebral", "ondas cerebrales", "ritmo de fondo", "actividad epileptiforme", "epilepsia", "privación de sueño"],
        prompt: `Actúa como neurólogo especializado en electroencefalografía. Estructura este informe de EEG:

# INFORME DE ELECTROENCEFALOGRAMA (EEG)

## CONDICIONES DEL REGISTRO
Duración del registro (minutos), estado del paciente (vigilia/somnolencia/sueño), cooperación, privación de sueño (sí/no), medicación actual relevante, indicación del estudio.

## ACTIVIDAD DE FONDO
Ritmo predominante en vigilia: frecuencia (Hz), amplitud (µV), distribución topográfica (occipital/generalizado), regularidad (simétrico/asimétrico). Ritmo alfa (si presente): frecuencia, reactividad a la apertura ocular. Ondas beta, theta o delta intercurrentes en vigilia: presencia, distribución, significado.

## ACTIVIDAD PAROXÍSTICA
Descargas epileptiformes: tipo (puntas/punta-onda/polipunta/punta-onda lenta), distribución (focal —especificar lóbulo y lateralidad— /multifocal/generalizada), frecuencia de aparición, morfología, relación con los síntomas, o s/p (sin actividad epileptiforme).

## SUEÑO (si fue registrado)
Presencia de husos de sueño, complejos K, grafoelementos normales de N2. Actividad epileptiforme durante el sueño, o s/p.

## ACTIVACIÓN (si fue realizada)
Hiperventilación: respuesta (normal/anormal), aparición de cambios significativos.
Estimulación luminosa intermitente: respuesta fotoparoxística (sí/no), Hz desencadenantes.

## CONCLUSIÓN
Interpretación global: EEG normal / anormal. Si hay hallazgos, especificar tipo (foco epileptiforme temporal/parietal/etc., actividad generalizada, lentificación focal, etc.) y relevancia clínica. Si el estudio es normal, consignar: "EEG dentro de límites normales para la edad."

REGLA DE CONCLUSIÓN: Párrafo conciso. Incluir TODOS los hallazgos patológicos dictados. Mencionar correlación clínico-electroencefalográfica si fue dictada. PROHIBIDO: inventar frecuencias, amplitudes o focos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si una sección no fue mencionada, marcar con [No especificado].`
    },

    potenciales_evocados: {
        name: "Potenciales Evocados",
        category: "Neurología",
        keywords: ["potenciales evocados", "PEV", "PEA", "PESS", "latencia", "amplitud", "conducción nerviosa central", "esclerosis múltiple", "desmielinización"],
        prompt: `Actúa como neurólogo especializado en potenciales evocados. Estructura este informe:

# INFORME DE POTENCIALES EVOCADOS

## TIPO DE ESTUDIO REALIZADO
Indicar cuál/cuáles de los siguientes: Potenciales Evocados Visuales (PEV), Auditivos de Tronco (PEAT), Somatosensitivos (PESS), Motores (PEM). Indicación clínica.

## POTENCIALES EVOCADOS VISUALES (PEV) — si fueron realizados
OD: latencia P100 (ms), amplitud (µV) — Normal / Prolongada / No reproducible.
OI: latencia P100 (ms), amplitud (µV) — Normal / Prolongada / No reproducible.
Asimetría interojos: si existe, diferencia en ms.

## POTENCIALES EVOCADOS AUDITIVOS DE TRONCO (PEAT) — si fueron realizados
OD e OI: latencias de ondas I, III y V (ms), intervalos interpico I-III, III-V, I-V.
Amplitud relativa V/I. Umbral estimado por PE (dBnHL) si fue solicitado.
Resultado: Normal / Anormal (hipoacusia/neuropatía auditiva/lesión en tronco).

## POTENCIALES EVOCADOS SOMATOSENSITIVOS (PESS) — si fueron realizados
Estimulación: nervio mediano (miembro superior) y/o tibial posterior (miembro inferior).
Latencias de picos N20/P40, N13/N9 u otros componentes relevantes. Amplitudes.
Lado derecho e izquierdo comparados. Resultado: Normal / Prolongado / No reproducible.

## CONCLUSIÓN
Mencionar SOLO los hallazgos patológicos (prolongación de latencias, abolición de ondas, asimetría significativa). Especificar a qué nivel corresponde la alteración (vía visual/auditiva/somatosensitiva, segmento afectado). Si el estudio es normal, consignar: "Potenciales evocados [especificar tipo] dentro de límites normales."

REGLA DE CONCLUSIÓN: Incluir TODOS los hallazgos dictados. PROHIBIDO: inventar latencias, amplitudes o diagnósticos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    // ── Urología ────────────────────────────────────────────────────────────
    uroflujometria: {
        name: "Uroflujometría",
        category: "Urología",
        keywords: ["uroflujometría", "flujo urinario", "Qmax", "flujo máximo", "flujo promedio", "volumen miccional", "tiempo de micción", "residuo postmiccional", "obstrucción urinaria", "hipertrofia prostática"],
        prompt: `Actúa como urólogo especializado. Estructura este informe de uroflujometría:

# INFORME DE UROFLUJOMETRÍA

## CONDICIONES DEL ESTUDIO
Volumen miccional (mL), ganas de orinar al inicio (normal/imperiosa/mínima), micción espontánea (sí/no), artefactos (sí/no).

## PARÁMETROS FLUJOMÉTRICOS
Qmax — flujo máximo (mL/s): valor obtenido (normal ≥ 15 mL/s en varones; ≥ 20 mL/s en mujeres).
Qave — flujo promedio (mL/s).
Tiempo hasta Qmax (s).
Tiempo total de micción (s).
Tiempo de flujo (s).
Morfología de la curva: normal (campana simétrica) / en meseta / bifásica / irregular / suprimida.

## RESIDUO POSTMICCIONAL
Volumen residual por ecografía o cateterismo (mL). Normal (< 50 mL) / Aumentado / Retención.

## CONCLUSIÓN
Interpretación clínica: flujo normal / disminuido / patrón obstructivo (infravesical: HPB, estenosis uretral) / patrón miógeno (hipocontractilidad del detrusor) / patrón normal para la edad. Si es normal, consignar: "Uroflujometría dentro de parámetros normales. Residuo postmiccional despreciable."

REGLA DE CONCLUSIÓN: Incluir TODOS los hallazgos patológicos dictados con su interpretación clínica. PROHIBIDO: inventar valores de flujo o residuo no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado. Si una medida no fue mencionada, marcar con [No especificado].`
    },

    // ── Musculoesquelético ──────────────────────────────────────────────────
    artroscopia: {
        name: "Artroscopía",
        category: "Musculoesquelético",
        keywords: ["artroscopía", "artroscopia", "menisco", "cartílago articular", "ligamento cruzado", "sinovial", "rodilla", "hombro", "cadera", "tobillo", "cirugía artroscópica"],
        prompt: `Actúa como cirujano traumatólogo especializado en artroscopía. Estructura este informe:

# INFORME DE ARTROSCOPÍA

## DATOS DEL PROCEDIMIENTO
Articulación intervenida (rodilla/hombro/cadera/tobillo/muñeca/otra), posición del paciente, tipo de anestesia, isquemia (sí/no), portales utilizados, diagnóstico preoperatorio.

## HALLAZGOS ARTROSCÓPICOS

### COMPARTIMIENTO MEDIAL (o equivalente según articulación)
Estado del menisco medial (integridad, tipo de lesión —rotura longitudinal/radial/horizontal/asa de cubo—, grado de degeneración), cartílago tibial medial y femoral (grado Outerbridge I-IV), ligamento colateral medial, o s/p.

### COMPARTIMIENTO LATERAL (o equivalente)
Estado del menisco lateral, cartílago tibial lateral y femoral, ligamento colateral lateral, o s/p.

### ESPACIO INTERCONDÍLEO
Ligamento cruzado anterior (LCA): íntegro / lesión parcial / rotura completa (descripción del muñón). Ligamento cruzado posterior (LCP): estado. Escotadura intercondílea: osteofitos, o s/p.

### COMPARTIMIENTO ANTERIOR
Sinovial (sinovitis: grado —leve/moderada/severa—/normal), plica sinovial (inflamada/ausente), rótula (cartílago rotuliano Outerbridge), tróclea femoral.

### COMPARTIMIENTO POSTERIOR (si explorado)
Hallazgos relevantes o s/p.

## GESTOS QUIRÚRGICOS REALIZADOS
Meniscectomía parcial (zona/porción resecada), meniscorrafia, condrocondroplastia, sinovectomía, tunnelización/microfractura, ligamentoplastia (técnica), extracción de cuerpos libres, otras maniobras.

## CONCLUSIÓN
Diagnóstico artroscópico definitivo. Resumen de los hallazgos patológicos y gestos quirúrgicos realizados. Si el procedimiento fue únicamente diagnóstico, especificarlo.

REGLA DE CONCLUSIÓN: Incluir TODOS los hallazgos patológicos dictados. Mencionar gestos quirúrgicos con técnica empleada. PROHIBIDO: inventar hallazgos o procedimientos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    eco_musculoesqueletica: {
        name: "Ecografía Musculoesquelética",
        category: "Musculoesquelético",
        keywords: ["ecografía musculoesquelética", "tendones", "músculos", "ligamentos", "bursitis", "sinovitis", "colección articular", "rotura tendinosa", "entesitis", "tenosinovitis"],
        prompt: `Actúa como médico especializado en ecografía musculoesquelética. Estructura este informe:

# INFORME DE ECOGRAFÍA MUSCULOESQUELÉTICA

## REGIÓN EXAMINADA
Especificar: hombro / rodilla / tobillo / cadera / muñeca / codo / otra. Lado: derecho / izquierdo / bilateral.

## PARTES BLANDAS
Piel y tejido celular subcutáneo: engrosamiento, colecciones, nódulos, lipomas, o s/p.

## TENDONES EVALUADOS
Para cada tendón evaluado:
- Nombre del tendón, integridad (íntegro/rotura parcial —porcentaje estimado— /rotura completa), ecoestructura (normal/hipoecoica/calcificaciones/degeneración), engrosamiento focal, vascularización al Doppler color (normal/aumentada —signo de neovasos—), or s/p.

## BURSAS
Presencia de bursitis (nombre de la bursa, contenido —líquido anecoico/ecos internos—, tamaño estimado), o s/p.

## ARTICULACIÓN
Derrame articular (presente/ausente, volumen estimado, contenido —anecoico/ecos—), sinovitis (engrosamiento sinovial, vascularización Doppler), cuerpos libres, o s/p.

## ESTRUCTURAS NEUROVASCULARES (si evaluadas)
Nervios principales pericampanulares (agrandamiento, ecoestructura), vasos (permeabilidad al Doppler), o s/p.

## COMPARACIÓN CON LADO CONTRALATERAL (si fue realizada)
Diferencias significativas encontradas.

## CONCLUSIÓN
Mencionar SOLO los hallazgos patológicos (tendones, bursas, articulación, partes blandas). Si el estudio es normal, consignar: "Ecografía musculoesquelética de [región] sin hallazgos patológicos significativos."

REGLA DE CONCLUSIÓN: Ordenado por relevancia clínica. Incluir TODOS los hallazgos dictados. PROHIBIDO: inventar medidas o hallazgos no dictados. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    },

    // ── Dermatología ────────────────────────────────────────────────────────
    dermatoscopia: {
        name: "Dermatoscopía",
        category: "Dermatología",
        keywords: ["dermatoscopía", "dermatoscopia", "dermoscopía", "nevus", "melanoma", "lesión pigmentada", "red de pigmento", "patrón vascular", "ABCDE", "globos", "velos azul-blanco"],
        prompt: `Actúa como dermatólogo especializado en dermatoscopía. Estructura este informe:

# INFORME DE DERMATOSCOPÍA

## DATOS DE LA LESIÓN
Localización anatómica exacta, tamaño clínico aproximado (mm), color macroscópico, aspecto clínico (mácula/pápula/placa/nódulo/melanocítica/no melanocítica).

## DESCRIPCIÓN DERMATOSCÓPICA

### PATRÓN GLOBAL
Tipo de patrón global: reticular / globular / empedrado / homogéneo / estrellado / multifocal / sin estructura / mixto.

### ESTRUCTURAS MELANOCÍTICAS (si aplica)
Red pigmentada: típica (fina, regular) / atípica (gruesa, irregular, prominente). Glóbulos/puntos: regulares / irregulares, distribución. Proyecciones/pseudópodos: presencia, distribución (radial simétrica / asimétrica / focal). Velo azul-blanco: presente (extensión) / ausente. Regresión: cicatricial (blanca) / punteada (azul/gris). Hipopigmentación o parches blancos.

### ESTRUCTURAS VASCULARES
Vasos: tipo (puntiformes/asas/irregulares/en coma/en horquilla/lagunas/telangiectasias), distribución (regular/irregular), fondo (rosado/eritematoso/blanco).

### CRITERIOS ESPECÍFICOS (según tipo de lesión)
Para lesiones NO melanocíticas:
Queratosis seborreica: pseudoquistes córneos, criptas, giros y crestas.
Carcinoma basocelular: nidos ovoides, árbol vascular arboriforme, ulceración.
Angioma: lagunas rojo-azuladas.

## CRITERIOS ALGORÍTMICOS (si aplicados)
Regla de los 7 puntos de Argenziana / Análisis de patrón / Menzies / Otra: resultado (benigno/sospechoso/maligno).

## CONCLUSIÓN
Diagnóstico dermatoscópico. Categoría de riesgo (Benign / Sospechosa / Maligna). Hallazgos dermatoscópicos más relevantes. Conducta recomendada (seguimiento fotográfico / escisión / biopsia).

Si la lesión es benigna, consignar: "Lesión con características dermatoscópicas de [tipo] benigna. Se recomienda control clínico-dermatoscópico en [plazo]."

REGLA DE CONCLUSIÓN: Incluir TODOS los hallazgos dictados. PROHIBIDO: inventar patrones o estructuras no dictadas. Escribir en español médico formal.
IMPORTANTE: No inventes datos. Solo estructura lo dictado.`
    }
});
