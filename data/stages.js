// 12ステージの名前と、世界の割り当て
// name: ステージ名（9/14資料の表の名前。まだ受け取っていないものは v53 のテーマ名を仮に入れている）
// topic: v53 のテーマ名（何を学ぶステージか）
// recipe: 10枚そろったときのレシピ名
// open: V01 で遊べるステージだけ true
window.WORLDS = [
  { id: 1, name: "原材料の世界" },
  { id: 2, name: "製造工程の世界" },
  { id: 3, name: "タオル進化の世界" }
];

window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",            topic: "綿という植物",               recipe: "綿花のひみつ", open: true },
  { id: 2,  world: 1, name: "（仮）品種と産地",           topic: "品種と産地",                 recipe: "（仮）",      open: false },
  { id: 3,  world: 1, name: "（仮）糸・番手・撚り",       topic: "糸・番手・撚り",             recipe: "（仮）",      open: false },
  { id: 4,  world: 1, name: "（仮）綿以外の繊維と特別な糸", topic: "綿以外の繊維と特別な糸",     recipe: "（仮）",      open: false },
  { id: 5,  world: 2, name: "（仮）工程の全体像",         topic: "工程の全体像",               recipe: "（仮）",      open: false },
  { id: 6,  world: 2, name: "（仮）糸ができるまで",       topic: "糸ができるまで",             recipe: "（仮）",      open: false },
  { id: 7,  world: 2, name: "（仮）タオルを織る",         topic: "タオルを織る",               recipe: "（仮）",      open: false },
  { id: 8,  world: 2, name: "（仮）仕上げと検査",         topic: "仕上げと検査",               recipe: "（仮）",      open: false },
  { id: 9,  world: 3, name: "（仮）タオルの種類とサイズ", topic: "タオルの種類とサイズ",       recipe: "（仮）",      open: false },
  { id: 10, world: 3, name: "（仮）織りと生地の工夫",     topic: "織りと生地の工夫",           recipe: "（仮）",      open: false },
  { id: 11, world: 3, name: "（仮）加工とかざりの工夫",   topic: "加工とかざりの工夫",         recipe: "（仮）",      open: false },
  { id: 12, world: 3, name: "（仮）選び方とお手入れ",     topic: "選び方とお手入れ",           recipe: "（仮）",      open: false }
];
