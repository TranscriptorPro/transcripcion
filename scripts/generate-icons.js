/**
 * Genera icon-192.png y icon-512.png para PWA
 * Fondo: combinación profesional naranja + negro con degradados,
 * centrado con el logo superhero2.png ocupando ~86% del diámetro interno.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LOGO_SRC = path.join(__dirname, '..', 'recursos', 'logo-superhero2.png');
const OUT_DIR = path.join(__dirname, '..', 'assets');

async function generateIcon(size) {
    const borderWidth = Math.round(size * 0.085);
    const innerR = Math.round((size / 2) - borderWidth);
    const logoSize = Math.round(innerR * 2 * 0.86);
    const logoOffset = Math.round((size - logoSize) / 2);
    const cx = size / 2;
    const cy = size / 2;

    // SVG background: base oscuro con degradado + disco naranja degradado.
    const bgSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1b1b1d"/>
                <stop offset="55%" stop-color="#0f0f10"/>
                <stop offset="100%" stop-color="#000000"/>
            </linearGradient>
            <radialGradient id="discGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#ffb347"/>
                <stop offset="55%" stop-color="#ff7a1a"/>
                <stop offset="100%" stop-color="#e35d00"/>
            </radialGradient>
            <radialGradient id="ringGlow" cx="50%" cy="50%" r="60%">
                <stop offset="70%" stop-color="rgba(255,122,26,0)"/>
                <stop offset="100%" stop-color="rgba(255,122,26,0.45)"/>
            </radialGradient>
        </defs>
        <rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#baseGrad)"/>
        <circle cx="${cx}" cy="${cy}" r="${Math.round(innerR + Math.max(2, size * 0.015))}" fill="url(#ringGlow)"/>
        <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="url(#discGrad)"/>
        <circle cx="${cx}" cy="${cy}" r="${Math.round(innerR * 0.985)}" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="${Math.max(1, Math.round(size * 0.01))}"/>
    </svg>`;

    const logo = await sharp(LOGO_SRC)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    const result = await sharp(Buffer.from(bgSvg))
        .composite([{
            input: logo,
            top: logoOffset,
            left: logoOffset,
            blend: 'over'
        }])
        .png()
        .toBuffer();

    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(outPath, result);
    console.log(`✅ ${outPath} (${result.length} bytes)`);
}

(async () => {
    await generateIcon(192);
    await generateIcon(512);
    console.log('Done!');
})();
