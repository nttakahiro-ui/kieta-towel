// 音楽と効果音。Web Audio API の合成で曲を鳴らす（曲ファイルは使わない）
// 曲の指定はこの SONGS の1か所。どの場面でどの曲かは data/stages.js の WORLDS の music（発見／救出／お題）
// 曲の書き方は2つ:
//   ・新しい形（11/3-4。世界1の3曲）: テンポ・キー・コード進行・メロディ・打楽器パターン・使う楽器。和音とベースはコードから自動
//   ・前の形（仮の曲）: melody / bass の音列と波形 wave。file に曲ファイルのパスを入れると、そのファイルを流す
//
// 新しい形の読み方
//   bpm      テンポ（4分音符が1分に何回）。1マス ＝ 8分音符。1小節 ＝ 8マス
//   key      キー（メモ。音はコードとメロディで決まる）
//   chords   1小節に1つのコード（C、Am、F#m など）。この数がループの小節数
//   melody   メロディの音（"E5" など）。"-" は前の音をのばす（楽器によっては自然に消える）。"." は音を止める
//   fill     メロディのすき間に入る合いの手（melody と同じ書き方。なくてもよい）
//   chord    和音の鳴らし方（1小節8マス。"c" ＝ 3つの音を同時、"t" ＝ 3度と5度の2つ（根音はベースにまかせる）、"1" "3" "5" "8" ＝ 根音・3度・5度・1オクターブ上を1つ、"-" ＝ のばす／休み）
//   bass     ベースの鳴らし方（chord と同じ記号。根音は自動）
//   drums    打楽器（kick ＝ ドン、snare ＝ タッ、hat ＝ シャッ。1小節8マス。"x" ＝ ふつう、"o" ＝ 小さく）
//   orn      かざりの音（every 小節ごとに、bar 番目の小節の at マス目から、notes を gap 秒おきに）
//   inst     パートごとの楽器（lead リード、musicbox オルゴール、xylo 木琴、bell 金属、pad パッド、bass ベース）と音の高さ（oct）
//   vol      パートごとの音量の倍率（なければ 1）
//   echo     響き（"mid" 世界1、"short" 世界2、"long" 世界3）
//   swing    はねるリズム（裏の8分音符を、8分音符のこの割合だけ遅らせる。0.33 ＝ スウィング、0.5 ＝ 付点の「タッカ」）
const SONGS = {
  // 曲の方針（11/3-5 決定「うきうき」）: 全曲はねるリズム（swing）、長調だけ、メロディは上へ跳ぶ（4度・6度）、2小節の呼びかけ→2小節の答え、
  // ベースは「ドッ・ドッ」と刻み、ハイハットは裏拍。お題バトルは明るいまま速く（テンポと打楽器で緊張を作る）
  // 世界1 発見の旅「森の朝」: オルゴールのメロディ、木琴の分散和音、軽いベース、裏拍の小さなハイハット、4小節に1回の鳥
  "森の朝": {
    bpm: 104, key: "C", echo: "mid", swing: 0.33,
    chords: "C F G C   Am F G C",
    melody: "C5 - E5 G5 - - C6 -   A5 - - F5 - - . -   F#5 - D6 - B5 - G5 -   E5 - G5 - C5 - . -  " +
            "E5 - A5 - C6 - - -    C6 - A5 - F5 - . -   G5 - D5 - B5 - G5 -     C6 - G5 E5 C5 - . -",
    chord:  "1 - 5 - 3 - 5 -",
    bass:   "1 - 1 - 5 - 1 -",
    drums:  { hat: "- o - o - o - o" },
    orn:    { every: 4, bar: 3, at: 4, notes: "G6 E6 G6 C7", gap: 0.075, inst: "musicbox" },
    inst:   { melody: "musicbox", chord: "xylo", bass: "bass", oct: { melody: 0, chord: 4, bass: 2 } },
    vol:    { chord: 0.9, bass: 0.6, drums: 0.6, orn: 0.6 }
  },
  // 世界1 救出の旅「風の畑」: リードのメロディ、木琴の合いの手、付点の「タッカ」、ベース「ドッ・ドッ」（山場の回 3・4 は stages.js の musicTempo で1割速く）
  "風の畑": {
    bpm: 124, key: "G", echo: "mid", swing: 0.5,
    chords: "G C D G   Em C D G",
    melody: "D5 - G5 - B5 - D6 -   E6 - - C6 - - . -   F#5 - D6 - A5 - F#5 -   G5 - B5 - G5 - . -  " +
            "B4 - E5 - G5 - B5 -   E5 - C6 - B5 - G5 -   F#5 - A5 - D6 - C6 -    B5 - - - G5 - . -",
    fill:   "- - - - - - - -   - - - - - - B5 D6   - - - - - - - -   - - - - - - E6 D6  " +
            "- - - - - - - -   - - - - - - - -     - - - - - - - -   - - - - - - D6 B5",
    chord:  "- - c - - - c -",
    bass:   "1 - 1 - 1 - 5 -",
    drums:  { kick: "x - - - x - - -", snare: "- - o - - - o -", hat: "- x - x - x - x" },
    inst:   { melody: "lead", fill: "xylo", chord: "xylo", bass: "bass", oct: { melody: 0, fill: 0, chord: 4, bass: 2 } },
    vol:    { fill: 0.8, chord: 0.55 }
  },
  // 世界1 お題バトル「きらきらバトル」: 明るいまま速く。リード、強めのベース、しっかりした打楽器、2小節ごとにオルゴールの高いきらめき
  "きらきらバトル": {
    bpm: 144, key: "G", echo: "mid", swing: 0.3,
    chords: "G Em C D   G Bm C D",
    melody: "D5 - G5 - B5 - G5 -   G5 - E6 - B5 - G5 -   C5 - A5 - G5 - E5 -   F#5 - A5 - D6 - . -  " +
            "B5 - D6 - G6 - D6 -   F#6 - D6 - B5 - F#5 -   E5 - C6 - G5 - E5 -   D5 - F#5 - A5 - D6 -",
    chord:  "t - - - - - - -",
    bass:   "1 - 1 1 - 1 5 -",
    drums:  { kick: "x - - x - - x -", snare: "- - x - - - x -", hat: "o x o x o x o x" },
    orn:    { every: 2, bar: 1, at: 6, notes: "B6 D7", gap: 0.09, inst: "musicbox" },
    inst:   { melody: "lead", chord: "pad", bass: "bass", oct: { melody: 0, chord: 4, bass: 2 } },
    vol:    { bass: 1.3, drums: 1.2, chord: 0.7, orn: 0.7 }
  },
  // ここから前の形の仮の曲（世界2・3、タイトル・クイズなど）。melody / bass: 1つが8分音符ひとつ。"-" は休み。くり返し流れる
  title: {
    file: null, bpm: 84, wave: "triangle",
    melody: "E5 G5 A5 G5 E5 - D5 - C5 D5 E5 G5 E5 - - - G5 A5 C6 A5 G5 - E5 - D5 E5 D5 C5 D5 - - -",
    bass:   "C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - G2 - - -"
  },
  recon: {   // 探検（出撃1）の静かめの曲（10/3-9。仮）
    file: null, bpm: 76, wave: "sine",
    melody: "E5 - - - G5 - - - D5 - - - - - - - C5 - - - E5 - - - A4 - - - - - - -",
    bass:   "A2 - - - - - - - F2 - - - - - - - C3 - - - - - - - G2 - - - - - - -"
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

// 語句の読み上げ（仮）。端末の読み上げ機能を使う。本番で声のファイルに替えるときは speak() を書き換える
const SPEECH = { enabled: true, lang: "ja-JP", rate: 0.95, pitch: 1.1, volume: 1 };

const Sound = (() => {
  let ctx = null;        // AudioContext
  let master = null;     // 全体の音量（音のオン・オフ）
  let musicBus = null;   // 曲だけの音量（場面の切り替えのフェード。効果音は通らない）
  let echoIn = null, echoDelay = null, echoFb = null, echoOut = null;   // 響き（短いディレイ1つ）
  let noiseBuf = null;   // 打楽器・木琴のノイズ
  let current = null;    // 今流れている曲の名前
  let timer = null;      // 曲を進めるタイマー
  let step = 0;
  let nextTime = 0;
  let tempo = 1;         // テンポの倍率（クイズで上げる）
  let songTempo = 1;     // 曲ごとのテンポの倍率（山場の回。stages.js の musicTempo）
  let fileAudio = null;  // ファイルの曲を流しているとき
  // 音のオン・オフ（10/21-1）。オフのときは曲・効果音・読み上げを鳴らさない。設定は main.js がブラウザに保存する
  const VOLUME = 0.22;
  let muted = false;
  const vol = () => (muted ? 0.0001 : VOLUME);
  function setMuted(m) {
    muted = !!m;
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(vol(), ctx.currentTime); }
    if (fileAudio) fileAudio.volume = muted ? 0 : 0.6;
    if (muted && window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "A4" → 周波数
  function freq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 0;
    const midi = NOTE[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const midiFreq = n => 440 * Math.pow(2, (n - 69) / 12);
  function parse(s) { return s.trim().split(/\s+/); }

  // iOS の制限で、最初のタップの中で呼ぶ
  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = vol();
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        musicBus.connect(master);
        echoIn = ctx.createGain(); echoDelay = ctx.createDelay(1); echoFb = ctx.createGain(); echoOut = ctx.createGain();
        echoIn.connect(echoDelay); echoDelay.connect(echoFb); echoFb.connect(echoDelay); echoDelay.connect(echoOut); echoOut.connect(musicBus);
        setEcho("mid");
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended") ctx.resume();
      // 無音を1回鳴らして解禁する
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b; src.connect(ctx.destination); src.start(0);
    } catch (e) { ctx = null; }
    speak(" ", true);   // 読み上げの解禁
  }

  // やわらかい音をひとつ鳴らす（効果音と前の形の曲。dest がなければ全体へ）
  function tone(f, start, dur, wave, vol, dest) {
    if (!ctx || !f) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest || master);
    o.start(start); o.stop(start + dur + 0.05);
  }

  // ---- 響き（世界1 中、世界2 短、世界3 長。11/3-4） ----
  const ECHO = { short: { time: 0.16, fb: 0.2, wet: 0.18 }, mid: { time: 0.3, fb: 0.3, wet: 0.24 }, long: { time: 0.45, fb: 0.4, wet: 0.3 } };
  function setEcho(kind) {
    const e = ECHO[kind] || ECHO.mid, t = ctx.currentTime;
    echoDelay.delayTime.setValueAtTime(e.time, t); echoFb.gain.setValueAtTime(e.fb, t); echoOut.gain.setValueAtTime(e.wet, t);
  }

  // ---- 楽器7つ（11/3-4）。どれも play(時刻, 周波数, 長さ, 音量, 響きに送るか) ----
  const MAX_VOICES = 8;   // 同時に鳴らす音の数の上限（こえた音は鳴らさない。重さのため）
  let voiceEnds = [], dropped = {};
  function takeVoice(t, end, who) {
    voiceEnds = voiceEnds.filter(x => x > t + 0.005);   // ちょうど終わる音は数えない（時刻の計算の小さなずれ）
    if (voiceEnds.length >= MAX_VOICES) { dropped[who] = (dropped[who] || 0) + 1; return false; }   // 鳴らせなかった音の数（調べる用）
    voiceEnds.push(end);
    return true;
  }
  // 音量の形（エンベロープ）をつけた出口。響きにも送るときは send
  function out(t, send) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.connect(musicBus);
    if (send) g.connect(echoIn);
    return g;
  }
  function osc(type, f, t, end, dest, detune) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end + 0.05);
    return o;
  }
  function noise(t, dur, dest) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const INST = {
    // リード: 三角波＋少しの矩形波。立ち上がりと減衰（メロディ用）
    lead(t, f, dur, v, send) {
      const end = t + Math.max(0.12, dur);   // 次の音が出るときには消えている
      if (!takeVoice(t, end, "lead")) return;
      const g = out(t, send), sq = ctx.createGain();
      sq.gain.value = 0.12; sq.connect(g);
      osc("triangle", f, t, end, g); osc("square", f, t, end, sq);
      g.gain.exponentialRampToValueAtTime(v, t + 0.015);
      g.gain.exponentialRampToValueAtTime(v * 0.65, t + 0.15);
      g.gain.setValueAtTime(v * 0.65, Math.max(t + 0.15, end - 0.06));
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    },
    // オルゴール: 正弦波に高い倍音を重ね、短く減衰
    musicbox(t, f, dur, v, send) {
      const end = t + Math.min(1.0, Math.max(0.25, dur * 1.3));   // 重なりすぎないように（同時に鳴らす音は8つまで）
      if (!takeVoice(t, end, "musicbox")) return;
      const g = out(t, send), h = ctx.createGain();
      h.gain.value = 0.18; h.connect(g);
      osc("sine", f, t, end, g); osc("sine", f * 4, t, end, h); osc("sine", f * 3, t, end, h);
      g.gain.exponentialRampToValueAtTime(v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    },
    // 木琴: 短い減衰の正弦波に軽いノイズ
    xylo(t, f, dur, v, send) {
      const end = t + 0.3;
      if (!takeVoice(t, end, "xylo")) return;
      const g = out(t, send);
      osc("sine", f, t, end, g);
      g.gain.exponentialRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      const n = ctx.createGain(), hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 2500;
      n.gain.setValueAtTime(v * 0.25, t); n.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      hp.connect(n); n.connect(musicBus); noise(t, 0.03, hp);
    },
    // 金属（ベル）: 周波数の少しずれた正弦波を3本重ねて減衰
    bell(t, f, dur, v, send) {
      const end = t + 1.6;
      if (!takeVoice(t, end, "bell")) return;
      const g = out(t, send), h = ctx.createGain();
      h.gain.value = 0.35; h.connect(g);
      osc("sine", f, t, end, g); osc("sine", f * 1.004, t, end, g); osc("sine", f * 2.76, t, end, h);
      g.gain.exponentialRampToValueAtTime(v * 0.7, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    },
    // パッド: のこぎり波をローパスでやわらかく。ゆっくり立ち上がる（和音の敷き）
    pad(t, f, dur, v, send) {
      const end = t + Math.max(0.5, dur);   // 次の和音と重ならないように、のばした長さの中で消える
      if (!takeVoice(t, end, "pad")) return;
      const g = out(t, send), lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.5; lp.connect(g);
      osc("sawtooth", f, t, end, lp, -6); osc("sawtooth", f, t, end, lp, 6);
      g.gain.exponentialRampToValueAtTime(v, t + 0.35);
      g.gain.setValueAtTime(v, Math.max(t + 0.35, end - 0.15));
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    },
    // ベース: 三角波。低い音域、短め
    bass(t, f, dur, v) {
      const end = t + Math.min(0.4, dur * 0.85);
      if (!takeVoice(t, end, "bass")) return;
      const g = out(t, false);
      osc("triangle", f, t, end, g);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    },
    // 打楽器: ドン（kick）・タッ（snare）・シャッ（hat）。ノイズ＋フィルタ（ドンは低い音が下がる）
    kick(t, v) {
      if (!takeVoice(t, t + 0.2, "kick")) return;
      const g = out(t, false), o = osc("sine", 140, t, t + 0.2, g);
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.exponentialRampToValueAtTime(v * 1.6, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    },
    snare(t, v) {
      if (!takeVoice(t, t + 0.14, "snare")) return;
      const g = out(t, false), bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.8; bp.connect(g);
      noise(t, 0.14, bp);
      g.gain.exponentialRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    },
    hat(t, v) {
      if (!takeVoice(t, t + 0.05, "hat")) return;
      const g = out(t, false), hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 7000; hp.connect(g);
      noise(t, 0.05, hp);
      g.gain.exponentialRampToValueAtTime(v, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    }
  };

  // ---- 曲の仕組み（11/3-4）: メロディ／コード進行（和音は自動）／ベース（根音を自動）／打楽器 ----
  const PART_VOL = { melody: 0.165, fill: 0.165, chord: 0.083, bass: 0.11, drums: 0.06, orn: 0.165 };   // メロディ ＞ 和音 ＞ ベース ＞ 打楽器。全体の大きさは前の仮の曲と同じくらい（ブラウザで測った平均の大きさ）
  // "F#m" → { root: 6, minor: true }
  function chordOf(name) {
    const m = /^([A-G])(#|b)?(m?)$/.exec(name) || [];
    return { root: (NOTE[m[1]] || 0) + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), minor: m[3] === "m" };
  }
  // 和音・ベースの記号 → 半音の位置（根音から）
  const DEG = (c, d) => ({ 1: 0, 3: c.minor ? 3 : 4, 5: 7, 8: 12 })[d];
  // 1マス先の、次の音までのマスの数（"-" は前の音をのばす）
  function holdOf(list, i) { let n = 1; while (n < 16 && list[(i + n) % list.length] === "-") n++; return n; }
  function prep(song) {
    if (song._p) return song._p;
    const ch = parse(song.chords).map(chordOf);
    const bar = s => s ? parse(s) : null;
    song._p = { ch, mel: bar(song.melody), fill: bar(song.fill), chord: bar(song.chord), bass: bar(song.bass),
      drums: Object.fromEntries(Object.entries(song.drums || {}).map(([k, s]) => [k, parse(s)])), orn: song.orn ? parse(song.orn.notes) : null };
    return song._p;
  }
  function tickSong(song, sd) {
    const P = prep(song), I = song.inst || {}, oct = I.oct || {}, V = song.vol || {};
    const pv = k => PART_VOL[k] * (V[k] || 1);
    const steps = P.ch.length * 8;
    while (nextTime < ctx.currentTime + 0.15) {
      const s = step % steps, b = Math.floor(s / 8), k = s % 8, c = P.ch[b], t = nextTime + (k % 2 ? (song.swing || 0) * sd : 0);   // 裏のマスは少し遅らせて、はねる
      const shift = n => n ? midiFreq(n) : 0;
      // メロディと合いの手（音の名前で書く。oct でオクターブを上げ下げ）
      for (const part of ["melody", "fill"]) {
        const list = part === "melody" ? P.mel : P.fill;
        if (!list) continue;
        const n = list[s % list.length];
        if (n === "-" || n === ".") continue;
        INST[I[part] || "lead"](t, freq(n) * Math.pow(2, oct[part] || 0), holdOf(list, s) * sd, pv(part), true);
      }
      // 和音（コードから自動）
      if (P.chord && I.chord) {
        const d = P.chord[k % P.chord.length];
        if (d !== "-") {
          const base = 12 * ((oct.chord || 4) + 1) + c.root, dur = holdOf(P.chord, k) * sd;
          const notes = d === "c" ? [0, DEG(c, 3), 7] : d === "t" ? [DEG(c, 3), 7] : [DEG(c, d)];
          for (const x of notes) INST[I.chord](t, shift(base + x), dur, pv("chord") / (notes.length > 1 ? 1.6 : 1), true);
        }
      }
      // ベース（根音を自動）
      if (P.bass && I.bass) {
        const d = P.bass[k % P.bass.length];
        if (d !== "-") INST.bass(t, shift(12 * ((oct.bass || 2) + 1) + c.root + DEG(c, d)), holdOf(P.bass, k) * sd, pv("bass"));
      }
      // かざりの音（鳥・きらめき）。打楽器より先に（音の数がいっぱいのときは打楽器を減らす）
      if (P.orn && b % song.orn.every === song.orn.bar && k === song.orn.at)
        P.orn.forEach((n, j) => INST[song.orn.inst || "musicbox"](t + j * song.orn.gap, freq(n), j === P.orn.length - 1 ? 0.4 : song.orn.gap, pv("orn"), true));   // 最後の音だけ少し長く
      // 打楽器
      for (const [name, pat] of Object.entries(P.drums)) {
        const d = pat[s % pat.length];
        if (d === "x" || d === "o") INST[name](t, pv("drums") * (d === "o" ? 0.5 : 1));
      }
      nextTime += sd;
      step++;
    }
  }

  function tick() {
    const song = SONGS[current];
    if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 2 / tempo / songTempo;
    if (song.chords) { tickSong(song, stepDur); return; }
    // 前の形の仮の曲
    const mel = song._m || (song._m = parse(song.melody));
    const bas = song._b || (song._b = parse(song.bass));
    while (nextTime < ctx.currentTime + 0.15) {
      const n = mel[step % mel.length];
      if (n !== "-") {
        tone(freq(n), nextTime, stepDur * 1.8, song.wave, 0.35, musicBus);
        tone(freq(n) * 2, nextTime, stepDur * 0.9, "sine", 0.05, musicBus);   // きらっとした重ね音
      }
      const bn = bas[step % bas.length];
      if (bn !== "-") tone(freq(bn), nextTime, stepDur * 3, "sine", 0.4, musicBus);
      nextTime += stepDur;
      step++;
    }
  }

  // t ＝ 曲ごとのテンポの倍率（山場の回など。なければ 1）
  function play(name, t) {
    if (current === name) return;
    stop();
    current = name;
    tempo = 1;
    songTempo = t || 1;
    const song = SONGS[name];
    if (!song) return;
    if (song.file) {
      try {
        fileAudio = new Audio(song.file);
        fileAudio.loop = true;
        fileAudio.volume = muted ? 0 : 0.6;
        fileAudio.play().catch(() => {});
      } catch (e) { fileAudio = null; }
      return;
    }
    if (!ctx) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(1, ctx.currentTime);
    setEcho(song.echo || "mid");
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, 30);
    tick();
  }

  // 前の曲を少しずつ小さくしてから、次の曲に替える（場面の切り替え。11/3-4 から0.5秒。曲だけを小さくし、効果音は小さくしない）
  function fadeTo(name, sec = 0.5, t) {
    if (current === name || current === "→" + name) return;
    if (!ctx || !musicBus) { play(name, t); return; }
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(0.0001, now + sec);
    if (fileAudio) { const fa = fileAudio; setTimeout(() => fa.pause(), sec * 1000); }
    setTimeout(() => {
      if (current !== "→" + name) return;   // そのあいだに別の曲になった（play がもとの音量に戻す）
      play(name, t);
      const n2 = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(n2);
      musicBus.gain.setValueAtTime(0.0001, n2);
      musicBus.gain.linearRampToValueAtTime(1, n2 + 0.15);
    }, sec * 1000);
    if (timer) { const tm = timer; setTimeout(() => clearInterval(tm), sec * 1000); timer = null; }
    current = "→" + name;   // 替わるまでのあいだ、同じ曲を二重に呼ばない
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
    } else if (name === "boss") {    // 大ボスが出た
      tone(freq("A5"), t, 0.3, "triangle", 0.3);
      tone(freq("F5"), t + 0.15, 0.3, "triangle", 0.3);
      tone(freq("D5"), t + 0.3, 0.6, "triangle", 0.35);
    } else if (name === "card") {    // カードゲット
      tone(freq("C6"), t, 0.2, "sine", 0.25);
      tone(freq("E6"), t + 0.07, 0.2, "sine", 0.25);
      tone(freq("G6"), t + 0.14, 0.4, "sine", 0.25);
    } else if (name === "shine") {   // 1回目の語句が光って消える（きらん）
      tone(freq("B6"), t, 0.25, "sine", 0.18);
      tone(freq("E7"), t + 0.08, 0.35, "sine", 0.12);
    } else if (name === "stack") {   // レシピの演出①: カードが1枚重なる（ごく小さく。10/25-15）
      tone(freq("G6"), t, 0.12, "sine", 0.08);
    } else if (name === "rise") {    // レシピの演出②: 光の玉が宝石の色に変わる（音が高まる）
      sweep(400, 1700, 0.5, "triangle", 0.12);
      tone(freq("C6"), t + 0.25, 0.3, "sine", 0.1);
    } else if (name === "gem") {     // レシピの演出③: 宝石が台座にはまる
      ["C5", "E5", "G5", "C6", "E6", "G6", "C7"].forEach((n, i) => tone(freq(n), t + i * 0.05, 0.9, "sine", 0.16));
    } else if (name === "power") {   // パワーアップ
      ["C6", "E6", "G6", "C7"].forEach((n, i) => tone(freq(n), t + i * 0.06, 0.25, "triangle", 0.2));
    } else if (name === "powerTop") {   // パワー4段目（11/1-4）: 長く高く上がって、和音で終わる
      sweep(300, 1800, 0.35, "sawtooth", 0.08);
      ["C6", "E6", "G6", "C7", "E7", "G7"].forEach((n, i) => tone(freq(n), t + i * 0.05, 0.35, "triangle", 0.2));
      ["C6", "E6", "G6", "C7"].forEach(n => tone(freq(n), t + 0.32, 0.9, "sine", 0.12));
    } else if (name === "crack") {   // 文字が砕ける（ぱりん、でもやわらかく）
      sweep(1800, 900, 0.12, "triangle", 0.16);
      tone(freq("A6"), t + 0.04, 0.2, "sine", 0.1);
    } else if (name === "light") {   // 「ぜんぶ消し」
      ["C5", "G5", "C6", "E6", "G6", "C7"].forEach((n, i) => tone(freq(n), t + i * 0.05, 0.8, "sine", 0.18));
      sweep(300, 1600, 0.6, "triangle", 0.12);
    } else if (name === "odai") {    // お題が出た
      ["E5", "A5", "C6"].forEach((n, i) => tone(freq(n), t + i * 0.12, 0.4, "triangle", 0.22));
    } else if (name === "boing") {   // ダミーで弾がはね返る（ぼよん）
      sweep(260, 520, 0.12, "sine", 0.45);        // 10/25-16: 大きく（前は 0.25・0.18）
      sweep(520, 300, 0.15, "sine", 0.35, 0.1);
    } else if (name === "hirameki") { // ひらめき
      ["G6", "C7", "E7"].forEach((n, i) => tone(freq(n), t + i * 0.05, 0.5, "sine", 0.16));
    } else if (name === "shield") {  // 盾が守った
      tone(freq("E5"), t, 0.3, "triangle", 0.25);
      tone(freq("B5"), t + 0.06, 0.4, "sine", 0.2);
    } else if (name === "bomb") {    // たねを落とす（ひゅっ）
      sweep(1200, 500, 0.18, "sine", 0.08);
    } else if (name === "pop") {     // 花がぽんっと咲く
      sweep(700, 1100, 0.09, "triangle", 0.18);
      tone(freq("E6"), t + 0.05, 0.15, "sine", 0.06);
    } else if (name === "seedThrow") {   // 光のたねを投げる（ぽん。11/2 決定。0.25秒ごとに鳴るので、ごく小さく）
      sweep(520, 760, 0.07, "sine", 0.05);
    } else if (name === "seedPop") {     // 光のたねがはじける（ぱっ。小さく）
      sweep(1500, 2300, 0.05, "triangle", 0.045);
    } else if (name === "item") {    // 綿のたねを拾う
      tone(freq("G5"), t, 0.15, "sine", 0.25);
      tone(freq("D6"), t + 0.06, 0.25, "sine", 0.25);
    } else if (name === "start") {
      tone(freq("C5"), t, 0.3, "triangle", 0.35);
      tone(freq("G5"), t + 0.1, 0.4, "triangle", 0.35);
    }
  }

  // 読み上げ。iOS は最初のタップの中で一度話しておく必要があるので、unlock でも呼ぶ
  function speak(text, silent) {
    try {
      if (!SPEECH.enabled || !window.speechSynthesis || (muted && !silent)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH.lang; u.rate = SPEECH.rate; u.pitch = SPEECH.pitch;
      u.volume = silent ? 0 : SPEECH.volume;
      const v = window.speechSynthesis.getVoices().find(x => x.lang && x.lang.replace("_", "-").startsWith("ja"));
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* 読み上げが使えなくても続ける */ }
  }

  // アプリが裏に回ったときに止める／戻ったときに再開する
  function suspend() {
    try { if (ctx && ctx.state === "running") ctx.suspend(); } catch (e) {}
    if (fileAudio) fileAudio.pause();
  }
  function resume() {
    try { if (ctx && ctx.state !== "running") ctx.resume(); } catch (e) {}
    if (fileAudio) fileAudio.play().catch(() => {});
    if (ctx && current && !fileAudio) nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
  }

  return { unlock, play, fadeTo, stop, setTempo, setMuted, get voices() { return voiceEnds.length; }, get dropped() { return dropped; }, get muted() { return muted; }, se, suspend, resume, speak };
})();
