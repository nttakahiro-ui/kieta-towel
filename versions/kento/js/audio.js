// 音楽と効果音。曲は場面ごとの mp3（下の FILE_MUSIC。検討版 11/7-4 から全場面 mp3）。効果音は Web Audio API の合成
// 合成曲は「タイトル」1曲だけ残す: タイトルの mp3 が読み終わるまでの待ち受け（最初の画面を無音にしない）。ほかの合成曲は 11/7-4 に消した
//   （消したもの: 森の朝〔タイトルのもと。タイトルに書きこんだ〕・風の畑・きらきらバトル・箱のリズム・コンベア・歯車・星の海・流れ星・星の渦・クイズ・宝石ができた・オープニング）
// 合成曲の書き方（11/3-4）: テンポ・キー・コード進行・メロディ・打楽器パターン・使う楽器。和音とベースはコードから自動
//
// 読み方
//   bpm      テンポ（4分音符が1分に何回）。1マス ＝ 8分音符。1小節 ＝ 8マス
//   key      キー（メモ。音はコードとメロディで決まる）
//   chords   1小節に1つのコード（C、Am、F#m など）。この数がループの小節数
//   melody   メロディの音（"E5" など）。"-" は前の音をのばす（楽器によっては自然に消える）。"." は音を止める
//   fill     メロディのすき間に入る合いの手（melody と同じ書き方。なくてもよい）
//   chord    和音の鳴らし方（1小節8マス。"c" ＝ 3つの音を同時、"t" ＝ 3度と5度の2つ（根音はベースにまかせる）、"1" "3" "5" "8" ＝ 根音・3度・5度・1オクターブ上を1つ、"-" ＝ のばす／休み）
//   bass     ベースの鳴らし方（chord と同じ記号。根音は自動）
//   drums    打楽器（kick ＝ ドン、snare ＝ タッ、hat ＝ シャッ、gigi ＝ ギギ、gashan ＝ ガシャン。1小節8マス。"x" ＝ ふつう、"o" ＝ 小さく）
//   arp      分散和音（chord と同じ記号。8マスより長く書くと、その長さでくり返す）
//   orn      かざりの音（every 小節ごとに、bar 番目の小節の at マス目から、notes を gap 秒おきに。last ＝ 最後の音の長さ、ふだん 0.4 秒）
//   inst     パートごとの楽器（lead リード、musicbox オルゴール、xylo 木琴、bell 金属、pad パッド、bass ベース）と音の高さ（oct）
//   vol      パートごとの音量の倍率（なければ 1）
//   echo     響き（"mid" 世界1、"short" 世界2、"long" 世界3）
//   swing    はねるリズム（裏の8分音符を、8分音符のこの割合だけ遅らせる。0.33 ＝ スウィング、0.5 ＝ 付点の「タッカ」）
const SONGS = {
  // タイトルの待ち受けの合成曲（もとは世界1の発見の旅「森の朝」をテンポ112、ベース「ドッ・ドッ」、裏拍の軽いハイハットにしたもの。11/3-7）
  "タイトル": {
    bpm: 112, key: "C", echo: "mid", swing: 0.33,
    chords: "C F G C   Am F G C",
    melody: "C5 - E5 G5 - - C6 -   A5 - - F5 - - . -   F#5 - D6 - B5 - G5 -   E5 - G5 - C5 - . -  " +
            "E5 - A5 - C6 - - -    C6 - A5 - F5 - . -   G5 - D5 - B5 - G5 -     C6 - G5 E5 C5 - . -",
    chord:  "1 - 5 - 3 - 5 -",
    bass:   "1 - 1 - 1 - 1 -",
    drums:  { hat: "- o - o - o - o" },
    orn:    { every: 4, bar: 3, at: 4, notes: "G6 E6 G6 C7", gap: 0.075, inst: "musicbox" },
    inst:   { melody: "musicbox", chord: "xylo", bass: "bass", oct: { melody: 0, chord: 4, bass: 2 } },
    gain: 1.0,
    vol:    { chord: 0.9, bass: 0.6, drums: 0.6, orn: 0.6 }
  },
};
// 同じ素材の曲: タイトルは「森の朝」をテンポ112で、裏拍の軽いハイハットとベース「ドッ・ドッ」（11/3-7。前は 92 で打楽器なし）。オープニングだけは同じ曲の打楽器なし
// mp3 の曲（11/6-5 から。検討版 11/7-4 で全場面）: 元のファイルは docs/曲/（ここは assets/music/ のコピー）
//   loop ＝ くり返す区間 [始まり, 終わり]（秒）。最初は曲の頭から鳴らし、終わりまで来たら始まりへもどる。終わりのあとの音が消えていくところ・無音は使わない。
//     区間は小節の切れ目（終わり − 始まり ＝ 小節の倍数）で、「終わりの前の2小節」と「始まりの前の2小節」の音（和音・リズム）がいちばん似ているところ
//     （頭の静かな前奏にもどると音が小さくなってとぎれて聞こえるので、2周目からは曲の中ほどへもどる）。つなぎ目は FILE_MUSIC.xfade 秒だけ前後を重ねる（クロスフェード）
//   start ＝ 鳴らし始める位置（秒。11/7-13 決定: どの場面でも、音が十分に大きくリズムが始まっているところから。画面が変わった瞬間に静かなイントロを流さない）。
//     調べ方: くり返す区間の平均とくらべて、開始から2秒・その先6秒の大きさ（K特性）と低い音（〜200Hz）が近い、小節の頭。場面に入るたびに同じ位置から
//     例外: recipe（静かな始まりが意図）と fanfare_head（宝石のジングル。頭から）
//   once ＝ くり返さない（1回鳴って終わり、そのあとは無音）。end ＝ そこまでで止める（秒。終わりは少しだけ小さくして止める）。file ＝ ほかの曲のファイルを使う
//   lufs ＝ 区間の聞こえる大きさ（LUFS。測った値。once の曲は鳴らすところ全体）。どの曲も FILE_MUSIC.lufs の大きさにそろえる。level ＝ 全体の大きさ（合成曲とつりあうように測って決めた値）
//   救出の旅のお題バトル（中ボス・大ボス）も救出の曲のまま流す（曲をとめない・テンポは変えない）。クイズのテンポ上げも mp3 ではしない（音の高さが変わるため）
const FILE_MUSIC = {
  // v ＝ ファイルを差し替えた印（前の曲がブラウザに残らないように）。11/7-14: どの曲も 128kbps に変えた（元の 192kbps は docs/曲/）
  dir: "assets/music/", xfade: 0.12, lufs: -11, level: 0.33,   // level 0.33: 合成曲（発見 −24〜−26、救出 −18〜−20、クイズ −16。同じはかり方）のまん中 −20 くらいに合わせた
  songs: {
    w1_hakken:    { loop: [23.088, 67.088], start: 19.088, lufs: -10.37, v: "1107-14" },   // 120拍/分、22小節
    w1_kyushutsu: { loop: [21.807, 62.950], start: 21.807, lufs: -10.43, v: "1107-14" },   // （11/7-9 の skipIntro は、11/7-13 の start にまとめた）   // 140、24小節
    w1_quiz:      { loop: [8.858, 55.676], start: 0.000, lufs: -12.05, v: "1107-14" },   // 164、32小節
    w2_hakken:    { loop: [10.838, 58.838], start: 6.838, lufs: -11.58, v: "1107-14" },   // 120、24小節
    w2_kyushutsu: { loop: [20.303, 52.735], start: 20.303, lufs: -10.98, v: "1107-14" },   // 148、20小節
    w2_quiz:      { loop: [18.190, 54.190], start: 18.190, lufs: -11.50, v: "1107-14" },   // 160、24小節
    w3_hakken:    { loop: [24.582, 62.582], start: 24.582, lufs: -10.30, v: "1107-14" },   // 120、19小節（11/7-10 に新しい曲へ。66.6秒）
    w3_kyushutsu: { loop: [24.623, 51.289], start: 24.623, lufs: -10.61, v: "1107-14" },   // 144、16小節
    w3_quiz:      { loop: [6.397, 61.898], start: 27.397, lufs: -10.57, v: "1107-14" },   // 160、37小節
    title:        { loop: [17.146, 55.546], start: 31.546, lufs: -11.18, v: "1107-14" },   // 100、16小節（11/6-6）。11/7: 大きさを今の区間で測り直した（前の -10.82 は前の区間の値）
    recipe:       { once: true, lufs: -11.22, v: "1107-14" },               // 90.9秒（11/7-2）。lufs は曲の全体
    map:          { loop: [24.664, 53.464], start: 22.264, lufs: -10.86, v: "1107-14" },   // 100、12小節（11/7-4）
    opening:      { loop: [24.952, 75.352], start: 44.152, lufs: -10.60, v: "1107-14" },   // 100、21小節（11/7-4）
    fanfare:      { loop: [7.100, 59.100], start: 23.100, lufs: -11.91, v: "1107-14" },    // 120、26小節（11/7-4）。頭の 0〜7.1秒がファンファーレ。2周目からは区切り 7.1秒のあとへもどる
    fanfare_head: { file: "fanfare", once: true, end: 7.100, lufs: -11.91 },   // 宝石ができた画面: ファンファーレだけ1回（大きさは fanfare と同じにする。頭は本体より 2.3dB 大きい曲の作り）
  },
  // 場面（js の Sound.play に渡す名前）→ mp3（11/7-2: 合成曲の名前では読みかえない）
  scenes: { title: "title", zukan: "title", stages: "map", warp: "map", review: "map", results: "fanfare", gem: "fanfare_head", recipeBook: "recipe", ending: "recipe", opening: "opening" },
  first: "title",               // 読み終わるまでは合成曲「タイトル」で待つ曲（11/6-6）。ほかの曲は、読み終わるまで無音
  preload: ["title", "map"],    // タイトルを開いたときに読む（main.js が load のあとに呼ぶ）。opening は初めて遊ぶときだけ、recipe ははじめて開いたときに読む
  withWorld: ["fanfare"],       // ステージに入ったときに、その世界の3曲と一緒に読む
  worlds: { 1: { explore: "w1_hakken", rescue: "w1_kyushutsu", quiz: "w1_quiz" }, 2: { explore: "w2_hakken", rescue: "w2_kyushutsu", quiz: "w2_quiz" }, 3: { explore: "w3_hakken", rescue: "w3_kyushutsu", quiz: "w3_quiz" } },
};
const fileOf = k => (FILE_MUSIC.songs[k] && FILE_MUSIC.songs[k].file) || k;   // 曲 → 読むファイルの名前


