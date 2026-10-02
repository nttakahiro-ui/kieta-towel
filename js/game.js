// バトル（縦スクロールのシューティング）
// 敵は語句の文字。倒すと糸のようにほどけて、自機のほうへ吸い込まれる

// ===== 調整用の数値（速さ・弾の量・硬さなど）はここにまとめる =====
const BATTLE = {
  spawnInterval: 10,           // 敵が出てくる間隔（秒）
  emptyWait: 6,                // 画面に敵がいないときは、この秒数より長く待たない
  firstSpawnDelay: 2.2,        // 始まってから最初の敵が出るまで（秒）
  maxOnScreen: 3,              // 同時に出ている敵の最大数（大ボスは別）
  fallTime: { zako: 12, mid: 15 },  // 画面の上から下まで降りる秒数（大きいほどゆっくり）
  bossStopY: 0.22,             // 大ボスが止まる高さ（画面の高さに対する割合）
  bossEnterTime: 3,            // 大ボスが止まる位置まで降りてくる秒数
  sway: 16,                    // ザコ・中ボスの左右の振れ幅（px）
  swaySpeed: 0.9,              // 左右に振れる速さ
  bossSway: 0.28,              // 大ボスの左右の動き（画面の幅に対する割合）
  fontSize: { zako: 26, mid: 30, boss: 36 },   // 敵の文字の大きさ（px）。24以上
  enemyFireInterval: { zako: 3.4, mid: 2.4, boss: 1.4 },  // 敵が弾を撃つ間隔（秒）
  enemyBulletSpeed: 140,       // 敵の弾の速さ（px/秒）
  shotInterval: 0.16,          // 自機の弾の間隔（秒）
  shotSpeed: 640,              // 自機の弾の速さ（px/秒）
  playerMaxHp: 100,            // 体力
  damage: 20,                  // 敵の弾に当たったときに減る体力
  healOnAbsorb: 12,            // 吸い込んだときに回復する体力
  invincibleTime: 1.3,         // 当たったあと、しばらく無敵になる秒数
  respawnDelay: 3,             // 下へ抜けた語句が、また上から出てくるまでの秒数
  reviveDelay: 3,              // 体力ゼロのあと、再開するまでの秒数
  wordShowTime: 0.6,           // 吸い込んだ語句を画面中央に大きく出す秒数
};

