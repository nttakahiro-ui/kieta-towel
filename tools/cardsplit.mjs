// カードの絵の切り分け（11/6-6）: 「10こ並びの1枚」（docs/カード絵/s01.png など）を白い余白で10こに分け、正方形にそろえて縮める
// 使い方: node tools/cardsplit.mjs <10こ並びの.png> <ステージ番号> <出す場所（例 versions/20261106/assets/cards）> [オプション]
//   --map 1=1,2=2,4=5,…   並びの何番目（左上から右へ、次の段へ。1〜10）を、何番（投入用CSVの「順」）として出すか。書かない番目は同じ番号
//   --only 10             この番目だけを出す（ほかの1枚から一部だけ取るとき）
//   --size 320            できあがりの1辺（px）。カードの絵の場所の2倍（Retina 用）
//   --dry                 書き出さずに、見つけたマスの位置と大きさだけを出す
//   --paper               すき間が白でなく紙の色（クリーム色など）のとき、白に加えて、左上の角の色もすき間の色とみなす（11/7-5 の s12）
//   --crop                ふぞろいなマスを、地の色で足すかわりに、まん中を正方形に切りぬく（絵がマスの端まで描いてあるとき。11/7-4 の s02）
// 出すファイル: s<ステージ2けた>_<順2けた>.png（例 s01_01.png）。マスの高さ・幅がふぞろいなときは、足りない分をそのマスの地の色（クリーム色）で足して正方形にする
// 切り分けの記録（versions/20261106/assets/cards）: s01 は --map 1=1,2=2,3=3,4=5,5=4,6=7,7=6,8=10,9=8,10=9。s02〜s05 は --crop。s12 は --paper。ほかは オプションなし
//   s11 の8・9は s11_0809.png から（--paper --only 8、--only 9。ほかの8枚は s11.png から。11/7-6・11/7-7）
//   できた PNG は、そのあと JPEG（画質70）にして置く（11/7-7。macOS の sips: sips -s format jpeg -s formatOptions 70 s01_01.png --out s01_01.jpg）
// 読めるのは 8bit の RGB / RGBA の PNG（インターレースなし）。ほかの道具は使わない（node だけ）
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { inflateSync, deflateSync } from "zlib";

const args = process.argv.slice(2);
const [src, stageS, outDir] = args;
if (!src || !stageS || !outDir) { console.log("使い方: node tools/cardsplit.mjs 10こ並び.png ステージ番号 出す場所 [--map 4=5,5=4] [--only 10] [--size 320] [--dry]"); process.exit(1); }
const opt = k => { const i = args.indexOf("--" + k); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true); };
const SIZE = +(opt("size") || 320), DRY = !!opt("dry"), CROP = !!opt("crop");
const MAP = {}; if (opt("map")) for (const p of String(opt("map")).split(",")) { const [a, b] = p.split("=").map(Number); MAP[a] = b; }
const ONLY = opt("only") ? String(opt("only")).split(",").map(Number) : null;
const stage = String(+stageS).padStart(2, "0");