// 語句の読み上げ（仮）。端末の読み上げ機能を使う。本番で声のファイルに替えるときは speak() を書き換える
const SPEECH = { enabled: true, lang: "ja-JP", rate: 0.95, pitch: 1.1, volume: 1 };

const Sound = (() => {
  let ctx = null;        // AudioContext
  let master = null;     // 全体の音量（音のオン・オフ）
  let musicBus = null;   // 曲だけの音量（場面の切り替えのフェード。効果音は通らない）
  let echoIn = null, echoDelay = null, echoFb = null, echoOut = null;   // 響き（短いディレイ1つ）
  let noiseBuf = null;   // 打楽器・木琴のノイズ
  let current = null;    // 今流れている曲の名前（mp3 のときは「♪曲」）
  let synth = null;      // 今鳴らしている合成曲の名前
  let timer = null;      // 曲を進めるタイマー
  let step = 0;
  let nextTime = 0;
  let tempo = 1;         // テンポの倍率（クイズで上げる）
  let songTempo = 1;     // 曲ごとのテンポの倍率（山場の回。stages.js の musicTempo）
  let fileAudio = null;  // ファイルの曲を流しているとき
  // mp3 の曲（11/6-5）
  let world = 0;           // 今の世界（loadWorld で決める）
  const buffers = {};      // 読めた曲 { key: AudioBuffer }
  const raw = {};          // 読みこんだが、まだ音にしていない曲（AudioContext ができる前）
  const loading = {};      // 読んでいる途中の曲
  let fileKey = null;      // 今流している（または、読めたら流す）mp3 の曲
  let loopRun = null;      // くり返しの状態 { key, g, segs, next, off }
  let loopTimer = null;
  let fallback = null;     // mp3 が読めるまで鳴らしている合成曲の名前（タイトル。11/6-6）
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
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);   // "Bb4" のような ♭ も書ける
    if (!m) return 0;
    const midi = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
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
      for (const k of Object.keys(raw)) decodeRaw(k);   // AudioContext の前に読んでいた mp3 を音にする（11/6-5）
      // 無音を1回鳴らして解禁する
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b; src.connect(ctx.destination); src.start(0);
    } catch (e) { ctx = null; }
    speak(" ", true);   // 読み上げの解禁
  }

  // やわらかい音をひとつ鳴らす（効果音。dest がなければ全体へ）
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
      const end = t + Math.min(1.2, Math.max(0.3, dur * 1.5));   // 重なりすぎないように（同時に鳴らす音は8つまで）
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
    },
    // 機械の音（11/3-7。世界2）: ギギ ＝ 短いノイズを低いフィルタで、音程が少し下がる。ガシャン ＝ 金属の音（ずれた倍音）と短いノイズを重ねる。
    //   どちらも打楽器と同じ音量。「ザー」と聞こえないように短く切る
    gigi(t, v) {
      if (!takeVoice(t, t + 0.09, "gigi")) return;
      const g = out(t, false), bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.Q.value = 6; bp.connect(g);
      bp.frequency.setValueAtTime(1100, t); bp.frequency.exponentialRampToValueAtTime(450, t + 0.08);
      noise(t, 0.09, bp);
      g.gain.exponentialRampToValueAtTime(v * 2.2, t + 0.004);
      g.gain.setValueAtTime(v * 2.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    },
    gashan(t, v) {
      if (!takeVoice(t, t + 0.16, "gashan")) return;
      const g = out(t, false), m = ctx.createGain(), hp = ctx.createBiquadFilter();
      m.gain.value = 0.25; m.connect(g);
      for (const r of [1, 1.47, 2.09, 2.76]) osc("square", 520 * r, t, t + 0.16, m);
      hp.type = "highpass"; hp.frequency.value = 2500; hp.connect(g);
      noise(t, 0.07, hp);
      g.gain.exponentialRampToValueAtTime(v * 1.1, t + 0.002);
      g.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    }
  };

  // ---- 曲の仕組み（11/3-4）: メロディ／コード進行（和音は自動）／ベース（根音を自動）／打楽器 ----
  const PART_VOL = { melody: 0.165, fill: 0.165, chord: 0.083, arp: 0.1, bass: 0.11, drums: 0.06, orn: 0.165 };   // メロディ ＞ 和音 ＞ ベース ＞ 打楽器。全体の大きさは前の仮の曲と同じくらい（ブラウザで測った平均の大きさ）
  // "F#m" → { root: 6, minor: true }。"Fmaj7" "Dm7" "C7" の7の和音も（sev ＝ 7度の半音の位置）
  function chordOf(name) {
    const m = /^([A-G])(#|b)?(maj7|m7|m|7)?$/.exec(name) || [];
    const q = m[3] || "";
    return { root: (NOTE[m[1]] || 0) + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), minor: q === "m" || q === "m7", sev: q === "maj7" ? 11 : q === "m7" || q === "7" ? 10 : 0 };
  }
  // 和音・ベースの記号 → 半音の位置（根音から）。7 ＝ 7度（7の和音でないときは1オクターブ上）、10・12 ＝ 1オクターブ上の3度・5度
  const DEG = (c, d) => ({ 1: 0, 3: c.minor ? 3 : 4, 5: 7, 7: c.sev || 12, 8: 12, 10: c.minor ? 15 : 16, 12: 19 })[d];
  // "c" ＝ 和音の音ぜんぶ（7の和音なら4つ）、"t" ＝ 根音のほか（根音はベースにまかせる）
  const chordNotes = (c, d) => d === "c" ? [0, DEG(c, 3), 7].concat(c.sev ? [c.sev] : []) : d === "t" ? [DEG(c, 3), 7].concat(c.sev ? [c.sev] : []) : [DEG(c, d)];
  // 1マス先の、次の音までのマスの数（"-" は前の音をのばす）
  function holdOf(list, i) { let n = 1; while (n < 16 && list[(i + n) % list.length] === "-") n++; return n; }
  function prep(song) {
    if (song._p) return song._p;
    const ch = parse(song.chords).map(chordOf);
    const bar = s => s ? parse(s) : null;
    song._p = { ch, mel: bar(song.melody), fill: bar(song.fill), chord: bar(song.chord), arp: bar(song.arp), bass: bar(song.bass),
      drums: Object.fromEntries(Object.entries(song.drums || {}).map(([k, s]) => [k, parse(s)])), orn: song.orn ? parse(song.orn.notes) : null };
    return song._p;
  }
  function tickSong(song, sd) {
    const P = prep(song), I = song.inst || {}, oct = I.oct || {}, V = song.vol || {};
    const pv = k => PART_VOL[k] * (V[k] || 1) * (song.gain || 1);   // gain ＝ 曲全体の大きさ（ほかの曲とそろえる）
    const L = song.len || {}, len = (part, d) => L[part] ? Math.min(L[part], d) : d;   // len ＝ パートごとの音の長さの上限（秒）
    const steps = P.ch.length * 8;
    while (nextTime < ctx.currentTime + 0.15) {
      if (song.loop === false && step >= steps) return;   // ループしない曲（宝石ができた）は1回で終わり
      const s = step % steps, b = Math.floor(s / 8), k = s % 8, c = P.ch[b], t = nextTime + (k % 2 ? (song.swing || 0) * sd : 0);   // 裏のマスは少し遅らせて、はねる
      const shift = n => n ? midiFreq(n) : 0;
      // メロディと合いの手（音の名前で書く。oct でオクターブを上げ下げ）
      for (const part of ["melody", "fill"]) {
        const list = part === "melody" ? P.mel : P.fill;
        if (!list) continue;
        const n = list[s % list.length];
        if (n === "-" || n === ".") continue;
        INST[I[part] || "lead"](t, freq(n) * Math.pow(2, oct[part] || 0), len(part, holdOf(list, s) * sd), pv(part), true);
      }
      // 和音と分散和音（コードから自動。arp は和音と別の楽器で、和音の上を動く）
      for (const part of ["chord", "arp"]) {
        const list = P[part];
        if (!list || !I[part]) continue;
        const d = list[(list.length === 8 ? k : s) % list.length];
        if (d === "-" || d === ".") continue;
        const base = 12 * ((oct[part] || 4) + 1) + c.root, dur = len(part, holdOf(list, s) * sd), notes = chordNotes(c, d);
        for (const x of notes) INST[I[part]](t, shift(base + x), dur, pv(part) / (notes.length > 1 ? 1.6 : 1), true);
      }
      // ベース（根音を自動）
      if (P.bass && I.bass) {
        const d = P.bass[k % P.bass.length];
        if (d !== "-") INST.bass(t, shift(12 * ((oct.bass || 2) + 1) + c.root + DEG(c, d)), len("bass", holdOf(P.bass, k) * sd), pv("bass"));
      }
      // かざりの音（鳥・きらめき）。打楽器より先に（音の数がいっぱいのときは打楽器を減らす）
      if (P.orn && b % song.orn.every === song.orn.bar && k === song.orn.at)
        P.orn.forEach((n, j) => INST[song.orn.inst || "musicbox"](t + j * song.orn.gap, freq(n), j === P.orn.length - 1 ? (song.orn.last || 0.4) : song.orn.gap, pv("orn"), true));   // 最後の音だけ少し長く（last 秒）
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
    const song = SONGS[synth];
    if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 2 / tempo / songTempo;
    tickSong(song, stepDur);
  }

  // ===== mp3 の曲（11/6-5） =====
  // 場面から mp3 をえらぶ（11/7-2）。key ＝ Sound.play に渡した場面の名前（title・stages・quiz・explore・rescue・odai など）。なければ null（無音）
  //   scene ＝ 前の形の呼び方（3つ目の引数）。合成曲の名前どうしをくらべて読みかえることはしない
  function fileKeyOf(key, scene) {
    if (FILE_MUSIC.scenes[key]) return FILE_MUSIC.scenes[key];
    const fw = FILE_MUSIC.worlds[world];
    if (!fw) return null;
    const sc = scene || key;
    if (sc === "quiz") return fw.quiz;
    if (sc === "explore") return fw.explore;
    if (sc === "rescue" || sc === "odai") return fw.rescue;
    return null;
  }
  const keepFiles = () => [...new Set(Object.values(FILE_MUSIC.scenes).map(fileOf))];   // 世界によらない曲（ステージに入っても手ばなさない）
  // ステージ一覧を開いたとき（11/7-14）と、ステージに入るとき: その世界の3曲だけを読む（発見の曲から順に）。ほかの世界の曲は手ばなす
  const keepSet = () => { const fw = FILE_MUSIC.worlds[world]; return new Set((fw ? Object.values(fw) : []).concat(keepFiles())); };   // 世界によらない曲（タイトル・地図・ファンファーレなど）は手ばなさない
  function loadWorld(id) {
    world = id;
    const fw = FILE_MUSIC.worlds[id];
    const keep = keepSet();
    for (const k of Object.keys(buffers)) if (!keep.has(k) && k !== fileKey) delete buffers[k];
    for (const k of Object.keys(raw)) if (!keep.has(k)) delete raw[k];
    for (const k of Object.keys(stopper)) if (!keep.has(k)) stopper[k].abort();   // 前の世界の読みかけは止める（遅い回線で、今の世界の曲と取り合わないように。11/7-14）
    if (!fw) return;
    fetchSongs([fw.explore, fw.rescue, fw.quiz].concat(FILE_MUSIC.withWorld), true);
  }
  // 順に読む（読み終わったものはとばす）。11/7-14: 読むのはいつも1曲ずつ（順番待ちは queue）。遅い回線で曲どうしが取り合わないように
  const decoding = {};   // 音にしている途中の曲（11/6-6: タイトルの曲を2回読まないように）
  const stopper = {};    // 読んでいる途中の曲の止め札（AbortController）
  let queue = [], cur = null;   // cur ＝ いま読んでいる曲
  const need = k => !(buffers[k] || raw[k] || loading[k] || decoding[k]);   // 音にしている途中のものも、もう一度は読まない
  // front: 順番待ちの前のほうへ（タイトル・地図の曲のすぐあと）。ステージ一覧のその世界の曲や、いま鳴らしたい曲を先に読むため
  function fetchSongs(keys, front) {
    const ks = [...new Set(keys.map(fileOf))].filter(need);
    if (front) { const pre = queue.filter(k => FILE_MUSIC.preload.includes(k) && !ks.includes(k)); queue = pre.concat(ks, queue.filter(k => !pre.includes(k) && !ks.includes(k))); }
    else queue = queue.concat(ks.filter(k => !queue.includes(k)));
    pump();
  }
  function pump() {
    if (cur) return;
    const keep = keepSet();
    queue = queue.filter(k => need(k) && (keep.has(k) || FILE_MUSIC.preload.includes(k)));   // 世界が替わって要らなくなった曲は読まない
    const k = queue.shift();
    if (!k) return;
    cur = k; loading[k] = true;
    const ac = window.AbortController ? new AbortController() : null; if (ac) stopper[k] = ac;
    const fin = () => { if (cur !== k) return; cur = null; delete loading[k]; delete stopper[k]; pump(); };   // 読み終わったら（止めたときも）次の曲へ
    fetch(FILE_MUSIC.dir + k + ".mp3" + ((FILE_MUSIC.songs[k] || {}).v ? "?v=" + FILE_MUSIC.songs[k].v : ""), ac ? { signal: ac.signal } : {}).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => { raw[k] = ab; fin(); return decodeRaw(k); })   // 音にしているあいだに、次の曲を読み始める
      .catch(fin);
  }
  // タイトルの曲を読む（11/6-6）: 最初の画面が出たあと（main.js が load のあとに呼ぶ）。最初の画面の読み込みとは取り合わない
  //   nextWorld ＝ 次に遊ぶ世界（11/7-14）: タイトル・地図の曲のあとに、その世界の発見の曲も読んでおく（遅い回線でも、ステージを押したときに読み終わっているように）
  function preloadCommon(nextWorld) {
    const fw = FILE_MUSIC.worlds[nextWorld];
    if (fw) world = nextWorld;
    fetchSongs(FILE_MUSIC.preload.concat(fw ? [fw.explore] : []));
  }
  // 音にする（AudioContext が要る。まだなければ unlock のときに）
  function decodeRaw(k) {
    if (!ctx || !raw[k]) return Promise.resolve();
    const ab = raw[k]; delete raw[k]; decoding[k] = true;
    return new Promise(res0 => {
      const res = () => { delete decoding[k]; res0(); };
      const ok = b => {
        buffers[k] = b; res();
        if (fileKey && fileOf(fileKey) === k && (!loopRun || loopRun.key !== fileKey)) {   // （k はファイルの名前。fileKey は曲の名前）
          const fk = fileKey;   // 待っていた曲なら、読めたところから鳴らす
          if (fallback) {   // 合成曲で待っていた（タイトル）: 合成曲を0.5秒で小さくしてから mp3 に替える
            const fb = fallback; fallback = null;
            const now = ctx.currentTime;
            musicBus.gain.cancelScheduledValues(now); musicBus.gain.setValueAtTime(musicBus.gain.value, now); musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.5);
            setTimeout(() => {
              if (fileKey !== fk || synth !== fb) return;
              stopSynth();
              const n2 = ctx.currentTime;
              musicBus.gain.cancelScheduledValues(n2); musicBus.gain.setValueAtTime(0.0001, n2); musicBus.gain.linearRampToValueAtTime(1, n2 + 0.3);
              startLoop(fk);
            }, 500);
          } else startLoop(fk);
        }
      };
      try { const p = ctx.decodeAudioData(ab, ok, () => res()); if (p && p.catch) p.catch(() => res()); } catch (e) { res(); }
    });
  }
  // くり返し: 区間の終わりの xfade 秒前から、次の回（区間の始まり）を重ねて鳴らす
  function startLoop(k) {
    stopLoop();
    const buf = buffers[fileOf(k)], c = FILE_MUSIC.songs[k];
    if (!buf || !ctx) return;
    const g = ctx.createGain();
    g.gain.value = FILE_MUSIC.level * Math.pow(10, (FILE_MUSIC.lufs - c.lufs) / 20);
    g.connect(musicBus);
    if (c.once) {   // くり返さない曲（11/7-2）: 頭から1回鳴らして終わる。end があれば、そこで少しだけ小さくして止める（11/7-4）
      const s = ctx.createBufferSource(); s.buffer = buf; s.connect(g);
      const t0 = ctx.currentTime + 0.05;
      if (c.end) { s.start(t0, 0, c.end); try { g.gain.setValueAtTime(g.gain.value, t0 + c.end - 0.12); g.gain.linearRampToValueAtTime(0.0001, t0 + c.end); } catch (e) {} }
      else s.start(t0, 0);
      loopRun = { key: k, g, segs: [s], next: Infinity, off: 0, once: true };
      return;
    }
    loopRun = { key: k, g, segs: [], next: ctx.currentTime + 0.05, off: 0 };
    addSeg();
    loopTimer = setInterval(() => { if (loopRun && ctx.currentTime > loopRun.next - 3) addSeg(); }, 250);
  }
  function addSeg() {
    const r = loopRun, buf = buffers[fileOf(r.key)], [a, b] = FILE_MUSIC.songs[r.key].loop, X = FILE_MUSIC.xfade;
    const s = ctx.createBufferSource(), sg = ctx.createGain();
    s.buffer = buf; s.connect(sg); sg.connect(r.g);
    const t = r.next, first = r.off === 0;
    const from = first ? (FILE_MUSIC.songs[r.key].start || 0) : a - X / 2;   // 1回目は start（盛り上がっているところ。11/7-13）から            // 2回目からは、始まりの少し前から重ねる。skipIntro の曲は1回目も区間の始まりから
    const seam = t + (b - from) - X / 2;           // 次の回を重ね始める時刻
    const N = 32, fin = new Float32Array(N), fout = new Float32Array(N);
    for (let i = 0; i < N; i++) { fin[i] = Math.sin(i / (N - 1) * Math.PI / 2); fout[i] = Math.cos(i / (N - 1) * Math.PI / 2); }   // 同じ大きさに聞こえる重ね方
    try {   // （同じ時刻に別の変化を重ねると Safari で止まることがあるので、曲線だけを置く。fin は 0 から始まる）
      if (!first) { sg.gain.value = 0; sg.gain.setValueCurveAtTime(fin, t, X); }
      sg.gain.setValueCurveAtTime(fout, seam, X);
    } catch (e) {}
    s.start(t, from);
    s.stop(seam + X + 0.02);
    if (first) { r.from0 = from; r.t0 = t; }   // 鳴らし始めた曲の位置（秒）と時刻（確かめ用）
    r.segs.push(s); if (r.segs.length > 3) r.segs.shift();
    r.next = seam; r.off = 1;
  }
  function stopLoop() {
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
    if (!loopRun) return;
    const r = loopRun; loopRun = null;
    try { const now = ctx.currentTime; r.g.gain.cancelScheduledValues(now); r.g.gain.setValueAtTime(r.g.gain.value, now); r.g.gain.linearRampToValueAtTime(0.0001, now + 0.05); } catch (e) {}
    for (const s of r.segs) { try { s.stop(ctx.currentTime + 0.06); } catch (e) {} }
    setTimeout(() => { try { r.g.disconnect(); } catch (e) {} }, 200);
  }
  function playFile(name, k) {
    if (fileKey === k && current) return;   // 同じ曲（救出の旅とお題バトル、タイトルとステージ一覧など）は、とめずにそのまま流す
    stop();
    current = "♪" + k; fileKey = k; tempo = 1; songTempo = 1;   // （mp3 のときの current は「♪曲」。合成曲の名前とまざらないように。11/7-2）
    if (!ctx) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(1, ctx.currentTime);
    if (buffers[fileOf(k)]) { startLoop(k); return; }
    if (k === FILE_MUSIC.first) { fallback = "タイトル"; startSynth("タイトル", 1); }   // タイトル: 読めるまでは合成曲（最初の画面を無音にしない。11/6-6）
    fetchSongs([k], true);   // まだ読んでいなければ読む（読み中・音にしている途中ならとばす）。いま鳴らしたい曲なので順番待ちの前へ（11/7-14）
    if (raw[fileOf(k)]) decodeRaw(fileOf(k));   // 読めていれば音にして鳴らす。まだ読んでいる途中なら、読めたところから鳴らす（それまでは無音か合成曲）
  }

  // t ＝ 曲ごとのテンポの倍率（山場の回など。なければ 1）
  // 場面の曲を鳴らす（11/7-4: どの場面も mp3。mp3 のない場面は無音）
  function play(key, t, scene) {
    const fk = fileKeyOf(key, scene);
    if (fk) { playFile(key, fk); return; }
    stop();
  }
  function startSynth(name, t) {
    synth = name;
    tempo = 1;
    songTempo = t || 1;
    const song = SONGS[name];
    if (!song) return;
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
  function fadeTo(key, sec = 0.5, t, scene) {
    const fk = fileKeyOf(key, scene), id = fk ? "♪" + fk : "（無音）";
    if (current === id || current === "→" + id) return;
    if (fk && fk === fileKey && current) return;   // 同じ mp3 の曲なら、そのまま流す（救出の旅 ⇄ お題バトル）
    if (!ctx || !musicBus) { play(key, t, scene); return; }
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(0.0001, now + sec);
    if (fileAudio) { const fa = fileAudio; setTimeout(() => fa.pause(), sec * 1000); }
    if (loopRun) { const lr = loopRun; setTimeout(() => { if (loopRun === lr) stopLoop(); }, sec * 1000); }
    fileKey = null;
    setTimeout(() => {
      if (current !== "→" + id) return;   // そのあいだに別の曲になった（play がもとの音量に戻す）
      play(key, t, scene);
      const n2 = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(n2);
      musicBus.gain.setValueAtTime(0.0001, n2);
      musicBus.gain.linearRampToValueAtTime(1, n2 + 0.15);
    }, sec * 1000);
    if (timer) { const tm = timer; setTimeout(() => clearInterval(tm), sec * 1000); timer = null; }
    current = "→" + id;   // 替わるまでのあいだ、同じ曲を二重に呼ばない
  }

  function stopSynth() { if (timer) { clearInterval(timer); timer = null; } }
  function stop() {
    current = null; synth = null;
    fileKey = null;
    fallback = null;
    stopLoop();
    if (timer) { clearInterval(timer); timer = null; }
    if (fileAudio) { fileAudio.pause(); fileAudio = null; }
  }

  // テンポを上げる（1 = もとの速さ）
  function setTempo(t) {
    if (fileKey) return;   // mp3 の曲はテンポを変えない（音の高さが変わるため。11/6-5）
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
    } else if (name === "tick") {    // クイズの残り5秒の「カチ」（11/7-4）
      tone(2093, t, 0.035, "square", 0.12);
      tone(1568, t + 0.012, 0.03, "square", 0.06);
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
    } else if (name === "orbHit") {  // 世界3の回る玉が虫に当たった（11/6-6）: 高く短い「キン」
      tone(freq("A6"), t, 0.12, "triangle", 0.22);
      tone(freq("E7"), t + 0.03, 0.16, "sine", 0.14);
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
    } else if (name === "doorExplore") {   // 扉（11/7-19）: 発見の旅「キラッ」（高い音がきらきらと上がる）
      ["E6", "B6", "E7", "G#7"].forEach((n, i) => tone(freq(n), t + i * 0.045, 0.45 - i * 0.05, "sine", 0.2));
      sweep(2400, 5200, 0.25, "triangle", 0.05, 0.05);
    } else if (name === "doorRescue") {    // 扉: 救出の旅「ドン」（低く重い音と、上にひびく和音）
      sweep(150, 42, 0.45, "sine", 0.9);
      sweep(320, 90, 0.18, "triangle", 0.35);
      ["C5", "G5", "C6"].forEach(n => tone(freq(n), t + 0.04, 0.5, "triangle", 0.14));
    } else if (name === "doorQuiz") {      // 扉: クイズ「ジャーン」（明るい和音をのばす）
      ["C5", "E5", "G5", "C6", "E6"].forEach((n, i) => { tone(freq(n), t + i * 0.012, 1.1, "sawtooth", 0.05); tone(freq(n), t + i * 0.012, 1.2, "triangle", 0.13); });
      sweep(200, 60, 0.3, "sine", 0.5);
    } else if (name === "doorGo") {        // 扉を押した: 光がぱっと広がる
      sweep(500, 2200, 0.3, "sine", 0.18);
      ["G6", "C7"].forEach((n, i) => tone(freq(n), t + 0.08 + i * 0.05, 0.35, "sine", 0.12));
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

  return { unlock, play, fadeTo, stop, loadWorld, preloadCommon, get fileState() { return { world, fileKey, playing: loopRun && loopRun.key, from0: loopRun && loopRun.from0, loaded: Object.keys(buffers), loading: Object.keys(loading) }; }, setTempo, setMuted, get voices() { return voiceEnds.length; }, get dropped() { return dropped; }, get muted() { return muted; }, se, suspend, resume, speak };
})();