// ===== 敵の弾の絵（ここだけ書き換えれば、弾の見た目が変わる） =====
// image に画像のパスを入れると、その画像で描く（例: "img/seed.png"）
const ENEMY_BULLET_ART = {
  radius: 8,
  image: null,
  // 仮の絵: 綿のたね（白いふわふわに、茶色のたね）
  draw(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 2);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#c9b99a";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#8a6a45";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.35, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// 敵の文字の色（役割ごと）
const ENEMY_COLOR = { zako: "#5f8a3c", mid: "#b2733d", boss: "#c4577a" };
// ふわりの強さ。集めたカードの総数で、色と弾の数が変わる（cards 枚以上でその段階）
const FUWARI_LEVELS = [
  { cards: 0,  body: "#fffdf7", line: "#c9d9b4", shots: 1, rate: 1 },
  { cards: 10, body: "#eef8df", line: "#8fbf5e", shots: 2, rate: 1 },
  { cards: 20, body: "#fff4cf", line: "#dcb64e", shots: 3, rate: 1 },
  { cards: 30, body: "#fde6ee", line: "#e08aa6", shots: 3, rate: 0.8 },   // rate: 弾の間隔の倍率（小さいほど速い）
];
function fuwariLevel(count) {
  let lv = FUWARI_LEVELS[0];
  for (const l of FUWARI_LEVELS) if (count >= l.cards) lv = l;
  return lv;
}

const FONT_FAMILY = '"Hiragino Maru Gothic ProN","Hiragino Maru Gothic Pro","Zen Maru Gothic","Rounded Mplus 1c",sans-serif';

const Battle = (() => {
  let canvas, ctx, dpr = 1, W = 0, H = 0;
  let running = false, rafId = 0, lastTs = 0;
  let opts = null;

  // ゲームの状態
  let t = 0;                 // 経過時間（秒）
  let state = "play";        // "intro" / "play" / "down" / "clear"
  let stateTimer = 0;
  let player, shots, enemies, ebullets, threads, fluff;
  let queue, waiting, absorbed, bossWord, bossSpawned;
  let spawnTimer, shotTimer;
  let showWord = null;       // 画面中央に出している語句
  let drag = null;
  let paused = false;        // アプリが裏に回ったときなど
  let moved = false;         // 一度でもドラッグしたか（操作のヒント用）
  let banner = null;         // 「大ボス あらわる！」などの帯
  let shake = 0;             // 画面のゆれ（被弾したとき）
  let level = FUWARI_LEVELS[0];

  function font(size) { return `bold ${size}px ${FONT_FAMILY}`; }
  const hasKanji = s => /[一-龯々]/.test(s);

  // 画面の大きさに合わせる
  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (player) {
      player.x = Math.min(Math.max(player.x, 24), W - 24);
      player.y = Math.min(Math.max(player.y, 80), H - 40);
    }
  }

  // ===== 操作: 指一本のドラッグ（指の動いたぶんだけ自機が動く） =====
  function onDown(e) {
    e.preventDefault();
    if (paused) { resume(); return; }
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: player.x, py: player.y };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    moved = true;
    player.x = Math.min(Math.max(drag.px + (e.clientX - drag.sx) * 1.15, 24), W - 24);
    player.y = Math.min(Math.max(drag.py + (e.clientY - drag.sy) * 1.15, 80), H - 40);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; }

  // ===== 始める =====
  // words: このステージの10語、o: { stageName, fuwariCount, onEnd(吸い込んだ順のid配列) }
  function start(words, o) {
    opts = Object.assign({}, o, { words, total: words.length });
    canvas = document.getElementById("battle-canvas");
    ctx = canvas.getContext("2d");
    resize();
    if (!canvas._bound) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      window.addEventListener("resize", resize);
      canvas._bound = true;
    }
    t = 0;
    absorbed = [];
    bossWord = words.find(w => w.role === "boss") || words[words.length - 1];
    fluff = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 5, v: 12 + Math.random() * 22, p: Math.random() * 6 }));
    resetRound(words.filter(w => w !== bossWord));
    player = { x: W / 2, y: H * 0.8, hp: BATTLE.playerMaxHp, inv: 0, glow: 0, hurt: 0 };
    level = fuwariLevel(opts.fuwariCount);
    paused = false; moved = false; banner = null; shake = 0; showWord = null; threads = [];
    state = "intro"; stateTimer = 2;
    running = true;
    lastTs = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  // 残りの語句で（再）スタートする
  function resetRound(rest) {
    queue = shuffle(rest.slice());
    waiting = [];
    shots = []; enemies = []; ebullets = []; threads = threads || [];
    bossSpawned = false;
    spawnTimer = BATTLE.firstSpawnDelay;
    shotTimer = 0;
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    drag = null;
  }

  // 一時停止（アプリが裏に回ったとき）。画面をタップすると再開
  function pause() {
    if (!running || state === "clear") return;
    paused = true;
    drag = null;
  }
  function resume() {
    paused = false;
    lastTs = performance.now();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ===== 敵を出す =====
  function spawn(word) {
    const role = word.role;
    let size = BATTLE.fontSize[role] || 26;
    ctx.font = font(size);
    let w = ctx.measureText(word.word).width;
    // 画面からはみ出す長い語句は、24pxまで小さくする
    while (w > W - 40 && size > 24) { size -= 2; ctx.font = font(size); w = ctx.measureText(word.word).width; }
    const margin = w / 2 + 20 + BATTLE.sway;
    const x = role === "boss" ? W / 2 : margin + Math.random() * Math.max(1, W - margin * 2);
    enemies.push({
      word, role, size, w, h: size * 1.2,
      bx: x, x, y: -size, hp: word.hp, maxHp: word.hp,
      age: 0, phase: Math.random() * 6, fire: 1 + Math.random() * 1.5, flash: 0
    });
  }

  // ===== 毎フレームの処理 =====
  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (paused) return;
    t += dt;
    shake = Math.max(0, shake - dt);
    player.glow = Math.max(0, player.glow - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    // 背景の綿毛
    for (const f of fluff) { f.y += f.v * dt; f.x += Math.sin(t + f.p) * 8 * dt; if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; } }
    if (showWord) { showWord.t -= dt; if (showWord.t <= 0) showWord = null; }
    updateThreads(dt);

    if (state === "intro") {
      stateTimer -= dt;
      if (stateTimer <= 0) state = "play";
      return;
    }
    if (state === "down") {
      stateTimer -= dt;
      if (stateTimer <= 0) revive();
      return;
    }
    if (state === "clear") {
      stateTimer -= dt;
      if (stateTimer <= 0) { stop(); opts.onEnd(absorbed.map(w => w.id)); }
      return;
    }

    // 下へ抜けた語句を、しばらくしてから列に戻す
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (t >= waiting[i].at) { queue.push(waiting[i].word); waiting.splice(i, 1); }
    }

    // 敵を出す
    spawnTimer -= dt;
    if (enemies.length === 0) spawnTimer = Math.min(spawnTimer, BATTLE.emptyWait);
    const normalOnScreen = enemies.filter(e => e.role !== "boss").length;
    if (spawnTimer <= 0 && queue.length && normalOnScreen < BATTLE.maxOnScreen) {
      spawn(queue.shift());
      spawnTimer = BATTLE.spawnInterval;
    }
    // ほかの語句をすべて吸い込んだら、最後に大ボス
    if (!bossSpawned && absorbed.length === opts.total - 1 && !absorbed.includes(bossWord) && enemies.length === 0) {
      spawn(bossWord);
      bossSpawned = true;
      banner = { text: "大ボス あらわる！", t: 1.8 };
      Sound.se("boss");
    }

    // 自機の弾（自動で連射）
    shotTimer -= dt;
    if (shotTimer <= 0) {
      // ふわりの段階で弾の数が増える
      const spread = { 1: [0], 2: [-1, 1], 3: [-1, 0, 1] }[level.shots] || [0];
      for (const k of spread) shots.push({ x: player.x + k * 9, y: player.y - 22, vx: k * 55 });
      shotTimer = BATTLE.shotInterval * level.rate;
    }
    for (const s of shots) { s.y -= BATTLE.shotSpeed * dt; s.x += s.vx * dt; }
    shots = shots.filter(s => s.y > -20);

    // 敵の動き
    for (const e of enemies) {
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.role === "boss") {
        const enter = Math.min(e.age / BATTLE.bossEnterTime, 1);
        e.y = -e.size + (H * BATTLE.bossStopY + e.size) * (1 - Math.pow(1 - enter, 2));
        const range = Math.min(W * BATTLE.bossSway, Math.max(0, W / 2 - e.w / 2 - 12));
        e.x = W / 2 + Math.sin(e.age * 0.7) * range;
      } else {
        e.y += (H + e.size * 2) / BATTLE.fallTime[e.role] * dt;
        e.x = e.bx + Math.sin(e.age * BATTLE.swaySpeed + e.phase) * BATTLE.sway;
      }
      // 弾を撃つ（画面の上のほうにいる間だけ）
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 0 && e.y < H * 0.62) {
        e.fire = BATTLE.enemyFireInterval[e.role] * (0.8 + Math.random() * 0.4);
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        const bullets = e.role === "boss" ? [-0.25, 0, 0.25] : [0];
        for (const da of bullets) {
          ebullets.push({ x: e.x, y: e.y + e.h / 2, vx: Math.cos(ang + da) * BATTLE.enemyBulletSpeed, vy: Math.sin(ang + da) * BATTLE.enemyBulletSpeed });
        }
      }
    }

    // 弾が敵に当たったか
    for (const s of shots) {
      for (const e of enemies) {
        if (e.role === "boss" && e.age < BATTLE.bossEnterTime) continue;   // 大ボスは降りてくる間は当たらない
        if (e.hp > 0 && Math.abs(s.x - e.x) < e.w / 2 + 4 && Math.abs(s.y - e.y) < e.h / 2) {
          s.y = -999;
          e.hp--;
          e.flash = 0.12;
          Sound.se("hit");
          if (e.hp <= 0) defeat(e);
          break;
        }
      }
    }
    enemies = enemies.filter(e => e.hp > 0);

    // 下へ抜けた敵
    for (const e of enemies) {
      if (e.role !== "boss" && e.y > H + e.size) {
        e.hp = 0;
        waiting.push({ word: e.word, at: t + BATTLE.respawnDelay });
      }
    }
    enemies = enemies.filter(e => e.hp > 0);

    // 敵の弾
    player.inv = Math.max(0, player.inv - dt);
    const R = ENEMY_BULLET_ART.radius;
    for (const b of ebullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (player.inv <= 0 && Math.hypot(b.x - player.x, b.y - player.y) < R + 10) {
        b.y = H + 999;
        hurt();
      }
    }
    ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  }

  // 倒した: 糸がほどけるように散って、自機へ吸い込まれる
  function defeat(e) {
    absorbed.push(e.word);
    ctx.font = font(e.size);
    const n = Math.min(60, 14 + e.word.word.length * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      threads.push({
        x: e.x + (Math.random() - 0.5) * e.w, y: e.y + (Math.random() - 0.5) * e.h * 0.6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        len: 6 + Math.random() * 12, curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6,
        color: ENEMY_COLOR[e.role], age: 0, scatter: 0.35 + Math.random() * 0.2
      });
    }
    Sound.se("absorb");
    player.hp = Math.min(BATTLE.playerMaxHp, player.hp + BATTLE.healOnAbsorb);
    showWord = { word: e.word, t: BATTLE.wordShowTime };
    if (absorbed.length >= opts.total) {
      enemies.forEach(x => (x.hp = 0));
      ebullets = [];
      state = "clear";
      stateTimer = 2;
      banner = null;
    }
  }

  function updateThreads(dt) {
    for (const th of threads) {
      th.age += dt;
      th.rot += th.curl * dt * 4;
      if (th.age < th.scatter) {      // ほどけて散る
        th.x += th.vx * dt; th.y += th.vy * dt;
        th.vx *= 0.93; th.vy *= 0.93;
      } else {                        // 自機（ふわり）へ吸い込まれる
        const tx = player.x + 26, ty = player.y - 6;
        const k = Math.min(1, (th.age - th.scatter) * 3.2);
        th.x += (tx - th.x) * k * dt * 9;
        th.y += (ty - th.y) * k * dt * 9;
        if (Math.hypot(tx - th.x, ty - th.y) < 8) { th.done = true; player.glow = 0.35; }
      }
      if (th.age > 2.5) th.done = true;
    }
    threads = threads.filter(th => !th.done);
  }

  function hurt() {
    player.hp -= BATTLE.damage;
    player.inv = BATTLE.invincibleTime;
    player.hurt = 0.4;
    shake = 0.25;
    Sound.se("damage");
    if (player.hp <= 0) {
      player.hp = 0;
      state = "down";
      stateTimer = BATTLE.reviveDelay;
      ebullets = [];
    }
  }

  // 吸い込み済みの語句はそのままで、残りの語句だけで再開
  function revive() {
    const rest = [];
    const all = opts.words;
    for (const w of all) if (!absorbed.includes(w) && w !== bossWord) rest.push(w);
    resetRound(rest);
    player.hp = BATTLE.playerMaxHp;
    player.inv = BATTLE.invincibleTime;
    state = "play";
  }

  // ===== 描く =====
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake / 0.25, (Math.random() - 0.5) * 10 * shake / 0.25);
    // 背景: 畑の空（緑と生成り）
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e3f0d0");
    g.addColorStop(1, "#f8f2e2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 遠くの丘
    ctx.fillStyle = "#d3e6bb";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 50 - Math.sin(x / 70 + t * 0.15) * 14);
    ctx.lineTo(W, H); ctx.fill();
    // 綿毛
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const f of fluff) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }

    // 自機の弾（小さな光のつぶ）
    ctx.fillStyle = "#fff9d6";
    ctx.strokeStyle = "#e8cf7a";
    ctx.lineWidth = 1.5;
    for (const s of shots) { ctx.beginPath(); ctx.ellipse(s.x, s.y, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

    // 敵（語句の文字）
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of enemies) {
      ctx.font = font(e.size);
      ctx.globalAlpha = e.role === "boss" && e.age < BATTLE.bossEnterTime ? 0.55 : 1;   // 降りてくる間はうすく（まだ当たらない）
      const wob = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx.lineJoin = "round";
      ctx.lineWidth = 7;
      ctx.strokeStyle = e.flash > 0 ? "#fff6c8" : "#ffffff";
      ctx.strokeText(e.word.word, e.x + wob, e.y);
      ctx.fillStyle = ENEMY_COLOR[e.role];
      ctx.fillText(e.word.word, e.x + wob, e.y);
      // 中ボス・大ボスは硬さを小さな丸で表示
      if (e.maxHp > 1) {
        const n = e.maxHp, gap = 10, x0 = e.x - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          ctx.arc(x0 + i * gap, e.y - e.h / 2 - 6, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = i < e.hp ? ENEMY_COLOR[e.role] : "rgba(0,0,0,0.12)";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // 敵の弾
    for (const b of ebullets) drawEnemyBullet(b);

    // ほどけた糸
    ctx.lineCap = "round";
    ctx.lineWidth = 2.2;
    for (const th of threads) {
      ctx.strokeStyle = th.color;
      ctx.globalAlpha = Math.max(0, 1 - th.age / 2.5);
      ctx.beginPath();
      const c = Math.cos(th.rot), s = Math.sin(th.rot);
      ctx.moveTo(th.x - c * th.len / 2, th.y - s * th.len / 2);
      ctx.quadraticCurveTo(th.x + s * th.len * 0.4, th.y - c * th.len * 0.4, th.x + c * th.len / 2, th.y + s * th.len / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawPlayer();
    ctx.restore();

    // 被弾したとき、画面のふちをうすく赤く
    if (player.hurt > 0) {
      const a = player.hurt / 0.4 * 0.45;
      const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      rg.addColorStop(0, "rgba(232,130,150,0)");
      rg.addColorStop(1, `rgba(232,130,150,${a})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    drawHud();
    // 操作のヒント（まだ動かしていないとき）
    if (!moved && state !== "clear") {
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(16);
      ctx.fillStyle = "#48693a";
      ctx.fillText("← ゆびでドラッグしてうごかそう →", W / 2, Math.min(H - 24, player.y + 48));
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();

    // 吸い込んだ語句を画面中央に大きく（読み仮名つき）
    if (showWord) drawBigWord(showWord.word, showWord.t);

    // 状態の文字
    if (state === "intro") centerText(opts.stageName, "スタート！", 1);
    if (state === "down") centerText("やられた…", `${Math.ceil(stateTimer)}秒後に再開`, 1);
    if (state === "clear") centerText("10語あつまった！", "クイズへ", 1);
    if (paused) {
      ctx.fillStyle = "rgba(248,243,228,0.85)";
      ctx.fillRect(0, 0, W, H);
      centerText("ひとやすみ中", "画面をタップするとつづきから", 1);
    }
  }

  function drawBanner() {
    const a = Math.min(1, banner.t / 0.3, (1.8 - banner.t) / 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const y = H * 0.42;
    ctx.fillStyle = "rgba(196,87,122,0.88)";
    ctx.fillRect(0, y - 30, W, 60);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(28);
    ctx.fillStyle = "#fffdf7";
    ctx.fillText(banner.text, W / 2 + (1 - a) * 40, y);
    ctx.globalAlpha = 1;
  }

  function drawEnemyBullet(b) {
    const art = ENEMY_BULLET_ART;
    if (art.image) {
      if (!art._img) { art._img = new Image(); art._img.src = art.image; }
      if (art._img.complete) { ctx.drawImage(art._img, b.x - art.radius, b.y - art.radius, art.radius * 2, art.radius * 2); return; }
    }
    art.draw(ctx, b.x, b.y, art.radius, t);
  }

  // 自機（仮の形: A君が乗る雲）と、横にいるふわり
  function drawPlayer() {
    const { x, y } = player;
    if (player.inv > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.4;
    // 雲
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#b9cfa0";
    ctx.lineWidth = 2;
    const puffs = [[-16, 4, 11], [0, -2, 15], [16, 4, 11], [-6, 8, 10], [8, 8, 10]];
    ctx.beginPath();
    for (const [dx, dy, r] of puffs) { ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); }
    ctx.stroke();
    for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
    // A君（仮: 小さな頭と葉っぱの帽子）
    ctx.fillStyle = "#f3d9b8";
    ctx.beginPath(); ctx.arc(x, y - 16, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7fae55";
    ctx.beginPath(); ctx.ellipse(x + 2, y - 23, 7, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // ふわり（白い小さなタオル）。集めたカードの枚数を数字で表示
    const fx = x + 34, fy = y - 8 + Math.sin(t * 3) * 3;
    if (player.glow > 0) {   // 吸い込むときに光る
      const gr = ctx.createRadialGradient(fx, fy, 2, fx, fy, 30);
      gr.addColorStop(0, `rgba(255,248,200,${player.glow / 0.35})`);
      gr.addColorStop(1, "rgba(255,248,200,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(fx, fy, 30, 0, Math.PI * 2); ctx.fill();
    }
    const sc = 1 + player.glow * 0.6;
    ctx.fillStyle = level.body;
    ctx.strokeStyle = level.line;
    ctx.lineWidth = 2;
    roundRect(fx - 12 * sc, fy - 10 * sc, 24 * sc, 20 * sc, 6);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6f9a4a";
    ctx.font = font(11);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(opts.fuwariCount), fx, fy + 1);
  }

  function drawHud() {
    const top = 14;
    // 体力
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    roundRect(12, top, 130, 16, 8); ctx.fill();
    const rate = player.hp / BATTLE.playerMaxHp;
    ctx.fillStyle = rate > 0.4 ? "#8cbf5a" : (Math.floor(t * 4) % 2 ? "#e39a8e" : "#f2c4bb");
    roundRect(14, top + 2, 126 * rate, 12, 6); ctx.fill();
    ctx.font = font(12);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = "#4b5e3a";
    ctx.fillText("たいりょく", 14, top + 20);
    // 集めた語句の数
    ctx.textAlign = "right";
    ctx.font = font(18);
    ctx.fillText(`${absorbed.length} / ${opts.total} 語`, W - 14, top);
    ctx.font = font(12);
    ctx.fillText(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, W - 14, top + 24);
  }

  function drawBigWord(word, remain) {
    const a = Math.min(1, remain / 0.12, (BATTLE.wordShowTime - remain) / 0.08 + 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const showKana = hasKanji(word.word);
    let size = 48;
    ctx.font = font(size);
    while (ctx.measureText(word.word).width > W - 60 && size > 24) { size -= 2; ctx.font = font(size); }
    const w = Math.max(ctx.measureText(word.word).width, 160) + 48;
    const h = size + (showKana ? 56 : 36);
    const cy = H * 0.45;
    ctx.fillStyle = "rgba(255,253,245,0.94)";
    ctx.strokeStyle = "#cfe0b6";
    ctx.lineWidth = 3;
    roundRect(W / 2 - w / 2, cy - h / 2, w, h, 22);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (showKana) {
      ctx.font = font(18);
      ctx.fillStyle = "#7a8a68";
      ctx.fillText(word.kana, W / 2, cy - size / 2 - 4);
    }
    ctx.font = font(size);
    ctx.fillStyle = ENEMY_COLOR[word.role];
    ctx.fillText(word.word, W / 2, cy + (showKana ? 12 : 0));
    ctx.globalAlpha = 1;
  }

  function centerText(big, small) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(30);
    ctx.lineWidth = 8; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
    ctx.strokeText(big, W / 2, H * 0.32);
    ctx.fillStyle = "#48693a";
    ctx.fillText(big, W / 2, H * 0.32);
    ctx.font = font(20);
    ctx.strokeText(small, W / 2, H * 0.32 + 40);
    ctx.fillText(small, W / 2, H * 0.32 + 40);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { start, stop, resize, pause };
})();
