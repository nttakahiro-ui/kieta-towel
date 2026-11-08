// 12ステージの名前と、世界の割り当て
// name: ステージ名（9/14資料の表の名前）
// topic: v53 のテーマ名（何を学ぶステージか）
// gem: レシピブックの宝石の色（10/25-4）。宝石の絵を画像にするときは js/recipebook.js の GEM_ART を書きかえる
// recipe: 10枚そろったときのレシピ名（10/3-15 に12ステージとも確定）。レシピ完成の画面に出る。図鑑を作るときも、この名前を使う
// open: 遊べるステージだけ true
// difficulty: 難易度＝ステージ番号（1〜12。10/21-2）。敵の弾の量・速さ・硬さ・意地の悪い語句の数・中ボスと大ボスの文字耐久が、ここから自動で決まる
//   難易度から各数値への線は js/game.js の BATTLE.difficulty（調整パネルでも動かせる）
// patterns: "data" … 語句の出方・順番・位置は data/words.js の pattern / order / lane のとおり（手で決めたステージ）
//           "auto" … 難易度から自動で決める（意地の悪い語句の数も難易度どおり）
// override: このステージだけ、自動で決まる数値を手で上書きする欄。書いたものだけ上書きされる
//   使える名前: fireRate（弾の多さ。大きいほど弾が多い）、bulletSpeed（敵の弾の速さの倍率）、fillerDensity（虫の濃さ）、speedScale（語句の速さの倍率）、
//              zakoHp（ザコの語句の硬さ）、bossHpScale（中ボス・大ボスの文字耐久の倍率）、tricky（意地の悪い語句の数）
//   例: override: { fireRate: 1.2, tricky: 2 }
//   battle: js/game.js の BATTLE の数値を、このステージのあいだだけ上書きする（10/7-1）。ステージ1は firstHold（救出のたびの1語目を止めて待つ）と odaiShellFire: false（お題で殻から撃たない）も（10/25-1）。例: battle: { exploreTime: 60, roundInterval2: 7 }
//   ステージ1（ゆったりステージ。説明を兼ねる）: 標準で3分（発見60秒、救出100秒、さいごの殻20秒）。語句の間隔は battle で広く、雑魚と弾の少なさは難易度1の線で
//   （ステージ4の fireScale 1.1 の上書きは、10/21-1 に難易度を組み直したときに外した）
// obstacles: 障害物（なければ null）。木は弾をさえぎり、自機がふれると被弾する
//   kind: 障害物の種類。今は "tree"（木）。世界2以降で "rock"（岩）や "mountain"（山）に差しかえる前提
//   sortie: 出す出撃（2 ＝ 本番だけ。探検では出さない）
//   shade: 「木のかげ」にする意地の悪い語句の数（その語句の前に木が来て、木が去るまで撃てない。patterns が "auto" のステージ）
//   items: 置き場所。at ＝ 本番が始まってからの秒数（お題の間は数えない）、x ＝ 横の位置（0〜1）、r ＝ 大きさ（半径 px）
//          gate ＝ 木と木のあいだを通る場所（2本の木。gate はすきまの横の位置 0〜1、gap はすきまの広さ 0〜1）
//          afterWord ＝ at のかわりに「その数の語句を出したあと」に出す（10/7-1。案内つきの木に使う）。画面の語句がいなくなってから3秒あけて木と案内、
//                      案内のあと3秒あけて次の語句。この休みのあいだは、語句・お題・雑魚を出さない（BATTLE.restGap）
//          guide ＝ よけ方の案内を出す（"dodge" ＝「木だ！よけて！」と横への矢印、"gate" ＝「あいだを通ろう！」とすきまへの矢印）。1秒スローになる
// weather: 天気（なければ null）。kind ＝ "wind"（風: 自機が横に流される。向きと強さは調整パネル）／"fog"（霧: 画面の上のほうが見えない）
//   ／"rain"（雨）／"snow"（雪）。雨・雪は今は見た目だけ。sortie ＝ 出す出撃（2 ＝ 本番だけ）
//   世界1: ステージ3 夕暮れの風／ステージ4 夜の霧
// theme: 時間帯の色（なければ真昼の色）。time ＝ 時間帯の名前、image ＝ 背景の絵のパス（assets/。null なら色で描く）、
//   bugs ＝ 時間帯の虫（10/25-1）。kinds ＝ 出す虫の種類（同じ名前を2回書くと、2倍出やすい。butterfly ちょうちょ／ladybug てんとう虫／kanabun コガネムシ／bee ハチ／grasshopper バッタ／dragonfly トンボ／moth ガ／bat コウモリ／firefly ホタル）、density ＝ 数の倍率
//   imageLight ＝ 背景の絵の上にうすく重ねる時間帯の色（10/21-2。世界1は森の絵 assets/bg_world1.jpg）
//   ground 地面／field 畑／furrow 畝／plant・cotton 綿の木と実／creek・creekLight 小川／path あぜ道／bush 草むら
//   light 地面にうすくかける光の色（語句・雑魚・自機・帯にはかけない）／cloudShadow 雲の影／fluff 舞う綿毛
//   tree 木の色（濃い→うすい4つ）／treeShadow・treeShadowScale 木の影の色と長さ／fillerFilter 雑魚の色味（CSS の filter）／wordStroke 語句の縁取りの色（なければ白）
//   世界1: ステージ1 明け方／2 真昼／3 夕暮れ／4 夜（夜の森は木の影を濃く）
//   世界1の坂（10/9）: ステージ1 木1本／ステージ2 木2本＋通る場所／ステージ3 木3本＋通る場所＋木のかげ／ステージ4 木3本＋通る場所＋木のかげ（10/3-6 に霧が入ったぶん、4本から1本減らした）
// tutorial: true ＝ チュートリアルのステージ（10/25-10。ステージ1）。ステージ一覧に「チュートリアル」の印、発見の旅の表紙に1行（texts.js の tutorial）
// 11/7-30 決定: ステージ1〜4の発見の旅は、ことばが出てくる間隔（override の exploreGap）を短くして、ふつうに遊んで40秒くらいに（1 5.8→3.4、2 4.2→3.0、3・4 3.4→3.2）
// explore: 発見の旅の、ことばの動きの型（10/25-7。なければ "drift"）。双眼鏡で見つめる操作はどれも同じ
//   move ＝ "drift"（ゆっくり漂う）／"fall"（落ち葉のように揺れながら降る。地面に落ちたら、しばらくして上から出直す）
//          ／"wind"（風で横に流される。双眼鏡も少し流される）／"firefly"（霧が濃く、ホタルがことばの近くに集まる）
//   型ごとの数（落ちる速さ・風の強さ・ホタルの数など）は js/game.js の EXPLORE_MOVES。ここに同じ名前で書くと、そのステージだけ上書き（例: { move: "fall", fallSpeed: 40 }）
//   世界1: ステージ1 drift／2 fall／3 wind／4 firefly。世界2・3の探し方（箱を開ける・星をなぞる）は、世界2・3の設計で型を足す
window.WORLDS = [
  { id: 1, name: "原材料の世界",     ground: false, rear: false, color: "#3a9a48", gems: ["#1f8a3c", "#52c23a", "#22b866", "#a8cf2a"], exploreBg: "assets/explore_bg1.jpg" },   // exploreBg ＝ 発見の旅の背景（11/1。制作側の world01_02〜03_02。上下がつながる絵を縦に流す）。世界1: 地上なし・うしろからなし（10/21-1）。color ＝ レシピブックの扇形の色（10/25-13。森＝緑）。gems ＝ その世界の4つのステージの宝石の色（並びのとおり。11/2 決定で制作側の見本 sample_bg_c01 に合わせた。世界1 緑系・世界2 青系・世界3 紫系）。ステージ一覧の帯・本・ステージの札・宝石ができた演出は、すべて STAGES の gem（いちばん下で gems から入れる）を使う
  { id: 2, name: "製造工程の世界",   ground: true,  rear: false, color: "#2f86e0", gems: ["#2a6fe0", "#4aa6ee", "#2ec6ea", "#22a4dc"], exploreBg: "assets/explore_bg2.jpg", odaiSway: { amp: 30, period: 4 }, odaiGapMul: 0.8 },   // 世界2: 地上の敵・地上の語句・照準◎が入る（工場＝青）
  { id: 3, name: "タオル進化の世界", ground: true,  rear: true,  color: "#8a3cc0", gems: ["#8a2fa0", "#c03cc8", "#6a3ee0", "#7c70e0"], exploreBg: "assets/explore_bg3.jpg", odaiSway: { amp: 50, period: 3 }, odaiGapMul: 0.65 }  // 世界3: うしろ（下）からも敵が来る（rear。10/31-10 試作）（宇宙＝紫）
  // odaiSway ＝ お題のことばのゆれ（幅px・周期秒）、odaiGapMul ＝ お題のあいだの弾の間隔の倍率（11/3-3 決定「硬さでなく弾とよけで攻略させる」。世界1はなし）
];

