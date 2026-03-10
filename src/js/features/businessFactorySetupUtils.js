// ============ BUSINESS FACTORY SETUP CORE ============

window.handleFactorySetupCore = async function (medicoId) {
    console.info('[Factory] Configurando app para médico:', medicoId);

    // Mostrar overlay de carga
    _showSetupLoadingOverlay();

    try {
        // Generar device_id si no existe
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2, 10));
            if (typeof appDB !== 'undefined') appDB.set('device_id', deviceId);
            localStorage.setItem('device_id', deviceId);
        }

        // Llamar al backend
        const backendUrl = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
        const url = `${backendUrl}?action=validate&id=${encodeURIComponent(medicoId)}&deviceId=${encodeURIComponent(deviceId)}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const doctor = await resp.json();

        if (doctor.error) {
            _showSetupError(doctor.error, doctor.code);
            return;
        }

        // ── Parsear datos enriquecidos del registro ANTES de usarlos ─────────
        let regDatos = {};
        try { regDatos = JSON.parse(doctor.Registro_Datos || '{}'); } catch(_) {}

        // ── Mapear plan → CLIENT_CONFIG ──────────────────────────────────────
        const plan = String(doctor.Plan || 'trial').toLowerCase();
        const planMap = {
            trial:      { type: 'TRIAL',  hasProMode: false, hasDashboard: false, canGenerateApps: false },
            normal:     { type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false },
            pro:        { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
            gift:       { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
            clinic:     { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: true  },
            enterprise: { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false }
        };
        const pc = planMap[plan] || planMap.trial;

        // Parsear specialties
        let specialties = ['ALL'];
        try {
            const spec = String(doctor.Especialidad || 'ALL');
            specialties = spec === 'ALL' ? ['ALL'] : spec.split(',').map(s => s.trim());
        } catch (_) {}

        // Parsear allowedTemplates
        let allowedTemplates = [];
        try {
            const tpl = String(doctor.Allowed_Templates || '');
            if (tpl && tpl !== 'ALL' && tpl !== '') {
                allowedTemplates = JSON.parse(tpl);
            }
        } catch (_) {}

        const clientConfig = {
            medicoId:         medicoId,
            type:             pc.type,
            planCode:         plan,
            status:           String(doctor.Estado || 'active'),
            specialties:      specialties,
            maxDevices:       Number(doctor.Devices_Max) || 2,
            trialDays:        plan === 'trial' ? 7 : 0,
            // regDatos.hasProMode puede venir del admin para override del plan
            hasProMode:       regDatos.hasProMode !== undefined ? !!regDatos.hasProMode : pc.hasProMode,
            hasDashboard:     pc.hasDashboard,
            canGenerateApps:  pc.canGenerateApps,
            allowedTemplates: allowedTemplates,
            backendUrl:       backendUrl
        };

        // ── Guardar en localStorage ──────────────────────────────────────────
        if (typeof appDB !== 'undefined') appDB.set('client_config_stored', clientConfig);
        localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));
        Object.assign(window.CLIENT_CONFIG, clientConfig);

        // prof_data (nombre, matrícula, especialidad)
        const profData = {
            nombre:       doctor.Nombre      || 'Profesional',
            matricula:    doctor.Matricula    || '',
            workplace:    '',
            specialties:  specialties,
            estudios:     [],
            especialidad: doctor.Especialidad || '',
        };
        window._profDataCache = profData;
        if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
        localStorage.setItem('prof_data', JSON.stringify(profData));

        // ── Cargar datos enriquecidos del registro ─────────────────────────────
        // (regDatos ya fue parseado arriba, antes de clientConfig)

        // Workplace profiles (si el registro incluía datos de lugar de trabajo)
        if (regDatos.workplace) {
            try {
                const wp = typeof regDatos.workplace === 'string' ? JSON.parse(regDatos.workplace) : regDatos.workplace;
                if (wp && wp.name) {
                    // Construir perfil del profesional para cada lugar
                    const buildProfessional = () => {
                        const sm = (typeof regDatos.socialMedia === 'object' && regDatos.socialMedia) ? regDatos.socialMedia : {};
                        return {
                            nombre:          doctor.Nombre    || '',
                            sexo:            regDatos.sexo || doctor.sexo || '',
                            matricula:       doctor.Matricula || '',
                            especialidades:  doctor.Especialidad || '',
                            telefono:        doctor.Telefono  || '',
                            email:           doctor.Email     || '',
                            whatsapp:        sm.whatsapp  || sm.WhatsApp  || '',
                            instagram:       sm.instagram || sm.Instagram || '',
                            facebook:        sm.facebook  || sm.Facebook  || '',
                            x:               sm.x || sm.X || sm.twitter || sm.Twitter || '',
                            youtube:         sm.youtube   || sm.YouTube   || '',
                            firma:           regDatos.firma   || '',
                            logo:            regDatos.proLogo || '',
                            showPhone:       regDatos.showPhone  !== false,
                            showEmail:       regDatos.showEmail  !== false,
                            showSocial:      regDatos.showSocial === true
                        };
                    };

                    const workplaceProfiles = [{
                        name:    wp.name    || '',
                        address: wp.address || '',
                        phone:   wp.phone   || '',
                        email:   wp.email   || '',
                        footer:  wp.footer  || regDatos.footerText || '',
                        logo:    wp.logo    || '',
                        professionals: [buildProfessional()]
                    }];

                    // Agregar workplaces extras (si existen)
                    let extras = regDatos.extraWorkplaces || [];
                    if (typeof extras === 'string') {
                        try { extras = JSON.parse(extras); } catch(_) { extras = []; }
                    }
                    if (Array.isArray(extras)) {
                        extras.forEach(ewp => {
                            if (ewp && ewp.name) {
                                workplaceProfiles.push({
                                    name:    ewp.name    || '',
                                    address: ewp.address || '',
                                    phone:   ewp.phone   || '',
                                    email:   ewp.email   || '',
                                    footer:  ewp.footer  || regDatos.footerText || '',
                                    logo:    ewp.logo    || '',
                                    professionals: [buildProfessional()]
                                });
                            }
                        });
                    }

                    window._wpProfilesCache = workplaceProfiles;
                    if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                    localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));

                    // ── CLINIC mode: si vienen múltiples profesionales, poblar el primer workplace ──
                    // regDatos.profesionales (de Registro_Datos) o doctor.Profesionales (campo top-level)
                    let clinicProfs = [];
                    try {
                        clinicProfs = regDatos.profesionales || JSON.parse(doctor.Profesionales || '[]');
                    } catch(_) {}
                    if (Array.isArray(clinicProfs) && clinicProfs.length > 1) {
                        workplaceProfiles[0].professionals = clinicProfs.map(function(p) {
                            const smp = (typeof p.socialMedia === 'object' && p.socialMedia) ? p.socialMedia : {};
                            return {
                                nombre:         p.nombre        || '',
                                matricula:      p.matricula     || '',
                                especialidades: p.especialidad  || p.especialidades || '',
                                telefono:       p.telefono      || '',
                                email:          p.email         || '',
                                whatsapp:       p.whatsapp      || smp.whatsapp || smp.WhatsApp || '',
                                instagram:      p.instagram     || smp.instagram || smp.Instagram || '',
                                facebook:       p.facebook      || smp.facebook || smp.Facebook || '',
                                x:              p.x             || smp.x || smp.X || smp.twitter || smp.Twitter || '',
                                youtube:        p.youtube       || smp.youtube || smp.YouTube || '',
                                firma:          p.firma         || '',
                                logo:           p.logo          || '',
                                socialMedia:    p.socialMedia   || null,
                                showPhone:      p.showPhone     !== false,
                                showEmail:      p.showEmail     !== false,
                                showSocial:     p.showSocial    === true
                            };
                        });
                        // Re-guardar con la lista completa de profesionales
                        window._wpProfilesCache = workplaceProfiles;
                        if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
                    }

                    // Actualizar prof_data con workplace
                    profData.workplace = wp.name || '';
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));
                }
            } catch(_) {}
        }

        // Firma del profesional (base64) → guardar en la key que pdfMaker lee
        if (regDatos.firma) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('pdf_signature', regDatos.firma);
                localStorage.setItem('pdf_signature', regDatos.firma);
            } catch(_) {}
        }

        // Logo profesional (base64) → guardar en la key que pdfMaker lee
        if (regDatos.proLogo) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('pdf_logo', regDatos.proLogo);
                localStorage.setItem('pdf_logo', regDatos.proLogo);
            } catch(_) {}
        }

        // Tamaño del logo profesional en PDF
        if (regDatos.proLogoSize) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('prof_logo_size_px', regDatos.proLogoSize);
                localStorage.setItem('prof_logo_size_px', String(regDatos.proLogoSize));
            } catch(_) {}
        }

        // Tamaño del logo institucional en PDF → guardar en pdf_config
        if (regDatos.instLogoSize) {
            try {
                var existCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                existCfg.instLogoSizePx = parseInt(regDatos.instLogoSize);
                if (typeof appDB !== 'undefined') appDB.set('pdf_config', existCfg);
                localStorage.setItem('pdf_config', JSON.stringify(existCfg));
                window._pdfConfigCache = existCfg;
                // Compatibilidad: mantener localStorage legacy
                localStorage.setItem('inst_logo_size_px', String(regDatos.instLogoSize));
            } catch(_) {}
        }

        // Visibilidad de contacto en PDF (teléfono, email, redes)
        if (regDatos.showPhone !== undefined || regDatos.showEmail !== undefined || regDatos.showSocial !== undefined) {
            try {
                const cfgContact = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                if (regDatos.showPhone  !== undefined) cfgContact.showPhone  = regDatos.showPhone  !== false;
                if (regDatos.showEmail  !== undefined) cfgContact.showEmail  = regDatos.showEmail  !== false;
                if (regDatos.showSocial !== undefined) cfgContact.showSocial = regDatos.showSocial === true;
                if (typeof appDB !== 'undefined') appDB.set('pdf_config', cfgContact);
                localStorage.setItem('pdf_config', JSON.stringify(cfgContact));
                window._pdfConfigCache = cfgContact;
            } catch(_) {}
        }

        // Redes sociales del profesional → guardar en prof_data
        if (regDatos.socialMedia) {
            try {
                profData.socialMedia = regDatos.socialMedia;
                window._profDataCache = profData;
                if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                localStorage.setItem('prof_data', JSON.stringify(profData));
            } catch(_) {}
        }

        // Header Color del PDF (solo afecta informes, NO el color de la app)
        if (regDatos.headerColor) {
            profData.headerColor = regDatos.headerColor;
            window._profDataCache = profData;
            if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
            localStorage.setItem('prof_data', JSON.stringify(profData));
            // NO aplicar como customPrimaryColor: el color de encabezado del informe
            // es independiente del color primario de la app
        }

        // Skin siempre arranca en 'default' en el primer uso — cada usuario parte
        // de la app original. Si después quiere cambiar a cyberpunk, etc., ese
        // cambio queda solo en SU dispositivo y no afecta a ningún otro clone.
        localStorage.setItem('app_skin', 'default');
        if (typeof appDB !== 'undefined') appDB.set('app_skin', 'default');
        if (window.ThemeManager && typeof window.ThemeManager.apply === 'function') {
            window.ThemeManager.apply('default', { save: false });
        }

        // Estudios seleccionados
        if (regDatos.estudios) {
            try {
                const estudios = typeof regDatos.estudios === 'string' ? JSON.parse(regDatos.estudios) : regDatos.estudios;
                if (Array.isArray(estudios) && estudios.length > 0) {
                    profData.estudios = estudios;
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));
                }
            } catch(_) {}
        }

        // Footer text del PDF → guardar en pdf_config directamente
        if (regDatos.footerText) {
            try {
                const existingCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                existingCfg.footerText = regDatos.footerText;
                if (typeof appDB !== 'undefined') appDB.set('pdf_config', existingCfg);
                localStorage.setItem('pdf_config', JSON.stringify(existingCfg));
                window._pdfConfigCache = existingCfg;
            } catch(_) {}
        }

        // API Key (si el admin la configuró en el Sheet o viene en Registro_Datos)
        const apiKey   = doctor.API_Key    || regDatos.apiKey   || '';
        const apiKeyB1 = doctor.API_Key_B1 || regDatos.apiKeyB1 || '';
        const apiKeyB2 = doctor.API_Key_B2 || regDatos.apiKeyB2 || '';
        if (apiKey) {
            if (typeof window.setGroqApiKey === 'function') {
                window.setGroqApiKey(apiKey, { source: 'factory-setup' });
            } else {
                // Fallback defensivo: state.js deberia exponer setGroqApiKey.
                if (typeof appDB !== 'undefined') appDB.set('groq_api_key', apiKey);
                localStorage.setItem('groq_api_key', apiKey);
                window.GROQ_API_KEY = apiKey;
            }
        }
        if (apiKeyB1) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key_b1', apiKeyB1);
            localStorage.setItem('groq_api_key_b1', apiKeyB1);
        }
        if (apiKeyB2) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key_b2', apiKeyB2);
            localStorage.setItem('groq_api_key_b2', apiKeyB2);
        }

        // Guardar ID del médico
        if (typeof appDB !== 'undefined') appDB.set('medico_id', medicoId);
        localStorage.setItem('medico_id', medicoId);

        // Limpiar la marca de setup pendiente
        delete window._PENDING_SETUP_ID;

        console.info('[Factory] Setup completado para', doctor.Nombre || medicoId, '— Plan:', plan);

        // ── Continuar con flujo de cliente (onboarding) ──────────────────────
        _hideSetupLoadingOverlay();
        _initClient(); // mostrará el onboarding con T&C

    } catch (err) {
        console.error('[Factory] Error en setup:', err);
        _showSetupError('Error: ' + (err.message || err) + '. Recargá la página para reintentar.', 'NETWORK');
    }
}
