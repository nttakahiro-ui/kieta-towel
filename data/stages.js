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
window.WORLDS = [
  { id: 1, name: "原材料の世界", difficulty: 1, patterns: "data", override: {} },
  { id: 2, name: "製造工程の世界", difficulty: 2, patterns: "auto", override: {} },
  { id: 3, name: "タオル進化の世界", difficulty: 3, patterns: "auto", override: {} }
];

window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",       topic: "綿という植物",               recipe: "綿花のひみつ",  open: true, difficulty: 1, patterns: "data", override: {} },
  { id: 2,  world: 1, name: "世界のコットン街道",     topic: "品種と産地",                 recipe: "超コットン",        open: false, difficulty: 2, patterns: "auto", override: {} },
  { id: 3,  world: 1, name: "糸づくりの坂道",       topic: "糸・番手・撚り",             recipe: "糸つむぎ",         open: false, difficulty: 3, patterns: "auto", override: {} },
  { id: 4,  world: 1, name: "特別な繊維の森",       topic: "綿以外の繊維と特別な糸",     recipe: "（仮）",          open: false, difficulty: 4, patterns: "auto", override: {} },
  { id: 5,  world: 2, name: "タオルの道しるべ",      topic: "工程の全体像",               recipe: "（仮）",          open: false, difficulty: 5, patterns: "auto", override: {} },
  { id: 6,  world: 2, name: "糸が生まれる道",       topic: "糸ができるまで",             recipe: "（仮）",          open: false, difficulty: 6, patterns: "auto", override: {} },
  { id: 7,  world: 2, name: "パイル織りの広間",      topic: "タオルを織る",               recipe: "（仮）",          open: false, difficulty: 7, patterns: "auto", override: {} },
  { id: 8,  world: 2, name: "仕上げチェックの門",     topic: "仕上げと検査",               recipe: "（仮）",          open: false, difficulty: 8, patterns: "auto", override: {} },
  { id: 9,  world: 3, name: "タオルのかたち広場",     topic: "タオルの種類とサイズ",       recipe: "（仮）",          open: false, difficulty: 9, patterns: "auto", override: {} },
  { id: 10, world: 3, name: "生地のひみつ通り",      topic: "織りと生地の工夫",           recipe: "（仮）",          open: false, difficulty: 10, patterns: "auto", override: {} },
  { id: 11, world: 3, name: "かざりと機能のアトリエ",   topic: "加工とかざりの工夫",         recipe: "（仮）",          open: false, difficulty: 11, patterns: "auto", override: {} },
  { id: 12, world: 3, name: "タオルマスターへの道",    topic: "選び方とお手入れ",           recipe: "（仮）",          open: false, difficulty: 12, patterns: "auto", override: {} }
];
