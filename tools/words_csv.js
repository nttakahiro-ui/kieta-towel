// data/words.js と docs/words.csv を行き来させる道具（10/3-13）
//   書き出し: node tools/words_csv.js export   … data/words.js → docs/words.csv（表計算で開ける。UTF-8・BOMつき）
//   戻す:     node tools/words_csv.js import   … docs/words.csv → data/words.js（先頭の説明コメントはそのまま残す）
// CSV の列（1行目）は words.js の欄の名前。ちがうのは次の3つだけ
//   choice1〜choice3 … choices の1つ目〜3つ目（2つしかないときは choice3 を空に）
//   answerNo        … 正解が何番目か（1 ＝ choice1、2 ＝ choice2、3 ＝ choice3）。words.js の answer は 0 から数えるので、1 ずれる
//   kanaParts       … 1文字ずつの読みを、半角スペースで区切って書く（例: せん い ちょう）。中ボス・大ボスだけ
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const JS = path.join(ROOT, "data/words.js"), CSV = path.join(ROOT, "docs/words.csv");
const COLS = ["id", "stage", "word", "kana", "role", "question", "choice1", "choice2", "choice3", "answerNo", "memo",
  "odaiQuestion", "sayCorrect", "sayWrong", "order", "pattern", "lane", "hp", "kanaParts"];
// words.js の1行の欄の順番（今のファイルと同じ順で書き戻す）
const KEYS = ["id", "stage", "word", "kana", "question", "choices", "answer", "memo", "role", "hp", "sayCorrect", "sayWrong",
  "order", "pattern", "lane", "kanaParts", "odaiQuestion"];

function loadWords() {
  const sb = { window: {} };
  new Function("window", fs.readFileSync(JS, "utf8"))(sb.window);
  return sb.window.WORDS;
}
const q = v => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function exportCsv() {
  const rows = [COLS.join(",")];
  for (const w of loadWords()) {
    const r = { ...w, choice1: w.choices[0], choice2: w.choices[1], choice3: w.choices[2] ?? "", answerNo: w.answer + 1,
      kanaParts: w.kanaParts ? w.kanaParts.join(" ") : "" };
    rows.push(COLS.map(c => q(r[c])).join(","));
  }
  fs.writeFileSync(CSV, "﻿" + rows.join("\r\n") + "\r\n");
  console.log(`docs/words.csv に ${rows.length - 1} 語を書き出しました`);
}

function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ""));
}

function serialize(w) {
  const val = v => Array.isArray(v) ? "[" + v.map(x => JSON.stringify(x)).join(", ") + "]" : JSON.stringify(v);
  return "{" + KEYS.filter(k => w[k] !== undefined).map(k => JSON.stringify(k) + ": " + val(w[k])).join(", ") + "}";
}

function importCsv() {
  const [head, ...rows] = parseCsv(fs.readFileSync(CSV, "utf8"));
  const missing = COLS.filter(c => !head.includes(c));
  if (missing.length) throw new Error("CSV の1行目に、次の列がありません: " + missing.join(", "));
  const num = (v, name, id) => { const n = Number(v); if (v === "" || Number.isNaN(n)) throw new Error(`id ${id} の ${name} が数ではありません: "${v}"`); return n; };
  const words = rows.map(r => {
    const c = Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""]));
    const id = num(c.id, "id", c.id);
    const choices = [c.choice1, c.choice2, c.choice3].filter(x => x !== "");
    const answer = num(c.answerNo, "answerNo", id) - 1;
    if (choices.length < 2) throw new Error(`id ${id}（${c.word}）の選択肢が2つより少ないです`);
    if (answer < 0 || answer >= choices.length) throw new Error(`id ${id}（${c.word}）の answerNo が選択肢の数に合いません`);
    const w = { id, stage: num(c.stage, "stage", id), word: c.word, kana: c.kana, question: c.question, choices, answer, memo: c.memo,
      role: c.role, hp: num(c.hp, "hp", id), sayCorrect: c.sayCorrect, sayWrong: c.sayWrong, order: num(c.order, "order", id),
      pattern: c.pattern, lane: num(c.lane, "lane", id), odaiQuestion: c.odaiQuestion };
    if (!["zako", "mid", "boss"].includes(w.role)) throw new Error(`id ${id}（${c.word}）の role は zako / mid / boss のどれかにします`);
    if (w.role !== "zako") w.kanaParts = c.kanaParts.trim() ? c.kanaParts.trim().split(/\s+/) : [];
    return w;
  });
  if (words.length !== 120) console.log(`注意: 語句の数が ${words.length} です（ふつうは120）`);
  const src = fs.readFileSync(JS, "utf8");
  const head2 = src.slice(0, src.indexOf("window.WORDS = ["));
  const out = ["window.WORDS = ["];
  let stage = null;
  for (const w of words) {
    if (w.stage !== stage) { stage = w.stage; out.push(`  // ---- ステージ${stage} ----`); }
    out.push("  " + serialize(w) + ",");
  }
  out.push("];");
  fs.writeFileSync(JS, head2 + out.join("\n") + (src.endsWith("\n") ? "\n" : ""));
  console.log(`data/words.js に ${words.length} 語を戻しました`);
}

const mode = process.argv[2];
if (mode === "export") exportCsv();
else if (mode === "import") importCsv();
else console.log("使い方: node tools/words_csv.js export（words.js → CSV）／ import（CSV → words.js）");
