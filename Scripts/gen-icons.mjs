/**
 * Generate placeholder PNG toolbar icons (solid color). No extra npm deps.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { deflateSync } from 'zlib';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'icons');

/** PNG CRC-32 */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(typeStr, data) {
  const type = Buffer.from(typeStr, 'binary');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([len, type, data, crcBuf]);
}

/** RGB 8-bit, color type 2, filter 0 per scanline */
function solidRgbPng(size, r, g, b) {
  const raw = Buffer.alloc((1 + size * 3) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idatData = deflateSync(raw);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(iconsDir, { recursive: true });

// Neutral accent readable on light and dark toolbars
const rgb = { r: 0x1a, g: 0x73, b: 0xe8 };

for (const size of [16, 48, 128]) {
  const png = solidRgbPng(size, rgb.r, rgb.g, rgb.b);
  writeFileSync(join(iconsDir, `icon${size}.png`), png);
}
