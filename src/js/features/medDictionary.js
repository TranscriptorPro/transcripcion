//  REVISOR MÉDICO — Diccionario + Modal de correcciones
//  medDictionary.js

// Formato: { "texto_incorrecto": "corrección" }
// Las claves se comparan en minúsculas sin tildes.
var MEDICAL_DICT_BASE = {
    "larinx":                   "laringe",
    "larincs":                  "laringe",
    "larinco":                  "laringe",
    "farings":                  "faringe",
    "rinofarings":              "rinofaringe",
    "rinofarinx":               "rinofaringe",
    "epiglotys":                "epiglotis",
    "epiglótys":                "epiglotis",
    "fosa nasar":               "fosa nasal",
    "fosas nasares":            "fosas nasales",
    "tímbano":                  "tímpano",
    "timpano":                  "tímpano",
    "corneta inferior":         "cornete inferior",
    "corneta media":            "cornete medio",
    "corneta superior":         "cornete superior",
    "amigdalas":                "amígdalas",
    "amigdala":                 "amígdala",
    "amidale":                  "amígdala",
    "adenoide":                 "adenoides",
    "otorrinolarinco":          "otorrinolaringólogo",
    "locoregional":             "locorregional",
    "aritenoides laterales":    "aritenoides",
    "pliegue ariepiglótico":    "repliegue ariepiglótico",
    "pliegues ariepiglóticos":  "repliegues ariepiglóticos",
    "cuerda vocal":             "cuerdas vocales",
    "conducto auditibo":        "conducto auditivo",
    "conducto auditibo externo":"conducto auditivo externo",
    "membrana tonpanica":       "membrana timpánica",
    "membrana tonpánica":       "membrana timpánica",
    "ocena":                    "ozena",
    "mucoza":                   "mucosa",
    "mucoza nasal":             "mucosa nasal",
    "mucoza faríngea":          "mucosa faríngea",
    "septun":                   "septum",
    "septo":                    "septum",
    "hipertrofia de corneta":   "hipertrofia de cornete",
    "tonsilas":                 "tonsilas palatinas",
    "roncopatía":               "roncopatía",

    "extrasistoles":            "extrasístoles",
    "extrasistole":             "extrasístole",
    "taquicardia sinusal":      "taquicardia sinusal",
    "taquicardía":              "taquicardia",
    "bradicardía":              "bradicardia",
    "fibrilacion auricular":    "fibrilación auricular",
    "estreses":                 "estrés",
    "eco estres":               "eco-estrés",
    "ecosisma":                 "eco-estrés",
    "ecocardio":                "ecocardiograma",
    "ecocardíograma":           "ecocardiograma",
    "FEVI":                     "FEVI",          // preserve uppercase
    "fevi":                     "FEVI",
    "fraccion de eyeccion":     "fracción de eyección",
    "fracción de eyeccion":     "fracción de eyección",
    "estenosis aortica":        "estenosis aórtica",
    "insuficiencia aortica":    "insuficiencia aórtica",
    "insuficiencia mitral":     "insuficiencia mitral",
    "derrame pericardico":      "derrame pericárdico",
    "hipertrofía":              "hipertrofia",
    "ventrículo izquierdo":     "ventrículo izquierdo",
    "ventriculo izquierdo":     "ventrículo izquierdo",
    "auricula izquierda":       "aurícula izquierda",
    "auricula derecha":         "aurícula derecha",
    "arteria coronaria":        "arteria coronaria",
    "ateroesclerosis":          "aterosclerosis",

    "polisomnografía":          "polisomnografía",
    "electromiografia":         "electromiografía",
    "electromiografía":         "electromiografía",
    "electrocmiografía":        "electromiografía",
    "tomografía axial":         "tomografía axial computarizada",
    "resonancia magnética":     "resonancia magnética",
    "resonancia magnetica":     "resonancia magnética",
    "cefalea tensional":        "cefalea tensional",
    "convulsiones febriles":    "convulsiones febriles",
    "hiperecogenicidad":        "hiperecogenicidad",

    "gastroesofagico":          "gastroesofágico",
    "anastomosis término":      "anastomosis término-terminal",
    "colitis ulcerosa":         "colitis ulcerosa",

    "artrosis":                 "artrosis",
    "artritis reumatoide":      "artritis reumatoide",
    "espondilolistesis":        "espondilolistesis",
    "meniscectomia":            "meniscectomía",
    "discal":                   "discal",
    "disco intervertebral":     "disco intervertebral",

    "hipertension":             "hipertensión",
    "hipertensión arterial":    "hipertensión arterial",
    "diabetes mellitus":        "diabetes mellitus",
    "obstruccion":              "obstrucción",
    "obstrucción":              "obstrucción",
    "inflamacion":              "inflamación",
    "infección":                "infección",
    "infeccion":                "infección",
    "secresion":                "secreción",
    "secresiones":              "secreciones",
    "espesura":                 "espesor",
    "nodulo":                   "nódulo",
    "nodulos":                  "nódulos",
    "nodule":                   "nódulo",
    "polipo":                   "pólipo",
    "polipos":                  "pólipos",
    "hemorragia":               "hemorragia",
    "hemorrágico":              "hemorrágico",
    "abdomen agudo":            "abdomen agudo",
    "peritoneo":                "peritoneo",
    "edema pulmonar":           "edema pulmonar",
    "neumonia":                 "neumonía",
    "pneumonia":                "neumonía",
    "pleuritis":                "pleuritis",
    "trombo embolismo":         "tromboembolismo",
    "tromboembolísmo":          "tromboembolismo",
    "tromboembolia":            "tromboembolismo pulmonar",
    "anticoagulacion":          "anticoagulación",
    "glicemia":                 "glucemia",
    "glucosa en sangre":        "glucemia",

    "espiro metría":            "espirometría",
    "vef uno":                  "VEF1",
    "fe b uno":                 "FEV1",
    "test de marchar":          "test de marcha",
    "pletismo grafía":          "pletismografía",
    "cabina pletismo gráfica":  "cabina pletismográfica",
    "oxi metría":               "oximetría",

    "campi metría":             "campimetría",
    "janfri":                   "Humphrey",
    "humfrei":                  "Humphrey",
    "o ce te":                  "OCT",
    "macula":                   "mácula",
    "retineal":                 "retinal",
    "topo grafía":              "topografía",
    "querato cono":             "queratocono",
    "lasic":                    "LASIK",
    "fondo de hoyo":            "fondo de ojo",
    "micro aneurismas":         "microaneurismas",
    "retino grafía":            "retinografía",

    "tacar":                    "TACAR",
    "multislais":               "multislice",
    "mamo grafía":              "mamografía",
    "birads":                   "BI-RADS",
    "bi rads":                  "BI-RADS",
    "densiometría":             "densitometría",
    "te escore":                "T-score",
    "zeta escore":              "Z-score",
    "pet ce te":                "PET-CT",
    "suv max":                  "SUVmax",
    "fluorodesoxiglucosa":      "18-FDG",
    "tele radiografía":         "telerradiografía",
    "placa de torax":           "placa de tórax",
    "liti asis":                "litiasis",

    "gastro copía":             "gastroscopía",
    "colono copía":             "colonoscopía",
    "fibro broncoscopia":       "fibrobroncoscopía",
    "broncoscopia":             "broncoscopía",
    "laringo copía":            "laringoscopía",
    "disfonia":                 "disfonía",
    "colpo copía":              "colposcopía",
    "yugol":                    "lugol",
    "histero copía":            "histeroscopía",
    "cisto copía":              "cistoscopía",
    "artro copía":              "artroscopía",
    "dermato copía":            "dermatoscopía",

    "jolter":                   "Holter",
    "presuro metría":           "presurometría",
    "cine coronario grafía":    "cinecoronariografía",
    "sintax":                   "SYNTAX",
    "cu erre ese":              "QRS",
    "dobuta mina":              "dobutamina",
    "tapse":                    "TAPSE",
    "pesap":                    "PSAP",
    "ergo metría":              "ergometría",

    "papa nicolau":             "Papanicolaou",
    "betesda":                  "Bethesda",
    "eco te ve":                "eco TV",
    "trans vaginal":            "transvaginal",
    "trans esofágico":          "transesofágico",
    "liquido amniotico":        "líquido amniótico",
    "cardio toco grafía":       "cardiotocografía",

    "electro mio grafía":       "electromiografía",
    "poli somnografía":         "polisomnografía",
    "electro encefalograma":    "electroencefalograma",
    "potenciales hevocados":    "potenciales evocados",

    "supra aórticos":           "supraaórticos",
    "video naso laringoscopia": "videonasolaringoscopía",
    "colestea toma":            "colesteatoma",
    "uro flujo metría":         "uroflujometría",
    "eco musculo esquelética":  "ecografía musculoesquelética",
    "gamma grafía":             "gammagrafía",
    "espect":                   "SPECT",

    "ponch":                    "punch",
    "te ene eme":               "TNM",
    "cito logía":               "citología",
    "paf":                      "PAAF",
    "epi crisis":               "epicrisis",
    "informe medico":           "informe médico",
    "subjetivo objetivo":       "SOAP",

    "o dinofagia":              "odinofagia",
    "odin ofagia":              "odinofagia",
    "dis fagia":                "disfagia",
    "dis fonia":                "disfonía",
    "dis fonía":                "disfonía",
    "dis nea":                  "disnea",
    "taqui cardia":             "taquicardia",
    "bradi cardia":             "bradicardia",
    "endo scopía":              "endoscopía",
    "endo scopia":              "endoscopía",
    "colono scopia":            "colonoscopía",
    "bronco scopía":            "broncoscopía",
    "bronco scopia":            "broncoscopía",
    "laringo scopía":           "laringoscopía",
    "laringo scopia":           "laringoscopía",
    "histo patología":          "histopatología",
    "histo patologia":          "histopatología",
    "inmuno histoquímica":      "inmunohistoquímica",
    "eco cardio grama":         "ecocardiograma",
    "eco cardiograma":          "ecocardiograma",

    "laryngoscopy":             "laringoscopía",
    "laryngoscopía":            "laringoscopía",
    "laryngo":                  "laringo",
    "pharynx":                  "faringe",
    "pharyngeal":               "faríngea",
    "esophagus":                "esófago",
    "esophageal":               "esofágica",
    "trachea":                  "tráquea",
    "thyroid":                  "tiroides",
    "bronchoscopy":             "broncoscopía",
    "colonoscopy":              "colonoscopía",
    "endoscopy":                "endoscopía",
    "echocardiogram":           "ecocardiograma",
    "spirometry":               "espirometría",
    "plethysmography":          "pletismografía",

    "bujales":                  "bucales",
    "bujal":                    "bucal",
    "vocales afectados":        "vocales afectadas",
    "cuerdos vocales":          "cuerdos vocales",  // no corregir, posible intención
    "cuerdos bucales":          "cuerdas bucales",
    "cavidad vucal":            "cavidad bucal",
    "mucoza bucal":             "mucosa bucal",
    "faringea":                 "faríngea",
    "laringea":                 "laríngea",
    "nasofaringea":             "nasofaríngea",
    "orofaringea":              "orofaríngea",
    "hipofaringea":             "hipofaríngea",
    "traqueal":                 "traqueal",
    "subglotica":               "subglótica",
    "supraglotica":             "supraglótica",
    "epiglótica":               "epiglótica",
    "aritenoidea":              "aritenoidea",
    "comisura anterior":        "comisura anterior",
    "comisura posterior":       "comisura posterior",
    "bandas ventriculares":     "bandas ventriculares",

    "afectados" :               "afectadas",   // cuerdas vocales afectadas
    "engrosados":               "engrosadas",  // cuerdas engrosadas
    "congestivos":              "congestivas", // mucosas congestivas
    "edematosos":               "edematosas",  // cuerdas edematosas
    "eritematosos":             "eritematosas",

    "ventriculo":               "ventrículo",
    "auricula":                 "aurícula",
    "esofago":                  "esófago",
    "estómago":                 "estómago",
    "duodeno":                  "duodeno",
    "piloro":                   "píloro",
    "ciego":                    "ciego",
    "sigmoide":                 "sigmoide",
    "recto":                    "recto",
    "apendice":                 "apéndice",
    "pancreas":                 "páncreas",
    "higado":                   "hígado",
    "besicula":                 "vesícula",
    "vesicula":                 "vesícula",
    "traquea":                  "tráquea",
    "tiroides":                 "tiroides",
    "prostata":                 "próstata",
    "utero":                    "útero",
    "pelvis":                   "pelvis",
    "mediastino":               "mediastino",
    "retroperitoneo":           "retroperitoneo",

    // --- Ampliación 2026-03: neumología y función respiratoria ---
    "curva flujo volumen":      "curva flujo-volumen",
    "curva volumen tiempo":     "curva volumen-tiempo",
    "prueba de caminata 6 minutos": "prueba de caminata de 6 minutos",
    "pc seis m":                "PC6M",
    "fvc":                      "FVC",
    "fev1":                     "FEV1",
    "fev 1":                    "FEV1",
    "fev uno":                  "FEV1",
    "fev1 fvc":                 "FEV1/FVC",
    "pef":                      "PEF",
    "lin":                      "LIN",
    "vext":                     "VExt",
    "z score":                  "Z-score",
    "sp o2":                    "SpO2",
    "spo 2":                    "SpO2",
    "mets":                     "METs",
    "epoc":                     "EPOC",
    "hipoxemia":                "hipoxemia",
    "hipercapnia":              "hipercapnia",
    "estridor":                 "estridor",
    "estertores":               "estertores",

    // --- Cardiología y hemodinamia ---
    "electro cardio grama":     "electrocardiograma",
    "ecg":                      "ECG",
    "mapa":                     "MAPA",
    "holter":                   "Holter",
    "ecocardiograma":           "ecocardiograma",
    "cine coronariografia":     "cinecoronariografía",
    "cinecoronariografia":      "cinecoronariografía",
    "qrs":                      "QRS",
    "st":                       "ST",
    "pr":                       "PR",
    "qt":                       "QT",
    "fevi":                     "FEVI",
    "fibrilacion":              "fibrilación",
    "sincopa":                  "síncope",
    "auriculo ventricular":     "auriculoventricular",
    "beta bloqueantes":         "betabloqueantes",

    // --- Neurología y neurofisiología ---
    "electro encefalo grama":   "electroencefalograma",
    "eeg":                      "EEG",
    "emg":                      "EMG",
    "guillain barre":           "Guillain-Barré",
    "miastenia":                "miastenia",
    "actividad paroxistica":    "actividad paroxística",
    "inter hemisferica":        "interhemisférica",
    "sistema diez veinte":      "sistema 10-20",

    // --- Oftalmología ---
    "perimetria":               "perimetría",
    "oct":                      "OCT",
    "disco optico":             "disco óptico",
    "macula":                   "mácula",
    "fovea":                    "fóvea",
    "quiasma":                  "quiasma",
    "angulo irido corneal":     "ángulo iridocorneal",
    "escotoma":                 "escotoma",
    "hemianopsia":              "hemianopsia",
    "cuadrantanopsia":          "cuadrantanopsia",
    "papiledema":               "papiledema",
    "glaucoma":                 "glaucoma",
    "db":                       "dB",
    "apostilbios":              "apostilbios",

    // --- Radiología, imágenes y ecografía ---
    "tac":                      "TAC",
    "rnm":                      "RMN",
    "flair":                    "FLAIR",
    "dwi":                      "DWI",
    "adc":                      "ADC",
    "bi rads":                  "BI-RADS",
    "birads":                   "BI-RADS",
    "anecoico":                 "anecoico",
    "hipoecoico":               "hipoecoico",
    "hiperecoico":              "hiperecoico",
    "isodenso":                 "isodenso",
    "hiperdenso":               "hiperdenso",
    "hipodenso":                "hipodenso",
    "microlobulados":           "microlobulados",
    "espiculados":              "espiculados",
    "micro calcificaciones":    "microcalcificaciones",
    "dxa":                      "DXA",
    "osteopenia":               "osteopenia",
    "hidronefrosis":            "hidronefrosis",

    // --- Oncología y medicina nuclear ---
    "pet ct":                   "PET-CT",
    "suv":                      "SUV",
    "fdg":                      "18-FDG",
    "18 fdg":                   "18-FDG",
    "tecnecio 99m":             "tecnecio-99m",
    "braqui terapia":           "braquiterapia",
    "dosimetria":               "dosimetría",
    "colimador":                "colimador",
    "metastasis":               "metástasis",
    "neoplasia":                "neoplasia",

    // --- Ginecología, obstetricia y citología ---
    "pap":                      "PAP",
    "asc us":                   "ASC-US",
    "agc":                      "AGC",
    "lsil":                     "LSIL",
    "hsil":                     "HSIL",
    "nic":                      "NIC",
    "vph":                      "VPH",
    "diametro biparietal":      "diámetro biparietal",
    "longitud femur":           "longitud del fémur",
    "circunferencia abdominal": "circunferencia abdominal",
    "liquido amniotico":        "líquido amniótico",

    // --- Términos clínicos estructurales generales ---
    "anamnesis":                "anamnesis",
    "etiologia":                "etiología",
    "profilaxis":               "profilaxis",
    "seguimiento":              "seguimiento",
    "morbilidad":               "morbilidad",
    "mortalidad":               "mortalidad",
    "hipoxia":                  "hipoxia",
    "necrosis":                 "necrosis",
    "tejido celular subcutaneo": "tejido celular subcutáneo",

    // --- Normalización solicitada explícita por usuario ---
    "orófaringe":               "orofaringe",
    "ORÓFARINGE":               "OROFARINGE",
};

