// ============ CLINICAL STRUCTURER (LLaMA 3) ============

async function structureTranscription(text, templateKey) {
    if (!GROQ_API_KEY) {
        showToast('Configura la API Key para el Modo Pro', 'error');
        return text;
    }

    // Find prompt in flat MEDICAL_TEMPLATES
    // Checking if MEDICAL_TEMPLATES is globally available
    let prompt = '';
    if (typeof MEDICAL_TEMPLATES !== 'undefined') {
        prompt = MEDICAL_TEMPLATES[templateKey]?.prompt || MEDICAL_TEMPLATES.generico?.prompt || 'Estructura este texto médico de forma profesional, corrigiendo terminología, organizándolo en párrafos coherentes y mejorando la sintaxis sin perder información:';
    } else {
        console.warn('MEDICAL_TEMPLATES no está definido globalmente.');
        prompt = 'Estructura este texto médico de forma profesional, corrigiendo terminología, y agregando las secciones clínicas apropiadas que detectes:';
    }

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: `Transcripción a estructurar:\n\n${text}` }
                ],
                temperature: 0.1
            })
        });

        if (!res.ok) throw new Error('Error al estructurar');
        const data = await res.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Structuring failed:', error);
        showToast('Error al estructurar. Se usará texto plano.', 'warning');
        return text; // Fallback a texto plano si falla 
    }
}

// ============ AI BUTTON HANDLERS ============
window.initStructurer = function () {
    const btnStructureAIEl = document.getElementById('btnStructureAI');
    if (btnStructureAIEl) {
        btnStructureAIEl.addEventListener('click', async () => {
            const editor = document.getElementById('editor');
            if (!editor || !editor.innerText.trim()) {
                if (typeof showToast === 'function') showToast('No hay texto para estructurar', 'error');
                return;
            }
            const rawText = editor.innerText;
            const oldHTML = btnStructureAIEl.innerHTML;
            btnStructureAIEl.disabled = true;
            btnStructureAIEl.innerHTML = '⏳ Estructurando...';
            try {
                // Use the selectedTemplate global if it exists, otherwise fallback to 'generico'
                const currentTemplate = typeof selectedTemplate !== 'undefined' ? selectedTemplate : 'generico';
                const structured = await structureTranscription(rawText, currentTemplate);
                editor.innerHTML = structured;
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
                if (typeof showToast === 'function') showToast('✅ Texto estructurado con IA', 'success');
            } catch (error) {
                if (typeof showToast === 'function') showToast('Error al estructurar', 'error');
                btnStructureAIEl.innerHTML = oldHTML;
            } finally {
                btnStructureAIEl.disabled = false;
                btnStructureAIEl.innerHTML = oldHTML;
            }
        });
    }

    const btnApplyStructure = document.getElementById('btnApplyStructure');
    if (btnApplyStructure) {
        btnApplyStructure.addEventListener('click', async () => {
            const editor = document.getElementById('editor');
            if (!editor || !editor.innerText.trim()) return showToast('No hay texto para estructurar', 'error');

            const oldText = btnApplyStructure.textContent;
            btnApplyStructure.disabled = true;
            btnApplyStructure.textContent = "✨ Estructurando...";

            try {
                const templateSelect = document.getElementById('templateSelect');
                const templateKey = templateSelect ? templateSelect.value : 'generico';
                const text = await structureTranscription(editor.innerText, templateKey);
                editor.innerHTML = text;
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof showToast === 'function') showToast('Informe estructurado ✓', 'success');

                const wizardTemplateCard = document.getElementById('wizardTemplateCard');
                if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            } catch (e) {
                if (typeof showToast === 'function') showToast('Error al estructurar', 'error');
            } finally {
                btnApplyStructure.disabled = false;
                btnApplyStructure.textContent = oldText;
            }
        });
    }
}

