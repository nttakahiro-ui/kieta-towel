// 画面の切り替えとセーブ
const SAVE_KEY = "kietaTowel.save.v1";

const Save = (() => {
  let data = { cards: {}, cleared: {} };
  // localStorage が使えなくても落ちないようにする
  function load() {
    try {
      const s = window.localStorage.getItem(SAVE_KEY);
      if (s) {
        const d = JSON.parse(s);
        data.cards = d.cards || {};
        data.cleared = d.cleared || {};
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
  ["spawnInterval", "敵が出る間隔（秒）", 3, 16, 0.5],
  ["emptyWait", "敵がいないとき待つ最大（秒）", 1, 10, 0.5],
  ["fallTime.zako", "ザコが降りる時間（秒・大きいほどゆっくり）", 5, 24, 0.5],
  ["fallTime.mid", "中ボスが降りる時間（秒）", 5, 28, 0.5],
  ["enemyFireInterval.zako", "ザコが撃つ間隔（秒）", 0.8, 8, 0.1],
  ["enemyFireInterval.mid", "中ボスが撃つ間隔（秒）", 0.6, 6, 0.1],
  ["enemyFireInterval.boss", "大ボスが撃つ間隔（秒）", 0.4, 4, 0.1],
  ["enemyBulletSpeed", "敵の弾の速さ", 60, 300, 10],
  ["shotInterval", "自機の弾の間隔（秒）", 0.06, 0.4, 0.02],
  ["fillerInterval", "雑魚の群れが出る間隔（秒）", 1, 10, 0.2],
  ["fillerMax", "雑魚の最大数", 0, 24, 1],
  ["fillerFireScale", "雑魚が撃つ間隔の倍率（大きいほど撃たない）", 0.5, 4, 0.1],
  ["dropRate", "雑魚が回復のたねを落とす確率", 0, 1, 0.05],
  ["groundWordCount", "地上に出る語句の数", 0, 9, 1],
  ["scrollTime", "地面が流れる時間（秒・大きいほどゆっくり）", 6, 30, 1],
  ["bombRange", "照準◎の位置（自機からの距離）", 80, 260, 10],
  ["lockRadius", "照準◎の大きさ", 12, 50, 2],
  ["damage", "被弾で減る体力（最大100）", 5, 60, 5],
  ["healOnAbsorb", "吸い込みで回復する体力", 0, 40, 2],
  ["wordShowTime", "吸い込んだ語句の表示（秒）", 0.3, 1.6, 0.1],
  ["hpOverride.zako", "ザコの硬さ（0=データどおり）", 0, 6, 1],
  ["hpOverride.mid", "中ボスの硬さ（0=データどおり）", 0, 12, 1],
  ["hpOverride.boss", "大ボスの硬さ（0=データどおり）", 0, 20, 1],
];
const TUNE_KEY = "kietaTowel.tune.v1";
const TUNE_DEFAULT = {};

const Tune = (() => {
  const $ = id => document.getElementById(id);
  const getv = path => path.split(".").reduce((o, k) => o[k], BATTLE);
  const setv = (path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], BATTLE)[last] = v; };
  let saved = {};

  // 保存した調整値を読み込んで反映する
  function load() {
    TUNE_ITEMS.forEach(([p]) => (TUNE_DEFAULT[p] = getv(p)));
    try { saved = JSON.parse(window.localStorage.getItem(TUNE_KEY) || "{}") || {}; } catch (e) { saved = {}; }
    Object.keys(saved).forEach(p => { if (p in TUNE_DEFAULT) setv(p, saved[p]); });
  }
  function store() { try { window.localStorage.setItem(TUNE_KEY, JSON.stringify(saved)); } catch (e) {} }
  function changed() { return Object.keys(saved).length > 0; }

  function render() {
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

  return { load, open, bind, changed };
})();

const Main = (() => {
  const $ = id => document.getElementById(id);
  const STAGE_ID = 1;   // V01 は世界1の最初のステージだけ
  let stage, world, words, lastStats = null;
  const tuneMode = /[?&]tune/.test(window.location.search);

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

  // ふわりの色を、集めたカードの枚数に合わせる
  function paintFuwari() {
    const lv = fuwariLevel(Save.cardCount());
    document.querySelectorAll(".fuwari-icon").forEach(el => { el.style.background = lv.body; el.style.borderColor = lv.line; });
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
    paintFuwari();
    showTuneTag();
    showScreen("title");
  }

  function toBattle() {
    showScreen("battle");
    Sound.play("battle");
    // 画面が表示されてから大きさを測る
    requestAnimationFrame(() => {
      Battle.start(words, {
        stageName: stage.name,
        fuwariCount: Save.cardCount(),
        onEnd: (ids, stats) => { lastStats = stats; toQuiz(ids); }
      });
    });
  }

  function toQuiz(ids) {
    const ordered = ids.map(id => words.find(w => w.id === id));
    // クイズの前に「今日あつめたことば」を3秒見せる
    showScreen("review");
    Sound.play("card");
    Quiz.review(ordered, () => {
      showScreen("quiz");
      Quiz.start(ordered, results => toCards(results));
    });
  }

  function toCards(results) {
    Sound.setTempo(1);
    // 正解した語句がカードになる
    const newIds = results.filter(r => r.correct && !Save.data.cards[r.id]).map(r => r.id);
    results.forEach(r => { if (r.correct) Save.data.cards[r.id] = true; });
    const owned = Save.data.cards;
    if (words.filter(w => owned[w.id]).length >= CARDS.clearCount) Save.data.cleared[STAGE_ID] = true;
    Save.store();
    showScreen("cards");
    $("screen-cards").scrollTop = 0;
    Cards.showCards({
      stage, words, results, owned, newIds, stats: lastStats,
      onRecipe: toRecipe,
      onRetry: toBattle,
      onTitle: toTitle
    });
  }

  function toRecipe() {
    showScreen("recipe");
    $("screen-recipe").scrollTop = 0;
    Cards.showRecipe({ stage, words, onRetry: toBattle, onTitle: toTitle });
  }

  function init() {
    Save.load();
    Tune.load();
    stage = window.STAGES.find(s => s.id === STAGE_ID);
    world = window.WORLDS.find(w => w.id === stage.world);
    words = window.WORDS.filter(w => w.stage === STAGE_ID);

    fitHeight();
    window.addEventListener("resize", fitHeight);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fitHeight);

    // ドラッグ中に画面がスクロールしないようにする（クイズなどスクロールできる画面は除く）
    document.addEventListener("touchmove", e => {
      if (!e.target.closest || !e.target.closest(".screen.scroll, .tune")) e.preventDefault();
    }, { passive: false });
    // ダブルタップでの拡大を防ぐ
    document.addEventListener("dblclick", e => e.preventDefault());

    // 音は「はじめる」をタップしたときに解禁する（iOSの制限）
    $("btn-start").addEventListener("click", () => {
      Sound.unlock();
      Sound.se("start");
      toBattle();
    });

    // 記録を消す（試すとき用）
    $("btn-reset").addEventListener("click", () => {
      if (!window.confirm("集めたカードの記録を消しますか？")) return;
      Save.data.cards = {};
      Save.data.cleared = {};
      Save.store();
      $("title-cards").textContent = 0;
      paintFuwari();
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
    paintFuwari();
    showTuneTag();
    showScreen("title");
  }

  return { init };
})();

Main.init();
