// バトル（縦スクロールのシューティング）
// 空中と地上の2つの層がある
//   空中の敵 … 自機の弾（自動で連射）で倒す
//   地上の敵 … 自機の前にある照準◎に入ると、自動で「たね」を落として倒す
// 主役は語句の敵。バトルは「1周目 → 2周目 → 大ボス」の台本で進む（出る順番・出方・時刻はデータで固定）
//   1周目 … 大ボス以外の語句が決まった順に出る。倒すと、ふわりが反応して光って消えるだけ（吸い込まない）
//   2周目 … 同じ語句が同じ順番・同じ出方で出る。倒すと、糸のようにほどけて吸い込まれる（クイズに出る）
//            取り逃がした語句は、そのバトルでは取れない
//   大ボス … 2周目のあとに1回。倒して吸い込むとバトル終了
// 雑魚（語句ではない敵）は小さく薄く。倒すとぽんっと花になり、ときどき体力が回復する「綿のたね」を落とす

// ===== 調整用の数値（速さ・弾の量・硬さなど）はここにまとめる =====
const BATTLE = {
  // --- 台本（2周＋大ボス） ---
  roundInterval1: 4.5,         // 1周目に語句が出てくる間隔（秒）。目安は1周50秒
  roundInterval2: 5,           // 2周目に語句が出てくる間隔（秒）
  round1Speed: 1.25,           // 1周目の語句の動く速さの倍率（1周目は速く流す）
  round1FillerScale: 2,        // 1周目の雑魚の出る間隔の倍率（大きいほど雑魚が少ない）
  roundGap: 2.5,               // 周と周のあいだの秒数（帯を出す）
  firstSpawnDelay: 2.2,        // 始まってから最初の語句が出るまで（秒）
  fallTime: { zako: 12, mid: 15 },  // 空中の語句が画面の上から下まで降りる秒数（大きいほどゆっくり）
  edgeFallTime: 16,            // 「端にかくれる」語句が降りる秒数
  crossTime: 7,                // 「横切る」語句が画面を横切る秒数
  crossY: 0.2,                 // 「横切る」語句が通る高さ（画面の高さに対する割合）
  escortCount: 4,              // 「雑魚のうしろ」の語句を守る雑魚の数
  kanaSize: 13,                // 敵の語句の上に出すふりがなの大きさ（px）
  bossStopY: 0.22,             // 大ボスが止まる高さ（画面の高さに対する割合）
  bossEnterTime: 3,            // 大ボスが止まる位置まで降りてくる秒数（この間は弾が当たらない）
  sway: 16,                    // 空中の語句の左右の振れ幅（px）
  swaySpeed: 0.9,              // 左右に振れる速さ
  bossSway: 0.28,              // 大ボスの左右の動き（画面の幅に対する割合）
  fontSize: { zako: 26, mid: 30, boss: 36 },   // 敵の文字の大きさ（px）。24以上
  enemyFireInterval: { zako: 3.4, mid: 2.4, boss: 1.4 },  // 語句の敵が弾を撃つ間隔（秒）
  enemyBulletSpeed: 140,       // 敵の弾の速さ（px/秒）
  hpOverride: { zako: 0, mid: 0, boss: 0 },   // 0 のときは data/words.js の hp を使う。0より大きいと役割ごとにこの硬さにする
  shotPattern: { zako: [0], mid: [-0.18, 0.18], boss: [-0.25, 0, 0.25] },   // 語句の敵の弾の向き（自機をねらう向きからのずれ）

  // --- 雑魚 ---
  fillerInterval: 4.5,         // 雑魚の群れが出てくる間隔（秒）
  fillerMax: 6,                // 同時に出ている雑魚の最大数
  fillerScale: 0.8,            // 雑魚の大きさの倍率（語句より目立たないように小さく）
  fillerAlpha: 0.72,           // 雑魚の濃さ（1でふつう。小さいほど薄い）
  fillerAvoid: 90,             // 語句のまわり、この距離（px）には雑魚を出さない
  fillerFireScale: 1.5,         // 雑魚が撃つ間隔の倍率（大きいほど撃たない）
  dropRate: 0.3,               // 雑魚が「綿のたね」を落とす確率（0〜1）
  healItem: 8,                 // 綿のたねで回復する体力

  // --- 地上 ---
  scrollTime: 14,              // 地面が画面の高さぶん流れる秒数（大きいほどゆっくり）
  bombRange: 170,              // 照準◎の位置（自機からどれだけ前か、px）
  lockRadius: 26,              // 照準◎の大きさ（この中に地上の敵が入ると、たねを落とす）
  bombInterval: 0.3,           // たねを落とす間隔（秒）
  bombFlight: 0.4,             // たねが地面に届くまでの秒数
  bombRadius: 36,              // たねが当たる広さ（px）

  // --- 強さ（1945型） ---
  powerEvery: 3,               // 語句を何語吸い込むごとに1段階強くなるか

  // --- 得点 ---
  scoreFiller: 100,            // 雑魚を倒した点
  scoreWord: 1000,             // 語句を倒した点（雑魚の10倍）
  comboStep: 0.5,              // 語句を続けて倒すたびに増える倍率（1 → 1.5 → 2 …）
  comboMax: 3,                 // コンボ倍率のいちばん上

  // --- 「記憶の光」ボム ---
  bombGain: 12,                // 語句を倒したときにたまるゲージ（×コンボ倍率）。100で満タン
  bombButtonR: 26,             // 画面左下のふわりマーク（ボムのボタン）の大きさ（px）

  // --- 自機 ---
  shotInterval: 0.16,          // 自機の弾の間隔（秒）
  shotSpeed: 640,              // 自機の弾の速さ（px/秒）
  playerMaxHp: 100,            // 体力
  damage: 20,                  // 敵の弾に当たったときに減る体力
  healOnAbsorb: 12,            // 語句を吸い込んだときに回復する体力
  invincibleTime: 1.3,         // 当たったあと、しばらく無敵になる秒数
  reviveDelay: 3,              // 体力ゼロのあと、再開するまでの秒数
  wordShowTime: 1.0,           // 吸い込んだ語句を画面中央に大きく出す秒数（この間は弾が当たらない）
  slowTime: 0.3,               // 吸い込む瞬間に画面全体がゆっくりになる秒数
  slowScale: 0.25,             // ゆっくりのときの速さ（1でふつう、小さいほどゆっくり）
  stripRows: 2,                // 「集めたことば」の帯の行数
};

// ===== 雑魚の種類 =====
// layer: "air"（空中・弾で倒す）/ "ground"（地上・たねで倒す）
// hp: 硬さ、r: 当たりの大きさ、fire: 弾を撃つ間隔（秒・0なら撃たない）、spread: 弾の向き
const FILLER_TYPES = {
  ladybug: { layer: "air",    hp: 1, r: 13, fire: 0 },                       // てんとう虫: 横から列になって飛んでくる
  bee:     { layer: "air",    hp: 1, r: 13, fire: 2.2 },                     // ハチ: 上から自機のほうへ急に降りてきて、引き返す
  ghost:   { layer: "air",    hp: 2, r: 16, fire: 2.8 },                     // 綿毛おばけ: ゆらゆら降りてくる
  weed:    { layer: "ground", hp: 2, r: 18, fire: 2.6 },                     // からまり草: 畑に生えている
  thorn:   { layer: "ground", hp: 3, r: 20, fire: 3.4, spread: [-0.3, 0, 0.3] }, // いばらの株: 3方向に撃つ
};
// 雑魚の群れの出やすさ（数が大きいほどよく出る）
const FILLER_WAVES = { ladybugs: 3, bees: 2, ghost: 2, weeds: 3, thorn: 1 };

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

