/**
 * Pure Node.js PNG Generator for PWA Icons
 * کسی بیرونی پیکیج کے بغیر 192x192 اور 512x512 کے درست PNG آئیکنز بناتا ہے
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 ٹیبل برائے PNG چنکس
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crc]);
}

function createPNG(size) {
  const width = size;
  const height = size;

  // IHDR چنک
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // پکسلز ڈیٹا بنانا
  // ہر قطار کے شروع میں 1 فلٹر بائٹ (0) ہوتا ہے
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;
  const innerRadius = width * 0.43;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // فاصلہ مرکز سے
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // زاویہ اور جیومیٹری
      const angle = Math.atan2(dy, dx);

      // پس منظر زمردی گریڈینٹ
      const t = (x + y) / (width + height);
      let r = Math.round(6 + t * 14);   // #062219 to #145944
      let g = Math.round(34 + t * 55);
      let b = Math.round(25 + t * 43);
      let a = 255;

      // گول بارڈر (Gold Border)
      if (dist >= innerRadius && dist <= radius) {
        // سنہری رنگ
        r = 212;
        g = 175;
        b = 55;
      } else if (dist > radius) {
        // کونے نرم گولائی
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > width * 0.48) {
          a = 0; // شفّاف کونے
        }
      }

      // درمیان میں کتاب کی علامت (Central Book Motif)
      const bookW = width * 0.55;
      const bookH = height * 0.35;
      const bookTop = cy - bookH * 0.55;
      const bookBottom = cy + bookH * 0.45;

      if (y >= bookTop && y <= bookBottom && Math.abs(dx) <= bookW / 2) {
        // کتاب کا رخ
        const normX = Math.abs(dx) / (bookW / 2);
        const pageCurve = Math.sin(normX * Math.PI) * (height * 0.04);

        if (y >= (bookTop + pageCurve) && y <= (bookBottom + pageCurve)) {
          // کتاب کے سفید / سنہری ورق
          if (Math.abs(dx) < 3) {
            // درمیانی ریڑھ کی ہڈی (Gold Spine)
            r = 212; g = 175; b = 55;
          } else if (y >= (bookTop + pageCurve + 4) && y <= (bookBottom + pageCurve - 4) && Math.abs(dx) < (bookW / 2 - 4)) {
            // صفحات
            r = 250; g = 246; b = 235;
            // تحریر کی باریک لکیریں
            if (y % Math.round(height * 0.04) === 0) {
              r = 180; g = 145; b = 40;
            }
          } else {
            // سنہری کنارہ
            r = 212; g = 175; b = 55;
          }
        }
      }

      // اوپر ہلال (Crescent at top)
      const cresY = cy - height * 0.28;
      const cDist1 = Math.sqrt(dx * dx + (y - cresY) * (y - cresY));
      const cDist2 = Math.sqrt((dx - width * 0.02) * (dx - width * 0.02) + (y - (cresY - height * 0.01)) * (y - (cresY - height * 0.01)));

      if (cDist1 <= width * 0.07 && cDist2 > width * 0.06) {
        r = 255; g = 220; b = 80;
      }

      // نیچے AI ٹیگ (AI Tag at bottom)
      const tagTop = cy + height * 0.26;
      const tagBottom = cy + height * 0.40;
      const tagW = width * 0.35;

      if (y >= tagTop && y <= tagBottom && Math.abs(dx) <= tagW / 2) {
        // گولائی دار ٹیگ
        r = 12; g = 56; b = 43; // گہرا زمرد
        if (Math.abs(dx) >= tagW / 2 - 2 || y <= tagTop + 2 || y >= tagBottom - 2) {
          r = 212; g = 175; b = 55; // سنہری بارڈر
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // IDAT چنک (کمپریسڈ)
  const compressed = zlib.deflateSync(rawData);

  // مکمل PNG فارمیٹ
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// ڈائریکٹری بنانا اور فائلیں محفوظ کرنا
const iconsDir = path.join(__dirname, 'public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192
const p192 = createPNG(192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);
console.log('Created icon-192.png (Bytes:', p192.length, ')');

// 512x512
const p512 = createPNG(512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);
console.log('Created icon-512.png (Bytes:', p512.length, ')');

// apple-touch-icon (180x180)
const p180 = createPNG(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), p180);
console.log('Created apple-touch-icon.png (Bytes:', p180.length, ')');
