// ゲームのアイコン6こ（docs/カード絵/icons.png。2列×3段）を切り分けて、クリーム色の背景を透明にした PNG を作る（11/7-22）
//   使い方: node tools/icon_cut.js docs/カード絵/icons.png versions/kento/assets   （icons.png は world23 の docs にある）
//   マスは白い余白で区切られている（自動で見つける）。紙の色はマスの縁の平均。縁からつながった明るいところだけをうすくし、輪郭で囲まれた中（カードの白など）はそのまま
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
const OUT = 384;   // 出す大きさ（px、正方形）。扉では画面幅の3分の1（約125px）× 3倍の画面でも足りる
const NAMES = ["icon_binoculars.png", "icon_shot.png", "icon_bomb.png", "icon_orbs.png", "icon_quiz.png", "icon_gem.png"];
const D0 = 13, D1 = 58;   // 紙の色からの距離: D0 より近い ＝ 透明、D1 より遠い ＝ 不透明（縁からつながったところだけ）。間はうすく
const px = (x, y) => { const o = (y * img.w + x) * 4; return [img.px[o], img.px[o + 1], img.px[o + 2]]; };
// 白い余白（ほぼ真っ白な列・行）を探して、マスの範囲を出す
function spans(len, white) { const r = []; let st = -1; for (let i = 0; i < len; i++) { if (!white(i)) { if (st < 0) st = i; } else if (st >= 0) { if (i - st > 50) r.push([st, i - 1]); st = -1; } } if (st >= 0 && len - st > 50) r.push([st, len - 1]); return r; }
const isW = c => Math.min(c[0], c[1], c[2]) >= 250;
const colW = x => { let s = 0; for (let y = 0; y < img.h; y++) s += isW(px(x, y)); return s / img.h > 0.97; };
const rowW = y => { let s = 0; for (let x = 0; x < img.w; x++) s += isW(px(x, y)); return s / img.w > 0.97; };
const cols = spans(img.w, colW), rows = spans(img.h, rowW);
console.log("cells", JSON.stringify(cols), JSON.stringify(rows));
let k = 0;
for (const [y0, y1] of rows) for (const [x0, x1] of cols) cut(NAMES[k++], x0 + 6, y0 + 6, x1 - x0 - 11, y1 - y0 - 11);
function cut(name, x0, y0, W, H) {
  const n = W * H, rgb = new Float32Array(n * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = px(x0 + x, y0 + y), i = (y * W + x) * 3; rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2]; }
  // 紙の色: マスの縁（幅6px）の平均
  let P = [0, 0, 0], m = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6) { const i = (y * W + x) * 3; P[0] += rgb[i]; P[1] += rgb[i + 1]; P[2] += rgb[i + 2]; m++; }
  P = P.map(v => v / m);
  const dist = i => Math.hypot(rgb[i * 3] - P[0], rgb[i * 3 + 1] - P[1], rgb[i * 3 + 2] - P[2]);
  // 縁から、紙に近い色（D1 未満）だけを塗りつぶす。輪郭（濃い線）で止まる
  const bg = new Uint8Array(n), st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) { const i = st.pop(); if (bg[i] || dist(i) >= D1) continue; bg[i] = 1; const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
  // 透明度: 塗りつぶしたところは距離でうすく、それ以外は不透明。色は紙の色を取りのぞく（白いふちが残らないように）
  const out = Buffer.alloc(n * 4);
  let minx = W, miny = H, maxx = 0, maxy = 0;
  for (let i = 0; i < n; i++) {
    let a = bg[i] ? Math.max(0, Math.min(1, (dist(i) - D0) / (D1 - D0))) : 1;
    a = a * a * (3 - 2 * a);   // なめらかに
    const o = i * 4;
    if (a > 0.003) for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round((rgb[i * 3 + c] - (1 - a) * P[c]) / a)));
    out[o + 3] = Math.round(a * 255);
    if (a > 0.06) { const x = i % W, y = (i / W) | 0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  // 正方形に入れて（中心をそろえる）、縮める（面積平均。色は透明度で重みをつける）
  const bw = maxx - minx + 1, bh = maxy - miny + 1, S = Math.max(bw, bh) + 12, T = OUT, r = S / T, ox = minx - ((S - bw) >> 1), oy = miny - ((S - bh) >> 1);
  const res = Buffer.alloc(T * T * 4);
  for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) { let R = 0, G = 0, B = 0, A = 0, c = 0;
    for (let y = Math.floor(ty * r); y < Math.floor((ty + 1) * r); y++) for (let x = Math.floor(tx * r); x < Math.floor((tx + 1) * r); x++) {
      c++; const sx = x + ox, sy = y + oy; if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const o = (sy * W + sx) * 4, al = out[o + 3]; R += out[o] * al; G += out[o + 1] * al; B += out[o + 2] * al; A += al; }
    const o = (ty * T + tx) * 4; if (A) { res[o] = R / A; res[o + 1] = G / A; res[o + 2] = B / A; } res[o + 3] = c ? A / c : 0; }
  fs.writeFileSync(outDir + "/" + name, encode(T, T, res));
  console.log(name, "box", x0 + minx, y0 + miny, bw, bh, "paper", P.map(v => v | 0).join(","));
}
