// 画面の切り替えとセーブ
const SAVE_KEY = "kietaTowel.save.v1";

const Save = (() => {
  // cards: 集めたカード、cleared: クリアしたステージ、
  // retake: クイズで不正解だった語句（あとで図鑑の受け直しクイズに使う。バトルで取り逃がした語句は入れない）
  // best: ステージごとのベストスコアと3つの印（{ score, all, noDown, noHit }）
  let data = { cards: {}, cleared: {}, retake: {}, best: {} };
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
  ["bombGain", "記憶の光ゲージのたまる速さ（1語あたり）", 2, 50, 1],
  ["difficulty.fireScale.at1", "難易度1の「敵が撃つ間隔の倍率」", 0.2, 2, 0.05],
  ["difficulty.fireScale.at12", "難易度12の「敵が撃つ間隔の倍率」", 0.2, 2, 0.05],
  ["difficulty.speedScale.at1", "難易度1の「敵の速さの倍率」", 0.5, 2.5, 0.05],
  ["difficulty.speedScale.at12", "難易度12の「敵の速さの倍率」", 0.5, 2.5, 0.05],
  ["difficulty.zakoHp.at1", "難易度1の「ザコの硬さ」", 1, 10, 0.5],
  ["difficulty.zakoHp.at12", "難易度12の「ザコの硬さ」", 1, 12, 0.5],
  ["difficulty.bossHpScale.at1", "難易度1の「中ボス・大ボスの文字耐久の倍率」", 0.25, 4, 0.05],
  ["difficulty.bossHpScale.at12", "難易度12の「中ボス・大ボスの文字耐久の倍率」", 0.25, 4, 0.05],
  ["difficulty.tricky.at1", "難易度1の「意地の悪い語句の数」", 0, 9, 0.1],
  ["difficulty.tricky.at12", "難易度12の「意地の悪い語句の数」", 0, 9, 0.1],
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

  function toBattle() {
    showScreen("battle");
    Sound.play("battle");
    // 画面が表示されてから大きさを測る
    requestAnimationFrame(() => {
      Battle.start(words, {
        stage,
        stageName: stage.name,
        fuwariCount: Save.cardCount(),
        onEnd: (ids, stats) => {
          lastStats = stats; lastIds = ids;
          const m = Math.floor(stats.time / 60), sec = String(Math.floor(stats.time % 60)).padStart(2, "0");
          Tune.setInfo(`前回のバトル（${stage.name}）: ${m}分${sec}秒　回収 ${ids.length}語　被弾 ${stats.hits}回　失った機体 ${stats.downs}機　本番やり直し ${stats.gameOvers}回　${stats.score}点`);
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
      showScreen("quiz");
      Quiz.start(ordered, results => toCards(results));
    });
  }

  function toCards(results) {
    Sound.setTempo(1);
    // 正解した語句がカードになる
    const newIds = results.filter(r => r.correct && !Save.data.cards[r.id]).map(r => r.id);
    results.forEach(r => {
      if (r.correct) { Save.data.cards[r.id] = true; delete Save.data.retake[r.id]; }
      else if (!Save.data.cards[r.id]) Save.data.retake[r.id] = true;   // クイズで不正解 → あとで受け直せる
    });
    const owned = Save.data.cards;
    if (words.filter(w => owned[w.id]).length >= CARDS.clearCount) Save.data.cleared[stage.id] = true;
    // ベストスコアと3つの印（一度とった印は消えない。次のステージに進む条件ではない）
    const st = lastStats || { score: 0, hits: 1, downs: 1 };
    const now = { all: lastIds.length >= words.length, noDown: st.downs === 0, noHit: st.hits === 0 };
    const prev = Save.data.best[stage.id] || { score: 0, all: false, noDown: false, noHit: false };
    const newBest = st.score > prev.score;
    Save.data.best[stage.id] = {
      score: Math.max(prev.score, st.score),
      all: prev.all || now.all, noDown: prev.noDown || now.noDown, noHit: prev.noHit || now.noHit
    };
    Save.store();
    showScreen("cards");
    $("screen-cards").scrollTop = 0;
    Cards.showCards({
      stage, words, results, owned, newIds, stats: lastStats,
      record: { newBest, now, best: Save.data.best[stage.id] },
      onRecipe: toRecipe,
      onRetry: toBattle,
      onTitle: toStages
    });
  }

  function toRecipe() {
    showScreen("recipe");
    $("screen-recipe").scrollTop = 0;
    Cards.showRecipe({ stage, words, onRetry: toBattle, onTitle: toStages });
  }

  // ステージ一覧: 12ステージ。遊べるのは V01 ではステージ1だけ
  function toStages() {
    Battle.stop();
    Sound.play("title");
    const box = $("stages-list");
    box.innerHTML = "";
    window.WORLDS.forEach(wd => {
      const h = document.createElement("h3"); h.className = "stages-world"; h.textContent = `世界${wd.id}　${wd.name}`;
      box.appendChild(h);
      window.STAGES.filter(s => s.world === wd.id).forEach(s => {
        const row = document.createElement("button");
        const open = s.open || openAll;   // デバッグ: すべてのステージを開く
        row.className = "stage-row" + (open ? "" : " locked");
        row.disabled = !open;
        const b = Save.data.best[s.id];
        const got = window.WORDS.filter(w => w.stage === s.id && Save.data.cards[w.id]).length;
        const no = document.createElement("span"); no.className = "no"; no.textContent = s.id;
        const main = document.createElement("span"); main.className = "main";
        const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = s.name;
        const sub = document.createElement("span"); sub.className = "sub";
        sub.textContent = open ? `難易度 ${s.difficulty || 1}　ベスト ${b ? b.score : 0}点　カード ${got}/10` : "まだあそべません";
        const marks = document.createElement("span"); marks.className = "marks";
        [["all", "10語"], ["noDown", "無事"], ["noHit", "無傷"]].forEach(([k, label]) => {
          const m = document.createElement("span"); m.className = "mark" + (b && b[k] ? " on" : ""); m.textContent = label;
          marks.appendChild(m);
        });
        main.append(nm, sub);
        row.append(no, main);
        if (open) row.appendChild(marks);
        if (open) row.addEventListener("click", () => { Sound.se("start"); selectStage(s.id); toBattle(); });
        box.appendChild(row);
      });
    });
    showScreen("stages");
    $("screen-stages").scrollTop = 0;
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
      Save.store();
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
    showScreen("title");
  }

  return { init };
})();

Main.init();
