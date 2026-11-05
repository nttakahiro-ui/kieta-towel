// 120語の入れ替え（11/5-2）: 投入用CSV から、ある版の data/words.js と data/stages.js（nextAsk・bossOrder）を作り直す
// 使い方: node tools/csv2words.mjs <投入用.csv> <版のフォルダ（例 versions/20261106）>
// CSV の列: 世界,ステージ,ステージ名,順,役,語,かな,1文字読み（ボスの漢字）,問題,答え,はずれ,メモ,前の工程（中ボス）,後の工程（中ボス）,3つを順に（大ボス）,難易度,旧語
//   役 ＝ ザコ／中ボス／大ボス。順 ＝ 出る順（大ボスは10）。選択肢は [答え, はずれ]（正解は1つ目。画面ではならびをまぜる）
//   お題の問い（odaiQuestion）は空にして、問題文をそのまま使う。1文字読み「空:くう|洞:どう」から kanaParts（漢字はCSVの読み、かなはその文字のまま）
//   世界2: 中ボスの「前の工程」「後の工程」→ nextAsk、大ボスの「3つを順に」（→ でつなぐ）→ bossOrder
//   ステージ1（patterns: "data"）だけ、出方（pattern・lane）をここで決める。ほかのステージは出方を自動で決めるので使わない
import { readFileSync, writeFileSync } from "fs";
const [src, dir] = process.argv.slice(2);
if (!src || !dir) { console.log("使い方: node tools/csv2words.mjs 投入用.csv 版のフォルダ"); process.exit(1); }

// CSV を読む（" でかこんだ欄の中の , と改行に対応）
function parseCsv(t) {
  t = t.replace(/^﻿/, "");
  const rows = []; let r = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { r.push(f); f = ""; }
    else if (c === "\n") { r.push(f.replace(/\r$/, "")); rows.push(r); r = []; f = ""; }
    else f += c;
  }
  if (f || r.length) { r.push(f.replace(/\r$/, "")); rows.push(r); }
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).filter(x => x.some(v => v.trim())).map(x => Object.fromEntries(head.map((h, i) => [h, (x[i] || "").trim()])));
}
const rows = parseCsv(readFileSync(src, "utf8"));
const col = (r, name) => { const k = Object.keys(r).find(h => h.startsWith(name)); return k ? r[k] : ""; };
const ROLE = { "ザコ": "zako", "中ボス": "mid", "大ボス": "boss" };
const isKanji = ch => /[㐀-鿿々]/.test(ch);
const errs = [];

// ステージ1の出方: ザコに順に当てる（短いことば＝2文字以下は、端・横切りにしても js/game.js でふつうにもどるので、長いことばに端・横切りを当てる）
const S1_ZAKO = { "綿": ["normal", 0.3], "コットン": ["edge", 1], "綿花": ["normal", 0.7], "種": ["normal", 0.25], "静電気": ["cross", 0], "吸水": ["behind", 0.6], "洗濯": ["normal", 0.55] };

const words = rows.map(r => {
  const stage = +col(r, "ステージ"), order = +col(r, "順"), role = ROLE[col(r, "役")], word = col(r, "語");
  if (!stage || !order || !role || !word) errs.push(`欄が足りない: ${JSON.stringify(r)}`);
  let kanaParts = [];
  if (role !== "zako") {
    const list = col(r, "1文字読み").split("|").filter(Boolean).map(p => p.split(":"));
    let k = 0;
    kanaParts = Array.from(word).map(ch => {
      const hit = list[k] && list[k][0] === ch ? list[k++][1] : null;
      if (isKanji(ch) && !hit) errs.push(`1文字読みがない: ${word} の ${ch}`);
      return hit || ch;
    });
    if (k < list.length) errs.push(`1文字読みが語と合わない: ${word} ${col(r, "1文字読み")}`);
    if (!list.length) kanaParts = [];   // かなだけの語は、その文字のまま読む
  }
  const ans = col(r, "答え"), miss = col(r, "はずれ");
  if (!ans || !miss) errs.push(`答えかはずれがない: ${word}`);
  const [pattern, lane] = stage === 1 && role === "zako" ? (S1_ZAKO[word] || ["normal", 0.5]) : ["normal", 0.5];
  return {
    id: (stage - 1) * 10 + order, stage, word, kana: col(r, "かな"), question: col(r, "問題"), choices: [ans, miss], answer: 0, memo: col(r, "メモ"),
    role, hp: role === "zako" ? 1 : role === "mid" ? 3 : 12, sayCorrect: "", sayWrong: "", order, pattern, lane, odaiQuestion: "", kanaParts,
  };
}).sort((a, b) => a.id - b.id);

