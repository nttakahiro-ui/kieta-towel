// 全曲を順に鳴らし（消音の Chrome の中だけ）、曲ごとの平均の大きさ・いちばん大きい値・同時に鳴った音の数・鳴らせなかった音の数を出す（11/3-6）
// 使い方: node songvol.mjs [秒数（1曲あたり。ふだん 12）] [曲の名前 ...]。TEMPO=1.1 で山場の回の速さ
import { execFileSync } from "child_process";
const dir = (await import("url")).fileURLToPath(new URL(".", import.meta.url));   // 日本語のフォルダ名でも動くように
const sec = Number(process.argv[2] || 12), only = process.argv.slice(3);
const expr = `
const sl = ms => new Promise(r => setTimeout(r, ms));
for (let i=0;i<100 && !(window.Sound && typeof SONGS !== "undefined");i++) await sl(200);
const AC = window.AudioContext || window.webkitAudioContext, og = AC.prototype.createGain; let first = null, an = null;
AC.prototype.createGain = function () { const g = og.call(this); if (!first) { first = g; an = this.createAnalyser(); an.fftSize = 2048; g.connect(an); } return g; };
Sound.unlock(); Sound.setMuted(false);
const names = ${JSON.stringify(only)}.length ? ${JSON.stringify(only)} : Object.keys(SONGS);
const buf = new Float32Array(2048), out = {};
for (const n of names) {
  Sound.play(n, ${Number(process.env.TEMPO || 1)}); await sl(1500);
  const d0 = JSON.stringify(Sound.dropped); let rms = 0, pk = 0, k = 0, v = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < ${sec} * 1000) { await sl(50); an.getFloatTimeDomainData(buf); let ss = 0; for (const x of buf) { ss += x * x; pk = Math.max(pk, Math.abs(x)); } rms += Math.sqrt(ss / buf.length); k++; v = Math.max(v, Sound.voices); }
  out[n] = { rms: +(rms / k).toFixed(4), peak: +pk.toFixed(3), voices: v, dropped: d0 + " -> " + JSON.stringify(Sound.dropped) };
  Sound.stop(); await sl(300);
}
return out;`;
execFileSync("node", [dir + "run.mjs", "RELOAD"]);
const res = execFileSync("node", [dir + "run.mjs", expr]).toString();
const o = JSON.parse(res);
for (const [n, r] of Object.entries(o)) console.log(n.padEnd(10, "　"), "大きさ", r.rms, "ピーク", r.peak, "同時", r.voices, "鳴らせなかった", r.dropped);