// バトルの中での強さ（1945型）。語句を BATTLE.powerEvery 語吸い込むごとに1段階上がる。毎バトル最初の段階から
// shots: 弾の本数、rate: 弾の間隔の倍率（小さいほど速い）、body / line: ふわりの色
// カードの総数は、ふわりの横の数字に出すだけで、強さには関係しない
const POWER_LEVELS = [
  { shots: 1, rate: 1,    body: "#fffdf7", line: "#c9d9b4" },
  { shots: 2, rate: 1,    body: "#eef8df", line: "#8fbf5e" },
  { shots: 3, rate: 1,    body: "#fff4cf", line: "#dcb64e" },
  { shots: 3, rate: 0.75, body: "#fde6ee", line: "#e08aa6" },
];

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
  let fillers, bombs, pops, items, terrain, cloudShadows;
  let script, absorbed, missed, bossWord, groundIds;
  let phase;                 // "round1" / "round2" / "boss"
  let nextIdx, nextAt;       // 台本: 次に出す語句の番号と、出す時刻（その周の中の時間）
  let roundT;                // 今の周の中の経過時間（秒）
  let gapT;                  // 周と周のあいだの残り時間（秒）
  let vanish;                // 1周目に倒した語句が、光って消えていく演出
  let shotTimer, fillerTimer, bombTimer;
  let showWord = null;       // 画面中央に出している語句
  let drag = null;
  let paused = false;        // アプリが裏に回ったときなど
  let moved = false;         // 一度でもドラッグしたか（操作のヒント用）
  let groundHinted = false;  // 地上の敵のヒントを出したか
  let banner = null;         // 「大ボス あらわる！」などの帯
  let shake = 0;             // 画面のゆれ（被弾したとき）
  let level = POWER_LEVELS[0];
  let score = 0, combo = 0, maxCombo = 0;
  let floats = [];           // 点数が浮かぶ表示
  let hits = 0, downs = 0;   // 被弾した回数、やられた回数
  let lock = false;          // 照準に地上の敵が入っているか
  let slow = 0;              // ゆっくりの残り時間（秒）
  let gauge = 0;             // 「記憶の光」ボムのゲージ（0〜100）
  let bombsUsed = 0;
  let bombing = false;       // 「記憶の光」で反応させている最中（ゲージをためない）
  let wave = null;           // 吸い込んだときに広がる光

  function font(size) { return `bold ${size}px ${FONT_FAMILY}`; }
  const hasKanji = s => /[一-龯々]/.test(s);
  const scrollSpeed = () => H / BATTLE.scrollTime;
  const rand = (a, b) => a + Math.random() * (b - a);

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
      player.y = Math.min(Math.max(player.y, minPlayerY()), H - 40);
    }
  }
  // 照準が画面の中に入るように、自機は上に行きすぎない
  function minPlayerY() { return Math.min(H - 60, BATTLE.bombRange + 60); }

  // 「記憶の光」ボムのボタン（画面左下のふわりマーク）
  function bombButton() { return { x: 14 + BATTLE.bombButtonR, y: H - 18 - BATTLE.bombButtonR, r: BATTLE.bombButtonR }; }

  // ===== 操作: 指一本のドラッグ（指の動いたぶんだけ自機が動く） =====
  function onDown(e) {
    e.preventDefault();
    if (paused) { resume(); return; }
    if (!player) return;
    // ふわりマークをタップ: ゲージが満タンなら「記憶の光」
    const rect = canvas.getBoundingClientRect(), bb = bombButton();
    if (Math.hypot(e.clientX - rect.left - bb.x, e.clientY - rect.top - bb.y) < bb.r + 10) {
      if (gauge >= 100 && state === "play") useBomb();
      return;
    }
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: player.x, py: player.y };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    moved = true;
    player.x = Math.min(Math.max(drag.px + (e.clientX - drag.sx) * 1.15, 24), W - 24);
    player.y = Math.min(Math.max(drag.py + (e.clientY - drag.sy) * 1.15, minPlayerY()), H - 40);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; }

  // ===== 始める =====
  // words: このステージの10語、o: { stageName, fuwariCount, onEnd(吸い込んだ順のid配列, 記録) }
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
    absorbed = []; missed = [];
    bossWord = words.find(w => w.role === "boss") || words[words.length - 1];
    // 地上に出る語句は、データの出方（pattern）が "ground" のもの
    groundIds = new Set(words.filter(w => w.pattern === "ground" && w !== bossWord).map(w => w.id));
    // 台本: 大ボス以外の語句を、データの順番（order）でならべる
    script = words.filter(w => w !== bossWord).sort((a, b) => (a.order || 0) - (b.order || 0));
    vanish = [];
    fluff = Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40, p: Math.random() * 6 }));
    cloudShadows = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: (i / 3) * H, rx: rand(70, 120), ry: rand(35, 55) }));
    terrain = [];
    fillTerrain();
    shots = []; enemies = []; ebullets = []; fillers = []; bombs = []; items = [];
    startPhase("round1");
    fillerTimer = 1.2; shotTimer = 0; bombTimer = 0;
    player = { x: W / 2, y: H * 0.8, hp: BATTLE.playerMaxHp, inv: 0, glow: 0, hurt: 0 };
    level = POWER_LEVELS[0];
    score = 0; combo = 0; maxCombo = 0; floats = [];
    hits = 0; downs = 0;
    paused = false; moved = false; groundHinted = false; banner = null; shake = 0; showWord = null; threads = []; pops = [];
    slow = 0; wave = null; gauge = 0; bombsUsed = 0;
    state = "intro"; stateTimer = 2;
    running = true;
    lastTs = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  // 周を始める
  function startPhase(p) {
    phase = p;
    nextIdx = 0;
    roundT = 0;
    gapT = 0;
    nextAt = p === "round1" ? BATTLE.firstSpawnDelay : 0.8;
  }
  const roundInterval = () => phase === "round1" ? BATTLE.roundInterval1 : BATTLE.roundInterval2;

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

  // ===== 地面（畑・小川・あぜ道）。下へ流れていく =====
  const SEG_H = 240;
  function makeSegment(y) {
    const kinds = ["field", "field", "meadow", "creek", "path"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const seg = { kind, y, deco: [] };
    if (kind === "field") {           // 畝（うね）のある綿畑
      seg.x0 = rand(-40, W * 0.3); seg.x1 = rand(W * 0.7, W + 40);
      for (let i = 0; i < 10; i++) seg.deco.push({ x: rand(seg.x0 + 10, seg.x1 - 10), y: rand(20, SEG_H - 20), r: rand(5, 9) });
    } else if (kind === "meadow") {   // 花の咲く草地
      for (let i = 0; i < 22; i++) seg.deco.push({ x: rand(0, W), y: rand(0, SEG_H), c: ["#f6d6e0", "#fff6c9", "#ffffff", "#e3d6f4"][i % 4] });
    } else if (kind === "creek") {    // 小川
      seg.cy = rand(70, SEG_H - 70); seg.ph = rand(0, 6);
    } else {                          // あぜ道
      seg.px = rand(W * 0.25, W * 0.75); seg.ph = rand(0, 6);
      for (let i = 0; i < 8; i++) seg.deco.push({ x: rand(0, W), y: rand(0, SEG_H), r: rand(10, 18) });
    }
    return seg;
  }
  function fillTerrain() {
    if (!terrain.length) terrain.push(makeSegment(H - SEG_H));
    while (terrain[terrain.length - 1].y > -SEG_H) terrain.push(makeSegment(terrain[terrain.length - 1].y - SEG_H));
    terrain = terrain.filter(s => s.y < H + 10);
  }

  // ===== 語句の敵を出す =====
  function spawn(word) {
    const role = word.role;
    const ground = groundIds.has(word.id) && role !== "boss";
    let size = BATTLE.fontSize[role] || 26;
    ctx.font = font(size);
    let w = ctx.measureText(word.word).width;
    // 画面からはみ出す長い語句は、24pxまで小さくする
    while (w > W - 40 && size > 24) { size -= 2; ctx.font = font(size); w = ctx.measureText(word.word).width; }
    // 出方（pattern）と位置（lane）はデータで固定。ランダムには出ない
    const pattern = role === "boss" ? "boss" : (word.pattern || "normal");
    const lane = word.lane === undefined ? 0.5 : word.lane;
    const margin = w / 2 + 20 + (ground ? 0 : BATTLE.sway);
    let x = role === "boss" ? W / 2 : margin + lane * Math.max(1, W - margin * 2);
    let y = -size;
    if (pattern === "edge") x = lane < 0.5 ? -w / 2 : W + w / 2;
    if (pattern === "cross") { x = lane < 0.5 ? -w / 2 - 10 : W + w / 2 + 10; y = H * BATTLE.crossY; }
    const hp = BATTLE.hpOverride[role] || word.hp;
    const e = {
      word, role, size, w, h: size * 1.2, ground, pattern, lane,
      last: phase !== "round1",                    // 2周目と大ボスは、倒せば吸い込む
      spd: phase === "round1" ? BATTLE.round1Speed : 1,
      bx: x, x, y, hp, maxHp: hp,
      age: 0, phase: (word.id * 1.7) % 6, fire: 1.2, flash: 0
    };
    // 中ボス・大ボスは1文字ずつ壊す: 文字がそれぞれ部品。hp は文字1つあたりの耐久
    if (role === "mid" || role === "boss") {
      ctx.font = font(size);
      const chars = Array.from(word.word);
      const ws = chars.map(ch => ctx.measureText(ch).width);
      const total = ws.reduce((a, b) => a + b, 0);
      let ox = -total / 2;
      e.parts = chars.map((ch, i) => {
        const p = { ch, ox: ox + ws[i] / 2, cw: ws[i], hp, maxHp: hp, broken: false, flash: 0,
          kana: (word.kanaParts && word.kanaParts[i]) || ch };
        ox += ws[i];
        return p;
      });
      e.hp = e.maxHp = chars.length;   // 残っている文字の数
    }
    enemies.push(e);
    // 雑魚のうしろ: 語句の前（下）に雑魚がならんで守る
    if (pattern === "behind") {
      const n = BATTLE.escortCount;
      for (let i = 0; i < n; i++) {
        const dx = (i - (n - 1) / 2) * Math.max(26, (w + 20) / n);
        spawnFiller("ghost", x + dx, y + e.h / 2 + 22, { escort: e, dx, dy: e.h / 2 + 22 + (i % 2) * 10 });
      }
    }
    if (ground) groundHint();
  }

  function groundHint() {
    if (groundHinted) return;
    groundHinted = true;
    banner = { text: "じめんの敵は ◎ をあわせよう", t: 2.4, color: "rgba(111,154,74,0.9)" };
  }

  // ===== 雑魚の群れを出す =====
  function spawnFiller(type, x, y, extra) {
    const def = FILLER_TYPES[type];
    fillers.push(Object.assign({ type, layer: def.layer, hp: def.hp, r: def.r * BATTLE.fillerScale, x, y, age: 0, flash: 0,
      fire: def.fire ? rand(0.8, 1.6) * def.fire * BATTLE.fillerFireScale : 0 }, extra || {}));
  }
  // 語句の近くかどうか（雑魚を出す場所をえらぶとき用）
  function nearWord(x, y, layer) {
    const A = BATTLE.fillerAvoid;
    return enemies.some(e => (layer ? (layer === "ground") === e.ground : true) &&
      Math.abs(x - e.x) < e.w / 2 + A && Math.abs(y - e.y) < e.h / 2 + A);
  }
  // 語句から離れた x をえらぶ（見つからなければ null）
  function freeX(y, layer, margin) {
    for (let i = 0; i < 8; i++) { const x = rand(margin, W - margin); if (!nearWord(x, y, layer)) return x; }
    return null;
  }
  // 横に通る列が、空中の語句と重ならない高さをえらぶ
  function freeRow() {
    for (let i = 0; i < 8; i++) {
      const y = rand(H * 0.12, H * 0.4);
      if (!enemies.some(e => !e.ground && Math.abs(e.y + (H / BATTLE.fallTime.zako) * 3 - y) < e.h / 2 + BATTLE.fillerAvoid)) return y;
    }
    return null;
  }

  function spawnWave() {
    const names = Object.keys(FILLER_WAVES);
    let sum = names.reduce((a, n) => a + FILLER_WAVES[n], 0), r = Math.random() * sum, name = names[0];
    for (const n of names) { r -= FILLER_WAVES[n]; if (r <= 0) { name = n; break; } }
    // 語句の近くには出さない。場所が見つからなければ、その回は出さない
    if (name === "ladybugs") {        // 横から4匹が列になって飛んでくる
      const fromLeft = Math.random() < 0.5, y0 = freeRow();
      if (y0 === null) return;
      for (let i = 0; i < 4; i++) spawnFiller("ladybug", fromLeft ? -20 : W + 20, y0, { dir: fromLeft ? 1 : -1, y0, delay: i * 0.32 });
    } else if (name === "bees") {     // 2匹が上から急に降りてくる
      for (let i = 0; i < 2; i++) { const x = freeX(0, "air", 30); if (x !== null) spawnFiller("bee", x, -20, { delay: i * 0.45, tx: null }); }
    } else if (name === "ghost") {    // 綿毛おばけが1匹
      const x = freeX(0, "air", 40); if (x !== null) spawnFiller("ghost", x, -24, { bx: 0 });
    } else if (name === "weeds") {    // からまり草が2株
      for (let i = 0; i < 2; i++) { const x = freeX(0, "ground", 40); if (x !== null) spawnFiller("weed", x, -24 - rand(0, 40)); }
    } else {                          // いばらの株が1つ
      const x = freeX(0, "ground", 50); if (x !== null) spawnFiller("thorn", x, -26);
    }
    if (FILLER_TYPES[{ ladybugs: "ladybug", bees: "bee", ghost: "ghost", weeds: "weed", thorn: "thorn" }[name]].layer === "ground") groundHint();
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

  function update(realDt) {
    if (paused) return;
    // 吸い込む瞬間は、画面全体がゆっくりになる
    let dt = realDt;
    if (slow > 0) { slow -= realDt; dt = realDt * BATTLE.slowScale; }
    // 吸い込んだ語句の表示と、広がる光は実際の時間で進める
    if (showWord) { showWord.t -= realDt; if (showWord.t <= 0) showWord = null; }
    if (wave) { wave.age += realDt; if (wave.age > 0.6) wave = null; }
    t += dt;
    shake = Math.max(0, shake - dt);
    player.glow = Math.max(0, player.glow - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    const sc = scrollSpeed();

    // 地面・雲の影・綿毛（奥行きのために、速さを変えて流す）
    for (const s of terrain) s.y += sc * dt;
    fillTerrain();
    for (const c of cloudShadows) { c.y += sc * 1.5 * dt; c.x += 8 * dt; if (c.y - c.ry > H) { c.y = -c.ry - rand(0, 200); c.x = rand(0, W); } }
    for (const f of fluff) { f.y += f.v * dt; f.x += Math.sin(t + f.p) * 8 * dt; if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; } }
    updateThreads(dt);
    updatePops(dt);
    for (const v of vanish) { v.age += dt; if (v.ground) v.y += scrollSpeed() * dt; }
    for (const fl of floats) fl.age += realDt;
    floats = floats.filter(fl => fl.age < 0.9);
    vanish = vanish.filter(v => v.age < 0.8);
    player.notice = Math.max(0, (player.notice || 0) - dt);

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
      if (stateTimer <= 0) { stop(); opts.onEnd(absorbed.map(w => w.id), { time: t, hits, downs, score, maxCombo, bombsUsed, missed: missed.map(w => w.id) }); }
      return;
    }

    // ===== 台本: 決まった時刻に、決まった順番で語句を出す（倒したかどうかには関係しない） =====
    if (gapT > 0) {
      // 周と周のあいだ
      gapT -= dt;
      if (gapT <= 0) {
        if (phase === "round1") {
          startPhase("round2");
          banner = { text: "2周目　こんどは吸い込める！", t: 2.2, color: "rgba(220,170,60,0.92)" };
          Sound.se("power");
        } else {
          startPhase("boss");
          spawn(bossWord);
          banner = { text: "大ボス あらわる！", t: 1.8 };
          Sound.se("boss");
        }
      }
    } else if (phase !== "boss") {
      roundT += dt;
      while (nextIdx < script.length && roundT >= nextAt) {
        spawn(script[nextIdx]);
        nextIdx++;
        nextAt += roundInterval();
      }
      // その周の語句が全部出て、画面からいなくなったら次へ
      if (nextIdx >= script.length && enemies.every(e => e.role === "boss")) gapT = BATTLE.roundGap;
    }

    // 雑魚の群れを出す（1周目と大ボスのときは少なめ）
    fillerTimer -= dt;
    if (fillerTimer <= 0) {
      if (fillers.length < BATTLE.fillerMax) spawnWave();
      const scale = phase === "round1" ? BATTLE.round1FillerScale : (phase === "boss" ? 1.6 : 1);
      fillerTimer = BATTLE.fillerInterval * scale * rand(0.8, 1.2);
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

    // 地上の攻撃: 照準に地上の敵が入ったら、自動でたねを落とす
    const rx = player.x, ry = player.y - BATTLE.bombRange;
    lock = groundTargets().some(g => inReach(g, rx, ry, BATTLE.lockRadius));
    bombTimer -= dt;
    if (lock && bombTimer <= 0) {
      bombs.push({ sx: player.x, sy: player.y - 10, tx: rx, ty: ry, age: 0 });
      bombTimer = BATTLE.bombInterval;
      Sound.se("bomb");
    }
    for (const b of bombs) {
      b.age += dt;
      b.ty += sc * dt;   // 落ちる先も地面といっしょに流れる
      if (b.age >= BATTLE.bombFlight && !b.done) { b.done = true; landBomb(b.tx, b.ty); }
    }
    bombs = bombs.filter(b => !b.done);

    // 語句の敵の動き
    for (const e of enemies) {
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt);
      if (e.role === "boss") {
        const enter = Math.min(e.age / BATTLE.bossEnterTime, 1);
        e.y = -e.size + (H * BATTLE.bossStopY + e.size) * (1 - Math.pow(1 - enter, 2));
        const range = Math.min(W * BATTLE.bossSway, Math.max(0, W / 2 - e.w / 2 - 12));
        e.x = W / 2 + Math.sin(e.age * 0.7) * range;
      } else if (e.ground) {
        e.y += sc * dt;     // 地上の語句は地面といっしょに流れる
      } else if (e.pattern === "edge") {
        // 端にかくれる: 半分だけ顔を出して、出たり引っこんだりしながら降りる
        e.y += (H + e.size * 2) / BATTLE.edgeFallTime * dt * e.spd;
        const show = 0.35 + 0.3 * Math.sin(e.age * 1.2);   // 見えている割合
        e.x = e.lane < 0.5 ? -e.w / 2 + e.w * show : W + e.w / 2 - e.w * show;
      } else if (e.pattern === "cross") {
        // 横切る: 上のほうを横に通りすぎる
        const dir = e.lane < 0.5 ? 1 : -1;
        e.x += dir * (W + e.w + 20) / BATTLE.crossTime * dt * e.spd;
        e.y = H * BATTLE.crossY + Math.sin(e.age * 2) * 14;
      } else {
        e.y += (H + e.size * 2) / BATTLE.fallTime[e.role] * dt * e.spd;
        e.x = e.bx + Math.sin(e.age * BATTLE.swaySpeed + e.phase) * BATTLE.sway;
      }
      // 弾を撃つ（画面の上のほうにいる間だけ）
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 0 && e.y < H * 0.62) {
        e.fire = BATTLE.enemyFireInterval[e.role] * (0.8 + Math.random() * 0.4);
        fireAt(e.x, e.y + (e.ground ? 0 : e.h / 2), BATTLE.shotPattern[e.role] || [0]);
      }
    }

    // 雑魚の動き
    for (const f of fillers) {
      f.age += dt;
      f.flash = Math.max(0, f.flash - dt);
      const def = FILLER_TYPES[f.type];
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.escort) {
        if (f.escort.hp > 0 && enemies.includes(f.escort)) {
          f.x = f.escort.x + f.dx + Math.sin(f.age * 2 + f.dx) * 4;
          f.y = f.escort.y + f.dy;
        } else {
          f.escort = null;   // 守る相手がいなくなったら、ふつうの綿毛おばけになる
        }
      } else if (f.type === "ladybug") {
        f.x += f.dir * 115 * dt;
        f.y = f.y0 + Math.sin(f.x / 60) * 28 + f.age * 6;
        f.ang = Math.atan2(Math.cos(f.x / 60) * 28 / 60 * f.dir, f.dir);
      } else if (f.type === "bee") {
        if (f.tx === null) { f.tx = player.x; f.turn = H * rand(0.38, 0.5); }
        if (!f.back) {
          f.y += 230 * dt;
          f.x += (f.tx - f.x) * 2 * dt;
          if (f.y > f.turn) { f.back = true; f.vx = (f.x < W / 2 ? 1 : -1) * 160; }
        } else {
          f.y -= 90 * dt; f.x += f.vx * dt;
        }
      } else if (f.type === "ghost") {
        f.y += H / 16 * dt;
        f.x += Math.sin(f.age * 1.3) * 40 * dt;
      } else {
        f.y += sc * dt;     // 地上の雑魚は地面といっしょに流れる
      }
      if (def.fire) {
        f.fire -= dt;
        if (f.fire <= 0 && f.y > 0 && f.y < H * 0.68) {
          f.fire = def.fire * BATTLE.fillerFireScale * rand(0.8, 1.2);
          fireAt(f.x, f.y, def.spread || [0]);
        }
      }
    }

    // 自機の弾が空中の敵に当たったか（地上の敵には当たらない）
    // 雑魚に先に当たる（「雑魚のうしろ」の語句は、前の雑魚をどけないと弾が届かない）
    for (const s of shots) {
      let hit = false;
      for (const f of fillers) {
        if (f.layer !== "air" || f.hp <= 0 || f.delay > 0) continue;
        if (Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { hit = true; damageFiller(f); break; }
      }
      if (!hit) {
        for (const e of enemies) {
          if (e.ground || e.hp <= 0) continue;
          if (e.role === "boss" && e.age < BATTLE.bossEnterTime) continue;   // 大ボスは降りてくる間は当たらない
          if (Math.abs(s.x - e.x) < e.w / 2 + 4 && Math.abs(s.y - e.y) < e.h / 2) {
            if (e.parts && !partAt(e, s.x, 4)) continue;   // 砕けた文字のすきまは通りぬける
            hit = true; damageWord(e, s.x); break;
          }
        }
      }
      if (hit) s.y = -999;
    }
    enemies = enemies.filter(e => e.hp > 0);

    // 下へ抜けた語句の敵
    for (const e of enemies) {
      const gone = e.y > H + e.size || (e.pattern === "cross" && e.age > 1 && (e.x < -e.w / 2 - 20 || e.x > W + e.w / 2 + 20));
      if (e.role !== "boss" && gone) {
        e.hp = 0;
        combo = 0;
        if (e.last) missed.push(e.word);   // 2周目に逃がした語句は、このバトルではもう取れない
      }
    }
    enemies = enemies.filter(e => e.hp > 0);
    // 画面の外へ出た雑魚
    fillers = fillers.filter(f => f.hp > 0 && f.y < H + 40 && f.y > -200 && f.x > -80 && f.x < W + 80);

    // 綿のたね（体力が回復する）
    for (const it of items) {
      it.age += dt;
      it.y += (sc * 0.7 + 12) * dt;
      if (Math.hypot(it.x - player.x, it.y - player.y) < 28) {
        it.got = true;
        player.hp = Math.min(BATTLE.playerMaxHp, player.hp + BATTLE.healItem);
        player.glow = 0.3;
        Sound.se("item");
        addPop(it.x, it.y, "#fff8d0", 0.6);
      }
    }
    items = items.filter(it => !it.got && it.y < H + 20);

    // 敵の弾
    player.inv = Math.max(0, player.inv - dt);
    const R = ENEMY_BULLET_ART.radius;
    for (const b of ebullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (player.inv <= 0 && !showWord && Math.hypot(b.x - player.x, b.y - player.y) < R + 10) {
        b.y = H + 999;
        hurt();
      }
    }
    ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  }

  function fireAt(x, y, pattern) {
    const ang = Math.atan2(player.y - y, player.x - x);
    for (const da of pattern) {
      ebullets.push({ x, y, vx: Math.cos(ang + da) * BATTLE.enemyBulletSpeed, vy: Math.sin(ang + da) * BATTLE.enemyBulletSpeed });
    }
  }

  // 地上の的（地上の語句と、地上の雑魚）
  function groundTargets() {
    return enemies.filter(e => e.ground && e.hp > 0 && e.y > 0).concat(fillers.filter(f => f.layer === "ground" && f.hp > 0 && f.y > 0));
  }
  function inReach(g, x, y, r) {
    if (g.word) return Math.abs(x - g.x) < g.w / 2 + r && Math.abs(y - g.y) < g.h / 2 + r;
    return Math.hypot(x - g.x, y - g.y) < g.r + r;
  }
  // たねが地面に届いた: ぽんっと花が咲いて、まわりの地上の敵に当たる
  function landBomb(x, y) {
    addPop(x, y, "#ffffff", 1.1, true);
    Sound.se("pop");
    for (const g of groundTargets()) {
      if (!inReach(g, x, y, BATTLE.bombRadius * 0.6)) continue;
      if (g.word) damageWord(g, x); else damageFiller(g);
    }
  }

  // x の位置にある、まだ砕けていない文字（near: ゆるめる幅）
  function partAt(e, x, near) {
    return e.parts.find(p => !p.broken && Math.abs(x - (e.x + p.ox)) < p.cw / 2 + near);
  }

  function damageWord(e, hitX) {
    e.flash = 0.12;
    if (e.parts) {
      // 当たった文字（なければ、いちばん近い文字）を削る
      let p = hitX === undefined ? null : partAt(e, hitX, 0);
      if (!p) {
        const alive = e.parts.filter(q => !q.broken);
        const hx = hitX === undefined ? e.x : hitX;
        p = alive.sort((a, b) => Math.abs(hx - (e.x + a.ox)) - Math.abs(hx - (e.x + b.ox)))[0];
      }
      if (!p) return;
      p.hp--;
      p.flash = 0.12;
      if (p.hp > 0) { Sound.se("hit"); return; }
      // 文字が砕ける: その文字の読みが鳴る
      p.broken = true;
      breakPart(e, p);
      e.hp--;
      if (e.hp <= 0) defeat(e);
      return;
    }
    e.hp--;
    Sound.se("hit");
    if (e.hp <= 0) defeat(e);
  }

  function breakPart(e, p) {
    const px = e.x + p.ox;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 110;
      threads.push({ x: px, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 5 + Math.random() * 6,
        curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6, color: ENEMY_COLOR[e.role], age: 0, scatter: 9, sparkle: true });
    }
    floats.push({ x: px, y: e.y - e.size * 0.9, text: p.kana, big: true, kana: true, age: 0 });
    Sound.se("crack");
    if (p.kana !== "ー") Sound.speak(p.kana);
  }
  // 「記憶の光」: 画面の雑魚と敵の弾を全部消す。1周目は、出ている語句を全部「反応」させる
  // 2周目と大ボスのときは、語句には効かない（雑魚と敵の弾だけ）
  function useBomb() {
    gauge = 0;
    bombsUsed++;
    Sound.se("light");
    wave = { x: player.x, y: player.y, age: 0 };
    player.glow = 0.35;
    player.inv = Math.max(player.inv, 1);
    for (const f of fillers) {
      score += BATTLE.scoreFiller;
      addPop(f.x, f.y, "#fff8d8", 1, f.layer === "ground");
    }
    fillers = [];
    ebullets = [];
    if (phase === "round1") {
      bombing = true;
      for (const e of enemies) {
        if (e.role === "boss" || e.hp <= 0 || e.y < -e.size) continue;
        e.hp = 0;
        defeat(e);
      }
      enemies = enemies.filter(e => e.hp > 0);
      bombing = false;   // 反応させたぶんでは、ゲージはたまらない
    }
  }

  function comboMul() { return Math.min(1 + BATTLE.comboStep * Math.max(0, combo - 1), BATTLE.comboMax); }

  function damageFiller(f) {
    f.hp--;
    f.flash = 0.12;
    if (f.hp > 0) { Sound.se("hit"); return; }
    score += BATTLE.scoreFiller;
    floats.push({ x: f.x, y: f.y - 10, text: `+${BATTLE.scoreFiller}`, big: false, age: 0 });
    // 倒した雑魚は、ぽんっと花になる
    addPop(f.x, f.y, f.layer === "ground" ? "#f6c9d6" : "#fff2b8", 1, f.layer === "ground");
    Sound.se("pop");
    if (Math.random() < BATTLE.dropRate) items.push({ x: f.x, y: f.y, age: 0 });
  }

  // 花が咲くような小さな演出
  function addPop(x, y, color, scale, ground) {
    pops.push({ x, y, color, scale, ground: !!ground, age: 0 });
  }
  function updatePops(dt) {
    const sc = scrollSpeed();
    for (const p of pops) { p.age += dt; if (p.ground) p.y += sc * dt; }
    pops = pops.filter(p => p.age < 0.7);
  }

  // 語句を倒した
  function defeat(e) {
    // 語句を続けて倒すとコンボ（語句を下へ逃がすか、弾に当たると0にもどる）
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    const mul = comboMul();
    const pts = Math.round(BATTLE.scoreWord * mul);
    score += pts;
    floats.push({ x: e.x, y: e.y - e.size, text: `+${pts}` + (mul > 1 ? ` ×${mul}` : ""), big: true, age: 0 });
    const before = gauge;
    if (!bombing) gauge = Math.min(100, gauge + BATTLE.bombGain * mul);
    if (before < 100 && gauge >= 100) { floats.push({ x: bombButton().x + 40, y: bombButton().y - 34, text: "記憶の光 OK！", big: true, age: 0 }); Sound.se("item"); }
    if (!e.last) { firstPass(e); return; }
    absorb(e);
  }

  // 1周目: 吸い込まずに、光って消えるだけ。ふわりが反応する
  function firstPass(e) {
    vanish.push({ word: e.word, x: e.x, y: e.y, size: e.size, w: e.w, ground: e.ground, age: 0 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      threads.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 30,
        len: 3, curl: 0, rot: 0, color: "#ffe9a0", age: 0, scatter: 9, sparkle: true });
    }
    player.glow = 0.35;
    player.notice = 0.8;   // ふわりの「！」
    Sound.se("shine");
  }

  // 2周目・大ボス: 糸がほどけるように散って、自機へ吸い込まれる
  function absorb(e) {
    absorbed.push(e.word);
    const lv = POWER_LEVELS[Math.min(Math.floor(absorbed.length / BATTLE.powerEvery), POWER_LEVELS.length - 1)];
    if (lv !== level && absorbed.length < opts.total) {
      level = lv;
      banner = { text: "パワーアップ！", t: 1.2, color: "rgba(220,170,60,0.9)" };
      setTimeout(() => Sound.se("power"), 350);
    }
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
    Sound.speak(e.word.kana || e.word.word);   // 語句を読み上げる（仮: 端末の読み上げ機能）
    player.hp = Math.min(BATTLE.playerMaxHp, player.hp + BATTLE.healOnAbsorb);
    showWord = { word: e.word, t: BATTLE.wordShowTime };
    slow = BATTLE.slowTime;
    // 光が広がって、画面上の雑魚と敵の弾が全部消える
    wave = { x: e.x, y: e.y, age: 0 };
    fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
    fillers = [];
    ebullets = [];
    if (e.role === "boss") {
      // 大ボスを吸い込んだらバトル終了。残っている雑魚はみんな花になる
      enemies.forEach(x => (x.hp = 0));
      fillers.forEach(f => addPop(f.x, f.y, "#fff2b8", 1, f.layer === "ground"));
      fillers = []; ebullets = []; bombs = [];
      state = "clear";
      stateTimer = 2;
      banner = null;
    }
  }

  function updateThreads(dt) {
    for (const th of threads) {
      th.age += dt;
      th.rot += th.curl * dt * 4;
      if (th.sparkle) {               // 1回目の光の粒: その場で散って消える
        th.x += th.vx * dt; th.y += th.vy * dt; th.vx *= 0.92; th.vy *= 0.92;
        if (th.age > 0.7) th.done = true;
        continue;
      }
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
    hits++;
    combo = 0;
    shake = 0.25;
    Sound.se("damage");
    if (player.hp <= 0) {
      player.hp = 0;
      state = "down";
      downs++;
      stateTimer = BATTLE.reviveDelay;
      ebullets = [];
    }
  }

  // やられたあと: 止めていた台本の同じところからつづける（出ていた語句もそのまま）
  function revive() {
    player.hp = BATTLE.playerMaxHp;
    player.inv = BATTLE.invincibleTime;
    state = "play";
  }

  // ===== 描く =====
  // 描く順番: 地面 → 地上の敵 → 照準 → 空中のものの影 → 空中の敵 → 弾 → 自機 → 文字
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake / 0.25, (Math.random() - 0.5) * 10 * shake / 0.25);

    drawTerrain();

    // 地上の花（たねが咲いたあと）
    for (const p of pops) if (p.ground) drawPop(p);
    // 地上の雑魚と、地上の語句
    for (const f of fillers) if (f.layer === "ground") drawFiller(f);
    for (const e of enemies) if (e.ground) drawGroundWord(e);
    // 落ちていくたね
    for (const b of bombs) drawBomb(b);
    // 照準
    if (state === "play") drawReticle();

    // 雲の影（地面の上を流れる）
    ctx.fillStyle = "rgba(70,90,50,0.07)";
    for (const c of cloudShadows) { ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2); ctx.fill(); }

    // 空中のものの影（右下にずらして、浮いているように見せる）
    ctx.fillStyle = "rgba(60,80,40,0.16)";
    for (const f of fillers) if (f.layer === "air" && !(f.delay > 0)) { ctx.beginPath(); ctx.ellipse(f.x + 16, f.y + 26, f.r * 0.9, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const it of items) { ctx.beginPath(); ctx.ellipse(it.x + 8, it.y + 14, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(player.x + 20, player.y + 34, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

    // 綿のたね（体力回復）
    for (const it of items) drawItem(it);

    // 自機の弾（小さな光のつぶ）
    ctx.fillStyle = "#fff9d6";
    ctx.strokeStyle = "#e8cf7a";
    ctx.lineWidth = 1.5;
    for (const s of shots) { ctx.beginPath(); ctx.ellipse(s.x, s.y, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

    // 空中の雑魚
    for (const f of fillers) if (f.layer === "air") drawFiller(f);

    // 空中の語句の敵
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of enemies) {
      if (e.ground) continue;
      ctx.font = font(e.size);
      const alpha = e.role === "boss" && e.age < BATTLE.bossEnterTime ? 0.55 : 1;   // 降りてくる間はうすく（まだ当たらない）
      const wob = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
      // 影
      ctx.fillStyle = "rgba(60,80,40,0.16)";
      ctx.fillText(e.word.word, e.x + 14, e.y + 22);
      drawWordText(e, e.x + wob, e.y, alpha);
      ctx.globalAlpha = alpha;
      drawHpDots(e);
      ctx.globalAlpha = 1;
    }

    // 1回目に倒した語句: 光ってふわっと上へ消える
    for (const v of vanish) {
      const k = v.age / 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(v.size * (1 + k * 0.3));
      ctx.shadowColor = "rgba(255,240,180,1)"; ctx.shadowBlur = 20;
      ctx.fillStyle = "#fffbe8";
      ctx.fillText(v.word.word, v.x, v.y - k * 20);
      ctx.restore();
    }

    // 空の花（空中の雑魚が咲いたあと）
    for (const p of pops) if (!p.ground) drawPop(p);

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

    // 吸い込んだときに広がる光
    if (wave) {
      const k = wave.age / 0.6, R = Math.hypot(W, H) * k;
      const g = ctx.createRadialGradient(wave.x, wave.y, R * 0.6, wave.x, wave.y, R);
      g.addColorStop(0, "rgba(255,250,215,0)");
      g.addColorStop(0.8, `rgba(255,248,200,${0.55 * (1 - k)})`);
      g.addColorStop(1, "rgba(255,250,215,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    // いちばん上を舞う綿毛
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const f of fluff) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
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
    // 浮かぶ点数
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const fl of floats) {
      ctx.globalAlpha = 1 - fl.age / 0.9;
      ctx.font = font(fl.kana ? 22 : (fl.big ? 18 : 12));
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      ctx.strokeText(fl.text, fl.x, fl.y - fl.age * 30);
      ctx.fillStyle = fl.kana ? "#5d6b4c" : (fl.big ? "#c98a1e" : "#8a9a78");   // 砕けた文字の読みは、ふりがなの色
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 30);
    }
    ctx.globalAlpha = 1;
    drawHud();
    drawBombButton();
    // 操作のヒント（まだ動かしていないとき）
    if (!moved && state !== "clear") {
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(16);
      ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
      const hy = Math.min(H - 24, player.y + 54);
      ctx.strokeText("← ゆびでドラッグしてうごかそう →", W / 2, hy);
      ctx.fillStyle = "#48693a";
      ctx.fillText("← ゆびでドラッグしてうごかそう →", W / 2, hy);
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();

    // 吸い込んだ語句を画面中央に大きく（読み仮名つき）
    if (showWord) drawBigWord(showWord.word, showWord.t);

    // 状態の文字
    if (state === "intro") centerText(opts.stageName, "1周目　ことばを見つけよう");
    if (state === "down") centerText("やられた…", `${Math.ceil(stateTimer)}秒後に再開`);
    if (state === "clear") centerText(`${absorbed.length}語あつまった！`, `${score}点　タイム ${fmtTime(t)}`);
    if (paused) {
      ctx.fillStyle = "rgba(248,243,228,0.85)";
      ctx.fillRect(0, 0, W, H);
      centerText("ひとやすみ中", "画面をタップするとつづきから");
    }
  }

  // 地面: 草地のうえに、畑・花・小川・あぜ道
  function drawTerrain() {
    ctx.fillStyle = "#dcebc4";
    ctx.fillRect(-10, -10, W + 20, H + 20);
    for (const s of terrain) {
      const y = s.y;
      if (s.kind === "field") {
        ctx.fillStyle = "#e8dcbc";
        roundRect(s.x0, y + 8, s.x1 - s.x0, SEG_H - 16, 18); ctx.fill();
        ctx.strokeStyle = "#d8c9a2"; ctx.lineWidth = 6; ctx.lineCap = "round";
        for (let yy = y + 26; yy < y + SEG_H - 16; yy += 22) { ctx.beginPath(); ctx.moveTo(s.x0 + 14, yy); ctx.lineTo(s.x1 - 14, yy); ctx.stroke(); }
        for (const d of s.deco) {   // 綿の実
          ctx.fillStyle = "#7fa85a"; ctx.beginPath(); ctx.arc(d.x, y + d.y + 3, d.r * 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r * 0.6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.kind === "meadow") {
        for (const d of s.deco) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, y + d.y, 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (s.kind === "creek") {
        ctx.strokeStyle = "#c4e0e4"; ctx.lineWidth = 34; ctx.lineCap = "round";
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 16) { const yy = y + s.cy + Math.sin(x / 55 + s.ph) * 18; x === -20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 16) { const yy = y + s.cy - 4 + Math.sin(x / 55 + s.ph) * 18; x === -20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#efe4c8"; ctx.lineWidth = 26; ctx.lineCap = "round";
        ctx.beginPath();
        for (let yy = 0; yy <= SEG_H; yy += 20) { const xx = s.px + Math.sin(yy / 60 + s.ph) * 30; yy === 0 ? ctx.moveTo(xx, y + yy) : ctx.lineTo(xx, y + yy); }
        ctx.stroke();
        ctx.fillStyle = "#cfe3b3";
        for (const d of s.deco) { ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  // 照準◎（自機の前の地面）。地上の敵が入ると色が変わる
  function drawReticle() {
    const x = player.x, y = player.y - BATTLE.bombRange, r = BATTLE.lockRadius;
    ctx.save();
    ctx.globalAlpha = lock ? 0.95 : 0.55;
    ctx.strokeStyle = lock ? "#d0607f" : "#6f9a4a";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawBomb(b) {
    const k = Math.min(1, b.age / BATTLE.bombFlight);
    const x = b.sx + (b.tx - b.sx) * k, y = b.sy + (b.ty - b.sy) * k;
    const r = 7 - k * 3;   // 地面に近づくほど小さく（落ちていく感じ）
    ctx.fillStyle = "rgba(60,80,40,0.18)";
    ctx.beginPath(); ctx.arc(b.tx, b.ty, 4 + k * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9a7650";
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, k * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  // 花がひらく（倒したとき・たねが落ちたとき）
  function drawPop(p) {
    const k = p.age / 0.7;
    const r = (8 + k * 22) * p.scale;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = p.color;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + k;
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * r * 0.6, p.y + Math.sin(a) * r * 0.6, r * 0.35, r * 0.2, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#f3d27a";
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawItem(it) {
    const y = it.y + Math.sin(it.age * 5) * 2;
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(it.age * 8) * 0.3;
    const gr = ctx.createRadialGradient(it.x, y, 2, it.x, y, 18);
    gr.addColorStop(0, "rgba(255,250,210,0.9)"); gr.addColorStop(1, "rgba(255,250,210,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(it.x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 金色のたねに、緑の葉っぱ（敵の弾とまちがえないように色を変える）
    ctx.fillStyle = "#7fbf4f";
    ctx.beginPath(); ctx.ellipse(it.x + 5, y - 8, 6, 3, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f5cf5a"; ctx.strokeStyle = "#d8a93a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(it.x, y, 7, 9, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(it.x - 2, y - 3, 2, 0, Math.PI * 2); ctx.fill();
  }

  // 雑魚の絵（仮）
  function drawFiller(f) {
    if (f.delay > 0) return;
    const { x, y } = f;
    const r = FILLER_TYPES[f.type].r;
    ctx.save();
    ctx.globalAlpha = BATTLE.fillerAlpha;
    ctx.translate(x, y);
    ctx.scale(BATTLE.fillerScale, BATTLE.fillerScale);
    if (f.flash > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
    const lit = f.flash > 0;
    if (f.type === "ladybug") {
      ctx.rotate((f.ang || 0) + (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillStyle = "rgba(255,255,255,0.7)";   // はね
      ctx.beginPath(); ctx.ellipse(-8, 2, 8, 4, 0.5 + Math.sin(t * 40) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 2, 8, 4, -0.5 - Math.sin(t * 40) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#ffb3a8" : "#e86f5f";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4b3a35";
      ctx.beginPath(); ctx.arc(0, -r * 0.75, r * 0.4, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy] of [[-4, -2], [4, -2], [-4, 5], [4, 5]]) { ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (f.type === "bee") {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.ellipse(-7, -8, 7, 4, -0.6 + Math.sin(t * 45) * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -8, 7, 4, 0.6 - Math.sin(t * 45) * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#fff0a8" : "#f2c84b";
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6b5232";
      ctx.fillRect(-r * 0.62, -2, r * 1.24, 3); ctx.fillRect(-r * 0.55, 4, r * 1.1, 3);
      ctx.beginPath(); ctx.arc(-3, -6, 1.5, 0, Math.PI * 2); ctx.arc(3, -6, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === "ghost") {
      ctx.fillStyle = lit ? "#fff6c8" : "#ffffff";
      ctx.strokeStyle = "#d6dcc8"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + t;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6c7562";
      ctx.beginPath(); ctx.arc(-4, -1, 2, 0, Math.PI * 2); ctx.arc(4, -1, 2, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === "weed") {
      ctx.fillStyle = "rgba(90,110,60,0.25)";
      ctx.beginPath(); ctx.ellipse(0, 4, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = lit ? "#b8dc8c" : "#5e8a3a"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + Math.sin(t * 2 + i) * 0.2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a + 0.6) * r, Math.sin(a + 0.6) * r, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = "#4b6b2e";
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-2, -1, 1.4, 0, Math.PI * 2); ctx.arc(2, -1, 1.4, 0, Math.PI * 2); ctx.fill();
    } else {   // thorn
      ctx.fillStyle = "rgba(90,110,60,0.25)";
      ctx.beginPath(); ctx.ellipse(0, 5, r * 1.05, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#a7c88a" : "#557a41";
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.7 : r;
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f2a7bd";
      for (const [dx, dy] of [[-5, -4], [6, 2], [-1, 7]]) { ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    // 硬い雑魚は、のこりの硬さを小さな点で
    if (FILLER_TYPES[f.type].hp > 1 && f.hp < FILLER_TYPES[f.type].hp) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < f.hp; i++) { ctx.beginPath(); ctx.arc(x - (f.hp - 1) * 4 + i * 8, y - f.r - 6, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  // 地上の語句: 畑にうまった土の盛り上がりの上に文字
  // 語句の文字: 光る縁取りと、漢字の上に小さくふりがな
  // 吸い込める回（最後の回）は金色に光る。それより前は白く光る
  function drawWordText(e, x, y, alpha) {
    const word = e.word;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(e.size);
    ctx.lineJoin = "round";
    const pulse = 0.6 + Math.sin(t * 5 + e.phase) * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = e.last ? `rgba(255,214,90,${0.7 + pulse * 0.3})` : "rgba(255,255,255,0.95)";
    ctx.shadowBlur = e.last ? 10 + pulse * 8 : 10;
    ctx.lineWidth = 8;
    ctx.strokeStyle = e.flash > 0 ? "#fff6c8" : (e.last ? "#fff6d8" : "#ffffff");
    if (e.parts) {
      for (const p of e.parts) if (!p.broken) ctx.strokeText(p.ch, x + p.ox, y);
    } else {
      ctx.strokeText(word.word, x, y);
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ENEMY_COLOR[e.role];
    if (e.parts) {
      for (const p of e.parts) {
        const px = x + p.ox;
        if (p.broken) {   // 砕けた文字は、うすい形だけ残す
          ctx.save(); ctx.globalAlpha = alpha * 0.15; ctx.fillText(p.ch, px, y); ctx.restore();
          continue;
        }
        const wob = p.flash > 0 ? (Math.random() - 0.5) * 3 : 0;
        ctx.fillText(p.ch, px + wob, y);
        // 文字ごとの残りの耐久（小さな帯）
        if (p.hp < p.maxHp) {
          const bw = p.cw * 0.7;
          ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(px - bw / 2, y + e.size / 2 + 3, bw, 3);
          ctx.fillStyle = ENEMY_COLOR[e.role]; ctx.fillRect(px - bw / 2, y + e.size / 2 + 3, bw * p.hp / p.maxHp, 3);
        }
        ctx.fillStyle = ENEMY_COLOR[e.role];
      }
    } else {
      ctx.fillText(word.word, x, y);
    }
    if (hasKanji(word.word)) {
      ctx.font = font(BATTLE.kanaSize);
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      const ky = y - e.size / 2 - BATTLE.kanaSize / 2 - 1;
      ctx.strokeText(word.kana, x, ky);
      ctx.fillStyle = "#5d6b4c";
      ctx.fillText(word.kana, x, ky);
    }
    ctx.globalAlpha = 1;
  }

  function drawGroundWord(e) {
    const wob = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
    ctx.fillStyle = "#c9ab7f";
    roundRect(e.x - e.w / 2 - 14, e.y - e.h / 2 - 6, e.w + 28, e.h + 12, 16); ctx.fill();
    ctx.fillStyle = "#dcc297";
    roundRect(e.x - e.w / 2 - 10, e.y - e.h / 2 - 4, e.w + 20, e.h + 4, 14); ctx.fill();
    // 小さな芽
    ctx.fillStyle = "#7fae55";
    ctx.beginPath(); ctx.ellipse(e.x + e.w / 2 + 6, e.y - e.h / 2 - 4, 5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    drawWordText(e, e.x + wob, e.y, 1);
    drawHpDots(e);
    // 地上のかげ: 木のかげが語句の上にかかっていて、見えにくい
    const cx = e.x - e.w * 0.25, cy = e.y - e.h * 0.3;
    ctx.fillStyle = "rgba(60,90,45,0.32)";
    ctx.beginPath(); ctx.ellipse(cx, cy, e.w * 0.55, e.h * 0.95, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(110,150,80,0.55)";
    for (const [dx, dy, r] of [[-0.45, -0.7, 0.22], [-0.15, -0.95, 0.26], [0.15, -0.75, 0.2], [-0.6, -0.25, 0.18]]) {
      ctx.beginPath(); ctx.arc(cx + dx * e.w * 0.6, cy + dy * e.h, r * e.w * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 中ボス・大ボスは硬さを小さな丸で表示
  function drawHpDots(e) {
    if (e.parts || e.maxHp <= 1) return;   // 1文字ずつ壊す敵は、文字ごとの帯で出す
    const n = e.maxHp, gap = 10, x0 = e.x - (n - 1) * gap / 2;
    const dy = e.y - e.h / 2 - 10 - (hasKanji(e.word.word) ? BATTLE.kanaSize + 4 : 0);   // ふりがなより上に出す
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(x0 + i * gap, dy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i < e.hp ? ENEMY_COLOR[e.role] : "rgba(0,0,0,0.12)";
      ctx.fill();
    }
  }

  function drawBanner() {
    const total = banner.total || (banner.total = banner.t);
    const a = Math.min(1, banner.t / 0.3, (total - banner.t) / 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const y = H * 0.42;
    ctx.fillStyle = banner.color || "rgba(196,87,122,0.88)";
    ctx.fillRect(0, y - 30, W, 60);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let size = 28;
    ctx.font = font(size);
    while (ctx.measureText(banner.text).width > W - 24 && size > 18) { size -= 2; ctx.font = font(size); }
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
    if (player.notice > 0) {   // 1回目の語句に反応した「！」
      ctx.font = font(16); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff"; ctx.strokeText("！", fx + 2, fy - 24);
      ctx.fillStyle = "#e0a93a"; ctx.fillText("！", fx + 2, fy - 24);
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
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(12, top, 130, 16, 8); ctx.fill();
    const rate = player.hp / BATTLE.playerMaxHp;
    ctx.fillStyle = rate > 0.4 ? "#8cbf5a" : (Math.floor(t * 4) % 2 ? "#e39a8e" : "#f2c4bb");
    roundRect(14, top + 2, 126 * rate, 12, 6); ctx.fill();
    ctx.font = font(12);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineJoin = "round";
    const lvNo = POWER_LEVELS.indexOf(level) + 1;
    const lvText = `たいりょく　パワー${"★".repeat(lvNo)}`;
    ctx.strokeText(lvText, 14, top + 20);
    ctx.fillStyle = "#4b5e3a";
    ctx.fillText(lvText, 14, top + 20);
    // 点数とコンボ（まん中）
    ctx.textAlign = "center";
    ctx.font = font(16);
    ctx.strokeText(String(score), W / 2, top);
    ctx.fillText(String(score), W / 2, top);
    if (combo >= 2) {
      ctx.font = font(12);
      ctx.fillStyle = "#c98a1e";
      const ct = `コンボ ${combo}　×${comboMul()}`;
      ctx.strokeText(ct, W / 2, top + 20);
      ctx.fillText(ct, W / 2, top + 20);
      ctx.fillStyle = "#4b5e3a";
    }
    // 集めた語句の数
    ctx.textAlign = "right";
    ctx.font = font(18);
    ctx.strokeText(`${absorbed.length} / ${opts.total} 語`, W - 14, top);
    ctx.fillText(`${absorbed.length} / ${opts.total} 語`, W - 14, top);
    ctx.font = font(12);
    const ph = { round1: "1周目", round2: "2周目", boss: "大ボス" }[phase] || "";
    ctx.strokeText(`${ph}　${fmtTime(t)}`, W - 14, top + 24);
    ctx.fillText(`${ph}　${fmtTime(t)}`, W - 14, top + 24);
    drawStrip(top + 42);
  }

  // 「記憶の光」のボタン: ふわりマークのまわりにゲージ。満タンで光る
  function drawBombButton() {
    const b = bombButton(), full = gauge >= 100;
    ctx.save();
    if (full) {
      const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r * 1.8);
      g.addColorStop(0, `rgba(255,240,170,${0.5 + Math.sin(t * 6) * 0.3})`); g.addColorStop(1, "rgba(255,240,170,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,253,245,0.85)";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = full ? "#e0b03a" : "#8cbf5a"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * gauge / 100); ctx.stroke();
    // ふわりマーク（小さなタオル）
    ctx.fillStyle = full ? "#fff4cf" : "#fffdf7"; ctx.strokeStyle = full ? "#dcb64e" : "#c9d9b4"; ctx.lineWidth = 2;
    roundRect(b.x - 11, b.y - 9, 22, 18, 5); ctx.fill(); ctx.stroke();
    ctx.font = font(10); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff";
    ctx.strokeText(full ? "タップ" : "記憶の光", b.x, b.y - b.r - 7);
    ctx.fillStyle = full ? "#b0801a" : "#7a8a68";
    ctx.fillText(full ? "タップ" : "記憶の光", b.x, b.y - b.r - 7);
    ctx.restore();
  }

  // 「集めたことば」の帯: 吸い込んだ語句が順にならんでいく
  function drawStrip(y0) {
    const pad = 8, rowH = 22, x0 = 10, maxX = W - 10;
    ctx.font = font(12);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const rows = Math.max(1, BATTLE.stripRows);
    ctx.fillStyle = "rgba(255,253,245,0.6)";
    roundRect(x0 - 4, y0 - 4, maxX - x0 + 8, rows * rowH + 6, 10); ctx.fill();
    ctx.fillStyle = "#7a8a68";
    let x = x0 + 2, row = 0;
    const label = "集めたことば";
    ctx.fillText(label, x, y0 + rowH / 2 - 1);
    x += ctx.measureText(label).width + 8;
    absorbed.forEach((w, i) => {
      const tw = ctx.measureText(w.word).width + pad * 2;
      if (x + tw > maxX) { row++; x = x0 + 2; }
      if (row >= rows) return;   // 入りきらない分は出さない
      const y = y0 + row * rowH;
      const isNew = i === absorbed.length - 1 && showWord;
      ctx.fillStyle = isNew ? "#fff3c4" : "#ffffff";
      ctx.strokeStyle = ENEMY_COLOR[w.role]; ctx.lineWidth = 1.5;
      roundRect(x, y + 1, tw, rowH - 4, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ENEMY_COLOR[w.role];
      ctx.fillText(w.word, x + pad, y + rowH / 2 - 1);
      x += tw + 5;
    });
  }

  function drawBigWord(word, remain) {
    const a = Math.min(1, remain / 0.15, (BATTLE.wordShowTime - remain) / 0.08 + 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const showKana = hasKanji(word.word);
    let size = 52;
    ctx.font = font(size);
    while (ctx.measureText(word.word).width > W - 60 && size > 24) { size -= 2; ctx.font = font(size); }
    const w = Math.max(ctx.measureText(word.word).width, 160) + 48;
    const h = size + (showKana ? 56 : 36);
    const cy = H * 0.45;
    ctx.fillStyle = "rgba(255,253,245,0.95)";
    ctx.strokeStyle = "#cfe0b6";
    ctx.lineWidth = 3;
    roundRect(W / 2 - w / 2, cy - h / 2, w, h, 22);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (showKana) {
      ctx.font = font(20);
      ctx.fillStyle = "#6b7a5a";
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

  function fmtTime(sec) { return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; }

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