var CUSTOM_DICT_KEY = 'med_dict_custom';

// Glosario canónico ampliado (usuario, 2026-03-10).
// Se usa para generar reglas automáticas de normalización (acentos/guiones/espacios).
const MEDICAL_CANONICAL_TERMS_20260310 = [
    'abatelenguas', 'abdomen agudo', 'abdominoplastia', 'aborto espontáneo', 'adenocarcinoma in situ', 'adenopatía',
    'adherencia', 'afección', 'agente infeccioso', 'aislamiento', 'algoritmo', 'alergología', 'alomorfo',
    'amiloidosis cardíaca', 'anastomosis quirúrgica', 'anatomopatólogo', 'anamnesis', 'anestesia general',
    'anestesia local', 'anestésico local', 'anillo de Waldeyer', 'anillo de Zinn', 'anomalía', 'anticuerpo monoclonal',
    'anticoagulante', 'anticonceptivo', 'antiinflamatorio', 'antiparkinsoniano', 'aparato circulatorio',
    'aparato digestivo', 'aparato respiratorio', 'arcada', 'arco', 'arteria', 'arteriografía', 'artrosis', 'asimetría',
    'asintomático', 'atelectasia', 'atipia', 'atrofia', 'auscultación', 'bacteria', 'barbijo', 'benigno',
    'biometría hemática', 'biopsia', 'bioterio', 'blastomicosis', 'blefaroplastia', 'bloqueo motor', 'broncoscopia',
    'broncodilatador', 'bronquios', 'burbuja axénica', 'cadena de infección', 'calcificación', 'calidad de vida',
    'campimetría', 'cáncer asintomático', 'cáncer cérvicouterino', 'candidosis bucal', 'capacidad pulmonar total',
    'capacidad vital forzada', 'carbamacepina', 'carcinoma escamoso', 'cardiología', 'cardiopatía', 'caso confirmado',
    'casuística', 'cefalea', 'células escamosas atípicas', 'células glandulares', 'cerclaje quirúrgico', 'ciego',
    'ciguatera', 'ciclotrón', 'cinecoronariografía', 'cirugía bariátrica', 'citología exfoliativa', 'citología vaginal',
    'cloasma', 'cociente de riesgo', 'colangiografía', 'colimador multiláminas', 'colonoscopia', 'colpocitología',
    'colposcopia', 'comadrón', 'comadrona', 'complejo QRS', 'conglomerado', 'consentimiento diferido',
    'constantes vitales', 'consultorio', 'contagio prenatal', 'contornos borrosos', 'contornos circunscritos',
    'contornos espiculados', 'contornos microlobulados', 'contracción', 'cornetes', 'cortocircuito',
    'crecimiento intrauterino', 'crisis convulsiva', 'crisis epiléptica', 'cristalino', 'criterio principal de eficacia',
    'cuarentena', 'cuello cervical', 'cuello uterino', 'curva epidemiológica', 'datos demográficos', 'decil',
    'defecación', 'densitometría ósea', 'derivación coronaria', 'derivación vascular', 'desfibrilador',
    'desoxi-glucosa', 'desviación estándar', 'dextrosa', 'diabetes', 'diagnóstico', 'dilatación', 'discromía cutánea',
    'disfagia', 'disnea', 'dispensario', 'dispositivo médico', 'distorsión arquitectural', 'dolor', 'dosis',
    'ecocardiograma', 'ecografía endoscópica', 'ecografía obstétrica', 'edema macular', 'efecto adverso',
    'efectividad', 'eficacia', 'eje eléctrico', 'electrocardiograma', 'electrodo', 'electroencefalograma',
    'electromiografía', 'embarazo', 'emergencia obstétrica', 'endemia', 'endocrinología', 'enfermedad cardíaca',
    'enfermedad contagiosa', 'enfermedad crónica', 'enfermedad de Alzheimer', 'enfermedad de Parkinson',
    'enfermedad infecciosa', 'enfermedad respiratoria', 'enfisema', 'engrosamiento cutáneo', 'engrosamiento trabecular',
    'ensayo clínico', 'epicrisis', 'epidemia', 'epidemiología analítica', 'epidemiología descriptiva',
    'equivalentes metabólicos', 'ergometría', 'eritema', 'esclerosis lateral amiotrófica', 'escotoma arciforme',
    'esfigmomanómetro', 'esófago', 'espirometría', 'estenosis aórtica', 'estenosis hemodinámicamente significativa',
    'estenosis severa', 'estertores', 'estridor', 'estudio clínico', 'etiología', 'evaluación', 'excavación fisiológica',
    'exploración física', 'extrasístoles ventriculares', 'exudados duros', 'farmacocinética', 'farmacodinamia',
    'farmacología clínica', 'farmacovigilancia', 'fatiga', 'feocromocitoma', 'fibrilación auricular', 'fibroadenoma',
    'fibrosis quística', 'flebografía', 'flujo espiratorio pico', 'flujo vaginal', 'fondo de ojo', 'fosa posterior',
    'fracción de eyección', 'frecuencia cardíaca', 'frotis', 'gastroscopia', 'genética', 'ginecología', 'glaucoma',
    'glomerulonefritis', 'glucosa', 'gonorrea', 'goteo intermenstrual', 'hemangioma', 'hematocrito', 'hemianopsia',
    'hemoglobina', 'hemograma', 'hernia', 'herpes simple', 'hidronefrosis', 'hipercapnia', 'hiperdenso',
    'hiperglucemia', 'hipermetabolismo', 'hipertensión arterial', 'hiperventilación', 'hipoecoico', 'hipodenso',
    'hipocinesia', 'hipopotasiemia', 'hipoxemia', 'historia clínica', 'hormona', 'hospitalización', 'humor acuoso',
    'humor vítreo', 'ictericia', 'íleon', 'imagen radiolúcida', 'impresión', 'incidencia', 'índice de letalidad',
    'índice de masa corporal', 'infarto agudo de miocardio', 'infección', 'inflamación', 'informe médico',
    'informe radiológico', 'inmunidad', 'inmunodeficiencia', 'intervención quirúrgica', 'investigación clínica',
    'isquemia miocárdica', 'isodenso', 'isótopos emisores', 'isópteras', 'laringoscopia', 'latencia distal', 'lente',
    'lesión escamosa intraepitelial', 'leucocitos polimorfonucleares', 'leucoplasia bucal', 'leucorrea',
    'ligadura de trompas', 'ligamento anular', 'límite inferior de la normalidad', 'lipoma', 'lobulado',
    'longitud del fémur', 'mácula', 'malignidad', 'mamografía', 'mamoplastia', 'masa', 'mastectomía',
    'medicamento genérico', 'medicina nuclear', 'medio de contraste', 'médula espinal', 'médula ósea',
    'médula suprarrenal', 'melasma', 'menopausia', 'mesenterio', 'metabolismo', 'metanálisis', 'metástasis hepáticas',
    'metástasis pulmonares', 'microaneurismas', 'microcalcificaciones pleomorfas', 'midriasis', 'miosis', 'miocardio',
    'miometrio', 'monitorización', 'morbilidad', 'morfología', 'mortalidad', 'muguet', 'náusea',
    'neoplasia cervical intraepitelial', 'neumología', 'neumonía', 'neumopatía', 'neumotórax', 'neuritis óptica',
    'neuropatía', 'nódulo', 'nódulos linfáticos', 'obesidad', 'obstetricia', 'obstrucción bronquial', 'oftalmoscopia',
    'oligometrorragia', 'onda P', 'onda T', 'oncología', 'orificio interno', 'osteopenia', 'osteoporosis',
    'otoplastia', 'oximetría', 'oxitocina', 'parálisis cerebral infantil', 'parénquima pulmonar', 'patología',
    'perimetría', 'período de incubación', 'pielonefrolitotomía', 'pitiriasis versicolor', 'pleomórficas',
    'pletismografía', 'policitemia', 'pólipo', 'polisomnografía', 'preeclampsia', 'prescripción', 'prevalencia',
    'profilaxis', 'pronóstico', 'próstata', 'protocolo clínico', 'protocolo quirúrgico', 'prueba broncodilatadora',
    'prueba de caminata', 'prueba de esfuerzo', 'prueba de Papanicolaou', 'pulso', 'queratocono',
    'queratoconjuntivitis', 'quimioterapia', 'quirófano', 'quiste oleoso', 'radiación', 'radiofármaco', 'radiografía',
    'radiología intervencionista', 'radionúclidos', 'radioterapia', 'reacción adversa', 'recuento sanguíneo',
    'registro electrocardiográfico', 'repolarización', 'reposo', 'resonancia magnética', 'restricción pulmonar',
    'retina', 'retinopatía', 'retracción cutánea', 'ritmo sinusal', 'rubéola', 'salbutamol', 'salud pública',
    'sarcoma', 'segmento ST', 'seguimiento', 'seropositivo', 'sibilancias', 'sícope', 'síndrome de apnea obstructiva',
    'síndrome del túnel carpiano', 'síntoma', 'sistema nervioso autónomo', 'sistema nervioso entérico',
    'sobredosis', 'somnolencia', 'sustancia blanca', 'sustancia química', 'taquicardia ventricular',
    'tasa de incidencia', 'tasa de letalidad', 'tasa de mortalidad', 'tejido fibroglandular', 'tensión arterial',
    'terapéutica', 'tocología', 'tocoginecológico', 'tomografía axial computarizada', 'tomografía de coherencia óptica',
    'tomografía por emisión de positrones', 'topografía corneal', 'toxicidad', 'toxoplasma', 'tráquea',
    'trastorno respiratorio', 'tratamiento', 'tumor benigno', 'tumor maligno', 'ultrasonido',
    'unidad de cuidados intensivos', 'uréter', 'uretra', 'vacuna', 'vagina', 'válvula aórtica',
    'varicela', 'varices', 'vector', 'vejiga', 'vena', 'ventrículo izquierdo', 'videonasolaringoscopia',
    'vigilancia activa', 'vigilancia pasiva', 'vigilancia sindrómica', 'virus del papiloma humano',
    'volumen residual', 'vómito'
];

