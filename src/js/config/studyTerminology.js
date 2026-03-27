// ============================================================
//  TERMINOLOGÍA POR ESTUDIO — Deep Research NLM / PubMed
//  studyTerminology.js
//
//  54 estudios con keywords, abreviaturas, clasificaciones,
//  unidades y correcciones Whisper ASR.
//  Fuente: Compendio Integral de Procedimientos Diagnósticos
//          y Documentación Clínica + manuales médicos.
// ============================================================

window.STUDY_TERMINOLOGY = [
  // ══════════════════════════════════════════════════════════
  //  NEUMOLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Espirometría",
    templateKey: "espirometria",
    category: "Neumología",
    keywords: ["capacidad vital forzada", "volumen espiratorio forzado", "índice de Tiffeneau", "basal y post-broncodilatadores", "patrón obstructivo", "patrón restrictivo", "atrapamiento aéreo", "curva flujo-volumen"],
    abreviaturas: { CVF: "Capacidad Vital Forzada", FVC: "Forced Vital Capacity", VEF1: "Volumen Espiratorio Forzado en el primer segundo", FEV1: "Forced Expiratory Volume in 1 second", PEF: "Flujo espiratorio máximo" },
    clasificaciones: ["GOLD", "ATS/ERS", "GLI"],
    unidades: ["L", "L/s", "%", "mL"]
  },
  {
    estudio: "Test de Marcha 6 min",
    templateKey: "test_marcha",
    category: "Neumología",
    keywords: ["caminata de los seis minutos", "saturación de oxígeno", "desaturación al esfuerzo", "frecuencia cardíaca", "disnea", "fatiga muscular", "esfuerzo submáximo"],
    abreviaturas: { TM6M: "Test de marcha de 6 minutos", SpO2: "Saturación de oxígeno por pulso-oximetría", SatO2: "Saturación de oxígeno", FC: "Frecuencia cardíaca" },
    clasificaciones: ["Escala de Borg"],
    unidades: ["m", "%", "lpm"]
  },
  {
    estudio: "Pletismografía corporal",
    templateKey: "pletismografia",
    category: "Neumología",
    keywords: ["cabina pletismográfica", "volúmenes pulmonares", "capacidad pulmonar total", "volumen residual", "resistencia de la vía aérea", "ley de Boyle", "hiperinsuflación pulmonar"],
    abreviaturas: { CPT: "Capacidad Pulmonar Total", TLC: "Total Lung Capacity", VR: "Volumen Residual", RV: "Residual Volume", Raw: "Resistencia de la vía aérea" },
    clasificaciones: ["ATS/ERS"],
    unidades: ["L", "cmH2O", "mL", "sGaw"]
  },
  {
    estudio: "Oximetría nocturna",
    templateKey: "oximetria_nocturna",
    category: "Neumología",
    keywords: ["saturometría de pulso", "monitoreo nocturno", "frecuencia cardíaca", "apneas obstructivas", "desaturación", "intercambio gaseoso"],
    abreviaturas: { SpO2: "Saturación de oxígeno", SAOS: "Síndrome de Apnea Obstructiva del Sueño", FC: "Frecuencia cardíaca" },
    clasificaciones: [],
    unidades: ["%", "lpm"]
  },

  // ══════════════════════════════════════════════════════════
  //  OFTALMOLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Campimetría Humphrey",
    templateKey: "campimetria",
    category: "Oftalmología",
    keywords: ["campo visual computarizado", "sensibilidad retiniana diferencial", "glaucoma", "desviación media", "desviación estándar del patrón", "fijación central"],
    abreviaturas: { MD: "Desviación Media", PSD: "Desviación Estándar del Patrón", CV: "Campo Visual" },
    clasificaciones: [],
    unidades: ["dB"]
  },
  {
    estudio: "OCT Retinal",
    templateKey: "oct_retinal",
    category: "Oftalmología",
    keywords: ["tomografía de coherencia óptica", "mácula", "papila", "capa de fibras nerviosas de la retina", "espesor retinal", "edema macular diabético", "degeneración macular"],
    abreviaturas: { OCT: "Tomografía de Coherencia Óptica", CFNR: "Capa de Fibras Nerviosas de la Retina", DMAE: "Degeneración Macular Asociada a la Edad" },
    clasificaciones: [],
    unidades: ["µm", "micras"]
  },
  {
    estudio: "Topografía Corneal",
    templateKey: "topografia_corneal",
    category: "Oftalmología",
    keywords: ["mapeo de curvatura corneal", "superficie anterior del ojo", "queratocono", "ectasias cornéales", "mapas colorimétricos", "cirugía refractiva"],
    abreviaturas: { LASIK: "Laser-Assisted in Situ Keratomileusis" },
    clasificaciones: [],
    unidades: ["D", "dioptrías", "mm"]
  },
  {
    estudio: "Fondo de Ojo",
    templateKey: "fondo_ojo",
    category: "Oftalmología",
    keywords: ["retinografía", "retinopatía diabética", "microaneurismas", "exudados", "hemorragias", "nervio óptico", "mácula", "vasos retinales"],
    abreviaturas: { FO: "Fondo de Ojo", RD: "Retinopatía Diabética" },
    clasificaciones: [],
    unidades: []
  },
  {
    estudio: "Gonioscopía",
    templateKey: "gonioscopia",
    category: "Oftalmología",
    keywords: ["ángulo camerular", "shaffer", "spaeth", "malla trabecular", "espolón escleral", "línea de schwalbe", "sinequias anteriores periféricas", "pas", "rubeosis"],
    abreviaturas: { PAS: "Sinequias Anteriores Periféricas", OD: "Ojo Derecho", OI: "Ojo Izquierdo" },
    clasificaciones: ["Shaffer", "Spaeth"],
    unidades: ["grados", "+", "cuadrantes", "horas"]
  },

  // ══════════════════════════════════════════════════════════
  //  IMÁGENES
  // ══════════════════════════════════════════════════════════
  {
    estudio: "TAC",
    templateKey: "tac",
    category: "Imágenes",
    keywords: ["tomografía computada", "multislice", "contraste endovenoso", "corte transversal", "alta resolución", "intersticio pulmonar", "reconstrucción tridimensional"],
    abreviaturas: { TAC: "Tomografía Axial Computada", TC: "Tomografía Computada", TACAR: "TAC de Alta Resolución" },
    clasificaciones: ["Lung-RADS"],
    unidades: ["mm", "cm", "HU"]
  },
  {
    estudio: "Resonancia Magnética",
    templateKey: "resonancia",
    category: "Imágenes",
    keywords: ["resonancia", "imanes", "ondas de radio", "tejidos blandos", "osteoarticular", "señales de intensidad", "contraste paramagnético", "gadolinio"],
    abreviaturas: { RMN: "Resonancia Magnética Nuclear", RM: "Resonancia Magnética", FLAIR: "Fluid-Attenuated Inversion Recovery" },
    clasificaciones: [],
    unidades: ["mm", "cm", "T"]
  },
  {
    estudio: "Mamografía Digital",
    templateKey: "mamografia",
    category: "Imágenes",
    keywords: ["mamografía digital directa", "mamas densas", "cribado de cáncer de mama", "microcalcificaciones", "nódulo", "asimetría"],
    abreviaturas: { Mx: "Mamografía" },
    clasificaciones: ["BI-RADS"],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Densitometría Ósea (DXA)",
    templateKey: "densitometria",
    category: "Imágenes",
    keywords: ["absorciometría de rayos X de doble energía", "densidad mineral ósea", "osteoporosis", "osteopenia", "riesgo de fracturas"],
    abreviaturas: { DXA: "Dual-energy X-ray Absorptiometry", DEXA: "Dual-energy X-ray Absorptiometry", DMO: "Densidad Mineral Ósea" },
    clasificaciones: ["Criterios de la OMS"],
    unidades: ["g/cm2", "DE"]
  },
  {
    estudio: "PET-CT",
    templateKey: "pet_ct",
    category: "Imágenes",
    keywords: ["tomografía por emisión de positrones", "imagen molecular", "trazadores radiactivos", "metabolismo glucídico", "células tumorales", "estadificación", "respuesta terapéutica"],
    abreviaturas: { "PET-CT": "Positron Emission Tomography - Computed Tomography", "18-FDG": "18-fluorodesoxiglucosa" },
    clasificaciones: ["SUVmax"],
    unidades: ["SUV", "mm", "cm"]
  },
  {
    estudio: "Radiografía Convencional",
    templateKey: "rx_torax",
    category: "Imágenes",
    keywords: ["placa", "telerradiografía de tórax", "frente y perfil", "silueta cardíaca", "índice cardiotorácico", "proyección póstero-anterior", "senos costodiafragmáticos"],
    abreviaturas: { Rx: "Radiografía", RxT: "Radiografía de Tórax", ICT: "Índice cardiotorácico" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Ecografía Abdominal/Doppler",
    templateKey: "eco_abdominal",
    category: "Imágenes",
    keywords: ["ecografía", "ultrasonografía", "eco Doppler", "trombosis venosa profunda", "placas de ateroma", "flujo sanguíneo", "estenosis", "parénquima hepático", "vía biliar", "litiasis"],
    abreviaturas: { TVP: "Trombosis Venosa Profunda", VBP: "Vía Biliar Principal" },
    clasificaciones: [],
    unidades: ["mm", "cm", "cm/s", "m/s"]
  },

  // ══════════════════════════════════════════════════════════
  //  ENDOSCOPÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Gastroscopía/EDA",
    templateKey: "gastroscopia",
    category: "Endoscopía",
    keywords: ["esofagogastroduodenoscopía", "videoendoscopía digestiva alta", "mucosa gástrica", "esófago", "duodeno", "úlcera péptica", "hernia hiatal", "reflujo", "Helicobacter pylori"],
    abreviaturas: { VEDA: "Videoendoscopía Digestiva Alta", EGD: "Esofagogastroduodenoscopía", ERGE: "Enfermedad por Reflujo Gastroesofágico" },
    clasificaciones: ["Los Angeles", "Forrest", "Sakita"],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Colonoscopía",
    templateKey: "colonoscopia",
    category: "Endoscopía",
    keywords: ["videoendoscopía digestiva baja", "ciego", "válvula ileocecal", "pólipos", "divertículos", "preparación colónica", "mucosa colónica", "lesiones sésiles", "lesiones pediculadas"],
    abreviaturas: { VEDB: "Videoendoscopía Digestiva Baja", VCC: "Videocolonoscopía" },
    clasificaciones: ["Boston", "Adenomatosos"],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Broncoscopía",
    templateKey: "broncoscopia",
    category: "Endoscopía",
    keywords: ["fibrobroncoscopía", "árbol bronquial", "lavado broncoalveolar", "biopsia transbronquial", "cuerdas vocales", "carina", "lesiones endobronquiales"],
    abreviaturas: { FBC: "Fibrobroncoscopía", LBA: "Lavado Broncoalveolar", BTB: "Biopsia Transbronquial" },
    clasificaciones: [],
    unidades: ["mL", "mm"]
  },
  {
    estudio: "Laringoscopía",
    templateKey: "laringoscopia",
    category: "Endoscopía",
    keywords: ["fibroscopía laríngea", "cuerdas vocales", "glotis", "movilidad cordal", "nódulos", "pólipos", "granulomas", "disfonía", "laringoscopía indirecta"],
    abreviaturas: { VNL: "Videonasolaringoscopía" },
    clasificaciones: [],
    unidades: ["mm"]
  },

  // ══════════════════════════════════════════════════════════
  //  CARDIOLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Gammagrafía Cardíaca SPECT",
    templateKey: "spect_cardio",
    category: "Cardiología",
    keywords: ["perfusión miocárdica", "estudio de medicina nuclear", "isquemia", "necrosis", "defectos de captación", "tejido viable", "apremio farmacológico"],
    abreviaturas: { SPECT: "Single Photon Emission Computed Tomography" },
    clasificaciones: [],
    unidades: ["%"]
  },
  {
    estudio: "Holter ECG",
    templateKey: "holter",
    category: "Cardiología",
    keywords: ["registro continuo del electrocardiograma", "arritmias", "extrasístoles ventriculares", "extrasístoles supraventriculares", "taquicardias", "pausas sinusales", "diario de síntomas"],
    abreviaturas: { EV: "Extrasístoles Ventriculares", ESV: "Extrasístoles Supraventriculares", TSV: "Taquicardia Supraventricular" },
    clasificaciones: [],
    unidades: ["lpm", "hrs", "ms"]
  },
  {
    estudio: "MAPA",
    templateKey: "mapa",
    category: "Cardiología",
    keywords: ["presurometría de 24 horas", "monitoreo ambulatorio de presión arterial", "hipertensión arterial", "efecto de guardapolvo blanco", "sístole", "diástole", "patrón diurno", "patrón nocturno"],
    abreviaturas: { MAPA: "Monitoreo Ambulatorio de Presión Arterial", HTA: "Hipertensión Arterial" },
    clasificaciones: ["dipper", "non-dipper", "dipper extremo"],
    unidades: ["mmHg"]
  },
  {
    estudio: "Cinecoronariografía",
    templateKey: "cinecoronariografia",
    category: "Cardiología",
    keywords: ["cateterismo cardíaco", "arterias coronarias", "estenosis", "acceso radial", "acceso femoral", "contraste radiopaco", "angioplastia", "stent", "tronco de la coronaria izquierda"],
    abreviaturas: { CCG: "Cinecoronariografía", ATC: "Angioplastia Transluminal Coronaria", DA: "Descendente Anterior", Cx: "Circunfleja", CD: "Coronaria Derecha" },
    clasificaciones: ["SYNTAX", "TIMI"],
    unidades: ["%"]
  },
  {
    estudio: "ECG",
    templateKey: "ecg",
    category: "Cardiología",
    keywords: ["electrocardiograma", "ritmo sinusal", "12 derivaciones", "complejo QRS", "onda P", "onda T", "segmento ST", "hipertrofia ventricular", "isquemia aguda"],
    abreviaturas: { ECG: "Electrocardiograma", EKG: "Electrocardiograma", HVI: "Hipertrofia Ventricular Izquierda", IAM: "Infarto Agudo de Miocardio" },
    clasificaciones: [],
    unidades: ["ms", "mV", "lpm"]
  },
  {
    estudio: "Eco-Stress",
    templateKey: "eco_stress",
    category: "Cardiología",
    keywords: ["ecocardiograma de estrés", "dobutamina", "ejercicio en cinta", "contractilidad miocárdica", "ventrículo izquierdo", "enfermedad coronaria obstructiva", "motilidad parietal"],
    abreviaturas: { EEDBT: "Ecocardiograma de estrés con dobutamina" },
    clasificaciones: [],
    unidades: ["%", "lpm", "mmHg"]
  },
  {
    estudio: "Ecocardiograma Transtorácico (ETT)",
    templateKey: "eco_cardio",
    category: "Cardiología",
    keywords: ["eco cardíaco", "tamaño de las cavidades", "espesor de las paredes", "función de las válvulas", "fracción de eyección", "aurícula izquierda", "ventrículo izquierdo", "presión sistólica de la arteria pulmonar", "excursión sistólica del plano tricuspídeo"],
    abreviaturas: { ETT: "Ecocardiograma Transtorácico", FEVI: "Fracción de Eyección del Ventrículo Izquierdo", PSAP: "Presión Sistólica de la Arteria Pulmonar", TAPSE: "Excursión sistólica del plano tricuspídeo", VTD: "Volumen Telediastólico" },
    clasificaciones: [],
    unidades: ["%", "mm", "cm", "m/s", "mmHg"]
  },
  {
    estudio: "Eco Doppler Vascular",
    templateKey: "eco_doppler_vascular",
    category: "Cardiología",
    keywords: ["circulación periférica", "Doppler venoso", "Doppler arterial", "trombosis venosa profunda", "placas de ateroma", "estenosis", "miembros inferiores", "vasos del cuello"],
    abreviaturas: { TVP: "Trombosis Venosa Profunda" },
    clasificaciones: [],
    unidades: ["mm", "cm/s", "m/s"]
  },
  {
    estudio: "Ergometría",
    templateKey: "ergometria",
    category: "Cardiología",
    keywords: ["prueba de esfuerzo graduada", "ejercicio en cinta", "bicicleta", "control electrocardiográfico", "respuesta al esfuerzo", "isquemia", "arritmias", "capacidad funcional"],
    abreviaturas: { PEG: "Prueba de Esfuerzo Graduada", FC: "Frecuencia Cardíaca" },
    clasificaciones: ["Protocolo de Bruce"],
    unidades: ["METs", "lpm", "mmHg"]
  },
  {
    estudio: "Ecocardiograma Transesofágico (ETE)",
    templateKey: "eco_te",
    category: "Cardiología",
    keywords: ["sonda por el esófago", "orejuela de la aurícula izquierda", "trombos intracavitarios", "válvula mitral", "foramen oval permeable", "endocarditis infecciosa"],
    abreviaturas: { ETE: "Ecocardiograma Transesofágico", FOP: "Foramen Oval Permeable" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },

  // ══════════════════════════════════════════════════════════
  //  GINECOLOGÍA / OBSTETRICIA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "PAP",
    templateKey: "pap",
    category: "Ginecología",
    keywords: ["papanicolaou", "citología cervical", "células escamosas", "lesión intraepitelial", "atipias celulares", "cribado de cáncer cervicouterino", "cuello del útero"],
    abreviaturas: { PAP: "Papanicolaou", ASCUS: "Células escamosas atípicas de significado incierto", SIL: "Lesión intraepitelial escamosa", CIN: "Neoplasia intraepitelial cervical" },
    clasificaciones: ["Bethesda"],
    unidades: []
  },
  {
    estudio: "Colposcopía",
    templateKey: "colposcopia",
    category: "Ginecología",
    keywords: ["cuello uterino", "ácido acético", "test de Schiller", "lugol", "epitelio acetoblanco", "vasos atípicos", "mosaico", "puntillado"],
    abreviaturas: { ZTA: "Zona de transformación atípica" },
    clasificaciones: ["Reid"],
    unidades: []
  },
  {
    estudio: "Ecografía Ginecológica TV/TA",
    templateKey: "eco_gineco",
    category: "Ginecología",
    keywords: ["ecografía transvaginal", "ecografía transabdominal", "útero", "endometrio", "ovarios", "folículos", "miometrio", "saco de Douglas", "anexos"],
    abreviaturas: { "Eco TV": "Ecografía Transvaginal", "Eco TA": "Ecografía Transabdominal", DIU: "Dispositivo Intrauterino" },
    clasificaciones: [],
    unidades: ["mm", "cm", "mL"]
  },
  {
    estudio: "Histeroscopía",
    templateKey: "histeroscopia",
    category: "Ginecología",
    keywords: ["cavidad uterina", "endometrio", "pólipos endometriales", "miomas submucosos", "ostium tubárico", "sinequias", "canal cervical"],
    abreviaturas: { HSC: "Histeroscopía" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Ecografía Obstétrica",
    templateKey: "eco_obstetrica",
    category: "Obstetricia",
    keywords: ["feto", "placenta", "líquido amniótico", "edad gestacional", "latidos cardíacos fetales", "diámetro biparietal", "longitud femoral", "biometría fetal"],
    abreviaturas: { EG: "Edad Gestacional", FCF: "Frecuencia Cardíaca Fetal", DBP: "Diámetro Biparietal", LF: "Longitud Femoral", LCN: "Longitud Cefalonalgas", ILA: "Índice de Líquido Amniótico" },
    clasificaciones: ["Grannum"],
    unidades: ["semanas", "gramos", "mm", "cm", "lpm"]
  },
  {
    estudio: "Monitoreo Fetal",
    templateKey: "monitoreo_fetal",
    category: "Obstetricia",
    keywords: ["cardiotocografía anteparto", "test no estresante", "contracciones uterinas", "bienestar fetal", "frecuencia cardíaca fetal", "movimientos fetales", "desaceleraciones", "aceleraciones"],
    abreviaturas: { NST: "Test No Estresante", CST: "Test Estresante", FCF: "Frecuencia Cardíaca Fetal", DU: "Dinámica Uterina" },
    clasificaciones: [],
    unidades: ["lpm"]
  },

  // ══════════════════════════════════════════════════════════
  //  NEUROLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "EMG",
    templateKey: "emg",
    category: "Neurología",
    keywords: ["electromiografía", "velocidad de conducción", "función de los músculos", "nervios periféricos", "neuropatías", "radiculopatías", "ciática", "miopatías", "potenciales de acción motores"],
    abreviaturas: { EMG: "Electromiografía", VCNM: "Velocidad de conducción de nervios motores" },
    clasificaciones: [],
    unidades: ["mV", "m/s", "ms"]
  },
  {
    estudio: "Polisomnografía",
    templateKey: "polisomnografia",
    category: "Neurología",
    keywords: ["trastornos del sueño", "apneas", "arquitectura del sueño", "fases REM y no REM", "hipopneas", "saturación de oxígeno", "ronquidos", "despertares", "esfuerzo respiratorio"],
    abreviaturas: { PSG: "Polisomnografía", IAH: "Índice de Apnea/Hipopnea", SAOS: "Síndrome de Apnea Obstructiva del Sueño", REM: "Rapid Eye Movement" },
    clasificaciones: ["Mallampati", "Epworth"],
    unidades: ["ev/h", "%", "lpm"]
  },
  {
    estudio: "EEG",
    templateKey: "eeg",
    category: "Neurología",
    keywords: ["electroencefalograma", "actividad eléctrica del cerebro", "epilepsias", "privación de sueño", "actividad epileptiforme latente", "ondas cerebrales", "ritmo de fondo"],
    abreviaturas: { EEG: "Electroencefalograma" },
    clasificaciones: [],
    unidades: ["Hz", "µV"]
  },
  {
    estudio: "Potenciales Evocados",
    templateKey: "potenciales_evocados",
    category: "Neurología",
    keywords: ["respuesta del cerebro", "estímulos visuales", "estímulos auditivos", "estímulos somatosensitivos", "enfermedades desmielinizantes", "esclerosis múltiple", "conducción del impulso nervioso"],
    abreviaturas: { PEV: "Potencial Evocado Visual", PEA: "Potencial Evocado Auditivo", PESS: "Potenciales Evocados Somatosensitivos" },
    clasificaciones: [],
    unidades: ["ms", "µV"]
  },

  // ══════════════════════════════════════════════════════════
  //  VASCULAR
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Eco Doppler de Vasos de Cuello (TSA)",
    templateKey: "eco_doppler_tsa",
    category: "Vascular",
    keywords: ["troncos supraaórticos", "arterias carótidas", "arterias vertebrales", "prevención del ACV", "placas de ateroma", "grado de obstrucción", "grosor íntima-media", "flujo sistólico"],
    abreviaturas: { TSA: "Troncos Supraaórticos", IMT: "Intima-Media Thickness", ACI: "Arteria Carótida Interna", ACE: "Arteria Carótida Externa" },
    clasificaciones: [],
    unidades: ["mm", "cm/s", "%"]
  },

  // ══════════════════════════════════════════════════════════
  //  ORL
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Videonasolaringoscopía",
    templateKey: "videonasolaringoscopia",
    category: "ORL",
    keywords: ["examen endoscópico flexible", "fosas nasales", "laringe", "ronquidos", "reflujo faringolaríngeo", "cuerdas vocales", "glotis"],
    abreviaturas: { VNL: "Videonasolaringoscopía", RGE: "Reflujo Gastroesofágico" },
    clasificaciones: [],
    unidades: []
  },
  {
    estudio: "Endoscopía Otológica",
    templateKey: "endoscopia_otologica",
    category: "ORL",
    keywords: ["conducto auditivo", "tímpano", "otoscopia", "perforaciones", "colesteatomas", "cadena osicular", "oído medio"],
    abreviaturas: { CAE: "Conducto Auditivo Externo" },
    clasificaciones: [],
    unidades: ["mm"]
  },

  // ══════════════════════════════════════════════════════════
  //  UROLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Cistoscopía",
    templateKey: "cistoscopia",
    category: "Urología",
    keywords: ["vejiga", "uretra", "meatos ureterales", "cuello vesical", "trígono", "próstata", "mucosa vesical"],
    abreviaturas: { RTU: "Resección Transuretral" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Uroflujometría",
    templateKey: "uroflujometria",
    category: "Urología",
    keywords: ["volumen miccional", "flujo urinario máximo", "flujo promedio", "tiempo de micción", "residuo postmiccional", "hipertrofia prostática", "obstrucción urinaria"],
    abreviaturas: { Qmax: "Flujo máximo", RPM: "Residuo Postmiccional" },
    clasificaciones: [],
    unidades: ["mL/s", "mL", "s"]
  },

  // ══════════════════════════════════════════════════════════
  //  MUSCULOESQUELÉTICO
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Ecografía Musculoesquelética",
    templateKey: "eco_musculoesqueletica",
    category: "Traumatología / Ortopedia",
    keywords: ["tendones", "músculos", "ligamentos", "articulaciones", "desgarros", "colecciones líquidas", "bursitis", "sinovitis"],
    abreviaturas: { LCA: "Ligamento Cruzado Anterior", LCP: "Ligamento Cruzado Posterior" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },
  {
    estudio: "Artroscopía",
    templateKey: "artroscopia",
    category: "Traumatología / Ortopedia",
    keywords: ["procedimiento mínimamente invasivo", "articulación", "cámara", "meniscos", "cartílago articular", "líquido sinovial", "sinovectomía"],
    abreviaturas: { LCA: "Ligamento Cruzado Anterior", CAR: "Cirugía Artroscópica de Rodilla" },
    clasificaciones: [],
    unidades: ["mm", "cm"]
  },

  // ══════════════════════════════════════════════════════════
  //  DERMATOLOGÍA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Dermatoscopía",
    templateKey: "dermatoscopia",
    category: "Dermatología",
    keywords: ["aumento para examen de lunares", "melanoma", "detección precoz", "nevus", "red de pigmento", "patrón vascular", "bordes"],
    abreviaturas: { MM: "Melanoma Maligno" },
    clasificaciones: ["Regla ABCDE", "Patrón reticular"],
    unidades: ["mm"]
  },
  {
    estudio: "Biopsia de Piel",
    templateKey: "biopsia_piel",
    category: "Dermatología",
    keywords: ["extracción de trozo de piel", "análisis bajo microscopio", "patólogo", "sacabocados", "punch", "husos", "márgenes quirúrgicos"],
    abreviaturas: { Bx: "Biopsia" },
    clasificaciones: ["Breslow", "Clark"],
    unidades: ["mm", "cm"]
  },

  // ══════════════════════════════════════════════════════════
  //  ANATOMÍA PATOLÓGICA
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Informe de Biopsia",
    templateKey: "informe_biopsia",
    category: "Anatomía Patológica",
    keywords: ["descripción macroscópica", "descripción microscópica", "diagnóstico definitivo", "inmunohistoquímica", "márgenes de resección", "diferenciación celular", "atipia"],
    abreviaturas: { AP: "Anatomía Patológica", IHQ: "Inmunohistoquímica", HE: "Hematoxilina-Eosina" },
    clasificaciones: ["TNM", "Gleason", "Grado histológico"],
    unidades: ["mm", "cm", "µm"]
  },
  {
    estudio: "Citología",
    templateKey: "citologia",
    category: "Anatomía Patológica",
    keywords: ["células sueltas", "líquido pleural", "punción de órganos", "Punción Aspiración con Aguja Fina", "extendido citológico", "malignidad"],
    abreviaturas: { PAAF: "Punción Aspiración con Aguja Fina" },
    clasificaciones: ["Papanicolaou", "Bethesda"],
    unidades: []
  },

  // ══════════════════════════════════════════════════════════
  //  QUIRÚRGICO
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Protocolo Quirúrgico",
    templateKey: "protocolo_quirurgico",
    category: "Quirúrgico",
    keywords: ["parte operatorio", "técnica empleada", "hallazgos quirúrgicos", "intervención", "historia clínica", "anestesia", "diéresis", "síntesis", "hemostasia"],
    abreviaturas: { PQ: "Parte Operatorio / Quirúrgico", ANR: "Anestesia y reanimación", CMA: "Cirugía Mayor Ambulatoria" },
    clasificaciones: ["ASA"],
    unidades: ["mL", "hrs"]
  },

  // ══════════════════════════════════════════════════════════
  //  DOCUMENTACIÓN CLÍNICA GENERAL
  // ══════════════════════════════════════════════════════════
  {
    estudio: "Nota de Evolución",
    templateKey: "nota_evolucion",
    category: "General",
    keywords: ["registro diario", "paciente en internación", "esquema SOAP", "Subjetivo", "Objetivo", "Apreciación", "Plan", "signos vitales", "diuresis", "catarsis"],
    abreviaturas: { SOAP: "Subjetivo, Objetivo, Apreciación, Plan", FC: "Frecuencia Cardíaca", FR: "Frecuencia Respiratoria", TA: "Tensión Arterial" },
    clasificaciones: [],
    unidades: ["mmHg", "lpm", "rpm", "°C"]
  },
  {
    estudio: "Epicrisis",
    templateKey: "epicrisis",
    category: "General",
    keywords: ["resumen de internación", "alta hospitalaria", "diagnósticos finales", "indicaciones al alta", "estado al egreso", "tratamiento instaurado", "estudios complementarios"],
    abreviaturas: { HC: "Historia Clínica", TTO: "Tratamiento" },
    clasificaciones: [],
    unidades: ["días"]
  },
  {
    estudio: "Informe Médico General",
    templateKey: "informe_general",
    category: "General",
    keywords: ["certificado", "situación clínica", "antecedentes", "enfermedad actual", "examen físico", "diagnóstico presuntivo", "tratamiento médico"],
    abreviaturas: { IMG: "Informe Médico General", EA: "Enfermedad Actual", APP: "Antecedentes Personales Patológicos" },
    clasificaciones: [],
    unidades: []
  }
];

