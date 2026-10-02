// カード表示とレシピ完成表示
const CARDS = {
  clearCount: 7,   // ステージクリアに必要なカードの枚数（7割）
};

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
    const list = $("cards-list");
    list.innerHTML = "";
    // 今回のクイズの順に並べる。カードは語句＋一言メモだけ
    const order = o.results.map(r => o.words.find(w => w.id === r.id));
    order.forEach((w, i) => {
      const c = document.createElement("div");
      const owned = !!o.owned[w.id];
      c.className = "card" + (owned ? "" : " miss");
      c.style.animationDelay = `${i * 0.08}s`;
      const wd = document.createElement("div"); wd.className = "w"; wd.textContent = w.word;
      const m = document.createElement("div"); m.className = "m"; m.textContent = w.memo;
      c.append(wd, m);
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
      btns.append(button("もう一度あそぶ", "btn-main", o.onRetry), button("タイトルへ", "btn-sub", o.onTitle));
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
    btns.append(button("もう一度あそぶ", "btn-main", o.onRetry), button("タイトルへ", "btn-sub", o.onTitle));
  }

  return { showCards, showRecipe };
})();
