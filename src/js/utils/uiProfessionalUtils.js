// ============ UI PROFESSIONAL PERSONALIZATION ============
window.applyProfessionalData = function (data) {
    if (!data) return;
    const { nombre, matricula, specialties } = data;

    // Header: ADMIN siempre mantiene su banner intacto
    const isAdmin = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN');
    const welcomeName = document.getElementById('doctorWelcomeName');
    if (welcomeName && !isAdmin) {
        // Limpiar prefijos de titulo existentes del nombre
        let cleanName = (nombre || '').trim();
        let isFemale = false;
        const titleMatch = cleanName.match(/^(Dra\.?|Dr\.?)\s+/i);
        if (titleMatch) {
            // Detectar genero por el prefijo que ya traia el nombre
            isFemale = /^dra/i.test(titleMatch[1]);
            cleanName = cleanName.slice(titleMatch[0].length).trim();
        } else {
            // Heuristica: nombres que terminan en 'a' suelen ser femeninos en espanol
            const firstName = cleanName.split(/\s+/)[0] || '';
            const femNames = ['maria','ana','laura','paula','andrea','carolina','claudia','monica','patricia','sandra','silvia','gabriela','daniela','fernanda','valeria','cecilia','marcela','alejandra','rosa','elena','lucia','victoria','camila','sofia','natalia','adriana','liliana','lorena','soledad','florencia','agustina','romina','mariana','graciela','beatriz','susana','norma','marta','alicia','irene','ines','nora','mirta','gladys','raquel','esther','ruth','sara','noemi','mercedes','pilar','rocio','veronica','viviana','yanina','julia','magdalena','carmen','lourdes','micaela','julieta','aldana','gimena','nadia','melina','abigail','celeste','constanza','emilia','priscila','josefina','gisela','analia','carina','eugenia','silvana','sabrina','brenda','paola','marisa'];
            isFemale = femNames.includes(firstName.toLowerCase());
        }
        const title = isFemale ? 'Dra.' : 'Dr.';
        welcomeName.textContent = `${title} ${cleanName}`;
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
    if (lockName) lockName.textContent = nombre;
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
