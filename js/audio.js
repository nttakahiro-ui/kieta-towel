// 音楽と効果音（仮）。Web Audio API で簡単な曲を鳴らす
// 曲の指定はこの SONGS の1か所だけ。file に曲ファイルのパス（例: "audio/battle.mp3"）を入れると、
// プログラムの曲のかわりにそのファイルを流す（本番の曲に差し替えるとき用）
const SONGS = {
  // melody / bass: 1つが8分音符ひとつ。"-" は休み。くり返し流れる
  title: {
    file: null, bpm: 84, wave: "triangle",
    melody: "E5 G5 A5 G5 E5 - D5 - C5 D5 E5 G5 E5 - - - G5 A5 C6 A5 G5 - E5 - D5 E5 D5 C5 D5 - - -",
    bass:   "C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - G2 - - -"
  },
  battle: {
    file: null, bpm: 132, wave: "triangle",
    melody: "C5 E5 G5 E5 A5 G5 E5 D5 C5 D5 E5 G5 D5 - - - E5 G5 A5 C6 A5 G5 E5 G5 D5 E5 C5 D5 C5 - - -",
    bass:   "C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 - C3 - G3 - A2 - E3 - F2 - G2 - C3 - - -"
  },
  quiz: {
    file: null, bpm: 100, wave: "sine",
    melody: "G5 - E5 - C5 - E5 - F5 - D5 - B4 - - - E5 - C5 - A4 - C5 - D5 - G4 - - - -",
    bass:   "C3 - - - C3 - - - G2 - - - G2 - - - A2 - - - A2 - - - G2 - - - G2 - - -"
  },
  card: {
    file: null, bpm: 96, wave: "triangle",
    melody: "C5 E5 G5 C6 - - G5 - A5 G5 E5 G5 - - - - F5 A5 C6 A5 G5 E5 D5 E5 C5 - - - - - - -",
    bass:   "C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - C3 - - -"
  },
  recipe: {
    file: null, bpm: 108, wave: "triangle",
    melody: "C5 C5 G5 G5 A5 A5 G5 - F5 F5 E5 E5 D5 D5 C5 - G5 A5 C6 - A5 G5 E5 - D5 E5 G5 C6 - - - -",
    bass:   "C3 - - - F2 - C3 - F2 - C3 - G2 - C3 - E3 - A2 - F2 - C3 - G2 - - - C3 - - -"
  }
};

const Sound = (() => {
  let ctx = null;        // AudioContext
  let master = null;     // 全体の音量
  let current = null;    // 今流れている曲の名前
  let timer = null;      // 曲を進めるタイマー
  let step = 0;
  let nextTime = 0;
  let tempo = 1;         // テンポの倍率（クイズで上げる）
  let fileAudio = null;  // ファイルの曲を流しているとき

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "A4" → 周波数
  function freq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 0;
    const midi = NOTE[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function parse(s) { return s.trim().split(/\s+/); }

  // iOS の制限で、最初のタップの中で呼ぶ
  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      // 無音を1回鳴らして解禁する
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b; src.connect(ctx.destination); src.start(0);
    } catch (e) { ctx = null; }
  }

  // やわらかい音をひとつ鳴らす
  function tone(f, start, dur, wave, vol) {
    if (!ctx || !f) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(master);
    o.start(start); o.stop(start + dur + 0.05);
  }

  function tick() {
    const song = SONGS[current];
    if (!song || !ctx) return;
    const mel = song._m || (song._m = parse(song.melody));
    const bas = song._b || (song._b = parse(song.bass));
    const stepDur = 60 / song.bpm / 2 / tempo;
    while (nextTime < ctx.currentTime + 0.15) {
      const n = mel[step % mel.length];
      if (n !== "-") {
        tone(freq(n), nextTime, stepDur * 1.8, song.wave, 0.35);
        tone(freq(n) * 2, nextTime, stepDur * 0.9, "sine", 0.05);   // きらっとした重ね音
      }
      const bn = bas[step % bas.length];
      if (bn !== "-") tone(freq(bn), nextTime, stepDur * 3, "sine", 0.4);
      nextTime += stepDur;
      step++;
    }
  }

  function play(name) {
    if (current === name) return;
    stop();
    current = name;
    tempo = 1;
    const song = SONGS[name];
    if (!song) return;
    if (song.file) {
      try {
        fileAudio = new Audio(song.file);
        fileAudio.loop = true;
        fileAudio.volume = 0.6;
        fileAudio.play().catch(() => {});
      } catch (e) { fileAudio = null; }
      return;
    }
    if (!ctx) return;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, 30);
    tick();
  }

  function stop() {
    current = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (fileAudio) { fileAudio.pause(); fileAudio = null; }
  }

  // テンポを上げる（1 = もとの速さ）
  function setTempo(t) {
    tempo = t;
    if (fileAudio) fileAudio.playbackRate = t;
  }

  // 効果音。ふわっとした音にする
  function se(name) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const sweep = (f1, f2, dur, wave, vol, delay = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(f1, t + delay);
      o.frequency.exponentialRampToValueAtTime(f2, t + delay + dur);
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(vol, t + delay + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g); g.connect(master);
      o.start(t + delay); o.stop(t + delay + dur + 0.05);
    };
    if (name === "absorb") {        // 吸い込む
      sweep(500, 1400, 0.35, "sine", 0.45);
      sweep(1800, 2600, 0.25, "sine", 0.12, 0.12);
    } else if (name === "correct") { // 正解
      tone(freq("E6"), t, 0.35, "triangle", 0.4);
      tone(freq("A6"), t + 0.11, 0.5, "triangle", 0.4);
    } else if (name === "wrong") {   // 不正解
      sweep(420, 300, 0.45, "sine", 0.35);
    } else if (name === "damage") {  // やられた
      sweep(320, 110, 0.5, "triangle", 0.5);
    } else if (name === "hit") {     // 弾が当たった（ごく小さく）
      sweep(900, 700, 0.06, "sine", 0.06);
    } else if (name === "start") {
      tone(freq("C5"), t, 0.3, "triangle", 0.35);
      tone(freq("G5"), t + 0.1, 0.4, "triangle", 0.35);
    }
  }

  return { unlock, play, stop, setTempo, se };
})();
