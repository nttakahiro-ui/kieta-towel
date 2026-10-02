// クイズ。バトルで吸い込んだ順に出題する
const QUIZ = {
  tempoUpAt: { 2: 1.15, 7: 1.3 },   // 何問目（0から数える）で音楽のテンポを上げるか。3問目と8問目
  nextDelay: 1.1,                    // 正解のあと、次の問題へ進むまでの秒数
};

const Quiz = (() => {
  let list = [], idx = 0, results = [], onEnd = null, locked = false;
  const $ = id => document.getElementById(id);

  // words: 吸い込んだ順の語句、end(results): 終わったときに呼ぶ。results は [{ id, correct }]
  function start(words, end) {
    list = words; idx = 0; results = []; onEnd = end;
    Sound.play("quiz");
    say("吸い込んだ語句を思い出そう！");
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
      say(w.sayCorrect || "そうだ！思い出した！");
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
      say(w.sayWrong || "うーん、まだぼんやりしてる…");
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

  return { start };
})();
