// ============ SHARED TEMPLATE CATEGORY REGISTRY ============
(function () {
    'use strict';

    const templateMapByCategory = {
        'Neumología': [
            { key: 'espirometria', name: 'Espirometría' },
            { key: 'test_marcha', name: 'Test Marcha 6 min' },
            { key: 'pletismografia', name: 'Pletismografía' },
            { key: 'oximetria_nocturna', name: 'Oximetría Nocturna' }
        ],
        'Oftalmología': [
            { key: 'campimetria', name: 'Campimetría' },
            { key: 'oct_retinal', name: 'OCT Retinal' },
            { key: 'topografia_corneal', name: 'Topografía Corneal' },
            { key: 'fondo_ojo', name: 'Fondo de Ojo' },
            { key: 'gonioscopia', name: 'Gonioscopía' }
        ],
        'Imágenes': [
            { key: 'tac', name: 'TAC' },
            { key: 'resonancia', name: 'Resonancia' },
            { key: 'mamografia', name: 'Mamografía' },
            { key: 'densitometria', name: 'Densitometría' },
            { key: 'pet_ct', name: 'PET-CT' },
            { key: 'radiografia', name: 'Radiografía' },
            { key: 'ecografia_abdominal', name: 'Ecografía Abdominal' },
            { key: 'ecografia_renal', name: 'Ecografía Renal' },
            { key: 'ecografia_tiroidea', name: 'Ecografía Tiroidea' },
            { key: 'ecografia_mamaria', name: 'Ecografía Mamaria' },
            { key: 'eco_doppler', name: 'Eco-Doppler' }
        ],
        'Endoscopía': [
            { key: 'gastroscopia', name: 'Gastroscopía' },
            { key: 'colonoscopia', name: 'Colonoscopía' },
            { key: 'broncoscopia', name: 'Broncoscopía' },
            { key: 'laringoscopia', name: 'Laringoscopía' }
        ],
        'Cardiología': [
            { key: 'gammagrafia_cardiaca', name: 'Gammagrafía Cardíaca' },
            { key: 'holter', name: 'Holter' },
            { key: 'mapa', name: 'MAPA' },
            { key: 'cinecoro', name: 'Cinecoronariografía' },
            { key: 'ecg', name: 'ECG' },
            { key: 'eco_stress', name: 'Eco-Stress' },
            { key: 'ett', name: 'Ecocardiograma TT' }
        ],
        'Ginecología': [
            { key: 'pap', name: 'PAP' },
            { key: 'colposcopia', name: 'Colposcopía' },
            { key: 'ecografia_obstetrica', name: 'Ecografía Obstétrica' }
        ],
        'Neurología': [
            { key: 'electromiografia', name: 'Electromiografía' },
            { key: 'polisomnografia', name: 'Polisomnografía' }
        ],
        'ORL': [
            { key: 'naso', name: 'Nasofibroscopía' },
            { key: 'endoscopia_otologica', name: 'Endoscopía Otológica' }
        ],
        'Quirúrgico': [
            { key: 'protocolo_quirurgico', name: 'Protocolo Quirúrgico' }
        ],
        'General': [
            { key: 'nota_evolucion', name: 'Nota de Evolución' },
            { key: 'epicrisis', name: 'Epicrisis' },
            { key: 'generico', name: 'Informe Genérico' }
        ]
    };

    const formSpecialtyToTemplateCategories = {
        'Cardiología': ['Cardiología'],
        'Ecografía General': ['Imágenes'],
        'Eco-Doppler Vascular': ['Imágenes'],
        'Diagnóstico por Imágenes': ['Imágenes'],
        'Gastroenterología / Endoscopía': ['Endoscopía'],
        'ORL (Otorrinolaringología)': ['ORL'],
        'Ginecología': ['Ginecología'],
        'Obstetricia': [],
        'Neumonología / Neumología': ['Neumología'],
        'Neurología': ['Neurología'],
        'Oftalmología': ['Oftalmología'],
        'Cirugía / Quirúrgico': ['Quirúrgico'],
        'Medicina General / Interna': ['General'],
        'Traumatología / Ortopedia': [],
        'Dermatología': [],
        'Endocrinología': [],
        'Urología': []
    };

    const templateKeysByCategory = Object.fromEntries(
        Object.entries(templateMapByCategory).map(([cat, list]) => [cat, list.map((t) => t.key)])
    );
    const studiesByCategory = Object.fromEntries(
        Object.entries(templateMapByCategory).map(([cat, list]) => [cat, list.map((t) => t.name)])
    );

    window.TP_TEMPLATE_CATEGORY_REGISTRY = {
        templateMapByCategory,
        templateKeysByCategory,
        studiesByCategory,
        formSpecialtyToTemplateCategories
    };
})();