// ---- PNG を読む ----
function readPng(path) {
  const b = readFileSync(path);
  let o = 8, w, h, ct, idat = [];
  while (o < b.length) {
    const n = b.readUInt32BE(o), t = b.toString("ascii", o + 4, o + 8), d = b.subarray(o + 8, o + 8 + n);
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0 || (ct !== 2 && ct !== 6)) throw new Error("8bit の RGB/RGBA（インターレースなし）だけ読めます"); }
    if (t === "IDAT") idat.push(d);
    o += 12 + n;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 3), stride = w * bpp;
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++], line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      line[x] = v & 255;
    }
    for (let x = 0; x < w; x++) { const s = x * bpp, al = bpp === 4 ? line[s + 3] / 255 : 1; for (let k = 0; k < 3; k++) px[(y * w + x) * 3 + k] = Math.round(line[s + k] * al + 255 * (1 - al)); }   // 透明なところは白
    prev = line;
  }
  return { w, h, px };
}
// ---- PNG を書く（RGB。行ごとに一番小さくなるフィルタをえらぶ） ----
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = buf => { let c = -1; for (const v of buf) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
function writePng(path, w, h, px) {
  const stride = w * 3, out = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const cur = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    let best = null, bs = Infinity;
    for (let f = 0; f < 5; f++) {
      const l = Buffer.alloc(stride); let s = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= 3 ? cur[x - 3] : 0, up = prev[x], c = x >= 3 ? prev[x - 3] : 0;
        let pr = 0; if (f === 1) pr = a; else if (f === 2) pr = up; else if (f === 3) pr = (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); pr = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
        const v = (cur[x] - pr) & 255; l[x] = v; s += v < 128 ? v : 256 - v;
      }
      if (s < bs) { bs = s; best = [f, l]; }
    }
    out[y * (stride + 1)] = best[0]; best[1].copy(out, y * (stride + 1) + 1);
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(out, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
}

// ---- 白い余白でマスに分ける ----
const { w: W, h: H, px } = readPng(src);
const PAPER = opt("paper") ? [px[0], px[1], px[2]] : null;
const white = i => px[i] > 238 && px[i + 1] > 238 && px[i + 2] > 238;
const isWhite = PAPER ? i => white(i) || (Math.abs(px[i] - PAPER[0]) <= 8 && Math.abs(px[i + 1] - PAPER[1]) <= 8 && Math.abs(px[i + 2] - PAPER[2]) <= 8) : white;   // （--paper のときは、白も紙の色も、すき間とみなす）
// 列・行ごとの「白でない点」の割合。2% 未満を余白とみなす
const colFill = new Float32Array(W), rowFill = new Float32Array(H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isWhite((y * W + x) * 3)) { colFill[x]++; rowFill[y]++; }
const runs = (fill, len, other) => { const r = []; let s = -1; for (let i = 0; i <= len; i++) { const on = i < len && fill[i] / other > 0.02; if (on && s < 0) s = i; if (!on && s >= 0) { if (i - s > len * 0.08) r.push([s, i]); s = -1; } } return r; };
const cols = runs(colFill, W, H), rows = [];
// 行は列ごとにちがうことがあるので、列ごとに分ける
const cells = [];
for (const [x0, x1] of cols) {
  const rf = new Float32Array(H);
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (!isWhite((y * W + x) * 3)) rf[y]++;
  const rr = runs(rf, H, x1 - x0);
  rows.push(rr.length);
  rr.forEach(([y0, y1], ri) => cells.push({ ri, x0, x1, y0, y1 }));
}
// 左上から右へ、次の段へ（行の番号、列の順）
cells.sort((a, b) => a.ri - b.ri || a.x0 - b.x0);
console.log(`${src}: ${W}×${H}、列 ${cols.length}・段 ${rows.join("/")}、マス ${cells.length}`);
if (cells.length !== 10) { console.log("10こに分けられませんでした。止めます"); process.exit(1); }

// マスの地の色（クリーム色）: マスの内側、ふちから少し入ったところの色の中央値
function bgOf(c) {
  const s = []; const m = Math.round(Math.min(c.x1 - c.x0, c.y1 - c.y0) * 0.04);
  for (let t = 0; t < 40; t++) for (const [x, y] of [[c.x0 + m + t * 2, c.y0 + m], [c.x1 - m - t * 2, c.y1 - m], [c.x0 + m, c.y0 + m + t * 2], [c.x1 - m, c.y1 - m - t * 2]]) { const i = (y * W + x) * 3; s.push([px[i], px[i + 1], px[i + 2]]); }
  return [0, 1, 2].map(k => s.map(v => v[k]).sort((a, b) => a - b)[s.length >> 1]);
}
// 足す色は、10マスの地の色の中央値（絵がふちまである空色のマスなどでも、クリーム色で足す）
const BGS = cells.map(bgOf), CREAM = [0, 1, 2].map(k => BGS.map(v => v[k]).sort((a, b) => a - b)[5]);
if (!DRY) mkdirSync(outDir, { recursive: true });
cells.forEach((c, i) => {
  const pos = i + 1, no = MAP[pos] || pos;
  if (ONLY && !ONLY.includes(pos)) return;
  if (CROP) { const d = (c.x1 - c.x0) - (c.y1 - c.y0); if (d > 0) { c.x0 += Math.floor(d / 2); c.x1 = c.x0 + (c.y1 - c.y0); } else if (d < 0) { c.y0 += Math.floor(-d / 2); c.y1 = c.y0 + (c.x1 - c.x0); } }   // まん中を正方形に
  const cw = c.x1 - c.x0, ch = c.y1 - c.y0, side = Math.max(cw, ch), bg = CREAM;
  const ox = Math.floor((side - cw) / 2), oy = Math.floor((side - ch) / 2);
  // 正方形（side）を SIZE に縮める（面積の平均）
  const out = Buffer.alloc(SIZE * SIZE * 3), k = side / SIZE;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const sx0 = x * k, sx1 = (x + 1) * k, sy0 = y * k, sy1 = (y + 1) * k; const acc = [0, 0, 0]; let wsum = 0;
    for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++) for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
      const wgt = (Math.min(xx + 1, sx1) - Math.max(xx, sx0)) * (Math.min(yy + 1, sy1) - Math.max(yy, sy0));
      const lx = xx - ox, ly = yy - oy;
      const v = lx >= 0 && lx < cw && ly >= 0 && ly < ch ? [px[((c.y0 + ly) * W + c.x0 + lx) * 3], px[((c.y0 + ly) * W + c.x0 + lx) * 3 + 1], px[((c.y0 + ly) * W + c.x0 + lx) * 3 + 2]] : bg;
      for (let q = 0; q < 3; q++) acc[q] += v[q] * wgt; wsum += wgt;
    }
    for (let q = 0; q < 3; q++) out[(y * SIZE + x) * 3 + q] = Math.round(acc[q] / wsum);
  }
  const name = `s${stage}_${String(no).padStart(2, "0")}.png`;
  console.log(`  ${pos}番目 → ${name}  マス ${cw}×${ch}（左上 ${c.x0},${c.y0}）→ 正方形 ${side} → ${SIZE}×${SIZE}  足した地の色 rgb(${bg.join(",")})`);
  if (!DRY) writePng(`${outDir}/${name}`, SIZE, SIZE, out);
});