// 世界2・3の試作（10/31-10。docs/世界2・3の構想メモ.md）
//   explore: { move: "box" } ＝ 世界2の発見の旅「箱」（js/game.js の EXPLORE_MOVES.box。open: true ＝ OPEN の面のときだけ開く、lock: 数 ＝ 鍵つきの箱）
//   nextAsk: 中ボスを「次は？」にする（10/31-12 決定）。{ 中ボスのことば: "1つ前の工程" } か { 中ボスのことば: { prev: "1つ前の工程", after: "1つあとの工程" } }
//            「次は？」は2択（10/31-13 決定）: 正解と after（工程の順で1つあと）。after を書かないときは、同じステージの文字数が近いことば1つ（1つ前の工程は入れない）。書いていない中ボスは世界1と同じ「どれ？」
//   rescueLen・bugMul（gaugeRate ＝ ゲージの倍率は 11/6-6 決定でやめた。11/1-3 決定「必殺ワザを駆使する回」）: 救出の旅の長さ（ことばの出る間隔）・虫の数・ゲージのたまる速さの倍率。各世界の3つ目（3・7・11）は 1.25・1.25・1.5、4つ目（4・8・12）は 1.5・1.5・2（11/3-2 決定でゲージは2.5）（12 は「最後の山」で虫2倍。11/1-4。11/2-3 決定で2.5倍）
//   ステージ12（11/2-3 決定 もう一段難しく）: rearRate 0.25（11/6-4 で 0.5→0.25。うしろから来る群れの割合。ほかは 0.35）、groundCount 3（地上のことば3つ。ほかは2）、
//     出来事5種×3回のうち3か所を「2つ同時」に（18秒 流星雨＋うしろから、37秒 重力＋星がはじける、46秒 はさまれる＋流星雨）。ほかの出来事は重ならないようにならべた。重力は、横切ることば（25秒ごろに出る）と重ならない時刻に。救出の旅の時計で60秒ごろに大ボスが出るので、56秒までに15回が終わる
//   power4: true ＝ パワーが4段目（4本）まで上がる（8・12。11/1-4 決定。11/3-3 決定で世界3は全部）。bossTwoStep: true ＝ 大ボスを2段階に（11/1-4 決定で12。11/3-3 決定でやめた。仕組みは残してある）。odaiGap は 11/3-3 決定で、硬さを下げたぶん弾の間隔で被弾を合わせ直した（5 0.783、6 0.96、7 1.75、8 0.87、9 0.42、10 0.33、11 0.345、12 0.1。世界の倍率 odaiGapMul もかかる）。bossGap ＝ 大ボスの弾の間隔の倍率（12 1.8。元気がなくなる回数を1.5回以内に。11/2-3 にもう一段難しくして 12 は 1.1、大ボスの硬さ bossHp 0.95（大ボス戦を40〜45秒に保つため）。8 0.65 は 11/1-5 決定で、4 ＜ 8 ＜ 12 の順にするため。11/2-2 に「3つを順に」を削る形にしたので 8 は 1.3 に。5・6 も下の bossOrder のところ）
//   event: 出来事 { kind, sortie, at, dur }（kind: "reverse" コンベアが逆／"dark" 照明が落ちる／"gravity" 重力／"meteor" 流星雨。11/1-2 から "screw" ねじが飛んでくる／"fast" コンベアが急に速くなる／"burst" 星がはじける（救出の旅だけ）。11/1-3 から "windRev" 風が逆／"wind" 風／"fog" 霧がこくなる／"rear" うしろから虫の群れ／"pinch" はさまれる（救出の旅だけ。全世界）。sortie 1 ＝ 発見の旅、2 ＝ 救出の旅。at ＝ 始まる秒、dur ＝ 続く秒）
//   bossOrder: [3つのことば（正しい順）] ＝ 大ボスを「3つを順に」にする（その中に大ボスのことばがあるときだけ。10/31-12 決定）。問題文は texts.js の odaiForm.orderLead
//     11/2-2 決定: 正しい順に1つずつ殻を削りきってほどく。1つの殻は大ボスの硬さの線の1/3（js/game.js の BATTLE.orderShare）× orderHp。大ボス戦が30〜35秒になるよう、orderHp と bossGap（弾の間隔の倍率）で合わせた: 5 1.25・2.2、6 1.2・2、8 1.1・1.3（8 は前の 0.65 から）
//   中ボス・大ボスの入れ替え（10/31-12 決定）は words.js の role と hp（ステージ6 梳綿・粗紡を中ボスに、混打綿・スライバーをザコに。ステージ8 乾燥を中ボスに、ヘムをザコに）
//   override.battle.groundHold（ステージ5）＝ 救出の旅の最初の地上のことばを、中ほどで止めて待つ（ステージ1の1語目と同じ。10/31-12 決定）
//   theme: bugs.density ＝ 虫の数の倍率（kinds を書かないので、虫の種類は世界1の地上のある作りの5種類: てんとう虫・ハチ・綿毛おばけ・からまり草・いばらの株）
//   数を線に合わせた分（10/31-10。自動プレイヤーで測った）: ステージ8 explore の empty 1・gap 2.3（OPEN と鍵が重なって遅いため）
//   中ボス・大ボスの硬さ（bossHpScale）は、10/31-12 に線そのものを引き直した（js/game.js の BATTLE.difficulty。ステージごとの override はやめた）
//   explore: { move: "space" } ＝ 世界3の発見の旅「無重力」（js/game.js の EXPLORE_MOVES.space。回りながら漂うことばを、向きがまっすぐのときに押さえる）
//   which: true ＝ 中ボス・大ボスを「どっち？」にする（choices が2つで、1つ目が本物のことばのときだけ。ほかは世界1と同じ「どれ？」）
//   世界3は WORLDS の rear: true で、うしろ（画面の下）からも敵が来る（BATTLE.rearRate）
//   世界3で線に合わせた分（10/31-10）: ステージ12 explore の gap 0.9（長いことばが多く、発見がおそいため）
//   10/31-14 決定（無重力を易しく）のあと、発見を35秒前後に: ステージ10・11 explore の chars 36（同時に漂う数が4→6・5）・gap 0.8
//   10/31-13 決定（救出の旅を派手に・地上の攻撃B改）:
//     groundPlay: [地上のことばの出る順に "hide"（隠れる）／"move"（動く）／"both"（両方）]。6 2つとも隠れる、7 2つとも動く、8 1つずつ、9〜12 2つとも両方。5 は書かない（教える回）
//     groundIntro: "hide"／"move" ＝ そのステージで初めて隠れる／動くことばが出た瞬間に1行（texts.js の groundIntro）
//     event の sortie 2（救出の旅）: 6 コンベアが逆（地面の流れと動く地上のことばが逆向き）、7 照明が落ちる（地面と地上のものだけ暗く）、8 両方。お題のあいだは起こさない
//     obstacles の kind: "pillar" ＝ 機械の柱（世界1の木と同じ作り）。5 は1本（案内つき）、6 は2本、7・8 は2本＋柱のかげのことば1つ（shade: 1）。世界3は障害物なし
//     虫の数は線の2.5倍（theme.bugs.density。前は1.5倍）。パワーの初期値は js/game.js の BATTLE.powerStartW23（世界2・3は2本から）
//     OPEN の発見を35秒ほどに: 6 explore の gap 1.0・empty 0、8 gap 1.4・empty 0（8 は発見の旅の出来事と鍵の分で40秒ほど）
//     取り逃がしを1ステージ0.5語以下に: 8 override.battle の edgeFallTime 17（端にかくれる語句、ふつうは13.5）・crossTime 7.8（横切る語句、ふつうは6）、9 crossTime 7.8、12 crossTime 9（11/2-3 に虫2.5倍・うしろから50%で光が虫に取られるので 10）
//   theme: 世界2は工場の背景（assets/bg_world2.jpg）。deco: false ＝ 世界1の綿の実などの飾りを流さない。虫は世界1の絵の色を変えただけ（仮）
// お題の殻の弾の形（11/1 決定。js/game.js の odaiShape）: fan 扇（3方向。世界1）／aim ねらい／sweep 横ながし／ring 輪／rain ななめ雨。配列は順に交互
const W2_SHOT = { mid: "aim", boss: "sweep", boss2: "aim" };   // boss2 ＝ 大ボスの殻が半分まで削れたあとの形（11/3-3）
const W3_SHOT = { mid: "ring", boss: "rain", boss2: "ring" };   // 11/3-3: 前は大ボスが「ななめ雨・ねらい」の交互
const W2_THEME = { time: "工場", bugs: { density: 2.5 }, treeShadow: "rgba(30,40,60,0.3)", treeShadowScale: 1, image: "assets/bg_world2.jpg", imageLight: null, deco: false, fillerFilter: "sepia(1) saturate(5) hue-rotate(175deg)", cloudShadow: "rgba(40,60,90,0.05)", fluff: "rgba(255,255,255,0.55)", ground: "#e8e4da" };
const W3_THEME = { time: "星空", bugs: { density: 2.5 }, image: "assets/bg_world3.jpg", imageLight: null, deco: false, fillerFilter: "sepia(1) saturate(5) hue-rotate(225deg)", cloudShadow: "rgba(20,10,60,0.06)", fluff: "rgba(230,220,255,0.6)", ground: "#2a2a4a" };
window.STAGES = [
  { id: 1,  world: 1, name: "綿花のめざめ畑",       tutorial: true, topic: "綿という植物",               recipe: "綿花のひみつ",  open: true, difficulty: 1, patterns: "data", explore: { move: "drift" }, override: { battle: { exploreTime: 60, exploreGap: 3.4, exploreLife: 12, roundInterval2: 11, firstHold: true, odaiShellFire: false } }, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { afterWord: 4, x: 0.4, r: 48, guide: "dodge" } ] }, theme: { time: "明け方", bugs: { kinds: ["butterfly", "kanabun", "kanabun", "ladybug"], density: 0.8 }, image: "assets/bg_world1.jpg", imageLight: "rgba(255,170,150,0.18)", ground: "#d8e2cc", field: "#ecd9c6", furrow: "#dcc4ab", plant: "#7d9e62", cotton: "#ffffff", creek: "#cfd8ea", creekLight: "rgba(255,255,255,0.7)", path: "#f0dccb", bush: "#cddbbd", light: "rgba(255,185,160,0.16)", cloudShadow: "rgba(120,80,90,0.07)", fluff: "rgba(255,240,235,0.8)", tree: ["#4c7240", "#5a8048", "#68904f", "#83a76a"], treeShadow: "rgba(60,50,60,0.25)", treeShadowScale: 1, fillerFilter: "none" }, weather: null },
  { id: 2,  world: 1, name: "世界のコットン街道",     topic: "品種と産地",                 recipe: "超コットン",        open: true, difficulty: 2, patterns: "auto", explore: { move: "fall" }, override: { battle: { exploreGap: 3.0 } }, obstacles: { kind: "tree", sortie: 2, shade: 0, items: [ { at: 6, x: 0.3, r: 48 }, { at: 16, x: 0.7, r: 48 }, { afterWord: 6, gate: 0.45, gap: 0.38, guide: "gate" } ] }, odaiGap: 2.4, theme: { time: "真昼", bugs: { kinds: ["bee", "grasshopper"], density: 1 }, image: "assets/bg_world1.jpg", imageLight: null, ground: "#dcebc4", field: "#e8dcbc", furrow: "#d8c9a2", plant: "#7fa85a", cotton: "#ffffff", creek: "#c4e0e4", creekLight: "rgba(255,255,255,0.7)", path: "#efe4c8", bush: "#cfe3b3", light: null, cloudShadow: "rgba(70,90,50,0.07)", fluff: "rgba(255,255,255,0.8)", tree: ["#4f7a36", "#5e8c3e", "#6a9a45", "#86b45c"], treeShadow: "rgba(50,70,35,0.25)", treeShadowScale: 1, fillerFilter: "none" }, weather: null },
  { id: 3,  world: 1, name: "糸づくりの坂道",       topic: "糸・番手・撚り",             recipe: "糸つむぎ",         open: true, difficulty: 3, patterns: "auto", explore: { move: "wind" }, override: { battle: { exploreGap: 3.2 } }, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.72, r: 48 }, { at: 12, x: 0.28, r: 50 }, { at: 20, x: 0.65, r: 50 }, { at: 30, gate: 0.5, gap: 0.36 } ] }, odaiGap: 1.7, event: [{ kind: "windRev", sortie: 2, at: 15, dur: 8 }, { kind: "rear", sortie: 2, at: 35, dur: 3 }, { kind: "pinch", sortie: 2, at: 52, dur: 3 }], rescueLen: 1.25, bugMul: 1.25, theme: { time: "夕暮れ", bugs: { kinds: ["dragonfly", "moth"], density: 1 }, image: "assets/bg_world1.jpg", imageLight: "rgba(255,130,40,0.24)", ground: "#d9d3a6", field: "#ecd0a2", furrow: "#d9b88a", plant: "#8a9a50", cotton: "#fff6e8", creek: "#e8c9a8", creekLight: "rgba(255,240,220,0.7)", path: "#f2d3aa", bush: "#cfd09c", light: "rgba(255,140,50,0.2)", cloudShadow: "rgba(110,60,30,0.09)", fluff: "rgba(255,230,200,0.8)", tree: ["#4e6a33", "#5d7a3a", "#6d8a42", "#8fa457"], treeShadow: "rgba(70,40,20,0.33)", treeShadowScale: 1.3, fillerFilter: "sepia(0.25)", wordStroke: "#5a3418" }, weather: { kind: "wind", sortie: 2 } },
  { id: 4,  world: 1, name: "特別な繊維の森",       topic: "綿以外の繊維と特別な糸",     recipe: "綿じゃなイト",          open: true, difficulty: 4, patterns: "auto", explore: { move: "firefly" }, override: { battle: { exploreGap: 3.2 } }, obstacles: { kind: "tree", sortie: 2, shade: 1, items: [ { at: 4, x: 0.3, r: 50 }, { at: 10, x: 0.72, r: 50 }, { at: 24, x: 0.7, r: 50 }, { at: 32, gate: 0.6, gap: 0.36 } ] }, odaiGap: 2, event: [{ kind: "wind", sortie: 2, at: 6, dur: 6 }, { kind: "fog", sortie: 2, at: 15, dur: 6 }, { kind: "rear", sortie: 2, at: 25, dur: 3 }, { kind: "pinch", sortie: 2, at: 32, dur: 3 }, { kind: "wind", sortie: 2, at: 44, dur: 6 }, { kind: "fog", sortie: 2, at: 53, dur: 6 }, { kind: "rear", sortie: 2, at: 63, dur: 3 }, { kind: "pinch", sortie: 2, at: 72, dur: 3 }], rescueLen: 1.5, bugMul: 1.5, theme: { time: "夜", bugs: { kinds: ["bat", "firefly"], density: 1.3 }, image: "assets/bg_world1.jpg", imageLight: "rgba(20,30,75,0.45)", ground: "#58705c", field: "#73695a", furrow: "#64594b", plant: "#4f6a45", cotton: "#d8dde8", creek: "#3f5f7f", creekLight: "rgba(200,220,255,0.5)", path: "#7f7867", bush: "#4c6550", light: "rgba(25,35,80,0.28)", cloudShadow: "rgba(0,0,20,0.15)", fluff: "rgba(220,230,255,0.55)", tree: ["#22381f", "#2c4728", "#365532", "#466a3e"], treeShadow: "rgba(5,10,20,0.55)", treeShadowScale: 1.3, fillerFilter: "brightness(0.8)" }, weather: { kind: "fog", sortie: 2 } },
  { id: 5,  world: 2, name: "タオルの道しるべ",      topic: "工程の全体像",               recipe: "工場の地図",          open: true, difficulty: 5, patterns: "auto", explore: { move: "box" }, nextAsk: { 布: { prev: "紡ぐ", after: "切る" }, 縫う: { prev: "切る", after: "検査" } }, bossOrder: ["縫う", "検査", "出荷"], orderHp: 1.25, bossGap: 2.2, override: { battle: { groundHold: true } }, obstacles: { kind: "pillar", sortie: 2, shade: 0, items: [ { at: 10, x: 0.4, r: 44, guide: "dodge" } ] }, odaiShot: W2_SHOT, odaiGap: 0.783, theme: W2_THEME, weather: null },
  { id: 6,  world: 2, name: "糸が生まれる道",       topic: "糸ができるまで",             recipe: "糸の誕生",          open: true, difficulty: 6, patterns: "auto", explore: { move: "box", open: true, gap: 0.7 }, event: [{ kind: "reverse", sortie: 1, at: 14, dur: 8 }, { kind: "screw", sortie: 2, at: 12, dur: 4 }, { kind: "reverse", sortie: 2, at: 25, dur: 6 }], groundPlay: ["hide", "hide"], groundIntro: "hide", orderHp: 1.2, bossGap: 2, override: {}, obstacles: { kind: "pillar", sortie: 2, shade: 0, items: [ { at: 8, x: 0.3, r: 44 }, { at: 20, x: 0.7, r: 44 } ] }, odaiShot: W2_SHOT, odaiGap: 0.96, theme: W2_THEME, weather: null },
  { id: 7,  world: 2, name: "パイル織りの広間",      topic: "タオルを織る",               recipe: "パイルの魔法",          open: true, difficulty: 7, patterns: "auto", explore: { move: "box", lock: 3, fake: 1 }, event: [{ kind: "dark", sortie: 1, at: 12, dur: 6 }, { kind: "dark", sortie: 2, at: 6, dur: 6 }, { kind: "fast", sortie: 2, at: 16, dur: 5 }, { kind: "rear", sortie: 2, at: 27, dur: 3 }, { kind: "pinch", sortie: 2, at: 38, dur: 3 }], groundPlay: ["move", "move"], groundIntro: "move", override: {}, obstacles: { kind: "pillar", sortie: 2, shade: 1, items: [ { at: 6, x: 0.7, r: 44 }, { at: 22, x: 0.3, r: 44 } ] }, odaiShot: W2_SHOT, odaiGap: 1.75, rescueLen: 1.25, bugMul: 1.25, theme: W2_THEME, weather: null },
  { id: 8,  world: 2, name: "仕上げチェックの門",     topic: "仕上げと検査",               recipe: "合格のしるし",          open: true, difficulty: 8, patterns: "auto", explore: { move: "box", open: true, lock: 2, gap: 0.98, fake: 2 }, nextAsk: { 漂白: { prev: "洗う", after: "乾燥機" }, ミシン: { prev: "乾燥機", after: "検針機" } }, bossOrder: ["乾燥機", "ミシン", "検針機"], event: [{ kind: "reverse", sortie: 1, at: 10, dur: 6 }, { kind: "dark", sortie: 1, at: 24, dur: 5 }, { kind: "reverse", sortie: 2, at: 1, dur: 4 }, { kind: "dark", sortie: 2, at: 9, dur: 5 }, { kind: "screw", sortie: 2, at: 15, dur: 4 }, { kind: "rear", sortie: 2, at: 21, dur: 3 }, { kind: "pinch", sortie: 2, at: 26, dur: 3 }, { kind: "reverse", sortie: 2, at: 30, dur: 4 }, { kind: "dark", sortie: 2, at: 38, dur: 5 }, { kind: "screw", sortie: 2, at: 44, dur: 4 }, { kind: "rear", sortie: 2, at: 51, dur: 3 }, { kind: "pinch", sortie: 2, at: 57, dur: 3 }], groundPlay: ["hide", "move"], override: { battle: { edgeFallTime: 17, crossTime: 7.8 } }, obstacles: { kind: "pillar", sortie: 2, shade: 1, items: [ { at: 6, x: 0.7, r: 44 }, { at: 22, x: 0.3, r: 44 } ] }, odaiGap: 0.87, odaiShot: W2_SHOT, rescueLen: 1.5, bugMul: 1.5, power4: true, bossGap: 1.3, orderHp: 1.1, theme: W2_THEME, weather: null },
  { id: 9,  world: 3, name: "タオルのかたち広場",     topic: "タオルの種類とサイズ",       recipe: "サイズいろいろ",          open: true, difficulty: 9, patterns: "auto", explore: { move: "space", on: 4, gap: 0.5 }, which: true, groundPlay: ["both", "both"], override: { battle: { crossTime: 7.8 } }, obstacles: null, odaiGap: 0.42, odaiShot: W3_SHOT, bugMul: 3, power4: true, theme: W3_THEME, weather: null },
  { id: 10, world: 3, name: "生地のひみつ通り",      topic: "織りと生地の工夫",           recipe: "手ざわり大好き",          open: true, difficulty: 10, patterns: "auto", explore: { move: "space", on: 4, gap: 0.8 }, event: { kind: "gravity", sortie: 2, at: 20, dur: 8 }, which: true, groundPlay: ["both", "both"], override: {}, obstacles: null, odaiGap: 0.33, odaiShot: W3_SHOT, bugMul: 3, power4: true, theme: W3_THEME, weather: null },
  { id: 11, world: 3, name: "かざりと機能のアトリエ",   topic: "加工とかざりの工夫",         recipe: "すごい機能",          open: true, difficulty: 11, patterns: "auto", explore: { move: "space", on: 3, gap: 0.4, spin: 0.8 }, event: [{ kind: "meteor", sortie: 2, at: 5, dur: 7 }, { kind: "burst", sortie: 2, at: 15, dur: 7 }, { kind: "rear", sortie: 2, at: 28, dur: 3 }, { kind: "pinch", sortie: 2, at: 40, dur: 3 }], which: true, groundPlay: ["both", "both"], override: { battle: { crossTime: 7.8 } }, obstacles: null, odaiShot: W3_SHOT, odaiGap: 0.345, rescueLen: 1.25, bugMul: 3, power4: true, theme: W3_THEME, weather: null },
  { id: 12, world: 3, name: "タオルマスターへの道",    topic: "選び方とお手入れ",           recipe: "タオルの心得",          open: true, difficulty: 12, patterns: "auto", explore: { move: "space", on: 3, gap: 0.9 }, event: [{ kind: "gravity", sortie: 2, at: 1, dur: 5 }, { kind: "rear", sortie: 2, at: 6, dur: 3 }, { kind: "burst", sortie: 2, at: 9, dur: 6 }, { kind: "pinch", sortie: 2, at: 15, dur: 3 }, { kind: "meteor", sortie: 2, at: 18, dur: 5 }, { kind: "rear", sortie: 2, at: 18, dur: 3 }, { kind: "pinch", sortie: 2, at: 23, dur: 3 }, { kind: "burst", sortie: 2, at: 26, dur: 6 }, { kind: "meteor", sortie: 2, at: 32, dur: 5 }, { kind: "gravity", sortie: 2, at: 37, dur: 5 }, { kind: "burst", sortie: 2, at: 37, dur: 6 }, { kind: "rear", sortie: 2, at: 43, dur: 3 }, { kind: "pinch", sortie: 2, at: 46, dur: 3 }, { kind: "meteor", sortie: 2, at: 46, dur: 5 }, { kind: "gravity", sortie: 2, at: 51, dur: 5 }], which: true, groundPlay: ["both", "both", "both"], groundCount: 3, override: { battle: { edgeFallTime: 17, crossTime: 10 } }, obstacles: null, odaiGap: 0.1, odaiShot: W3_SHOT, rescueLen: 1.5, bugMul: 3.5, rearRate: 0.25, power4: true, bossHp: 0.7, theme: W3_THEME, weather: null }   // bossHp 0.7（11/6-1）: 120語の入れ替えで大ボスが「生乾き」の「どっち？」になり長くなった（52秒）ので、前の版の長さ（27秒）にもどした
];
// 宝石の色は WORLDS の gems から（11/2）。世界の中の何番目のステージかで決まる
window.STAGES.forEach(s => { const wd = window.WORLDS.find(w => w.id === s.world); s.gem = wd.gems[window.STAGES.filter(t => t.world === s.world).indexOf(s)]; });

