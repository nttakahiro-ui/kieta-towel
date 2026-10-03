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
//   sortie: 出す出撃（2 ＝ 本番だけ。偵察では出さない）
//   shade: 「木のかげ」にする意地の悪い語句の数（その語句の前に木が来て、木が去るまで撃てない。patterns が "auto" のステージ）
//   items: 置き場所。at ＝ 本番が始まってからの秒数（お題の間は数えない）、x ＝ 横の位置（0〜1）、r ＝ 大きさ（半径 px）
//          gate ＝ 木と木のあいだを通る場所（2本の木。gate はすきまの横の位置 0〜1、gap はすきまの広さ 0〜1）
//   世界1の坂（10/9）: ステージ1 木1本／ステージ2 木2本＋通る場所／ステージ3 木3本＋通る場所＋木のかげ／ステージ4 木2本＋通る場所＋木のかげ
window.WORLDS = [
  { id: 1, name: "原材料の世界", difficulty: 1, patterns: "data", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 12, x: 0.4, r: 48 } ] } },
  { id: 2, name: "製造工程の世界", difficulty: 2, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 6, x: 0.3, r: 48 }, { at: 16, x: 0.7, r: 48 }, { at: 26, gate: 0.45, gap: 0.38 } ] } },
  { id: 3, name: "タオル進化の世界", difficulty: 3, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.72, r: 48 }, { at: 12, x: 0.28, r: 50 }, { at: 20, x: 0.65, r: 50 }, { at: 30, gate: 0.5, gap: 0.36 } ] } }
];

window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",       topic: "綿という植物",               recipe: "綿花のひみつ",  open: true, difficulty: 1, patterns: "data", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 12, x: 0.4, r: 48 } ] } },
  { id: 2,  world: 1, name: "世界のコットン街道",     topic: "品種と産地",                 recipe: "超コットン",        open: true, difficulty: 2, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 6, x: 0.3, r: 48 }, { at: 16, x: 0.7, r: 48 }, { at: 26, gate: 0.45, gap: 0.38 } ] } },
  { id: 3,  world: 1, name: "糸づくりの坂道",       topic: "糸・番手・撚り",             recipe: "糸つむぎ",         open: true, difficulty: 3, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.72, r: 48 }, { at: 12, x: 0.28, r: 50 }, { at: 20, x: 0.65, r: 50 }, { at: 30, gate: 0.5, gap: 0.36 } ] } },
  { id: 4,  world: 1, name: "特別な繊維の森",       topic: "綿以外の繊維と特別な糸",     recipe: "（仮）",          open: true, difficulty: 4, patterns: "auto", override: {}, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.3, r: 50 }, { at: 14, x: 0.75, r: 50 }, { at: 30, gate: 0.6, gap: 0.36 } ] } },
  { id: 5,  world: 2, name: "タオルの道しるべ",      topic: "工程の全体像",               recipe: "（仮）",          open: false, difficulty: 5, patterns: "auto", override: {}, obstacles: null },
  { id: 6,  world: 2, name: "糸が生まれる道",       topic: "糸ができるまで",             recipe: "（仮）",          open: false, difficulty: 6, patterns: "auto", override: {}, obstacles: null },
  { id: 7,  world: 2, name: "パイル織りの広間",      topic: "タオルを織る",               recipe: "（仮）",          open: false, difficulty: 7, patterns: "auto", override: {}, obstacles: null },
  { id: 8,  world: 2, name: "仕上げチェックの門",     topic: "仕上げと検査",               recipe: "（仮）",          open: false, difficulty: 8, patterns: "auto", override: {}, obstacles: null },
  { id: 9,  world: 3, name: "タオルのかたち広場",     topic: "タオルの種類とサイズ",       recipe: "（仮）",          open: false, difficulty: 9, patterns: "auto", override: {}, obstacles: null },
  { id: 10, world: 3, name: "生地のひみつ通り",      topic: "織りと生地の工夫",           recipe: "（仮）",          open: false, difficulty: 10, patterns: "auto", override: {}, obstacles: null },
  { id: 11, world: 3, name: "かざりと機能のアトリエ",   topic: "加工とかざりの工夫",         recipe: "（仮）",          open: false, difficulty: 11, patterns: "auto", override: {}, obstacles: null },
  { id: 12, world: 3, name: "タオルマスターへの道",    topic: "選び方とお手入れ",           recipe: "（仮）",          open: false, difficulty: 12, patterns: "auto", override: {}, obstacles: null }
];
