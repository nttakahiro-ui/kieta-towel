// バトル（縦スクロールのシューティング）
// 空中と地上の2つの層がある
//   空中の敵 … 自機の弾（自動で連射）で倒す
//   地上の敵 … 自機の前にある照準◎に入ると、自動で「たね」を落として倒す
// 主役は語句の敵。バトルは「1周目 → 2周目 → 大ボス」の台本で進む（出る順番・出方・時刻はデータで固定）
//   1周目「出撃1 探検（たんけん）」… 大ボス以外の語句が決まった順に出る。倒すと、ふわりが反応して光って消えるだけ（吸い込まない）
//   2周目「出撃2 本番（あつめる）」… 同じ語句が同じ順番・同じ出方で出る。倒すと、糸のようにほどけて吸い込まれる（クイズに出る）
//   出撃の始まりには「出撃1 探検」「出撃2 本番」の画面を出し、タップで出撃する。出撃1が終わると一度止まる
//            取り逃がした語句は、そのバトルでは取れない
//   大ボス … 2周目のあとに1回。倒して吸い込むとバトル終了
// お題バトル（BATTLE.odai が true のとき）: 2周目の中ボスと大ボスは、ふわりがお題（クイズの問題）を出し、
//   3つの語句（本物1つ・同じステージの別の語句2つ）から本物を撃つ。ダミーは弾がはね返る
// 雑魚（語句ではない敵）は小さく薄く。倒すとぽんっと花になり、ときどき体力が回復する「綿のたね」を落とす

// ===== 調整用の数値（速さ・弾の量・硬さなど）はここにまとめる =====
const BATTLE = {
  // --- 台本（2周＋大ボス） ---
  roundInterval1: 3.2,         // 探検（出撃1）で語句が出てくる間隔（秒）
  roundInterval2: 3.6,         // 本番（出撃2）で語句が出てくる間隔（秒）
  round1Speed: 1.4,            // 探検の語句の動く速さの倍率（探検は速く流す）
  roundGap: 2.5,               // 周と周のあいだの秒数（帯を出す）
  firstSpawnDelay: 2.2,        // 始まってから最初の語句が出るまで（秒）
  fallTime: { zako: 10, mid: 12.5 }, // 空中の語句が画面の上から下まで降りる秒数（大きいほどゆっくり）。10/7に10/6の前とあとの中間にした
  edgeFallTime: 13.5,          // 「端にかくれる」語句が降りる秒数
  crossTime: 6,                // 「横切る」語句が画面を横切る秒数
  crossY: 0.2,                 // 「横切る」語句が通る高さ（画面の高さに対する割合）
  escortCount: 4,              // 「雑魚のうしろ」の語句を守る雑魚の数
  kanaSize: 13,                // 敵の語句の上に出すふりがなの大きさ（px）
  zakoAppearTime: 1,           // ザコの語句が画面に全部入ってから、止まって光る秒数（この間は撃てない。「来た」とわかる）
  bossStopY: 0.22,             // 大ボスが止まる高さ（画面の高さに対する割合）
  bossEnterTime: 3,            // 大ボスが止まる位置まで降りてくる秒数（この間は弾が当たらない）
  sway: 16,                    // 空中の語句の左右の振れ幅（px）
  swaySpeed: 0.9,              // 左右に振れる速さ
  bossSway: 0.28,              // 大ボスの左右の動き（画面の幅に対する割合）
  fontSize: { zako: 26, mid: 30, boss: 36 },   // 敵の文字の大きさ（px）。24以上
  shortScale: 1.3,             // 1〜2文字の短い語句は、文字をこの倍率で大きく出す
  wordTotalHp: { mid: 12, boss: 60 },          // 中ボス・大ボスの「語句全体の硬さ」。文字数で割って1文字あたりの耐久にする（難易度の倍率もかかる）
  perCharHp: { mid: { min: 2, max: 6 }, boss: { min: 6, max: 30 } },   // 1文字あたりの耐久の下限と上限
  enemyFireInterval: { zako: 3.4, mid: 2.4, boss: 1.4 },  // 語句の敵が弾を撃つ間隔（秒）
  enemyBulletSpeed: 95,        // 敵の弾の速さ（px/秒）。難易度では変えない（難しさは意地の悪い語句で作る）
  enemyBulletSize: 11,         // 敵の弾の見た目の大きさ（半径 px）。大きく見やすく
  enemyBulletHitR: 6,          // 敵の弾の当たりの大きさ（半径 px）。見た目より小さく、避けやすく
  hpOverride: { zako: 0, mid: 0, boss: 0 },   // 0 のときは自動。0より大きいと、ザコはこの硬さ、中ボス・大ボスは1文字あたりこの耐久にする
  shotPattern: { zako: [0], mid: [-0.18, 0.18], boss: [-0.25, 0, 0.25] },   // 語句の敵の弾の向き（自機をねらう向きからのずれ）

  // --- 雑魚 ---
  fillerInterval: 3,           // 雑魚の群れが出てくる間隔（秒）。10/7に10/6の前とあとの中間にした（本番での値。坂の倍率がかかる）
  fillerMax: 11,               // 同時に出ている雑魚の最大数（本番での値。坂の倍率がかかる）
  fillerSpeed: 0.83,           // 雑魚の動く速さの倍率（1＝10/6の速さ）
  fillerScale: 0.8,            // 雑魚の大きさの倍率（語句より目立たないように小さく）
  fillerAlpha: 0.72,           // 雑魚の濃さ（1でふつう。小さいほど薄い）
  fillerAvoid: 90,             // 語句のまわり、この距離（px）には雑魚を出さない
  fillerFireScale: 1.5,         // 雑魚が撃つ間隔の倍率（大きいほど撃たない）
  dropRate: 0.15,              // 雑魚が「綿のたね」を落とす確率（0〜1）。雑魚が増えたので下げた
  popScale: 1.6,               // 雑魚を倒したときの花の大きさ
  healItem: 8,                 // 綿のたねで回復する体力

  // --- 地上 ---
  scrollTime: 11.5,            // 地面が画面の高さぶん流れる秒数（大きいほどゆっくり）
  bombRange: 170,              // 照準◎の位置（自機からどれだけ前か、px）
  lockRadius: 26,              // 照準◎の大きさ（この中に地上の敵が入ると、たねを落とす）
  bombInterval: 0.15,          // たねを落とす間隔（秒）。ザコの語句が硬くなるたびに短くしている（0.3 → 0.22 → 0.15）
  bombFlight: 0.4,             // たねが地面に届くまでの秒数
  bombRadius: 36,              // たねが当たる広さ（px）

  // --- 強さ（1945型） ---
  powerEvery: 3,               // 語句を何語吸い込むごとに1段階強くなるか

  // --- 得点 ---
  scoreFiller: 100,            // 雑魚を倒した点
  scoreWord: 1000,             // 語句を倒した点（雑魚の10倍）
  comboStep: 0.5,              // 語句を続けて倒すたびに増える倍率（1 → 1.5 → 2 …）
  comboMax: 3,                 // コンボ倍率のいちばん上

  // --- お題バトル（2周目の中ボス2回と大ボス1回） ---
  odai: true,                  // お題バトルのスイッチ（true＝オン、false＝オフ。オフで今までの中ボス・大ボス戦）
  odaiIntroTime: 2.5,          // 始まりのスローと、問題文を画面中央に大きく出す秒数（この間は弾が当たらない）。10/8に2.5秒に
  odaiBigFont: 34,             // 問題文を画面中央に出すときの文字の大きさのいちばん上（px）。長い問題は3行に収まるまで小さくする
  odaiSmallFont: 20,           // 問題文を上の帯の下に移したあとの文字の大きさのいちばん上（px）。同じく3行に収まるまで小さくする
  odaiMaxLines: 3,             // 問題文の行数の上限
  odaiMinFont: 12,             // 問題文の文字の大きさのいちばん下（px）
  odaiTimeLimit: 20,           // 中ボスのお題の制限時間（秒）。時間切れは取り逃がし。大ボスは制限なし
  odaiPenalty: 300,            // ダミーに当てたときの減点（コンボは切らない）
  odaiPenaltyCool: 1,          // 同じダミーで続けて減点しない秒数（連射で何度も減らないように）
  odaiBonus: 2000,             // 最初に当てたのが本物なら「ひらめき」ボーナス
  odaiColumns: [0.2, 0.5, 0.8], // 3つの語句をならべる列の位置（画面の幅に対する割合）。縦書きで動かさない

  // --- バトルの中の坂（探検 → 本番 → 大ボスで、だんだん濃くなる） ---
  // filler: 雑魚の量の倍率（大きいほど多い）、fire: 敵の弾の量の倍率（大きいほど多い）
  ramp: {
    round1: { filler: 0.5, fire: 0.6 },   // 探検: 雑魚少なめ・弾少なめ
    round2: { filler: 1,   fire: 1 },     // 本番
    boss:   { filler: 1.3, fire: 1.2 },   // 大ボス: いちばん濃い
  },

  // --- 本番に持っていくもの（出撃2の前に3つから1つ選ぶ） ---
  choiceTime: 10,              // 選ぶ時間（秒）。選ばなければ「つよい弾」になる
  bigBombMul: 2,               // 「大きな記憶の光」のときの、ゲージのたまる速さの倍率

  // --- 障害物（data/stages.js の obstacles） ---
  shadeHoldY: 0.2,             // 「木のかげ」の語句が止まって待つ高さ（画面の高さに対する割合）
  guideSlow: 1,                // 木のよけ方の案内のときに、ゆっくりになる秒数
  guideTime: 2.4,              // 木のよけ方の案内（矢印）を出す秒数
  shadeWait: 2.5,              // 「木のかげ」の語句が、木が去ってから待つ秒数（そのあと降りてくる）

  // --- 「記憶の光」ボム ---
  bombGain: 12,                // 語句を倒したときにたまるゲージ（×コンボ倍率）。100で満タン
  bombButtonR: 26,             // 画面左下のふわりマーク（ボムのボタン）の大きさ（px）

  // --- 難易度 ---
  // data/stages.js の difficulty（1〜12）から、次の数値が自動で決まる。
  // at1 が難易度1のときの値、at12 が難易度12のときの値。そのあいだはまっすぐの線でつなぐ
  // ステージごとの手上書きは data/stages.js の override 欄
  difficulty: {
    fireScale:   { at1: 1,   at12: 0.5 },   // 敵が撃つ間隔の倍率（小さいほど弾が多い）
    speedScale:  { at1: 1,   at12: 1.4 },   // 敵（語句と敵の弾）の速さの倍率
    zakoHp:      { at1: 5,   at12: 6.5 },   // ザコの語句の硬さ（四捨五入）。10/3-4に5発にした（世界1は5発）
    bossHpScale: { at1: 1,   at12: 2 },     // 中ボス・大ボスの1文字あたりの耐久の倍率
    tricky:      { at1: 1,   at12: 6.2 },   // 意地の悪い語句（端にかくれる・雑魚のうしろ・横切る）の数（四捨五入。patterns が "auto" のステージだけ）
  },
  autoGroundCount: 2,          // patterns が "auto" のステージで、地上（地上のかげ）に出すザコの語句の数

  debugInvincible: false,      // デバッグ: 自機が弾に当たらない

  // --- 自機 ---
  shotInterval: 0.11,          // 自機の弾の間隔（秒）
  shotSpeed: 640,              // 自機の弾の速さ（px/秒）
  playerMaxHp: 100,            // 体力
  damage: 20,                  // 敵の弾に当たったときに減る体力
  healOnAbsorb: 12,            // 語句を吸い込んだときに回復する体力
  invincibleTime: 1.3,         // 当たったあと、しばらく無敵になる秒数
  lives: 3,                    // 残機（1945型）。体力ゼロで1機失い、画面の下から復活。全部失うと本番の最初からやり直し
  respawnRise: 0.6,            // 復活のとき、画面の下から上がってくる秒数
  respawnInv: 2,               // 復活したあと、無敵で点滅する秒数
  wordShowTime: 1.5,           // 吸い込んだ語句を画面中央に大きく出す秒数（この間は弾が当たらない）
  fuwariSayTime: 3,            // 周の始まりの、ふわりの一言を出す秒数
  slowTime: 0.3,               // 吸い込む瞬間に画面全体がゆっくりになる秒数
  slowScale: 0.25,             // ゆっくりのときの速さ（1でふつう、小さいほどゆっくり）
  stripWidth: 24,              // 左端の「集めたことば」の縦の帯の幅（px。縦書き1文字分ほど）
};

