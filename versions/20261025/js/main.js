// 画面の切り替えとセーブ
const SAVE_KEY = "kietaTowel.save.v1";

// チュートリアルを「見た」の記録（10/7-1）。版（versions/ のフォルダ）ごとに分けて保存する
// 置き場所（URL のパス）を名前に入れるので、別の版を開くと、チュートリアルがもう一度出る
const TUT_KEY = "kietaTowel.tutorial." + window.location.pathname.replace(/index\.html$/, "");
const TutSave = {
  load() { try { return JSON.parse(window.localStorage.getItem(TUT_KEY) || "{}") || {}; } catch (e) { return {}; } },
  mark(id) { const o = TutSave.load(); o[id] = true; try { window.localStorage.setItem(TUT_KEY, JSON.stringify(o)); } catch (e) {} },
  reset() { try { window.localStorage.removeItem(TUT_KEY); } catch (e) {} },
};

// 音のオン・オフ（10/21-1）。ブラウザに保存する（版に関係なく共通）
const SOUND_KEY = "kietaTowel.sound";
const SoundPref = {
  muted() { try { return window.localStorage.getItem(SOUND_KEY) === "off"; } catch (e) { return false; } },
  set(m) { try { window.localStorage.setItem(SOUND_KEY, m ? "off" : "on"); } catch (e) {} },
};

const Save = (() => {
  // cards: 集めたカード、cleared: クリアしたステージ、
  // retake: クイズで不正解だった語句（あとで図鑑の受け直しクイズに使う。バトルで取り逃がした語句は入れない）
  // best: ステージごとのベストスコア（{ score }。救出の旅を最後まで終えたステージにある＝ステージ一覧で枠が光る）。印は 10/25-17 にやめた
  // glowHint: 「クリアしたステージは光るよ…」の案内を見たか（10/25-17）
  // warpSeen: その世界へのワープの会話の演出を見たか（世界の番号 → true。10/25-18）
  // hero: 選んだ主人公（"boy"／"girl"）、introSeen: 目的の画面を見たか（10/21-2）
  // world: ステージ一覧で今いる世界（10/22-1。ワープで進む）
  // gemsSeen: レシピブックの宝石がはまる演出を見たステージ（10/25-4。初めてそろったときだけ演出する）
  // found: ステージごとの、発見の旅で見つけたことばの id（10/25-15。「救出の旅をもう一度」で使う。救出で10のことばすべて助けたら消す）
  let data = { cards: {}, cleared: {}, retake: {}, best: {}, hero: null, introSeen: false, world: 1, gemsSeen: {}, found: {}, glowHint: false, warpSeen: {} };
  // localStorage が使えなくても落ちないようにする
  function load() {
    try {
      const s = window.localStorage.getItem(SAVE_KEY);
      if (s) {
        const d = JSON.parse(s);
        data.cards = d.cards || {};
        data.cleared = d.cleared || {};
        data.retake = d.retake || {};
        data.best = d.best || {};
        for (const b of Object.values(data.best)) if (b) { delete b.noHit; delete b.all; delete b.noDown; }   // 前の版の印の記録は消す（10/25-9 noHit、10/25-17 all・noDown）
        data.glowHint = !!d.glowHint;
        data.warpSeen = d.warpSeen || {};
        data.hero = d.hero || null;
        data.introSeen = !!d.introSeen;
        data.world = d.world || 1;
        data.gemsSeen = d.gemsSeen || {};
        data.found = d.found || {};
      }
    } catch (e) { /* 読めないときは空のまま */ }
  }
  function store() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* 書けなくても続ける */ }
  }
  return {
    load, store,
    get data() { return data; },
    cardCount() { return Object.keys(data.cards).length; }
  };
})();