(function _extendMedicalDictFromCanonicalTerms() {
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    MEDICAL_CANONICAL_TERMS_20260310.forEach((term) => {
        const canonical = String(term || '').trim();
        if (!canonical) return;

        const lowerCanonical = canonical.toLowerCase();
        const plain = norm(lowerCanonical);
        if (plain && plain !== lowerCanonical && !MEDICAL_DICT_BASE[plain]) {
            MEDICAL_DICT_BASE[plain] = canonical;
        }

        const noHyphen = plain.replace(/-/g, ' ');
        if (noHyphen && noHyphen !== plain && !MEDICAL_DICT_BASE[noHyphen]) {
            MEDICAL_DICT_BASE[noHyphen] = canonical;
        }

        const squeezed = noHyphen.replace(/\s+/g, ' ').trim();
        if (squeezed && squeezed !== noHyphen && !MEDICAL_DICT_BASE[squeezed]) {
            MEDICAL_DICT_BASE[squeezed] = canonical;
        }
    });
})();

var _customDictCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get(CUSTOM_DICT_KEY).then(function(v) { _customDictCache = v || {}; }).catch(function() {});
}

function getMedCustomDict() {
    if (_customDictCache !== null) return _customDictCache;
    try { return JSON.parse(localStorage.getItem(CUSTOM_DICT_KEY) || '{}'); }
    catch { return {}; }
}

