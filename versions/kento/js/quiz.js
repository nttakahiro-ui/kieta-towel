// クイズ。バトルで吸い込んだ順に出題する
const QUIZ = {
  reviewTime: 3,
  previewTime: 3,                    // 受け直しクイズで、出題の前にカード（語句＋一言メモ）を見せる秒数                     // クイズの前に「今日あつめたことば」を見せる秒数
  tempoUpAt: { 2: 140 / 128, 7: 152 / 128 },   // 何問目（0から数える）で音楽のテンポを上げるか。3問目と8問目（11/3-6: クイズの曲 128 → 140 → 152）
  timeLimit: 25,                     // 1問の制限時間（秒。11/7-4 決定）。時間切れは、まちがえたときと同じ（正解を見せて、受け直しに回る）
  warnAt: 5,                         // 残りこの秒数で、バーが赤くなり「カチカチ」が鳴る（1秒ごと）
  nextDelay: 1.6,                    // 正解のあと、次の問題へ進むまでの秒数（10/25-1: カードゲットの演出を見せるため 1.1 → 1.6）
};

// ふわりのセリフ（仮）。data/words.js の sayCorrect / sayWrong が空のときは、この中からえらぶ
const FUWARI_SAY = {
  start:   ["助けたことばを思い出そう！", "さあ、記憶をとりもどそう！"],
  correct: ["そうだ！思い出した！", "あったかい記憶がもどってきた！", "ふわっ…ひとつ思い出したよ！", "それそれ！", "からだが白くなってきた気がする！"],
  wrong:   ["うーん、まだぼんやりしてる…", "あれ？ちがったみたい…", "だいじょうぶ、いっしょに覚えよう", "メモを読んだら、きっと思い出せるよ"],
  streak:  ["{n}問れんぞく！ふわりがぽかぽかしてきた！", "{n}問れんぞく正解！すごい！"],
  last:    ["さいごの問題だよ！"],
  timeUp:  ["あっ、時間切れ…あとでもう一度やってみよう", "時間切れ！正解をいっしょに覚えよう"],
};
const pick = a => a[Math.floor(Math.random() * a.length)];

