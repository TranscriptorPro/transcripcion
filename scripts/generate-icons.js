/**
 * Genera icon-192.png y icon-512.png para PWA
 * Fondo: círculo verde (#2dd4a8) con borde azul (#1a56a0),
 * centrado con el logo superhero2.png ocupando ~78% del diámetro interno.
 */
const sharp = require('sharp');
const path = require('path');

const LOGO_SRC = path.join(__dirname, '..', 'recursos', 'logo-superhero2.png');
const OUT_DIR = path.join(__dirname, '..', 'assets');

async function generateIcon(size) {
    const borderWidth = Math.round(size * 0.08);
    const innerR = Math.round((size / 2) - borderWidth);
    const logoSize = Math.round(innerR * 2 * 0.78);
    const logoOffset = Math.round((size - logoSize) / 2);
    const cx = size / 2;
    const cy = size / 2;

    // SVG background: blue rounded-square + green circle
    const bgSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#1a56a0"/>
        <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#2dd4a8"/>
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
    require('fs').writeFileSync(outPath, result);
    console.log(`✅ ${outPath} (${result.length} bytes)`);
}

(async () => {
    await generateIcon(192);
    await generateIcon(512);
    console.log('Done!');
})();
