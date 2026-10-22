// Image helpers: resize user pictures and convert them to .dds files HOI4 can read.

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load image'));
    img.src = src;
  });
}

// Fit image into w x h. mode 'cover' crops to fill, 'contain' letterboxes with transparency.
export async function resizeToCanvas(src, w, h, mode = 'cover') {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const sr = img.width / img.height;
  const dr = w / h;
  let dw = w, dh = h, dx = 0, dy = 0;
  if ((mode === 'cover') === (sr > dr)) { dh = h; dw = h * sr; } else { dw = w; dh = w / sr; }
  dx = (w - dw) / 2;
  dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return c;
}

// Limit stored image size so project files stay small.
export async function normalizeUpload(dataUrl, maxW, maxH) {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// Uncompressed 32-bit BGRA DDS (A8R8G8B8). HOI4 loads these fine.
export function canvasToDDS(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const buf = new ArrayBuffer(128 + w * h * 4);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  dv.setUint32(0, 0x20534444, true); // "DDS "
  dv.setUint32(4, 124, true); // header size
  dv.setUint32(8, 0x1 | 0x2 | 0x4 | 0x8 | 0x1000, true); // CAPS|HEIGHT|WIDTH|PITCH|PIXELFORMAT
  dv.setUint32(12, h, true);
  dv.setUint32(16, w, true);
  dv.setUint32(20, w * 4, true); // pitch
  dv.setUint32(24, 0, true); // depth
  dv.setUint32(28, 0, true); // mipmaps
  // pixel format at offset 76
  dv.setUint32(76, 32, true);
  dv.setUint32(80, 0x1 | 0x40, true); // ALPHAPIXELS | RGB
  dv.setUint32(84, 0, true);
  dv.setUint32(88, 32, true);
  dv.setUint32(92, 0x00ff0000, true);
  dv.setUint32(96, 0x0000ff00, true);
  dv.setUint32(100, 0x000000ff, true);
  dv.setUint32(104, 0xff000000, true);
  dv.setUint32(108, 0x1000, true); // caps: texture
  let o = 128;
  for (let i = 0; i < px.length; i += 4) {
    u8[o++] = px[i + 2];
    u8[o++] = px[i + 1];
    u8[o++] = px[i];
    u8[o++] = px[i + 3];
  }
  return u8;
}

export async function toDDS(dataUrl, w, h, mode = 'cover') {
  const c = await resizeToCanvas(dataUrl, w, h, mode);
  return canvasToDDS(c);
}

export async function toPNG(dataUrl, w, h, mode = 'cover') {
  const c = await resizeToCanvas(dataUrl, w, h, mode);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
