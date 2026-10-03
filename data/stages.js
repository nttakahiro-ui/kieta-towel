// 12ステージの名前と、世界の割り当て
// name: ステージ名（9/14資料の表の名前）
// topic: v53 のテーマ名（何を学ぶステージか）
// recipe: 10枚そろったときのレシピ名（4以降は未定）
// open: 遊べるステージだけ true
// difficulty: 難易度（1〜12）。敵の弾の量・速さ・硬さ・意地の悪い語句の数・中ボスと大ボスの文字耐久が、ここから自動で決まる
//   難易度から各数値への線は js/game.js の BATTLE.difficulty（調整パネルでも動かせる）
// patterns: "data" … 語句の出方・順番・位置は data/words.js の pattern / order / lane のとおり（手で決めたステージ）
//           "auto" … 難易度から自動で決める（意地の悪い語句の数も難易度どおり）
// override: このステージだけ、自動で決まる数値を手で上書きする欄。書いたものだけ上書きされる
//   使える名前: fireScale（敵が撃つ間隔の倍率。小さいほど弾が多い）、speedScale（敵の速さの倍率）、
//              zakoHp（ザコの語句の硬さ）、bossHpScale（中ボス・大ボスの文字耐久の倍率）、tricky（意地の悪い語句の数）
//   例: override: { fireScale: 0.8, tricky: 2 }
// obstacles: 障害物（なければ null）。木は弾をさえぎり、自機がふれると被弾する
//   kind: 障害物の種類。今は "tree"（木）。世界2以降で "rock"（岩）や "mountain"（山）に差しかえる前提
//   sortie: 出す出撃（2 ＝ 本番だけ。探検では出さない）
//   shade: 「木のかげ」にする意地の悪い語句の数（その語句の前に木が来て、木が去るまで撃てない。patterns が "auto" のステージ）
//   items: 置き場所。at ＝ 本番が始まってからの秒数（お題の間は数えない）、x ＝ 横の位置（0〜1）、r ＝ 大きさ（半径 px）
//          gate ＝ 木と木のあいだを通る場所（2本の木。gate はすきまの横の位置 0〜1、gap はすきまの広さ 0〜1）
//          guide ＝ よけ方の案内を出す（"dodge" ＝「木だ！よけて！」と横への矢印、"gate" ＝「あいだを通ろう！」とすきまへの矢印）。1秒スローになる
// weather: 天気（なければ null）。kind ＝ "wind"（風: 自機が横に流される。向きと強さは調整パネル）／"fog"（霧: 画面の上のほうが見えない）
//   ／"rain"（雨）／"snow"（雪）。雨・雪は今は見た目だけ。sortie ＝ 出す出撃（2 ＝ 本番だけ）
//   世界1: ステージ3 夕暮れの風／ステージ4 夜の霧
// theme: 時間帯の色（なければ真昼の色）。time ＝ 時間帯の名前、image ＝ 背景の絵のパス（本番で差しかえる。null なら色で描く）
//   ground 地面／field 畑／furrow 畝／plant・cotton 綿の木と実／creek・creekLight 小川／path あぜ道／bush 草むら
//   light 地面にうすくかける光の色（語句・雑魚・自機・帯にはかけない）／cloudShadow 雲の影／fluff 舞う綿毛
//   tree 木の色（濃い→うすい4つ）／treeShadow・treeShadowScale 木の影の色と長さ／fillerFilter 雑魚の色味（CSS の filter）／wordStroke 語句の縁取りの色（なければ白）
//   世界1: ステージ1 明け方／2 真昼／3 夕暮れ／4 夜（夜の森は木の影を濃く）
//   世界1の坂（10/9）: ステージ1 木1本／ステージ2 木2本＋通る場所／ステージ3 木3本＋通る場所＋木のかげ／ステージ4 木3本＋通る場所＋木のかげ（10/3-6 に霧が入ったぶん、4本から1本減らした）
window.WORLDS = [
  { id: 1, name: "原材料の世界" },
  { id: 2, name: "製造工程の世界" },
  { id: 3, name: "タオル進化の世界" }
];

