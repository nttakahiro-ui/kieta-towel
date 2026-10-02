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

const Main = (() => {
  const $ = id => document.getElementById(id);
  const STAGE_ID = 1;   // V01 は世界1の最初のステージだけ
  let stage, world, words;

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
        onEnd: ids => toQuiz(ids)
      });
    });
  }

  function toQuiz(ids) {
    showScreen("quiz");
    const ordered = ids.map(id => words.find(w => w.id === id));
    Quiz.start(ordered, results => toCards(results));
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
      stage, words, results, owned, newIds,
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
    stage = window.STAGES.find(s => s.id === STAGE_ID);
    world = window.WORLDS.find(w => w.id === stage.world);
    words = window.WORDS.filter(w => w.stage === STAGE_ID);

    fitHeight();
    window.addEventListener("resize", fitHeight);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fitHeight);

    // ドラッグ中に画面がスクロールしないようにする（クイズなどスクロールできる画面は除く）
    document.addEventListener("touchmove", e => {
      if (!e.target.closest || !e.target.closest(".screen.scroll")) e.preventDefault();
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

    $("title-world").textContent = `世界${world.id}　${world.name}`;
    $("title-stage").textContent = stage.name;
    $("title-cards").textContent = Save.cardCount();
    paintFuwari();
    showScreen("title");
  }

  return { init };
})();

Main.init();
