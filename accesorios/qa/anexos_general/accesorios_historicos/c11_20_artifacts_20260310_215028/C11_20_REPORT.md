# Circuitos 11–20: Audio + IA mock + PDF — Reporte

- **Fecha**: 2026-03-11T00:50:38.755Z
- **URL**: https://transcriptorpro.github.io/transcripcion/
- **Resultado**: ✅ PASS=16  ⚠️ WARN=5  ❌ FAIL=0

| Paso | Estado | Detalle |
|------|--------|---------|
| C11-01 | ✅ PASS | Texto manual escrito (393 chars) |
| C11-02 | ✅ PASS | Paste Word: cleaned=true, hasContent=true |
| C11-03 | ✅ PASS | Estado: TRANSCRIBED |
| C12-01 | ⚠️ WARN | Sidebar/wizard upload: not found |
| C12-02 | ✅ PASS | Inputs file: 9, accepts: .json, image/*, image/*, image/png, image/*, audio/*, .txt,.text,.md,.rtf,.csv,.json,.doc,.docx,.pdf,text/plain,text/markdown,text/rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document, .json, .json |
| C13-01 | ✅ PASS | Botón grabar: recordBtn, disabled=false |
| C13-02 | ✅ PASS | MediaRecorder API: disponible |
| C14-01 | ✅ PASS | DropZone: dropZone, audioInput: true |
| C14-02 | ✅ PASS | Archivos cargados: 1, transcribeBtn enabled=true |
| C15-01 | ✅ PASS | Preprocesado: normalize=chkNormalize, denoise=undefined |
| C16-01 | ✅ PASS | Transcripción mock cargada: 393 chars, state=TRANSCRIBED |
| C16-02 | ✅ PASS | btnStructureAI visible, disabled=false |
| C17-01 | ✅ PASS | Multi-archivo: 3 tabs, 3 transcripciones |
| C18-01 | ✅ PASS | Template UI: selector=templateSelect, wizard=true |
| C18-02 | ⚠️ WARN | Templates: detect=false, autoDetect=false, templates=false |
| C19-01 | ✅ PASS | Estructuración mock aplicada: h2=true, h3=true, listas=true |
| C19-02 | ✅ PASS | Post-estructura: configPdf=true, copy=true, restore=true |
| C20-01 | ⚠️ WARN | PDF config modal: exists=false, visible=false |
| C20-02 | ⚠️ WARN | Campos PDF: doctor=false, specialty=false, logo=false |
| C20-03 | ⚠️ WARN | PDF functions: generate=false, preview=false, jsPDF=true |
| C11-20-CONSOLE | ✅ PASS | 0 errores JS en consola durante C11-C20 |