window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",       topic: "綿という植物",               recipe: "綿花のひみつ",  open: true, difficulty: 1, patterns: "data", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 12, x: 0.4, r: 48, guide: "dodge" } ] }, theme: { time: "明け方", image: null, ground: "#d8e2cc", field: "#ecd9c6", furrow: "#dcc4ab", plant: "#7d9e62", cotton: "#ffffff", creek: "#cfd8ea", creekLight: "rgba(255,255,255,0.7)", path: "#f0dccb", bush: "#cddbbd", light: "rgba(255,185,160,0.16)", cloudShadow: "rgba(120,80,90,0.07)", fluff: "rgba(255,240,235,0.8)", tree: ["#4c7240", "#5a8048", "#68904f", "#83a76a"], treeShadow: "rgba(60,50,60,0.25)", treeShadowScale: 1, fillerFilter: "none" }, weather: null },
  { id: 2,  world: 1, name: "世界のコットン街道",     topic: "品種と産地",                 recipe: "超コットン",        open: true, difficulty: 2, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 6, x: 0.3, r: 48 }, { at: 16, x: 0.7, r: 48 }, { at: 26, gate: 0.45, gap: 0.38, guide: "gate" } ] }, theme: { time: "真昼", image: null, ground: "#dcebc4", field: "#e8dcbc", furrow: "#d8c9a2", plant: "#7fa85a", cotton: "#ffffff", creek: "#c4e0e4", creekLight: "rgba(255,255,255,0.7)", path: "#efe4c8", bush: "#cfe3b3", light: null, cloudShadow: "rgba(70,90,50,0.07)", fluff: "rgba(255,255,255,0.8)", tree: ["#4f7a36", "#5e8c3e", "#6a9a45", "#86b45c"], treeShadow: "rgba(50,70,35,0.25)", treeShadowScale: 1, fillerFilter: "none" }, weather: null },
  { id: 3,  world: 1, name: "糸づくりの坂道",       topic: "糸・番手・撚り",             recipe: "糸つむぎ",         open: true, difficulty: 3, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.72, r: 48 }, { at: 12, x: 0.28, r: 50 }, { at: 20, x: 0.65, r: 50 }, { at: 30, gate: 0.5, gap: 0.36 } ] }, theme: { time: "夕暮れ", image: null, ground: "#d9d3a6", field: "#ecd0a2", furrow: "#d9b88a", plant: "#8a9a50", cotton: "#fff6e8", creek: "#e8c9a8", creekLight: "rgba(255,240,220,0.7)", path: "#f2d3aa", bush: "#cfd09c", light: "rgba(255,140,50,0.2)", cloudShadow: "rgba(110,60,30,0.09)", fluff: "rgba(255,230,200,0.8)", tree: ["#4e6a33", "#5d7a3a", "#6d8a42", "#8fa457"], treeShadow: "rgba(70,40,20,0.33)", treeShadowScale: 1.3, fillerFilter: "sepia(0.25)", wordStroke: "#5a3418" }, weather: { kind: "wind", sortie: 2 } },
  { id: 4,  world: 1, name: "特別な繊維の森",       topic: "綿以外の繊維と特別な糸",     recipe: "（仮）",          open: true, difficulty: 4, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.3, r: 50 }, { at: 10, x: 0.72, r: 50 }, { at: 24, x: 0.7, r: 50 }, { at: 32, gate: 0.6, gap: 0.36 } ] }, theme: { time: "夜", image: null, ground: "#58705c", field: "#73695a", furrow: "#64594b", plant: "#4f6a45", cotton: "#d8dde8", creek: "#3f5f7f", creekLight: "rgba(200,220,255,0.5)", path: "#7f7867", bush: "#4c6550", light: "rgba(25,35,80,0.28)", cloudShadow: "rgba(0,0,20,0.15)", fluff: "rgba(220,230,255,0.55)", tree: ["#22381f", "#2c4728", "#365532", "#466a3e"], treeShadow: "rgba(5,10,20,0.55)", treeShadowScale: 1.3, fillerFilter: "brightness(0.8)" }, weather: { kind: "fog", sortie: 2 } },
  { id: 5,  world: 2, name: "タオルの道しるべ",      topic: "工程の全体像",               recipe: "（仮）",          open: false, difficulty: 5, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 6,  world: 2, name: "糸が生まれる道",       topic: "糸ができるまで",             recipe: "（仮）",          open: false, difficulty: 6, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 7,  world: 2, name: "パイル織りの広間",      topic: "タオルを織る",               recipe: "（仮）",          open: false, difficulty: 7, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 8,  world: 2, name: "仕上げチェックの門",     topic: "仕上げと検査",               recipe: "（仮）",          open: false, difficulty: 8, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 9,  world: 3, name: "タオルのかたち広場",     topic: "タオルの種類とサイズ",       recipe: "（仮）",          open: false, difficulty: 9, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 10, world: 3, name: "生地のひみつ通り",      topic: "織りと生地の工夫",           recipe: "（仮）",          open: false, difficulty: 10, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 11, world: 3, name: "かざりと機能のアトリエ",   topic: "加工とかざりの工夫",         recipe: "（仮）",          open: false, difficulty: 11, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null },
  { id: 12, world: 3, name: "タオルマスターへの道",    topic: "選び方とお手入れ",           recipe: "（仮）",          open: false, difficulty: 12, patterns: "auto", override: {}, obstacles: null, theme: null, weather: null }
];
