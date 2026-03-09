// Settings Theme Utils
// Shared color conversion and palette generation used by settings panel.
(function () {
    'use strict';

    function hexToHSL(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s, l };
    }

    function hslToHex(h, s, l) {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        let r, g, b2;
        if (s === 0) {
            r = g = b2 = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h / 360 + 1 / 3);
            g = hue2rgb(p, q, h / 360);
            b2 = hue2rgb(p, q, h / 360 - 1 / 3);
        }
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
    }

    function generatePalette(hex) {
        const { h, s, l } = hexToHSL(hex);
        return {
            primary: hex,
            primaryLight: hslToHex(h, Math.min(s * 1.2, 1), Math.min(l + 0.15, 0.85)),
            primaryDark: hslToHex(h, s, Math.max(l - 0.08, 0.1)),
            accent: hslToHex((h + 45) % 360, 0.85, 0.55)
        };
    }

    window.SettingsThemeUtils = {
        hexToHSL,
        hslToHex,
        generatePalette
    };
})();
