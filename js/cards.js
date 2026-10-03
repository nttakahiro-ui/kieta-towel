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

  function button(text, cls, fn) {
    const b = document.createElement("button");
    b.className = "btn " + (cls || "");
    b.textContent = text;
    b.addEventListener("click", fn);
    return b;
  }

  // カード表示
  // o: { stage, words(このステージの10語), results(今回のクイズ結果), owned(id→true 集めたカード), newIds(今回はじめて集めたid), onRecipe, onRetry, onTitle }
  function showCards(o) {
    Sound.play("card");
    const got = o.results.filter(r => r.correct).map(r => r.id);
    const ownedCount = o.words.filter(w => o.owned[w.id]).length;
    $("cards-summary").textContent = `今回 ${got.length} 枚 ／ このステージ ${ownedCount} / ${o.words.length} 枚`;
    const rk = $("cards-rank");
    rk.innerHTML = "";
    if (o.stats) {
      const st = o.stats;
      $("cards-summary").textContent += `\n被弾 ${st.hits}回${st.downs ? `　失った機体 ${st.downs}機` : ""}${st.gameOvers ? `　本番やり直し ${st.gameOvers}回` : ""}　最大コンボ ${st.maxCombo}`;   // バトルの時間は出さない（調整パネルの中だけ）
      // 点数とランク
      const r = rankOf(st.score);
      const sc = document.createElement("div"); sc.className = "rank-score"; sc.textContent = `${st.score} 点`;
      const nm = document.createElement("div"); nm.className = "rank-name"; nm.textContent = `ランク：${r.name}`;
      rk.append(sc, nm);
      // ベスト更新と、今回とれた印
      if (o.record) {
        if (o.record.newBest) { const nb = document.createElement("div"); nb.className = "best-new"; nb.textContent = "ベスト更新！"; rk.appendChild(nb); }
        const ms = document.createElement("div"); ms.className = "marks-now";
        [["all", "10語すべて回収"], ["noDown", "1機も失わなかった"], ["noHit", "被弾ゼロ"]].forEach(([k, label]) => {
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
      const m = document.createElement("div"); m.className = "m"; m.textContent = w.memo;
      c.append(wd, m);
      // まだカードになっていない語句には、理由を出す
      if (!owned) {
        const why = document.createElement("div"); why.className = "why";
        if (wrongIds.includes(w.id)) { why.textContent = "クイズで不正解。あとで受け直せる"; c.classList.add("wrong"); }
        else if (missedIds.includes(w.id)) { why.textContent = "バトルで取り逃がし。もう一度あそんで吸い込もう"; c.classList.add("lost"); }
        else why.textContent = "まだ";
        c.appendChild(why);
      }
      if (o.newIds && o.newIds.includes(w.id)) {
        const nb = document.createElement("span"); nb.className = "new"; nb.textContent = "NEW";
        c.appendChild(nb);
      }
      list.appendChild(c);
    });

    const res = $("cards-result");
    const btns = $("cards-buttons");
    btns.innerHTML = "";
    if (ownedCount >= o.words.length) {
      res.innerHTML = "<b>10枚そろった！</b>";
      btns.append(button("レシピを見る", "btn-main", o.onRecipe));
    } else {
      const rest = o.words.length - ownedCount;
      if (ownedCount >= CARDS.clearCount) {
        res.innerHTML = `<b>ステージクリア！</b><br>あと ${rest} 枚でレシピ完成<br>次のステージはまだありません`;
      } else {
        res.innerHTML = `あと ${CARDS.clearCount - ownedCount} 枚でステージクリア<br>（あと ${rest} 枚でレシピ完成）`;
      }
      btns.append(button("もう一度あそぶ", "btn-main", o.onRetry), button("ステージ一覧へ", "btn-sub", o.onTitle));
    }
  }

  // レシピ完成表示（絵や演出は仮）
  function showRecipe(o) {
    Sound.play("recipe");
    $("recipe-name").textContent = o.stage.recipe;
    // 綿毛がふわふわ舞う（仮の演出）
    const fl = $("recipe-fluff");
    fl.innerHTML = "";
    for (let i = 0; i < 18; i++) {
      const sp = document.createElement("span");
      sp.style.left = `${Math.random() * 100}%`;
      sp.style.animationDelay = `${Math.random() * 5}s`;
      sp.style.animationDuration = `${5 + Math.random() * 4}s`;
      const sz = 6 + Math.random() * 10;
      sp.style.width = sp.style.height = `${sz}px`;
      fl.appendChild(sp);
    }
    const ol = $("recipe-words");
    ol.innerHTML = "";
    o.words.forEach(w => { const li = document.createElement("li"); li.textContent = w.word; ol.appendChild(li); });
    $("recipe-next").innerHTML = "ステージクリア！<br>次のステージはまだありません";
    const btns = $("recipe-buttons");
    btns.innerHTML = "";
    btns.append(button("もう一度あそぶ", "btn-main", o.onRetry), button("ステージ一覧へ", "btn-sub", o.onTitle));
  }

  return { showCards, showRecipe };
})();
