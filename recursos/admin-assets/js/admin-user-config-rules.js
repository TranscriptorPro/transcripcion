(function() {
    'use strict';

    const PLAN_DEFAULTS = {
        trial:  { maxWorkplaces: 1, maxDevices: 1, studyLimit: 3, allowPdfLogo: false, allowSocial: false },
        normal: { maxWorkplaces: 1, maxDevices: 1, studyLimit: 3, allowPdfLogo: false, allowSocial: false },
        pro:    { maxWorkplaces: 2, maxDevices: 3, studyLimit: -1, allowPdfLogo: true,  allowSocial: true  },
        gift:   { maxWorkplaces: 2, maxDevices: 3, studyLimit: -1, allowPdfLogo: true,  allowSocial: true  },
        clinic: { maxWorkplaces: 1, maxDevices: 5, studyLimit: -1, allowPdfLogo: true,  allowSocial: true  },
        enterprise: { maxWorkplaces: 5, maxDevices: 999, studyLimit: -1, allowPdfLogo: true, allowSocial: true }
    };

    function normalizePlan(plan) {
        const key = String(plan || 'normal').toLowerCase();
        if (key === 'gift') return 'gift';
        if (key === 'clinic') return 'clinic';
        if (key === 'pro') return 'pro';
        if (key === 'enterprise') return 'enterprise';
        if (key === 'trial') return 'trial';
        return 'normal';
    }

    function getPlanRules(plan, externalCfg) {
        const normalized = normalizePlan(plan);
        const base = Object.assign({}, PLAN_DEFAULTS[normalized] || PLAN_DEFAULTS.normal);
        const cfg = externalCfg || {};

        if (Number.isFinite(Number(cfg.maxDevices))) {
            base.maxDevices = Number(cfg.maxDevices);
        }
        if (Number.isFinite(Number(cfg.workplaces))) {
            base.maxWorkplaces = Number(cfg.workplaces);
        }
        if (Number.isFinite(Number(cfg.templateLimit))) {
            base.studyLimit = Number(cfg.templateLimit);
        }

        if (cfg.pdfLogo !== undefined) {
            base.allowPdfLogo = !!cfg.pdfLogo;
        } else if (cfg.hasProMode !== undefined) {
            base.allowPdfLogo = !!cfg.hasProMode;
        }

        base.allowSocial = base.allowPdfLogo;
        base.plan = normalized;
        return base;
    }

    function countAllowedWorkplaces(baseRules, currentWorkplacesLength) {
        const maxByPlan = Math.max(1, Number(baseRules.maxWorkplaces) || 1);
        const existing = Math.max(0, Number(currentWorkplacesLength) || 0);
        return Math.max(maxByPlan, existing);
    }

    window.AdminUserConfigRules = {
        normalizePlan,
        getPlanRules,
        countAllowedWorkplaces
    };
})();
