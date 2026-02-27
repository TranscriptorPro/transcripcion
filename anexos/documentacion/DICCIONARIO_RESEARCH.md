# Estudios Médicos — Lista para Deep Research NLM

## Objetivo
Extraer terminología técnica (keywords, abreviaturas, epónimos, medidas, scores, clasificaciones) de estudios reales publicados en NLM/PubMed para alimentar el diccionario de corrección de Whisper y mejorar la detección de plantillas.

---

## Estudios actuales (37)

### Neumología
1. Espirometría
2. Test de Marcha 6 minutos (TM6M)
3. Pletismografía corporal
4. Oximetría nocturna

### Oftalmología
5. Campimetría Humphrey
6. OCT Retinal
7. Topografía Corneal
8. Fondo de Ojo / Retinografía

### Imágenes
9. TAC / Tomografía Computada
10. Resonancia Magnética (RMN/MRI)
11. Mamografía Digital
12. Densitometría Ósea (DXA/DEXA)
13. PET-CT
14. Radiografía Convencional
15. Ecografía Abdominal / Doppler abdominal

### Endoscopía
16. Gastroscopía / Endoscopía Digestiva Alta (EDA)
17. Colonoscopía
18. Broncoscopía
19. Laringoscopía

### Cardiología
20. Gammagrafía Cardíaca (SPECT miocárdico)
21. Holter ECG (24-48 hs)
22. MAPA (Monitoreo Ambulatorio de Presión Arterial)
23. Cinecoronariografía (cateterismo cardíaco)
24. Electrocardiograma (ECG/EKG)
25. Eco-Stress (ecocardiograma de estrés)
26. Ecocardiograma Transtorácico (ETT)
27. Eco Doppler Vascular (arterial y venoso)

### Ginecología
28. Papanicolaou (PAP) / Citología cervical
29. Colposcopía

### Neurología
30. Electromiografía (EMG) / Velocidad de conducción nerviosa
31. Polisomnografía (PSG)

### ORL
32. Videonasolaringoscopía (VNL)
33. Endoscopía Otológica

### Quirúrgico
34. Protocolo Quirúrgico / Parte operatorio

### General
35. Nota de Evolución
36. Epicrisis / Resumen de Internación
37. Informe Médico General (genérico)

---

## Estudios sugeridos para agregar (~20)

### Cardiología
38. Ergometría / Prueba de Esfuerzo Graduada (PEG)
39. Ecocardiograma Transesofágico (ETE)

### Ecografía / Imágenes
40. Ecografía Obstétrica (1er, 2do, 3er trimestre)
41. Ecografía de Partes Blandas (tiroides, testicular, cuello)
42. Ecografía Renal / Vesicoureteral
43. Ecografía Transfontanelar (neonatal)
44. Angiotomografía / Angiografía

### Ginecología / Obstetricia
45. Ecografía Ginecológica Transvaginal / Transabdominal
46. Histeroscopía
47. Monitoreo Fetal (NST / CST)

### Urología
48. Cistoscopía
49. Uroflujometría

### Neurología
50. Electroencefalograma (EEG)
51. Potenciales Evocados (visuales, auditivos, somatosensoriales)
52. Eco Doppler de Vasos de Cuello (TSA)

### Traumatología / Reumatología
53. Ecografía Musculoesquelética
54. Artroscopía

### Dermatología
55. Dermatoscopía
56. Biopsia de Piel (informe anatomopatológico)

### Anatomía Patológica
57. Informe de Biopsia (macro/micro)
58. Citología general

---

## Prompt para Deep Research en NLM/PubMed

```
Necesito que hagas una investigación exhaustiva en la National Library of Medicine (PubMed, MeSH, MedlinePlus) para cada uno de los siguientes 58 tipos de estudios médicos. Para CADA estudio, extraé:

1. **Terminología técnica en español** (tal como la dictaría un médico hispanoparlante al hablar):
   - Nombres de estructuras anatómicas evaluadas
   - Mediciones y valores de referencia (ej: "fracción de eyección", "grosor íntima-media")
   - Unidades de medida usadas (mm, cm, mL, mmHg, dB, Hz, m/s, etc.)
   - Escalas y clasificaciones (ej: "BI-RADS", "Bethesda", "NYHA", "Child-Pugh", "Los Angeles")
   - Scores y índices (ej: "T-score", "SUVmax", "TIMI", "SYNTAX")
   - Hallazgos normales y patológicos comunes
   - Epónimos médicos (ej: "clasificación de Forrest", "signo de Murphy")
   - Instrumental y equipamiento mencionado en informes
   - Abreviaturas estándar (ej: "FEVI", "VTD", "PSAP", "IMT")

2. **Palabras que Whisper (speech-to-text) confunde frecuentemente**:
   - Términos que suenan similar en español y se transcriben mal
   - Ej: "paquimetría" → Whisper escribe "paqui metría" o "pasquimetría"
   - Ej: "Bethesda" → Whisper escribe "Betesda" o "bes Esda"

3. **Formato de salida**: Para cada estudio, dame un JSON con esta estructura:
   ```json
   {
     "estudio": "Nombre del estudio",
     "keywords": ["término1", "término2", ...],
     "abreviaturas": {"FEVI": "Fracción de eyección del ventrículo izquierdo", ...},
     "clasificaciones": ["BI-RADS", "Bethesda", ...],
     "unidades": ["mmHg", "mL", "cm/s", ...],
     "whisper_corrections": {"pasquimetría": "paquimetría", "betesda": "Bethesda", ...}
   }
   ```

Los 58 estudios son:

**Neumología:** Espirometría, Test de Marcha 6 min, Pletismografía corporal, Oximetría nocturna

**Oftalmología:** Campimetría Humphrey, OCT Retinal, Topografía Corneal, Fondo de Ojo

**Imágenes:** TAC, Resonancia Magnética, Mamografía Digital, Densitometría Ósea (DXA), PET-CT, Radiografía Convencional, Ecografía Abdominal/Doppler

**Endoscopía:** Gastroscopía/EDA, Colonoscopía, Broncoscopía, Laringoscopía

**Cardiología:** Gammagrafía Cardíaca SPECT, Holter ECG, MAPA, Cinecoronariografía, ECG, Eco-Stress, Ecocardiograma Transtorácico (ETT), Eco Doppler Vascular, Ergometría, Ecocardiograma Transesofágico (ETE)

**Ginecología/Obstetricia:** PAP, Colposcopía, Ecografía Ginecológica TV/TA, Histeroscopía, Ecografía Obstétrica, Monitoreo Fetal

**Neurología:** EMG, Polisomnografía, EEG, Potenciales Evocados, Eco Doppler de Vasos de Cuello (TSA)

**ORL:** Videonasolaringoscopía, Endoscopía Otológica

**Urología:** Cistoscopía, Uroflujometría

**Traumatología:** Ecografía Musculoesquelética, Artroscopía

**Dermatología:** Dermatoscopía, Biopsia de Piel

**Anatomía Patológica:** Informe de Biopsia, Citología

**Quirúrgico:** Protocolo Quirúrgico

**General:** Nota de Evolución, Epicrisis, Informe Médico General

IMPORTANTE: Priorizá terminología en español rioplatense/argentino (que es como dictan los médicos en esta app). Incluí variantes regionales cuando existan (ej: "ecografía" vs "ultrasonido").
```
