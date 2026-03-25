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
            hasDashboard:     regDatos.hasDashboard !== undefined ? !!regDatos.hasDashboard : pc.hasDashboard,
            canGenerateApps:  regDatos.canGenerateApps !== undefined ? !!regDatos.canGenerateApps : pc.canGenerateApps,
            allowedTemplates: allowedTemplates,
            paymentPortalUrl: String(regDatos.paymentPortalUrl || '').trim(),
            backendUrl:       backendUrl
        };

        // ── Guardar en localStorage ──────────────────────────────────────────
        if (typeof appDB !== 'undefined') appDB.set('client_config_stored', clientConfig);
        localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));
        Object.assign(window.CLIENT_CONFIG, clientConfig);

        // prof_data (nombre, matrícula, especialidad)
        const profData = {
            nombre:       doctor.Nombre      || 'Profesional',
            sexo:         regDatos.sexo || doctor.Sexo || doctor.sexo || '',
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
                        adminUser: String(regDatos.adminUser || 'admin'),
                        adminPass: String(regDatos.adminPass || 'clinica'),
                        adminDni:  String(regDatos.adminDni || regDatos.clinicAdminDni || ''),
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

                    // ── CLINIC mode: si vienen profesionales, poblar el primer workplace ──
                    // regDatos.profesionales puede venir como array o string JSON.
                    let clinicProfs = [];
                    try {
                        const fromRegistro = regDatos.profesionales;
                        if (Array.isArray(fromRegistro)) {
                            clinicProfs = fromRegistro;
                        } else if (typeof fromRegistro === 'string' && fromRegistro.trim()) {
                            clinicProfs = JSON.parse(fromRegistro);
                        } else {
                            clinicProfs = JSON.parse(doctor.Profesionales || '[]');
                        }
                    } catch(_) {}
                    if (Array.isArray(clinicProfs) && clinicProfs.length >= 1) {
                        workplaceProfiles[0].professionals = clinicProfs.map(function(p, idx) {
                            // Normalizar redesSociales / socialMedia (ambos formatos aceptados)
                            const smp = (typeof p.socialMedia  === 'object' && p.socialMedia)  ? p.socialMedia  : {};
                            const rs  = (typeof p.redesSociales === 'object' && p.redesSociales) ? p.redesSociales : smp;
                            // Normalizar especialidades a array (C4: array; antiguo: string)
                            let esp = p.especialidades;
                            if (typeof esp === 'string') esp = esp ? [esp] : [];
                            if (!Array.isArray(esp)) esp = [];
                            return {
                                id:             p.id        || ('legacy-' + idx + '-' + Date.now()),
                                nombre:         p.nombre        || '',
                                dni:            p.dni           || '',
                                matricula:      p.matricula     || '',
                                especialidades: esp,
                                usuario:        p.usuario       || '',
                                pin:            String(p.pin || '1234'),
                                telefono:       p.telefono      || '',
                                email:          p.email         || '',
                                whatsapp:       p.whatsapp      || rs.whatsapp  || rs.WhatsApp  || '',
                                instagram:      p.instagram     || rs.instagram || rs.Instagram || '',
                                facebook:       p.facebook      || rs.facebook  || rs.Facebook  || '',
                                x:              p.x             || rs.x         || rs.X         || rs.twitter || rs.Twitter || '',
                                youtube:        p.youtube       || rs.youtube   || rs.YouTube   || '',
                                firma:          p.firma         || '',
                                logo:           p.logo          || '',
                                redesSociales:  rs,
                                showPhone:      p.showPhone  !== false,
                                showEmail:      p.showEmail  !== false,
                                showSocial:     p.showSocial === true,
                                primerUso:      p.primerUso  === true,
                                activo:         p.activo     !== false
                            };
                        });
                        // Re-guardar con la lista completa de profesionales
                        window._wpProfilesCache = workplaceProfiles;
                        if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
                    }

                    // Actualizar prof_data con workplace
                    profData.workplace = wp.name || '';
                    // En CLINIC, la identidad principal de la app es la institución.
                    if (plan === 'clinic' && wp.name) {
                        profData.nombre = wp.name;
                        profData.razonSocial = regDatos.clinicNombre || wp.name || doctor.Nombre || '';
                        if (!profData.matricula) profData.matricula = '';
                    }
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));

                    // ── Selección inicial en pdf_config ──────────────────────────────
                    // Sin esto, pdfPreview.js no sabe qué workplace/profesional mostrar
                    // en el primer uso y el preview aparece vacío.
                    try {
                        const firstProf = workplaceProfiles[0].professionals[0] || null;
                        const cfgSel = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                        cfgSel.pdfWorkplace = '0';
                        if (plan === 'clinic') {
                            delete cfgSel.pdfProfessional;
                            delete cfgSel.activeProfessionalIndex;
                            delete cfgSel.activeProfessional;
                        } else {
                            cfgSel.pdfProfessional = '0';
                            cfgSel.activeProfessionalIndex = '0';
                            if (firstProf) cfgSel.activeProfessional = firstProf;
                        }
                        if (typeof appDB !== 'undefined') appDB.set('pdf_config', cfgSel);
                        localStorage.setItem('pdf_config', JSON.stringify(cfgSel));
                        window._pdfConfigCache = cfgSel;
                    } catch(_) {}
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
        } else {
            // Sin API Key en el backend: limpiar cualquier key stale de sesiones
            // de testing previas para evitar validaciones falsas (banner "Key inválida").
            if (typeof window.clearGroqApiKey === 'function') {
                window.clearGroqApiKey('factory-setup-no-api-key');
            } else {
                localStorage.removeItem('groq_api_key');
                if (typeof appDB !== 'undefined') appDB.set('groq_api_key', '');
                window.GROQ_API_KEY = '';
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

        // Skin siempre arranca en 'default' en el primer uso — cada usuario parte
        // de la app original. Si después quiere cambiar a cyberpunk, etc., ese
        // cambio queda solo en SU dispositivo y no afecta a ningún otro clone.
        // Se ejecuta al final del setup exitoso para asegurar persistencia.
        localStorage.setItem('app_skin', 'default');
        if (typeof appDB !== 'undefined') appDB.set('app_skin', 'default');
        if (window.ThemeManager && typeof window.ThemeManager.apply === 'function') {
            window.ThemeManager.apply('default', { save: false });
        }

        // Limpiar la marca de setup pendiente
        delete window._PENDING_SETUP_ID;

        console.log('[FactorySetup] Setup completado:', {
            medicoId: localStorage.getItem('medico_id'),
            type: JSON.parse(localStorage.getItem('client_config_stored') || '{}').type,
            skin: localStorage.getItem('app_skin'),
            workplaces: JSON.parse(localStorage.getItem('workplace_profiles') || '[]').length,
            hasFirma: !!localStorage.getItem('pdf_signature'),
            hasLogo: !!localStorage.getItem('pdf_logo')
        });

        console.info('[Factory] Setup completado para', doctor.Nombre || medicoId, '— Plan:', plan);

        // ── Continuar con flujo de cliente (onboarding) ──────────────────────
        _hideSetupLoadingOverlay();
        _initClient(); // mostrará el onboarding con T&C

    } catch (err) {
        console.error('[Factory] Error en setup:', err);
        _showSetupError('Error: ' + (err.message || err) + '. Recargá la página para reintentar.', 'NETWORK');
    }
}
