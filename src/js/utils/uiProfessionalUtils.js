// ============ UI PROFESSIONAL PERSONALIZATION ============
window.applyProfessionalData = function (data) {
    if (!data) return;
    const { nombre, matricula, specialties, sexo } = data;

    // Header: ADMIN siempre mantiene su banner intacto
    const isAdmin = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN');
    const welcomeName = document.getElementById('doctorWelcomeName');
    if (welcomeName && !isAdmin) {
        if (typeof window.getProfessionalDisplay === 'function') {
            const prof = window.getProfessionalDisplay(nombre, sexo);
            welcomeName.textContent = prof.fullName;
        } else {
            welcomeName.textContent = (nombre || '').trim();
        }
    }

    // Header logo: siempre mostrar logo-superhero2.png en la UI (el logo del profesional va solo en el PDF)
    if (!isAdmin) {
        const headerLogo = document.getElementById('headerLogoImg');
        if (headerLogo) {
            headerLogo.src = 'recursos/logo-superhero2.png';
            // Tamano lo controla .header-logo en CSS (100px), no sobreescribir
        }
    }

    // Locked display in metadata card
    const lockName = document.getElementById('lockNameDisplay');
    const lockMatricula = document.getElementById('lockMatriculaDisplay');
    if (lockName) {
        if (typeof window.getProfessionalDisplay === 'function') {
            lockName.textContent = window.getProfessionalDisplay(nombre, sexo).fullName;
        } else {
            lockName.textContent = nombre;
        }
    }
    if (lockMatricula) lockMatricula.textContent = matricula;

    // PDF Config Modal fields
    const pdfName = document.getElementById('pdfProfName');
    const pdfMatricula = document.getElementById('pdfProfMatricula');
    const pdfSpecialty = document.getElementById('pdfProfEspecialidad');

    if (pdfName) pdfName.value = nombre;
    if (pdfMatricula) pdfMatricula.value = matricula;
    if (pdfSpecialty) pdfSpecialty.value = Array.isArray(specialties) ? specialties.join(', ') : specialties;
};

window.updatePersonalization = function (data) {
    window.applyProfessionalData(data);
};
