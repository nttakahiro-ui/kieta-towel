// クイズ。バトルで吸い込んだ順に出題する
const QUIZ = {
  reviewTime: 3,                     // クイズの前に「今日あつめたことば」を見せる秒数
  tempoUpAt: { 2: 1.15, 7: 1.3 },   // 何問目（0から数える）で音楽のテンポを上げるか。3問目と8問目
  nextDelay: 1.1,                    // 正解のあと、次の問題へ進むまでの秒数
};

// ふわりのセリフ（仮）。data/words.js の sayCorrect / sayWrong が空のときは、この中からえらぶ
const FUWARI_SAY = {
  start:   ["吸い込んだ語句を思い出そう！", "さあ、記憶をとりもどそう！"],
  correct: ["そうだ！思い出した！", "あったかい記憶がもどってきた！", "ふわっ…ひとつ思い出したよ！", "それそれ！", "からだが白くなってきた気がする！"],
  wrong:   ["うーん、まだぼんやりしてる…", "あれ？ちがったみたい…", "だいじょうぶ、いっしょに覚えよう", "メモを読んだら、きっと思い出せるよ"],
  streak:  ["{n}問れんぞく！ふわりがぽかぽかしてきた！", "{n}問れんぞく正解！すごい！"],
  last:    ["さいごの問題だよ！"],
};
const pick = a => a[Math.floor(Math.random() * a.length)];

const Quiz = (() => {
  let list = [], idx = 0, results = [], onEnd = null, locked = false, streak = 0;
  const $ = id => document.getElementById(id);

  // words: 吸い込んだ順の語句、end(results): 終わったときに呼ぶ。results は [{ id, correct }]
  function start(words, end) {
    list = words; idx = 0; results = []; onEnd = end; streak = 0;
    Sound.play("quiz");
    Sound.setTempo(1);
    say(pick(FUWARI_SAY.start));
    show();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function say(text) { $("quiz-say").textContent = text; }

  function dots() {
    const box = $("quiz-dots");
    box.innerHTML = "";
    list.forEach((_, i) => {
      const d = document.createElement("i");
      if (results[i]) d.className = results[i].correct ? "ok" : "ng";
      if (i === idx) d.className += " now";
      box.appendChild(d);
    });
  }

  function show() {
    if (idx >= list.length) { onEnd(results); return; }
    if (QUIZ.tempoUpAt[idx]) Sound.setTempo(QUIZ.tempoUpAt[idx]);
    if (idx === list.length - 1 && idx > 0) say(pick(FUWARI_SAY.last));
    const w = list[idx];
    locked = false;
    $("quiz-count").textContent = `クイズ ${idx + 1} / ${list.length}`;
    dots();
    $("quiz-question").textContent = w.question;
    $("quiz-feedback").classList.add("hidden");
    const box = $("quiz-choices");
    box.innerHTML = "";
    // 選択肢の順番は毎回入れ替える
    shuffle(w.choices.map((c, i) => i)).forEach(i => {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = w.choices[i];
      b.dataset.i = i;
      b.addEventListener("click", () => answer(i, b));
      box.appendChild(b);
    });
    $("screen-quiz").scrollTop = 0;
  }

  function answer(i, btn) {
    if (locked) return;
    locked = true;
    const w = list[idx];
    const ok = i === w.answer;
    results[idx] = { id: w.id, correct: ok };
    const buttons = [...$("quiz-choices").children];
    buttons.forEach(b => {
      b.disabled = true;
      if (Number(b.dataset.i) === w.answer) b.classList.add("correct");
    });
    dots();
    if (ok) {
      Sound.se("correct");
      setTimeout(() => Sound.se("card"), 250);
      streak++;
      say(w.sayCorrect || (streak >= 3 ? pick(FUWARI_SAY.streak).replace("{n}", streak) : pick(FUWARI_SAY.correct)));
      // 正解した語句がカードになる
      const get = $("quiz-get");
      get.textContent = `カードゲット！「${w.word}」`;
      get.classList.remove("hidden");
      get.style.animation = "none"; void get.offsetWidth; get.style.animation = "";
      setTimeout(() => get.classList.add("hidden"), QUIZ.nextDelay * 1000);
      setTimeout(next, QUIZ.nextDelay * 1000);
    } else {
      // 不正解: 正解と一言メモをその場で見せてから次へ
      Sound.se("wrong");
      btn.classList.add("wrong");
      streak = 0;
      say(w.sayWrong || pick(FUWARI_SAY.wrong));
      const fb = $("quiz-feedback");
      fb.innerHTML = "";
      const p1 = document.createElement("p"); p1.style.margin = "0"; p1.textContent = "正解は";
      const p2 = document.createElement("p"); p2.className = "answer"; p2.textContent = w.choices[w.answer];
      const p3 = document.createElement("p"); p3.className = "memo"; p3.textContent = w.memo;
      const b = document.createElement("button"); b.className = "btn"; b.textContent = "つぎへ";
      b.addEventListener("click", next);
      fb.append(p1, p2, p3, b);
      fb.classList.remove("hidden");
      setTimeout(() => fb.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }

  function next() {
    idx++;
    show();
  }

  // クイズの前に、今日あつめたことば（吸い込んだ順）を見せる
  function review(words, done) {
    const ol = $("review-list");
    ol.innerHTML = "";
    words.forEach((w, i) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${i * 0.06}s`;
      const k = document.createElement("span"); k.className = "k"; k.textContent = /[一-龯々]/.test(w.word) ? w.kana : "";
      const t = document.createElement("span"); t.className = "w"; t.textContent = w.word;
      li.append(k, t); ol.appendChild(li);
    });
    const bar = $("review-bar");
    bar.style.transition = "none"; bar.style.width = "0";
    void bar.offsetWidth;
    bar.style.transition = `width ${QUIZ.reviewTime}s linear`;
    bar.style.width = "100%";
    setTimeout(done, QUIZ.reviewTime * 1000);
  }

  return { start, review };
})();
