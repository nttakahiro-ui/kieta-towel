// ふりがな（ルビ）の表を作る（11/7-18）。検討版 versions/kento/ だけ
//   決まり: 小学4年生までに習う漢字（tools/kanji_g1-4.txt。学年別漢字配当表 2020年 の1〜4年 642字。KANJIDIC2〔EDRDG・CC BY-SA 4.0〕の grade 1〜4 から作った）だけの語にはつけない。
//          5年生以上と、表にない漢字をふくむ語に、語の単位でつける（送りがなにはつけない: 「晒し」なら「晒」の上に「さら」）
//   読み: 120語の kana を優先（文の中で、その語がちょうど1語として出てくるとき）。それ以外は kuromoji の辞書
//   出すもの: versions/kento/data/ruby.js（ゲームが読む表）と、docs/ふりがな一覧_1107.md（読みの確認用の一覧）
// 使い方: kuromoji を入れたフォルダで  NODE_PATH=<そのフォルダ>/node_modules node tools/ruby_build.mjs
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const K = path.join(ROOT, "versions/kento");
global.window = {};
for (const f of ["words.js", "stages.js", "texts.js"]) new Function("window", fs.readFileSync(path.join(K, "data", f), "utf8"))(global.window);
const WORDS = window.WORDS, STAGES = window.STAGES || [], TEXTS = window.TEXTS;
const EASY = new Set(Array.from(fs.readFileSync(path.join(ROOT, "tools/kanji_g1-4.txt"), "utf8").trim()));
const isKanji = c => /[㐀-鿿々〆ヶ]/.test(c);
const hard = s => Array.from(s).some(c => isKanji(c) && !EASY.has(c));
const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 語（surface）と読み（reading）を合わせて、漢字のかたまりごとの [位置, 長さ, 読み] にする。合わせられないときは語全体に1つ
function align(surface, reading) {
  const runs = surface.match(/[㐀-鿿々〆ヶ]+|[^㐀-鿿々〆ヶ]+/g) || [];
  const re = new RegExp("^" + runs.map(r => isKanji(r[0]) ? "(.+?)" : "(" + hira(r).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")").join("") + "$");
  const m = hira(reading).match(re);
  if (!m) return [[0, surface.length, hira(reading)]];
  const out = []; let pos = 0;
  runs.forEach((r, i) => { if (isKanji(r[0])) out.push([pos, r.length, m[i + 1]]); pos += r.length; });
  return out;
}

const tokenizer = await new Promise((ok, ng) => kuromoji.builder({ dicPath: path.join(path.dirname(require.resolve("kuromoji")), "../dict") }).build((e, t) => e ? ng(e) : ok(t)));
// 辞書がまちがえる・読めない語（手で入れた読み）。一覧では「手で入れた」と出る
const MANUAL = { "吸水速乾": "きゅうすいそっかん", "綿あめ": "わたあめ", "後染め": "あとぞめ", "強撚糸": "きょうねんし", "後晒し": "あとざらし", "日本独特": "にほんどくとく", "混打綿": "こんだめん", "混綿": "こんめん", "梳綿": "そめん" };
const byWord = [...WORDS.map(w => ({ word: w.word, kana: w.kana, src: "120語の kana" })), ...Object.entries(MANUAL).map(([word, kana]) => ({ word, kana, src: "手で入れた" }))]
  .sort((a, b) => b.word.length - a.word.length);

