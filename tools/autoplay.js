// 小4らしい自動プレイヤーで、バトルを画面なしで何回も遊ぶ（10/31-9 に scratch から tools/ へ。使い方: node tools/autoplay.js ステージ番号 回数）
const P = process.env.ROOT || (require("path").resolve(__dirname, "..") + "/");
const fs = require("fs"), vm = require("vm");
const STAGE = parseInt(process.argv[2] || "1"), RUNS = parseInt(process.argv[3] || "100");
// 腕前: 反応(秒)、ねらいのずれ(px)、指の速さ(px/秒)、よける確率、記憶の光を使う確率(1秒あたり)
const SKILLS = {
  にがて: { react: 0.9, aim: 70, speed: 200, dodge: 0.05, bomb: 0.1, know: 0.5, look: 130, hint: 0.25, quit: 0.15 },
  ふつう: { react: 0.5, aim: 30, speed: 380, dodge: 0.35, bomb: 0.4, know: 0.7, look: 190, hint: 0.45, quit: 0.03 },
  とくい: { react: 0.25, aim: 10, speed: 700, dodge: 0.8, bomb: 1, know: 0.9, look: 250, hint: 0.75, quit: 0 },
};
const HUDLOG = { rows: [], lastK: -1 };
function runOnce(skill, seed) { HUDLOG.rows.push(["--", skill]); HUDLOG.lastK = -1;
  let now = 0, rafCb = null;
  // 毎回ちがう乱数
  let x = seed * 9301 + 49297; const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const M = Object.create(Math); M.random = rnd;
  const ctxStub = new Proxy({}, { get: (t, k) => k === "measureText" ? (s => ({ width: [...s].length * 26 })) : ((k === "createLinearGradient" || k === "createRadialGradient") ? () => ({ addColorStop() {} }) : (typeof t[k] !== "undefined" ? t[k] : () => {})), set: (t, k, v) => (t[k] = v, true) });
  const canvas = { getBoundingClientRect: () => ({ width: 375, height: 700, left: 0, top: 0 }), getContext: () => ctxStub, addEventListener(n, f) { this["on" + n] = f; }, setPointerCapture() {} };
  const se = {};
  const sb = { window: { devicePixelRatio: 2, addEventListener() {} }, document: { getElementById: () => canvas }, performance: { now: () => now },
    requestAnimationFrame: cb => (rafCb = cb, 1), cancelAnimationFrame() {}, Image: class {}, Math: M, console, setTimeout: () => 0,
    Sound: { speak() {}, fadeTo() {}, play() {}, se: n => { se[n] = (se[n] || 0) + 1; } } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(P + "data/words.js", "utf8"), sb);
  vm.runInContext(fs.readFileSync(P + "data/stages.js", "utf8"), sb);
  vm.runInContext(fs.readFileSync(P + "data/texts.js", "utf8"), sb);
  let src = fs.readFileSync(P + "js/game.js", "utf8");
  src = src.replace(/return \{ start, stop, resize, pause.*/, "return { start, stop, resize, pause, peek: () => ({ extraButtons, player, enemies, ebullets, fillers, gauge, state, phase, bombButton, odai, sortieNo, choiceRects, loadout, obs, guide, fsay, fogLevel, explore, bino, reacted, t, tut, rest }) };");
  // ザコの語句の殻がほどけた高さ（画面の高さに対する割合）と、そのときのパワーの段階（10/25-8）
  src = src.replace("function absorb(e) {", "function absorb(e) { if (e.role === 'zako' && !e.ground) if (e.pattern !== 'odai') ABSY.push([e.y / H, POWER_LEVELS.indexOf(level), e.pattern]);");
  // わざとのスローを数える（SLOWLOG=1。救出の旅と大ボスのあいだだけ。10/31-14）
  if (process.env.SLOWLOG) {
    const R = (tag, v) => `(phase !== "round1" && SLOWREC(${JSON.stringify(tag)}, ${v}))`;
    src = src.replace("slow = BATTLE.slowTime;", R("助けた瞬間", "BATTLE.slowTime") + "; slow = BATTLE.slowTime;")
      .split("slow = Math.max(slow, BATTLE.hintSlow)").join("slow = Math.max(slow, " + R("初めての案内", "BATTLE.hintSlow") + " || BATTLE.hintSlow)")
      .replace("slow = Math.max(slow, BATTLE.guideSlow);", R("木・柱の案内", "BATTLE.guideSlow") + "; slow = Math.max(slow, BATTLE.guideSlow);")
      .split("slow = odai.intro;").join(R("お題を読む", "odai.intro") + "; slow = odai.intro;")
      .replace("odai.step = 0; odai.show = 1.8;", "odai.step = 0; odai.show = 1.8; " + R("順のまちがい", "1.8") + ";")
      .split("banner = {").join("banner = " + R("出来事などの帯", "0") + " || {")
      .replace("if (slow > 0) { slow -= realDt;", "if (slow > 0) { if (phase !== \"round1\") SLOWREC(\"ゆっくりの秒数\", realDt); slow -= realDt;");
  }
  sb.SLOWREC = (tag, v) => { const c = SLOW_ALL[curSkill] = SLOW_ALL[curSkill] || {}; c[tag] = c[tag] || [0, 0]; if (tag !== "ゆっくりの秒数") c[tag][0]++; c[tag][1] += v; return false; };
  sb.HUDLOG = HUDLOG;
  sb.ABSY = ABSY_ALL[curSkill] = ABSY_ALL[curSkill] || [];
  vm.runInContext(src + ";this.Battle=Battle;", sb);
  vm.runInContext("BATTLE.odai = " + (process.env.ODAI === "0" ? "false" : "true") + ";", sb);
  if (process.env.SET) vm.runInContext(process.env.SET, sb);   // 例: SET="BATTLE.roundInterval2=3.2"
  const words = sb.window.WORDS.filter(w => w.stage === STAGE);
  let ended = null, stats = null;
  sb.Battle.start(words, { stage: sb.window.STAGES.find(s => s.id === STAGE), stageName: "x", fuwariCount: 0, hints: process.env.TUT ? { seen: {}, mark() {}, all: true } : null, skills: process.env.SKILL ? ["clear", process.env.SKILL] : null, skill: process.env.SKILL || null, onEnd: (ids, st) => { ended = ids; stats = st; } });
  const pe = (px, py, id) => ({ pointerId: id || 1, clientX: px, clientY: py, preventDefault() {} });
  let orderKnow = false;   // 大ボス「3つを順に」で、正しい順を知っているか
  // 地上のことば（世界2から）は、空中と同じく真上（左右）に合わせるだけ（10/31-12 決定 B。前は◎を合わせるように上下にも動いた）
  let fx = 187, fy = 520, dragging = false, targetX = 187, nextThink = 0, bombWait = 0;
  let seenGuide = false, curOdai = null, odaiPick = null, tried = new Set();
  // 1回目の旅（双眼鏡）: 見えるのは円の中と、きらっと光ったときだけ。気づいた語句を追いかけて見つめる。なければジグザグに見回す
  const B = vm.runInContext("BATTLE", sb);
  let bossSec = null;
  let extraAsked = 0; let exTarget = null, exWay = 0, exNoticed = new Set(), exQuitT = 0, foundN = null, exploreSec = null, baseN = null;
  const WAYS = [[110, 160], [300, 160], [300, 300], [110, 300], [110, 440], [300, 440], [300, 300], [110, 300]];
  for (let i = 0; i < 60 * 600 && !ended; i++) {
    now += 1000 / 60;
    const S = sb.Battle.peek();
    if (S.player && !dragging) { canvas.onpointerdown(pe(fx, fy)); dragging = true; }
    if (S.state === "sortie") {   // 出撃の画面はタップで出撃。出撃2では持っていくものをランダムにえらぶ（表紙もタップ。そのあと指をつけ直す）
      dragging = false; fx = 187; fy = 520;
      if (S.sortieNo === 2) { const rs = S.choiceRects(); const r = rs[Math.floor(rnd() * rs.length)]; canvas.onpointerdown(pe(r.x + r.w / 2, r.y + r.h / 2)); }
      else canvas.onpointerdown(pe(fx, fy));
    }
    if (S.state === "extraAsk") {   // 延長戦をするか（10/25-19）: EXTRA=go なら「行く」、ふだんは「クイズへ」（前と数字をくらべやすいように）
      const b = S.extraButtons().find(q => q.id === (process.env.EXTRA === "go" ? "go" : "quiz"));
      canvas.onpointerdown(pe(b.x + b.w / 2, b.y + b.h / 2, 9)); extraAsked = (extraAsked || 0) + 1;
    }
    if (S.tut) { dragging = false; if (rnd() < 0.05) canvas.onpointerdown(pe(fx, fy, 7)); }   // チュートリアルの案内は、少し読んでから閉じる（そのあと指をつけ直す）
    if (S.explore && baseN === null && S.explore.t >= B.exploreTime) baseN = S.reacted;   // 基準の時間までに見つけた数（10/25-17）
    if (S.phase !== "round1" && foundN === null && S.explore) { foundN = S.reacted; exploreSec = S.t; if (baseN === null) baseN = S.reacted; }
    if (S.phase === "boss" && bossSec === null) bossSec = S.t;
    if (process.env.ODAILOG && S.odai && S.odai !== globalThis.__lastOdai) { globalThis.__lastOdai = S.odai; console.log("ODAI", S.odai.real.word, "→", S.odai.q); }
    if (S.player && S.state === "play" && S.phase === "round1" && S.explore && S.explore.queue) {
      // 世界2の箱（10/31-10 試作）: 箱はぜんぶ見えている。近い箱へ指を動かして押さえる（空箱かどうかはわからない）。鍵の箱に一度はじかれたら、鍵が見つかるまでさわらない
      const ex = S.explore;
      if (now / 1000 >= nextThink) {
        nextThink = now / 1000 + skill.react * (0.7 + rnd() * 0.6);
        const alive = ex.boxes.filter(b => !b.open && !b.out && b.x > 40 && b.x < 365 && !(b.lock && !ex.keyFound && exNoticed.has(b)));
        if (exTarget && !alive.includes(exTarget)) exTarget = null;
        if (exTarget && exTarget.hold > 0 && rnd() < skill.quit) { exTarget = null; exQuitT = now / 1000 + 1; }   // にがて: 開ききる前に指をはなす
        if (!exTarget && now / 1000 >= exQuitT) exTarget = alive.sort((a, q) => Math.hypot(a.x - fx, a.y - fy) - Math.hypot(q.x - fx, q.y - fy))[0] || null;
      }
      if (exTarget && exTarget.lock && !ex.keyFound && exTarget.warnT > 0) { exNoticed.add(exTarget); exTarget = null; }
      const tx = exTarget ? exTarget.x + (exTarget.speedHint || 0) : 187, ty = exTarget ? exTarget.y : 420;
      const L = Math.hypot(tx - fx, ty - fy), st = Math.min(L, skill.speed / 60);
      if (L > 0.5) { fx += (tx - fx) / L * st; fy += (ty - fy) / L * st; }
      canvas.onpointermove(pe(fx, fy));
    } else if (S.player && S.state === "play" && S.phase === "round1") {
      const ex = S.explore, b = S.bino, A = 375 * B.binoA, Bb = 375 * B.binoB, d0 = 0;
      const inB = (x, y) => ((x - b.x) / A) ** 2 + ((y - b.y) / Bb) ** 2 < 1;
      if (ex && now / 1000 >= nextThink) {
        nextThink = now / 1000 + skill.react * (0.7 + rnd() * 0.6);
        const alive = ex.list.filter(d => !d.found && d.age < (d.life || B.exploreLife) - 0.3 && (d.vis === undefined || d.vis > 0.5));   // 出直す前（見えない）は数えない（10/25-7）
        for (const d of alive) {
          if (inB(d.x, d.y)) exNoticed.add(d);
          else if (d.flies) { if (rnd() < skill.hint * 0.5) exNoticed.add(d); }   // ホタルの集まりに気づく（ひとりで飛ぶホタルにまどわされるぶん、少し低め）
          else if ((d.hintT % B.hintEvery) < 0.4 + skill.react && rnd() < skill.hint * B.hintAlpha) exNoticed.add(d);
        }
        if (exTarget && (!alive.includes(exTarget))) exTarget = null;
        if (exTarget && exTarget.look > 0 && rnd() < skill.quit) { exNoticed.delete(exTarget); exTarget = null; exQuitT = now / 1000 + 1; }   // にがて: 見つめきる前に目をはなす
        if (!exTarget && now / 1000 >= exQuitT) {
          const c = alive.filter(d => exNoticed.has(d)).sort((a, q) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
          exTarget = c[0] || null;
        }
      }
      let tx, ty;
      if (exTarget) { tx = exTarget.x + d0 * (exTarget.x > b.x ? -1 : 1) * 0.6; ty = exTarget.y; }
      else { const w = WAYS[exWay % WAYS.length]; tx = w[0]; ty = w[1]; if (Math.hypot(tx - b.x, ty - b.y) < 20) exWay++; }
      const L = Math.hypot(tx - b.x, ty - b.y), st = Math.min(L, skill.speed / 60);
      if (L > 0.5) { fx += (tx - b.x) / L * st / 1.15; fy += (ty - b.y) / L * st / 1.15; }
      canvas.onpointermove(pe(fx, fy));
    } else if (S.player && S.state === "play") {
      const p = S.player;
      // 考える（反応のおそさ）: いちばん下にいる語句をねらう。いなければ雑魚
      if (now / 1000 >= nextThink) {
        nextThink = now / 1000 + skill.react * (0.7 + rnd() * 0.6);
        const fogY = S.fogLevel > 0.5 ? 700 * 0.12 : -20;   // 霧（うすい）: 縁取りは見えるが、霧の奥のほうは気づくのが少しおそい
        let ws = S.enemies.filter(e => e.y > fogY && e.x > -40 && e.x < 415).sort((a, b) => b.y - a.y);
        // 隠れている地上のことば（10/31-13）: ほかに見えていることばがあれば、そちらを先に。なければ、その下で顔を出すのを待つ
        const hid = e => (e.gplay === "hide" || e.gplay === "both") && e.hideT % (B.hideOut + B.hideIn) >= B.hideOut;
        if (ws.length > 1 && hid(ws[0])) ws = [...ws.filter(e => !hid(e)), ...ws.filter(hid)];
        // お題: 本物をわかる確率（know）でえらぶ。「ちがうよ」が出たら、まだ試していないものからえらびなおす
        const cands = S.enemies.filter(e => e.pattern === "odai" && e.hp > 0);
        if (S.odai && S.odai.mode === "order" && cands.length) {   // 大ボス「3つを順に」（10/31-10 試作）: 順を知っている確率（know）で正しいことば。まちがえて正しい順を見たあとは、正しい順に
          if (S.odai !== curOdai) { curOdai = S.odai; orderKnow = rnd() < skill.know; odaiPick = null; }
          if (S.odai.show > 0) orderKnow = true;
          const next = cands.find(e => !e.num && e.seqNo === S.odai.step), left = cands.filter(e => !e.num);
          if (orderKnow) odaiPick = next;
          else if (!odaiPick || odaiPick.num || !cands.includes(odaiPick)) odaiPick = left[Math.floor(rnd() * left.length)];
          ws = [odaiPick];
        } else if (S.odai && cands.length) {
          if (S.odai !== curOdai) { curOdai = S.odai; tried = new Set(); odaiPick = null; }
          if (odaiPick && odaiPick.dummy && odaiPick.penaltyAt > 0) { tried.add(odaiPick); odaiPick = null; }
          if (!odaiPick || !cands.includes(odaiPick)) {
            const left = cands.filter(e => !tried.has(e));
            const real = left.find(e => !e.dummy);
            const p = tried.size === 0 ? skill.know : 1 / Math.max(1, left.length);
            odaiPick = real && rnd() < p ? real : (left.filter(e => e.dummy)[Math.floor(rnd() * left.filter(e => e.dummy).length)] || real);
          }
          ws = [odaiPick];
        }
        const tgt = ws[0] || S.fillers.filter(f => f.y > 0).sort((a, b) => b.y - a.y)[0];
        targetX = tgt ? tgt.x + (rnd() - 0.5) * 2 * skill.aim : 187 + (rnd() - 0.5) * 120;
        // 近くの弾に気づいたら、ときどきよける
        const near = S.ebullets.find(b => b.y < p.y && p.y - b.y < 140 && Math.abs(b.x - p.x) < 40);
        if (near && rnd() < skill.dodge) {
          let dir = near.x < p.x ? 1 : -1;
          if (p.x + dir * 70 < 30 || p.x + dir * 70 > 345) dir = -dir;   // 壁のほうへはよけない
          targetX = p.x + dir * 70;
        }
        targetX = Math.max(30, Math.min(345, targetX));
      }
      // 木をよける: 前から来る木が自機の横の位置にかかっていたら、木の外へ
      for (const o of (S.obs || [])) {
        if (o.y + o.r > p.y - skill.look && o.y - o.r < p.y + 24 && Math.abs(o.x - p.x) < o.r + 24) {
          const cands = [o.x - o.r - 28, o.x + o.r + 28].filter(x => x >= 30 && x <= 345 && !(S.obs || []).some(q => Math.abs(q.x - x) < q.r + 20 && q.y + q.r > p.y - skill.look && q.y - q.r < p.y + 24));
          if (cands.length) targetX = cands.sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x))[0];
        }
      }
      // 指を動かす（指の速さには限りがある）
      const dx = Math.max(-skill.speed / 60, Math.min(skill.speed / 60, targetX - p.x));
      fx += dx / 1.15;
      canvas.onpointermove(pe(fx, fy));
      // 記憶の光: たまったら、ときどき思い出して押す
      if (S.gauge >= 100) {
        bombWait += 1 / 60;
        if (rnd() < skill.bomb / 60) { const b = S.bombButton(); canvas.onpointerdown(pe(b.x, b.y, 2)); bombWait = 0; }
      }
    }
    const cb = rafCb; rafCb = null; cb && cb(now);
    if (i % 30 === 0) for (const e of sb.Battle.peek().enemies || []) if (e.role === "zako") PAT[e.word.id] = e.ground ? "ground" + (e.gplay ? "-" + e.gplay : "") : e.pattern;   // 語句の動きの型（取り逃がしを型ごとに数える。10/25-8）。地上のことばは ground（隠れる・動くは -hide など。10/31-13）
    if (process.env.GUIDELOG) { const G = sb.Battle.peek(); if (G.guide && !seenGuide) { seenGuide = true; console.log("GUIDE", G.phase, G.guide.kind, G.guide.dir || "", "ふわり:", G.fsay && G.fsay.text, "木:", Math.round(G.guide.tree.x), Math.round(G.guide.tree.y), "自機:", Math.round(G.player.x)); } }
    if (process.env.OBSLOG && i % 300 === 0) { const S3 = sb.Battle.peek(); if (S3.obs && S3.obs.length) console.log("OBSLOG", S3.phase, Math.round(now/1000), S3.obs.map(o => Math.round(o.x) + "," + Math.round(o.y) + " r" + Math.round(o.r)).join(" | "), "木のかげ:", S3.enemies.filter(e => e.pattern === "treeshade").map(e => e.word.word + "@" + Math.round(e.y)).join(",")); }
    if (process.env.DBG && i === 60 * 400) { const S2 = sb.Battle.peek(); console.log("止まっている:", S2.state, S2.phase, "odai", !!S2.odai, S2.odai && S2.odai.intro, "敵", S2.enemies.map(e => e.word.word + (e.dummy ? "(ダミー)" : "") + "@" + Math.round(e.x) + "," + Math.round(e.y) + " hp" + e.hp).join(" "), "自機", Math.round(S2.player.x), Math.round(S2.player.y), "体力", S2.player.hp); }
  }
  return { ids: ended || [], stats, words, foundN, baseN, exploreSec, bossSec, loadout: sb.Battle.peek().loadout, odaiMiss: (stats && stats.missed || []).filter(id => words.find(w => w.id === id && w.role !== "zako")).length };
}
const ABSY_ALL = {}, PAT = {}, SLOW_ALL = {}; let curSkill = "";
const out = {};
for (const [name, sk] of Object.entries(SKILLS).filter(([n]) => !process.env.ONLY || n === process.env.ONLY)) {
  const n = Math.round(RUNS / 3);
  const rs = []; curSkill = name;
  for (let k = 0; k < n; k++) rs.push(runOnce(sk, STAGE * 1000 + k * 7 + name.length));
  out[name] = rs;
}
const words = Object.values(out)[0][0].words;
const ranks = [[40000, "博士"], [30000, "名人"], [20000, "職人"], [0, "見習い"]];
const rk = s => ranks.find(r => s >= r[0])[1];
console.log(`=== ステージ${STAGE} ===`);
for (const [name, rs] of Object.entries(out)) {
  const ok = rs.filter(r => r.stats);
  const avg = f => (ok.reduce((a, r) => a + f(r), 0) / ok.length);
  const rc = {}; ok.forEach(r => { const k = rk(r.stats.score); rc[k] = (rc[k] || 0) + 1; });
  const lc = {}; ok.forEach(r => lc[r.loadout] = (lc[r.loadout] || 0) + 1);
  console.log(`${name}(${rs.length}回): 持ちもの${JSON.stringify(lc)} 中ボス取り逃がし${avg(r => r.odaiMiss).toFixed(2)} 時間${avg(r => r.stats.time).toFixed(0)}秒 回収${avg(r => r.ids.length).toFixed(1)}語 被弾${avg(r => r.stats.hits).toFixed(1)} 失った機体${avg(r => r.stats.downs).toFixed(2)} 本番やり直し${avg(r => r.stats.gameOvers).toFixed(2)}回(${ok.filter(r => r.stats.gameOvers > 0).length}/${ok.length}回で発生) 点${avg(r => r.stats.score).toFixed(0)} 光${avg(r => r.stats.bombsUsed).toFixed(1)} 10語${ok.filter(r => r.ids.length >= 10).length} 無事${ok.filter(r => r.stats.downs === 0).length} 無傷${ok.filter(r => r.stats.hits === 0).length} ランク${JSON.stringify(rc)} 終わらない${rs.length - ok.length} 見つけた${avg(r => r.foundN || 0).toFixed(1)}語 基準内${avg(r => r.baseN || 0).toFixed(1)}語 発見${avg(r => r.exploreSec || 0).toFixed(0)}秒 救出${avg(r => (r.bossSec || r.stats.time) - (r.exploreSec || 0)).toFixed(0)}秒 さいご${avg(r => r.bossSec ? r.stats.time - r.bossSec : 0).toFixed(0)}秒`);
}
// 殻がほどけた高さ（10/25-8）: 平均、上3分の1で消えた割合。パワー★1（段階0）と★2以上（段階1〜）に分けて
for (const [name, a] of Object.entries(ABSY_ALL)) {
  const st = xs => xs.length ? `平均${(100 * xs.reduce((q, v) => q + v[0], 0) / xs.length).toFixed(0)}% 上1/3 ${(100 * xs.filter(v => v[0] < 1 / 3).length / xs.length).toFixed(0)}%（${xs.length}語）` : "なし";
  const b = a.filter(v => v[2] !== "cross");   // 横切る語句は、いつも画面の上（crossY）を通るので別に数える
  const tp = {}; for (const v of a) { tp[v[2]] = tp[v[2]] || [0, 0]; tp[v[2]][0]++; if (v[0] < 1 / 3) tp[v[2]][1]++; }
  console.log(`  上1/3で消えた数（型ごと） ${name}: ` + Object.entries(tp).map(([k, v]) => `${k} ${v[1]}/${v[0]}`).join(" "));
  console.log(`殻がほどけた高さ ${name}: 横切る以外 ${st(b)} ／ ★1 ${st(b.filter(v => v[1] === 0))} ／ ★2以上 ${st(b.filter(v => v[1] > 0))} ／ 横切る ${st(a.filter(v => v[2] === "cross"))}`);
}
// 語句ごとの取り逃がし率（全腕前）
const all = Object.values(out).flat().filter(r => r.stats);
const miss = {};
for (const r of all) for (const id of r.stats.missed) miss[id] = (miss[id] || 0) + 1;
{ const byP = {}; for (const w of words) if (PAT[w.id]) { const k = PAT[w.id]; byP[k] = byP[k] || [0, 0]; byP[k][0] += all.length; byP[k][1] += miss[w.id] || 0; }
  console.log("ザコの取り逃がし（動きの型ごと）: " + Object.entries(byP).map(([k, v]) => `${k} ${Math.round(100 * v[1] / v[0])}%`).join(" ")); }
if (process.env.SLOWLOG) for (const [name, c] of Object.entries(SLOW_ALL)) { const n = out[name].length; console.log(`わざとのスロー ${name}（1回あたり）: ` + Object.entries(c).map(([k, v]) => k === "ゆっくりの秒数" ? `${k} ${(v[1] / n).toFixed(1)}秒` : `${k} ${(v[0] / n).toFixed(1)}回`).join(" ／ ")); }
console.log("取り逃がし率: " + words.filter(w => w.role !== "boss").map(w => `${w.word}${Math.round(100 * (miss[w.id] || 0) / all.length)}%`).join(" "));