function saveMedCustomDict(dict) {
    _customDictCache = dict;
    if (typeof appDB !== 'undefined') {
        appDB.set(CUSTOM_DICT_KEY, dict); // fire-and-forget
    } else {
        try { localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(dict)); } catch(_) {}
    }
}

function addMedDictEntry(from, to) {
    if (!from || !to) return;
    const dict = getMedCustomDict();
    dict[from.trim().toLowerCase()] = to.trim();
    saveMedCustomDict(dict);
}

window.removeMedDictEntry = function(from) {
    const dict = getMedCustomDict();
    delete dict[from.toLowerCase()];
    saveMedCustomDict(dict);
    renderDictList();
};

function getFullDict() {
    return { ...MEDICAL_DICT_BASE, ...getMedCustomDict() };
}

// Devuelve [{from, to, count, isBase}] encontradas en plainText
function findDictMatches(plainText) {
    const dict = getFullDict();
    const custom = getMedCustomDict();
    const found = [];
    const usedKeys = new Set();

    for (const [key, to] of Object.entries(dict)) {
        if (usedKeys.has(key)) continue;
        try {
            const regex = new RegExp('\\b' + _escapeRegex(key) + '\\b', 'gi');
            const matches = [...plainText.matchAll(regex)];
            if (matches.length > 0) {
                // Use first real match as display "from"
                found.push({
                    from: matches[0][0],
                    key,
                    to,
                    count: matches.length,
                    isBase: MEDICAL_DICT_BASE.hasOwnProperty(key) && !custom.hasOwnProperty(key),
                });
                usedKeys.add(key);
            }
        } catch { /* invalid regex key, skip */ }
    }

    // Sort by count desc, then alphabetically
    return found.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}

