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
  const GLUE = new Set(["を", "は", "が", "に", "の", "と", "で", "へ", "も", "や", "よ", "ね", "て", "た", "か", "な", "、", "。", "!", "！", "?", "？", ")", "）"]);
  const esc = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function phraseHTML(text) {
    if (!seg) return esc(text);
    const parts = [];
    for (const { segment } of seg.segment(text)) {
      if (parts.length && (GLUE.has(segment) || GLUE.has(segment[0]))) parts[parts.length - 1] += segment; else parts.push(segment);
    }
    return parts.map(esc).join("<wbr>");
  }
  // 名前をならべる（3つまで。4つ以上は「〇〇、〇〇ほか○語」）
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
    $("cards-rule").textContent = "";   // （条件の一言は、クイズの前の画面と発見のたびの表紙にあるので、ここには書かない。10/25-1）
    // 中心の大きなボタン（10/25-1）: 間違えた問題があれば「クイズをもう一度」、なければ「つぎへ」（10枚そろったらレシピ完成へ）
    const done = ownedCount >= o.words.length;
    const rb = $("cards-retake");
    rb.classList.remove("hidden");
    if (wrong.length && o.onRetake) { rb.textContent = tx("results.retakeButton"); rb.onclick = () => o.onRetake(wrong); }
    else { rb.textContent = tx("results.nextButton"); rb.onclick = () => (done ? o.onRecipe() : o.onNext()); }
    const qb = $("cards-quit");
    qb.textContent = tx("results.quitButton");
    qb.onclick = () => o.onTitle();
    $("cards-summary").textContent = "";
    const rk = $("cards-rank");
    rk.innerHTML = "";
    if (o.stats) {
      const st = o.stats;
      $("cards-summary").textContent = `ぶつかった ${st.hits}回${st.downs ? `　元気がなくなった ${st.downs}回` : ""}${st.gameOvers ? `　救出のたびのやり直し ${st.gameOvers}回` : ""}　いちばん長いれんぞく ${st.maxCombo}`;   // バトルの時間は出さない（調整パネルの中だけ）
      // 点数とランク
      const r = rankOf(st.score);
      const sc = document.createElement("div"); sc.className = "rank-score"; sc.textContent = `${st.score} 点`;
      const nm = document.createElement("div"); nm.className = "rank-name"; nm.textContent = `ランク：${r.name}`;
      rk.append(sc, nm);
      // ベスト更新と、今回とれた印
      if (o.record) {
        if (o.record.newBest) { const nb = document.createElement("div"); nb.className = "best-new"; nb.textContent = "ベスト更新！"; rk.appendChild(nb); }
        const ms = document.createElement("div"); ms.className = "marks-now";
        [["all", "10語すべて助けた"], ["noDown", "元気をなくさなかった"], ["noHit", "一度もぶつからなかった"]].forEach(([k, label]) => {
          const m = document.createElement("span"); m.className = "mark" + (o.record.now[k] ? " on" : ""); m.textContent = label;
          ms.appendChild(m);
        });
        rk.appendChild(ms);
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
      const wd = document.createElement("div"); wd.className = "w"; wd.textContent = w.word;
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

  // レシピ完成の画面（10/25-4）: 台座が出て、そのステージの宝石が光ってはまる（初めてそろったときだけ。2回目からは光った状態）。
  // o: { stage, lit（光っている stage id の Set）, isNew（初めてそろった）, onNext, hint, heroSrc }
  function showRecipe(o) {
    Sound.play("recipe");
    showHint("recipe-hint", o.hint); showHero("recipe-hero", o.heroSrc);
    $("recipe-label").textContent = tx("recipe.label");
    $("recipe-name").textContent = tx("recipe.revived", { name: o.stage.recipe });
    const lit = new Set(o.lit);
    if (o.isNew) lit.delete(o.stage.id);   // はまる演出をする宝石は、まだ光っていない状態から
    RecipeBook.render($("recipe-book"), { lit, drop: o.isNew ? o.stage.id : null });
    if (o.isNew) setTimeout(() => Sound.se("shine"), 900);
    const btns = $("recipe-buttons");
    btns.innerHTML = "";
    btns.append(button(tx("recipe.next"), "btn-main", o.onNext));
  }

  return { showCards, showRecipe, phraseHTML, names };
})();