// ===== 雑魚の種類 =====
// layer: "air"（空中・弾で倒す）/ "ground"（地上・たねで倒す）
// hp: 硬さ、r: 当たりの大きさ、fire: 弾を撃つ間隔（秒・0なら撃たない）、spread: 弾の向き
const FILLER_TYPES = {
  ladybug: { layer: "air",    hp: 1, r: 13, fire: 0 },                       // てんとう虫: 横から列になって飛んでくる
  bee:     { layer: "air",    hp: 1, r: 13, fire: 2.2 },                     // ハチ: 上から自機のほうへ急に降りてきて、引き返す
  ghost:   { layer: "air",    hp: 1, r: 16, fire: 2.8 },                     // 綿毛おばけ: ゆらゆら降りてくる
  weed:    { layer: "ground", hp: 1, r: 18, fire: 2.6 },                     // からまり草: 畑に生えている
  thorn:   { layer: "ground", hp: 1, r: 20, fire: 3.4, spread: [-0.3, 0, 0.3] }, // いばらの株: 3方向に撃つ（雑魚はみな1発で崩れる）
};
// 雑魚の群れの出やすさ（数が大きいほどよく出る）
const FILLER_WAVES = { ladybugs: 3, bees: 2, ghost: 2, weeds: 3, thorn: 1 };

// ===== 敵の弾の絵（ここだけ書き換えれば、弾の見た目が変わる） =====
// image に画像のパスを入れると、その画像で描く（例: "img/seed.png"）
const ENEMY_BULLET_ART = {
  radius: 11,
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

// 本番（出撃2）の語句の色（金色）
const GOLD_COLOR = "#c8901a";

// 自機の弾の色
const SHOT_COLOR = "#ff5fa2";

// 敵の文字の色（役割ごと）
const ENEMY_COLOR = { zako: "#5f8a3c", mid: "#b2733d", boss: "#c4577a" };

// バトルの中での強さ（1945型）。語句を BATTLE.powerEvery 語吸い込むごとに1段階上がる。毎バトル最初の段階から
// shots: 弾の本数、rate: 弾の間隔の倍率（小さいほど速い）、thick: 太い弾（当たりが広く、2発分）、body / line: ふわりの色
// 最初から2本。強化で3本 → 4本 → 太い弾
// カードの総数は、ふわりの横の数字に出すだけで、強さには関係しない
const POWER_LEVELS = [
  { shots: 2, rate: 1, thick: false, body: "#fffdf7", line: "#c9d9b4" },
  { shots: 3, rate: 1, thick: false, body: "#eef8df", line: "#8fbf5e" },
  { shots: 4, rate: 1, thick: false, body: "#fff4cf", line: "#dcb64e" },
  { shots: 4, rate: 1, thick: true,  body: "#fde6ee", line: "#e08aa6" },
];
// 本番に持っていくもの（仮の3つ）。選ばなければ最初の「つよい弾」になる
const LOADOUTS = [
  { id: "power",  name: "つよい弾",       desc: "弾1本分強い状態で始まる" },
  { id: "shield", name: "盾",             desc: "1回だけ弾を防ぐ" },
  { id: "bomb",   name: "大きな記憶の光", desc: "記憶の光のゲージが速くたまる" },
];

// 弾の本数ごとの、横のならび
const SHOT_SPREAD = { 1: [0], 2: [-0.6, 0.6], 3: [-1, 0, 1], 4: [-1.5, -0.5, 0.5, 1.5] };

// フォント: css/style.css の --font を読む（指定は CSS の1か所だけ）。読めないときの予備
let FONT_FAMILY = '"Hiragino Maru Gothic ProN","Hiragino Maru Gothic Pro","Zen Maru Gothic",sans-serif';
function loadFontFamily() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font").trim();
    if (v) FONT_FAMILY = v;
  } catch (e) { /* 予備のまま */ }
}

// 語句の本体の文字（かっこと、かっこの中の別名を除く）。例: 毛(ウール) → 毛
function baseChars(word) { return Array.from(word.word.replace(/\([^)]*\)/g, "")); }
// 1〜2文字の短い語句
function isShortWord(word) { return baseChars(word).length <= 2; }

// ステージの難易度から、そのステージの数値を決める（override 欄があればそちらを使う）
function stageParams(stage) {
  const d = Math.min(12, Math.max(1, (stage && stage.difficulty) || 1));
  const ov = (stage && stage.override) || {};
  const P = { difficulty: d };
  for (const k of Object.keys(BATTLE.difficulty)) {
    const line = BATTLE.difficulty[k];
    P[k] = ov[k] !== undefined ? ov[k] : line.at1 + (line.at12 - line.at1) * (d - 1) / 11;
  }
  P.zakoHp = Math.max(1, Math.round(P.zakoHp));
  P.tricky = Math.max(0, Math.round(P.tricky));
  return P;
}

// patterns が "auto" のステージ: 語句の出方・順番・位置を、難易度から機械的に決める
// 意地の悪い語句は、順番の中にちらして置く。難易度が上がるほど「横切る」「端にかくれる」が多くなる
function autoLayout(words, P, obstacles) {
  const lanes = [0.3, 0.65, 0.5, 0.25, 0.7, 0.4, 0.6, 0.35, 0.55];
  const list = words.filter(w => w.role !== "boss").sort((a, b) => (a.order || 0) - (b.order || 0));
  const n = Math.min(P.tricky, list.length - 1);
  const kinds = P.difficulty >= 9 ? ["cross", "edge", "cross", "edge", "behind"]
    : P.difficulty >= 5 ? ["edge", "behind", "cross"] : ["edge", "behind"];
  const trickyIdx = new Set();
  for (let k = 0; k < n; k++) trickyIdx.add(Math.min(list.length - 1, 1 + Math.floor(k * (list.length - 1) / Math.max(1, n))));
  const layout = {};
  let kindNo = 0, groundLeft = BATTLE.autoGroundCount;
  list.forEach((w, i) => {
    let pattern = "normal", lane = lanes[i % lanes.length];
    if (trickyIdx.has(i)) {
      pattern = kinds[kindNo % kinds.length];
      if (isShortWord(w) && (pattern === "edge" || pattern === "cross")) pattern = "behind";   // 短い語句は端・横切りにしない
      if (pattern === "cross") lane = kindNo % 2 ? 0 : 1;
      if (pattern === "edge") lane = 1;   // 端にかくれる語句は右端だけ
      kindNo++;
    } else if (w.role === "zako" && groundLeft > 0 && i % 3 === 2) {
      pattern = "ground"; groundLeft--;
    }
    layout[w.id] = { order: i + 1, pattern, lane };
  });
  // 「木のかげ」: 意地の悪い語句のうち、長い語句から shade 個を木のかげにする
  let shadeLeft = (obstacles && obstacles.shade) || 0;
  for (const i of [...trickyIdx].sort((a, b) => baseChars(list[b]).length - baseChars(list[a]).length)) {
    if (shadeLeft <= 0) break;
    const w = list[i];
    if (w.role === "zako" || w.role === "mid") { layout[w.id].pattern = "treeshade"; shadeLeft--; }
  }
  // 地上の語句が足りなければ、うしろのほうの「ふつう」のザコから足す
  for (let i = list.length - 1; i >= 0 && groundLeft > 0; i--) {
    const w = list[i];
    if (w.role === "zako" && layout[w.id].pattern === "normal") { layout[w.id].pattern = "ground"; groundLeft--; }
  }
  return layout;
}

