// カード表示とレシピ完成表示
const CARDS = {
  clearCount: 7,   // ステージクリアに必要なカードの枚数（7割）
};

// バトルの点数によるランク（仮）。min 点以上でそのランク
const RANKS = [
  { min: 0,     name: "タオル見習い" },
  { min: 20000, name: "タオル職人" },
  { min: 30000, name: "タオル名人" },
  { min: 40000, name: "タオル博士" },
];
function rankOf(score) {
  let r = RANKS[0];
  for (const x of RANKS) if (score >= x.min) r = x;
  return r;
}

const Cards = (() => {
  const $ = id => document.getElementById(id);
  const tx = (path, vars) => { let v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), window.TEXTS); if (typeof v !== "string") return path; return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : v; };

  // カードの一言メモの改行（10/22-1）: 日本語の区切り（Intl.Segmenter）でかたまりに分け、かたまりの途中や助詞の前では折り返さない
  // （かたまりのあいだにだけ <wbr> を入れ、CSS の word-break: keep-all と組み合わせる）
  const seg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("ja", { granularity: "word" }) : null;
  const GLUE = new Set(["を", "は", "が", "に", "の", "と", "で", "へ", "も", "や", "よ", "ね", "て", "た", "か", "な", "、", "。", "!", "！", "?", "？", ")", "）", "」"]);   // 「」の閉じかっこも前につける（10/25-14）
  const esc = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // カードの見出し（語句）の div。漢字を含む語句には、上に小さく kana 欄のふりがな（11/1。本文にはつけない）
  function wordEl(w) {
    const wd = document.createElement("div"); wd.className = "w";
    if (w.kana && /[\u3400-\u9fff々]/.test(w.word)) {
      const k = document.createElement("span"); k.className = "kn"; k.textContent = w.kana;
      wd.append(k, document.createTextNode(w.word));
    } else wd.textContent = w.word;
    return wd;
  }
  function phraseHTML(text) {
    if (!seg) return esc(text);
    const parts = [];
    let open = false;   // 直前が「 （「 のすぐあとでも折り返さない。「 が行の終わりに残らないように）
    for (const { segment } of seg.segment(text)) {
      // 10/31-3: かぎかっこ（「）の直前では折り返さない（「 を前のかたまりにつける）。端末ごとの制御はしない
      if (parts.length && (open || segment[0] === "「" || GLUE.has(segment) || GLUE.has(segment[0]))) parts[parts.length - 1] += segment; else parts.push(segment);
      open = segment.endsWith("「");
    }
    return parts.map(esc).join("<wbr>");
  }
  // 名前をならべる（3つまで。4つ以上は「〇〇、〇〇ほか○つのことば」）
  function names(ws) {
    const n = ws.map(w => `「${w.word}」`);
    return n.length <= 3 ? n.join("") : tx("results.others", { names: n.slice(0, 2).join(""), n: n.length - 2 });
  }

  function button(text, cls, fn) {
    const b = document.createElement("button");
    b.className = "btn " + (cls || "");
    b.textContent = text;
    b.addEventListener("click", fn);
    return b;
  }

  // カード表示
  // o: { stage, words(このステージの10語), results(今回のクイズ結果), owned(id→true 集めたカード), newIds(今回はじめて集めたid), onRecipe, onRetry, onTitle }
  // ふわりの案内（ステージ1の初めてのとき。main.js が文を渡す）と、主人公の「喜ぶ」の絵
  function showHint(id, text) { const el = $(id); el.textContent = text || ""; el.classList.toggle("hidden", !text); }
  function showHero(id, src) { const el = $(id); if (src) el.src = src; el.classList.toggle("hidden", !src); }

  // 結果画面の2ページ（10/25-3）: 1ページ目＝カードの枚数と次にすること、2ページ目＝今回のカードの一覧とランク
  function setPage(n) { $("cards-pages").classList.toggle("p2", n === 2); }
  let swipeBound = false;
  function bindSwipe() {
    if (swipeBound) return; swipeBound = true;
    let sx = null, sy = null;
    const el = $("screen-cards");
    el.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) setPage(dx < 0 ? 2 : 1);   // 左へスワイプ＝2ページ目、右へ＝1ページ目
    });
  }

  function showCards(o) {
    Sound.play("card");
    bindSwipe(); setPage(1);
    $("cards-to-p2").textContent = tx("results.toCards"); $("cards-to-p2").onclick = () => setPage(2);
    $("cards-to-p1").textContent = tx("results.toBack"); $("cards-to-p1").onclick = () => setPage(1);
    $("cards-title").textContent = tx("results.cardsTitle");
    showHint("cards-hint", o.hint); showHero("cards-hero", o.heroSrc);
    const got = o.results.filter(r => r.correct).map(r => r.id);
    const ownedCount = o.words.filter(w => o.owned[w.id]).length;
    // 結果の3段（10/22-1）: 今回助けたことば／正解してカードになった／このステージのカード
    const tiers = $("cards-tiers");
    tiers.innerHTML = "";
    const tier = (label, value, cls) => { const d = document.createElement("div"); d.className = "tier " + (cls || ""); d.innerHTML = `<span class="lb">${label}</span><span class="vl">${value}</span>`; tiers.appendChild(d); };
    // 10/25-1: 「このステージのカード ○/10枚」だけを大きく出す（今回助けたことば・正解してカードになった の段は出さない）
    tier(tx("results.stageCards"), `${ownedCount} <small>/ ${o.words.length} ${tx("results.unitCard")}</small>`, "total");
    // 次は〇〇（足りないカードの名前）。クイズでまちがえたことば（受け直せる）と、まだ助けていないことばに分ける
    const missing = o.words.filter(w => !o.owned[w.id]);
    const wrong = missing.filter(w => o.retakeIds && o.retakeIds[w.id]);
    const notHelped = missing.filter(w => !wrong.includes(w));
    const nx = $("cards-next");
    nx.innerHTML = "";
    const line = t => { const p = document.createElement("p"); p.innerHTML = phraseHTML(t); nx.appendChild(p); };
    if (notHelped.length) { line(tx("results.nextHelp", { names: names(notHelped) })); if (wrong.length) line(tx("results.nextQuizAlso", { names: names(wrong) })); }
    else if (wrong.length) line(tx("results.nextQuiz", { names: names(wrong) }));
    $("cards-rule").textContent = "";   // （条件の一言は、クイズの前の画面と発見の旅の表紙にあるので、ここには書かない。10/25-1）
    // 中心の大きなボタン（10/25-1）: 間違えた問題があれば「クイズをもう一度」、なければ「つぎへ」（10枚そろったらレシピ完成へ）
    const done = ownedCount >= o.words.length;
    const rb = $("cards-retake");
    rb.classList.remove("hidden");
    if (wrong.length && o.onRetake) { rb.textContent = tx("results.retakeButton"); rb.onclick = () => o.onRetake(wrong); }
    else { rb.textContent = tx("results.nextButton"); rb.onclick = () => (done ? o.onRecipe() : o.onNext()); }
    // 救出の旅をもう一度（10/25-14）: 助けられなかったことばがあるとき。「クイズをもう一度」（または「次へ」）の下に
    const rs = $("cards-rescue");
    rs.classList.toggle("hidden", !(notHelped.length && o.onRescue));
    rs.textContent = tx("results.rescueButton"); rs.onclick = () => o.onRescue && o.onRescue();
    const qb = $("cards-quit");
    qb.textContent = tx("results.quitButton");
    qb.onclick = () => o.onTitle();
    $("cards-summary").textContent = "";
    const rk = $("cards-rank");
    rk.innerHTML = "";
    if (o.stats) {
      const st = o.stats;
      $("cards-summary").textContent = [tx("results.summary", { hits: st.hits }), st.downs ? tx("results.summaryDown", { n: st.downs }) : "", st.gameOvers ? tx("results.summaryRetry", { n: st.gameOvers }) : "", tx("results.summaryCombo", { n: st.maxCombo })].filter(Boolean).join("　");   // バトルの時間は出さない（調整パネルの中だけ）
      // 点数とランク
      const r = rankOf(st.score);
      const sc = document.createElement("div"); sc.className = "rank-score"; sc.textContent = `${st.score} 点`;
      const nm = document.createElement("div"); nm.className = "rank-name"; nm.textContent = `ランク：${r.name}`;
      rk.append(sc, nm);
      // ベスト更新と、今回とれた印
      if (o.record) {
        if (o.record.newBest) { const nb = document.createElement("div"); nb.className = "best-new"; nb.textContent = "ベスト更新！"; rk.appendChild(nb); }
        // （今回とれた印は 10/25-17 にやめた）
      }
    }
    const list = $("cards-list");
    list.innerHTML = "";
    // 今回のクイズの順に並べ、そのあとにバトルで取り逃がした語句。カードは語句＋一言メモだけ
    const quizIds = o.results.map(r => r.id);
    const wrongIds = o.results.filter(r => !r.correct).map(r => r.id);
    const missedIds = (o.stats && o.stats.missed) || [];
    const order = quizIds.concat(missedIds.filter(id => !quizIds.includes(id)))
      .concat(o.words.map(w => w.id).filter(id => !quizIds.includes(id) && !missedIds.includes(id)))
      .map(id => o.words.find(w => w.id === id));
    order.forEach((w, i) => {
      const c = document.createElement("div");
      const owned = !!o.owned[w.id];
      c.className = "card" + (owned ? "" : " miss");
      c.style.animationDelay = `${i * 0.08}s`;
      const wd = wordEl(w);
      const m = document.createElement("div"); m.className = "m"; m.innerHTML = phraseHTML(w.memo);
      c.append(wd, m);
      // まだカードになっていない語句には、理由を出す
      if (!owned) {
        const why = document.createElement("div"); why.className = "why";
        if (wrongIds.includes(w.id)) { why.textContent = "クイズで不正解。あとで受け直せる"; c.classList.add("wrong"); }
        else if (missedIds.includes(w.id)) { why.textContent = "旅で助けられなかった。もう一度あそんで助けよう"; c.classList.add("lost"); }
        else why.textContent = "まだ";
        c.appendChild(why);
      }
      if (o.newIds && o.newIds.includes(w.id)) {
        const nb = document.createElement("span"); nb.className = "new"; nb.textContent = "NEW";
        c.appendChild(nb);
      }
      list.appendChild(c);
    });

    // （下の「10枚そろった！」「ステージクリア！あと○枚」の文と、「もう一度あそぶ／ステージ一覧へ」のボタンは、
    //   10/25-1 に上の「次は〇〇」と中心のボタンにまとめた。1画面に1つの要点）
    $("cards-result").innerHTML = "";
    $("cards-buttons").innerHTML = "";
  }

  // レシピ完成の画面（10/25-4）: 台座が出て、そのステージの宝石が光ってはまる
  // 10/25-15: 初めてそろったときは3段の演出（① 10枚のカードが集まって重なる ② 光の玉が宝石の色に ③ 宝石がはまり、台座が光り、紙吹雪）。
  //   そのあと「あと○個で…」と、次の宝石が小さく点滅。秒数は js/recipebook.js の RECIPE_FX。画面のどこをタップしても最後に飛ぶ
  // o: { stage, words（このステージの10のことば）, lit（光っている stage id の Set）, isNew（初めてそろった）, onNext, hint, heroSrc }
  let fxTimers = [];
  function showRecipe(o) {
    Sound.play("recipe");
    fxTimers.forEach(clearTimeout); fxTimers = [];
    showHint("recipe-hint", o.hint); showHero("recipe-hero", o.heroSrc);
    $("recipe-label").textContent = tx("recipe.label");
    $("recipe-name").textContent = tx("recipe.revived", { name: o.stage.recipe });
    const all = new Set(o.lit); all.add(o.stage.id);
    const remain = 12 - all.size, nextId = o.isNew ? RecipeBook.nextId(o.stage.id, all) : null;
    $("recipe-remain").textContent = o.isNew ? (remain > 0 ? tx("recipe.remain", { n: remain }) : tx("recipe.allDone")) : "";
    const btns = $("recipe-buttons");
    btns.innerHTML = "";
    btns.append(button(tx("recipe.next"), "btn-main", o.onNext));
    const fx = $("recipe-fx"), book = $("recipe-book"), screen = $("screen-recipe");
    fx.innerHTML = "";
    const late = ["recipe-name", "recipe-hero", "recipe-fuwari", "recipe-remain", "recipe-buttons"].map($);
    const show = (el, on) => { el.classList.toggle("fx-hide", !on); el.classList.toggle("fx-show", on); };
    $("recipe-fuwari").classList.toggle("hidden", !o.isNew);
    const finalBook = pop => {
      RecipeBook.renderBook(book, { lit: all, drop: pop ? o.stage.id : null, dropClass: "rb-pop", next: nextId });
      if (pop) { book.classList.remove("flash"); void book.offsetWidth; book.classList.add("flash"); }
    };
    if (!o.isNew) {   // 2回目からは、光った台座が出るだけ（今まで通り）
      RecipeBook.renderBook(book, { lit: all });
      late.forEach(el => show(el, true));
      screen.onclick = null;
      return;
    }
    // ここから、初めてそろったときの演出
    const lit = new Set(o.lit); lit.delete(o.stage.id);
    RecipeBook.renderBook(book, { lit });   // 11/1: 3世界の本の枠にはまる（前は円い台座）
    late.forEach(el => show(el, false));
    const F = RECIPE_FX, at = (sec, fn) => fxTimers.push(setTimeout(fn, sec * 1000));
    const box = screen.getBoundingClientRect(), br = book.getBoundingClientRect();
    const cx = br.left + br.width / 2 - box.left, cy = br.top + br.height / 2 - box.top;
    const place = (el, x, y, sc) => { el.style.transform = `translate(${x}px, ${y}px) scale(${sc === undefined ? 1 : sc})`; };
    // ① ためる: 10枚のカードが画面の端から飛んできて、1枚ずつ光りながら重なる
    const cards = (o.words || []).slice(0, 10).map((w, i) => {
      const c = document.createElement("div"); c.className = "fx-card"; c.textContent = w.word;
      const side = i % 4, r = Math.random();
      const sx = side === 0 ? -40 : side === 1 ? box.width + 40 : r * box.width, sy = side < 2 ? r * box.height : side === 2 ? -50 : box.height + 50;
      place(c, sx, sy, 0.9); fx.appendChild(c);
      at(0.02 + i * F.cardGap, () => { c.style.transition = `transform ${F.cardFly}s cubic-bezier(.2,.7,.3,1)`; place(c, cx + (i - 4.5) * 1.5, cy - i * 1.5, 1); });
      at(i * F.cardGap + F.cardFly, () => { c.classList.add("lit"); Sound.se("stack"); });
      return c;
    });
    // ② 変わる: 重なったカードが光の玉になり、宝石の色に変わる
    const ball = document.createElement("div"); ball.className = "fx-ball";
    at(F.gather, () => {
      cards.forEach(c => { c.style.transition = "transform .3s, opacity .3s"; place(c, cx, cy, 0.2); c.style.opacity = "0"; });
      place(ball, cx, cy, 0.2); ball.style.opacity = "0"; fx.appendChild(ball);
      requestAnimationFrame(() => { ball.style.transition = `transform ${F.turn * 0.6}s, opacity .2s, background ${F.turn * 0.6}s`; place(ball, cx, cy, 1.3); ball.style.opacity = "1"; });
      Sound.se("rise");
    });
    at(F.gather + F.turn * 0.4, () => { ball.style.background = `radial-gradient(circle, #fff 0%, ${o.stage.gem} 45%, rgba(255,255,255,0) 72%)`; });
    // ③ はまる: 光の玉が台座の宝石の場所へ飛んで、宝石がはまる。台座が光り、名前・主人公・ふわり・紙吹雪
    at(F.gather + F.turn, () => {
      const g = book.querySelector(`.rb-gem[data-stage="${o.stage.id}"]`), gr = g ? g.getBoundingClientRect() : br;
      ball.style.transition = `transform ${F.fly}s ease-in`; place(ball, gr.left + gr.width / 2 - box.left, gr.top + gr.height / 2 - box.top, 0.5);
    });
    at(F.gather + F.turn + F.fly, () => {
      ball.remove(); fx.querySelectorAll(".fx-card").forEach(c => c.remove());
      finalBook(true); Sound.se("gem");
      ["recipe-name", "recipe-hero", "recipe-fuwari"].forEach(id => show($(id), true));
      const colors = (window.STAGES || []).map(s => s.gem).filter(Boolean);
      for (let i = 0; i < F.confetti; i++) {
        const p = document.createElement("span"); p.className = "fx-confetti";
        p.style.left = `${Math.random() * 100}%`; p.style.background = colors[i % colors.length];
        p.style.animationDelay = `${Math.random() * 0.6}s`; p.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
        fx.appendChild(p);
      }
    });
    at(F.remainAt, () => show($("recipe-remain"), true));
    at(F.total, () => { show($("recipe-buttons"), true); screen.onclick = null; });
    // タップで最後の状態に飛ぶ
    screen.onclick = e => {
      if (e.target.closest("button")) return;
      fxTimers.forEach(clearTimeout); fxTimers = [];
      fx.innerHTML = ""; finalBook(false);
      late.forEach(el => show(el, true));
      screen.onclick = null;
    };
  }

  return { showCards, showRecipe, phraseHTML, wordEl, names };
})();
