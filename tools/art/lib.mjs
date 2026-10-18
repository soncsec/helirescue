// Small pixel-art toolkit for Claude-made sprites (ARCHITECTURE.md H6).
// Uses only Node's built-in modules: zlib for PNG compression.
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** A paletted pixel grid. Index 0 is transparent. */
export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x];
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  rect(x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }

  /** Filled ellipse; `keep(x, y)` limits which pixels are painted. */
  ellipse(cx, cy, rx, ry, c, keep = () => true) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1 && keep(x, y)) this.set(x, y, c);
      }
    }
  }

  /** Filled polygon (even-odd rule, sampled at pixel centres). */
  poly(points, c, keep = () => true) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = 0; x < this.w; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i];
          const [xj, yj] = points[j];
          if (
            yi > y + 0.5 !== yj > y + 0.5 &&
            x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi
          )
            inside = !inside;
        }
        if (inside && keep(x, y)) this.set(x, y, c);
      }
    }
  }

  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  /** Recolour pixels for which `test(x, y, c)` is true. */
  map(fn) {
    const out = this.clone();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) out.set(x, y, fn(x, y, this.get(x, y)));
    return out;
  }

  /** Adds a 1-pixel outline of colour `c` around every painted shape (4-neighbour). */
  outline(c) {
    return this.map((x, y, v) => {
      if (v) return v;
      const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
      return n.some((p) => p && p !== c) ? c : 0;
    });
  }

  flipX() {
    return this.map((x, y) => this.get(this.w - 1 - x, y));
  }

  clone() {
    const g = new Grid(this.w, this.h);
    g.px.set(this.px);
    return g;
  }

  /** Copies another grid on top (index 0 stays transparent). */
  stamp(g, ox, oy) {
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const v = g.get(x, y);
        if (v) this.set(ox + x, oy + y, v);
      }
  }

  /** Paints a text grid: each character is a key in `keyMap`, '.' is transparent. */
  text(rows, ox, oy, keyMap) {
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '.' && ch !== ' ') this.set(ox + x, oy + y, keyMap[ch]);
      }),
    );
  }
}

/** Puts frames side by side in one sprite sheet. */
export function sheet(frames) {
  const out = new Grid(frames[0].w * frames.length, frames[0].h);
  frames.forEach((f, i) => out.stamp(f, i * f.w, 0));
  return out;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes a grid as an RGBA PNG. `palette` is a list of '#rrggbb' strings (index 0 unused). */
export function toPng(grid, palette, scale = 1) {
  const w = grid.w * scale;
  const h = grid.h * scale;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const v = grid.get(Math.floor(x / scale), Math.floor(y / scale));
      const o = y * (w * 4 + 1) + 1 + x * 4;
      if (!v) continue;
      const hex = palette[v];
      raw[o] = parseInt(hex.slice(1, 3), 16);
      raw[o + 1] = parseInt(hex.slice(3, 5), 16);
      raw[o + 2] = parseInt(hex.slice(5, 7), 16);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** An RGBA image, for cropping and recolouring existing PNGs. */
export class Rgba {
  constructor(w, h, data = new Uint8Array(w * h * 4)) {
    this.w = w;
    this.h = h;
    this.data = data;
  }

  pixel(x, y) {
    const o = (y * this.w + x) * 4;
    return [...this.data.subarray(o, o + 4)];
  }

  setPixel(x, y, rgba) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data.set(rgba, (y * this.w + x) * 4);
  }

  crop(x, y, w, h) {
    const out = new Rgba(w, h);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) out.setPixel(i, j, this.pixel(x + i, y + j));
    return out;
  }

  /** Replaces colours: `fn([r,g,b,a])` returns a new [r,g,b,a]. */
  recolour(fn) {
    const out = new Rgba(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) out.setPixel(x, y, fn(this.pixel(x, y)));
    return out;
  }

  /** Copies another image on top (fully transparent pixels are skipped). */
  stamp(img, ox, oy) {
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        const p = img.pixel(x, y);
        if (p[3]) this.setPixel(ox + x, oy + y, p);
      }
  }

  toPng(scale = 1) {
    const w = this.w * scale;
    const h = this.h * scale;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        raw.set(
          this.pixel(Math.floor(x / scale), Math.floor(y / scale)),
          y * (w * 4 + 1) + 1 + x * 4,
        );
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }

  save(path, scale = 1) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, this.toPng(scale));
    console.log(`${path} (${this.w * scale}x${this.h * scale})`);
  }
}

/** Reads an 8-bit, non-interlaced RGB, RGBA or paletted PNG. Rejects anything else. */
export function readPng(path) {
  const buf = readFileSync(path);
  if (!buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    throw new Error(`${path}: not a PNG`);
  let pos = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  let plte = null;
  let trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const t = buf.toString('ascii', pos + 4, pos + 8);
    const d = buf.subarray(pos + 8, pos + 8 + len);
    if (t === 'IHDR') {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      type = d[9];
      if (d[8] !== 8 || d[12] !== 0 || ![2, 3, 6].includes(type))
        throw new Error(`${path}: unsupported PNG format`);
      if (w > 4096 || h > 4096) throw new Error(`${path}: image too large`);
    } else if (t === 'PLTE') plte = d;
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    pos += 12 + len;
  }
  const bpp = { 2: 3, 3: 1, 6: 4 }[type];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let p;
      if (f === 0) p = 0;
      else if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else {
        const e = a + b - c;
        const pa = Math.abs(e - a);
        const pb = Math.abs(e - b);
        const pc = Math.abs(e - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = (v + p) & 0xff;
    }
  }
  const img = new Rgba(w, h);
  for (let i = 0; i < w * h; i++) {
    let rgba;
    if (type === 6) rgba = px.subarray(i * 4, i * 4 + 4);
    else if (type === 2) rgba = [px[i * 3], px[i * 3 + 1], px[i * 3 + 2], 255];
    else {
      const k = px[i];
      rgba = [
        plte[k * 3],
        plte[k * 3 + 1],
        plte[k * 3 + 2],
        trns && k < trns.length ? trns[k] : 255,
      ];
    }
    img.data.set(rgba, i * 4);
  }
  return img;
}

export function save(path, grid, palette, scale = 1) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, toPng(grid, palette, scale));
  console.log(`${path} (${grid.w * scale}x${grid.h * scale})`);
}