const Battle = (() => {
  let canvas, ctx, dpr = 1, W = 0, H = 0;
  let running = false, rafId = 0, lastTs = 0;
  let opts = null;

  // ゲームの状態
  let t = 0;                 // 経過時間（秒）
  let state = "play";        // "sortie"（出撃の画面）/ "play" / "down" / "clear"
  let stateTimer = 0;
  let player, shots, enemies, ebullets, threads, fluff;
  let fillers, bombs, pops, items, terrain, cloudShadows;
  let script, absorbed, missed, bossWord, groundIds;
  let P = null;              // このステージの難易度から決まった数値
  let layout = null;         // 自動で決めた出方（patterns が "auto" のステージ）
  const patOf = w => (layout && layout[w.id]) || { order: w.order || 0, pattern: w.pattern || "normal", lane: w.lane === undefined ? 0.5 : w.lane };
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
  let hits = 0, downs = 0;   // 被弾した回数、失った機体の数
  let lives = 3;             // 残機
  let gameOvers = 0;         // 3機すべて失って、本番をやり直した回数
  let scoreAtMain = 0;       // 本番が始まったときの点数（やり直しでここに戻す）
  let retryMain = false;     // 本番のやり直しの画面か
  let lastPX = 0, lastPY = 0;   // いちばん最近の指の位置
  let lock = false;          // 照準に地上の敵が入っているか
  let slow = 0;              // ゆっくりの残り時間（秒）
  let gauge = 0;             // 「記憶の光」ボムのゲージ（0〜100）
  let fsay = null;           // ふわりの一言（吹き出し）
  let odai = null;           // いまのお題バトル（なければ null）
  let sortieNo = 1;          // 出撃の画面に出している番号（1＝探検、2＝本番）
  let reacted = 0;           // 探検で見つけた（反応させた）語句の数
  let slots = [];            // 帯の10のあき枠に入る語句（順番）
  let obsDef = null;         // このステージの障害物の決まり（data/stages.js の obstacles）
  let obs = [];              // 画面に出ている障害物 { kind, x, y, r }
  let obsNext = 0;           // 次に出す障害物の番号
  let guide = null;          // 木のよけ方の案内（矢印）
  let found = new Set();     // 探検で見つけた語句の id
  let loadout = null;        // 本番に持っていくもの（LOADOUTS の id）
  let choiceT = 0;           // 選ぶ時間の残り（秒）
  let powerBonus = 0;        // 「つよい弾」で上がる強さの段階
  let shield = 0;            // 「盾」の残り（1回だけ防ぐ）
  let gaugeMul = 1;          // 「大きな記憶の光」のゲージ倍率
  let bounces = [];          // ダミーではね返った弾
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

  // 左端の縦の帯の右はし
  const stripRight = () => 6 + BATTLE.stripWidth;

  // 「記憶の光」ボムのボタン（画面左下のふわりマーク）
  function bombButton() { return { x: 14 + BATTLE.bombButtonR, y: H - 18 - BATTLE.bombButtonR, r: BATTLE.bombButtonR }; }

  // ===== 操作: 指一本のドラッグ（指の動いたぶんだけ自機が動く） =====
  function onDown(e) {
    e.preventDefault();
    if (paused) { resume(); return; }
    if (!player) return;
    if (state === "sortie") {
      if (sortieNo === 2) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left, py = e.clientY - rect.top;
        const c = choiceRects().find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
        if (!c) return;   // 選ぶまで出撃しない（10秒で「つよい弾」）
        chooseLoadout(c.id);
      }
      startSortie();
    }
    // ふわりマークをタップ: ゲージが満タンなら「記憶の光」
    const rect = canvas.getBoundingClientRect(), bb = bombButton();
    if (Math.hypot(e.clientX - rect.left - bb.x, e.clientY - rect.top - bb.y) < bb.r + 10) {
      if (gauge >= 100 && state === "play") useBomb();
      return;
    }
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: player.x, py: player.y };
    lastPX = e.clientX; lastPY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    moved = true;
    lastPX = e.clientX; lastPY = e.clientY;
    if (player.rising > 0) return;   // 復活して上がってくる間は動かせない
    player.x = Math.min(Math.max(drag.px + (e.clientX - drag.sx) * 1.15, 24), W - 24);
    player.y = Math.min(Math.max(drag.py + (e.clientY - drag.sy) * 1.15, minPlayerY()), H - 40);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; }

  // ===== 始める =====
  // words: このステージの10語、o: { stageName, fuwariCount, onEnd(吸い込んだ順のid配列, 記録) }
  function start(words, o) {
    opts = Object.assign({}, o, { words, total: words.length });
    loadFontFamily();
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
    P = stageParams(opts.stage);
    layout = opts.stage && opts.stage.patterns === "auto" ? autoLayout(words, P, opts.stage.obstacles) : null;
    obsDef = (opts.stage && opts.stage.obstacles) || null;
    groundIds = new Set(words.filter(w => patOf(w).pattern === "ground" && w !== bossWord).map(w => w.id));
    // 台本: 大ボス以外の語句を、データの順番（order）でならべる
    script = words.filter(w => w !== bossWord).sort((a, b) => patOf(a).order - patOf(b).order);
    slots = script.concat([bossWord]);   // 帯の10のあき枠（出てくる順。いちばん右が大ボス）
    found = new Set();
    vanish = [];
    fluff = Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40, p: Math.random() * 6 }));
    cloudShadows = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: (i / 3) * H, rx: rand(70, 120), ry: rand(35, 55) }));
    terrain = [];
    fillTerrain();
    shots = []; enemies = []; ebullets = []; fillers = []; bombs = []; items = []; obs = []; guide = null;
    startPhase("round1");
    fillerTimer = 1.2; shotTimer = 0; bombTimer = 0;
    player = { x: W / 2, y: H * 0.8, hp: BATTLE.playerMaxHp, inv: 0, glow: 0, hurt: 0 };
    level = POWER_LEVELS[0];
    score = 0; combo = 0; maxCombo = 0; floats = [];
    hits = 0; downs = 0; lives = BATTLE.lives; gameOvers = 0; scoreAtMain = 0; retryMain = false;
    paused = false; moved = false; groundHinted = false; banner = null; shake = 0; showWord = null; threads = []; pops = [];
    slow = 0; wave = null; gauge = 0; bombsUsed = 0; fsay = null; odai = null; bounces = [];
    state = "sortie"; sortieNo = 1; reacted = 0;   // 「出撃1 探検」の画面から始める
    loadout = null; powerBonus = 0; shield = 0; gaugeMul = 1;
    running = true;
    lastTs = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  // 周を始める
  // 障害物を出す（この出撃で出すステージだけ）
  const obsActive = () => obsDef && phase === (obsDef.sortie === 1 ? "round1" : "round2");
  function addObstacle(x, r) { const o = { kind: obsDef ? obsDef.kind : "tree", x, y: -r, r }; obs.push(o); return o; }
  function spawnObstacle(it) {
    if (it.gate !== undefined) {   // 木と木のあいだを通る場所: すきまの左右に1本ずつ
      const gx = W * it.gate, half = W * (it.gap || 0.35) / 2;
      const rl = Math.max(30, (gx - half) / 2), rr = Math.max(30, (W - gx - half) / 2);
      const a = addObstacle(gx - half - rl, rl + 6);
      addObstacle(gx + half + rr, rr + 6);
      if (it.guide) startGuide({ kind: "gate", gx, tree: a });
    } else {
      const o = addObstacle(W * (it.x || 0.5), it.r || 50);
      if (it.guide) {
        // よける向き: 木から遠いほう（画面のはしに寄りすぎるなら反対）
        let dir = o.x >= player.x ? -1 : 1;
        if (player.x + dir * 90 < 40 || player.x + dir * 90 > W - 40) dir = -dir;
        startGuide({ kind: "dodge", dir, tree: o });
      }
    }
  }
  // 木のよけ方の案内: 1秒スローにして、ふわりが一言、矢印で示す
  function startGuide(g) {
    guide = Object.assign(g, { t: BATTLE.guideTime });
    slow = Math.max(slow, BATTLE.guideSlow);
    fsay = { text: g.kind === "gate" ? "あいだを通ろう！" : "木だ！よけて！", t: BATTLE.guideTime };
    Sound.se("odai");
  }

  function startPhase(p) {
    obsNext = 0;
    phase = p;
    nextIdx = 0;
    roundT = 0;
    gapT = 0;
    nextAt = p === "round1" ? BATTLE.firstSpawnDelay : 0.8;
  }
  const roundInterval = () => phase === "round1" ? BATTLE.roundInterval1 : BATTLE.roundInterval2;
  // 坂: 今の出撃の弾の量の倍率（大きいほど撃つ間隔が短い）
  const fireRamp = () => Math.max(0.1, (BATTLE.ramp[phase] || BATTLE.ramp.round2).fire);

  // 出撃の画面をタップ: 出撃する
  function startSortie() {
    state = "play";
    retryMain = false;
    Sound.se("start");
    if (sortieNo === 1) {
      fsay = { text: "ことばを見つけよう（まだあつめられないよ）", t: BATTLE.fuwariSayTime };
    } else {
      startPhase("round2");
      fsay = { text: "思い出した！今度はあつめられる！", t: BATTLE.fuwariSayTime, big: true };
      Sound.se("power");
    }
  }

  // 持っていくものを決める
  function chooseLoadout(id) {
    loadout = id;
    if (id === "power") powerBonus = 1;
    if (id === "shield") shield = 1;
    if (id === "bomb") gaugeMul = BATTLE.bigBombMul;
    level = POWER_LEVELS[Math.min(Math.floor(absorbed.length / BATTLE.powerEvery) + powerBonus, POWER_LEVELS.length - 1)];
    Sound.se("item");
  }
  // 出撃2の画面の、3つの選ぶボタンの場所
  function choiceRects() {
    const bw = Math.min(W - 48, 320), bh = 62, gap = 12, x = W / 2 - bw / 2, y0 = H * 0.42;
    return LOADOUTS.map((l, i) => ({ id: l.id, x, y: y0 + i * (bh + gap), w: bw, h: bh }));
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
  // od: お題バトルのときだけ { role, size, slot, real }（3つとも同じ役割・同じ大きさで出す）
  function spawn(word, od) {
    const role = od ? od.role : word.role;
    const ground = !od && groundIds.has(word.id) && role !== "boss";
    let size = BATTLE.fontSize[role] || 26;
    if (od) size = od.size;
    else if (isShortWord(word)) size = Math.round(size * BATTLE.shortScale);   // 短い語句は大きめに
    ctx.font = font(size);
    let w = ctx.measureText(word.word).width;
    // 画面からはみ出す長い語句は、24pxまで小さくする
    while (w > W - 40 && size > 24) { size -= 2; ctx.font = font(size); w = ctx.measureText(word.word).width; }
    // 出方（pattern）と位置（lane）はデータで固定。ランダムには出ない
    let pattern = od ? "odai" : (role === "boss" ? "boss" : patOf(word).pattern);
    if (isShortWord(word) && (pattern === "edge" || pattern === "cross")) pattern = "normal";   // 短い語句は端・横切りにしない
    let lane = patOf(word).lane;
    const margin = w / 2 + 20 + (ground ? 0 : BATTLE.sway);
    const left = stripRight();   // 左端の帯と重ならないように
    let x = role === "boss" ? W / 2 : left + margin + lane * Math.max(1, W - left - margin * 2);
    if (pattern === "edge") lane = 1;   // 端にかくれる語句は右端だけ（左端は帯があるため）
    let y = -size;
    if (pattern === "edge") x = lane < 0.5 ? -w / 2 : W + w / 2;
    if (pattern === "cross") { x = lane < 0.5 ? -w / 2 - 10 : W + w / 2 + 10; y = H * BATTLE.crossY; }
    // 硬さ: ザコは難易度で決まる硬さ、中ボス・大ボスは文字1つあたりの耐久 × 難易度の倍率
    const hp = BATTLE.hpOverride[role] || (role === "zako" ? Math.max(word.hp, P.zakoHp) : Math.max(1, Math.round(word.hp * P.bossHpScale)));
    if (od) { x = W / 2; y = -size - od.slot * 40; }
    const e = {
      word, role, size, w, h: size * 1.2, ground, pattern, lane,
      slot: od ? od.slot : 0, dummy: od ? !od.real : false, odaiReal: od ? od.real : false, penaltyAt: -9,
      last: phase !== "round1",                    // 2周目と大ボスは、倒せば吸い込む
      spd: (phase === "round1" ? BATTLE.round1Speed : 1) * P.speedScale,
      bx: x, x, y, hp, maxHp: hp,
      age: 0, phase: (word.id * 1.7) % 6, fire: 1.2, flash: 0
    };
    // 中ボス・大ボスは1文字ずつ壊す: 文字がそれぞれ部品
    // 硬さは「語句全体の硬さ」（役割で決まる）を、壊す文字の数で割った1文字あたりの耐久（上限・下限つき）
    // かっこと、かっこの中の別名は飾り（壊さない・当たらない・読まない）
    if (role === "mid" || role === "boss") {
      ctx.font = font(size);
      const chars = Array.from(word.word);
      let depth = 0;
      const deco = chars.map(ch => { if (ch === "(") depth++; const d = depth > 0; if (ch === ")") depth = Math.max(0, depth - 1); return d; });
      const n = Math.max(1, deco.filter(d => !d).length);
      const lim = BATTLE.perCharHp[role];
      const per = BATTLE.hpOverride[role] ||
        Math.min(lim.max, Math.max(lim.min, Math.round(BATTLE.wordTotalHp[role] * P.bossHpScale / n)));
      const ws = chars.map(ch => ctx.measureText(ch).width);
      const total = ws.reduce((a, b) => a + b, 0);
      let ox = -total / 2, k = 0;
      e.parts = chars.map((ch, i) => {
        const p = { ch, ox: ox + ws[i] / 2, cw: ws[i], deco: deco[i], hp: deco[i] ? 0 : per, maxHp: deco[i] ? 0 : per, broken: false, flash: 0 };
        if (!deco[i]) { p.kana = (word.kanaParts && word.kanaParts[k]) || ch; k++; }   // kanaParts は壊す文字の順
        ox += ws[i];
        return p;
      });
      e.hp = e.maxHp = n;   // 残っている（壊す）文字の数
      // お題の語句は縦書き: 文字を上から下へならべる（列の幅は1文字分）
      if (od) {
        e.vertical = true;
        e.charH = size * 1.12;
        e.parts.forEach((p, i) => { p.ox = 0; p.oy = (i - (chars.length - 1) / 2) * e.charH; });
        e.w = Math.max(...ws) + 4;
        e.h = chars.length * e.charH;
      }
    }
    enemies.push(e);
    // 木のかげ: 本番では、語句のすぐ前（下）に木が来る。探検では木は出ない
    if (pattern === "treeshade") {
      e.holdT = 0;
      if (obsActive()) {
        const r = Math.max(50, e.w / 2 + 12);
        e.tree = addObstacle(e.x, r);
        e.tree.y = e.y + e.h / 2 + r + 6;
      }
    }
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
      fire: def.fire ? rand(0.8, 1.6) * def.fire * BATTLE.fillerFireScale * P.fireScale / fireRamp() : 0 }, extra || {}));
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
      for (let i = 0; i < 6; i++) spawnFiller("ladybug", fromLeft ? -20 : W + 20, y0, { dir: fromLeft ? 1 : -1, y0, delay: i * 0.32 });
    } else if (name === "bees") {     // 2匹が上から急に降りてくる
      for (let i = 0; i < 3; i++) { const x = freeX(0, "air", 30); if (x !== null) spawnFiller("bee", x, -20, { delay: i * 0.35, tx: null }); }
    } else if (name === "ghost") {    // 綿毛おばけが1匹
      for (let i = 0; i < 2; i++) { const x = freeX(0, "air", 40); if (x !== null) spawnFiller("ghost", x, -24 - i * 50, { bx: 0 }); }
    } else if (name === "weeds") {    // からまり草が2株
      for (let i = 0; i < 3; i++) { const x = freeX(0, "ground", 40); if (x !== null) spawnFiller("weed", x, -24 - rand(0, 40)); }
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
    if (state === "sortie") {   // 出撃の画面のあいだは止まっている
      if (sortieNo === 2) {
        choiceT -= realDt;
        if (choiceT <= 0) { chooseLoadout("power"); startSortie(); }   // 選ばなければ「つよい弾」
      }
      return;
    }
    // 吸い込む瞬間は、画面全体がゆっくりになる
    let dt = realDt;
    if (slow > 0) { slow -= realDt; dt = realDt * BATTLE.slowScale; }
    // 吸い込んだ語句の表示と、広がる光は実際の時間で進める
    if (showWord) { showWord.t -= realDt; if (showWord.t <= 0) showWord = null; }
    if (wave) { wave.age += realDt; if (wave.age > 0.6) wave = null; }
    if (fsay) { fsay.t -= realDt; if (fsay.t <= 0) fsay = null; }
    if (guide) { guide.t -= realDt; if (guide.t <= 0) guide = null; }
    if (odai && odai.intro > 0) odai.intro -= realDt;
    for (const b of bounces) { b.age += realDt; b.x += b.vx * realDt; b.y += b.vy * realDt; }
    bounces = bounces.filter(b => b.age < 0.5);
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
    player.healFlash = Math.max(0, (player.healFlash || 0) - realDt);
    if (player.rising > 0) {   // 画面の下から上がってくる
      player.rising -= dt;
      const k = 1 - Math.max(0, player.rising) / BATTLE.respawnRise;
      player.y = H + 30 + (H * 0.8 - H - 30) * (1 - Math.pow(1 - k, 2));
    }

    if (state === "clear") {
      stateTimer -= dt;
      if (stateTimer <= 0) { stop(); opts.onEnd(absorbed.map(w => w.id), { time: t, hits, downs, gameOvers, score, maxCombo, bombsUsed, missed: missed.map(w => w.id) }); }
      return;
    }

    // ===== 台本: 決まった時刻に、決まった順番で語句を出す（倒したかどうかには関係しない） =====
    if (gapT > 0) {
      // 周と周のあいだ
      gapT -= dt;
      if (gapT <= 0) {
        if (phase === "round1") {
          // 探検が終わった: 画面の雑魚と弾を片づけて、「出撃2 本番」の画面で止まる
          fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
          fillers = []; ebullets = []; bombs = []; items = [];
          state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime;
          scoreAtMain = score;
          drag = null;
        } else {
          startPhase("boss");
          if (BATTLE.odai) startOdai(bossWord, true); else spawn(bossWord);
          banner = { text: "大ボス あらわる！", t: 1.8 };
          Sound.se("boss");
        }
      }
    } else if (phase !== "boss") {
      if (!odai) {   // お題バトルの間は、台本を止める
        roundT += dt;
        if (obsActive()) {
          const list = obsDef.items || [];
          while (obsNext < list.length && roundT >= list[obsNext].at) spawnObstacle(list[obsNext++]);
        }
        while (nextIdx < script.length && roundT >= nextAt) {
          const w = script[nextIdx];
          nextIdx++;
          nextAt += roundInterval();
          if (phase === "round2" && BATTLE.odai && w.role === "mid") { startOdai(w, false); break; }
          spawn(w);
        }
      }
      // その周の語句が全部出て、画面からいなくなったら次へ
      if (nextIdx >= script.length && !odai && enemies.every(e => e.role === "boss")) gapT = BATTLE.roundGap;
    }

    // お題バトルの制限時間（中ボスだけ）
    if (odai && odai.intro <= 0) {
      odai.t += dt;
      if (!odai.boss && odai.t >= BATTLE.odaiTimeLimit) endOdai(false);
    }

    // 雑魚の群れを出す（1周目と大ボスのときは少なめ）
    fillerTimer -= dt;
    if (fillerTimer <= 0) {
      const rp = BATTLE.ramp[phase] || BATTLE.ramp.round2;   // 坂: 今の出撃の濃さ
      if (fillers.length < BATTLE.fillerMax * rp.filler) spawnWave();
      fillerTimer = BATTLE.fillerInterval / Math.max(0.1, rp.filler) * rand(0.8, 1.2);
    }

    // 自機の弾（自動で連射）
    shotTimer -= dt;
    if (shotTimer <= 0) {
      // ふわりの段階で弾の数が増える
      // お題バトルの間は正面1本だけ（強化は一時休止。広がる弾がダミーに当たらないように）
      const spread = odai ? [0] : (SHOT_SPREAD[level.shots] || [0]);
      const thick = odai ? false : level.thick;
      for (const k of spread) shots.push({ x: player.x + k * 9, y: player.y - 22, vx: k * 55, thick });
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
      // ザコの語句: 画面に全部入ったら1秒止まって光る（この間は撃てない）
      if (e.role === "zako" && e.pattern !== "odai" && !e.appeared && onScreen(e)) { e.appeared = true; e.appearT = BATTLE.zakoAppearTime; }
      if (e.appearT > 0 && !(odai && e.pattern !== "odai")) { e.appearT -= dt; e.flash = Math.max(0, e.flash - dt); continue; }
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt);
      if (odai && e.pattern !== "odai") continue;   // お題バトルの間は、画面のほかの語句も止める（動かない・撃たない）
      if (e.pattern === "odai") {
        // お題の語句: 縦書きで左・中・右の列にならび、動かない（上から降りてきて止まる）
        const ty = odaiTop() + 30 + e.h / 2;
        e.y += (ty - e.y) * Math.min(1, dt * 4);
        e.x = W * BATTLE.odaiColumns[e.slot % BATTLE.odaiColumns.length];
      } else if (e.role === "boss") {
        const enter = Math.min(e.age / BATTLE.bossEnterTime, 1);
        e.y = -e.size + (H * BATTLE.bossStopY + e.size) * (1 - Math.pow(1 - enter, 2));
        const range = Math.min(W * BATTLE.bossSway, Math.max(0, W / 2 - e.w / 2 - 12));
        e.x = W / 2 + Math.sin(e.age * 0.7) * range;
      } else if (e.ground) {
        e.y += sc * dt;     // 地上の語句は地面といっしょに流れる
      } else if (e.pattern === "edge") {
        // 端にかくれる: 半分だけ顔を出して、出たり引っこんだりしながら降りる
        e.y += (H + e.size * 2) / BATTLE.edgeFallTime * dt * e.spd;
        const show = Math.min(1, 0.45 + 0.65 * Math.sin(e.age * 1.2));   // 見えている割合（ときどき全部出てくる。全部出ている間だけ当たる）
        e.x = e.lane < 0.5 ? -e.w / 2 + e.w * show : W + e.w / 2 - e.w * show;
      } else if (e.pattern === "treeshade") {
        // 木のかげ: 地面といっしょに降りてきて、上のほうで止まって待つ。木が去ってしばらくしたら降りてくる
        const holdY = H * BATTLE.shadeHoldY;
        const treeGone = !e.tree || e.tree.y - e.tree.r > H;
        if (e.y < holdY) e.y += sc * dt;
        else if (!treeGone || e.holdT < BATTLE.shadeWait) { if (treeGone) e.holdT += dt; }
        else e.y += (H + e.size * 2) / BATTLE.fallTime[e.role] * dt;
        e.x = e.bx;
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
      if (e.pattern === "odai" && odai && odai.intro > 0) e.fire = Math.max(e.fire, 0.5);
      if (e.fire <= 0 && e.y > 0 && e.y < H * 0.62) {
        e.fire = BATTLE.enemyFireInterval[e.role] * P.fireScale / fireRamp() * (e.pattern === "odai" ? 3 : 1) * (0.8 + Math.random() * 0.4);
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
        f.x += f.dir * 170 * BATTLE.fillerSpeed * dt;
        f.y = f.y0 + Math.sin(f.x / 60) * 28 + f.age * 6;
        f.ang = Math.atan2(Math.cos(f.x / 60) * 28 / 60 * f.dir, f.dir);
      } else if (f.type === "bee") {
        if (f.tx === null) { f.tx = player.x; f.turn = H * rand(0.38, 0.5); }
        if (!f.back) {
          f.y += 340 * BATTLE.fillerSpeed * dt;
          f.x += (f.tx - f.x) * 2 * dt;
          if (f.y > f.turn) { f.back = true; f.vx = (f.x < W / 2 ? 1 : -1) * 160; }
        } else {
          f.y -= 135 * BATTLE.fillerSpeed * dt; f.x += f.vx * BATTLE.fillerSpeed * dt;
        }
      } else if (f.type === "ghost") {
        f.y += H / 11 * BATTLE.fillerSpeed * dt;
        f.x += Math.sin(f.age * 1.3) * 40 * dt;
      } else {
        f.y += sc * dt;     // 地上の雑魚は地面といっしょに流れる
      }
      if (def.fire) {
        f.fire -= dt;
        if (f.fire <= 0 && f.y > 0 && f.y < H * 0.68) {
          f.fire = def.fire * BATTLE.fillerFireScale * P.fireScale / fireRamp() * rand(0.8, 1.2);
          fireAt(f.x, f.y, def.spread || [0]);
        }
      }
    }

    // 自機の弾が空中の敵に当たったか（地上の敵には当たらない）
    // 障害物: 地面といっしょに流れる。自機がふれると被弾して、外へ押し出される
    for (const o of obs) {
      o.y += sc * dt;
      const d = Math.hypot(player.x - o.x, player.y - o.y), min = o.r + 16;
      if (d < min) {
        if (player.inv <= 0 && !showWord && !(odai && odai.intro > 0)) hurt();
        const k = min / Math.max(1, d);
        player.x = Math.min(Math.max(o.x + (player.x - o.x) * k, 24), W - 24);
        player.y = Math.min(Math.max(o.y + (player.y - o.y) * k, minPlayerY()), H - 40);
      }
    }
    obs = obs.filter(o => o.y - o.r < H + 20);
    const inObstacle = (x, y) => obs.some(o => Math.hypot(x - o.x, y - o.y) < o.r);

    // 雑魚に先に当たる（「雑魚のうしろ」の語句は、前の雑魚をどけないと弾が届かない）
    for (const s of shots) {
      let hit = false;
      if (inObstacle(s.x, s.y)) { s.y = -999; continue; }   // 木は弾をさえぎる
      for (const f of fillers) {
        if (f.layer !== "air" || f.hp <= 0 || f.delay > 0) continue;
        if (Math.hypot(s.x - f.x, s.y - f.y) < f.r + (s.thick ? 10 : 4)) { hit = true; damageFiller(f); break; }
      }
      if (!hit) {
        for (const e of enemies.slice().sort((a, b) => b.y - a.y)) {   // 下にいる語句から当たる
          if (e.ground || e.hp <= 0 || !onScreen(e) || e.appearT > 0) continue;   // 画面に全部入るまで・入ってすぐの1秒は当たらない
          if (e.pattern === "odai" ? (odai && odai.intro > 0) : (e.role === "boss" && e.age < BATTLE.bossEnterTime)) continue;   // 読む時間・降りてくる間は当たらない
          if (Math.abs(s.x - e.x) < e.w / 2 + (s.thick ? 10 : 4) && Math.abs(s.y - e.y) < e.h / 2) {
            if (e.vertical && !e.dummy) {   // 縦書き: 下から順に砕ける。砕けた文字のところは通りぬける
              const lp = lowestPart(e);
              if (!lp || s.y > e.y + lp.oy + e.charH / 2) continue;
            } else if (e.parts && !e.dummy && !partAt(e, s.x, s.thick ? 10 : 4)) continue;   // 砕けた文字のすきまは通りぬける
            hit = true;
            if (e.pattern === "odai") odaiHit(e, s); else { damageWord(e, s.x); if (s.thick && e.hp > 0) damageWord(e, s.x); }   // 太い弾は2発分
            break;
          }
        }
      }
      if (hit) s.y = -999;
    }
    enemies = enemies.filter(e => e.hp > 0);

    // 下へ抜けた語句の敵
    for (const e of enemies) {
      const gone = e.y > H + e.size || (e.pattern === "cross" && e.age > 1 && (e.x < -e.w / 2 - 20 || e.x > W + e.w / 2 + 20));
      if (e.role !== "boss" && e.pattern !== "odai" && gone) {
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
        player.healFlash = 1;   // 体力ゲージが光って「+回復」
        if (!fsay || !fsay.big) fsay = { text: "ありがと！", t: 1.2, small: true };   // ふわりが小さく
        Sound.se("item");
        addPop(it.x, it.y, "#fff8d0", 0.6);
      }
    }
    items = items.filter(it => !it.got && it.y < H + 20);

    // 敵の弾
    player.inv = Math.max(0, player.inv - dt);
    const R = BATTLE.enemyBulletHitR;
    for (const b of ebullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (inObstacle(b.x, b.y)) { b.y = H + 999; continue; }   // 敵の弾も木にさえぎられる
      if (player.inv <= 0 && !showWord && !(odai && odai.intro > 0) && Math.hypot(b.x - player.x, b.y - player.y) < R + 10) {
        b.y = H + 999;
        hurt();
      }
    }
    ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  }

  function fireAt(x, y, pattern) {
    const ang = Math.atan2(player.y - y, player.x - x);
    for (const da of pattern) {
      const sp = BATTLE.enemyBulletSpeed;   // 難しさは弾の速さでは作らない
      ebullets.push({ x, y, vx: Math.cos(ang + da) * sp, vy: Math.sin(ang + da) * sp });
    }
  }

  // 地上の的（地上の語句と、地上の雑魚）
  // 語句の敵が画面に全部入っているか（入るまでは弾が当たらない）
  function onScreen(e) {
    return e.x - e.w / 2 >= 0 && e.x + e.w / 2 <= W && e.y - e.h / 2 >= 0 && e.y + e.h / 2 <= H;
  }
  function groundTargets() {
    return enemies.filter(e => e.ground && e.hp > 0 && onScreen(e) && !(e.appearT > 0)).concat(fillers.filter(f => f.layer === "ground" && f.hp > 0 && f.y > 0));
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
    return e.parts.find(p => !p.broken && !p.deco && Math.abs(x - (e.x + p.ox)) < p.cw / 2 + near);
  }

  // 縦書きの語句で、いちばん下に残っている文字
  function lowestPart(e) {
    let best = null;
    for (const p of e.parts) if (!p.broken && !p.deco && (!best || p.oy > best.oy)) best = p;
    return best;
  }

  function damageWord(e, hitX) {
    e.flash = 0.12;
    if (e.parts) {
      // 当たった文字（なければ、いちばん近い文字）を削る。縦書きは、いちばん下の文字
      let p = e.vertical ? lowestPart(e) : (hitX === undefined ? null : partAt(e, hitX, 0));
      if (!p) {
        const alive = e.parts.filter(q => !q.broken && !q.deco);
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
    const px = e.x + p.ox, py = e.y + (p.oy || 0);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 110;
      threads.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 5 + Math.random() * 6,
        curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6, color: ENEMY_COLOR[e.role], age: 0, scatter: 9, sparkle: true });
    }
    floats.push({ x: e.vertical ? px + e.size : px, y: e.vertical ? py : e.y - e.size * 0.9, text: p.kana, big: true, kana: true, age: 0 });
    Sound.se("crack");
    if (p.kana !== "ー") Sound.speak(p.kana);
  }
  // ===== お題バトル =====
  // ダミー2つ: 同じステージのほかの語句（大ボス以外）から、本物と文字数が近いものを2つ（ステージごとに毎回同じ）
  function odaiDummies(real) {
    const len = w => baseChars(w).length;
    return opts.words.filter(w => w !== real && w !== bossWord)
      .sort((a, b) => Math.abs(len(a) - len(real)) - Math.abs(len(b) - len(real)) || patOf(a).order - patOf(b).order)
      .slice(0, 2);
  }

  // 問題文を折り返す
  function wrapText(text, maxW) {
    const lines = []; let line = "";
    for (const ch of Array.from(text)) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  // 小さく出したときの問題文の帯の位置（集めたことばの帯の下）
  // 問題文の大きさを、長さに合わせて決める: いちばん上の大きさから、行数の上限に収まるまで小さくする
  function fitOdaiText(text, maxFont, width) {
    let fs = maxFont, lines;
    for (;;) {
      ctx.font = font(fs);
      lines = wrapText(text, width);
      if (lines.length <= BATTLE.odaiMaxLines || fs <= BATTLE.odaiMinFont) break;
      fs--;
    }
    return { fs, lines, lh: Math.round(fs * 1.38) };
  }
  function odaiPanel() {
    const y = 40;   // 上の体力ゲージ・点数の下
    const f = fitOdaiText(odai ? odai.q : "", BATTLE.odaiSmallFont, W - stripRight() - 34);
    return { y, lines: f.lines, fs: f.fs, lh: f.lh, h: f.lines.length * f.lh + 14 };
  }
  function odaiTop() { const p = odaiPanel(); return p.y + p.h; }

  function startOdai(real, isBoss) {
    const role = isBoss ? "boss" : "mid";
    const cands = shuffle([real, ...odaiDummies(real)]);   // ならびは毎回入れかえ
    // 3つとも同じ大きさ（いちばん長い語句が、縦書きで画面に入る大きさ。24px より小さくしない）
    odai = { real, boss: isBoss, t: 0, intro: BATTLE.odaiIntroTime, firstHit: null, q: real.odaiQuestion || real.question };
    const longest = Math.max(...cands.map(w => Array.from(w.word).length));
    const room = H * 0.66 - odaiTop() - 30;   // 問題文の帯の下から、自機の上まで
    const size = Math.max(24, Math.min(BATTLE.fontSize[role], Math.floor(room / (longest * 1.12))));
    cands.forEach((w, i) => spawn(w, { role, size, slot: i, real: w === real }));
    slow = BATTLE.odaiIntroTime;   // 吸い込みと同じスロー。読む時間をつくる
    fsay = { text: "お題だよ！ 答えの語句を撃とう", t: 2.5 };
    Sound.se("odai");
  }

  // お題の語句に弾が当たった
  function odaiHit(e, s) {
    if (odai.firstHit === null) {
      odai.firstHit = e.dummy ? "dummy" : "real";
      if (!e.dummy) {   // 最初から本物: ひらめき
        score += BATTLE.odaiBonus;
        floats.push({ x: e.x, y: e.y - e.size - 10, text: `ひらめき！ +${BATTLE.odaiBonus}`, big: true, age: 0 });
        Sound.se("hirameki");
      }
    }
    if (!e.dummy) { damageWord(e, s.x); return; }
    // ダミー: 弾がはね返る。少し減点（コンボは切らない）
    e.flash = 0.12;
    bounces.push({ x: s.x, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 120, vy: 320, age: 0 });
    if (t - e.penaltyAt >= BATTLE.odaiPenaltyCool) {   // 間違いなので減点（同じダミーで続けては減らさない）
      e.penaltyAt = t;
      score = Math.max(0, score - BATTLE.odaiPenalty);
      floats.push({ x: e.x, y: e.y - e.size, text: `ちがうよ −${BATTLE.odaiPenalty}`, big: true, wrong: true, age: 0 });
      Sound.se("boing");
    }
  }

  // お題バトルの終わり。ok: 本物を吸い込んだ／false: 時間切れ（取り逃がし）
  function endOdai(ok) {
    for (const e of enemies) {
      if (e.pattern !== "odai" || e.hp <= 0) continue;
      if (!ok && e.odaiReal) { missed.push(e.word); combo = 0; }
      vanish.push({ word: e.word, x: e.x, y: e.y, size: e.size, w: e.w, ground: false, age: 0 });
      if (!e.odaiReal || !ok) e.hp = 0;
    }
    enemies = enemies.filter(e => e.hp > 0);
    if (!ok) fsay = { text: "あっ、行っちゃった…", t: 2 };
    odai = null;
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
        if (e.role === "boss" || e.hp <= 0 || !onScreen(e) || e.appearT > 0) continue;
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
    // 倒した雑魚は、ぽんっと大きな花になって、輪ときらきらが広がる
    addPop(f.x, f.y, f.layer === "ground" ? "#f6c9d6" : "#fff2b8", BATTLE.popScale, f.layer === "ground", true);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 120;
      threads.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 3, curl: 0, rot: 0,
        color: ["#ffe9a0", "#ffffff", "#f8c8d8"][i % 3], age: 0, scatter: 9, sparkle: true });
    }
    Sound.se("pop");
    if (Math.random() < BATTLE.dropRate) items.push({ x: f.x, y: f.y, age: 0 });
  }

  // 花が咲くような小さな演出
  function addPop(x, y, color, scale, ground, ring) {
    pops.push({ x, y, color, scale, ground: !!ground, ring: !!ring, age: 0 });
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
    if (!bombing) gauge = Math.min(100, gauge + BATTLE.bombGain * mul * gaugeMul);
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
    reacted++;
    found.add(e.word.id);
    floats.push({ x: e.x, y: e.y - e.size, text: "みつけた！", big: false, found: true, age: 0 });
    Sound.se("shine");
  }

  // 2周目・大ボス: 糸がほどけるように散って、自機へ吸い込まれる
  function absorb(e) {
    absorbed.push(e.word);
    if (e.odaiReal && odai) endOdai(true);
    const lv = POWER_LEVELS[Math.min(Math.floor(absorbed.length / BATTLE.powerEvery) + powerBonus, POWER_LEVELS.length - 1)];
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
    if (BATTLE.debugInvincible) return;   // デバッグ: 無敵
    if (shield > 0) {   // 盾: 1回だけ弾を防ぐ
      shield = 0;
      player.inv = 1;
      player.glow = 0.35;
      floats.push({ x: player.x, y: player.y - 40, text: "盾がまもった！", big: true, age: 0 });
      Sound.se("shield");
      return;
    }
    player.hp -= BATTLE.damage;
    player.inv = BATTLE.invincibleTime;
    player.hurt = 0.4;
    hits++;
    combo = 0;
    shake = 0.25;
    Sound.se("damage");
    if (player.hp <= 0) loseLife();
  }

  // 体力ゼロ: 1機失う。のこっていれば画面の下から復活（吸い込んだ語句と帯はそのまま）
  function loseLife() {
    downs++;
    lives--;
    addPop(player.x, player.y, "#ffffff", 1.6, false, true);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 140;
      threads.push({ x: player.x, y: player.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 4, curl: 0, rot: 0, color: "#ffffff", age: 0, scatter: 9, sparkle: true });
    }
    if (lives > 0) { respawn(); return; }
    gameOver();
  }
  function respawn() {
    player.hp = BATTLE.playerMaxHp;
    player.x = W / 2; player.y = H + 30;
    player.rising = BATTLE.respawnRise;
    player.inv = BATTLE.respawnRise + BATTLE.respawnInv;
    if (drag) { drag.sx = lastPX; drag.sy = lastPY; drag.px = player.x; drag.py = H * 0.8; }   // 指を置いたままでも動かせる
  }
  // 3機すべて失った: 本番（出撃2）の最初からやり直す。探検はとばし、本番で集めた語句は消える
  function gameOver() {
    gameOvers++;
    lives = BATTLE.lives;
    player.hp = BATTLE.playerMaxHp; player.inv = 0; player.rising = 0;
    enemies = []; fillers = []; ebullets = []; bombs = []; items = []; obs = []; odai = null;
    if (phase !== "round1") {
      absorbed = []; missed = [];
      score = scoreAtMain;
    } else {
      scoreAtMain = score;   // 探検中に3機失ったら、探検はそこまで
    }
    combo = 0; gauge = 0; level = POWER_LEVELS[0];
    loadout = null; powerBonus = 0; shield = 0; gaugeMul = 1;
    retryMain = true;
    state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; drag = null;
    player.x = W / 2; player.y = H * 0.8;
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

    // 障害物
    for (const o of obs) drawObstacle(o);

    // 空中のものの影（右下にずらして、浮いているように見せる）
    ctx.fillStyle = "rgba(60,80,40,0.16)";
    for (const f of fillers) if (f.layer === "air" && !(f.delay > 0)) { ctx.beginPath(); ctx.ellipse(f.x + 16, f.y + 26, f.r * 0.9, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const it of items) { ctx.beginPath(); ctx.ellipse(it.x + 8, it.y + 14, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(player.x + 20, player.y + 34, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

    // 綿のたね（体力回復）
    for (const it of items) drawItem(it);

    // 自機の弾: 地面（緑・生成り・水色）と重ならない明るい桃色に、白と濃い色の縁取り
    for (const s of shots) {
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.thick ? 7 : 4, s.thick ? 13 : 8, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(120,30,70,0.55)"; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      ctx.fillStyle = SHOT_COLOR; ctx.fill();
    }

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
      if (!e.vertical) ctx.fillText(e.word.word, e.x + 14, e.y + 22);
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
    if (guide) drawGuide();

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
      ctx.fillStyle = fl.wrong ? "#b05068" : (fl.found ? "#6f9a4a" : (fl.kana ? "#5d6b4c" : (fl.big ? "#c98a1e" : "#8a9a78")));   // 砕けた文字の読みは、ふりがなの色
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

    if (odai) drawOdai();
    // はね返った弾
    for (const b of bounces) {
      ctx.globalAlpha = 1 - b.age / 0.5;
      ctx.fillStyle = "#c9c2b0";
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 吸い込んだ語句を画面中央に大きく（読み仮名つき）
    if (showWord) drawBigWord(showWord.word, showWord.t);

    // 状態の文字
    if (state === "sortie") drawSortie();
    if (state === "clear") centerText(`${absorbed.length}語あつまった！`, `${score}点`);
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

  // 木のよけ方の案内の矢印
  function drawGuide() {
    const k = Math.min(1, guide.t / 0.3), pulse = 0.6 + Math.sin(t * 10) * 0.4;
    const y = player.y - 48;
    const x1 = player.x;
    let x2;
    if (guide.kind === "dodge") x2 = player.x + guide.dir * 80;
    else {
      x2 = Math.abs(guide.gx - x1) < 24 ? x1 : guide.gx;   // もうすきまの下にいれば横の矢印は出さない
      // すきまの場所に下向きの印
      const gy = Math.max(70, Math.min(player.y - 90, guide.tree.y));
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = `rgba(255,214,90,${0.6 + pulse * 0.4})`; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(guide.gx - 16, gy - 10); ctx.lineTo(guide.gx + 16, gy - 10); ctx.lineTo(guide.gx, gy + 12); ctx.closePath();
      ctx.stroke(); ctx.fill();
      ctx.restore();
    }
    if (x2 === x1) return;
    const dir = Math.sign(x2 - x1);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - dir * 10, y); ctx.stroke();
    ctx.strokeStyle = `rgba(230,160,40,${0.7 + pulse * 0.3})`; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - dir * 10, y); ctx.stroke();
    ctx.fillStyle = `rgba(230,160,40,${0.7 + pulse * 0.3})`; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x2 + dir * 8, y); ctx.lineTo(x2 - dir * 12, y - 14); ctx.lineTo(x2 - dir * 12, y + 14); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  // 障害物の絵（仮）。kind ごとに描き分ける（今は木。岩・山はあとで足す）
  function drawObstacle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    // 影
    ctx.fillStyle = "rgba(50,70,35,0.25)";
    ctx.beginPath(); ctx.ellipse(10, 14, o.r * 1.02, o.r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    if (o.kind === "rock") {
      ctx.fillStyle = "#b9b3a6"; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    } else {
      // 大きな木: 幹のまわりに、重なった葉のかたまり
      ctx.fillStyle = "#4f7a36";
      ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
      const blobs = 7;
      for (let i = 0; i < blobs; i++) {
        const a = i / blobs * Math.PI * 2;
        ctx.fillStyle = i % 2 ? "#6a9a45" : "#5e8c3e";
        ctx.beginPath(); ctx.arc(Math.cos(a) * o.r * 0.55, Math.sin(a) * o.r * 0.55, o.r * 0.48, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#86b45c";
      ctx.beginPath(); ctx.arc(-o.r * 0.2, -o.r * 0.2, o.r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a5a3a";   // 幹のてっぺん
      ctx.beginPath(); ctx.arc(0, 0, Math.max(6, o.r * 0.14), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // 照準◎（自機の前の地面）。地上の敵が入ると色が変わる
  function drawReticle() {
    const x = player.x, y = player.y - BATTLE.bombRange, r = BATTLE.lockRadius;
    ctx.save();
    if (lock) {   // 地上の敵に重なったら、照準が光る
      const pulse = 0.6 + Math.sin(t * 12) * 0.4;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.8);
      g.addColorStop(0, `rgba(255,245,170,${0.75 * pulse})`); g.addColorStop(1, "rgba(255,245,170,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "rgba(255,220,90,1)"; ctx.shadowBlur = 12;
    }
    ctx.globalAlpha = lock ? 1 : 0.55;
    ctx.strokeStyle = lock ? "#e09a1e" : "#6f9a4a";
    ctx.lineWidth = lock ? 3.5 : 2.5;
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
    if (p.ring) {   // 広がる光の輪
      ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    }
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
      ctx.fillStyle = "rgba(35,50,20,0.45)";   // 濃い影: 地面に貼りついて見える
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
      ctx.fillStyle = "rgba(35,50,20,0.45)";   // 濃い影: 地面に貼りついて見える
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
  // 縦書きのときの文字の形（のばす棒・かっこは縦向きに）
  const VERTICAL_GLYPH = { "ー": "｜", "(": "︵", ")": "︶", "（": "︵", "）": "︶", "〜": "≀" };

  // 縦書きの語句（お題バトル）
  function drawVerticalWord(e, x, y, alpha) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(e.size); ctx.lineJoin = "round";
    const fillColor = e.last ? GOLD_COLOR : ENEMY_COLOR[e.role];
    for (const p of e.parts) {
      const ch = VERTICAL_GLYPH[p.ch] || p.ch, py = y + p.oy;
      if (p.broken) { ctx.globalAlpha = alpha * 0.15; ctx.fillStyle = fillColor; ctx.fillText(ch, x, py); continue; }
      const wob = p.flash > 0 ? (Math.random() - 0.5) * 3 : 0;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,214,90,0.9)"; ctx.shadowBlur = 12;
      ctx.lineWidth = 8; ctx.strokeStyle = e.flash > 0 ? "#fff6c8" : "#fff6d8";
      ctx.strokeText(ch, x + wob, py);
      ctx.shadowBlur = 0;
      ctx.fillStyle = fillColor; ctx.fillText(ch, x + wob, py);
      if (p.maxHp && p.hp < p.maxHp) {   // 文字ごとの残りの耐久（右に小さな帯）
        const bh = e.charH * 0.7;
        ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(x + e.w / 2 + 2, py - bh / 2, 3, bh);
        ctx.fillStyle = ENEMY_COLOR[e.role]; ctx.fillRect(x + e.w / 2 + 2, py + bh / 2 - bh * p.hp / p.maxHp, 3, bh * p.hp / p.maxHp);
      }
    }
    // ふりがなは列の右に縦書きで（となりの列とぶつからないように）
    if (hasKanji(e.word.word)) {
      ctx.globalAlpha = alpha;
      const ks = Math.max(9, Math.min(BATTLE.kanaSize, Math.floor(e.h / Math.max(1, Array.from(e.word.kana).length))));
      ctx.font = font(ks); ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.fillStyle = "#5d6b4c";
      const kx = x + e.w / 2 + ks / 2 + 2;
      Array.from(e.word.kana).forEach((ch, i) => {
        const c = VERTICAL_GLYPH[ch] || ch, ky = y - e.h / 2 + ks / 2 + i * ks;
        ctx.strokeText(c, kx, ky); ctx.fillText(c, kx, ky);
      });
    }
    ctx.restore();
  }

  function drawWordText(e, x, y, alpha) {
    if (e.vertical) { drawVerticalWord(e, x, y, alpha); return; }
    const word = e.word;
    if (!e.last) alpha *= 0.55;   // 探検の語句は半透明
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(e.size);
    ctx.lineJoin = "round";
    const pulse = 0.6 + Math.sin(t * 5 + e.phase) * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = e.last ? `rgba(255,214,90,${0.7 + pulse * 0.3})` : "rgba(255,255,255,0.95)";
    ctx.shadowBlur = e.last ? 10 + pulse * 8 : 10;
    if (e.appearT > 0) {   // 画面に入ったばかり: 強く光って「来た」とわかる（まだ撃てない）
      const f = 0.6 + Math.sin(t * 18) * 0.4;
      ctx.shadowColor = `rgba(255,255,230,${f})`; ctx.shadowBlur = 26;
    }
    ctx.lineWidth = 8;
    ctx.strokeStyle = e.flash > 0 ? "#fff6c8" : (e.last ? "#fff6d8" : "#ffffff");
    if (e.parts) {
      for (const p of e.parts) if (!p.broken) ctx.strokeText(p.ch, x + p.ox, y);
    } else {
      ctx.strokeText(word.word, x, y);
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
    const fillColor = e.last ? GOLD_COLOR : ENEMY_COLOR[e.role];   // 本番の語句は金色
    ctx.fillStyle = fillColor;
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
        ctx.fillStyle = fillColor;
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
    // 濃い影: 地面に貼りついて見える
    ctx.fillStyle = "rgba(35,50,20,0.4)";
    roundRect(e.x - e.w / 2 - 18, e.y - e.h / 2 - 2, e.w + 36, e.h + 16, 18); ctx.fill();
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
    art.draw(ctx, b.x, b.y, BATTLE.enemyBulletSize, t);
  }

  // 自機（仮の形: A君が乗る雲）と、横にいるふわり
  function drawPlayer() {
    const { x, y } = player;
    if (shield > 0) {   // 盾のまく
      ctx.save();
      ctx.strokeStyle = `rgba(140,190,230,${0.6 + Math.sin(t * 4) * 0.2})`; ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(200,230,250,0.18)";
      ctx.beginPath(); ctx.arc(x, y + 2, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
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
    if (fsay) drawFuwariSay(fx, fy);
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

  // お題の問題文: 始まりは画面中央に大きく、読む時間が終わったら上の帯の下へ小さく移す
  function drawOdai() {
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    if (odai.intro > 0) {
      const { fs, lh, lines } = fitOdaiText(odai.q, BATTLE.odaiBigFont, W - 64);   // 短い問題は大きく、長い問題は小さく
      const h = lines.length * lh + 50, y = H * 0.4 - h / 2;
      ctx.fillStyle = "rgba(255,253,245,0.97)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
      roundRect(20, y, W - 40, h, 18); ctx.fill(); ctx.stroke();
      ctx.font = font(14); ctx.fillStyle = "#b0801a";
      ctx.fillText("ふわりのお題", 34, y + 12);
      ctx.font = font(fs); ctx.fillStyle = "#3e4a34";
      lines.forEach((l, i) => ctx.fillText(l, 32, y + 36 + i * lh));
    } else {
      const pnl = odaiPanel();
      ctx.fillStyle = "rgba(255,253,245,0.92)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 2;
      const px = stripRight() + 6;
      roundRect(px, pnl.y, W - px - 10, pnl.h, 12); ctx.fill(); ctx.stroke();
      ctx.font = font(pnl.fs); ctx.fillStyle = "#3e4a34";
      pnl.lines.forEach((l, i) => ctx.fillText(l, px + 12, pnl.y + 7 + i * pnl.lh));
      // 中ボスは残り時間
      if (!odai.boss) {
        const r = Math.max(0, 1 - odai.t / BATTLE.odaiTimeLimit);
        ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, W - px - 18, 3);
        ctx.fillStyle = r > 0.3 ? "#e0b03a" : "#d0607f"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, (W - px - 18) * r, 3);
      }
    }
    ctx.restore();
  }

  // 出撃の画面（1945の面の始まりのように）
  function drawSortie() {
    ctx.save();
    ctx.fillStyle = sortieNo === 1 ? "rgba(236,244,226,0.93)" : "rgba(255,246,220,0.94)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (sortieNo === 2) { drawChoice(); ctx.restore(); return; }
    const cy = H * 0.4;
    ctx.font = font(15); ctx.fillStyle = "#7a8a68";
    ctx.fillText(opts.stageName, W / 2, cy - 110);
    ctx.font = font(44); ctx.fillStyle = sortieNo === 1 ? "#48693a" : "#b0801a";
    ctx.fillText(`出撃${sortieNo}`, W / 2, cy - 60);
    ctx.font = font(30);
    ctx.fillText(sortieNo === 1 ? "探検（たんけん）" : "本番（あつめる）", W / 2, cy - 12);
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    const lines = sortieNo === 1
      ? ["いちど見にいこう。まだ吸い込めないよ", "ことばを見つけて、", "どこから来るか、おぼえておこう"]
      : [`探検で見つけたことば ${reacted}語`, "同じ順番で、もう一度来るよ。", "今度はあつめられる！"];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, cy + 36 + i * 24));
    ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
    ctx.font = font(22); ctx.fillStyle = sortieNo === 1 ? "#6f9a4a" : "#c98a1e";
    ctx.fillText("タップで出撃！", W / 2, cy + 150);
    ctx.restore();
  }

  // 出撃2の画面: 本番に持っていくものを3つから1つ選ぶ
  function drawChoice() {
    // ふわりのセリフ（探検の終わり）
    const say = retryMain
      ? "3機ともやられちゃった…。でも、見つけたことばはおぼえてるよ。本番の最初から、もう一回！"
      : `${reacted}のことばを見つけたね。でもまだ記憶がぼんやり…。同じ道をもう一回飛べば、吸い込める気がする！`;
    ctx.font = font(14);
    const lines = wrapText(say, W - 92);
    const bh = lines.length * 20 + 16, by = H * 0.03;
    ctx.fillStyle = "rgba(255,253,245,0.97)"; ctx.strokeStyle = "#cfe0b6"; ctx.lineWidth = 2;
    roundRect(54, by, W - 70, bh, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#c9d9b4";   // ふわり（仮の絵）
    roundRect(16, by + bh / 2 - 12, 28, 24, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#4b5e3a";
    lines.forEach((l, i) => ctx.fillText(l, 66, by + 8 + i * 20));
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const top = by + bh + 8;
    ctx.font = font(34); ctx.fillStyle = "#b0801a";
    ctx.fillText("出撃2　本番", W / 2, top + 24);
    ctx.font = font(16);
    ctx.fillText("（あつめる）", W / 2, top + 52);
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    ctx.fillText("本番に持っていくものを1つえらぼう", W / 2, top + 82);
    choiceRects().forEach((r, i) => {
      const l = LOADOUTS[i];
      ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
      roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left";
      ctx.font = font(20); ctx.fillStyle = "#8a5a10";
      ctx.fillText(l.name, r.x + 18, r.y + 22);
      ctx.font = font(13); ctx.fillStyle = "#5d6b4c";
      ctx.fillText(l.desc, r.x + 18, r.y + 45);
      if (i === 0) { ctx.textAlign = "right"; ctx.font = font(11); ctx.fillStyle = "#b0a080"; ctx.fillText("えらばないとこれ", r.x + r.w - 12, r.y + 22); }
      ctx.textAlign = "center";
    });
    // 残り時間
    const last = choiceRects()[2], ty = last.y + last.h + 22, bw = last.w;
    const k = Math.max(0, choiceT / BATTLE.choiceTime);
    ctx.fillStyle = "rgba(0,0,0,0.08)"; roundRect(W / 2 - bw / 2, ty, bw, 8, 4); ctx.fill();
    ctx.fillStyle = "#e0b03a"; roundRect(W / 2 - bw / 2, ty, bw * k, 8, 4); ctx.fill();
    ctx.font = font(13); ctx.fillStyle = "#7a8a68";
    ctx.fillText(`あと ${Math.ceil(choiceT)}秒`, W / 2, ty + 24);
  }

  // ふわりの一言（吹き出し）。画面からはみ出さない位置に出す
  function drawFuwariSay(fx, fy) {
    const a = Math.min(1, fsay.t / 0.3, (BATTLE.fuwariSayTime - fsay.t) / 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    if (fsay.big) {   // 大きな一言: 画面のまん中に
      ctx.font = font(22);
      const tw = Math.min(ctx.measureText(fsay.text).width, W - 40), bw = tw + 32, bh = 52;
      const bx = W / 2 - bw / 2, by = H * 0.3 - bh / 2;   // 吸い込んだ語句の大きな表示（まん中）と重ならない高さ
      ctx.fillStyle = "rgba(255,250,232,0.97)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
      roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8a5a10"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(fsay.text, W / 2, by + bh / 2 + 1, W - 56);
      ctx.restore();
      return;
    }
    ctx.font = font(fsay.small ? 12 : 15);
    const tw = ctx.measureText(fsay.text).width, pad = fsay.small ? 7 : 10, bw = tw + pad * 2, bh = fsay.small ? 22 : 30;
    const bx = Math.min(Math.max(fx - bw / 2, 8), W - bw - 8), by = fy - 30 - bh;
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.strokeStyle = "#cfe0b6"; ctx.lineWidth = 2;
    roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 6, by + bh); ctx.lineTo(fx, by + bh + 8); ctx.lineTo(fx + 6, by + bh); ctx.closePath();
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.fill();
    ctx.fillStyle = "#4b5e3a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(fsay.text, bx + pad, by + bh / 2 + 1);
    ctx.restore();
  }

  function drawHud() {
    const top = 14;
    // 体力
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(12, top, 130, 16, 8); ctx.fill();
    const rate = player.hp / BATTLE.playerMaxHp;
    ctx.fillStyle = rate > 0.4 ? "#8cbf5a" : (Math.floor(t * 4) % 2 ? "#e39a8e" : "#f2c4bb");
    roundRect(14, top + 2, 126 * rate, 12, 6); ctx.fill();
    if (player.healFlash > 0) {   // 綿のたねを取った: ゲージが光って「+回復」
      const k = player.healFlash;
      ctx.save();
      ctx.shadowColor = `rgba(255,240,150,${k})`; ctx.shadowBlur = 14 * k;
      ctx.strokeStyle = `rgba(255,236,140,${k})`; ctx.lineWidth = 3;
      roundRect(12, top, 130, 16, 8); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = font(11); ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.strokeText("+回復", 138, top + 8 - (1 - k) * 4);
      ctx.fillStyle = "#4f8a2c"; ctx.fillText("+回復", 138, top + 8 - (1 - k) * 4);
      ctx.restore();
    }
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineJoin = "round";
    // 残機: 機体（雲）の絵をならべる。失ったぶんはうすく
    for (let i = 0; i < BATTLE.lives; i++) {
      const lx = 160 + i * 26, ly = top + 8;
      ctx.save();
      ctx.globalAlpha = i < lives ? 1 : 0.22;
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#9cbf7c"; ctx.lineWidth = 1.5;
      for (const [dx, dy, r] of [[-6, 2, 5], [0, -1, 7], [6, 2, 5]]) { ctx.beginPath(); ctx.arc(lx + dx, ly + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      for (const [dx, dy, r] of [[-6, 2, 5], [0, -1, 7], [6, 2, 5]]) { ctx.beginPath(); ctx.arc(lx + dx, ly + dy, r - 1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#f3d9b8"; ctx.beginPath(); ctx.arc(lx, ly - 7, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // 点数（右）。上に出すのは体力ゲージ、残機、点数だけ
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    ctx.strokeText(String(score), W - 14, top);
    ctx.fillText(String(score), W - 14, top);
    // パワーと持ちものは、左下の記憶の光のボタンの横に小さく
    const b = bombButton();
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = font(11);
    const lvNo = POWER_LEVELS.indexOf(level) + 1;
    const lvText = `パワー${"★".repeat(lvNo)}`;
    ctx.strokeText(lvText, b.x + b.r + 8, b.y - 8); ctx.fillText(lvText, b.x + b.r + 8, b.y - 8);
    if (loadout) {   // 持っていったもの（盾は使うと消える）
      const l = LOADOUTS.find(x => x.id === loadout);
      const txt = loadout === "shield" && !shield ? "盾（使った）" : l.name;
      ctx.strokeText(`持ちもの: ${txt}`, b.x + b.r + 8, b.y + 8); ctx.fillText(`持ちもの: ${txt}`, b.x + b.r + 8, b.y + 8);
    }
    drawStrip();
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

  // 帯: 画面の左端に、10のあき枠を上から縦にならべる（出てくる順。いちばん下が大ボス）
  // はじめは「？」、探検で見つけると灰色の名前、本番で吸い込むと金色。名前は枠の中に縦書き
  function drawStrip() {
    const x = 6, cw = BATTLE.stripWidth, gap = 3;
    const y0 = 40, y1 = bombButton().y - bombButton().r - 22;   // 体力ゲージの下から、記憶の光のボタンの上まで
    const n = Math.max(1, slots.length), sh = (y1 - y0 - gap * (n - 1)) / n;
    ctx.save();
    ctx.fillStyle = "rgba(255,253,245,0.55)";
    roundRect(x - 3, y0 - 3, cw + 6, y1 - y0 + 6, 8); ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    slots.forEach((w, i) => {
      const y = y0 + i * (sh + gap);
      const got = absorbed.includes(w), seen = found.has(w.id);
      const isNew = got && absorbed[absorbed.length - 1] === w && showWord;
      ctx.fillStyle = got ? (isNew ? "#ffe9a8" : "#fff2c8") : "rgba(255,255,255,0.88)";
      ctx.strokeStyle = got ? "#d8a42c" : "#d6d2c2"; ctx.lineWidth = got ? 2 : 1.2;
      roundRect(x, y, cw, sh, 6); ctx.fill(); ctx.stroke();
      const chars = got || seen ? Array.from(w.word) : ["？"];
      const fs = Math.max(6, Math.min(13, Math.floor((sh - 4) / chars.length), cw - 6));
      ctx.font = font(fs);
      ctx.fillStyle = got ? "#8a5a10" : (seen ? "#a3a396" : "#c2bdab");
      const top = y + sh / 2 - (chars.length - 1) * fs / 2;
      chars.forEach((ch, k) => ctx.fillText(VERTICAL_GLYPH[ch] || ch, x + cw / 2, top + k * fs));
      // 地上に出る語句の枠: 小さく「地」の印（帯の右に出す）
      if (groundIds.has(w.id)) {
        ctx.font = font(9);
        ctx.fillStyle = "#9a7650";
        roundRect(x + cw + 2, y + sh / 2 - 7, 14, 14, 4); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("地", x + cw + 9, y + sh / 2);
      }
      // 大ボスの枠: 吸い込むまで小さく「大ボス」の印（帯の右に出す）
      if (w === bossWord && !got) {
        ctx.font = font(8);
        const tw = ctx.measureText("大ボス").width + 6;
        ctx.fillStyle = ENEMY_COLOR.boss;
        roundRect(x + cw + 2, y + sh / 2 - 6, tw, 12, 5); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("大ボス", x + cw + 2 + tw / 2, y + sh / 2);
      }
    });
    ctx.restore();
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

  // ===== デバッグ用（タイトルを5回続けて押すと使える） =====
  const debug = {
    // 探検をとばして、「本番に持っていくもの」を選ぶ画面へ
    skipRecon() {
      if (!running || phase !== "round1") return;
      enemies = []; fillers = []; ebullets = []; bombs = []; items = []; odai = null;
      nextIdx = script.length;
      for (const w of script) found.add(w.id);
      reacted = found.size;
      state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; paused = false; drag = null;
    },
    // 本番をとばして、大ボスへ
    skipToBoss() {
      if (!running || phase === "boss") return;
      if (phase === "round1") { chooseLoadout("power"); startPhase("round2"); }
      enemies = enemies.filter(e => e.role === "boss"); fillers = []; ebullets = []; odai = null; obs = [];
      nextIdx = script.length;
      gapT = 0.01; state = "play"; paused = false;
    },
    // すぐクリア（10語ぜんぶ吸い込んだことにする）
    clearAll() {
      if (!running || state === "clear") return;
      absorbed = slots.slice(); missed = [];
      enemies = []; fillers = []; ebullets = []; odai = null;
      state = "clear"; stateTimer = 1; paused = false;
    },
  };

  return { start, stop, resize, pause, resume, choiceRects, debug };   // （自動プレイヤーで確かめるときは、ここで中の状態を外に出している）
})();
