// Settings Theme Section Utils
// Encapsulates theme and custom color UI behavior for settings modal.
(function () {
    'use strict';

    function initThemeSection(options) {
        const opts = options || {};
        const defaultPrimary = opts.defaultPrimary || '#0f766e';

        const themeUtils = window.SettingsThemeUtils || {};
        const hexToHSL = themeUtils.hexToHSL || (() => ({ h: 174, s: 0.75, l: 0.3 }));
        const hslToHex = themeUtils.hslToHex || (() => defaultPrimary);
        const generatePalette = themeUtils.generatePalette || ((hex) => ({
            primary: hex,
            primaryLight: hex,
            primaryDark: hex,
            accent: hex
        }));

        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');
        const colorPicker = document.getElementById('settingsColorPicker');
        const colorReset = document.getElementById('settingsColorReset');
        const hexLabel = document.getElementById('settingsColorHex');
        const colorTrigger = document.getElementById('settingsColorTrigger');
        const colorCircle = document.getElementById('settingsColorCircle');
        const colorPanel = document.getElementById('settingsColorPanel');
        const hueSlider = document.getElementById('settingsHueSlider');
        const satSlider = document.getElementById('settingsSatSlider');
        const hexInput = document.getElementById('settingsHexInput');
        const presets = document.getElementById('settingsColorPresets');

        let currentSat = 75;

        function applyCustomColor(hex) {
            const p = generatePalette(hex);
            const root = document.documentElement;
            root.style.setProperty('--primary', p.primary);
            root.style.setProperty('--primary-light', p.primaryLight);
            root.style.setProperty('--primary-dark', p.primaryDark);
            root.style.setProperty('--accent', p.accent);

            const preview = document.getElementById('settingsColorPreview');
            if (preview) {
                preview.style.display = '';
                const sd = document.getElementById('swatchDark');
                const sp = document.getElementById('swatchPrimary');
                const sl = document.getElementById('swatchLight');
                const sa = document.getElementById('swatchAccent');
                if (sd) sd.style.background = p.primaryDark;
                if (sp) sp.style.background = p.primary;
                if (sl) sl.style.background = p.primaryLight;
                if (sa) sa.style.background = p.accent;
            }
        }

        function resetCustomColor() {
            const root = document.documentElement;
            root.style.removeProperty('--primary');
            root.style.removeProperty('--primary-light');
            root.style.removeProperty('--primary-dark');
            root.style.removeProperty('--accent');
            if (typeof appDB !== 'undefined') appDB.remove('customPrimaryColor');
            localStorage.removeItem('customPrimaryColor');
            const picker = document.getElementById('settingsColorPicker');
            const lbl = document.getElementById('settingsColorHex');
            const preview = document.getElementById('settingsColorPreview');
            if (picker) picker.value = defaultPrimary;
            if (lbl) lbl.textContent = defaultPrimary;
            if (preview) preview.style.display = 'none';
            if (typeof showToast === 'function') showToast('Color restaurado', 'success');
        }

        function updateSatSliderGradient(hue) {
            if (!satSlider) return;
            satSlider.style.background = `linear-gradient(to right, hsl(${hue},10%,70%), hsl(${hue},50%,50%), hsl(${hue},100%,40%))`;
        }

        function setColor(hex, save) {
            if (colorPicker) colorPicker.value = hex;
            if (hexLabel) hexLabel.textContent = hex;
            if (hexInput) hexInput.value = hex.replace('#', '');
            if (colorCircle) colorCircle.style.background = hex;
            applyCustomColor(hex);

            const hsl = hexToHSL(hex);
            if (hueSlider) hueSlider.value = Math.round(hsl.h);
            currentSat = Math.round(hsl.s * 100);
            if (satSlider) satSlider.value = Math.max(10, currentSat);
            updateSatSliderGradient(hsl.h);

            if (presets) {
                presets.querySelectorAll('.stg-preset').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.color === hex);
                });
            }

            const preview = document.getElementById('settingsColorPreview');
            if (preview) preview.style.display = '';
            if (colorPanel) colorPanel.style.display = '';
            if (save) {
                if (typeof appDB !== 'undefined') appDB.set('customPrimaryColor', hex);
                localStorage.setItem('customPrimaryColor', hex);
            }
        }

        if (lightBtn) {
            lightBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'light');
                if (typeof appDB !== 'undefined') appDB.set('theme', 'light');
                localStorage.setItem('theme', 'light');
                populateThemeButtons({ defaultPrimary });
            });
        }
        if (darkBtn) {
            darkBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'dark');
                if (typeof appDB !== 'undefined') appDB.set('theme', 'dark');
                localStorage.setItem('theme', 'dark');
                populateThemeButtons({ defaultPrimary });
            });
        }

        if (colorTrigger) {
            colorTrigger.addEventListener('click', () => {
                const visible = colorPanel && colorPanel.style.display !== 'none';
                if (colorPanel) colorPanel.style.display = visible ? 'none' : '';
                colorTrigger.classList.toggle('active', !visible);
            });
        }

        if (hueSlider) {
            hueSlider.addEventListener('input', () => {
                const h = parseInt(hueSlider.value, 10);
                const s = currentSat / 100;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                setColor(hslToHex(h, s, l), false);
            });
            hueSlider.addEventListener('change', () => {
                const h = parseInt(hueSlider.value, 10);
                const s = currentSat / 100;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                setColor(hslToHex(h, s, l), true);
            });
        }

        if (satSlider) {
            satSlider.addEventListener('input', () => {
                const s = parseInt(satSlider.value, 10) / 100;
                currentSat = parseInt(satSlider.value, 10);
                const h = hueSlider ? parseInt(hueSlider.value, 10) : 174;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                setColor(hslToHex(h, s, l), false);
            });
            satSlider.addEventListener('change', () => {
                const s = parseInt(satSlider.value, 10) / 100;
                currentSat = parseInt(satSlider.value, 10);
                const h = hueSlider ? parseInt(hueSlider.value, 10) : 174;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                setColor(hslToHex(h, s, l), true);
            });
        }

        if (presets) {
            presets.addEventListener('click', (e) => {
                const btn = e.target.closest('.stg-preset');
                if (!btn || !btn.dataset.color) return;
                setColor(btn.dataset.color, true);
            });
        }

        if (hexInput) {
            hexInput.addEventListener('input', () => {
                let v = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                hexInput.value = v;
                if (v.length === 6) setColor('#' + v, false);
            });
            hexInput.addEventListener('change', () => {
                const v = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                if (v.length === 6) setColor('#' + v, true);
            });
        }

        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => setColor(e.target.value, false));
            colorPicker.addEventListener('change', (e) => setColor(e.target.value, true));
        }

        if (colorReset) {
            colorReset.addEventListener('click', () => {
                resetCustomColor();
                if (colorCircle) colorCircle.style.background = defaultPrimary;
                if (hexInput) hexInput.value = defaultPrimary.replace('#', '');
                if (hueSlider) {
                    const hsl = hexToHSL(defaultPrimary);
                    hueSlider.value = Math.round(hsl.h);
                    updateSatSliderGradient(hsl.h);
                }
                if (satSlider) satSlider.value = 75;
                currentSat = 75;
                if (presets) presets.querySelectorAll('.stg-preset').forEach(b => b.classList.remove('active'));
                if (colorPanel) colorPanel.style.display = 'none';
                if (colorTrigger) colorTrigger.classList.remove('active');
            });
        }

        const saved = localStorage.getItem('customPrimaryColor');
        if (saved) {
            setColor(saved, false);
            if (colorPanel) colorPanel.style.display = 'none';
            if (colorTrigger) colorTrigger.classList.remove('active');
        } else {
            if (hueSlider) {
                const hsl = hexToHSL(defaultPrimary);
                updateSatSliderGradient(hsl.h);
            }
            applyCustomColor(defaultPrimary);
        }
    }

    function populateThemeButtons(options) {
        const opts = options || {};
        const defaultPrimary = opts.defaultPrimary || '#0f766e';
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');
        if (lightBtn) lightBtn.classList.toggle('active', current === 'light');
        if (darkBtn) darkBtn.classList.toggle('active', current === 'dark');

        const saved = localStorage.getItem('customPrimaryColor');
        const picker = document.getElementById('settingsColorPicker');
        const hexLabel = document.getElementById('settingsColorHex');
        if (saved) {
            if (picker) picker.value = saved;
            if (hexLabel) hexLabel.textContent = saved;
        } else {
            if (picker) picker.value = defaultPrimary;
            if (hexLabel) hexLabel.textContent = defaultPrimary;
        }
    }

    window.SettingsThemeSectionUtils = {
        initThemeSection,
        populateThemeButtons
    };
})();
