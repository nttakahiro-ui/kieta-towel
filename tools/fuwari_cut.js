// ふわりの絵を切り分けて、背景を透明にした PNG を作る（10/25-6）
//   使い方: node tools/fuwari_cut.js 資料/絵/ふわりimage.png assets
//   切る位置（元の絵の x, y, 幅, 高さ）は、いちばん下の cut(...) の数字。大きな3コマだけを切る（番号・影・動きの線は自動で外れる）
const fs = require("fs"), zlib = require("zlib");
const [src, outDir] = process.argv.slice(2);
function decode(buf) {
  let p = 8, w, h, ct, bd, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), d = buf.slice(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; if (d[12]) throw "interlaced"; }
    if (type === "IDAT") idat.push(d);
    p += 12 + len;
  }
  if (bd !== 8) throw "bitdepth " + bd;
  const ch = { 2: 3, 6: 4, 0: 1, 4: 2 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch;
  const out = Buffer.alloc(w * h * 4), cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * ch;
      if (ch >= 3) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = ch === 4 ? cur[s + 3] : 255; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = ch === 2 ? cur[s + 1] : 255; }
    }
    cur.copy(prev);
  }
  return { w, h, px: out };
}
function crc(b) { let c, t = crc.t; if (!t) { t = crc.t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function encode(w, h, px) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
const img = decode(fs.readFileSync(src));
console.log("image", img.w, img.h);
// 紙の色（左上の角あたりの平均）
function at(x, y) { const o = (y * img.w + x) * 4; return [img.px[o], img.px[o + 1], img.px[o + 2]]; }
function cut(name, x0, y0, cw, chh, size) {
  const W = cw, H = chh, n = W * H, a = new Uint8Array(n).fill(255), rgb = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rgb.push(at(x0 + x, y0 + y));
  // 縁の平均を紙の色にする
  let pr = 0, pg = 0, pb = 0, k = 0;
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const c = rgb[y * W + x]; pr += c[0]; pg += c[1]; pb += c[2]; k++; }
  pr /= k; pg /= k; pb /= k;
  const dist = c => Math.max(Math.abs(c[0] - pr), Math.abs(c[1] - pg), Math.abs(c[2] - pb));
  // 縁から、紙に近い色だけを塗りつぶす（タオルの茶色い縁取りで止まる）
  const bg = new Uint8Array(n), st = [];
  for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
  while (st.length) { const i = st.pop(); if (bg[i]) continue; if (dist(rgb[i]) > 26) continue; bg[i] = 1; const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
  // 残った中で一番大きいかたまり（タオル）だけを残す。影や動きの線は消す
  const lab = new Int32Array(n), sizes = [0]; let L = 0;
  for (let s = 0; s < n; s++) { if (bg[s] || lab[s]) continue; L++; let cnt = 0; const q = [s]; lab[s] = L;
    while (q.length) { const i = q.pop(); cnt++; const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !bg[j] && !lab[j]) { lab[j] = L; q.push(j); } }
    sizes.push(cnt); }
  let best = 1; for (let l = 1; l <= L; l++) if (sizes[l] > sizes[best]) best = l;
  // 縁を少しやわらかく（背景に接する画素は半分）
  let minx = W, miny = H, maxx = 0, maxy = 0;
  for (let i = 0; i < n; i++) { if (lab[i] !== best) { a[i] = 0; continue; } const x = i % W, y = (i / W) | 0;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  for (let i = 0; i < n; i++) if (a[i]) { const x = i % W, y = (i / W) | 0; let e = 0;
    for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < n && !a[j]) e++; if (e) a[i] = 150; }
  // 正方形に入れる（中心をそろえる）
  const bw = maxx - minx + 1, bh = maxy - miny + 1, S = Math.max(bw, bh) + 8;
  const sq = Buffer.alloc(S * S * 4), ox = ((S - bw) >> 1) - minx, oy = ((S - bh) >> 1) - miny;
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) { const i = y * W + x; if (!a[i]) continue; const o = ((y + oy) * S + x + ox) * 4, c = rgb[i];
    sq[o] = c[0]; sq[o + 1] = c[1]; sq[o + 2] = c[2]; sq[o + 3] = a[i]; }
  // 縮める（面積平均）
  const T = size, out = Buffer.alloc(T * T * 4), r = S / T;
  for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) { let R = 0, G = 0, B = 0, A = 0, c = 0;
    for (let y = Math.floor(ty * r); y < Math.min(S, Math.floor((ty + 1) * r)); y++) for (let x = Math.floor(tx * r); x < Math.min(S, Math.floor((tx + 1) * r)); x++) {
      const o = (y * S + x) * 4, al = sq[o + 3]; R += sq[o] * al; G += sq[o + 1] * al; B += sq[o + 2] * al; A += al; c++; }
    const o = (ty * T + tx) * 4; if (A) { out[o] = R / A; out[o + 1] = G / A; out[o + 2] = B / A; } out[o + 3] = c ? A / c : 0; }
  fs.writeFileSync(outDir + "/" + name, encode(T, T, out));
  console.log(name, "box", x0 + minx, y0 + miny, bw, bh, "paper", pr | 0, pg | 0, pb | 0, "parts", L);
}
const S = 256;
cut("fuwari_1.png", 50, 100, 500, 490, S);
cut("fuwari_2.png", 590, 100, 510, 475, S);
cut("fuwari_3.png", 1150, 110, 510, 470, S);
