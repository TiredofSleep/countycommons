// Shared OCR helpers.
//
// deshear(): county scans are mostly 1-bit images whose rows are padded to
// byte boundaries in the PDF stream; the extractor decodes them unpadded,
// so every row drifts (8 - width%8)%8 pixels and the page shears diagonally.
// This re-slices the pixel stream with the correct stride. Applied only to
// GRAYSCALE_1BPP images (kind === 1); other kinds decode correctly.

const { PNG } = require('pngjs');

function deshear(png) {
  const w = png.width, h = png.height, pad = (8 - (w % 8)) % 8;
  if (pad === 0) return png;
  const out = new PNG({ width: w, height: h });
  const stride = w + pad;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * stride + x;
      const jy = Math.floor(j / w), jx = j % w;
      const oi = (y * w + x) * 4;
      const v = jy < h ? png.data[(jy * w + jx) * 4] : 255;
      out.data[oi] = out.data[oi + 1] = out.data[oi + 2] = v;
      out.data[oi + 3] = 255;
    }
  }
  return out;
}

// Returns a PNG buffer ready for OCR from an extracted pdf-parse image.
function ocrReadyPng(im) {
  const raw = Buffer.from(im.dataUrl.split(',')[1], 'base64');
  if (im.kind !== 1) return raw;
  const png = PNG.sync.read(raw);
  return PNG.sync.write(deshear(png));
}

module.exports = { deshear, ocrReadyPng };