const Quiz = (() => {
  let list = [], idx = 0, results = [], onEnd = null, locked = false, streak = 0, preview = false, previewTimer = 0;
  let timer = null;   // 制限時間 { left: 残り秒, last: 前の時刻, tick: 次に「カチ」を鳴らす残り秒, raf }
  const $ = id => document.getElementById(id);

  // words: 吸い込んだ順の語句、end(results): 終わったときに呼ぶ。results は [{ id, correct }]
  // o.preview: 受け直しクイズ（出題の前に、その語句のカードを3秒見せる）
  function start(words, end, o) {
    list = words; idx = 0; results = []; onEnd = end; streak = 0; preview = !!(o && o.preview);
    clearTimeout(previewTimer); stopTimer();
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
    $("quiz-feedback").classList.add("hidden");
    stopTimer(); setBar(1, false); $("quiz-time").classList.add("off");   // （受け直しのカードを見せているあいだは、バーを出さない）
    const box = $("quiz-choices");
    box.innerHTML = "";
    if (preview) {   // 受け直し: まずカードを見せる
      locked = true;
      const q = $("quiz-question");
      q.innerHTML = "";
      const card = document.createElement("div"); card.className = "card preview";
      const wd = Cards.wordEl(w);   // カードの語は、ほかのカードと同じに kana のふりがな（11/7-18）
      const m = document.createElement("div"); m.className = "m"; m.innerHTML = Cards.phraseHTML(w.memo);
      card.append(wd, m); q.appendChild(card);
      previewTimer = setTimeout(() => showQuestion(w, box), QUIZ.previewTime * 1000);
      $("screen-quiz").scrollTop = 0;
      return;
    }
    showQuestion(w, box);
  }
  function showQuestion(w, box) {
    locked = false;
    $("quiz-question").innerHTML = Cards.phraseHTML(w.question);   // ふりがな（11/7-18）
    // 選択肢の順番は毎回入れ替える
    shuffle(w.choices.map((c, i) => i)).forEach(i => {
      const b = document.createElement("button");
      b.className = "choice";
      b.innerHTML = Cards.phraseHTML(w.choices[i]);
      b.dataset.i = i;
      b.addEventListener("click", () => answer(i, b));
      box.appendChild(b);
    });
    $("screen-quiz").scrollTop = 0;
    startTimer();
  }

  // ===== 制限時間（11/7-4）。画面が見えていないあいだ（アプリを切りかえたとき）は止まる =====
  function setBar(k, warn) {
    const bar = $("quiz-time");
    bar.firstElementChild.style.width = `${Math.max(0, k) * 100}%`;
    bar.classList.toggle("warn", warn);
  }
  function startTimer() {
    stopTimer();
    $("quiz-time").classList.remove("off");
    timer = { left: QUIZ.timeLimit, last: performance.now(), tick: QUIZ.warnAt, raf: 0 };
    setBar(1, false);
    const step = now => {
      if (!timer) return;
      const dt = Math.min(0.25, (now - timer.last) / 1000); timer.last = now;   // （0.25秒より長いすき間は、画面が止まっていたとみなす）
      if (!$("screen-quiz").classList.contains("active")) { stopTimer(); return; }   // クイズの画面を出た（とちゅうでやめた）
      if (!document.hidden) timer.left -= dt;
      const warn = timer.left <= QUIZ.warnAt;
      setBar(timer.left / QUIZ.timeLimit, warn);
      if (warn && timer.left > 0 && timer.left <= timer.tick) { Sound.se("tick"); timer.tick = Math.ceil(timer.left) - 1; }
      if (timer.left <= 0) { stopTimer(); answer(-1, null); return; }
      timer.raf = requestAnimationFrame(step);
    };
    timer.raf = requestAnimationFrame(step);
  }
  function stopTimer() { if (timer) { cancelAnimationFrame(timer.raf); timer = null; } }

  function answer(i, btn) {
    if (locked) return;
    locked = true;
    stopTimer();   // バーはそこで止める（残りの長さのまま）
    const timeUp = i === -1;   // 時間切れ（11/7-4）: まちがえたときと同じ
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
      // カードゲット（10/25-1）: 「カードゲット！」と、そのことばのカードが光る（毎回）
      get.innerHTML = "";
      const lb = document.createElement("div"); lb.className = "get-label"; lb.textContent = window.TEXTS.quiz.cardGet;
      const cd = document.createElement("div"); cd.className = "card get-card";
      const cw = Cards.wordEl(w);
      cd.appendChild(cw); get.append(lb, cd);
      get.classList.remove("hidden");
      get.style.animation = "none"; void get.offsetWidth; get.style.animation = "";
      setTimeout(() => get.classList.add("hidden"), QUIZ.nextDelay * 1000);
      setTimeout(next, QUIZ.nextDelay * 1000);
    } else {
      // 不正解: 正解と一言メモをその場で見せてから次へ
      Sound.se("wrong");
      if (btn) btn.classList.add("wrong");
      streak = 0;
      say(timeUp ? pick(FUWARI_SAY.timeUp) : (w.sayWrong || pick(FUWARI_SAY.wrong)));
      const fb = $("quiz-feedback");
      fb.innerHTML = "";
      const p1 = document.createElement("p"); p1.style.margin = "0"; p1.innerHTML = Cards.phraseHTML(timeUp ? "時間切れ！ 正解は" : "正解は");
      const p2 = document.createElement("p"); p2.className = "answer"; p2.innerHTML = Cards.phraseHTML(w.choices[w.answer]);
      const p3 = document.createElement("p"); p3.className = "memo"; p3.innerHTML = Cards.phraseHTML(w.memo);
      const b = document.createElement("button"); b.className = "btn"; b.textContent = "次へ";
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

  return { start, review, stop: stopTimer };
})();