// ── Utilidades de consulta ─────────────────────────────────
/**
 * Busca la terminología de un estudio por templateKey.
 * @param {string} key — la clave de template (ej: "eco_cardio")
 * @returns {object|null}
 */
window.getStudyTerminology = function(key) {
  return window.STUDY_TERMINOLOGY.find(s => s.templateKey === key) || null;
};

/**
 * Devuelve todas las abreviaturas de todos los estudios como un diccionario plano.
 * Útil para expandir abreviaturas en el texto.
 * @returns {Object<string, string>}
 */
window.getAllAbbreviations = function() {
  const all = {};
  for (const study of window.STUDY_TERMINOLOGY) {
    for (const [abbr, full] of Object.entries(study.abreviaturas || {})) {
      all[abbr] = full;
    }
  }
  return all;
};

/**
 * Devuelve todas las unidades únicas de un estudio específico.
 * @param {string} key — templateKey
 * @returns {string[]}
 */
window.getStudyUnits = function(key) {
  const study = window.getStudyTerminology(key);
  return study ? study.unidades : [];
};

/**
 * Devuelve las clasificaciones relevantes para un estudio.
 * @param {string} key — templateKey
 * @returns {string[]}
 */
window.getStudyClassifications = function(key) {
  const study = window.getStudyTerminology(key);
  return study ? study.clasificaciones : [];
};
