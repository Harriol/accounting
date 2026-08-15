const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

const RESOURCES = path.join(__dirname, '..', 'resources');

// ============ Tiger Icon SVG ============
// A cute chibi tiger face — simple enough for small icon sizes
function makeSvg(size) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFB347"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </radialGradient>
  </defs>
  <!-- Circle background -->
  <circle cx="256" cy="256" r="250" fill="url(#bg)"/>
  <!-- Ears -->
  <ellipse cx="148" cy="90" rx="55" ry="60" fill="#FF8C00"/>
  <ellipse cx="148" cy="90" rx="35" ry="40" fill="#FFF5E6"/>
  <ellipse cx="364" cy="90" rx="55" ry="60" fill="#FF8C00"/>
  <ellipse cx="364" cy="90" rx="35" ry="40" fill="#FFF5E6"/>
  <!-- Face — white rounded shape -->
  <ellipse cx="256" cy="300" rx="170" ry="160" fill="#FFF5E6"/>
  <!-- Cheek fluff -->
  <ellipse cx="120" cy="340" rx="45" ry="50" fill="#FFF5E6"/>
  <ellipse cx="392" cy="340" rx="45" ry="50" fill="#FFF5E6"/>
  <!-- Forehead stripes (王 character style = tiger) -->
  <line x1="256" y1="190" x2="256" y2="270" stroke="#FF6B00" stroke-width="10" stroke-linecap="round"/>
  <line x1="200" y1="220" x2="310" y2="220" stroke="#FF6B00" stroke-width="9" stroke-linecap="round"/>
  <line x1="210" y1="245" x2="302" y2="245" stroke="#FF6B00" stroke-width="8" stroke-linecap="round"/>
  <line x1="220" y1="265" x2="292" y2="265" stroke="#FF6B00" stroke-width="7" stroke-linecap="round"/>
  <!-- Eyes — big cute round -->
  <circle cx="190" cy="300" r="28" fill="#2D1B00"/>
  <circle cx="196" cy="292" r="10" fill="white"/>
  <circle cx="322" cy="300" r="28" fill="#2D1B00"/>
  <circle cx="328" cy="292" r="10" fill="white"/>
  <!-- Eyebrows -->
  <line x1="160" y1="263" x2="210" y2="270" stroke="#2D1B00" stroke-width="6" stroke-linecap="round"/>
  <line x1="302" y1="270" x2="352" y2="263" stroke="#2D1B00" stroke-width="6" stroke-linecap="round"/>
  <!-- Nose -->
  <ellipse cx="256" cy="348" rx="16" ry="12" fill="#FF6B82"/>
  <!-- Mouth — cute W shape -->
  <path d="M240 360 Q248 376 256 368 Q264 376 272 360"
        stroke="#2D1B00" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Whiskers -->
  <line x1="130" y1="330" x2="85" y2="322" stroke="#CC6600" stroke-width="3" stroke-linecap="round"/>
  <line x1="130" y1="350" x2="80" y2="355" stroke="#CC6600" stroke-width="3" stroke-linecap="round"/>
  <line x1="382" y1="330" x2="427" y2="322" stroke="#CC6600" stroke-width="3" stroke-linecap="round"/>
  <line x1="382" y1="350" x2="432" y2="355" stroke="#CC6600" stroke-width="3" stroke-linecap="round"/>
  <!-- Blush -->
  <circle cx="150" cy="340" r="16" fill="#FFD1D1" opacity="0.6"/>
  <circle cx="362" cy="340" r="16" fill="#FFD1D1" opacity="0.6"/>
</svg>`;
}

async function main() {
  const svg = makeSvg(1024);
  const svgBuf = Buffer.from(svg);

  // Generate PNGs at all required icon sizes
  const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512];
  const pngs = [];

  for (const size of sizes) {
    const png = await sharp(svgBuf)
      .resize(size, size)
      .png()
      .toBuffer();
    pngs.push(png);
    const out = path.join(RESOURCES, `icon-${size}.png`);
    fs.writeFileSync(out, png);
    console.log(`  ${size}x${size} ✅`);
  }

  // Generate main icon PNG (512x512)
  const icon512 = pngs[sizes.indexOf(512)];
  fs.writeFileSync(path.join(RESOURCES, 'icon.png'), icon512);

  // Generate ICO for Windows
  const icoInput = [256, 48, 32, 16].map((size) =>
    fs.readFileSync(path.join(RESOURCES, `icon-${size}.png`)));
  const icoBuf = await pngToIco(icoInput);
  fs.writeFileSync(path.join(RESOURCES, 'icon.ico'), icoBuf);
  console.log('  icon.ico ✅');
  console.log('  icon.png ✅ (512x512)');
  console.log('Done! Icons saved to resources/');
}

main().catch((e) => { console.error(e); process.exit(1); });