function _escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// accepted: [{from, to}]
function applyDictCorrections(editorEl, accepted) {
    if (!editorEl || !accepted.length) return;

    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    for (const { from, to } of accepted) {
        let regex;
        try { regex = new RegExp('\\b' + _escapeRegex(from) + '\\b', 'gi'); }
        catch { continue; }

        for (const textNode of nodes) {
            if (!regex.test(textNode.nodeValue)) { regex.lastIndex = 0; continue; }
            regex.lastIndex = 0;
            // Replace inside a temp span to handle multiple occurrences
            const parts = textNode.nodeValue.split(regex);
            if (parts.length < 2) continue;
            const fragment = document.createDocumentFragment();
            parts.forEach((part, i) => {
                fragment.appendChild(document.createTextNode(part));
                if (i < parts.length - 1) {
                    fragment.appendChild(document.createTextNode(to));
                }
            });
            textNode.parentNode.replaceChild(fragment, textNode);
            // Refresh nodes list since we modified the DOM
            // (simpler: break and restart — for small texts this is fine)
        }
    }
}

async function scanWithAI(plainText) {
    const key = window.GROQ_API_KEY || (typeof appDB !== 'undefined' ? await appDB.get('groq_api_key') : null);
    if (!key) return [];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Eres un corrector de terminología médica en español especializado en errores de reconocimiento de voz. 
Analiza el texto y detecta SOLO palabras o frases que sean errores evidentes de transcripción de voz (el sistema ASR escuchó mal un término médico).
Devuelve ÚNICAMENTE un array JSON válido, sin texto adicional, con el formato exacto:
[{"from": "texto_incorrecto_en_el_texto", "to": "corrección_correcta"}]
Si no encuentras errores claros, devuelve: []
No corrijas estilo, comas, signos de puntuación ni redacción. Solo errores de reconocimiento de voz en terminología médica.`
                },
                { role: 'user', content: plainText.slice(0, 3000) }
            ],
            temperature: 0.0
        })
    });

    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) return [];

    // Extract JSON array from response (might have markdown code fences)
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item.from && item.to && item.from !== item.to)
            .map(item => ({ from: item.from, to: item.to, isBase: false, isAI: true, count: 1, key: item.from.toLowerCase() }));
    } catch {
        return [];
    }
}

let _dictModalMatches  = [];   // [{from, to, key, count, isBase, isAI, checked}]
let _dictModalAILoaded = false;

function renderReviewList() {
    const container = document.getElementById('medDictReviewList');
    const empty     = document.getElementById('medDictReviewEmpty');
    const counter   = document.getElementById('medDictSelCount');
    if (!container) return;

    const checked = _dictModalMatches.filter(m => m.checked).length;
    if (counter) counter.textContent = `${checked} corrección${checked !== 1 ? 'es' : ''} seleccionada${checked !== 1 ? 's' : ''}`;

    if (_dictModalMatches.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    container.innerHTML = _dictModalMatches.map((m, i) => `
        <label class="med-dict-item ${m.checked ? 'checked' : ''}" data-idx="${i}">
            <input type="checkbox" class="med-dict-cb" data-idx="${i}" ${m.checked ? 'checked' : ''}>
            <span class="med-dict-from">${_htmlEncode(m.from)}</span>
            <span class="med-dict-arrow">→</span>
            <span class="med-dict-to">${_htmlEncode(m.to)}</span>
            <span class="med-dict-badge ${m.isAI ? 'badge-ai' : m.isBase ? 'badge-base' : 'badge-custom'}">${m.isAI ? 'IA' : m.isBase ? 'BASE' : 'MÍO'}</span>
            ${m.count > 1 ? `<span class="med-dict-count">×${m.count}</span>` : ''}
            ${m.isAI ? `<button class="med-dict-save-btn" data-idx="${i}" title="Guardar en mi diccionario">💾</button>` : ''}
        </label>
    `).join('');

    // Checkboxes
    container.querySelectorAll('.med-dict-cb').forEach(cb => {
        cb.addEventListener('change', e => {
            const idx = +e.target.dataset.idx;
            _dictModalMatches[idx].checked = e.target.checked;
            e.target.closest('.med-dict-item').classList.toggle('checked', e.target.checked);
            renderReviewList();
        });
    });

    // Guardar sugerencia AI al diccionario personal
    container.querySelectorAll('.med-dict-save-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const idx = +e.currentTarget.dataset.idx;
            const m = _dictModalMatches[idx];
            addMedDictEntry(m.from, m.to);
            m.isAI  = false;
            m.isBase = false;
            renderReviewList();
            renderDictList();
            if (typeof showToast === 'function') showToast(`💾 "${m.from}" guardado en tu diccionario`, 'success');
        });
    });
}

function renderDictList() {
    const container = document.getElementById('medDictListContainer');
    if (!container) return;

    const custom = getMedCustomDict();
    const baseEntries  = Object.entries(MEDICAL_DICT_BASE);
    const customEntries = Object.entries(custom);

    let html = '';

    if (customEntries.length === 0) {
        html += `<p class="med-dict-section-empty">No tienes entradas personalizadas aún. Agrega palabras arriba.</p>`;
    } else {
        html += `<p class="med-dict-section-title">📁 Mi diccionario (${customEntries.length})</p>`;
        html += customEntries.map(([from, to]) => `
            <div class="med-dict-dict-row">
                <span class="med-dict-dict-from">${_htmlEncode(from)}</span>
                <span class="med-dict-arrow">→</span>
                <span class="med-dict-dict-to">${_htmlEncode(to)}</span>
                <span class="med-dict-badge badge-custom">MÍO</span>
                <button class="med-dict-del-btn" onclick="removeMedDictEntry('${_htmlEncode(from)}')" title="Eliminar">🗑</button>
            </div>
        `).join('');
    }

    html += `<details class="med-dict-base-details"><summary class="med-dict-section-title">🔒 Diccionario base (${baseEntries.length} entradas, solo lectura)</summary>`;
    html += baseEntries.map(([from, to]) => `
        <div class="med-dict-dict-row">
            <span class="med-dict-dict-from">${_htmlEncode(from)}</span>
            <span class="med-dict-arrow">→</span>
            <span class="med-dict-dict-to">${_htmlEncode(to)}</span>
            <span class="med-dict-badge badge-base">BASE</span>
        </div>
    `).join('');
    html += `</details>`;

    container.innerHTML = html;
}

// options: { skipEditorCheck: bool, defaultTab: 'review'|'dictionary' }
window.openMedDictModal = function (options = {}) {
    const editor = document.getElementById('editor');
    const hasContent = editor && editor.innerText.trim();

    // A3: Si no se pide skip, validar que el editor tenga contenido
    if (!options.skipEditorCheck && !hasContent) {
        if (typeof showToast === 'function') showToast('El editor está vacío', 'error');
        return;
    }

    if (hasContent) {
        const plainText = editor.innerText;
        const rawMatches = findDictMatches(plainText);
        _dictModalMatches = rawMatches.map(m => ({ ...m, checked: true }));
    } else {
        _dictModalMatches = [];
    }
    _dictModalAILoaded = false;

    // Tab por defecto: si viene de settings sin contenido → dictionary, sino review
    const tab = options.defaultTab || (hasContent ? 'review' : 'dictionary');
    _switchDictTab(tab);

    renderReviewList();
    renderDictList();

    // Reset AI button state
    const btnAI = document.getElementById('btnMedDictScanAI');
    if (btnAI) { btnAI.disabled = false; btnAI.textContent = '🤖 Buscar más con IA'; }

    document.getElementById('medDictModal')?.classList.add('active');
};

function _switchDictTab(tab) {
    document.querySelectorAll('.med-dict-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const r = document.getElementById('medDictTabReview');
    const d = document.getElementById('medDictTabDictionary');
    if (r) r.style.display = tab === 'review' ? '' : 'none';
    if (d) d.style.display = tab === 'dictionary' ? '' : 'none';
}

function _htmlEncode(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.initMedDictModal = function () {
    // Cerrar
    ['closeMedDictModal','btnMedDictClose'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            document.getElementById('medDictModal')?.classList.remove('active');
        });
    });

    // Tabs
    document.querySelectorAll('.med-dict-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            _switchDictTab(btn.dataset.tab);
            if (btn.dataset.tab === 'dictionary') renderDictList();
        });
    });

    // Aplicar correcciones
    document.getElementById('btnMedDictApply')?.addEventListener('click', () => {
        const editor = document.getElementById('editor');
        const toApply = _dictModalMatches.filter(m => m.checked);
        if (!editor || toApply.length === 0) {
            if (typeof showToast === 'function') showToast('Ninguna corrección seleccionada', 'warning');
            return;
        }
        applyDictCorrections(editor, toApply);
        document.getElementById('medDictModal')?.classList.remove('active');
        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof showToast === 'function') showToast(`✅ ${toApply.length} corrección${toApply.length !== 1 ? 'es' : ''} aplicada${toApply.length !== 1 ? 's' : ''}`, 'success');
    });

    // Agregar entrada al diccionario personal
    const addEntry = () => {
        const fromEl = document.getElementById('medDictInputFrom');
        const toEl   = document.getElementById('medDictInputTo');
        if (!fromEl || !toEl) return;
        const from = fromEl.value.trim();
        const to   = toEl.value.trim();
        if (!from || !to) { if (typeof showToast === 'function') showToast('Completa ambos campos', 'warning'); return; }
        addMedDictEntry(from, to);
        fromEl.value = '';
        toEl.value   = '';
        renderDictList();
        // Re-escanear el editor para incluir la nueva entrada en la pestaña Revisión
        const editor = document.getElementById('editor');
        if (editor && editor.innerText.trim()) {
            const rawMatches = findDictMatches(editor.innerText);
            _dictModalMatches = rawMatches.map(m => ({ ...m, checked: true }));
            renderReviewList();
        }
        if (typeof showToast === 'function') showToast(`💾 "${from}" → "${to}" guardado`, 'success');
    };
    document.getElementById('btnMedDictAdd')?.addEventListener('click', addEntry);
    document.getElementById('medDictInputTo')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });

    // Scan con IA
    document.getElementById('btnMedDictScanAI')?.addEventListener('click', async () => {
        if (_dictModalAILoaded) return;
        const key = window.GROQ_API_KEY || (typeof appDB !== 'undefined' ? await appDB.get('groq_api_key') : null);
        if (!key) {
            if (typeof showToast === 'function') showToast('Configurá la API Key para usar IA', 'error');
            return;
        }
        const btn = document.getElementById('btnMedDictScanAI');
        btn.disabled = true;
        btn.textContent = '⏳ Consultando IA...';
        try {
            const editor = document.getElementById('editor');
            const aiMatches = await scanWithAI(editor?.innerText || '');
            _dictModalAILoaded = true;
            if (aiMatches.length === 0) {
                btn.textContent = '✓ Sin sugerencias adicionales';
            } else {
                // Merge: skip duplicates already in list
                const existing = new Set(_dictModalMatches.map(m => m.key));
                const newOnes  = aiMatches.filter(m => !existing.has(m.key));
                _dictModalMatches.push(...newOnes.map(m => ({ ...m, checked: true })));
                btn.textContent = `✓ IA agregó ${newOnes.length} sugerencia${newOnes.length !== 1 ? 's' : ''}`;
                renderReviewList();
            }
        } catch {
            btn.disabled  = false;
            btn.textContent = '🤖 Buscar más con IA';
            if (typeof showToast === 'function') showToast('Error al contactar la IA', 'error');
        }
    });

    // Escape cierra
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('medDictModal')?.classList.contains('active')) {
            document.getElementById('medDictModal')?.classList.remove('active');
        }
    });

    // Click fuera cierra
    document.getElementById('medDictModal')?.addEventListener('click', e => {
        if (e.target.id === 'medDictModal') {
            document.getElementById('medDictModal')?.classList.remove('active');
        }
    });
};
