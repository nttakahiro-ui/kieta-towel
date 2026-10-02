// 12ステージの名前と、世界の割り当て
// name: ステージ名（9/14資料の表の名前）
// topic: v53 のテーマ名（何を学ぶステージか）
// recipe: 10枚そろったときのレシピ名（4以降は未定）
// open: V01 で遊べるステージだけ true
window.WORLDS = [
  { id: 1, name: "原材料の世界" },
  { id: 2, name: "製造工程の世界" },
  { id: 3, name: "タオル進化の世界" }
];

window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",       topic: "綿という植物",               recipe: "綿花のひみつ",  open: true },
  { id: 2,  world: 1, name: "世界のコットン街道",     topic: "品種と産地",                 recipe: "超コットン",        open: false },
  { id: 3,  world: 1, name: "糸づくりの坂道",       topic: "糸・番手・撚り",             recipe: "糸つむぎ",         open: false },
  { id: 4,  world: 1, name: "特別な繊維の森",       topic: "綿以外の繊維と特別な糸",     recipe: "（仮）",          open: false },
  { id: 5,  world: 2, name: "タオルの道しるべ",      topic: "工程の全体像",               recipe: "（仮）",          open: false },
  { id: 6,  world: 2, name: "糸が生まれる道",       topic: "糸ができるまで",             recipe: "（仮）",          open: false },
  { id: 7,  world: 2, name: "パイル織りの広間",      topic: "タオルを織る",               recipe: "（仮）",          open: false },
  { id: 8,  world: 2, name: "仕上げチェックの門",     topic: "仕上げと検査",               recipe: "（仮）",          open: false },
  { id: 9,  world: 3, name: "タオルのかたち広場",     topic: "タオルの種類とサイズ",       recipe: "（仮）",          open: false },
  { id: 10, world: 3, name: "生地のひみつ通り",      topic: "織りと生地の工夫",           recipe: "（仮）",          open: false },
  { id: 11, world: 3, name: "かざりと機能のアトリエ",   topic: "加工とかざりの工夫",         recipe: "（仮）",          open: false },
  { id: 12, world: 3, name: "タオルマスターへの道",    topic: "選び方とお手入れ",           recipe: "（仮）",          open: false }
];
