// クイズの自動プレイヤー（11/7-4）: 1問ごとに「答えるまでの時間」を、子どもの読む速さから出す。制限時間（25秒）をこえる問題がないかを見る
// 使い方: [RUNS=回数（ふだん 10）] node tools/quizplay.mjs <版のフォルダ（例 versions/20261106）> <ステージ番号…>
//   例: node tools/quizplay.mjs versions/20261106 1 5 9
// 答えるまでの時間 ＝ 見る時間 ＋ 問題文と選択肢を読む時間（文字数 ÷ 読む速さ）＋ 考える時間（ばらつき）
//   腕前は3つ（autoplay.js と同じく、うまい・ふつう・ゆっくり）。読む速さは、小学生の音読・黙読の速さ（1分に 150〜400字ほど）の中から置いた仮の値
//   受け直しクイズは、出題の前にカードを3秒見せる（その3秒はバーが出ないので、ここでは数えない）
import { readFileSync } from "fs";
const [dir, ...rest] = process.argv.slice(2);
if (!dir || !rest.length) { console.log("使い方: [RUNS=回数] node tools/quizplay.mjs 版のフォルダ ステージ番号…"); process.exit(1); }
const nums = rest.map(Number), RUNS = +(process.env.RUNS || 10);
const window = {}; new Function("window", readFileSync(dir + "/data/words.js", "utf8"))(window);
const quizSrc = readFileSync(dir + "/js/quiz.js", "utf8");
const LIMIT = +(quizSrc.match(/timeLimit:\s*([\d.]+)/) || [0, 25])[1];
const SKILLS = {
  うまい:   { look: 0.6, cps: 6.5, think: 0.8 },   // 1秒に 6.5字（1分 390字）
  ふつう:   { look: 1.0, cps: 4.5, think: 1.5 },   // 1分 270字
  ゆっくり: { look: 1.5, cps: 2.5, think: 3.0 },   // 1分 150字（読むのがゆっくりな子）
};
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const thinkT = m => -Math.log(1 - rnd() * 0.999) * m;   // 考える時間: 平均 m 秒、ときどき長い（指数分布）
for (const st of nums) {
  const ws = window.WORDS.filter(w => w.stage === st);
  console.log(`=== ステージ${st}（${ws.length}問、制限時間 ${LIMIT}秒、各腕前 ${RUNS}回）`);
  for (const [name, sk] of Object.entries(SKILLS)) {
    const ts = [];
    for (let r = 0; r < RUNS; r++) for (const w of ws) {
      const chars = Array.from(w.question).length + w.choices.reduce((a, c) => a + Array.from(c).length, 0);
      ts.push(sk.look + chars / sk.cps + thinkT(sk.think));
    }
    const avg = ts.reduce((a, b) => a + b, 0) / ts.length, max = Math.max(...ts), over = ts.filter(t => t > LIMIT).length;
    const p95 = ts.slice().sort((a, b) => a - b)[Math.floor(ts.length * 0.95)];
    console.log(`  ${name}: 1問 平均 ${avg.toFixed(1)}秒 ・ 95% ${p95.toFixed(1)}秒 ・ いちばん長い ${max.toFixed(1)}秒 ・ ${LIMIT}秒をこえた ${over}/${ts.length}問`);
  }
}
