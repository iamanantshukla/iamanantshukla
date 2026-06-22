const sharp = require('sharp');
const path = require('path');

const inputSvg = path.join(__dirname, 'public', 'pebble.svg');

async function convert() {
  try {
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));
      
    await sharp(inputSvg)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, 'public', 'pebble-192.png'));
      
    await sharp(inputSvg)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, 'public', 'pebble-512.png'));

    console.log('Successfully generated PNG icons!');
  } catch (err) {
    console.error('Error converting SVG:', err);
  }
}

convert();
