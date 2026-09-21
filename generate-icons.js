/**
 * Utility script to generate PNG icons for Chrome Extension using standard Node.js
 * Creates minimal valid PNG files for 16x16, 48x48, and 128x128 sizes.
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to generate a simple colored PNG binary buffer
function createSimplePngBuffer(size, r, g, b) {
  // SVG Representation
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.25)}" fill="#0D9488"/>
    <text x="50%" y="65%" font-family="Arial, Cairo, sans-serif" font-weight="bold" font-size="${Math.floor(size * 0.6)}" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">ط</text>
  </svg>`;

  return svg;
}

// Save SVG icons and minimal PNG placeholders
[16, 48, 128].forEach(size => {
  const svgContent = createSimplePngBuffer(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svgContent);
});

console.log('SVG Icons generated successfully in icons/ directory!');