const rows = new Map();     // 一覧: surface|reading → { surface, reading, src, places:Set, dict }
const textTable = {};       // 文 → [[位置, 長さ, 読み], ...]
const dictVotes = {};       // surface → { readingKey: {n, spans} }
// 文を語に分けて、ルビをつける語の [位置, 長さ, 読み] を返す
function annotate(text, place) {
  if (!text || !Array.from(text).some(isKanji)) return [];
  const toks = tokenizer.tokenize(text);
  // kuromoji の語を、漢字だけの名詞（と接頭詞）のあとに、漢字で始まる名詞が続くところはまとめる（「検針」「機」→「検針機」、「短」「綿」→「短綿」）
  const units = [];
  for (const t of toks) {
    const s = t.surface_form, rd = t.reading && t.reading !== "*" ? t.reading : null;
    const prev = units[units.length - 1];
    const allK = /^[㐀-鿿々〆ヶ]+$/.test(s);
    if (prev && prev.allK && prev.noun && isKanji(s[0]) && t.pos === "名詞") { prev.s += s; prev.rd = prev.rd && rd ? prev.rd + rd : null; prev.allK = allK; continue; }
    units.push({ s, rd, allK, noun: t.pos === "名詞" || t.pos === "接頭詞", start: t.word_position - 1 });
  }
  const bounds = new Set(units.map(u => u.start)); bounds.add(text.length);
  const out = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    // 120語がちょうど語の切れ目に合って出てくるなら、その kana
    const w = byWord.find(w => text.startsWith(w.word, u.start) && bounds.has(u.start + w.word.length));
    let surface, reading, src, dictRd = null;
    if (w && Array.from(w.word).some(isKanji)) {
      surface = w.word; reading = w.kana; src = w.src;
      const end = u.start + w.word.length; let j = i, d = "";
      while (j < units.length && units[j].start < end) { d = units[j].rd && d !== null ? d + units[j].rd : null; j++; }
      dictRd = d ? hira(d) : null;
      i = j - 1;
    } else { surface = u.s; reading = u.rd; src = "辞書（kuromoji）"; }
    if (!hard(surface)) continue;
    if (!reading) { rows.set(surface + "|", { surface, reading: "（読みなし）", src: "読めなかった", places: new Set([place]) }); continue; }
    const spans = align(surface, reading);
    spans.forEach(([p, l, r]) => out.push([u.start + p, l, r]));
    const key = surface + "|" + hira(reading);
    if (!rows.has(key)) rows.set(key, { surface, reading: hira(reading), src, places: new Set(), dict: dictRd && dictRd !== hira(reading) ? dictRd : null });
    rows.get(key).places.add(place);
    const v = (dictVotes[surface] ||= {}); (v[hira(reading)] ||= { n: 0, spans }).n++;
  }
  if (out.length) textTable[text] = out;
  return out;
}

const plainWord = c => String(c).replace(/[（(][^）)]*[）)]/g, "").trim();
const known = new Set(WORDS.map(w => w.word));
const others = new Map();   // お題のはずれ（120語にない語）→ 出てくる場所。お題になるのは中ボス・大ボスだけ（ザコの選択肢は、クイズの選択肢としてだけ出る）
for (const w of WORDS) {
  const at = `ステージ${w.stage}「${w.word}」`;
  annotate(w.question, at + "の問題文");
  w.choices.forEach(c => annotate(c, at + "の選択肢"));
  annotate(w.memo, at + "の解説");
  if (w.bossQ) annotate(w.bossQ, at + "のお題の問い");
  if (w.odaiQuestion) annotate(w.odaiQuestion, at + "のお題の問い");
  const o = w.bossQ && w.bossMiss ? w.bossMiss : w.choices.length === 2 && plainWord(w.choices[0]) === w.word ? plainWord(w.choices[1]) : null;
  if (o && !known.has(o) && w.role !== "zako") others.set(o, (others.get(o) || []).concat(at + "のお題のはずれ"));
}
for (const s of STAGES) {
  for (const [k, a] of Object.entries(s.nextAsk || {})) for (const x of typeof a === "string" ? [a] : [a.prev, a.after]) if (x && !known.has(x)) others.set(x, (others.get(x) || []).concat(`ステージ${s.id}「${k}」の次は？`));
  for (const x of s.bossOrder || []) if (!known.has(x)) others.set(x, (others.get(x) || []).concat(`ステージ${s.id}の順に`));
}
const kanaOf = {};   // はずれのことば → 読み（ルビをつける語だけ）
for (const [o, places] of others) {
  let sp = []; for (const p of places) sp = annotate(o, p);
  // 読み ＝ 漢字のかたまりはルビの読み、そのほかの字はそのまま（カタカナはひらがなに）。一覧と同じ読みになる
  if (sp.length) { let r = "", i = 0; for (const [p, l, rd] of sp) { r += hira(o.slice(i, p)) + rd; i = p + l; } kanaOf[o] = r + hira(o.slice(i)); }
}
// 画面の文（texts.js の結果・お題・クイズ）と、quiz.js・cards.js に書いてある文
const walk = (o, p) => typeof o === "string" ? annotate(o, "画面の文 " + p) : o && typeof o === "object" && Object.entries(o).forEach(([k, v]) => walk(v, p + "." + k));
for (const k of ["results", "odaiForm", "quiz"]) walk(TEXTS[k], k);
for (const s of ["時間切れ！ 正解は", "正解は", "クイズで不正解。あとで受け直せる", "旅で助けられなかった。もう一度あそんで助けよう", "ベスト更新！", "ランク："]) annotate(s, "画面の文（quiz.js・cards.js）");
// 文の組み立てで使う語の表（120語の名前など。文の表にない文に使う）
for (const w of WORDS) if (hard(w.word)) { const v = (dictVotes[w.word] ||= {}); (v[hira(w.kana)] ||= { n: 0, spans: align(w.word, w.kana) }).n += 100; }
const dict = {}, conflicts = [];
for (const [s, v] of Object.entries(dictVotes)) {
  const best = Object.entries(v).sort((a, b) => b[1].n - a[1].n);
  dict[s] = best[0][1].spans;
  if (best.length > 1) conflicts.push(`${s}: ${best.map(([r, x]) => r).join(" / ")}`);
}