// 調べる: 120語、ステージごとに10語・役の数（ザコ7・中ボス2・大ボス1）、大ボスは順10、順の重なりなし
if (words.length !== 120) errs.push(`語の数が ${words.length}`);
for (let s = 1; s <= 12; s++) {
  const ws = words.filter(w => w.stage === s), n = k => ws.filter(w => w.role === k).length;
  if (ws.length !== 10 || n("zako") !== 7 || n("mid") !== 2 || n("boss") !== 1) errs.push(`ステージ${s}: ${ws.length}語 ザコ${n("zako")} 中ボス${n("mid")} 大ボス${n("boss")}`);
  if (new Set(ws.map(w => w.order)).size !== 10) errs.push(`ステージ${s}: 順が重なっている`);
  const b = ws.find(w => w.role === "boss"); if (b && b.order !== 10) errs.push(`ステージ${s}: 大ボスが順${b.order}`);
}

// 世界2の nextAsk・bossOrder
const nextAsk = {}, bossOrder = {};
rows.forEach(r => {
  const s = +col(r, "ステージ"), w = col(r, "語"), prev = col(r, "前の工程"), after = col(r, "後の工程"), ord = col(r, "3つを順に");
  const has = x => words.some(v => v.stage === s && v.word === x);
  if (prev || after) {
    (nextAsk[s] = nextAsk[s] || {})[w] = { prev, after };
    [prev, after].forEach(x => { if (x && !has(x)) errs.push(`ステージ${s} ${w}: 工程「${x}」が同じステージの語にない`); });
  }
  if (ord) {
    const toks = ord.split(/→|->/).map(x => x.trim());
    if (toks.length !== 3 || !toks.includes(w)) errs.push(`ステージ${s}: 3つを順にが3つでないか、大ボスの語がない: ${ord}`);
    toks.forEach(x => { if (!has(x)) errs.push(`ステージ${s}: 3つを順にの「${x}」が同じステージの語にない`); });
    bossOrder[s] = toks;
  }
});
if (errs.length) { console.log("止めました:\n" + errs.join("\n")); process.exit(1); }

// data/words.js: 説明の行はそのまま、元の行と120語を入れ替える
const wpath = dir + "/data/words.js", wsrc = readFileSync(wpath, "utf8");
const head = wsrc.slice(0, wsrc.indexOf("window.WORDS = [")).replace(/^\/\/ 120語のデータ.*$/m, `// 120語のデータ（1ステージ10語 × 12ステージ）。元: docs/${src.split("/").pop()}（11/5 に tools/csv2words.mjs で入れ替え。前の120語は残していない）`);
const line = w => "  " + JSON.stringify(w).replace(/^\{/, "{").replace(/,"/g, ', "').replace(/":/g, '": ') + ",";
let out = head + "window.WORDS = [\n";
for (let s = 1; s <= 12; s++) out += `  // ---- ステージ${s} ----\n` + words.filter(w => w.stage === s).map(line).join("\n") + "\n";
writeFileSync(wpath, out + "];\n");

// data/stages.js: 世界2の4ステージの nextAsk と bossOrder を書きかえる（ない行には explore のあとに足す）
const spath = dir + "/data/stages.js";
let lines = readFileSync(spath, "utf8").split("\n");
const js = v => "{ " + Object.entries(v).map(([w, a]) => `${w}: { prev: "${a.prev}", after: "${a.after}" }`).join(", ") + " }";
for (let s = 5; s <= 8; s++) {
  const i = lines.findIndex(l => new RegExp(`^\\s*\\{ id: ${s},\\s+world: 2,`).test(l));
  if (i < 0) { console.log(`stages.js にステージ${s}の行がない`); process.exit(1); }
  // 前の nextAsk（かっこが入れ子）と bossOrder を消す
  const drop = (l, key) => {
    const a = l.indexOf(` ${key}: `); if (a < 0) return l;
    let j = a + key.length + 3, depth = 0;
    do { if ("{[".includes(l[j])) depth++; else if ("}]".includes(l[j])) depth--; j++; } while (depth > 0 && j < l.length);
    return l.slice(0, a) + l.slice(j + 1);   // うしろの「,」まで
  };
  let l = drop(drop(lines[i], "nextAsk"), "bossOrder");
  const add = (nextAsk[s] ? `nextAsk: ${js(nextAsk[s])}, ` : "") + (bossOrder[s] ? `bossOrder: ${JSON.stringify(bossOrder[s]).replace(/","/g, '", "')}, ` : "");
  l = l.replace(/(explore: \{[^}]*\}, )/, `$1${add}`);
  lines[i] = l;
}
writeFileSync(spath, lines.join("\n"));
console.log("ok", words.length, "語", JSON.stringify(nextAsk), JSON.stringify(bossOrder));
