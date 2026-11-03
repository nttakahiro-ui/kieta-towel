// 曲ごとに「1小節の中で、音が出はじめない時間」のいちばん長いもの（拍）を出す（11/3-7）。js/audio.js の SONGS を読むだけ（ブラウザも音もいらない）
// 使い方: node tools/gap.mjs [曲の名前 ...]。打楽器・ベースも含めて、どのパートの音も出はじめないマスが続く長さを数える（1マス ＝ 半拍）
import { readFileSync } from "fs";
const src = readFileSync(new URL("../js/audio.js", import.meta.url), "utf8");
const SONGS = new Function(src.slice(src.indexOf("const SONGS"), src.indexOf("const SCENE")) + "; return SONGS;")();
const only = process.argv.slice(2), sp = s => s ? s.trim().split(/\s+/) : null;
for (const [name, song] of Object.entries(SONGS)) {
  if (only.length && !only.includes(name)) continue;
  const bars = sp(song.chords).length, steps = bars * 8, I = song.inst || {};
  const parts = [sp(song.melody), sp(song.fill), I.chord && sp(song.chord), I.arp && sp(song.arp), I.bass && sp(song.bass), ...Object.values(song.drums || {}).map(sp)].filter(Boolean);
  const on = s => parts.some(p => { const d = p[(p.length === 8 ? s % 8 : s) % p.length]; return d !== "-" && d !== "."; });
  let worst = 0;
  for (let b = 0; b < bars; b++) { let run = 0; for (let k = 0; k < 8; k++) { run = on(b * 8 + k) ? 1 : run + 1; worst = Math.max(worst, run); } }
  console.log(name.padEnd(8, "　"), "テンポ", song.bpm, "いちばん長いすき間", worst / 2, "拍");
}