// ===== 調整パネル（URLに ?tune をつけると、タイトルに「調整パネル」が出る） =====
// [項目の場所, 表示名, 最小, 最大, きざみ]
const TUNE_ITEMS = [
  ["exploreTime", "発見の旅の長さ（秒）", 20, 60, 1],
  ["exploreGap", "発見の旅: 語句が現れる間隔（秒）", 1.5, 6, 0.1],
  ["exploreLife", "発見の旅: 語句がただよう時間（秒）", 4, 20, 0.5],
  ["exploreSpeed", "発見の旅: 語句がただよう速さ", 5, 80, 1],
  ["binoR", "双眼鏡の円の大きさ（半径。画面の幅に対する割合）", 0.1, 0.3, 0.01],
  ["binoSpread", "双眼鏡の2つの円のはなれぐあい（1より小さいと重なる）", 0.3, 1.2, 0.02],
  ["hintSize", "きらっと光る大きさの倍率", 0.5, 3, 0.1],
  ["difficulty.fireRate.0.1", "難易度1（ステージ1）の「弾の多さ（大きいほど弾が多い）」", 0.1, 4, 0.05],
  ["difficulty.fireRate.1.1", "難易度12（ステージ12）の「弾の多さ（大きいほど弾が多い）」", 0.1, 4, 0.05],
  ["difficulty.bulletSpeed.0.1", "難易度1（ステージ1）の「敵の弾の速さの倍率」", 0.3, 2, 0.05],
  ["difficulty.bulletSpeed.1.1", "難易度12（ステージ12）の「敵の弾の速さの倍率」", 0.3, 2, 0.05],
  ["difficulty.speedScale.0.1", "難易度1（ステージ1）の「語句の速さの倍率」", 0.5, 2.5, 0.05],
  ["difficulty.speedScale.1.1", "難易度12（ステージ12）の「語句の速さの倍率」", 0.5, 2.5, 0.05],
  ["difficulty.fillerDensity.0.1", "難易度1（ステージ1）の「虫の濃さ」", 0.2, 3, 0.05],
  ["difficulty.fillerDensity.1.1", "難易度12（ステージ12）の「虫の濃さ」", 0.2, 3, 0.05],
  ["difficulty.fillerHp.0.1", "難易度1（ステージ1）の「虫の硬さの倍率」", 0.5, 5, 0.1],
  ["difficulty.fillerHp.1.1", "難易度12（ステージ12）の「虫の硬さの倍率」", 0.5, 5, 0.1],
  ["shotPower", "ふわりの光の1発の強さ（ザコの語句の殻を削る量）", 0.1, 1.5, 0.05],
  ["difficulty.zakoHp.0.1", "難易度1（ステージ1）の「ザコの語句の硬さ（弾1本あたり）」", 1, 16, 0.5],
  ["difficulty.zakoHp.1.1", "難易度12（ステージ12）の「ザコの語句の硬さ（弾1本あたり）」", 1, 16, 0.5],
  ["difficulty.bossHpScale.0.1", "難易度1（ステージ1）の「中ボス・大ボスの文字耐久の倍率」", 0.25, 4, 0.05],
  ["difficulty.bossHpScale.1.1", "難易度12（ステージ12）の「中ボス・大ボスの文字耐久の倍率」", 0.25, 4, 0.05],
  ["difficulty.tricky.0.1", "難易度1（ステージ1）の「意地の悪い語句の数」", 0, 9, 0.1],
  ["difficulty.tricky.1.1", "難易度12（ステージ12）の「意地の悪い語句の数」", 0, 9, 0.1],
  ["shotDrawScale", "ふわりの光の見た目の大きさ（当たりは変わらない）", 0.5, 3, 0.1],
  ["fillerDrawScale", "虫の見た目の大きさ（当たりは変わらない）", 0.3, 1.2, 0.05],
  ["restGap", "案内つきの木の前後の休み（秒）", 0, 6, 0.5],
  ["exploreDark", "双眼鏡の外の暗さ", 0.5, 1, 0.01],
  ["lookTime", "見つめると見つかるまでの時間（秒）", 0.1, 2, 0.05],
  ["hintAlpha", "暗いところで語句がきらっと光る強さ（0で光らない）", 0, 1, 0.05],
  ["hintEvery", "きらっと光る間隔（秒）", 0.5, 4, 0.1],
  ["shellVeil", "殻が語句の上にかかる濃さ", 0, 0.6, 0.02],
  ["roundInterval1", "探検で語句が出る間隔（秒）", 2, 10, 0.5],
  ["roundInterval2", "本番で語句が出る間隔（秒）", 2, 10, 0.5],
  ["round1Speed", "探検の語句の速さの倍率", 0.6, 3, 0.05],
  ["ramp.round1.filler", "坂: 探検の雑魚の量の倍率", 0, 3, 0.05],
  ["ramp.round1.fire", "坂: 探検の敵の弾の量の倍率", 0.1, 3, 0.05],
  ["ramp.round2.filler", "坂: 本番の雑魚の量の倍率", 0, 3, 0.05],
  ["ramp.round2.fire", "坂: 本番の敵の弾の量の倍率", 0.1, 3, 0.05],
  ["ramp.boss.filler", "坂: 大ボスの雑魚の量の倍率", 0, 3, 0.05],
  ["ramp.boss.fire", "坂: 大ボスの敵の弾の量の倍率", 0.1, 3, 0.05],
  ["fillerSpeed", "雑魚の動く速さの倍率", 0.3, 2, 0.05],
  ["roundGap", "周と周のあいだ（秒）", 0.5, 6, 0.5],
  ["fallTime.zako", "ザコが降りる時間（秒・大きいほどゆっくり）", 5, 24, 0.5],
  ["fallTime.mid", "中ボスが降りる時間（秒）", 5, 28, 0.5],
  ["enemyFireInterval.zako", "ザコが撃つ間隔（秒）", 0.8, 8, 0.1],
  ["enemyFireInterval.mid", "中ボスが撃つ間隔（秒）", 0.6, 6, 0.1],
  ["enemyFireInterval.boss", "大ボスが撃つ間隔（秒）", 0.4, 4, 0.1],
  ["enemyBulletSpeed", "敵の弾の速さ", 40, 300, 5],
  ["enemyBulletSize", "敵の弾の見た目の大きさ", 4, 20, 1],
  ["enemyBulletHitR", "敵の弾の当たりの大きさ", 2, 16, 1],
  ["popScale", "雑魚を倒したときの花の大きさ", 0.5, 3, 0.1],
  ["shotInterval", "自機の弾の間隔（秒）", 0.06, 0.4, 0.02],
  ["fillerInterval", "雑魚の群れが出る間隔（秒）", 0.5, 10, 0.1],
  ["fillerMax", "雑魚の最大数", 0, 24, 1],
  ["wordHitPad", "語句の敵の当たり判定の広さ（文字の左右に足すpx）", 0, 40, 1],
  ["fillerFireScale", "雑魚が撃つ間隔の倍率（大きいほど撃たない）", 0.5, 4, 0.1],
  ["dropRate", "雑魚が回復のたねを落とす確率", 0, 1, 0.05],
  ["edgeFallTime", "「端にかくれる」語句が降りる秒数", 6, 30, 1],
  ["crossTime", "「横切る」語句が横切る秒数", 3, 14, 0.5],
  ["escortCount", "「雑魚のうしろ」を守る雑魚の数", 1, 8, 1],
  ["scrollTime", "地面が流れる時間（秒・大きいほどゆっくり）", 6, 30, 1],
  ["bombRange", "照準◎の位置（自機からの距離）", 80, 260, 10],
  ["lockRadius", "照準◎の大きさ", 12, 50, 2],
  ["damage", "被弾で減る体力（最大100）", 5, 60, 5],
  ["healOnAbsorb", "吸い込みで回復する体力", 0, 40, 2],
  ["wordShowTime", "吸い込んだ語句の表示（秒）", 0.3, 2, 0.1],
  ["zakoAppearTime", "ザコの語句が入ってきて止まって光る秒数", 0, 3, 0.1],
  ["lives", "残機", 1, 9, 1],
  ["windDir", "風の向き（1＝右へ、-1＝左へ）", -1, 1, 2],
  ["windStrength", "風で流される速さ", 0, 120, 2],
  ["fogTop", "霧の高さ（画面の上からの割合）", 0, 0.6, 0.01],
  ["respawnInv", "復活したあと無敵の秒数", 0, 5, 0.5],
  ["slowTime", "吸い込むときのスローの時間（秒）", 0, 1, 0.05],
  ["slowScale", "スローの速さ（1=ふつう、小さいほどゆっくり）", 0.1, 1, 0.05],
  ["powerEvery", "何語ごとに強くなるか（強化の段階）", 1, 5, 1],
  ["scoreWord", "語句の点", 100, 5000, 100],
  ["scoreFiller", "雑魚の点", 10, 500, 10],
  ["comboStep", "コンボで増える倍率", 0, 1, 0.1],
  ["comboMax", "コンボ倍率のいちばん上", 1, 5, 0.5],
  ["hpOverride.zako", "ザコの硬さ（0=データどおり）", 0, 6, 1],
  ["wordTotalHp.mid", "中ボスの語句全体の硬さ（文字数で割る）", 2, 60, 1],
  ["wordTotalHp.boss", "大ボスの語句全体の硬さ（文字数で割る）", 10, 200, 5],
  ["perCharHp.mid.min", "中ボスの1文字あたりの耐久の下限", 1, 10, 1],
  ["perCharHp.mid.max", "中ボスの1文字あたりの耐久の上限", 1, 20, 1],
  ["perCharHp.boss.min", "大ボスの1文字あたりの耐久の下限", 1, 30, 1],
  ["perCharHp.boss.max", "大ボスの1文字あたりの耐久の上限", 5, 80, 1],
  ["shortScale", "1〜2文字の語句の文字の大きさの倍率", 1, 2, 0.05],
  ["odai", "お題バトル（1＝オン、0＝オフ）", 0, 1, 1],
  ["odaiTimeLimit", "お題（中ボス）の制限時間（秒）", 5, 60, 1],
  ["odaiPenalty", "ダミーに当てたときの減点", 0, 2000, 50],
  ["odaiBonus", "ひらめきボーナス", 0, 10000, 100],
  ["odaiIntroTime", "お題の始まりのスロー・問題文を大きく出す秒数", 0.5, 6, 0.1],
  ["odaiBigFont", "お題の問題文（中央）の文字のいちばん大きいとき", 16, 48, 1],
  ["odaiSmallFont", "お題の問題文（上の帯の下）の文字のいちばん大きいとき", 11, 30, 1],
  ["odaiMaxLines", "お題の問題文の行数の上限", 1, 5, 1],
  ["bombGain", "ぜんぶ消しゲージのたまる速さ（1語あたり）", 2, 50, 1],
  ["autoGroundCount", "自動のステージで地上に出る語句の数", 0, 5, 1],
];
const TUNE_KEY = "kietaTowel.tune.v1";
const TUNE_DEFAULT = {};