fs.writeFileSync(path.join(K, "data/ruby.js"),
  "// ふりがな（ルビ）の表。tools/ruby_build.mjs で作る（11/7-18）。手で直すときは docs/ふりがな一覧_1107.md も直す\n" +
  "//   text: 文 → [[位置, 文字数, 読み], ...]（漢字のかたまりごと）。dict: 語 → 同じ形（表にない文を組み立てたとき、語を探してつける）\n" +
  "//   kana: お題のはずれの語（120語にない語）の読み\n" +
  "window.RUBY = " + JSON.stringify({ text: textTable, dict, kana: kanaOf }) + ";\n");

const list = [...rows.values()].sort((a, b) => (a.src > b.src ? -1 : a.src < b.src ? 1 : 0) || a.surface.localeCompare(b.surface, "ja"));
const md = ["# ふりがな一覧（11/7-18。検討版）", "",
  "tools/ruby_build.mjs が自動でつけた読みの全一覧。読みのまちがいがあれば、この一覧の行を教えてください（直すときは tools/ruby_build.mjs の MANUAL に入れて、作り直す）。", "",
  "- 決まり: 小学4年生までに習う漢字だけの語にはつけない。5年生以上と、表にない漢字をふくむ語に、漢字の上だけにつける（送りがなにはつけない）",
  "- 読みの出どころ: 「120語の kana」= words.js の kana 欄（文の中でその語がちょうど1語として出るとき）。「辞書」= kuromoji（IPA辞書）。「手で入れた」= 辞書がまちがえた・読めなかった語（tools/ruby_build.mjs の MANUAL）",
  "- 「辞書の読み」の列: 120語の kana と辞書がちがった語（どちらが正しいか見てください）", "",
  `語の数: ${list.length}（120語の kana ${list.filter(r => r.src.startsWith("120")).length}、手で入れた ${list.filter(r => r.src === "手で入れた").length}、辞書 ${list.filter(r => r.src.startsWith("辞書")).length}、読めなかった ${list.filter(r => r.src === "読めなかった").length}）`, "",
  "| 語 | 読み | 出どころ | 辞書の読み | 出てくる場所 |", "|---|---|---|---|---|",
  ...list.map(r => `| ${r.surface} | ${r.reading} | ${r.src} | ${r.dict || ""} | ${[...r.places].slice(0, 6).join("、")}${r.places.size > 6 ? ` ほか${r.places.size - 6}か所` : ""} |`),
  "", "## 同じ語で読みが2つ以上になったもの", "", "文の表にない文（組み立てた文）では、多い方の読みを使う。", "",
  ...(conflicts.length ? conflicts.map(c => "- " + c) : ["- なし"]), ""];
fs.writeFileSync(path.join(ROOT, "docs/ふりがな一覧_1107.md"), md.join("\n"));
console.log("語", list.length, "文", Object.keys(textTable).length, "はずれ", Object.keys(kanaOf).length, "/", others.size, "読めない", list.filter(r => r.src === "読めなかった").map(r => r.surface).join(","), "\n2つの読み", conflicts.join(" ; "));