const Tune = (() => {
  const $ = id => document.getElementById(id);
  // true/false の項目（スイッチ）は、パネルでは 1/0 として扱う
  const getv = path => { const v = path.split(".").reduce((o, k) => o[k], BATTLE); return typeof v === "boolean" ? (v ? 1 : 0) : v; };
  const setv = (path, v) => {
    const ks = path.split("."); const last = ks.pop(); const o = ks.reduce((q, k) => q[k], BATTLE);
    o[last] = typeof o[last] === "boolean" ? v === 1 : v;
  };
  let saved = {};

  // 保存した調整値を読み込んで反映する
  function load() {
    TUNE_ITEMS.forEach(([p]) => (TUNE_DEFAULT[p] = getv(p)));
    try { saved = JSON.parse(window.localStorage.getItem(TUNE_KEY) || "{}") || {}; } catch (e) { saved = {}; }
    Object.keys(saved).forEach(p => { if (p in TUNE_DEFAULT) setv(p, saved[p]); });
  }
  function store() { try { window.localStorage.setItem(TUNE_KEY, JSON.stringify(saved)); } catch (e) {} }
  function changed() { return Object.keys(saved).length > 0; }

  // 前回のバトルの時間など（タイムは競わないので、ここでだけ見られる）
  let info = "前回のバトル: まだ遊んでいません";
  function setInfo(text) { info = text; }

  function render() {
    $("tune-info").textContent = info;
    const box = $("tune-list");
    box.innerHTML = "";
    TUNE_ITEMS.forEach(([p, name, min, max, step]) => {
      const row = document.createElement("div"); row.className = "tune-row";
      const lb = document.createElement("label");
      const sp = document.createElement("span"); sp.textContent = name;
      const b = document.createElement("b");
      const inp = document.createElement("input");
      inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = getv(p);
      const show = () => { b.textContent = getv(p); b.className = getv(p) !== TUNE_DEFAULT[p] ? "changed" : ""; };
      inp.addEventListener("input", () => {
        const v = Math.round(Number(inp.value) / step) * step;
        const vv = Number(v.toFixed(2));
        setv(p, vv);
        if (vv === TUNE_DEFAULT[p]) delete saved[p]; else saved[p] = vv;
        store(); show();
      });
      show();
      lb.append(sp, b); row.append(lb, inp); box.appendChild(row);
    });
  }

  // チャットに貼れる形の文字にする
  function text() {
    const lines = TUNE_ITEMS.filter(([p]) => getv(p) !== TUNE_DEFAULT[p]).map(([p, name]) => `${name}: ${TUNE_DEFAULT[p]} → ${getv(p)}（${p}）`);
    return lines.length ? "バトルの調整値\n" + lines.join("\n") : "バトルの調整値: 変更なし";
  }

  function open() { render(); $("tune-text").classList.add("hidden"); $("tune").classList.remove("hidden"); }
  function close(after) { $("tune").classList.add("hidden"); after && after(); }

  function bind(onClose) {
    $("tune-close").addEventListener("click", () => close(onClose));
    $("tune-reset").addEventListener("click", () => {
      saved = {}; store();
      Object.keys(TUNE_DEFAULT).forEach(p => setv(p, TUNE_DEFAULT[p]));
      render();
    });
    $("tune-copy").addEventListener("click", () => {
      const t = text();
      const ta = $("tune-text");
      ta.value = t; ta.classList.remove("hidden");
      try { navigator.clipboard.writeText(t).then(() => { $("tune-copy").textContent = "コピーしました"; setTimeout(() => ($("tune-copy").textContent = "数値をコピー"), 1500); }, () => ta.select()); }
      catch (e) { ta.select(); }
    });
  }

  return { load, open, bind, changed, setInfo };
})();

const Main = (() => {
  const $ = id => document.getElementById(id);
  // いま遊んでいるステージ（ステージ一覧でえらぶ）
  function selectStage(id) {
    stage = window.STAGES.find(s => s.id === id) || window.STAGES[0];
    world = window.WORLDS.find(w => w.id === stage.world);
    words = window.WORDS.filter(w => w.stage === stage.id);
  }
  let stage, world, words, lastStats = null, lastIds = [];
  const tuneMode = /[?&]tune/.test(window.location.search);
  // デバッグ（タイトルの文字を5回続けて押すとオン。このページを開いている間だけ）
  let debugMode = false, openAll = false;
  let titleTaps = [];

  // 調整中なら、タイトルに印を出す
  function showTuneTag() {
    const el = $("title-stage");
    el.querySelectorAll(".title-tag").forEach(x => x.remove());
    if (Tune.changed()) { const s = document.createElement("span"); s.className = "title-tag"; s.textContent = "調整中"; el.appendChild(s); }
  }

  // 画面の高さは 100vh ではなく、実際の表示領域で計算する
  function fitHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--app-h", `${Math.round(h)}px`);
    if ($("screen-battle").classList.contains("active")) Battle.resize();
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${name}`));
  }

  function toTitle() {
    Battle.stop();
    Sound.play("title");
    $("title-world").textContent = `世界${world.id}　${world.name}`;
    $("title-stage").textContent = stage.name;
    $("title-cards").textContent = Save.cardCount();
    showTuneTag();
    showScreen("title");
  }

  let reviewNext = false;    // 「ステージ1でおさらい」: 次のステージ1は、見た記録に関係なく案内を全部出す
  const heroSrc = pose => `assets/hero_${Save.data.hero || "boy"}_${pose}.jpg`;   // 主人公の絵（point 指さす／think 考える／joy 喜ぶ）
  // 案内（ステージ1）を結果画面とレシピ完成で出すか。出すなら見た記録をつける
  function screenHint(id) {
    if (stage.id !== 1 || (!reviewing && TutSave.load()[id])) return "";
    TutSave.mark(id);
    return window.TEXTS.hints[id];
  }
  let reviewing = false;     // 今のステージ1がおさらいか

  // rescueAgain: 結果画面の「救出の旅をもう一度」（10/25-14）。発見の旅をとばして持ち物選択から（前の発見の記録を使う）
  function toBattle(rescueAgain) {
    reviewing = reviewNext && stage.id === 1;
    showScreen("battle");
    Sound.play(rescueAgain ? "battle" : "recon");   // 探検は静かめの曲。本番が始まると "battle" に替わる
    // 画面が表示されてから大きさを測る
    requestAnimationFrame(() => {
      Battle.start(words, {
        stage,
        stageName: stage.name,
        fuwariCount: Save.cardCount(),
        hints: stage.id === 1 ? { seen: TutSave.load(), mark: TutSave.mark, all: reviewNext } : null,   // 案内はステージ1だけ（初めての瞬間に。おさらいのときは全部）
        hero: Save.data.hero || "boy",
        firstChoice: !TutSave.load().choice,          // 持ち物選択: 初めては時間制限なし（記録は版ごと）
        bombHintSeen: !!TutSave.load().bombReady,     // ぜんぶ消しの案内（初めての1回だけ。記録は版ごと）
        onBombHint: () => TutSave.mark("bombReady"),
        onFirstChoice: () => TutSave.mark("choice"),
        foundIds: rescueAgain === true ? (Save.data.found[stage.id] || []) : null,
        onEnd: (ids, stats) => {
          lastStats = stats; lastIds = ids;
          // 発見の記録はブラウザに保存（10/25-15）。10のことばすべて助けたら、もういらないので消す
          if (ids.length >= words.length) delete Save.data.found[stage.id]; else Save.data.found[stage.id] = stats.found;
          Save.store();
          const m = Math.floor(stats.time / 60), sec = String(Math.floor(stats.time % 60)).padStart(2, "0");
          Tune.setInfo(`前回のバトル（${stage.name}）: ${m}分${sec}秒　回収 ${ids.length}語　被弾 ${stats.hits}回　失った機体 ${stats.downs}機　本番やり直し ${stats.gameOvers}回　${stats.score}点`);
          reviewNext = false;
          toQuiz(ids);
        }
      });
    });
  }

  function toQuiz(ids) {
    const ordered = ids.map(id => words.find(w => w.id === id));
    // クイズは吸い込めた語句の分だけ。1語もなければクイズを飛ばす
    if (!ordered.length) { toCards([]); return; }
    // クイズの前に「今日あつめたことば」を3秒見せる
    showScreen("review");
    Sound.play("card");
    Quiz.review(ordered, () => {
      // クイズの1問目の前に、大きく1画面（ステージ1の初回だけ。おさらいのときも出す）
      if (stage.id === 1 && (reviewing || !TutSave.load().quizIntro)) {
        TutSave.mark("quizIntro");
        $("quizintro-text").innerHTML = tx("quiz.intro").replace(/\n/g, "<br>");
        $("quizintro-tap").textContent = tx("quiz.introTap");
        showScreen("quizintro");
        $("screen-quizintro").onclick = () => { $("screen-quizintro").onclick = null; startQuiz(); };
        return;
      }
      startQuiz();
    });
    function startQuiz() {
      showScreen("quiz");
      $("quiz-hero").src = heroSrc("think");   // クイズは「考える」の絵
      Quiz.start(ordered, results => toCards(results));
    }
  }

  // 画面の言葉（data/texts.js）
  const tx = (path, vars) => { let v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), window.TEXTS); if (typeof v !== "string") return path; return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : v; };

  // 間違えた問題にもう一度（受け直しクイズ）: カードを3秒見せてから出題する
  function startRetake(list) {
    showScreen("quiz");
    $("quiz-hero").src = heroSrc("think");
    Quiz.start(list, results => toCards(results, true), { preview: true });
  }

  function toCards(results, retake) {
    Sound.setTempo(1);
    // 正解した語句がカードになる
    const newIds = results.filter(r => r.correct && !Save.data.cards[r.id]).map(r => r.id);
    results.forEach(r => {
      if (r.correct) { Save.data.cards[r.id] = true; delete Save.data.retake[r.id]; }
      else if (!Save.data.cards[r.id]) Save.data.retake[r.id] = true;   // クイズで不正解 → あとで受け直せる
    });
    const owned = Save.data.cards;
    if (words.filter(w => owned[w.id]).length >= CARDS.clearCount) Save.data.cleared[stage.id] = true;
    // ベストスコア（印は 10/25-17 にやめた）。受け直しのときはバトルの記録はさわらない
    const st = (!retake && lastStats) || { score: 0, hits: 1, downs: 1 };
    const prev = Save.data.best[stage.id] || { score: 0 };
    const newBest = !retake && st.score > prev.score;
    if (!retake) Save.data.best[stage.id] = { score: Math.max(prev.score, st.score) };
    Save.store();
    showScreen("cards");
    $("screen-cards").scrollTop = 0;
    Cards.showCards({
      stage, words, results, owned, newIds, stats: retake ? null : lastStats,
      record: retake ? null : { newBest, best: Save.data.best[stage.id] },
      retake, helpedCount: lastIds.length, retakeIds: Save.data.retake,
      onRetake: startRetake,
      onRescue: Save.data.found[stage.id] ? () => toBattle(true) : null,   // 救出の旅をもう一度（10/25-14。発見の記録があるステージだけ。記録はブラウザに保存 10/25-15）
      onRecipe: toRecipe,
      onRetry: toBattle,
      onTitle: toStages,
      hint: "",   // （「クイズに正解したことばが、カードになるよ」は、10/25-1 からクイズの前の画面で出す）
      onNext: () => {   // つぎへ: 同じ世界の次のステージ（なければステージ一覧）
        const nx = window.STAGES.find(s => s.id === stage.id + 1 && s.world === stage.world && (s.open || openAll));
        if (nx) { selectStage(nx.id); toBattle(); } else toStages();
      },
      heroSrc: heroSrc("joy"),
    });
  }

  // レシピ完成（10/25-4）: 台座に、そのステージの宝石がはまる（初めてそろったときだけ）。12個目なら「つぎへ」で12個そろったときの画面へ
  function toRecipe() {
    const lit = RecipeBook.litIds(Save.data.cards);
    const isNew = !Save.data.gemsSeen[stage.id];
    Save.data.gemsSeen[stage.id] = true;
    Save.store();
    showScreen("recipe");
    Cards.showRecipe({ stage, words, lit, isNew, heroSrc: heroSrc("joy"), hint: "",
      onNext: () => (isNew && lit.size >= 12 ? toEnding() : toStages()) });
  }
  // レシピブック（ステージ一覧から）: 宝石をタップすると、どのステージか・レシピ名が出る
  function toRecipeBook() {
    const lit = RecipeBook.litIds(Save.data.cards);
    $("rbook-title").textContent = tx("recipeBook.title");
    $("rbook-back").textContent = tx("recipeBook.back");
    $("rbook-info").textContent = tx("recipeBook.tapHint");
    RecipeBook.render($("rbook-ring"), { lit, onTap: id => {
      const st = window.STAGES.find(x => x.id === id);
      $("rbook-info").textContent = tx(lit.has(id) ? "recipeBook.litInfo" : "recipeBook.emptyInfo", { id, stage: st.name, recipe: st.recipe });
    } });
    showScreen("recipebook");
  }
  // 12個そろったとき（今は仮の1画面）
  function toEnding() {
    Sound.play("recipe");
    $("ending-title").textContent = tx("ending.title");
    $("ending-line").textContent = tx("ending.line");
    $("ending-next").textContent = tx("ending.next");
    RecipeBook.render($("ending-book"), { lit: RecipeBook.litIds(Save.data.cards), small: true });
    showScreen("ending");
  }

  // ステージ一覧: 12ステージ。遊べるのは V01 ではステージ1だけ
  // ステージ一覧（10/22-1）: 世界ごとのページ。今いる世界だけ出す。世界のカード（40枚）がそろうとワープのボタン
  const worldStages = id => window.STAGES.filter(s => s.world === id);
  const worldDone = id => worldStages(id).every(s => window.WORDS.filter(w => w.stage === s.id).every(w => Save.data.cards[w.id]));
  function toStages() {
    Battle.stop();
    Sound.play("title");
    const wid = Math.min(window.WORLDS.length, Math.max(1, Save.data.world || 1));
    const wd = window.WORLDS.find(w => w.id === wid);
    $("stages-world-title").textContent = tx("worlds.title", { id: wd.id, name: wd.name });
    $("screen-stages").style.backgroundImage = `url(assets/bg_world${wd.id}.jpg)`;
    const back = $("btn-world-back");
    back.classList.toggle("hidden", wid <= 1);
    back.textContent = tx("worlds.back", { id: wid - 1 });
    back.onclick = () => { Save.data.world = wid - 1; Save.store(); toStages(); };
    $("btn-zukan").textContent = tx("zukan.button");
    // いちばん上に、今いる世界の4つの宝石（レシピブックの台座の一部）。タップでレシピブック（12個の台座の全体）へ（10/25-17）
    const litSet = RecipeBook.litIds(Save.data.cards);
    RecipeBook.render($("stages-gems"), { lit: litSet, world: wid });
    $("stages-gems").onclick = toRecipeBook;
    let anyCleared = false;
    const box = $("stages-list");
    box.innerHTML = "";
    worldStages(wid).forEach(s => {
      const row = document.createElement("button");
      const open = s.open || openAll;   // デバッグ: すべてのステージを開く
      row.className = "stage-row" + (open ? "" : " locked notready");
      row.disabled = !open;
      const b = Save.data.best[s.id];
      const got = window.WORDS.filter(w => w.stage === s.id && Save.data.cards[w.id]).length;
      const no = document.createElement("span"); no.className = "no"; no.textContent = s.id;
      const main = document.createElement("span"); main.className = "main";
      const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = s.name;
      const sub = document.createElement("span"); sub.className = "sub";
      sub.textContent = open ? `難易度 ${s.difficulty || 1}　ベスト ${b ? b.score : 0}点　カード ${got}/10` : tx("worlds.notReady");
      // 10/25-17: 印はやめた。クリアした（救出の旅を最後まで終えた）ステージは枠が光り、カードが10枚そろったステージには宝石の絵
      if (b) { row.classList.add("cleared"); anyCleared = true; }
      const marks = document.createElement("span"); marks.className = "marks";
      if (litSet.has(s.id)) marks.innerHTML = `<svg class="row-gem" viewBox="-22 -22 44 44">${GEM_ART(s.gem, true, 19, s.id)}</svg>`;
      main.append(nm, sub);
      row.append(no, main);
      if (open) row.appendChild(marks);
      if (open) row.addEventListener("click", () => { Sound.se("start"); selectStage(s.id); toBattle(); });
      box.appendChild(row);
    });
    // 初めてステージが光ったときの案内（1回だけ。10/25-17）
    const hintEl = $("stages-hint");
    const showGlowHint = anyCleared && !Save.data.glowHint;
    hintEl.textContent = showGlowHint ? tx("stagesHint.glow") : "";
    hintEl.classList.toggle("hidden", !showGlowHint);
    if (showGlowHint) { Save.data.glowHint = true; Save.store(); }
    // ワープ: この世界のカードがそろったら、次の世界へのボタン（ボタンが出る＝進める）
    const warp = $("btn-warp");
    const canWarp = wid < window.WORLDS.length && (worldDone(wid) || openAll);
    warp.classList.toggle("hidden", !canWarp);
    warp.textContent = tx("worlds.warp", { id: wid + 1 });
    warp.onclick = () => warpTo(wid + 1);
    showScreen("stages");
    $("screen-stages").scrollTop = 0;
  }
  // ワープの会話の演出（10/25-18）: その世界へ初めてワープするときだけ。約10秒、画面のどこをタップしても最後に飛ぶ。2回目からは下の短い光
  //   会話の文は texts.js の worlds.warpTalk、秒数はここの WARP_TALK
  const WARP_TALK = { lines: [1, 3, 5], lineEnd: 6.5, depart: 6.5, title: 9, end: 10, frame: 0.18 };
  let wtTimers = [];
  function warpTalk(id) {
    const T = WARP_TALK, talk = (window.TEXTS.worlds.warpTalk || {})[id] || [];
    const box = $("warp-talk"), bubble = $("wt-bubble"), hero = $("wt-hero"), fu = $("wt-fuwari"), strip = $("wt-strip"), chars = $("wt-chars");
    const at = (sec, fn) => wtTimers.push(setTimeout(fn, sec * 1000));
    wtTimers.forEach(clearTimeout); wtTimers = [];
    $("wt-bg1").style.backgroundImage = `url(assets/bg_world${id - 1}.jpg)`;
    $("wt-bg2").style.backgroundImage = `url(assets/bg_world${id}.jpg)`;
    strip.classList.remove("go"); chars.classList.remove("fly"); bubble.classList.remove("on"); $("wt-title").classList.remove("on"); box.querySelector(".wt-flash").classList.remove("on");
    hero.src = heroSrc("think"); fu.src = "assets/fuwari_1.png";
    const wd = window.WORLDS.find(w => w.id === id);
    $("wt-title").textContent = tx("worlds.title", { id, name: wd ? wd.name : "" });
    box.classList.remove("hidden");
    Sound.play("title");
    const finish = () => {
      wtTimers.forEach(clearTimeout); wtTimers = [];
      box.onclick = null; box.classList.add("hidden");
      Save.data.world = id; Save.store(); toStages();
    };
    box.onclick = finish;   // タップで飛ばす
    talk.forEach((ln, i) => at(T.lines[i] !== undefined ? T.lines[i] : 1 + i * 2, () => {
      bubble.classList.remove("on");
      setTimeout(() => {
        bubble.textContent = ln.text; bubble.classList.toggle("hero", ln.who === "hero"); bubble.classList.add("on");
        if (ln.who === "hero") hero.src = heroSrc("point");   // 主人公が話すときは「指さす」
      }, 150);
    }));
    at(T.depart, () => {   // 出発: ふわりがはばたき、背景が次の世界へ流れる
      bubble.classList.remove("on");
      chars.classList.add("fly"); strip.classList.add("go");
      Sound.se("power");
      let f = 0; const iv = setInterval(() => { f = (f + 1) % 3; fu.src = `assets/fuwari_${f + 1}.png`; }, T.frame * 1000);
      wtTimers.push(setTimeout(() => clearInterval(iv), (T.end - T.depart) * 1000));
    });
    at(T.title, () => { $("wt-title").classList.add("on"); Sound.se("shine"); });
    at(T.end - 0.6, () => box.querySelector(".wt-flash").classList.add("on"));
    at(T.end, finish);
  }

  // ワープの演出: 白く光って、次の世界の背景に切りかわる（約1.6秒）
  function warpTo(id) {
    if (!Save.data.warpSeen[id]) { Save.data.warpSeen[id] = true; Save.store(); warpTalk(id); return; }   // 初めては会話の演出（10/25-18）
    const fx = $("warp");
    fx.style.backgroundImage = `url(assets/bg_world${id}.jpg)`;
    $("warp-text").textContent = tx("worlds.warping", { id });
    fx.classList.remove("on"); void fx.offsetWidth; fx.classList.add("on");
    Sound.se("power");
    setTimeout(() => { Save.data.world = id; Save.store(); toStages(); }, 700);
    setTimeout(() => fx.classList.remove("on"), 1700);
  }

  // カード図鑑（10/22-1）: 今いる世界の、ステージごとの10枚。持っているカードは語句と一言メモ、ないものは「？」
  function toZukan() {
    const wid = Save.data.world || 1;
    $("zukan-title").innerHTML = `${tx("zukan.title")}<br><small>${tx("worlds.title", { id: wid, name: window.WORLDS.find(w => w.id === wid).name })}</small>`;
    const box = $("zukan-list");
    box.innerHTML = "";
    worldStages(wid).forEach(s => {
      const ws = window.WORDS.filter(w => w.stage === s.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      const sec = document.createElement("div"); sec.className = "zukan-stage";
      const h = document.createElement("h3"); h.textContent = `${s.id}　${s.name}`;
      const done = ws.every(w => Save.data.cards[w.id]);
      const rc = document.createElement("p"); rc.className = "rc"; rc.textContent = done ? tx("zukan.recipe", { name: s.recipe }) : tx("zukan.recipeYet");
      const list = document.createElement("div"); list.className = "cards-list";
      ws.forEach(w => {
        const c = document.createElement("div");
        if (Save.data.cards[w.id]) {
          c.className = "card";
          const wd = document.createElement("div"); wd.className = "w"; wd.textContent = w.word;
          const m = document.createElement("div"); m.className = "m"; m.innerHTML = Cards.phraseHTML(w.memo);
          c.append(wd, m);
        } else { c.className = "card empty"; c.textContent = tx("zukan.empty"); }
        list.appendChild(c);
      });
      sec.append(h, rc, list);
      box.appendChild(sec);
    });
    $("btn-zukan-back").textContent = tx("zukan.back");
    showScreen("zukan");
    $("screen-zukan").scrollTop = 0;
  }

  // ===== バトルの一時停止メニュー =====
  function openPause() {
    if (!$("screen-battle").classList.contains("active")) return;
    Battle.pause();
    Sound.suspend();
    $("pm-debug").classList.toggle("hidden", !debugMode);
    $("pause-menu").classList.remove("hidden");
  }
  function closePause(after) {
    $("pause-menu").classList.add("hidden");
    Sound.resume();
    after && after();
  }
  function quitBattle(to) {   // バトルをやめる（記録はのこさない）
    Battle.stop();
    closePause(to);
  }

  // ===== デバッグメニュー =====
  function refreshDebugButtons() {
    $("dbg-open-all").textContent = `すべてのステージを開く: ${openAll ? "オン" : "オフ"}`;
    $("dbg-invincible").textContent = `無敵: ${BATTLE.debugInvincible ? "オン" : "オフ"}`;
    $("dbg-odai").textContent = `お題バトル: ${BATTLE.odai ? "オン" : "オフ"}`;
    const el = $("title-stage");
    el.querySelectorAll(".title-tag.dbg").forEach(x => x.remove());
    if (debugMode) { const t = document.createElement("span"); t.className = "title-tag dbg"; t.textContent = "デバッグ"; el.appendChild(t); }
  }
  function openDebug() { refreshDebugButtons(); $("debug-menu").classList.remove("hidden"); }

  function init() {
    Save.load();
    Tune.load();
    selectStage(1);

    fitHeight();
    window.addEventListener("resize", fitHeight);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fitHeight);

    // ドラッグ中に画面がスクロールしないようにする（クイズなどスクロールできる画面は除く）
    document.addEventListener("touchmove", e => {
      if (!e.target.closest || !e.target.closest(".screen.scroll, .tune, .overlay")) e.preventDefault();
    }, { passive: false });
    // ダブルタップでの拡大を防ぐ
    document.addEventListener("dblclick", e => e.preventDefault());

    // 音は「はじめる」をタップしたときに解禁する（iOSの制限）
    $("btn-start").addEventListener("click", () => {
      Sound.unlock();
      Sound.se("start");
      toStages();
    });
    $("btn-stages-back").addEventListener("click", toTitle);

    // バトルの一時停止メニュー
    $("btn-pause").addEventListener("click", openPause);
    $("pm-continue").addEventListener("click", () => closePause(() => Battle.resume()));
    // 音のオン・オフ（タイトルと一時停止メニュー）
    const refreshSound = () => document.querySelectorAll(".sound-btn").forEach(b => {
      b.textContent = window.TEXTS.sound[Sound.muted ? "off" : "on"];
      b.classList.toggle("muted", Sound.muted);
    });
    const toggleSound = () => { Sound.setMuted(!Sound.muted); SoundPref.set(Sound.muted); refreshSound(); };
    $("btn-sound").addEventListener("click", toggleSound);
    $("pm-sound").addEventListener("click", toggleSound);
    Sound.setMuted(SoundPref.muted());
    refreshSound();
    // 説明をもう一度: その場で説明を紙芝居のように見せ、次にステージ1を遊ぶときも、もう一度チュートリアルを出す
    // ステージ1でおさらい: 今のバトルをやめて、ステージ1を案内つきで始める（見た記録に関係なく全部出す）
    $("pm-tutorial").textContent = window.TEXTS.pause.review;
    $("pm-tutorial").addEventListener("click", () => quitBattle(() => { selectStage(1); reviewNext = true; toBattle(); }));
    // デバッグ: 案内の文を紙芝居で見る
    $("dbg-slides").textContent = window.TEXTS.pause.slides;
    $("dbg-slides").addEventListener("click", () => closePause(() => Battle.tutorialSlides()));
    // 目的の画面（初めて開いたときだけ）と、主人公を選ぶ画面
    $("intro-lines").innerHTML = window.TEXTS.intro.lines.map(l => `<p>${l.replace(/\n/g, "<br>")}</p>`).join("");
    $("intro-tap").textContent = window.TEXTS.intro.tap;
    $("screen-intro").addEventListener("click", () => showScreen("hero"));
    $("hero-title").textContent = window.TEXTS.intro.heroTitle;
    ["boy", "girl"].forEach(h => {
      $(`hero-${h}-name`).textContent = window.TEXTS.intro[h];
      $(`hero-${h}`).addEventListener("click", () => { Save.data.hero = h; Save.data.introSeen = true; Save.store(); toTitle(); });
    });
    $("btn-zukan").addEventListener("click", toZukan);
    // （右上の「レシピブック」ボタンは 10/25-17 に消した。ステージ一覧のいちばん上の宝石をタップ）
    $("rbook-back").addEventListener("click", toStages);
    $("ending-next").addEventListener("click", toStages);
    // 目的の画面の台座（空）と一言
    RecipeBook.render($("intro-book"), { lit: new Set(), small: true });
    $("intro-book-caption").innerHTML = tx("intro.bookCaption").replace(/\n/g, "<br>");
    // デバッグ: すべてのカードをそろえる（12個の宝石の演出を確かめる用。宝石がはまる演出は、まだ見ていないステージで出る）
    $("dbg-all-cards").addEventListener("click", () => {
      window.WORDS.forEach(w => { Save.data.cards[w.id] = true; });
      Save.store();
      $("title-cards").textContent = Save.cardCount();
      $("dbg-all-cards").textContent = "すべてのカードをそろえた";
    });
    $("btn-zukan-back").addEventListener("click", toStages);
    $("btn-hero").textContent = window.TEXTS.intro.rechoose;
    $("btn-hero").addEventListener("click", () => showScreen("hero"));
    $("pm-retry").addEventListener("click", () => quitBattle(toBattle));
    $("pm-stages").addEventListener("click", () => quitBattle(toStages));
    $("pm-title").addEventListener("click", () => quitBattle(toTitle));
    $("dbg-skip-recon").addEventListener("click", () => closePause(() => Battle.debug.skipRecon()));
    $("dbg-skip-boss").addEventListener("click", () => closePause(() => Battle.debug.skipToBoss()));
    $("dbg-clear").addEventListener("click", () => closePause(() => Battle.debug.clearAll()));

    // クイズのとちゅうでやめる
    $("btn-quiz-quit").addEventListener("click", () => {
      if (!window.confirm("クイズをやめて、ステージ一覧にもどりますか？（このバトルの記録はのこりません）")) return;
      Sound.setTempo(1);
      toStages();
    });

    // デバッグ: タイトルの文字を5回続けて押す（1.5秒以内）
    document.querySelector(".title-main").addEventListener("click", () => {
      const now = Date.now();
      titleTaps = titleTaps.filter(x => now - x < 1500).concat(now);
      if (titleTaps.length >= 5) { titleTaps = []; debugMode = true; openDebug(); }
    });
    $("dbg-tune").addEventListener("click", () => { $("debug-menu").classList.add("hidden"); Tune.open(); });
    $("dbg-open-all").addEventListener("click", () => { openAll = !openAll; refreshDebugButtons(); });
    $("dbg-invincible").addEventListener("click", () => { BATTLE.debugInvincible = !BATTLE.debugInvincible; refreshDebugButtons(); });
    $("dbg-odai").addEventListener("click", () => { BATTLE.odai = !BATTLE.odai; refreshDebugButtons(); });
    $("dbg-reset").addEventListener("click", () => $("btn-reset").click());
    $("dbg-off").addEventListener("click", () => { debugMode = false; openAll = false; BATTLE.debugInvincible = false; $("debug-menu").classList.add("hidden"); refreshDebugButtons(); });
    $("dbg-close").addEventListener("click", () => $("debug-menu").classList.add("hidden"));

    // 記録を消す（試すとき用）
    $("btn-reset").addEventListener("click", () => {
      if (!window.confirm("集めたカードの記録を消しますか？")) return;
      Save.data.cards = {};
      Save.data.cleared = {};
      Save.data.retake = {};
      Save.data.best = {};
      Save.data.found = {};   // 発見の記録も消す（10/25-15）
      Save.data.glowHint = false;
      Save.data.warpSeen = {};   // ワープの会話の演出も、もう一度見られるように（10/25-18）
      Save.data.gemsSeen = {};   // レシピの演出を見た記録も消す（もう一度演出が見られるように）
      Save.store();
      TutSave.reset();   // チュートリアルを見た記録も消す（この版の分）
      $("title-cards").textContent = 0;
    });

    // アプリが裏に回ったら、バトルと音を止める
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if ($("screen-battle").classList.contains("active")) Battle.pause();
        Sound.suspend();
      } else {
        Sound.resume();
      }
    });
    window.addEventListener("pagehide", () => Battle.pause());

    if (tuneMode) {
      $("btn-tune").classList.remove("hidden");
      $("btn-tune").addEventListener("click", () => Tune.open());
    }
    Tune.bind(showTuneTag);

    $("title-world").textContent = `世界${world.id}　${world.name}`;
    $("title-stage").textContent = stage.name;
    $("title-cards").textContent = Save.cardCount();
    showTuneTag();
    showScreen(Save.data.introSeen ? "title" : "intro");   // 初めて開いたときは、目的の画面から
  }

  return { init };
})();

Main.init();
