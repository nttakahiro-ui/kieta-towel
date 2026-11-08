// バトル（縦スクロールのシューティング）
// 空中と地上の2つの層がある
//   空中の敵 … 自機の弾（自動で連射）で倒す
//   地上の敵 … 自機の真上の列に来ると、自動で光のたねを投げて倒す（世界2から。10/31-12・11/1-4 決定。前は照準◎とたね）
// 主役は語句の敵。バトルは「1周目 → 2周目 → 大ボス」の台本で進む（出る順番・出方・時刻はデータで固定）
//   1周目「出撃1 探検（たんけん）」… 大ボス以外の語句が決まった順に出る。倒すと、ふわりが反応して光って消えるだけ（吸い込まない）
//   2周目「出撃2 本番（あつめる）」… 同じ語句が同じ順番・同じ出方で出る。倒すと、糸のようにほどけて吸い込まれる（クイズに出る）
//   出撃の始まりには「出撃1 探検」「出撃2 本番」の画面を出し、タップで出撃する。出撃1が終わると一度止まる
//            取り逃がした語句は、そのバトルでは取れない
//   大ボス … 2周目のあとに1回。倒して吸い込むとバトル終了
// お題バトル（BATTLE.odai が true のとき）: 2周目の中ボスと大ボスは、ふわりがお題（クイズの問題）を出し、
//   3つの語句（本物1つ・同じステージの別の語句2つ）から本物を撃つ。ダミーは弾がはね返る
// 雑魚（語句ではない敵）は小さく薄く。倒すとぽんっと花になり、ときどき体力が回復する「綿のたね」を落とす

// ===== 調整用の数値（速さ・弾の量・硬さなど）はここにまとめる =====
const BATTLE = {
  // --- 台本（2周＋大ボス） ---
  roundInterval1: 3.2,         // 探検（出撃1）で語句が出てくる間隔（秒）
  roundInterval2: 4.2,         // 本番（出撃2）で語句が出てくる間隔（秒）
  round1Speed: 1.4,            // 探検の語句の動く速さの倍率（探検は速く流す）
  roundGap: 2.5,               // 周と周のあいだの秒数（帯を出す）
  firstSpawnDelay: 2.2,        // 始まってから最初の語句が出るまで（秒）
  fallTime: { zako: 10, mid: 12.5 }, // 空中の語句が画面の上から下まで降りる秒数（大きいほどゆっくり）。10/7に10/6の前とあとの中間にした
  edgeFallTime: 13.5,          // 「端にかくれる」語句が降りる秒数
  crossTime: 6,                // 「横切る」語句が画面を横切る秒数
  zakoPatternHp: { cross: 0.5, edge: 0.3, treeshade: 1.4 },   // ザコの殻の硬さの倍率（10/25-8）。端にかくれる語句は当てられる時間が短いのでやわらかく、木のかげの語句は上で待つあいだにほどけないよう硬く。横切る語句は 10/25-9 に中ほどを通るようにした（横に追う時間が短いので0.5倍。画面のまん中あたりでほどける）
  crossY: 0.47,                // 「横切る」語句が通る高さ（画面の高さに対する割合。10/25-9 に0.2から中ほどへ）
  escortCount: 4,              // 「雑魚のうしろ」の語句を守る雑魚の数
  kanaSize: 13,                // 敵の語句の上に出すふりがなの大きさ（px）
  zakoAppearTime: 1,           // ザコの語句が画面に全部入ってから、止まって光る秒数（この間は撃てない。「来た」とわかる）
  bossStopY: 0.22,             // 大ボスが止まる高さ（画面の高さに対する割合）
  bossEnterTime: 3,            // 大ボスが止まる位置まで降りてくる秒数（この間は弾が当たらない）
  sway: 16,                    // 空中の語句の左右の振れ幅（px）
  swaySpeed: 0.9,              // 左右に振れる速さ
  bossSway: 0.28,              // 大ボスの左右の動き（画面の幅に対する割合）
  fontSize: { zako: 26, mid: 30, boss: 36 },   // 敵の文字の大きさ（px）。24以上
  shortScale: 1.3,             // 1〜2文字の短い語句は、文字をこの倍率で大きく出す
  wordTotalHp: { mid: 12, boss: 60 },          // 中ボス・大ボスの「語句全体の硬さ」。文字数で割って1文字あたりの耐久にする（難易度の倍率もかかる）
  perCharHp: { mid: { min: 2, max: 200 }, boss: { min: 6, max: 600 } },   // 1文字あたりの耐久の下限と上限（11/1: 上限を 6・30 から上げた。お題のあいだもパワーを保つため）   // 1文字あたりの耐久の下限と上限
  enemyFireInterval: { zako: 3.4, mid: 2.4, boss: 1.4 },  // 語句の敵が弾を撃つ間隔（秒）
  enemyBulletSpeed: 95,        // 敵の弾の速さ（px/秒）。難易度の線 bulletSpeed をかける（ステージ1はゆっくり）
  enemyBulletSize: 11,         // 敵の弾の見た目の大きさ（半径 px）。大きく見やすく
  enemyBulletHitR: 6,          // 敵の弾の当たりの大きさ（半径 px）。見た目より小さく、避けやすく
  hpOverride: { zako: 0, mid: 0, boss: 0 },   // 0 のときは自動。0より大きいと、ザコはこの硬さ、中ボス・大ボスは1文字あたりこの耐久にする
  wordHitPad: 28,              // 語句の敵の当たり判定を、文字の幅からさらに左右にこれだけ広げる（px）。10/3-10: 4 → 28。横に広がる弾が短い語句（リントなど）にも当たるように
  zakoHpByShots: true,         // 空中のザコの語句の硬さを、今の自機の弾の本数に比例させる（10/3-8。弾1本で5発…太い弾は2本分）
  shotPattern: { zako: [0], mid: [-0.18, 0.18], boss: [-0.25, 0, 0.25] },   // 語句の敵の弾の向き（自機をねらう向きからのずれ）

  // --- 雑魚 ---
  fillerInterval: 3,           // 雑魚の群れが出てくる間隔（秒）。10/7に10/6の前とあとの中間にした（本番での値。坂の倍率がかかる）
  fillerMax: 11,               // 同時に出ている雑魚の最大数（本番での値。坂の倍率がかかる）
  fillerSpeed: 0.83,           // 雑魚の動く速さの倍率（1＝10/6の速さ）
  fillerScale: 0.8,            // 雑魚の当たりの大きさの倍率
  shotPower: 0.35,             // ふわりの光の1発あたりの強さ（ザコの語句の殻を削る量。10/25-1 に0.8、10/25-8 に0.35。中ボス・大ボスの文字には使わない）
                               //   目安: 光を当て続けて、ことばが中央より少し手前（高さの30〜50%。10/25-11。前は35〜65%）に来るころに殻がほどける
  firstHoldY: 0.33,            // ステージ1の救出の旅の1語目・ステージ5の最初の地上のことばが止まって待つ高さ（画面の高さに対する割合。11/7-28 決定: 0.42 → 上から3分の1）
  firstHold: false,            // 救出の旅の1語目を止めて、助けるまで弾も虫も出さない（stages.js の override.battle でステージ1だけ true）
  odaiShellFire: true,         // お題バトルで殻（中ボス・大ボス）から弾を撃つか（ステージ1は override.battle で false）
  imageDecoAlpha: 0.5,         // 背景の絵の上を流れる地面の飾り（綿の実・花・草むら）の濃さ（10/21-2）
  fillerDrawScale: 0.65,       // 雑魚（殻を守る虫）の見た目の大きさの倍率（10/7-1: 小さく暗い色に。当たりは fillerScale のまま）
  fillerDark: "brightness(0.55) saturate(0.6)",
  fillerOutline: "rgba(15,10,20,0.95)",   // 虫のまわりの濃い輪郭の色   // 虫を暗い色にする（CSS の filter。使えない端末では、上に暗い色を重ねる）
  shotDrawScale: 1.0,          // ふわりの光（自機の弾）の見た目の倍率（10/7-1 に1.5、10/21-1 に1.2、10/25-1 に元の1.0。当たりは今のまま）
  fillerAlpha: 0.72,           // 雑魚の濃さ（1でふつう。小さいほど薄い）
  fillerAvoid: 90,             // 語句のまわり、この距離（px）には雑魚を出さない
  fillerFireScale: 1.5,         // 雑魚が撃つ間隔の倍率（大きいほど撃たない）
  dropRate: 0.15,              // 雑魚が「綿のたね」を落とす確率（0〜1）。雑魚が増えたので下げた
  popScale: 1.6,               // 雑魚を倒したときの花の大きさ
  healItem: 8,                 // 綿のたねで回復する体力

  // --- 地上 ---
  scrollTime: 11.5,            // 地面が画面の高さぶん流れる秒数（大きいほどゆっくり）
  // 地上の攻撃（10/31-12 決定 B）: 地上の敵が自機の真上の列に来たら、自動で光が落ちる（左右に合わせるだけ。照準◎はやめた）
  bombRange: 170,              // 自機の真上の地面に置く薄い丸の位置（自機からどれだけ前か、px）
  lockRadius: 26,              // 薄い丸の大きさ（px）
  groundColumn: 60,            // 「真上の列」の左右の幅（px。11/2 決定。地上のことばがこの幅にかかっていれば、真上ぴったりでなくても投げる。前は12）
  bombInterval: 0.25,          // 光のたねを投げる間隔（秒。11/2 決定「投げ続ける」。前は0.6）
  bombFlight: 0.85,            // 光のたねが地面に届くまでの秒数（放物線。0.25秒ごとなので、空中に3〜4個）
  seedPower: 4 * 0.25 / 0.6,   // 光のたね1個で削る量（11/2: 前の1個4の、およそ1/3。倒す速さは前と同じになるように 4 × 0.25 ÷ 0.6。端数は持ちこす）
  seedArc: 46,                 // 放物線の高さ（px。画面の上へふくらむ）
  seedSpread: 22,              // 落ちる先を左右にばらけさせる幅（px。±この値）
  seedSplash: 40,              // はじける範囲（幅80px の半分。地上のことばの幅の半分＋この px まで当たる）
  seedSize: 1.5,               // たねの大きさ（11/1-4 の何倍か）
  // 地上の攻撃を「爆弾」に（11/6-3 決定。検討版 11/6 だけ）: 1回に左右45度の2方向へ2個を山なりに投げる。落ちた場所で爆発の輪が広がり、輪の中の地上の敵に当たる
  bombSide: 40,                // 爆弾が落ちる場所の、自機からの左右のずれ（px）。左右の輪が真ん中で重なる
  bombRing: 58,                // 爆発の輪の半径（px）。bombSide より大きいので、左右の2つで真正面もおおう
  groundWide: 0.5,             // 地上の雑魚（星など）が画面のこの高さより下にいれば、真上の列でなくても爆弾を投げる（画面の高さの割合。11/7-23 決定「画面の下半分に星があれば投げる」）。ねらうのはその雑魚の位置
  bombLook: { size: 1.2, arc: 1.35, trail: 0.35, rays: 8 },   // 爆弾の見た目（11/7-23）: 大きさ・山なりの高さ（見た目だけ。落ちる場所と時刻は同じ）、尾の長さ（飛ぶ時間の割合）、着弾で地面を走る光の数
  bombRingTime: 0.35,          // 輪が広がりきるまでの秒数（見た目だけ。当たりは落ちた瞬間）
  // 世界3の光の玉（11/6-3 決定。検討版 11/6 だけ）: 自機のまわりを2つの玉が回る。触れた敵（空中の虫）にダメージ。操作はふえない
  orbs: { n: 2, radius: 50, period: 2, r: 10, cd: 0.3 },   // 数、回る半径（px）、一周の秒数、玉の当たりの大きさ（px）、同じ虫に続けて当たらない秒数
  orbHintTime: 2.6,            // ステージ9の救出の旅の最初の「うしろから虫が来る！…」を出す秒数（11/6-6）
  rearHp: 3,                   // 世界3でうしろから来る虫の硬さ（回る玉に3回触れると倒れる）。ぶつかると元気が減る（＋100 は出さない）
  groundTextScale: 0.78,       // 地上のことばの文字の高さの倍率（少し平たくして、地面に貼りついて見えるように）
  darkRescue: 0.6,             // 救出の旅の出来事「照明が落ちる」の暗さ（地面と地上のものだけ。発見の旅は0.84）
  powerStartW23: 1,            // 世界2・3のパワーの初期値の段（0 ＝ 1本、1 ＝ 2本。10/31-13 決定: 救出の旅を派手に。世界1は1本のまま）
  powerStartW3: 2,             // 世界3のパワーの初期値の段（2 ＝ 3本。パワーUPで4本。11/3-3 決定: 世界3を最初から1段強く）
  groundHold: false,           // 救出の旅の最初の地上のことばを、中ほどで止めて待つ（stages.js の override.battle でステージ5だけ true）
  hideOut: 3.75,               // 地上のことば「隠れる」（10/31-13 決定 B改）: 顔を出している秒数（このあいだだけ光が届く）。11/7-8 決定: 1.5倍（前 2.5）
  hideIn: 0.75,                //   隠れている秒数（隠れ場所だけが見える）。11/7-8 決定: 半分（前 1.5）。1つのことばが隠れるのは最大1回
  groundEdge: 60,              // 隠れる・動く地上のことばは、画面の左右のはしから この px には出さない（はしに寄ったら手前で止まる。11/7-8 決定）
  stayW23: 1.2,                // 世界2・3の救出の旅で、ことばが画面にいる時間（流れて消えるまで）の倍率（11/7-8 決定。大ボス・お題は別）
  groundSlide: 26,             // 世界2の地上の雑魚（歯車・ねじ・糸くずの玉）がコンベアで横にすべる速さ（px/秒。11/1 決定）
  groundHop: 9,                // 世界3の地上の雑魚（星のかけら・隕石）が跳ねる高さ（px。見た目だけ。当たりは地面のまま）
  groundMoveSpeed: 28,         // 地上のことば「動く」: コンベアに乗って横に動く速さ（px/秒。はしの手前で止まる）。11/7-8 決定: 7割（前 40）

  // --- 強さ（1945型） ---
  powerEvery: 3,               // 語句を何語吸い込むごとに1段階強くなるか

  // --- 得点 ---
  scoreFiller: 100,            // 雑魚を倒した点
  scoreWord: 1000,             // 語句を倒した点（雑魚の10倍）
  comboStep: 0.5,              // 語句を続けて倒すたびに増える倍率（1 → 1.5 → 2 …）
  comboMax: 3,                 // コンボ倍率のいちばん上

  // --- お題バトル（2周目の中ボス2回と大ボス1回） ---
  speakWords: false,           // ことばの読み上げ（10/31-3 にやめた。コードは残す。調整パネルの「読み上げ: オン／オフ」で戻せる）
  odai: true,                  // お題バトルのスイッチ（true＝オン、false＝オフ。オフで今までの中ボス・大ボス戦）
  odaiIntroTime: 2.5,          // （10/25-16 から使っていない。問題文を読む時間は文の長さで決める: odaiReadPerChar など）
  odaiBigFont: 26,             // 問題文を画面中央に出すときの文字の大きさのいちばん上（px）。画面の幅に3行以内に収まるまで小さくする
  odaiSmallFont: 20,           // 問題文を上の帯の下に移したあとの文字の大きさのいちばん上（px）。枠の中に2行で収まるまで小さくする（10/25-3）
  odaiPanelLines: 2,           // 帯の下の問題文の行数（14pxでも入らないときだけ odaiMaxLines まで）
  odaiMaxLines: 3,             // 問題文の行数の上限
  odaiFitFont: 14,             // 問題文の文字の大きさのいちばん下（px。10/25-3）
  odaiMinFont: 12,             // （3行にしても14pxで入らないときだけ、ここまで小さくする）
  odaiTimeLimit: 30,           // 中ボスのお題の制限時間（秒。11/1-2 決定で20→30。人は自動の1.5倍かかるため）。時間切れは取り逃がし。大ボスは制限なし
  odaiPenalty: 300,            // ダミーに当てたときの減点（コンボは切らない）
  odaiPenaltyCool: 1,          // 同じダミーで続けて減点しない秒数（連射で何度も減らないように）
  odaiBonus: 2000,             // 最初に当てたのが本物なら「ひらめき」ボーナス
  odaiHpByLevel: [1, 1.25, 1.5, 1.6],   // お題の殻の硬さの倍率（出たときのパワーの段ごと）。光の本数に半分だけ比例（1本 1.0、2本 1.25、3本 1.5。11/1-2 決定）、4本は1.6（11/1-4 決定）
  odaiColumns: [0.15, 0.5, 0.85], // 3つの語句をならべる列の位置（画面の幅に対する割合）。縦書きで動かさない（11/1 決定: 前は 0.2・0.5・0.8。パワーを保つので外側へ）
  odaiColumns2: [0.2, 0.8],     // 2つのとき（「どっち？」「次は？」）の列（11/1 決定: 前は 0.3・0.7）
  // お題のことばのゆれ（11/3-3 決定）は stages.js の WORLDS の odaiSway（幅px・周期秒）。読む時間のあとで少しずつゆれ始める。ことばごとに向きをずらす
  odaiSwayIn: 0.8,             // ゆれ始めてから、幅いっぱいになるまでの秒数
  odaiTextScale: 0.8,           // お題のことばの文字の大きさの倍率（11/1 決定: よけるすきまを広げる。読む時間は変えない）
  odaiSpread: 0.35,             // お題のあいだの光の広がりの倍率（11/1 決定: パワーの段は保ち、正面寄りに。1 で救出の旅と同じ）
  // お題の殻の弾の形（11/1 決定。stages.js の odaiShot で役ごとにえらぶ。ないときは扇）。1回に撃つ数は扇と同じ（中ボス2・大ボス3）で、弾の総数は変えない
  //   aimGap ＝ ねらいの1発ずつの間隔（秒）、sweepCols ＝ 横ながしの列の数、sweepGap ＝ 横ながしの1発ずつの間隔（秒）、ringN ＝ 輪1つの弾の数（たまったら撃つ）、
  //   rainSlant ＝ ななめ雨の傾き（横の速さ ÷ 縦の速さ）、speed ＝ 形ごとの速さの倍率
  odaiShots: { aimGap: 0.18, sweepCols: 7, sweepGap: 0.12, ringN: 6, rainSlant: 0.45, speed: { aim: 1, sweep: 1, ring: 0.85, rain: 1 }, gap: { fan: 1.4, aim: 1.4, sweep: 1.4, ring: 1.4, rain: 1.4 } },
  rearRate: 0.2,               // 世界3: 雑魚の群れのうち、うしろ（画面の下）から来る割合（stages.js の rearRate でステージごとに）。11/6-4: 0.35→0.2（うしろの虫がぶつかると元気が減るようになったので、数を減らした。ステージ12 0.5→0.25）
  gravityDrift: 46,             // 出来事「重力が変わる」: ことばが横に流される速さ（px/秒）（10/31-10 試作）
  // 出来事「ねじが飛んでくる」（世界2）と「星がはじける」（世界3）（11/1-2 決定）。warn ＝ 先に出す印の秒数
  screwEvent: { n: [3, 5], warn: 1.5, gap: 0.35, vx: 210, vy: 120 },
  burstEvent: { every: 3, warn: 2, n: 8, speed: 140 },
  // 出来事「うしろから虫の群れ」「はさまれる」「風」「風が逆」「霧」（11/1-3 決定。全世界）
  rearSwarm: { n: 4, warn: 1.5 },   // うしろ（画面の下）から上がってくる虫の数と、先に下のはしに「！」を出す秒数
  pinchGap: 0.3,                // はさまれる: 左右の障害物のあいだの道の幅（画面の幅に対する割合）
  fogTopEvent: 0.45,            // 出来事「霧」: 画面の上からこの割合までが霧（ふだんの霧は fogTop）
  fastConveyor: 2,              // 出来事「コンベアが急に速くなる」: 地面と動く地上のことば・地上の雑魚の速さの倍率（11/1-2 決定）
  meteorGap: 0.45, meteorSpeed: 300,   // 出来事「流星雨」: 上から流れ星の弾が落ちてくる間隔（秒）と速さ（px/秒）（10/31-10 試作）               // 世界3: 雑魚の群れのうち、うしろ（画面の下）から来る割合（10/31-10 試作）

  // --- バトルの中の坂（探検 → 本番 → 大ボスで、だんだん濃くなる） ---
  // filler: 雑魚の量の倍率（大きいほど多い）、fire: 敵の弾の量の倍率（大きいほど多い）
  ramp: {
    round1: { filler: 0.5, fire: 0.6 },   // 探検: 雑魚少なめ・弾少なめ
    round2: { filler: 1,   fire: 1 },     // 本番
    boss:   { filler: 1.3, fire: 1.2 },   // 大ボス: いちばん濃い
  },

  // --- 本番に持っていくもの（出撃2の前に3つから1つ選ぶ） ---
  // 1回目の旅（さがす）: 双眼鏡（10/3-11）。見た目はすべて仮
  exploreTime: 40,             // 発見の旅の基準の時間（秒）。10/25-17 から時間切れはなく、10のことばを見つけるまで続く（早いと＋点、おそいと−点）
  exploreFirst: 1.2,           // 最初の語句が現れるまで（秒）
  exploreGap: 3.4,             // 語句が現れる間隔（秒）
  exploreLife: 10,             // 語句がただよっている時間（秒）。見つけられなければ消える
  exploreSpeed: 24,            // 語句がただよう速さ（px/秒）
  binoR: 0.17,                 // 双眼鏡（正円2つを横に重ねた形。10/25-1 に楕円からもどした）の円の半径（画面の幅に対する割合）
  binoSpread: 0.62,            // 2つの円の中心のはなれぐあい（半径に対する割合。1より小さいと重なる）
  binoMove: 1.15,              // 指を動かした量に対して、双眼鏡が動く量
  exploreBgSpeed: 18,          // 発見の旅の背景の絵が下へ流れる速さ（px/秒。11/1）
  exploreDark: 0.98,           // 円の外の暗さ（0〜1。1でまっ暗）
  lookTime: 0.5,               // 円の中で見つめると見つかるまでの時間（秒・合計）
  hintEvery: 1.5,              // 暗いところで語句がきらっと光る間隔（秒）
  hintSize: 1.6,               // きらっと光る大きさの倍率（10/7-1）
  hintAlpha: 0.6,              // きらっと光る強さ（0＝光らない〜1）
  bugEvery: 5,                 // 飾りの虫が横切る間隔（秒）
  // 2回目の旅: ことばを包む殻（10/3-11。役割で分ける: ザコ＝綿毛のまゆ、中ボス＝いばら、大ボス＝霧）。見た目はすべて仮
  shellVeil: 0.22,             // 殻が語句の上にかかる濃さ（0〜1。読みやすさのため、うすく）
  // ステージ1の案内（10/21-2）。初めてそれが起きた瞬間にだけ、1〜2行で出す。文は data/texts.js の hints
  hintTime: 3.4,               // 案内を出す秒数
  hintSlow: 1,                 // 案内を出すとき、ゆっくりにする秒数
  odaiHintExtra: 2,            // ステージ1の初回のお題（案内を添えるとき）、読む時間にさらに足す秒数（10/25-16 に1.5 → 2）
  odaiReadPerChar: 0.1,        // お題の問題文を読む時間: 1文字あたりの秒数（10/25-16。50文字なら 0.1×50＋1 ＝ 6秒）
  odaiReadBase: 1,             //   ＋この秒数
  odaiReadMin: 2.5,            //   最短
  odaiReadMax: 7,              //   最長（ステージ1の初回は、これに odaiHintExtra を足す）
  odaiWrongTime: 0.8,          // ちがうことばに当てたとき、「ちがうよ」を画面の中ほどに大きく出す秒数・そのことばが赤く点滅する秒数（10/25-16）
  odaiWrongRun: 3,             // 続けてこの回数ちがうことばに当てたら、ふわりが「問題をもう一度読んでみよう」
  shellNearDone: 0.2,          // 殻の残りがこの割合以下（ほどけるまでの8割まで光を当てた）になると、黄色く光る（あと少しの印。10/25-16）
  tutCloseAfter: 0.8,          // 紙芝居（デバッグ）の札を閉じられるまでの秒数
  // チュートリアル（11/7-20）: 止まる → ふわりの吹き出しで説明 → タップ → 1回やってみる → 「OK！」→ 再開。文は data/texts.js の lessons
  lesson: { tapAfter: 0.6, okTime: 0.9, rearSpeed: 45, moveDist: 80 },   // tapAfter ＝ 説明が出てからタップを受けるまでの秒、okTime ＝「OK！」を出す秒、rearSpeed ＝ ステージ9の練習の虫の速さ（px/秒）、moveDist ＝「ふわりを動かそう」で動かす長さ（px）

  // 旅の名前と表紙の文は data/texts.js の trips（10/21-1 に移した）
  // 本番の表紙（10/3-9）
  doorFade: 0.35,              // 扉を押して場面に入ったあと、白い光が消えていく時間（秒）。扉の動きの数値は js/door.js の DOOR（11/7-19）
  choiceTime: 10,              // （10/25-14 から使っていない。持ち物選択は時間制限なし）
  bigBombMul: 2,               // （10/25-1 から使っていない。前の「大きなふわりタイフーン」のゲージの倍率）

  // --- 天気（data/stages.js の weather） ---
  windDir: 1,                  // 風で自機が流される向き（1 ＝ 右へ、-1 ＝ 左へ）
  windStrength: 26,            // 風で自機が流される速さ（px/秒）
  fogTop: 0.25,                // 霧: 画面の上からこの割合までが霧（半透明。敵の影がうっすら見え、語句の光る縁取りは霧の上に出る）
  fogColor: "rgba(48,58,84,0.78)",   // 霧の色（最後の数が濃さ。1 で何も見えない）

  // --- 障害物（data/stages.js の obstacles） ---
  shadeHoldY: 0.2,             // 「木のかげ」の語句が止まって待つ高さ（画面の高さに対する割合）
  guideSlow: 1,                // 木のよけ方の案内のときに、ゆっくりになる秒数
  restGap: 3,                  // 休みつきの木（stages.js の afterWord）の前後にあける秒数（10/7-1）
  guideTime: 2.4,              // 木のよけ方の案内（矢印）を出す秒数
  shadeWait: 2.5,              // 「木のかげ」の語句が、木が去ってから待つ秒数（そのあと降りてくる）

  // --- 必殺ワザのゲージとボタン ---
  bombGain: 18,                // 語句を倒したときにたまるゲージ（×コンボ倍率）。100で満タン（11/3-1 決定: 12→18。全ステージで1.5倍）
  bombButtonR: 26,             // 画面左下のふわりマーク（ボムのボタン）の大きさ（px）

  // --- 難易度 ---
  // data/stages.js の difficulty（1〜12）から、次の数値が自動で決まる。
  // at1 が難易度1のときの値、at12 が難易度12のときの値。そのあいだはまっすぐの線でつなぐ
  // ステージごとの手上書きは data/stages.js の override 欄
  // 難易度の線（10/21-2）: 難易度＝ステージ番号（1〜12）。[難易度, 値] の2点（1と12）を結ぶ一直線。ステージ1の手ごたえは10/21-1のまま
  difficulty: {
    fireRate:      [[1, 0.31], [12, 1.85]],    // 弾の多さ（敵が撃つ間隔の逆数。大きいほど弾が多い。1 ＝ 10/3の基準）
    bulletSpeed:   [[1, 0.6], [12, 1.15]],     // 敵の弾の速さの倍率（ステージ1はゆっくり）
    speedScale:    [[1, 0.85], [12, 1.25]],    // 語句の速さの倍率
    fillerDensity: [[1, 0.6], [12, 1.6]],     // 救出の旅の虫の濃さ（数と間隔。虫1匹の弾の量は変えない）
    zakoHp:        [[1, 9], [12, 8]],         // ザコの語句の硬さ（弾1本あたり。0.1きざみ）。10/25-1: 4〜5、10/25-8: 10〜11（中央あたり）、10/25-11: 9〜8（中央より少し手前、高さ30〜50%でほどけるように。ステージ1〜4で1〜2割下げ。速いステージほど少しやわらかく）
    fillerHp:      [[1, 1], [12, 3]],         // 虫の硬さの倍率（四捨五入）。10/25-1: 耐久は主に虫で上げる
    bossHpScale:   [[1, 4.54], [2, 4.28], [3, 4.17], [4, 3.54], [5, 2.18], [6, 2.12], [7, 2.22], [8, 2.15], [9, 2.02], [10, 1.8], [11, 1.64], [12, 1.49]],   // 大ボスの1文字あたりの耐久の倍率（11/1 から中ボスは midHpScale）
    //   11/1 決定: お題のあいだもパワーを保つので、ステージ1〜12の線を引き直した。自動のふつうで大ボス戦が30〜35秒になる値。お題の殻は、出たときの光の本数をかけた硬さ（odaiHpByShots）
    //   10/31-12 決定: 中ボス・大ボスの硬さの線は、ステージ5〜12を実測で通る値に引き直す（世界1は変えない）。1〜4 は前の線（1.1 と 12 で 2 を結ぶ線）のまま（4 の値はその線の上）。
    //   5〜12 は自動プレイヤーで大ボス戦が終わる値（7・9・10 は 1.2、12 は 1.0。前は stages.js の override。5・6・8・11 は前の線の値）
    //   11/3-3 決定「硬さでなく弾とよけで攻略させる」: 5〜12 の大ボス・中ボスを下げた。自動のふつうで大ボス戦が 世界2 25秒前後・世界3 25〜30秒、中ボスのお題が10秒前後になる値（世界1は変えない）
    midHpScale:    [[1, 4.97], [2, 4.0], [3, 5.02], [4, 3.74], [5, 3.43], [6, 4.35], [7, 3.44], [8, 3.3], [9, 2.98], [10, 3.11], [11, 2.71], [12, 3.03]],   // 中ボスの硬さの倍率（11/1 決定で大ボスと分けた。自動のふつうで中ボスのお題が12〜15秒になる値）
    tricky:        [[1, 0], [12, 6.2]],       // 意地の悪い語句の数（四捨五入。patterns が "auto" のステージだけ）
  },


  autoGroundCount: 2,          // patterns が "auto" のステージで、地上（地上のかげ）に出すザコの語句の数

  debugInvincible: false,      // デバッグ: 自機が弾に当たらない

  // --- 自機 ---
  shotInterval: 0.14,          // 自機の弾の間隔（秒）。10/21-1 に 0.11 → 0.14（光で語句や敵が隠れないように）
  shotSpeed: 640,              // 自機の弾の速さ（px/秒）
  playerMaxHp: 100,            // 体力
  damage: 20,                  // 敵の弾に当たったときに減る体力
  healOnAbsorb: 12,            // 語句を吸い込んだときに回復する体力
  invincibleTime: 1.3,         // 当たったあと、しばらく無敵になる秒数
  lives: 3,                    // 残機（1945型）。体力ゼロで1機失い、画面の下から復活。全部失うと本番の最初からやり直し
  respawnRise: 0.6,            // 復活のとき、画面の下から上がってくる秒数
  respawnInv: 2,               // 復活したあと、無敵で点滅する秒数
  wordShowTime: 1.5,           // 吸い込んだ語句を画面中央に大きく出す秒数（この間は弾が当たらない）
  fuwariSayTime: 3,
  powerFxTime: 1.3,
  boss2: { hp: 0.7, shape: "ring", fxTime: 1.6 },   // 大ボス2段階（stages.js の bossTwoStep。11/1-4 決定 ステージ12）: 2段階目の殻の硬さ（1段階目の倍率）・弾の形・「まだだ！」の秒数
  timeBarH: 6,                 // 発見の旅の残り時間の帯の太さ（px。画面のいちばん上。10/25-12）
  timeBarWarn: 10,             // 残り何秒で帯の色が変わるか
  exploreTimeScore: 100,       // 発見の旅: 基準の時間より早く終われば残り1秒につき＋、おそければ1秒につき−（10/25-17）
  exploreOverMsg: 2,           // 基準の時間を過ぎた瞬間に「時間オーバー！…」を出す秒数（10/25-21）
  exploreAgainGap: 2,          // 見つけられずに消えたことばが、出直すまでの間隔（秒）
  stripFoundFlash: 0.5,        // 見つけた瞬間に、左の枠の名前がきらっと光る秒数            // 「パワーアップ！」を出す秒数（10/25-9）
  fuwariSize: 62,              // 自機のふわりの絵の幅（px。10/25-6）
  fuwariExploreSize: 50,       // 発見の旅の、下のまん中の小さなふわりの幅
  fuwariFrameTime: 0.18,       // 飛んでいるときに1→2→3のコマを切り替える秒数
  fuwariBombSize: 0.75,        // パワー全開を使った瞬間の大きなふわり（3のコマ）の幅（画面の短いほうの何倍か）            // 周の始まりの、ふわりの一言を出す秒数
  slowTime: 0.3,               // 吸い込む瞬間に画面全体がゆっくりになる秒数
  slowScale: 0.25,             // ゆっくりのときの速さ（1でふつう、小さいほどゆっくり）
  stripWidth: 24,              // 左端の「集めたことば」の縦の帯の幅（px。縦書き1文字分ほど）

  // --- 世界2・3の試作（10/31-10。docs/世界2・3の構想メモ.md）。数は仮 ---
  groundMark: true,            // 左の帯で、地上に出ることばの枠に小さな地面の絵のマーク（10/31-12 決定。文字の「地」ではない）
  // 必殺ワザ（11/6-6 決定）: 「パワー全開」「無敵タイム」「巻き戻し」の3つ（11/7-25 決定: 前の1つ目のワザをパワー全開に替えた）。最初から全部持っていて、左下に3つのボタン。ゲージは3つで1本（使うと0にもどる）
  // ラストチャンス（11/7-12 決定で作り直し）: 大ボスのあと、取り逃したことばがあれば15秒。取り逃したことばが本編と同じ姿でもう一度出る（spawnIn 秒以内に全部）。
  //   ふわりが光って、近く（pullR px 以内）のことばを pullSpeed px/秒で引き寄せる。（11/7-10 の「逃げる虫」はやめた）
  lastChance: { time: 15, spawnIn: 3, pullR: 100, pullSpeed: 70 },
  skillBoostTime: 8,           // 「パワー全開」の秒数（11/7-25 決定）。パワーが1段上がる（世界の上限を1つ超えてよい）。使った瞬間に画面の敵の弾だけ消す
  skillGuardTime: 8,           // 「無敵タイム」の秒数（11/7-9 決定: 15 → 10。11/7-25 決定: 10 → 8）。（自機が大きく光り、ぶつかった虫と弾が消える。元気は減らない）
  rewindHintTime: 2.6,         // ゲージが初めて満タンになったときの、ふわりの巻き戻しの一言の秒数（11/7-9 決定: 2〜3秒）
  skillGuardR: 44,             //   無敵タイムの光の半径（px。この中に入った虫と弾が消える）
  gaugeKill: 3,                // ゲージのたまり方（100で満タン）: 虫を1匹倒す。虫の多いステージでたまりすぎないように、gaugeKillHalf 匹倒すごとに減る（10匹目で半分、20匹目で3分の1…）
  gaugeKillHalf: 10,
  gaugeWord: 24,               //   ことばを1つ取り戻す
  gaugeHit: 8,                 //   被弾する（元気が減る）。中ボス・大ボスが出た瞬間は満タンになる
  skillButtonGap: 10,          // 左下の3つのボタンのあいだ（px）
  // とくい（11/6-6 決定。出撃前に1つ選ぶ。そのステージのあいだだけ）: パワーアップ＝光が1段上から（世界1は2本、世界3は4本）／守りアップ／ゲージ2倍速
  guardHpMul: 1.5,             // 守りアップ: 元気の上限の倍率
  guardInvMul: 1.5,            // 守りアップ: 被弾したあとの無敵の秒数の倍率
  gaugeFastMul: 2,             // ゲージ2倍速: ゲージのたまる速さの倍率
  orderHits: 3,                // 大ボス「3つを順に」: 順がちがうことばに続けて何発当てたら「まちがい」にするか（横切っただけでは数えない）
  orderGoodHold: 1.2,          //   正しい順のことばに当てたあと、この秒数は、ほかのことばに当たってもまちがいにしない（よけたとき・広がった光。11/2-2）
  orderShare: 1 / 3,           // 大ボス「3つを順に」（11/2-2 決定）: 1つのことばの殻の硬さを、大ボスの硬さの線の何倍にするか（3つで大ボス1つ分）
  orderHitGap: 0.35,           //   この秒数あいだがあくと、続けて当てた数は0にもどる
};

// ===== 雑魚の種類 =====
// layer: "air"（空中・弾で倒す）/ "ground"（地上・たねで倒す）
// hp: 硬さ、r: 当たりの大きさ、fire: 弾を撃つ間隔（秒・0なら撃たない）、spread: 弾の向き
const FILLER_TYPES = {
  ladybug: { layer: "air",    hp: 1, r: 13, fire: 0 },                       // てんとう虫: 横から列になって飛んでくる
  bee:     { layer: "air",    hp: 1, r: 13, fire: 2.2 },                     // ハチ: 上から自機のほうへ急に降りてきて、引き返す
  ghost:   { layer: "air",    hp: 1, r: 16, fire: 2.8 },                     // 綿毛おばけ: ゆらゆら降りてくる
  weed:    { layer: "ground", hp: 1, r: 18, fire: 2.6 },                     // からまり草: 畑に生えている
  thorn:   { layer: "ground", hp: 1, r: 20, fire: 3.4, spread: [-0.3, 0, 0.3] }, // いばらの株: 3方向に撃つ（雑魚はみな1発で崩れる）
};
// 時間帯の虫（10/25-1。絵は仮の図形）。move ＝ 動き方（ladybug 横の列／bee 急降下して引き返す／ghost ゆらゆら降りる）、
// hover 近くまで降りてとどまる。stay ＝ とどまる秒数）、keep ＝ ことばを助けたときの光で消えない、speed ＝ 速さの倍率、wind ＝ 風に流される、glow ＝ 光る（霧の中の目印）。どの虫を出すかは stages.js の theme.bugs
Object.assign(FILLER_TYPES, {
  butterfly:   { layer: "air", hp: 1, r: 14, fire: 1.8, move: "ghost" },                 // ちょうちょ（明け方）: ゆっくり降りながら、ときどき撃つ
  kanabun:     { layer: "air", hp: 6, r: 14, fire: 0.9, move: "hover", stay: 6, keep: true },      // コガネムシ（明け方。10/25-2）: 自機の近くまでゆっくり降りてきて、しばらくとどまってゆっくり撃ち、上へ帰る（ステージ1の「弾が少し来る」はおもにこれ。10/25-11 に撃つ間隔を 0.5 → 0.9 に広げた）
  grasshopper: { layer: "air", hp: 1, r: 13, fire: 2.4, move: "bee" },                   // バッタ（真昼）: ぴょんと飛びこんでくる
  dragonfly:   { layer: "air", hp: 1, r: 14, fire: 2.6, move: "ladybug", wind: true },   // トンボ（夕暮れ）: 列で横切る。風に流される
  moth:        { layer: "air", hp: 1, r: 14, fire: 3.0, move: "ghost", wind: true },     // ガ（夕暮れ）: ゆらゆら。風に流される
  bat:         { layer: "air", hp: 1, r: 14, fire: 2.0, move: "bee", speed: 1.3 },       // コウモリ（夜）: 速い
  firefly:     { layer: "air", hp: 1, r: 12, fire: 3.4, move: "ghost", glow: true },     // ホタル（夜）: 光る
});
const moveOf = type => FILLER_TYPES[type].move || type;
// 雑魚の群れの出やすさ（数が大きいほどよく出る）。stages.js の theme.bugs がないステージで使う
const FILLER_WAVES = { ladybugs: 3, bees: 2, ghost: 2, weeds: 3, thorn: 1 };

// ===== 発見の旅の、ことばの動きの型（10/25-7） =====
// stages.js の explore: { move: "fall" } で選ぶ（書いていないステージは "drift"）。数は、ここか stages.js の explore 欄で上書きできる
// lookTime ＝ 見つめて見つかるまでの秒数（書いていない型は BATTLE.lookTime）
// 双眼鏡で見つめる操作はどの型も同じ。世界2・3の探し方（箱を開ける・星をなぞる）は、ここに型を足して差しかえる
const EXPLORE_MOVES = {
  drift:   {},                                                        // ゆっくり漂う（ステージ1）
  fall:    { fallSpeed: 69, sway: 34, swaySpeed: 1.4, wait: 2, lifeMul: 2, lookTime: 1, maxOn: 2 },   // 10/25-17: 落ちる速さ 46 → 69（1.5倍）、同時に2つまで（maxOn）   // 落ち葉のように揺れながら降る。地面に落ちたら wait 秒あとに上から出直す（ただよう時間は lifeMul 倍）。見つめる時間は1秒（10/25-8）
  wind:    { wind: 40, gust: 0.35, binoDrift: 14, wait: 0.8 },        // 風で右へ流される（gust ＝ 風の強弱）。右に出たら wait 秒あとに左から出直す。双眼鏡も binoDrift px/秒 流される
  firefly: { speedMul: 0.5, flies: 4, stray: 4, fog: 0.35, hint: false },   // 霧が濃い。ことばのまわりにホタルが flies 匹集まる（stray ＝ ひとりで飛ぶホタル）。きらっと光る目印は出さない
  // 世界2「箱」（10/31-10 試作。構想メモ 2）: 双眼鏡と暗闇は使わない。コンベア（lanes ＝ 画面の高さに対する割合）の上を箱が流れ、指で押さえ続けて hold 秒で開く
  //   boxW・boxH ＝ 箱の大きさ（px）、speed ＝ 流れる速さ（px/秒）、gap ＝ 箱が出てくる間隔（秒）、wait ＝ 流れきった箱が戻ってくるまで（秒）、empty ＝ 空箱の数
  //   open ＝ true で「OPEN」の面が上のときだけ開く（openTime ＝ OPEN の面が上にある秒数、faceTime ＝ ほかの面の秒数）、lock ＝ 鍵つきの箱の数（先に鍵の箱を開ける）
  box:     { box: true, boxW: 88, boxH: 64, speed: 32, gap: 1.82, wait: 2, empty: 4, hold: 0.5, lanes: [0.3, 0.52, 0.74], open: false, openTime: 4, faceTime: 0.5, lock: 0, fake: 0 },   // 11/1-2 決定: 押さえる時間1→0.5秒、空箱2→4個、出てくる間隔0.7倍（2.6→1.82秒）。fake ＝ にせOPEN の箱の数（OPEN と書いてあるが空）
    // 10/31-13 決定: OPEN の面は4秒、ほかの面は0.5秒×3（前は2.4秒・0.6秒）
  // 世界3「無重力」（10/31-10 試作。構想メモ 3 の、いちばん単純な形）: ことばが回りながら漂う。向きのずれが align（ラジアン）までのときに指で押さえると、
  //   turn 秒でまっすぐに向き直り、そこから hold 秒で見つかる（押さえているあいだは回らない。はなすとまた回り出す。10/31-14）
  //   speed ＝ 漂う速さ（px/秒）、spin ＝ 回る速さ（ラジアン/秒）、maxOn ＝ 同時に漂う数の上限、gap ＝ 次のことばが出てくる間隔（秒）。くっつき・照らすは入れていない
  //   chars ＝ 同時に漂う数を「chars ÷ そのステージのことばの平均の文字数」（切り捨て、minOn〜maxOn）にする（10/31-12 決定: 長いことばのステージほど少なく。ステージ9・10 は5つ、11・12 は4つ）
  //   dim ＝ まっすぐでないことばの濃さ（10/31-12 決定: 薄くして、まっすぐになった金色のことばだけ浮き出るように）
  space:   { box: true, space: true, speed: 24, spin: 0.55, align: Math.PI / 2, turn: 0.5, hold: 1, maxOn: 6, minOn: 3, chars: 26, gap: 1.2, dim: 0.35 },   // 10/31-14 決定: 易しく（回る速さ半分・判定60度・押さえると0.5秒で向き直る。前は spin 1.1・align 0.8）。11/7-8 決定: ねらえる時間を1.5倍に（判定 60度 → 90度。回る速さはそのまま）
};

// ===== 必殺ワザ（11/6-6 決定）: 3つ。名前と説明は texts.js の skills。最初から全部持っている
// 世界ごとの色（11/7-9 決定）: 助けたことばを大きく見せる帯（ことばの色・枠・ふりがな。ことばの色は ENEMY_COLOR の緑のところ＝ザコだけ。中ボスの茶・大ボスのピンクはそのまま）。世界1は今の緑。青・紫は緑と同じ明るさ・あざやかさで色合いだけ変えた
const WORLD_TINT = {
  1: { frame: "#cfe0b6", kana: "#6b7a5a", zako: "#5f8a3c" },
  2: { frame: "#b6cbe0", kana: "#5a6a7a", zako: "#3c638a" },
  3: { frame: "#ceb6e0", kana: "#6d5a7a", zako: "#693c8a" },
};
// 世界ごとの色（11/7-16 決定）: 画面の枠・案内・見出しの緑を、世界2は青・世界3は紫に。明るさ・あざやかさは同じで色合いだけ（210°・275°。css の body[data-world] と同じ計算）
//   お題バトルの枠ととくいの選択の枠（金色）も、世界2・3は世界の色に（世界1は今のまま）。使う場所で tint() を通す。ふわりの吹き出し・元気のゲージ・敵・木などの絵は変えない
const UI_TINT = {
  1: { "#e0b03a": "#9cbf7c", "#dcae3c": "#9cbf7c", "rgba(220,174,60,0.35)": "rgba(156,191,124,0.35)", "#b0801a": "#48693a" },   // 世界1も、とくい・お題の枠は緑（11/7-17）。金色は救出の旅の見出しと点数・宝石だけ
  2: { "#6f9a4a": "#4a729a", "#48693a": "#3a5169", "#9cbf7c": "#7c9dbf", "#b9d39a": "#9ab6d3", "#7a8a68": "#68798a", "#4b5e3a": "#3a4c5e", "#3f5a30": "#30455a",
       "rgba(72,105,58,0.92)": "rgba(58,81,105,0.92)", "rgba(225,238,212,0.6)": "rgba(212,225,238,0.6)", "rgba(236,244,226,0.93)": "rgba(226,235,244,0.93)",
       "#e0b03a": "#7c9dbf", "#dcae3c": "#7c9dbf", "rgba(220,174,60,0.35)": "rgba(124,157,191,0.35)", "#b0801a": "#3a5169" },
  3: { "#6f9a4a": "#794a9a", "#48693a": "#553a69", "#9cbf7c": "#a37cbf", "#b9d39a": "#bb9ad3", "#7a8a68": "#7c688a", "#4b5e3a": "#4f3a5e", "#3f5a30": "#48305a",
       "rgba(72,105,58,0.92)": "rgba(85,58,105,0.92)", "rgba(225,238,212,0.6)": "rgba(227,212,238,0.6)", "rgba(236,244,226,0.93)": "rgba(236,226,244,0.93)",
       "#e0b03a": "#a37cbf", "#dcae3c": "#a37cbf", "rgba(220,174,60,0.35)": "rgba(163,124,191,0.35)", "#b0801a": "#553a69" },
};
const SKILL_IDS = ["boost", "guard", "rewind"];   // boost パワー全開（11/7-25）／guard 無敵タイム／rewind 巻き戻し（11/6-6 決定。時間止め・光のシャワーはやめた）
const LOADOUT_VARS = { skill: "" };   // 持ち物「必殺ワザ」の説明の {skill}（選んでいるワザの名前）

// ===== 世界ごとの殻・弾の色（10/31-10 試作。絵が来るまでの仮: 世界1の絵の色を変えただけ）。書いていない世界は世界1のまま
//   thornWidth・thornAlpha ＝ いばらの太さ・濃さ（[k が 0 のとき, k による増え分]）。書いていない世界は世界1のまま
//   textOver ＝ 1文字ずつの殻（いばら・霧）を描いたあと、文字をもう一度縁取りして上に描く（文字が殻にうもれないように）
const WORLD_LOOK = {
  2: { cocoon: "rgba(214,232,255,0.8)", fuzz: "#e4f0ff", mid: "#3f6a8f", boss: "#a8bcd8", bullet: { zako: "#1f5f8a", mid: "#2a3f9a", boss: "#2a2a6a", rim: "#bfe6ff" } },
  3: { cocoon: "rgba(238,226,255,0.8)", fuzz: "#f1e8ff", mid: "#8a70b0", boss: "#c4aee4", bullet: { zako: "#6a2a8a", mid: "#8a1f5a", boss: "#2a1a5a", rim: "#ffd6f6" },
       thornWidth: 1.1, thornAlpha: [0.2, 0.3], textOver: 5 },   // 10/31-12 決定: 紫のいばらを細く薄く、文字はいばらの上にもう一度縁取りして描く（textOver ＝ その縁取りの太さ px）
};

// ===== 必殺ワザのボタンの色（10/25-9）: ゲージがたまったら赤橙（画面のほかの場所に使っていない色）。たまっていないときは薄い色のまま
const BOMB_COLORS = { full: "#f2541b", fullRim: "#ffd2b8" };

// ===== 弾の色（10/25-7。ここだけ書きかえれば、敵の弾と味方の光の色が変わる） =====
// 敵の弾は単純な球。濃い色の球に、明るい桃色の細い縁取り（どの時間帯の背景でも浮いて見える）。少し脈打つ
const BULLET_COLORS = {
  zako: "#8a1f68",       // ザコの殻・虫の弾: 赤紫
  mid: "#b0142e",        // 中ボスの殻の弾: 赤
  boss: "#3f1466",       // 大ボスの殻の弾: 濃い紫
  rim: "#ffa8d6",        // 敵の弾の縁取り: 明るい桃色
  rimWidth: 2,           // 縁取りの太さ（px）
  pulse: 0.12,           // 脈打つ大きさ（半径の何割ふくらむか）
  pulseSpeed: 7,         // 脈打つ速さ
  shot: "#3f8cf0",       // 味方の光（ふわりの光）: 青（10/25-11。前は白寄りの桃色）。敵の弾の赤紫・発見の「きらっ」や助けた瞬間の金色とは別の色
  shotRim: "#ffffff",    // 味方の光の縁取り: 白
  shotHalo: "rgba(170,210,255,0.45)",   // 味方の光のまわりの、やわらかい光の輪（うすい青）
  seed: "#8fd63a",       // 光のたね（地上への攻撃。11/2 決定）: 黄緑。味方の光の青・敵の弾の赤紫・森のたねの金のどれとも離れた色
  seedRim: "#ffffff",    // 光のたねの縁取り: 白
  seedHalo: "rgba(190,240,120,0.4)",    // 光のたねのまわりの光
};

// 時間帯の色（data/stages.js の theme 欄で、ステージごとに上書きする）。ここは「真昼」の色
// image に背景の絵のパスを入れると、地面の絵のかわりにその絵を縦に流す（本番の背景用）
const DEFAULT_THEME = {
  time: "真昼", image: null,
  ground: "#dcebc4", field: "#e8dcbc", furrow: "#d8c9a2", plant: "#7fa85a", cotton: "#ffffff",
  creek: "#c4e0e4", creekLight: "rgba(255,255,255,0.7)", path: "#efe4c8", bush: "#cfe3b3",
  light: null,                                   // 地面の上にうすくかける光の色（明け方・夕暮れ・夜）
  cloudShadow: "rgba(70,90,50,0.07)", fluff: "rgba(255,255,255,0.8)",
  tree: ["#4f7a36", "#5e8c3e", "#6a9a45", "#86b45c"],   // 木の色（濃い → うすい）
  treeShadow: "rgba(50,70,35,0.25)", treeShadowScale: 1, // 木の影の色と長さ
  fillerFilter: "none",                          // 雑魚の色味（CSS の filter の書き方。使えない端末では変わらない）
  wordStroke: null,                              // 語句の縁取りの色（null なら白）
};

// 本番（出撃2）の語句の色（金色）
const GOLD_COLOR = "#c8901a";

// 自機の弾の色

// 敵の文字の色（役割ごと）
const ENEMY_COLOR = { zako: "#5f8a3c", mid: "#b2733d", boss: "#c4577a" };

// バトルの中での強さ（1945型）。語句を BATTLE.powerEvery 語吸い込むごとに1段階上がる。毎バトル最初の段階から
// 3段（10/25-9）: 1本 → 2本 → 3本（正面が太い）。前の「4方向の太い光」はやめた
// spread: 光の向き（0 ＝ 正面。数が大きいほど外へ広がる）、thick: 太い光にする向き（当たりが広く、2発分）、rate: 光の間隔の倍率（小さいほど速い）
const POWER_LEVELS = [
  { spread: [0],               thick: [],  rate: 1 },
  { spread: [-0.35, 0.35],     thick: [],  rate: 1 },
  { spread: [-0.55, 0, 0.55],  thick: [0], rate: 1 },
  { spread: [-0.85, -0.28, 0.28, 0.85], thick: [-0.28, 0.28], rate: 1, top: true },   // 4段目（11/1-4 決定）: 4本（内側の2本が太い）。上がれるのは stages.js の power4 のステージ（8・12）だけ
  { spread: [-1.0, -0.5, 0, 0.5, 1.0], thick: [-0.5, 0, 0.5], rate: 1, top: true },   // 5段目（11/7-25）: パワー全開のときだけ（4段目まで上がれるステージで、上限を1つ超える）。5本（内側の3本が太い）
];
// 画面の言葉は data/texts.js（window.TEXTS）から読む。tx("rescue.start") や tx("explore.endSome", { n: 3 }) のように使う
function tx(path, vars) {
  let v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), window.TEXTS);
  if (typeof v !== "string") return v === undefined ? path : v;
  if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return v;
}
// 本番に持っていくもの（仮の3つ）。選ばなければ最初の「つよい光」になる。名前と説明は texts.js の choice.items
const LOADOUTS = ["power", "shield", "bomb"].map(id => ({ id, get name() { return tx(`choice.items.${id}.name`); }, get desc() { return tx(`choice.items.${id}.desc`, LOADOUT_VARS); }, get kana() { return (window.TEXTS.choice.items[id] || {}).kana || ""; } }));

// 弾の本数ごとの、横のならび

// フォント: css/style.css の --font を読む（指定は CSS の1か所だけ）。読めないときの予備
let FONT_FAMILY = '"Hiragino Maru Gothic ProN","Hiragino Maru Gothic Pro","Zen Maru Gothic",sans-serif';
function loadFontFamily() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font").trim();
    if (v) FONT_FAMILY = v;
  } catch (e) { /* 予備のまま */ }
}

// 語句の本体の文字（かっこと、かっこの中の別名を除く）。例: 毛(ウール) → 毛
function baseChars(word) { return Array.from(word.word.replace(/\([^)]*\)/g, "")); }
// 1〜2文字の短い語句
function isShortWord(word) { return baseChars(word).length <= 2; }

// 難易度の線の、難易度 d のところの値（点と点のあいだはまっすぐつなぐ）
function lineAt(pts, d) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  if (d <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (d <= p[i][0]) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); }
  return p[p.length - 1][1];
}
// ステージの難易度から、そのステージの数値を決める（override 欄があればそちらを使う）
function stageParams(stage) {
  const d = Math.min(12, Math.max(1, (stage && stage.difficulty) || 1));   // 難易度＝ステージ番号（1〜12）
  const ov = (stage && stage.override) || {};
  const P = { difficulty: d };
  for (const k of Object.keys(BATTLE.difficulty)) P[k] = ov[k] !== undefined ? ov[k] : lineAt(BATTLE.difficulty[k], d);
  P.zakoHp = Math.max(1, Math.round(P.zakoHp * 10) / 10);   // 10/25-8: 0.1 きざみ（前は整数に四捨五入。ステージごとの速さの差に合わせるため）
  P.tricky = Math.max(0, Math.round(P.tricky));
  return P;
}

// patterns が "auto" のステージ: 語句の出方・順番・位置を、難易度から機械的に決める
// 意地の悪い語句は、順番の中にちらして置く。難易度が上がるほど「横切る」「端にかくれる」が多くなる
function autoLayout(words, P, obstacles, groundOn, groundN) {
  const lanes = [0.3, 0.65, 0.5, 0.25, 0.7, 0.4, 0.6, 0.35, 0.55];
  const list = words.filter(w => w.role !== "boss").sort((a, b) => (a.order || 0) - (b.order || 0));
  const n = Math.min(P.tricky, list.length - 1);
  const kinds = P.difficulty >= 9 ? ["cross", "edge", "cross", "edge", "behind"]
    : P.difficulty >= 5 ? ["edge", "behind", "cross"] : ["edge", "behind"];
  const trickyIdx = new Set();
  for (let k = 0; k < n; k++) trickyIdx.add(Math.min(list.length - 1, 1 + Math.floor(k * (list.length - 1) / Math.max(1, n))));
  const layout = {};
  let kindNo = 0, groundLeft = groundOn === false ? 0 : (groundN || BATTLE.autoGroundCount);   // 地上のない世界では0。groundN ＝ stages.js の groundCount（ステージ12 3。11/2-3）
  list.forEach((w, i) => {
    let pattern = "normal", lane = lanes[i % lanes.length];
    if (trickyIdx.has(i)) {
      pattern = kinds[kindNo % kinds.length];
      if (isShortWord(w) && (pattern === "edge" || pattern === "cross")) pattern = "behind";   // 短い語句は端・横切りにしない
      if (pattern === "cross") lane = kindNo % 2 ? 0 : 1;
      if (pattern === "edge") lane = 1;   // 端にかくれる語句は右端だけ
      kindNo++;
    } else if (w.role === "zako" && groundLeft > 0 && i % 3 === 2) {
      pattern = "ground"; groundLeft--;
    }
    layout[w.id] = { order: i + 1, pattern, lane };
  });
  // 「木のかげ」: 意地の悪い語句のうち、長い語句から shade 個を木のかげにする
  let shadeLeft = (obstacles && obstacles.shade) || 0;
  for (const i of [...trickyIdx].sort((a, b) => baseChars(list[b]).length - baseChars(list[a]).length)) {
    if (shadeLeft <= 0) break;
    const w = list[i];
    if (w.role === "zako" || w.role === "mid") { layout[w.id].pattern = "treeshade"; shadeLeft--; }
  }
  // 地上の語句が足りなければ、うしろのほうの「ふつう」のザコから足す
  for (let i = list.length - 1; i >= 0 && groundLeft > 0; i--) {
    const w = list[i];
    if (w.role === "zako" && layout[w.id].pattern === "normal") { layout[w.id].pattern = "ground"; groundLeft--; }
  }
  return layout;
}

const Battle = (() => {
  let canvas, ctx, dpr = 1, W = 0, H = 0;
  let running = false, rafId = 0, lastTs = 0;
  let opts = null;

  // ゲームの状態
  let t = 0;                 // 経過時間（秒）
  let state = "play";        // "sortie"（出撃の画面）/ "play" / "down" / "clear"
  let stateTimer = 0;
  let player, shots, enemies, ebullets, threads, fluff;
  let fillers, bombs, pops, items, terrain, cloudShadows;
  let blasts = [], orbAng = 0, orbFlash = [0, 0], orbHinted = false;   // 爆発の輪、光の玉の角度（11/6-3）
  let script, absorbed, missed, bossWord, groundIds;
  let P = null;              // このステージの難易度から決まった数値
  let worldDef = {}, groundOn = true;
  const tint = c => (UI_TINT[worldDef.id] || {})[c] || c;   // 世界1の色 → 今の世界の色（11/7-16）   // 今の世界（stages.js の WORLDS）。groundOn: 地上の仕組みがあるか
  let layout = null;         // 自動で決めた出方（patterns が "auto" のステージ）
  const patOf = w => (layout && layout[w.id]) || { order: w.order || 0, pattern: w.pattern || "normal", lane: w.lane === undefined ? 0.5 : w.lane };
  let phase;                 // "round1" / "round2" / "boss"
  let nextIdx, nextAt;       // 台本: 次に出す語句の番号と、出す時刻（その周の中の時間）
  let roundT;                // 今の周の中の経過時間（秒）
  let gapT;                  // 周と周のあいだの残り時間（秒）
  let vanish;                // 1周目に倒した語句が、光って消えていく演出
  let shotTimer, fillerTimer, bombTimer;
  let showWord = null;       // 画面中央に出している語句
  let drag = null;
  let paused = false;        // アプリが裏に回ったときなど
  let moved = false;         // 一度でもドラッグしたか（操作のヒント用）
  let rearHinted = false;    // うしろから来る敵の案内を出したか（世界3。10/31-10 試作）
  let groundHinted = false;  // 地上の敵のヒントを出したか
  let groundHeld = false;    // 最初の地上のことばを止めたか（BATTLE.groundHold）
  let groundIntroShown = false;   // 「隠れる」「動く」の1行を出したか（10/31-13）
  let banner = null;         // 「大ボス あらわる！」などの帯
  let shake = 0;             // 画面のゆれ（被弾したとき）
  let level = POWER_LEVELS[0];
  const topLevel = () => opts.stage && opts.stage.power4 ? 3 : 2;   // 上がれる段のいちばん上（0 から数える。4段目は power4 のステージだけ。11/1-4）
  // いまのパワーの段（0 から）。パワー全開のあいだは1段上（上限を1つ超えてよい。11/7-25）。noBoost ＝ パワー全開を入れない段
  const levelIdx = noBoost => Math.min(Math.floor(absorbed.length / BATTLE.powerEvery) + powerBonus, topLevel()) + (!noBoost && boostT > 0 ? 1 : 0);
  let score = 0, combo = 0, maxCombo = 0;
  let floats = [];           // 点数が浮かぶ表示
  let shards = [];           // 地上の雑魚が割れたかけら（11/7-23）
  let hits = 0, downs = 0;   // 被弾した回数、失った機体の数
  let lives = 3;             // 残機
  let gameOvers = 0;         // 3機すべて失って、本番をやり直した回数
  let scoreAtMain = 0;       // 本番が始まったときの点数（やり直しでここに戻す）
  let retryMain = false;     // 本番のやり直しの画面か
  let lastPX = 0, lastPY = 0;   // いちばん最近の指の位置
  let lock = null;           // 自機の真上の列にいる地上の敵（いなければ null。10/31-12）
  let slow = 0;              // ゆっくりの残り時間（秒）
  let gauge = 0;             // 必殺ワザのゲージ（0〜100）
  let fsay = null;           // ふわりの一言（吹き出し）
  // 画面の一言・案内・問題文の順番待ち（10/7-1）。同時に出すのは1つだけ。消えてから次を出す
  let msgQ = [], msgGap = 0, msgWasBusy = false;
  let odai = null;           // いまのお題バトル（なければ null）
  let sortieNo = 1;          // 出撃の画面に出している番号（1＝探検、2＝本番）
  let reacted = 0;           // 探検で見つけた（反応させた）語句の数
  let slots = [];            // 帯の10のあき枠に入る語句（順番）
  let obsDef = null;         // このステージの障害物の決まり（data/stages.js の obstacles）
  let obs = [];              // 画面に出ている障害物 { kind, x, y, r }
  let obsNext = 0;           // 次に出す障害物の番号（at で時刻を決めたものの中で）
  let rest = null;           // 木の前後の休み（10/7-1）{ it, step: "wait"/"pre"/"guide"/"post", t }。休みのあいだは語句・お題・雑魚を出さない
  let restDone = new Set();  // 休みが終わった障害物
  let guide = null;          // 木のよけ方の案内（矢印）
  let theme = DEFAULT_THEME; // このステージの時間帯の色
  let weatherDef = null;     // このステージの天気（data/stages.js の weather）
  let fogLevel = 0, fogTopNow = BATTLE.fogTop;          // 霧の濃さ（0〜1。お題バトルと大ボスのときはうすくなる）
  let streaks = [];          // 風・雨・雪の見た目
  let found = new Set();     // 探検で見つけた語句の id
  let foundAt = {};          // 見つけた時刻（id → t。左の枠の名前をきらっと光らせる。10/25-17）
  let loadout = null;        // 本番に持っていくもの（LOADOUTS の id）
  let choiceT = 0;           // 選ぶ時間の残り（秒）
  let choiceFree = false;    // 持ち物選択に時間制限がないか（初めて選ぶとき。main.js の opts.firstChoice）
  let sortieStep = "choice"; // 出撃2の画面の段階: "say" ふわりの一言（10/25-5。タップで次へ）→ "choice" 持っていく物を選ぶ → "door" 扉（タップ待ち。11/7-19）
  let door = null;           // 扉（11/7-19。js/door.js）の時間 { t, go, popped, goX, goY }。表紙とカウント「3・2・1」は、この扉にかえた
  let doorFade = 0;          // 扉から場面に入ったあとの白い光の残り（秒）
  let freed = [];            // 殻から助けられて、ふわりのところへ飛んでいく語句
  let les = null;            // 出ているチュートリアル（11/7-20）{ id, text, step: say（説明・止まる）| do（やってみる）| ok（OK！）, t, done }
  let tut = null;            // 出ているチュートリアルの案内（出ているあいだはゲームが止まる）{ id, t, rest(紙芝居のつづき) }
  let hintOpts = null, hintShown = {};   // 案内: main.js から { seen, mark, all }（ステージ1だけ。all ＝ おさらいで全部出す）と、このバトルで出したもの
  let hintCard = null;       // 出している案内 { text, t }
  let bombHinted = false, bombFlash = 0;   // 必殺ワザの案内を出したか、ゲージがたまったときに左下を光らせる残り秒
  let explore = null;        // 1回目の旅（双眼鏡）の状態 { t, next, list, bugs, bugT, endT }
  let bino = null;           // 双眼鏡の中心 { x, y }
  let exMove = EXPLORE_MOVES.drift;   // 発見の旅の、ことばの動きの型（10/25-7。stages.js の explore 欄）
  let maskCv = null;         // 双眼鏡の外を暗くするための裏の画面
  let stripFlash = 0;        // 出撃の瞬間に帯の灰色の名前がいっせいに光る（残り秒）
  let powerBonus = 0;        // 「つよい弾」で上がる強さの段階
  let shield = 0;            // 「盾」の残り（1回だけ防ぐ）
  let gaugeMul = 1;          // 「必殺ワザ」のゲージ倍率
  let bounces = [];          // ダミーではね返った弾
  let bombsUsed = 0;
  let typhoon = null;        // パワー全開を使った瞬間の演出（白いうずと大きなふわり。11/7-25）
  let extraUsed = false;     // 延長戦をしたか（1回だけ。10/25-19）
  let extraRound = false;    // いまラストチャンスか
  let lastT = 0;             // ラストチャンスの残り秒（0 ＝ ラストチャンスではない）
  let lcWords = [], lcQueue = [], lcClock = 0;   // ラストチャンスに出すことばと、出す順番待ち、始まってからの秒
  let againFx = null;        // 大ボス2段階目の「まだだ！ もう一度！」（11/1-4）{ age }
  let wrongFx = null;        // お題で「ちがうよ」を大きく出している（10/25-16）{ age }
  let powerFx = null;        // 「パワーアップ！」の大きな文字（10/25-9）{ age }
  let wave = null;           // 吸い込んだときに広がる光
  // 世界2・3の試作（10/31-10）
  let stopT = 0, guardT = 0, boostT = 0;   // 時間止め（いまは使わない。0のまま）・無敵タイム・パワー全開の残り秒
  let rewindSaid = false, rewindHintWait = false, guardSayWait = false;   // そのステージで「巻き戻し」の一言を出したか・出すのを待っているか（11/7-9）
  let rewindUsed = false, rewindFx = null, baseScript = [], killN = 0;   // 巻き戻しを使ったか（1ステージ1回）、その演出、救出の旅の最初の台本
  let skillUse = { boost: 0, guard: 0, rewind: 0, fullAcc: 0, fullBoss: 0, firstAcc: -1 };   // 必殺ワザを使った回数と、ゲージが満タンになった回数（ためて／中ボス・大ボスで）、ためて初めて満タンになった救出の旅の時計（調べる用）
  let meteorT = 0;   // 流星雨の次の1つまで（世界3。10/31-10 試作）
  let bgOff = 0, bgGo = false;   // 救出の旅の背景の絵の流れた量と、流しはじめたか（1語目が出てから。11/1-2 決定）
  let evPlans = {};   // 出来事「ねじ」「星がはじける」の段取り（11/1-2）
  let events = [], rescueT = 0, evShown = {};   // このステージの出来事（stages.js の event）、救出の旅の経過秒、出来事の帯を出したか
  let press = null;          // 世界2の箱の発見の旅: 指が押さえている場所 { x, y }

  function font(size) { return `bold ${size}px ${FONT_FAMILY}`; }
  const hasKanji = s => /[一-龯々]/.test(s);
  const scrollSpeed = () => H / BATTLE.scrollTime;
  const rand = (a, b) => a + Math.random() * (b - a);

  // 画面の大きさに合わせる
  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (player) {
      player.x = Math.min(Math.max(player.x, 24), W - 24);
      player.y = Math.min(Math.max(player.y, minPlayerY()), H - 40);
    }
  }
  // 照準が画面の中に入るように、自機は上に行きすぎない
  function minPlayerY() { return Math.min(H - 60, BATTLE.bombRange + 60); }

  // 左端の縦の帯の右はし
  const stripRight = () => 6 + BATTLE.stripWidth;

  // 必殺ワザのボタン（画面左下）
  function skillButtons() {   // 左下に横にならべた3つ（パワー全開・無敵タイム・巻き戻し。11/6-6）
    const r = BATTLE.bombButtonR, y = H - 18 - r, step = 2 * r + BATTLE.skillButtonGap;
    return SKILL_IDS.map((id, i) => ({ id, x: 14 + r + i * step, y, r }));
  }
  function bombButton() { return skillButtons()[0]; }
  const skillOk = id => gauge >= 100 && state === "play" && !(id === "rewind" && (rewindUsed || lastT > 0));   // ラストチャンスでは巻き戻しは使えない

  // ===== 操作: 指一本のドラッグ（指の動いたぶんだけ自機が動く） =====
  function onDown(e) {
    e.preventDefault();
    if (paused) { resume(); return; }
    if (tut) { if (tut.t >= BATTLE.tutCloseAfter) closeTut(); return; }
    if (les && les.step === "say") { if (les.t >= BATTLE.lesson.tapAfter) { les.step = "do"; les.t = 0; Sound.se("item"); } return; }   // 説明をタップ → やってみる
    if (les && les.step === "ok") return;
    if (!player) return;
    if (state === "sortie") {   // 旅の画面: 選ぶ（救出の旅だけ）→ 表紙をタップ → カウント
        if (sortieNo === 2 && sortieStep === "say") { sortieStep = "choice"; Sound.se("item"); return; }   // ふわりの一言 → 持ち物選択
        if (sortieNo === 2 && sortieStep === "choice") {
          const rect = canvas.getBoundingClientRect();
          const px = e.clientX - rect.left, py = e.clientY - rect.top;
          const c = choiceRects().find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
          if (!c) return;   // 選ぶまで出撃しない（10秒で「つよい弾」）
          chooseLoadout(c.id);
          openDoor();   // 選んだら扉へ
        } else if (sortieStep === "door" && door) {
          const rect = canvas.getBoundingClientRect();
          if (!Door.tap(door, e.clientX - rect.left, e.clientY - rect.top)) return;   // 押したら光が広がって出発（文字が出る前のタップは受けない）
          const ex = sortieNo === 1;   // 発見の旅は双眼鏡、救出の旅は自機
          drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: ex ? bino.x : player.x, py: ex ? bino.y : player.y };   // 指をつけたままなら、出発してすぐ動かせる
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
        return;
    }
    // 左下の3つのボタンをタップ: ゲージが満タンなら、その必殺ワザ（1回目の旅にはボタンがない）
    const rect = canvas.getBoundingClientRect();
    const sb = phase === "round1" ? null : skillButtons().find(q => Math.hypot(e.clientX - rect.left - q.x, e.clientY - rect.top - q.y) < q.r + 4);
    if (sb) { if (les && les.id === "boost" && sb.id !== "boost") return; if (skillOk(sb.id)) useSkill(sb.id); return; }   // パワー全開のチュートリアルのあいだは、パワー全開のボタンだけ
    const exploring = phase === "round1";   // 1回目の旅は、指で双眼鏡を動かす
    if (exploring && exMove.box) { const r0 = canvas.getBoundingClientRect(); press = { x: e.clientX - r0.left, y: e.clientY - r0.top, id: e.pointerId }; }   // 世界2の箱: 指で直接押さえる
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: exploring ? bino.x : player.x, py: exploring ? bino.y : player.y };
    lastPX = e.clientX; lastPY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    if (state === "sortie") { drag.sx = e.clientX; drag.sy = e.clientY; return; }   // カウントのあいだは動かさない
    moved = true;
    lastPX = e.clientX; lastPY = e.clientY;
    if (phase === "round1" && exMove.box) {   // 世界2の箱: 押さえている場所が指といっしょに動く
      const r0 = canvas.getBoundingClientRect(); press = { x: e.clientX - r0.left, y: e.clientY - r0.top, id: e.pointerId };
      return;
    }
    if (phase === "round1") {   // 1回目の旅: 双眼鏡を動かす（円が少し画面の外に出てもよい）
      bino.x = Math.min(Math.max(drag.px + (e.clientX - drag.sx) * BATTLE.binoMove, stripRight() + 10), W - 10);
      bino.y = Math.min(Math.max(drag.py + (e.clientY - drag.sy) * BATTLE.binoMove, 70), H - 90);
      return;
    }
    if (player.rising > 0) return;   // 復活して上がってくる間は動かせない
    player.x = Math.min(Math.max(drag.px + (e.clientX - drag.sx) * 1.15, 24), W - 24);
    player.y = Math.min(Math.max(drag.py + (e.clientY - drag.sy) * 1.15, minPlayerY()), H - 40);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; if (press && press.id === e.pointerId) press = null; }

  // ===== 始める =====
  // words: このステージの10語、o: { stageName, fuwariCount, onEnd(吸い込んだ順のid配列, 記録) }
  function start(words, o) {
    opts = Object.assign({}, o, { words, total: words.length });
    loadFontFamily();
    canvas = document.getElementById("battle-canvas");
    ctx = canvas.getContext("2d");
    resize();
    if (!canvas._bound) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      window.addEventListener("resize", resize);
      canvas._bound = true;
    }
    t = 0;
    absorbed = []; missed = [];
    bossWord = words.find(w => w.role === "boss") || words[words.length - 1];
    // 地上に出る語句は、データの出方（pattern）が "ground" のもの
    applyStageBattle(opts.stage);   // ステージごとの BATTLE の上書き（stages.js の override.battle。10/7-1）
    P = stageParams(opts.stage);
    worldDef = ((window.WORLDS || []).find(w => opts.stage && w.id === opts.stage.world)) || {};
    groundOn = worldDef.ground !== false;   // 地上の敵・地上の語句・照準◎（世界2から。10/21-1）
    layout = opts.stage && opts.stage.patterns === "auto" ? autoLayout(words, P, opts.stage.obstacles, groundOn, opts.stage.groundCount) : null;
    obsDef = (opts.stage && opts.stage.obstacles) || null;
    theme = Object.assign({}, DEFAULT_THEME, (opts.stage && opts.stage.theme) || {});
    bugSprites = typeof document.createElement === "function" ? {} : null;   // 虫は、色を変えた絵を前もって作って使い回す（10/31-14 に世界2・3、11/3-8 に世界1も）
    weatherDef = (opts.stage && opts.stage.weather) || null;
    fogLevel = 0; fogTopNow = BATTLE.fogTop;
    streaks = Array.from({ length: 22 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.8 }));
    groundIds = new Set(groundOn ? words.filter(w => patOf(w).pattern === "ground" && w !== bossWord).map(w => w.id) : []);
    // 台本: 大ボス以外の語句を、データの順番（order）でならべる
    script = words.filter(w => w !== bossWord).sort((a, b) => patOf(a).order - patOf(b).order);
    slots = script.concat([bossWord]);   // 帯の10のあき枠（出てくる順。いちばん右が大ボス）
    found = new Set(); foundAt = {};
    vanish = [];
    fluff = Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40, p: Math.random() * 6 }));
    cloudShadows = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: (i / 3) * H, rx: rand(70, 120), ry: rand(35, 55) }));
    terrain = [];
    fillTerrain();
    shots = []; enemies = []; ebullets = []; fillers = []; bombs = []; blasts = []; items = []; obs = []; guide = null;
    startPhase("round1");
    fillerTimer = 1.2; shotTimer = 0; bombTimer = 0;
    player = { x: W / 2, y: H * 0.8, hp: BATTLE.playerMaxHp, inv: 0, glow: 0, hurt: 0 };
    level = POWER_LEVELS[basePower()];
    score = 0; combo = 0; maxCombo = 0; floats = [];
    hits = 0; downs = 0; lives = BATTLE.lives; gameOvers = 0; scoreAtMain = 0; retryMain = false;
    paused = false; moved = false; groundHinted = false; groundHeld = false; groundIntroShown = false; rearHinted = false; orbHinted = false; orbFlash = [0, 0]; banner = null; shake = 0; showWord = null; threads = []; pops = []; shards = [];
    slow = 0; wave = null; gauge = 0; bombsUsed = 0; fsay = null; odai = null; bounces = []; odaiLater = [];
    fpsT0 = 0; fpsN = 0; fpsNow = 0; fpsMin = 0;
    msgQ = []; msgGap = 0; msgWasBusy = false;
    choiceFree = !!opts.firstChoice;
    tut = null; les = null; hintOpts = opts.hints || null; hintShown = {}; hintCard = null; bombHinted = false; bombFlash = 0; powerFx = null; wrongFx = null; againFx = null; extraUsed = false; extraRound = false; lastT = 0; lcQueue = []; lcWords = [];
    stripFlash = 0; sortieStep = "choice"; freed = [];
    explore = { t: 0, next: 0, nextAt: BATTLE.exploreFirst, again: [], list: [], bugs: [], bugT: 2, endT: 0, flies: [], streaks: [] };
    {
      const se = (opts.stage && opts.stage.explore) || {}, type = EXPLORE_MOVES[se.move] ? se.move : "drift";
      exMove = Object.assign({ move: type }, EXPLORE_MOVES[type], se);
    }
    bino = { x: W / 2 + 10, y: H * 0.42 };
    state = "sortie"; sortieNo = 1; reacted = 0; openDoor();   // 発見の旅の扉から始める（11/7-19）
    loadout = null; powerBonus = basePower(); shield = 0; gaugeMul = 1;
    stopT = 0; guardT = 0; boostT = 0; rewindUsed = false; rewindSaid = false; rewindHintWait = false; guardSayWait = false; rewindFx = null; skillUse = { boost: 0, guard: 0, rewind: 0, fullAcc: 0, fullBoss: 0, firstAcc: -1 }; baseScript = script; rescueT = 0; evShown = {}; evPlans = {}; bgOff = 0; bgGo = false; press = null;
    events = (opts.stage && opts.stage.event) ? [].concat(opts.stage.event) : [];
    // 救出の旅をもう一度（10/25-14。結果画面のボタン）: 発見の旅をとばして、持ち物選択から。発見で見つけたことばの記録（opts.foundIds）は残す
    if (opts.foundIds) {
      found = new Set(opts.foundIds); reacted = found.size;
      nextIdx = script.length;   // 発見の旅のことばは出さない
      sortieNo = 2; sortieStep = "choice";
    }
    running = true;
    lastTs = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  // 周を始める
  // 障害物を出す（この出撃で出すステージだけ）
  // 天気が今の出撃で出ているか
  const weatherOn = kind => !!weatherDef && weatherDef.kind === kind && (weatherDef.sortie === 1 ? phase === "round1" : phase !== "round1");   // sortie 2 ＝ 本番と大ボス
  // 風（11/1-3）: 天気の風か、出来事「風」のあいだ。出来事「風が逆」のあいだは向きが逆
  const windOn = () => weatherOn("wind") || evActive("wind");
  const windDirNow = () => BATTLE.windDir * (evActive("windRev") ? -1 : 1);
  const obsActive = () => obsDef && phase === (obsDef.sortie === 1 ? "round1" : "round2");
  function addObstacle(x, r, kind) { const o = { kind: kind || (obsDef ? obsDef.kind : "tree"), x, y: -r, r }; obs.push(o); return o; }
  function spawnObstacle(it) {
    if (it.gate !== undefined) {   // 木と木のあいだを通る場所: すきまの左右に1本ずつ
      const gx = W * it.gate, half = W * (it.gap || 0.35) / 2;
      const rl = Math.max(30, (gx - half) / 2), rr = Math.max(30, (W - gx - half) / 2);
      const a = addObstacle(gx - half - rl, rl + 6);
      addObstacle(gx + half + rr, rr + 6);
      if (it.guide) startGuide({ kind: "gate", gx, tree: a });
    } else {
      const o = addObstacle(W * (it.x || 0.5), it.r || 50);
      if (it.guide) {
        // よける向き: 木から遠いほう（画面のはしに寄りすぎるなら反対）
        let dir = o.x >= player.x ? -1 : 1;
        if (player.x + dir * 90 < 40 || player.x + dir * 90 > W - 40) dir = -dir;
        startGuide({ kind: "dodge", dir, tree: o });
      }
    }
  }
  // ===== チュートリアル =====
  // 案内（10/21-2）: 初めてそれが起きた瞬間に1回だけ。見た記録は版ごと（main.js）。おさらい（all）のときは記録に関係なく全部出す
  function hint(id, vars) {
    if (!hintOpts || hintShown[id] || !opts.stage || opts.stage.id !== 1) return;   // 小さな案内はステージ1だけ（11/7-20 からステージ5・9にも hints が来るため）
    if (!hintOpts.all && hintOpts.seen && hintOpts.seen[id]) return;
    hintShown[id] = true;
    if (hintOpts.mark) hintOpts.mark(id);
    const text = tx("hints." + id, Object.assign({ seed: seedName() }, vars || {}));
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime, yellow: id === "seed" }; slow = Math.max(slow, BATTLE.hintSlow); });   // たねの案内は黄色い帯（たねが黄色いとわかるように。10/25-17）
  }
  // ===== チュートリアル（11/7-20）=====
  // ステージ1・5・9で、初めてのときだけ。止まる → ふわりの吹き出しで説明（2行以内）→ タップ → 1回やってみる（ほかは止まったまま）→ できたら「OK！」→ 再開
  // 見た記録は hints の mark（main.js。版ごと）。「OK！」まで行ったら見たことにする。おさらい（all）のときは全部出す
  let rescueLesWait = false;   // 救出の旅の始まりのチュートリアルを、扉の光が消えるのを待って出す（11/7-28）
  const LES_TOP = 48;   // 上の帯（元気・点数）の下。チュートリアルの吹き出しと、やる相手はこれより下（11/7-28）
  const LESSON_STAGE = { binoMove: 1, rescueStart: 1, shell: 1, bug: 1, seed: 1, odai: 1, choice: 1, boost: 1, s2guard: 2, s5box: 5, s5ground: 5, s5boss: 5, s9spin: 9, s9rear: 9 };   // 11/7-24: s5mid（中ボスの前）は s5boss（大ボスの前）に。s9mid はやめた
  function lessonOn(id) {
    if (!hintOpts || hintShown[id] || !opts.stage || LESSON_STAGE[id] !== opts.stage.id) return false;
    return !!(hintOpts.all || !(hintOpts.seen && hintOpts.seen[id]));
  }
  //   11/7-26: とくいの選択（choice。出撃前の画面）・ゲージが初めて満タン（boost。パワー全開を押す）をステージ1に。ステージ2は無敵タイムの一言だけ（s2guard。止めない）
  function lesson(id, o) {
    if (les || (state !== "play" && !(id === "choice" && state === "sortie")) || !lessonOn(id)) return false;
    hintShown[id] = true;
    const key = (window.TEXTS.lessons && window.TEXTS.lessons[id]) ? "lessons." + id : "hints." + id;
    les = Object.assign({ id, text: tx(key, { seed: seedName() }), step: "say", t: 0, dist: 0, lx: player ? player.x : 0, ly: player ? player.y : 0, done: () => true }, o || {});
    drag = null; press = null; hintCard = null; guide = null; clearMsgs(5);
    if (phase !== "round1") { ebullets.forEach(b => addPop(b.x, b.y, "#fff8d8", 0.4)); ebullets = []; odaiLater = []; shots = []; }   // 飛んでいる弾は消す。ふわりの光も消す（止まった光が、やる相手にかぶらないように。11/7-28）
    Sound.se("odai");
    return true;
  }
  function lessonStep(realDt) {
    const L = les;
    L.t += realDt;
    if (L.step === "ok") { if (L.t >= BATTLE.lesson.okTime) endLesson(); return; }
    if (L.step !== "do") return;
    if (player) { L.dist += Math.hypot(player.x - L.lx, player.y - L.ly); L.lx = player.x; L.ly = player.y; }
    if (L.done(L)) { L.step = "ok"; L.t = 0; if (hintOpts && hintOpts.mark) hintOpts.mark(L.id); Sound.se("correct"); }
  }
  function endLesson() {
    les = null;
    lastTs = performance.now();
    msgQ.forEach(m => (m.at = performance.now()));
  }
  // 必殺ワザのゲージがたまった（10/25-1）: 初めての1回だけ、1秒ゆっくりにして案内。以後はたまるたびに左下が光って音が鳴る
  function bombReady() {
    bombFlash = 1.2;
    Sound.se("item");
    if (lessonOn("s2guard")) { hintShown.s2guard = true; if (hintOpts.mark) hintOpts.mark("s2guard"); guardSayWait = true; }   // ステージ2の初回: 止めずに無敵タイムの一言（11/7-26）
    if (lessonOn("boost")) { bombHinted = true; if (opts.onBombHint) opts.onBombHint(); return; }   // ステージ1の初回は、案内のかわりにパワー全開のチュートリアル（11/7-26）
    if (opts.bombHintSeen || bombHinted) return;
    bombHinted = true;
    if (opts.onBombHint) opts.onBombHint();
    const text = tx("bombReady");
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime }; slow = Math.max(slow, BATTLE.hintSlow); });
  }
  const seedName = () => tx(`byWorld.${worldDef.id || 1}.seed`);
  // 世界2・3の新しい仕組み（地上など）は、その世界の最初のステージでだけ案内を出す（難しさは下げない。10/21-2）
  function newInWorld(kind, held) {
    const ids = (window.STAGES || []).filter(s => s.world === worldDef.id).map(s => s.id);
    if (!opts.stage || opts.stage.id !== Math.min(...ids)) return;
    if (kind === "ground" && (!BATTLE.groundHold || held)) groundHint();   // 止まって待つ地上のことばがあるステージ（5）は、そのことばが出たときに案内する（地上の虫では出さない）
    if (kind === "rear" && !rearHinted) { rearHinted = true; post("banner", () => { banner = { text: tx("newInWorld.rear"), t: 2.4, color: "rgba(110,80,170,0.9)" }; }); }
  }
  const wrapTextFont = (text, size, w) => { ctx.font = font(size); return wrapText(text, w); };
  function closeTut() {
    if (tut.rest && tut.rest.length) { tut = { text: tut.rest.shift(), t: 0, rest: tut.rest }; return; }
    tut = null;
    lastTs = performance.now();
    msgQ.forEach(m => (m.at = performance.now()));   // 案内のあいだに待っていた一言は、ここから数えなおす
  }
  // 一時停止メニューの「説明をもう一度」: 説明を紙芝居のように順に見せる（どのステージでも）
  function tutorialSlides() {
    if (!running) return;
    paused = false;
    const all = Object.keys(window.TEXTS.hints).map(k => tx("hints." + k, { seed: seedName() }));
    tut = { text: all.shift(), t: 0, rest: all };
    drag = null;
  }

  // ===== メッセージの順番待ち =====
  // 大事な順: お題 6 ＞ 木の案内 5 ＞ チュートリアル 4 ＞ 助けたことば 3 ＞ 帯の文字 2 ＞ ふわりの一言 1（小さな一言 0）
  // 大事なものが来たら、出ているほうを消してすぐ出す（重ねない）。同じか下のものは、出ているものが消えてから出す
  // お題のあいだは、ほかのメッセージは出さない。小さな一言（ありがと！など）は、何か出ていれば出さない
  const MSG_PRI = { say0: 0, say: 1, banner: 2, word: 3, tutorial: 4, guide: 5, odai: 6 };
  function msgBusy() {
    if (odai) return 6;
    if (tut || les) return 4;
    if (hintCard) return 4;
    if (guide) return 5;
    if (showWord) return 3;
    if (banner) return 2;
    if (fsay) return fsay.small ? 0 : 1;
    return -1;
  }
  function clearMsgs(below) {   // below より下のものを消す
    if (below > 1 && fsay) fsay = null;
    if (below > 2) banner = null;
    if (below > 3) showWord = null;
    if (below > 5) guide = null;
  }
  function post(kind, apply) {
    const pri = MSG_PRI[kind];
    if (odai && kind !== "odai") return;
    const cur = msgBusy();
    if (cur < 0 && msgGap <= 0 && !msgQ.length) { apply(); return; }
    if (pri > cur && cur >= 0) { clearMsgs(pri); apply(); return; }
    if (kind === "say0") return;
    msgQ.push({ kind, pri, apply, at: performance.now() });
  }
  function updateMsgs(realDt) {
    const busy = msgBusy() >= 0;
    if (msgWasBusy && !busy) msgGap = 0.2;   // 消えてから次まで、少しあける
    msgWasBusy = busy;
    if (busy) return;
    msgGap -= realDt;
    if (msgGap > 0 || !msgQ.length) return;
    const now = performance.now();
    msgQ = msgQ.filter(m => !(m.kind === "say" && now - m.at > 2000));   // 待ちすぎた一言は捨てる
    if (!msgQ.length) return;
    let bi = 0;
    msgQ.forEach((m, i) => { if (m.pri > msgQ[bi].pri) bi = i; });
    const m = msgQ.splice(bi, 1)[0];
    m.apply();
    msgWasBusy = msgBusy() >= 0;
  }

  function updateRest(dt) {
    const r = rest;
    if (r.step === "wait") {   // 画面の語句がみんな助けられるか、出ていくのを待つ
      if (!enemies.some(e => e.role !== "boss") && !showWord && !freed.length) { r.step = "pre"; r.t = BATTLE.restGap; }
    } else if (r.step === "pre") {
      r.t -= dt;
      if (r.t <= 0) { spawnObstacle(r.it); r.step = "guide"; }
    } else if (r.step === "guide") {
      if (!guide) { r.step = "post"; r.t = BATTLE.restGap; }
    } else if (r.step === "post") {
      r.t -= dt;
      if (r.t <= 0) { restDone.add(r.it); rest = null; nextAt = Math.max(nextAt, roundT); }
    }
  }

  // 木のよけ方の案内: 1秒スローにして、ふわりが一言、矢印で示す
  function startGuide(g) {
    clearMsgs(5);
    guide = Object.assign(g, { t: BATTLE.guideTime, text: tx((obsDef && obsDef.kind === "pillar" ? "rescue.pillar" : "rescue.tree") + (g.kind === "gate" ? "Gate" : "Dodge")) });   // 文字は画面の中ほど、矢印は木の横（10/25-1）
    slow = Math.max(slow, BATTLE.guideSlow);
    Sound.se("odai");
  }

  function startPhase(p) {
    obsNext = 0; rest = null; restDone = new Set();
    phase = p;
    nextIdx = 0;
    roundT = 0;
    gapT = 0;
    nextAt = p === "round1" ? BATTLE.firstSpawnDelay : 0.8;
    if (p === "round2") killN = 0;   // 救出の旅で倒した虫の数（ゲージのたまり方。11/6-6）
    if (p !== "round1") music("rescue");   // 救出の旅の曲へ（発見の旅は静かめの曲）
    if (p === "round2" && worldDef.id === 3 && !orbHinted) {   // 世界3の最初のステージ（9）の救出の旅の最初: ふわりの一言で回る玉を教える（ステージ5の地上の案内と同じ形。11/6-6）
      const ids = (window.STAGES || []).filter(s => s.world === 3).map(s => s.id);
      if (opts.stage && opts.stage.id === Math.min(...ids)) { orbHinted = true; rearHinted = true; if (lessonOn("s9rear")) spawnFiller("ghost", W * 0.84, H + 30, { bx: 0, rear: true, les: true }); }   // 11/7-20: 初めてのときだけ、練習の虫を1匹（チュートリアル）。2回目からは何も出さない
    }
  }
  // カウントの今の段階（0〜2 ＝「3」「2」「1」、3 ＝「出撃！」）
  const holdOn = () => enemies.some(e => e.hold && e.hp > 0) || fillers.some(f => f.les && f.hp > 0);   // ステージ9の練習の虫がいるあいだも（11/7-20）   // 1語目を待っているあいだ（弾も虫も出さない。台本も進めない）
  // 扉を出す（11/7-19）: 発見の旅・救出の旅の前。救出の旅の曲は扉の時点から鳴らす（発見の旅の曲は、ステージに入ったときから鳴っている）
  function openDoor() {
    sortieStep = "door"; door = { t: 0, go: null, popped: false };
    if (sortieNo === 2) music("rescue");
  }
  const roundInterval = () => phase === "round1" ? BATTLE.roundInterval1 : BATTLE.roundInterval2 * ((opts.stage && opts.stage.rescueLen) || 1);   // rescueLen ＝ 救出の旅の長さの倍率（11/1-3 決定: 3つ目 1.25、4つ目 1.5。ことばの出る間隔を広げる）
  // 坂: 今の出撃の弾の量の倍率（大きいほど撃つ間隔が短い）
  const fireRamp = () => Math.max(0.1, (BATTLE.ramp[phase] || BATTLE.ramp.round2).fire);
  // ===== 世界2・3の試作（10/31-10） =====
  const skillName = id => tx(`skills.${id}.name`);
  const basePower = () => (worldDef.id >= 3 ? BATTLE.powerStartW3 : worldDef.id >= 2 ? BATTLE.powerStartW23 : 0);   // パワーの初期値の段（10/31-13 決定: 世界2・3は1段上の2本から。パワーUPでさらに1段）
  const maxHp = () => BATTLE.playerMaxHp * (loadout === "shield" ? BATTLE.guardHpMul : 1);   // 元気の上限（守りアップで1.5倍。11/6-6）
  const lesDo = () => !!(les && les.step === "do");   // チュートリアルの「やってみる」のあいだ（11/7-20）
  const frozen = () => stopT > 0 || (lesDo() && phase !== "round1");   // 救出の旅のチュートリアルの「やってみる」のあいだも、敵・弾・台本・虫は止まる（やってみる相手だけ動く）   // 時間止めのあいだ（敵・弾・ことば・コンベアが止まる）
  // 出来事（stages.js の event: { kind, sortie, at, dur }）がいま起きているか。sortie 1 ＝ 発見の旅の時刻、2 ＝ 救出の旅の時刻
  //   同じ出来事を発見の旅と救出の旅の両方に書いてよい（10/31-13 決定: ステージ6〜8は救出の旅でも1回）。救出の旅の出来事は、お題のあいだは起こさない（時刻も進めない）
  const evOn = e => { const tt = e.sortie === 1 ? (phase === "round1" && explore ? explore.t : -1) : (phase !== "round1" && !odai ? rescueT : -1); return tt >= e.at && tt < e.at + e.dur; };
  function evActive(kind) {
    return events.some(e => e.kind === kind && evOn(e));
  }
  const convFast = () => evActive("fast") ? BATTLE.fastConveyor : 1;   // 出来事「コンベアが急に速くなる」（11/1-2）
  // 出来事「ねじが飛んでくる」「星がはじける」の段取り（11/1-2 決定）。時刻は出来事が始まってからの秒（救出の旅の時計。お題のあいだは進まない）
  //   ねじ: 3〜5個。横のはし（左右どちらか）に warn 秒「！」を出してから、ななめに飛んでくる。地上の雑魚と同じ金属の色
  //   星: every 秒ごとに1か所が warn 秒光り、そのあと小さな弾が輪で広がる
  function evPlan(e) {
    const key = e.kind + e.at;
    if (evPlans[key]) return evPlans[key];
    const list = [];
    if (e.kind === "screw") {
      const C = BATTLE.screwEvent, n = C.n[0] + Math.floor(Math.random() * (C.n[1] - C.n[0] + 1)), side = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < n; i++) list.push({ t: C.warn + i * C.gap, side, y: rand(H * 0.12, H * 0.5) });
    } else {
      const C = BATTLE.burstEvent;
      for (let t0 = 0; t0 + C.warn < e.dur; t0 += C.every) list.push({ t0, t: t0 + C.warn, x: rand(stripRight() + 40, W - 40), y: rand(H * 0.18, H * 0.5) });
    }
    return (evPlans[key] = list);
  }
  // 出来事「うしろから虫の群れ」「はさまれる」（11/1-3 決定）: 始まった瞬間に1回
  //   うしろから: 画面の下から虫（綿毛おばけ）の群れが上がってくる。warn 秒、下のはしに「！」（世界3のうしろから来る敵と同じ作り）
  //   はさまれる: 障害物が2つ、画面の左右から同時に。あいだの細い道（pinchGap）だけ通れる。世界1 木、世界2 機械の柱、世界3 星のかたまり
  function evStart(e) {
    if (e.kind === "rear") {
      const C = BATTLE.rearSwarm;
      for (let i = 0; i < C.n; i++) { const x = stripRight() + 30 + (W - stripRight() - 60) * (i + 0.5) / C.n + rand(-14, 14); spawnFiller("ghost", x, H + 30 + (i % 2) * 40, { bx: 0, rear: true, delay: C.warn }); }
    } else if (e.kind === "pinch") {
      const L = stripRight(), gx = L + (W - L) * rand(0.35, 0.65), half = W * BATTLE.pinchGap / 2;
      const rl = Math.max(30, (gx - half) / 2), rr = Math.max(30, (W - gx - half) / 2);
      const kind = worldDef.id === 2 ? "pillar" : worldDef.id === 3 ? "star" : "tree";
      addObstacle(gx - half - rl, rl + 6, kind).pinch = true;
      addObstacle(gx + half + rr, rr + 6, kind).pinch = true;
      Sound.se("odai");
    }
  }
  function evShots() {
    for (const e of events) {
      if (e.sortie === 2 && (e.kind === "rear" || e.kind === "pinch") && evOn(e) && !evPlans[e.kind + e.at]) { evPlans[e.kind + e.at] = true; evStart(e); }
      if (e.sortie !== 2 || (e.kind !== "screw" && e.kind !== "burst") || !evOn(e)) continue;
      const tt = rescueT - e.at;
      for (const q of evPlan(e)) {
        if (q.done || tt < q.t) continue;
        q.done = true;
        if (e.kind === "screw") {
          const C = BATTLE.screwEvent;
          ebullets.push({ x: q.side < 0 ? stripRight() + 6 : W + 10, y: q.y, vx: -q.side * C.vx, vy: C.vy, kind: "screw" });
          Sound.se("boing");
        } else {
          const C = BATTLE.burstEvent;
          for (let i = 0; i < C.n; i++) { const a = i * Math.PI * 2 / C.n; ebullets.push({ x: q.x, y: q.y, vx: Math.cos(a) * C.speed, vy: Math.sin(a) * C.speed, kind: "spark" }); }
          addPop(q.x, q.y, "#ffffff", 0.8, false);
          Sound.se("pop");
        }
      }
    }
  }
  // 「！」と光る星（先に出す印）
  function drawEvWarn() {
    for (const e of events) {
      if (e.sortie !== 2 || (e.kind !== "screw" && e.kind !== "burst") || !evOn(e)) continue;
      const tt = rescueT - e.at;
      for (const q of evPlan(e)) {
        if (q.done || tt < (e.kind === "screw" ? q.t - BATTLE.screwEvent.warn : q.t0)) continue;
        const blink = 0.55 + 0.45 * Math.sin(t * 14);
        ctx.save();
        if (e.kind === "screw") {
          const x = q.side < 0 ? stripRight() + 16 : W - 16;
          ctx.globalAlpha = blink; ctx.fillStyle = "#e0402a"; ctx.font = font(30); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("！", x, q.y);
        } else {
          const k = 1 - (q.t - tt) / BATTLE.burstEvent.warn, r = 8 + 18 * k;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 2);
          g.addColorStop(0, `rgba(255,255,240,${0.5 + 0.5 * blink})`); g.addColorStop(1, "rgba(255,240,160,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r * 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  }
  // 出来事が始まった瞬間に帯を1回（発見の旅と救出の旅で、それぞれ1回）
  function evBanners() {
    for (const e of events) if (!evShown[e.kind + e.sortie + "@" + e.at] && evOn(e)) {   // 同じ出来事が2回あれば、2回とも知らせる（11/1-3）
      evShown[e.kind + e.sortie + "@" + e.at] = true;
      Sound.se("odai");
      const text = tx("events." + e.kind);
      post("banner", () => { banner = { text, t: 2.2, color: "rgba(60,80,130,0.92)" }; });
    }
  }

  // 出撃の画面をタップ: 出撃する
  function startSortie() {
    state = "play";
    retryMain = false;   // （出発の音は、扉を押したときの「ぱっ」。11/7-19）
    if (sortieNo === 1) {
      player.x = W / 2; player.y = H - 70;   // 1回目の旅: ふわりは下のまん中で待つ（動かない・撃たない）
      // （始まりのふわりの一言は、表紙と案内に同じことがあるので出さない。10/25-1）
    } else {
      startPhase("round2");
      player.x = W / 2; player.y = H * 0.8;
      moved = false;   // 2回目の旅の最初に、もう一度「ゆびでふわりをうごかそう」を出す
      stripFlash = 0.6;   // 帯の灰色の名前がいっせいに光る
      rescueLesWait = true;   // チュートリアル: 救出の旅が始まった → ふわりを動かす（11/7-20）。11/7-28: 扉の白い光が消えてから出す（前は光の中で止まって、ふわりが見えなかった）
      // （「ことばを助けよう！」の一言は、表紙の「ことばを助けに行こう！」と同じなので出さない。10/25-1）
      Sound.se("power");
    }
  }

  // 持っていくものを決める
  function chooseLoadout(id) {
    if (choiceFree && opts.onFirstChoice) opts.onFirstChoice();   // 初めて選んだ（次からは10秒の時間制限）
    choiceFree = false;
    loadout = id;
    if (id === "power") powerBonus = basePower() + 1;
    if (id === "shield") player.hp = maxHp();   // 守りアップ: 元気の上限が1.5倍（11/6-6）
    if (id === "bomb") gaugeMul = BATTLE.gaugeFastMul;   // ゲージ2倍速（11/6-6。前は「救出の旅の最初からゲージ満タン」）
    level = POWER_LEVELS[levelIdx()];
    Sound.se("item");
  }
  // 出撃2の画面の、3つの選ぶボタンの場所
  function choiceRects() {
    const a = choiceArtRect();
    if (a) {   // 絵があるときは、見本 sample_bg_start のボタンの位置（絵の幅の 11.5〜88.5%、高さの 45.8% から）
      const bw = a.w * 0.77, bh = Math.max(62, a.h * 0.112), gap = a.h * 0.013, x = a.x + a.w * 0.115, y0 = a.y + a.h * 0.458;
      return LOADOUTS.map((l, i) => ({ id: l.id, x, y: y0 + i * (bh + gap), w: bw, h: bh }));
    }
    const bw = Math.min(W - 48, 320), bh = 62, gap = 12, x = W / 2 - bw / 2, y0 = H * 0.42;
    return LOADOUTS.map((l, i) => ({ id: l.id, x, y: y0 + i * (bh + gap), w: bw, h: bh }));
  }

  // stages.js の override.battle に書いた BATTLE の数値を、そのステージのあいだだけ上書きする（終わったらもとにもどす）
  let battleBackup = null;
  function restoreStageBattle() {
    if (!battleBackup) return;
    for (const [k, v] of Object.entries(battleBackup)) BATTLE[k] = v;
    battleBackup = null;
  }
  function applyStageBattle(stage) {
    restoreStageBattle();
    const b = stage && stage.override && stage.override.battle;
    if (!b) return;
    battleBackup = {};
    for (const [k, v] of Object.entries(b)) { battleBackup[k] = BATTLE[k]; BATTLE[k] = v; }
  }

  function stop() {
    restoreStageBattle();
    running = false;
    cancelAnimationFrame(rafId);
    drag = null;
  }

  // 一時停止（アプリが裏に回ったとき）。画面をタップすると再開
  function pause() {
    if (!running || state === "clear") return;
    paused = true;
    drag = null;
  }
  function resume() {
    paused = false;
    lastTs = performance.now();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ===== 地面（畑・小川・あぜ道）。下へ流れていく =====
  const SEG_H = 240;
  function makeSegment(y) {
    const kinds = ["field", "field", "meadow", "creek", "path"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const seg = { kind, y, deco: [] };
    if (kind === "field") {           // 畝（うね）のある綿畑
      seg.x0 = rand(-40, W * 0.3); seg.x1 = rand(W * 0.7, W + 40);
      for (let i = 0; i < 10; i++) seg.deco.push({ x: rand(seg.x0 + 10, seg.x1 - 10), y: rand(20, SEG_H - 20), r: rand(5, 9) });
    } else if (kind === "meadow") {   // 花の咲く草地
      for (let i = 0; i < 22; i++) seg.deco.push({ x: rand(0, W), y: rand(0, SEG_H), c: ["#f6d6e0", "#fff6c9", "#ffffff", "#e3d6f4"][i % 4] });
    } else if (kind === "creek") {    // 小川
      seg.cy = rand(70, SEG_H - 70); seg.ph = rand(0, 6);
    } else {                          // あぜ道
      seg.px = rand(W * 0.25, W * 0.75); seg.ph = rand(0, 6);
      for (let i = 0; i < 8; i++) seg.deco.push({ x: rand(0, W), y: rand(0, SEG_H), r: rand(10, 18) });
    }
    return seg;
  }
  function fillTerrain() {
    if (!terrain.length) terrain.push(makeSegment(H - SEG_H));
    while (terrain[terrain.length - 1].y > -SEG_H) terrain.push(makeSegment(terrain[terrain.length - 1].y - SEG_H));
    terrain = terrain.filter(s => s.y < H + 10);
  }

  // ===== 語句の敵を出す =====
  // od: お題バトルのときだけ { role, size, slot, real }（3つとも同じ役割・同じ大きさで出す）
  function spawn(word, od) {
    const role = od ? od.role : word.role;
    const ground = !od && groundIds.has(word.id) && role !== "boss";
    let size = BATTLE.fontSize[role] || 26;
    if (od) size = od.size;
    else if (isShortWord(word)) size = Math.round(size * BATTLE.shortScale);   // 短い語句は大きめに
    ctx.font = font(size);
    let w = ctx.measureText(word.word).width;
    // 画面からはみ出す長い語句は、24pxまで小さくする
    while (w > W - 40 && size > 24) { size -= 2; ctx.font = font(size); w = ctx.measureText(word.word).width; }
    // 出方（pattern）と位置（lane）はデータで固定。ランダムには出ない
    let pattern = od ? "odai" : (role === "boss" ? "boss" : patOf(word).pattern);
    if (isShortWord(word) && (pattern === "edge" || pattern === "cross")) pattern = "normal";   // 短い語句は端・横切りにしない
    if (pattern === "ground" && !ground) pattern = "normal";   // 地上のない世界では、地上の語句もふつうの出方に
    let lane = patOf(word).lane;
    const margin = w / 2 + 20 + (ground ? 0 : BATTLE.sway);
    const left = stripRight();   // 左端の帯と重ならないように
    let x = role === "boss" ? W / 2 : left + margin + lane * Math.max(1, W - left - margin * 2);
    if (pattern === "edge") lane = 1;   // 端にかくれる語句は右端だけ（左端は帯があるため）
    let y = -size;
    if (pattern === "edge") x = lane < 0.5 ? -w / 2 : W + w / 2;
    if (pattern === "cross") { x = lane < 0.5 ? -w / 2 - 10 : W + w / 2 + 10; y = H * BATTLE.crossY; }
    // 木の真上に出る語句は、木と同じ速さで降りるので、ずっと木にかくれて光が届かない（10/25-8）。木の列をよけて横にずらす（木のかげの語句は別）
    if (pattern === "normal" && !ground && !od) for (const o of obs) {
      if (o.y < y || o.y - o.r > H || Math.abs(x - o.x) >= o.r + w / 2 + 8) continue;
      const lo = left + margin, hi = W - margin, toR = o.x + o.r + w / 2 + 16, toL = o.x - o.r - w / 2 - 16;
      x = toR <= hi && (toL < lo || x >= o.x) ? toR : toL >= lo ? toL : x;
    }
    // 硬さ: ザコは難易度で決まる硬さ、中ボス・大ボスは文字1つあたりの耐久 × 難易度の倍率
    //   横切る・端にかくれる語句は、画面にいる（当てられる）時間が短いので、BATTLE.zakoPatternHp の倍率でやわらかくする（10/25-8）
    const hp = BATTLE.hpOverride[role] || (role === "zako" ? Math.max(1, Math.max(word.hp, P.zakoHp) * (ground ? 1 : (BATTLE.zakoPatternHp[pattern] || 1))) : Math.max(1, Math.round(word.hp * (role === "mid" ? P.midHpScale : P.bossHpScale))));
    if (od) { x = W / 2; y = -size - od.slot * 40; }
    const e = {
      hold: (BATTLE.firstHold && phase === "round2" && !od && !extraRound && word === script[0])   // ステージ1の救出の旅の1語目
        || (BATTLE.groundHold && ground && phase === "round2" && !extraRound && !groundHeld && (groundHeld = true)),   // ステージ5の救出の旅の、最初の地上のことば（10/31-12）
      word, role, size, w, h: size * 1.2, ground, pattern, lane,
      slot: od ? od.slot : 0, order: od ? !!od.order : false, dummy: od ? !od.real : false, odaiReal: od ? od.real : false, penaltyAt: -9,
      last: phase !== "round1",                    // 2周目と大ボスは、倒せば吸い込む
      spd: (phase === "round1" ? BATTLE.round1Speed : 1) * P.speedScale / (phase !== "round1" && !od && role !== "boss" ? stayOf() : 1),   // 世界2・3は画面にいる時間を1.2倍（11/7-8）
      bx: x, x, y, hp, maxHp: hp,
      age: 0, phase: (word.id * 1.7) % 6, fire: 1.2, flash: 0,
      gplay: ground && phase !== "round1" ? groundPlayOf(word) : null   // 地上のことばの「隠れる」「動く」（10/31-13）
    };
    if (gHides(e)) e.hideT = Math.random() * BATTLE.hideOut * 0.5;   // 顔を出したところから
    if (gMoves(e)) e.vx = BATTLE.groundMoveSpeed * (Math.random() < 0.5 ? -1 : 1);
    if (e.gplay) { const [lo, hi] = gEdges(e); e.x = e.bx = Math.max(lo, Math.min(hi, e.x)); }   // はしの60pxには出さない（11/7-8）
    // 中ボス・大ボスは1文字ずつ壊す: 文字がそれぞれ部品
    // 硬さは「語句全体の硬さ」（役割で決まる）を、壊す文字の数で割った1文字あたりの耐久（上限・下限つき）
    // かっこと、かっこの中の別名は飾り（壊さない・当たらない・読まない）
    if (role === "mid" || role === "boss") {
      ctx.font = font(size);
      const chars = Array.from(word.word);
      let depth = 0;
      const deco = chars.map(ch => { if (ch === "(") depth++; const d = depth > 0; if (ch === ")") depth = Math.max(0, depth - 1); return d; });
      const n = Math.max(1, deco.filter(d => !d).length);
      const lim = BATTLE.perCharHp[role];
      const per = BATTLE.hpOverride[role] ||
        Math.min(lim.max, Math.max(lim.min, Math.round(BATTLE.wordTotalHp[role] * (role === "mid" ? P.midHpScale : P.bossHpScale) * (od ? BATTLE.odaiHpByLevel[levelIdx(true)] || 1 : 1) * (od && od.order ? BATTLE.orderShare * (opts.stage.orderHp || 1) : 1) * (role === "boss" && opts.stage && opts.stage.bossHp || 1) / n)));   // bossHp ＝ ステージごとの大ボスの硬さの倍率（ステージ12。11/2-3）   // 「3つを順に」は1つあたり 1/3（orderHp ＝ ステージごとの倍率）
      const ws = chars.map(ch => ctx.measureText(ch).width);
      const total = ws.reduce((a, b) => a + b, 0);
      let ox = -total / 2, k = 0;
      e.parts = chars.map((ch, i) => {
        const p = { ch, ox: ox + ws[i] / 2, cw: ws[i], deco: deco[i], hp: deco[i] ? 0 : per, maxHp: deco[i] ? 0 : per, broken: false, flash: 0 };
        if (!deco[i]) { p.kana = (word.kanaParts && word.kanaParts[k]) || ch; k++; }   // kanaParts は壊す文字の順
        ox += ws[i];
        return p;
      });
      e.hp = e.maxHp = n;   // 残っている（壊す）文字の数
      // お題の語句は縦書き: 文字を上から下へならべる（列の幅は1文字分）
      if (od) {
        e.vertical = true;
        e.charH = size * 1.12;
        e.parts.forEach((p, i) => { p.ox = 0; p.oy = (i - (chars.length - 1) / 2) * e.charH; });
        e.w = Math.max(...ws) + 4;
        e.h = chars.length * e.charH;
      }
    }
    enemies.push(e);
    // 木のかげ: 本番では、語句のすぐ前（下）に木が来る。探検では木は出ない
    if (pattern === "treeshade") {
      e.holdT = 0;
      if (obsActive()) {
        const r = Math.max(50, e.w / 2 + 12);
        e.tree = addObstacle(e.x, r);
        e.tree.y = e.y + e.h / 2 + r + 6;
      }
    }
    // 雑魚のうしろ: 語句の前（下）に雑魚がならんで守る
    if (pattern === "behind") {
      const n = BATTLE.escortCount;
      for (let i = 0; i < n; i++) {
        const dx = (i - (n - 1) / 2) * Math.max(26, (w + 20) / n);
        spawnFiller("ghost", x + dx, y + e.h / 2 + 22, { escort: e, dx, dy: e.h / 2 + 22 + (i % 2) * 10 });
      }
    }
    if (ground) newInWorld("ground");   // 地上の案内は、その世界の最初のステージだけ
  }

  function groundHint() {
    if (groundHinted) return;
    groundHinted = true;
    const text = tx("newInWorld.ground");
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime }; slow = Math.max(slow, BATTLE.hintSlow); });   // 10/31-12: 帯ではなく、ほかの案内と同じ形
  }

  // ===== 雑魚の群れを出す =====
  // 本番と大ボスだけ雑魚を濃くする（難しさは雑魚の弾でなく数で作る）
  const fillerDense = () => phase === "round1" ? 1 : P.fillerDensity * ((theme.bugs && theme.bugs.density) || 1) * ((opts.stage && opts.stage.bugMul) || 1);   // bugMul ＝ 虫の数の倍率（11/1-3 決定: 3つ目 1.25、4つ目 1.5）   // 難易度の線（fillerDensity）× 時間帯の虫の数
  function spawnFiller(type, x, y, extra) {
    const def = FILLER_TYPES[type];
    const fhp = Math.max(1, Math.round(def.hp * (P.fillerHp || 1)));   // 虫の硬さ（難易度の線）
    fillers.push(Object.assign({ type, layer: def.layer, hp: fhp, maxHp: fhp, r: def.r * BATTLE.fillerScale, x, y, age: 0, flash: 0,
      fire: def.fire ? rand(0.8, 1.6) * def.fire * BATTLE.fillerFireScale * fillerDense() / P.fireRate / fireRamp() : 0 }, extra || {}));
    const f = fillers[fillers.length - 1];
    if (f.rear && worldDef.id === 3) { f.hp = f.maxHp = BATTLE.rearHp; }   // 世界3のうしろの虫は、回る玉に3回で倒れる（11/6-3）
  }
  // 語句の近くかどうか（雑魚を出す場所をえらぶとき用）
  function nearWord(x, y, layer) {
    const A = BATTLE.fillerAvoid;
    return enemies.some(e => (layer ? (layer === "ground") === e.ground : true) &&
      Math.abs(x - e.x) < e.w / 2 + A && Math.abs(y - e.y) < e.h / 2 + A);
  }
  // 語句から離れた x をえらぶ（見つからなければ null）
  function freeX(y, layer, margin) {
    for (let i = 0; i < 8; i++) { const x = rand(margin, W - margin); if (!nearWord(x, y, layer)) return x; }
    return null;
  }
  // 横に通る列が、空中の語句と重ならない高さをえらぶ
  function freeRow() {
    for (let i = 0; i < 8; i++) {
      const y = rand(H * 0.12, H * 0.4);
      if (!enemies.some(e => !e.ground && Math.abs(e.y + (H / BATTLE.fallTime.zako) * 3 - y) < e.h / 2 + BATTLE.fillerAvoid)) return y;
    }
    return null;
  }

  function spawnWave() {
    // 世界3: うしろ（画面の下）から綿毛おばけが2匹（10/31-10 試作。WORLDS の rear）。出る前に下のはしに「！」
    if (worldDef.rear && Math.random() < ((opts.stage && opts.stage.rearRate) || BATTLE.rearRate)) {
      for (let i = 0; i < 2; i++) { const x = freeX(H, "air", 40); if (x !== null) spawnFiller("ghost", x, H + 30 + i * 50, { bx: 0, rear: true, delay: 0.9 }); }
      newInWorld("rear");
      return;
    }
    // 時間帯の虫（theme.bugs.kinds）: どれか1種類を、その動き方の群れで出す
    const kinds = theme.bugs && theme.bugs.kinds;
    if (kinds && kinds.length) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)], mv = moveOf(kind);
      if (mv === "ladybug") {
        const fromLeft = Math.random() < 0.5, y0 = freeRow();
        if (y0 === null) return;
        for (let i = 0; i < 6; i++) spawnFiller(kind, fromLeft ? -20 : W + 20, y0, { dir: fromLeft ? 1 : -1, y0, delay: i * 0.32 });
      } else if (mv === "bee") {
        for (let i = 0; i < 3; i++) { const x = freeX(0, "air", 30); if (x !== null) spawnFiller(kind, x, -20, { delay: i * 0.35, tx: null }); }
      } else if (mv === "hover") {   // 1匹が、自機から遠い側の画面のはしを、自機の近くまでゆっくり降りてくる
        const x = player.x < W / 2 ? W - 34 : stripRight() + 34;
        spawnFiller(kind, x, -20, { hy: H * rand(0.48, 0.56), stayT: FILLER_TYPES[kind].stay || 4 });
      } else {
        for (let i = 0; i < 2; i++) { const x = freeX(0, "air", 40); if (x !== null) spawnFiller(kind, x, -24 - i * 50, { bx: 0 }); }
      }
      return;
    }
    const names = Object.keys(FILLER_WAVES).filter(n => groundOn || !["weeds", "thorn"].includes(n));   // 地上のない世界では、地上の雑魚を出さない
    let sum = names.reduce((a, n) => a + FILLER_WAVES[n], 0), r = Math.random() * sum, name = names[0];
    for (const n of names) { r -= FILLER_WAVES[n]; if (r <= 0) { name = n; break; } }
    // 語句の近くには出さない。場所が見つからなければ、その回は出さない
    if (name === "ladybugs") {        // 横から4匹が列になって飛んでくる
      const fromLeft = Math.random() < 0.5, y0 = freeRow();
      if (y0 === null) return;
      for (let i = 0; i < 6; i++) spawnFiller("ladybug", fromLeft ? -20 : W + 20, y0, { dir: fromLeft ? 1 : -1, y0, delay: i * 0.32 });
    } else if (name === "bees") {     // 2匹が上から急に降りてくる
      for (let i = 0; i < 3; i++) { const x = freeX(0, "air", 30); if (x !== null) spawnFiller("bee", x, -20, { delay: i * 0.35, tx: null }); }
    } else if (name === "ghost") {    // 綿毛おばけが1匹
      for (let i = 0; i < 2; i++) { const x = freeX(0, "air", 40); if (x !== null) spawnFiller("ghost", x, -24 - i * 50, { bx: 0 }); }
    } else if (name === "weeds") {    // からまり草が2株
      for (let i = 0; i < 3; i++) { const x = freeX(0, "ground", 40); if (x !== null) spawnFiller("weed", x, -24 - rand(0, 40)); }
    } else {                          // いばらの株が1つ
      const x = freeX(0, "ground", 50); if (x !== null) spawnFiller("thorn", x, -26);
    }
    if (FILLER_TYPES[{ ladybugs: "ladybug", bees: "bee", ghost: "ghost", weeds: "weed", thorn: "thorn" }[name]].layer === "ground") newInWorld("ground");
  }

  // ===== 毎フレームの処理 =====
  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    update(dt);
    frameNo++;
    draw();
    countFps(ts);
    syncPauseBtn();
    rafId = requestAnimationFrame(loop);
  }
  function countFps(ts) {
    fpsN++;
    if (!fpsT0) fpsT0 = ts;
    const span = ts - fpsT0;
    if (span >= 500) {
      if (span < 2000) {   // 画面を切りかえて止まっていたあいだは数えない
        fpsNow = fpsN * 1000 / span;
        if (state === "play" && phase !== "round1" && !paused && (!fpsMin || fpsNow < fpsMin)) fpsMin = fpsNow;
      }
      fpsT0 = ts; fpsN = 0;
    }
    if (opts.showFps && fpsNow) {   // ?tune のときだけ、右下に小さく
      ctx.save(); ctx.font = font(11); ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(W - 92, H - 18, 92, 18);
      ctx.fillStyle = "#fff"; ctx.fillText(`fps ${Math.round(fpsNow)} 最低 ${Math.round(fpsMin)}`, W - 4, H - 15);
      ctx.restore();
    }
  }
  // ひと休み中の絵には右下に「Ⅱ」が描いてあるので、そのあいだは本物の「Ⅱ」のボタンを隠す（11/1。二重にしない）
  let pauseBtnHidden = false;
  function syncPauseBtn() {
    const on = paused && sleepImg.complete && !!sleepImg.naturalWidth;
    if (on === pauseBtnHidden) return;
    pauseBtnHidden = on;
    const b = document.getElementById("btn-pause");
    if (b && b.classList) b.classList.toggle("sleep-hide", on);
  }

  function update(realDt) {
    if (paused) return;
    if (tut) { tut.t += realDt; return; }   // チュートリアルの案内のあいだは止まる
    if (les) { lessonStep(realDt); if (les && les.step !== "do") return; }   // チュートリアル（11/7-20）: 説明と「OK！」のあいだは全部止まる
    if (state === "sortie") {   // 出撃の画面のあいだは止まっている
      if (sortieNo === 2 && sortieStep === "choice" && !les && lessonOn("choice")) lesson("choice", { done: () => loadout !== null });   // チュートリアル: とくいの選択 → 1つ選ぶ（11/7-26。ステージ1の初回）
      // （持ち物選択の時間制限は、10/25-14 になくした。選ぶまで待つ）
      if (sortieStep === "door" && door && Door.step(door, realDt, sortieNo === 1 ? "explore" : "rescue", W, H)) {   // 押して光が広がりきった（10秒で自動）
        door = null; doorFade = BATTLE.doorFade;
        startSortie();
      }
      return;
    }
    doorFade = Math.max(0, doorFade - realDt);
    if (rescueLesWait && doorFade <= 0) { rescueLesWait = false; lesson("rescueStart", { target: player, done: L => L.dist >= BATTLE.lesson.moveDist }); }   // やる相手（ふわり）に光る輪
    // 本番が始まったら、コクピットの枠が外れていく
    stripFlash = Math.max(0, stripFlash - realDt);
    // 吸い込む瞬間は、画面全体がゆっくりになる
    let dt = realDt;
    if (slow > 0) { slow -= realDt; dt = realDt * BATTLE.slowScale; }
    // 吸い込んだ語句の表示と、広がる光は実際の時間で進める
    if (showWord) { showWord.t -= realDt; if (showWord.t <= 0) showWord = null; }
    if (wave) { wave.age += realDt; if (wave.age > 0.6) wave = null; }
    if (fsay) { fsay.t -= realDt; if (fsay.t <= 0) fsay = null; }
    if (gauge >= 100 && phase !== "round1" && !odai && state === "play" && !les && lessonOn("boost")) { const b0 = skillButtons()[0]; lesson("boost", { target: b0, ty: b0.y, done: () => boostT > 0 }); }   // チュートリアル: ゲージが初めて満タン → パワー全開を押す（11/7-26。ステージ1の初回）
    if ((guardSayWait || rewindHintWait) && msgBusy() < 0 && msgGap <= 0 && !odai && state === "play" && !(gauge >= 100 && lessonOn("boost"))) {
      // ステージ2の初回は、先に無敵タイムの一言（11/7-26）。ステージ1でパワー全開のチュートリアルをしたあとは、巻き戻しの一言を短く「ピンチのときは無敵タイム、取り逃したら巻き戻し」に
      if (guardSayWait) { guardSayWait = false; fsay = { text: tx("skills.guardSay"), t: BATTLE.rewindHintTime }; }
      else { rewindHintWait = false; fsay = { text: tx(hintShown.boost ? "skills.afterBoost" : "skills.rewindHint"), t: BATTLE.rewindHintTime }; }
    }   // 巻き戻しの一言（11/7-9）
    if (hintCard) { hintCard.t -= realDt; if (hintCard.t <= 0) hintCard = null; }
    bombFlash = Math.max(0, bombFlash - realDt);
    updateMsgs(realDt);
    if (guide) { guide.t -= realDt; if (guide.t <= 0) guide = null; }
    if (typhoon) { typhoon.age += realDt; if (typhoon.age > 0.9) typhoon = null; }
    if (againFx) { againFx.age += realDt; if (againFx.age > BATTLE.boss2.fxTime) againFx = null; }
    if (wrongFx) { wrongFx.age += realDt; if (wrongFx.age > BATTLE.odaiWrongTime) wrongFx = null; }
    if (powerFx) { powerFx.age += realDt; if (powerFx.age > BATTLE.powerFxTime) powerFx = null; }
    if (odai && odai.intro > 0) odai.intro -= realDt;
    if (odai && odai.intro <= 0 && !odai.lesTried && state === "play") {   // チュートリアル: お題（読む時間のあと）→ 答える（11/7-20）
      odai.lesTried = true;
      //   ステージ1は最初のお題。ステージ5は大ボスの「3つを順に」の前（11/7-24。中ボスの前には出さない）。ステージ9の中ボスの説明はやめた（11/7-24）
      const sid = opts.stage && opts.stage.id, id = sid === 1 ? "odai" : sid === 5 && odai.boss && odai.mode === "order" ? "s5boss" : null;
      if (id) lesson(id, { low: true, done: () => !odai || odai.firstHit !== null || odai.answered });   // 吹き出しは下に（ことばと重ならない）。順番は1つ目に当てたら（正しくてもまちがいでも）
    }
    if (odai && odai.show > 0) odai.show -= realDt;   // 「3つを順に」の正しい順を見せている残り
    for (const b of bounces) { b.age += realDt; b.x += b.vx * realDt; b.y += b.vy * realDt; }
    bounces = bounces.filter(b => b.age < 0.5);
    t += dt;
    stopT = Math.max(0, stopT - dt); guardT = Math.max(0, guardT - dt);   // 必殺ワザの残り（10/31-10 試作）
    if (boostT > 0) { boostT = Math.max(0, boostT - dt); if (boostT === 0) level = POWER_LEVELS[levelIdx()]; }   // パワー全開が終わったら元の段にもどる（11/7-25）
    if (rewindFx) { rewindFx.age += realDt; if (rewindFx.age > 1.2) rewindFx = null; }
    shake = Math.max(0, shake - dt);
    player.glow = Math.max(0, player.glow - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    player.red = Math.max(0, (player.red || 0) - dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    const sc = frozen() ? 0 : scrollSpeed() * (evActive("reverse") ? -1 : 1) * convFast();   // 時間止めのあいだは地面も止まる。救出の旅の出来事「コンベアが逆」では、地面の流れが逆（上へ。10/31-13）

    // 地面・雲の影・綿毛（奥行きのために、速さを変えて流す）
    for (const s of terrain) s.y += sc * dt;
    if (bgGo && !odai && state === "play" && phase !== "round1") bgOff += sc * dt;   // 背景の絵: 1語目が出るまでと、お題のあいだ・終わりは止める（11/1-2 決定）
    fillTerrain();
    for (const c of cloudShadows) { c.y += sc * 1.5 * dt; c.x += 8 * dt; if (c.y - c.ry > H) { c.y = -c.ry - rand(0, 200); c.x = rand(0, W); } }
    for (const f of fluff) { f.y += f.v * dt; f.x += Math.sin(t + f.p) * 8 * dt; if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; } }
    updateThreads(dt);
    updatePops(dt);
    for (const f of freed) {   // 助けた語句が、ふわりのところへ飛んでいく（0.7秒）
      f.age += realDt;
      const k = Math.min(1, f.age / 0.7), tx = player.x, ty = player.y;
      f.x += (tx - f.x) * Math.min(1, realDt * (2 + k * 10)); f.y += (ty - f.y) * Math.min(1, realDt * (2 + k * 10));
      if (f.age >= 0.7) { f.done = true; player.glow = 0.4; }
    }
    freed = freed.filter(f => !f.done);
    for (const v of vanish) { v.age += dt; if (v.ground) v.y += scrollSpeed() * dt; }
    for (const fl of floats) fl.age += realDt;
    floats = floats.filter(fl => fl.age < 0.9);
    vanish = vanish.filter(v => v.age < 0.8);
    player.notice = Math.max(0, (player.notice || 0) - dt);
    player.healFlash = Math.max(0, (player.healFlash || 0) - realDt);
    if (player.rising > 0) {   // 画面の下から上がってくる
      player.rising -= dt;
      const k = 1 - Math.max(0, player.rising) / BATTLE.respawnRise;
      player.y = H + 30 + (H * 0.8 - H - 30) * (1 - Math.pow(1 - k, 2));
    }

    if (state === "clear") {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        // 大ボスのあと、助けられなかったことばがあれば、そのままラストチャンス（1回だけ。11/7-10 決定。前は「もう一度さがしに行く？」と聞いていた）
        if (!extraUsed && extraWords().length) { startLast(); return; }
        finishBattle();
      }
      return;
    }
    if (phase === "round1") { updateExplore(dt); return; }   // 1回目の旅（双眼鏡）。雑魚・弾・木・天気は出さない
    if (!frozen() && !odai && !lastT) rescueT += dt;   // 救出の旅の経過（出来事の時刻。10/31-10 試作）。お題のあいだは進めない（10/31-13）
    if (!lastT) evBanners();   // ラストチャンスでは出来事は出ない
    // 出来事「流星雨」（世界3。10/31-10 試作）: 上から、少しななめに流れ星の弾が落ちてくる（お題のあいだと時間止めのあいだは出ない）
    if (!odai && !frozen() && !lastT) evShots();
    if (evActive("meteor") && !odai && !frozen() && !lastT) {
      meteorT -= dt;
      if (meteorT <= 0) { meteorT = BATTLE.meteorGap * rand(0.7, 1.3); ebullets.push({ x: rand(stripRight() + 10, W + 40), y: -10, vx: -BATTLE.meteorSpeed * 0.25, vy: BATTLE.meteorSpeed, kind: "zako" }); }
    }

    // ===== 台本: 決まった時刻に、決まった順番で語句を出す（倒したかどうかには関係しない） =====
    if (lastT > 0) updateLast(dt);   // ラストチャンス: 台本のかわりに、取り逃したことばだけを出す
    else if (gapT > 0) {
      // 周と周のあいだ
      gapT -= dt;
      if (gapT <= 0) {
        if (phase === "round1") {
          // 探検が終わった: 画面の雑魚と弾を片づけて、「出撃2 本番」の画面で止まる
          fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
          fillers = []; ebullets = []; bombs = []; blasts = []; items = [];
          state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; sortieStep = "say";
          scoreAtMain = score;
          drag = null;
        } else {
          startPhase("boss");
          if (BATTLE.odai) startOdai(bossWord, true); else spawn(bossWord);
          // （「大きな殻があらわれた！」の帯は、お題の問題文と重なるので出さない。10/7-1）
          Sound.se("boss");
        }
      }
    } else if (phase !== "boss") {
      if (!odai && !holdOn() && !frozen()) {   // お題バトルの間と、1語目を待っているあいだは、台本を止める（時間止めのあいだも）
        roundT += dt;
        if (obsActive()) {
          const list = (obsDef.items || []).filter(it => it.at !== undefined);   // 時刻で出す木
          while (obsNext < list.length && roundT >= list[obsNext].at * ((opts.stage && opts.stage.rescueLen) || 1)) spawnObstacle(list[obsNext++]);   // 救出の旅を長くしたステージは、木・柱の時刻も同じ倍率でのばす（11/1-3）
          // 休みつきの木（afterWord: その数の語句を出したあと）: 画面の語句がいなくなる → 3秒 → 木と案内 → 案内のあと3秒 → 次の語句
          const rl = (obsDef.items || []).find(it => it.afterWord !== undefined && !restDone.has(it) && nextIdx >= it.afterWord);
          if (rl && !rest) rest = { it: rl, step: "wait", t: 0 };
        }
        if (rest) updateRest(dt);
        while (!rest && nextIdx < script.length && roundT >= nextAt) {
          const w = script[nextIdx];
          // 中ボスのお題は、画面にいるほかの語句が助かるか、いなくなるまで待って始める（お題のあいだは語句が止まって当たらないので。10/25-8）
          if (phase === "round2" && BATTLE.odai && w.role === "mid" && enemies.some(e => e.role === "zako" && !e.ground && e.hp > 0)) { nextAt = roundT; break; }   // 待つあいだ、あとの語句の時刻も後ろにずらす（まとめて出ないように）
          // 横切る語句は、通る高さに木があるあいだは出さない（木をよけながら横に追えないので。10/25-9）
          if (patOf(w).pattern === "cross" && !isShortWord(w) && obs.some(o => Math.abs(o.y - H * BATTLE.crossY) < o.r + H * 0.2)) { nextAt = roundT; break; }
          nextIdx++;
          if (phase !== "round1") bgGo = true;
          nextAt += roundInterval();
          if (phase === "round2" && BATTLE.odai && w.role === "mid") { startOdai(w, false); break; }
          spawn(w);
        }
      }
      // その周の語句が全部出て、画面からいなくなったら次へ
      if (nextIdx >= script.length && !odai && enemies.every(e => e.role === "boss")) gapT = BATTLE.roundGap;
    }

    // お題バトルの制限時間（中ボスだけ）
    if (odai && odai.intro <= 0 && !frozen()) {
      odai.t += dt;
      if (!odai.boss && odai.t >= BATTLE.odaiTimeLimit) endOdai(false);
    }

    // 雑魚の群れを出す（1周目と大ボスのときは少なめ）
    if (!odai && !rest && !holdOn() && !frozen() && !lastT) fillerTimer -= dt;   // ラストチャンスでは、ふつうの敵は出ない   // お題のあいだと、木の前後の休みのあいだは、雑魚を出さない
    if (fillerTimer <= 0) {
      const rp = BATTLE.ramp[phase] || BATTLE.ramp.round2;   // 坂: 今の出撃の濃さ
      const dn = rp.filler * fillerDense();
      if (fillers.length < BATTLE.fillerMax * dn) spawnWave();
      fillerTimer = BATTLE.fillerInterval / Math.max(0.1, dn) * rand(0.8, 1.2);
    }

    // 自機の弾（自動で連射）
    shotTimer -= dt;
    if (shotTimer <= 0) {
      // ふわりの段階で弾の数が増える
      // お題バトルの間もパワーの段は保つ（11/1 決定。前は正面1本だけ）。広がる角度だけ狭くして、正面寄りに
      const nk = odai ? BATTLE.odaiSpread : 1;
      for (const k of level.spread) shots.push({ x: player.x + k * 9 * nk, y: player.y - 22, vx: k * 55 * nk, thick: level.thick.includes(k), boost: boostT > 0 });
      shotTimer = BATTLE.shotInterval * level.rate;
    }
    for (const s of shots) { s.y -= BATTLE.shotSpeed * dt; s.x += s.vx * dt; }
    shots = shots.filter(s => s.y > -20);

    // 地上の攻撃（10/31-12 決定 B、11/1-4 決定で光のたねを投げる形に、11/2 決定で投げ続ける形に）: 地上の敵が自機の真上の列（左右 groundColumn px）にいるあいだ、
    //   自動で光のたねを投げ続ける（いちばん近いものに）。たねは少しずつ左右にばらけて放物線で飛び、着地ではじける。着地したときに隠れていることばには効かない
    const gts = groundTargets();
    lock = gts.filter(g => g.y < player.y - 30 && Math.abs(player.x - g.x) < (g.word ? g.w / 2 : g.r) + BATTLE.groundColumn).sort((a, b) => b.y - a.y)[0] || null;
    //   11/7-23: 真上の列にいなくても、地上の雑魚（星など）が画面の下半分にいれば、すぐにそれをねらって投げる（真上の列のものが先）
    if (!lock) lock = gts.filter(g => !g.word && g.y < player.y - 30 && g.y >= H * BATTLE.groundWide && g.x > 0 && g.x < W).sort((a, b) => b.y - a.y)[0] || null;
    bombTimer -= dt;
    if (lock && bombTimer <= 0) {
      const aim = lock.word ? Math.min(lock.x + lock.w / 2 - 4, Math.max(lock.x - lock.w / 2 + 4, player.x)) : lock.x;
      const cx = !lock.word && Math.abs(player.x - lock.x) >= lock.r + BATTLE.groundColumn ? lock.x : player.x;   // 列の外の雑魚は、その位置へ投げる（11/7-23）
      const pair = { hit: new Set() };   // 左右の2個で同じ敵に2回当てない（倒す速さは前のたねと同じ）
      // 真正面に1個。その世界の最大パワー（世界1は2本、世界2は3本、世界3は4本 ＝ 初期値の段＋1）で左右45度に2個。とくいのパワーアップで最初から最大なら最初から2個（11/7-9 決定。11/7-8 は「スタートより1段上」だった）。左右45度へ山なりに（11/6-3）
      for (const side of (POWER_LEVELS.indexOf(level) >= basePower() + 1 ? [-1, 1] : [0])) bombs.push({ sx: player.x, sy: player.y - 24, tx: cx + side * BATTLE.bombSide, ty: lock.y, age: 0, tg: lock, side, pair });
      bombTimer = BATTLE.bombInterval;
      Sound.se("seedThrow");
    }
    for (const b of bombs) {
      b.age += dt;
      b.ty += sc * dt / (b.tg && b.tg.word && b.tg.last ? stayOf() : 1);   // 落ちる先も地面といっしょに流れる（ことばをねらったときは、ことばといっしょに）
      if (b.tg && b.tg.hp > 0 && b.tg.word && gMoves(b.tg)) { if (b.lx !== undefined) b.tx += b.tg.x - b.lx; b.lx = b.tg.x; }   // 動くことばは、落ちる先もいっしょに動く（ばらけ方は保つ）
      if (b.age >= BATTLE.bombFlight && !b.done) { b.done = true; landBomb(b.tx, b.ty, BATTLE.seedPower, b.pair); }
    }
    bombs = bombs.filter(b => !b.done);
    for (const r of blasts) { r.age += dt; r.y += sc * dt; }   // 爆発の輪も地面といっしょに流れる
    blasts = blasts.filter(r => r.age < BATTLE.bombRingTime + 0.25);

    // 語句の敵の動き
    for (const e of enemies) {
      if (frozen()) { e.flash = Math.max(0, e.flash - dt); if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt); continue; }   // 時間止め: ことばは止まって撃たない
      // ザコの語句: 画面に全部入ったら1秒止まって光る（この間は撃てない）
      if (e.role === "zako" && e.pattern !== "odai" && !e.appeared && onScreen(e)) { e.appeared = true; e.appearT = BATTLE.zakoAppearTime; if (e.ground && worldDef.id > 1 && !e.hold) newInWorld("ground"); if (e.ground) groundIntroHint(e); }   // 案内: 最初の殻
      if (e.appearT > 0 && !(odai && e.pattern !== "odai")) { e.appearT -= dt; e.flash = Math.max(0, e.flash - dt); continue; }
      if (e.role === "zako" && e.pattern !== "odai" && !e.ground && !e.lesTried && onScreen(e) && (!e.hold || e.y >= H * BATTLE.firstHoldY - 1)) { e.lesTried = true; lesson("shell", { ty: e.y, target: e, done: () => e.hp <= 0 }); }   // チュートリアル: 最初の殻（光が当たるようになったところ）→ 助ける（11/7-20）
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.againT > 0) {   // 大ボス2段階目: 殻が少しずつ戻る（11/1-4）
        e.againT = Math.max(0, e.againT - dt); e.flash = Math.max(e.flash, 0.1);
        for (const p of e.parts) if (!p.deco) p.hp = Math.max(1, Math.round(p.maxHp * (1 - e.againT / BATTLE.boss2.fxTime)));
      }
      if (e.wrongT > 0) e.wrongT = Math.max(0, e.wrongT - dt);
      if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt);
      if (odai && e.pattern !== "odai") continue;   // お題バトルの間は、画面のほかの語句も止める（動かない・撃たない）
      if (e.pattern === "odai") {
        // お題の語句: 縦書きで左・中・右の列にならび、動かない（上から降りてきて止まる）
        const ty = odaiTop() + 30 + e.h / 2;
        e.y += (ty - e.y) * Math.min(1, dt * 4);
        const cols = odai && odai.cols === 2 ? BATTLE.odaiColumns2 : BATTLE.odaiColumns;
        e.x = W * cols[e.slot % cols.length];
        const sw = worldDef.odaiSway;   // ゆっくり左右にゆれる（世界2・3。11/3-3）。2つは逆向き、3つは3分の1ずつずらす
        if (sw && odai) {
          if (!(odai.intro > 0) && !frozen()) e.swayT = (e.swayT || 0) + dt;   // 読む時間と時間止めのあいだは進めない
          const n = cols.length, amp = sw.amp * Math.min(1, (e.swayT || 0) / BATTLE.odaiSwayIn);
          e.x += amp * Math.sin((e.swayT || 0) * Math.PI * 2 / sw.period + e.slot * Math.PI * 2 / n + (n === 2 ? Math.PI / 2 : 0));
          e.x = Math.max(stripRight() + e.w / 2 + 4, Math.min(W - e.w / 2 - 4, e.x));
        }
      } else if (e.role === "boss") {
        const enter = Math.min(e.age / BATTLE.bossEnterTime, 1);
        e.y = -e.size + (H * BATTLE.bossStopY + e.size) * (1 - Math.pow(1 - enter, 2));
        const range = Math.min(W * BATTLE.bossSway, Math.max(0, W / 2 - e.w / 2 - 12));
        e.x = W / 2 + Math.sin(e.age * 0.7) * range;
      } else if (e.ground) {
        e.y += sc * dt / (e.last ? stayOf() : 1);     // 地上の語句は地面といっしょに流れる（世界2・3の救出の旅は少しゆっくり。11/7-8）
        if (gHides(e)) {   // 隠れる: 出る hideOut 秒・隠れる hideIn 秒のあと、また出る（隠れるのは1回だけ。11/7-8）。顔を出すときに「ぴょこ」
          const was = gHidden(e);
          e.hideT += dt;
          if (was && !gHidden(e)) { e.popT = 0; if (onScreen(e)) Sound.se("pop"); }
        }
        if (e.popT !== undefined) e.popT += dt;
        if (e.hold && !e.lesTried && onScreen(e) && e.y >= H * BATTLE.firstHoldY - 1) { e.lesTried = true; lesson("s5ground", { ty: e.y, target: e, done: () => e.hp <= 0 }); }   // チュートリアル: 最初の地上のことば（止まって待つことば）が上の帯の下まで来た → 爆弾で助ける（11/7-20）
        if (gMoves(e)) {   // 動く: コンベアに乗って横に動く。出来事「コンベアが逆」では逆向き。11/7-8 決定: はしの60pxの手前で止まる（前は はしで折り返した）
          const d = evActive("reverse") ? -1 : 1, [lo, hi] = gEdges(e);
          e.x = Math.max(lo, Math.min(hi, e.x + e.vx * d * convFast() * dt));
        }
        if (e.hold && e.y >= H * BATTLE.firstHoldY) {   // ステージ5の最初の地上のことば: 中ほどで止まって待つ。止まったところで案内
          e.y = H * BATTLE.firstHoldY;
          if (!e.holdHinted) { e.holdHinted = true; if (!hintOpts) newInWorld("ground", true); }   // （11/7-20 からは、チュートリアルのあるときはそちらで説明。2回目からは何も出さない）
        }
      } else if (e.pattern === "edge") {
        // 端にかくれる: 半分だけ顔を出して、出たり引っこんだりしながら降りる
        e.y += (H + e.size * 2) / BATTLE.edgeFallTime * dt * e.spd;
        const show = Math.min(1, 0.45 + 0.65 * Math.sin(e.age * 1.2));   // 見えている割合（ときどき全部出てくる。全部出ている間だけ当たる）
        e.x = e.lane < 0.5 ? -e.w / 2 + e.w * show : W + e.w / 2 - e.w * show;
      } else if (e.pattern === "treeshade") {
        // 木のかげ: 地面といっしょに降りてきて、上のほうで止まって待つ。木が去ってしばらくしたら降りてくる
        const holdY = H * BATTLE.shadeHoldY;
        const treeGone = !e.tree || e.tree.y - e.tree.r > H;
        if (e.y < holdY) e.y += Math.max(sc, 0) * dt;   // 「コンベアが逆」のあいだは上へ戻らず、その場で待つ（10/31-13）
        else if (!treeGone || e.holdT < BATTLE.shadeWait) { if (treeGone) e.holdT += dt; }
        else e.y += (H + e.size * 2) / BATTLE.fallTime[e.role] * dt;
        e.x = e.bx;
      } else if (e.pattern === "cross") {
        // 横切る: 上のほうを横に通りすぎる
        const dir = e.lane < 0.5 ? 1 : -1;
        e.x += dir * (W + e.w + 20) / BATTLE.crossTime * dt * e.spd;
        e.y = H * BATTLE.crossY + Math.sin(e.age * 2) * 14;
      } else {
        e.y += (H + e.size * 2) / BATTLE.fallTime[e.role] * dt * e.spd;
        if (e.hold) e.y = Math.min(e.y, H * BATTLE.firstHoldY);   // ステージ1の救出の旅の1語目: 中ほどで止まって待つ
        if (evActive("gravity")) e.bx = Math.min(W - e.w / 2 - 20, Math.max(stripRight() + e.w / 2 + 20, e.bx + BATTLE.gravityDrift * dt));   // 出来事「重力が変わる」（世界3）: 右へ流される
        e.x = e.bx + Math.sin(e.age * BATTLE.swaySpeed + e.phase) * BATTLE.sway;
      }
      // ラストチャンスの引き寄せ（11/7-10・11/7-12）: ふわりから pullR px 以内のことば。空のことばは横だけ、ふわりの真上へ寄る（光が当たりやすくなる）。地上のことばは動かさない
      e.pulled = false;
      if (lastT > 0 && !e.ground && player.hp > 0) {
        const L = BATTLE.lastChance, dx = player.x - e.x, dy = player.y - e.y;
        if (Math.hypot(Math.max(0, Math.abs(dx) - e.w / 2), Math.max(0, Math.abs(dy) - e.h / 2)) < L.pullR) {
          e.pulled = true;
          const v = L.pullSpeed * dt;
          if (e.bx !== undefined && e.pattern !== "edge" && e.pattern !== "cross") { const m = Math.sign(dx) * Math.min(Math.abs(dx), v); e.bx += m; e.x += m; }
        }
      }
      // 弾を撃つ（画面の上のほうにいる間だけ）。1語目を待っているあいだと、ステージ1のお題では撃たない
      if (holdOn() || e.pattern === "odai") continue;   // お題の殻は odaiFire で順番に撃つ（11/1 決定）
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 0 && e.y < H * 0.62) {
        e.fire = BATTLE.enemyFireInterval[e.role] / P.fireRate / fireRamp() * (e.pattern === "odai" ? 3 : 1) * (0.8 + Math.random() * 0.4);
        fireAt(e.x, e.y + (e.ground ? 0 : e.h / 2), BATTLE.shotPattern[e.role] || [0], e.role);   // 殻から飛ぶ弾の色: ザコ＝赤紫、中ボス＝赤、大ボス＝濃い紫（10/25-7）
      }
    }

    odaiFire(dt);
    for (const b of odaiLater) b.t -= frozen() ? 0 : dt;
    for (const b of odaiLater.filter(b => b.t <= 0)) {
      if (b.aim) fireAt(b.x, b.y, [0], b.kind, false, b.speed);
      else ebullets.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, kind: b.kind });
    }
    odaiLater = odai ? odaiLater.filter(b => b.t > 0) : [];

    // 雑魚の動き
    for (const f of fillers) {
      if (f.les) {   // ステージ9の練習の虫（11/7-20）: 右下からゆっくり上がってきて、ふわりの横の、玉の通る輪のところで止まる（玉が当たる）。
        //   ふわりの高さまで来たところで止めて説明（下の帯の文字にかくれないように）。ぶつかっても元気は減らない
        f.flash = Math.max(0, f.flash - dt);
        //   11/7-28: 先に横へ寄って、ふわりの真下を通らない（ふわりの絵にかくれない）。ふわりが端にいるときは、反対の横へ。説明は、下のボタンの帯より上で、ふわりから横に40px以上はなれたとき（ふわりが虫を追いかけて、はなれないときは、ふわりの高さで2秒待ってから）
        const R0 = BATTLE.orbs.radius; let side = f.x >= player.x ? 1 : -1;
        if (player.x + side * R0 > W - 20 || player.x + side * R0 < stripRight() + 20) side = -side;
        const gx = player.x + side * R0, gy = player.y, v = BATTLE.lesson.rearSpeed * dt;
        f.x += Math.sign(gx - f.x) * Math.min(Math.abs(gx - f.x), v * 3); f.y += Math.sign(gy - f.y) * Math.min(Math.abs(gy - f.y), v);
        f.waitT = f.y <= gy + 1 ? (f.waitT || 0) + dt : 0;
        if ((Math.abs(f.x - player.x) >= 40 && f.y < H - 96) || f.waitT > 2) lesson("s9rear", { ty: H, target: f, done: () => f.hp <= 0 || !fillers.includes(f) });
        continue;
      }
      if (frozen()) { f.flash = Math.max(0, f.flash - dt); continue; }   // 時間止め: 虫も止まる
      f.age += dt;
      f.flash = Math.max(0, f.flash - dt);
      const def = FILLER_TYPES[f.type];
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.y > LES_TOP + f.r && f.layer === "air" && !f.rear && f.x > stripRight() + f.r + 20 && f.x < W - f.r - 20) lesson("bug", { ty: f.y, target: f, done: () => f.hp <= 0 || !fillers.includes(f) });   // チュートリアル: 最初の虫が画面に入った → 倒す（11/7-20）
      if (f.escort) {
        if (f.escort.hp > 0 && enemies.includes(f.escort)) {
          f.x = f.escort.x + f.dx + Math.sin(f.age * 2 + f.dx) * 4;
          f.y = f.escort.y + f.dy;
        } else {
          f.escort = null;   // 守る相手がいなくなったら、ふつうの綿毛おばけになる
        }
      } else if (moveOf(f.type) === "ladybug") {
        f.x += f.dir * 170 * BATTLE.fillerSpeed * (def.speed || 1) * dt;
        f.y = f.y0 + Math.sin(f.x / 60) * 28 + f.age * 6;
        f.ang = Math.atan2(Math.cos(f.x / 60) * 28 / 60 * f.dir, f.dir);
      } else if (moveOf(f.type) === "bee") {
        if (f.tx === null) { f.tx = player.x; f.turn = H * rand(0.38, 0.5); }
        if (!f.back) {
          f.y += 340 * BATTLE.fillerSpeed * (def.speed || 1) * dt;
          f.x += (f.tx - f.x) * 2 * dt;
          if (f.y > f.turn) { f.back = true; f.vx = (f.x < W / 2 ? 1 : -1) * 160; }
        } else {
          f.y -= 135 * BATTLE.fillerSpeed * dt; f.x += f.vx * BATTLE.fillerSpeed * dt;
        }
      } else if (moveOf(f.type) === "hover") {   // 近くまで降りて、とどまって、上へ帰る
        if (f.y < f.hy && !f.leave) f.y += Math.min(90, (f.hy - f.y) * 1.5 + 20) * dt;
        else if (!f.leave) { f.stayT -= dt; f.x += Math.sin(f.age * 1.2) * 30 * dt; if (f.stayT <= 0) f.leave = true; }
        else f.y -= 120 * dt;
      } else if (moveOf(f.type) === "ghost") {
        f.y += (f.rear ? -1 : 1) * H / 11 * BATTLE.fillerSpeed * (def.speed || 1) * dt;   // うしろから来たものは上へ
        f.x += Math.sin(f.age * 1.3) * 40 * dt;
      } else {
        f.y += sc * dt;     // 地上の雑魚は地面といっしょに流れる
        if (worldDef.id === 2) {   // 世界2の地上の雑魚（11/1 決定）: コンベアに乗って横にすべる。はしで折り返す。「コンベアが逆」では逆向き
          if (!f.slide) f.slide = f.x < W / 2 ? 1 : -1;
          f.x += f.slide * BATTLE.groundSlide * (evActive("reverse") ? -1 : 1) * convFast() * dt;
          const lo = stripRight() + f.r + 6, hi = W - f.r - 6;
          if (f.x < lo) { f.x = lo; f.slide = -f.slide; } else if (f.x > hi) { f.x = hi; f.slide = -f.slide; }
        }
      }
      if (def.wind && windOn()) f.x += windDirNow() * BATTLE.windStrength * 1.6 * dt;   // 夕暮れの虫は風に流される
      if (def.fire) {
        f.fire -= dt;
        if (f.fire <= 0 && f.y > 0 && f.y < H * 0.68) {
          f.fire = def.fire * BATTLE.fillerFireScale * fillerDense() / P.fireRate / fireRamp() * rand(0.8, 1.2);
          fireAt(f.x, f.y, def.spread || [0], undefined, def.keep);
        }
      }
    }

    // 世界3の光の玉（11/6-3）: 自機のまわりを回り、触れた空中の虫にダメージ。うしろから来た虫は、自機にぶつかると元気が減る
    if (orbsOn()) {
      if (!frozen() || (les && les.id === "s9rear")) orbAng += Math.PI * 2 / BATTLE.orbs.period * dt;   // ステージ9のチュートリアルのあいだも玉は回る
      for (let i = 0; i < orbFlash.length; i++) orbFlash[i] = Math.max(0, orbFlash[i] - dt);
      for (const f of fillers) {
        if (f.layer !== "air" || f.hp <= 0 || f.delay > 0) continue;
        if (f.les && !(les && les.id === "s9rear")) continue;   // 練習の虫は、説明が出るまで玉が当たらない（11/7-28）
        f.orbCd = Math.max(0, (f.orbCd || 0) - dt);
        const oi = f.orbCd <= 0 ? orbPos().findIndex(o => Math.hypot(o.x - f.x, o.y - f.y) < f.r + BATTLE.orbs.r) : -1;
        if (oi >= 0) { f.orbCd = BATTLE.orbs.cd; orbFlash[oi] = 0.3; Sound.se("orbHit"); damageFiller(f); }   // 当たった玉がはっきり光って、音が鳴る（11/6-6）
        if (f.rear && !f.les && f.hp > 0 && !frozen() && Math.hypot(f.x - player.x, f.y - player.y) < f.r + 14 && player.inv <= 0 && !showWord && !(odai && odai.intro > 0)) {
          f.hp = 0;   // ぶつかった虫は消える（点は入らない。＋100 も出さない）
          addPop(f.x, f.y, "#ffb0b8", 0.7);
          player.red = 0.5;   // 自機が赤く光る
          hurt();
        }
      }
    }

    // 自機の弾が空中の敵に当たったか（地上の敵には当たらない）
    // 天気: 風（自機が横に流される。指で動かしていても流される）
    if (windOn() && !(player.rising > 0) && !(odai && odai.intro > 0)) {
      const dx = windDirNow() * BATTLE.windStrength * dt;
      const nx = Math.min(Math.max(player.x + dx, 24), W - 24);
      if (drag) drag.px += nx - player.x;
      player.x = nx;
    }
    // 霧: お題バトルと大ボスのときは晴れる（語句が見えないと選べないため）
    const fogWant = (weatherOn("fog") || evActive("fog")) && !odai && phase !== "boss" ? 1 : 0;
    fogLevel += (fogWant - fogLevel) * Math.min(1, dt * 2);
    fogTopNow += ((evActive("fog") ? BATTLE.fogTopEvent : BATTLE.fogTop) - fogTopNow) * Math.min(1, dt * 1.5);   // 出来事「霧」: 霧が下まで濃くなる（11/1-3）
    for (const p of streaks) {   // 風・雨・雪の粒
      if (windOn()) { p.x += windDirNow() * 260 * p.s * dt; p.y += 20 * dt; }
      else if (weatherOn("rain")) { p.y += 520 * p.s * dt; p.x -= 40 * dt; }
      else if (weatherOn("snow")) { p.y += 50 * p.s * dt; p.x += Math.sin(t + p.s * 9) * 20 * dt; }
      if (p.x > W + 40) p.x = -40; if (p.x < -40) p.x = W + 40; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
    }

    // 障害物: 地面といっしょに流れる。自機がふれると被弾して、外へ押し出される
    for (const o of obs) {
      o.y += sc * dt;
      const d = Math.hypot(player.x - o.x, player.y - o.y), min = o.r + 16;
      if (d < min) {
        if (player.inv <= 0 && !showWord && !(odai && odai.intro > 0)) hurt();
        const k = min / Math.max(1, d);
        player.x = Math.min(Math.max(o.x + (player.x - o.x) * k, 24), W - 24);
        player.y = Math.min(Math.max(o.y + (player.y - o.y) * k, minPlayerY()), H - 40);
      }
    }
    obs = obs.filter(o => o.y - o.r < H + 20);
    const inObstacle = (x, y) => obs.some(o => !o.pinch && Math.hypot(x - o.x, y - o.y) < o.r);   // 出来事「はさまれる」の障害物は、通る道をせまくするだけ（光と弾はさえぎらない。11/1-3）

    // 雑魚に先に当たる（「雑魚のうしろ」の語句は、前の雑魚をどけないと弾が届かない）
    for (const s of shots) {
      let hit = false;
      if (inObstacle(s.x, s.y)) { s.y = -999; continue; }   // 木は弾をさえぎる
      for (const f of fillers) {
        if (f.layer !== "air" || f.hp <= 0 || f.delay > 0 || f.les) continue;   // 練習の虫は玉で倒す（光は通りぬける）
        if (Math.hypot(s.x - f.x, s.y - f.y) < f.r + (s.thick ? 10 : 4)) { hit = true; damageFiller(f); break; }
      }
      if (!hit) {
        for (const e of enemies.slice().sort((a, b) => b.y - a.y)) {   // 下にいる語句から当たる
          if (e.ground || e.hp <= 0 || !onScreen(e) || e.appearT > 0) continue;   // 画面に全部入るまで・入ってすぐの1秒は当たらない
          if (e.pattern === "odai" ? (odai && odai.intro > 0) : (e.role === "boss" && e.age < BATTLE.bossEnterTime)) continue;   // 読む時間・降りてくる間は当たらない
          if (odai && e.pattern !== "odai") continue;   // お題バトルの間、止まっているほかの語句には当たらない（上のほうで殻がほどけないように。10/25-8）
          const pad = (s.thick ? 6 : 0) + (e.pattern === "odai" ? 4 : BATTLE.wordHitPad);   // お題の語句は今のまま（となりの列に当たらないように）
          if (Math.abs(s.x - e.x) < e.w / 2 + pad && Math.abs(s.y - e.y) < e.h / 2) {
            if (e.vertical && !e.dummy) {   // 縦書き: 下から順に砕ける。砕けた文字のところは通りぬける
              const lp = lowestPart(e);
              if (!lp || s.y > e.y + lp.oy + e.charH / 2) continue;
            } else if (e.parts && !e.dummy && !partAt(e, s.x, s.thick ? 10 : 4)) continue;   // （中ボス・大ボスの文字ごとの当たりは今のまま）   // 砕けた文字のすきまは通りぬける
            hit = true;
            if (e.pattern === "odai") odaiHit(e, s);
            else { const a = shotDamage(e); damageWord(e, s.x, a); if (s.thick && e.hp > 0) damageWord(e, s.x, a); }   // 太い弾は2発分
            break;
          }
        }
      }
      if (hit) s.y = -999;
    }
    enemies = enemies.filter(e => e.hp > 0);

    // 下へ抜けた語句の敵
    for (const e of enemies) {
      const gone = e.y > H + e.size || (e.pattern === "cross" && e.age > 1 && (e.x < -e.w / 2 - 20 || e.x > W + e.w / 2 + 20));
      if (e.role !== "boss" && e.pattern !== "odai" && gone) {
        e.hp = 0;
        combo = 0;
        if (e.last) missed.push(e.word);   // 2周目に逃がした語句は、このバトルではもう取れない
      }
    }
    enemies = enemies.filter(e => e.hp > 0);
    // 画面の外へ出た雑魚
    fillers = fillers.filter(f => f.hp > 0 && f.y < H + 40 && f.y > -200 && f.x > -80 && f.x < W + 80);

    // 綿のたね（体力が回復する）
    for (const it of items) {
      it.age += dt;
      it.y += (sc * 0.7 + 12) * dt;
      if (!it.lesTried && it.y > LES_TOP + 14) { it.lesTried = true; lesson("seed", { ty: it.y, target: it, done: () => it.got || it.y >= H + 20 }); }   // チュートリアル: 初めてたねが落ちた → 拾う（11/7-20）。上の帯より下に来てから（11/7-28）
      if (Math.hypot(it.x - player.x, it.y - player.y) < 28) {
        it.got = true;
        player.hp = Math.min(maxHp(), player.hp + BATTLE.healItem);
        player.glow = 0.3;
        player.healFlash = 1;   // 体力ゲージが光って「+回復」
        post("say0", () => { fsay = { text: tx("rescue.thanks"), t: 1.2, small: true }; });   // ふわりが小さく（何か出ていれば出さない）
        Sound.se("item");
        addPop(it.x, it.y, "#fff8d0", 0.6);
      }
    }
    items = items.filter(it => !it.got && it.y < H + 20);

    // 敵の弾
    player.inv = Math.max(0, player.inv - dt);
    const R = BATTLE.enemyBulletHitR;
    for (const b of ebullets) {
      if (!frozen()) { b.x += b.vx * dt; b.y += b.vy * dt; }   // 時間止め: 弾も止まる
      if (inObstacle(b.x, b.y)) { b.y = H + 999; continue; }   // 敵の弾も木にさえぎられる
      if (player.inv <= 0 && !showWord && !(odai && odai.intro > 0) && !frozen() && Math.hypot(b.x - player.x, b.y - player.y) < R + 10) {   // 時間止めで止まっている弾には、ぶつからない（10/31-10 試作）
        b.y = H + 999;
        hurt();
      }
    }
    if (guardT > 0) {   // 無敵タイム（11/6-6）: 自機の大きな光にふれた虫と弾は消える
      const gr = BATTLE.skillGuardR;
      for (const b of ebullets) if (b.y < H + 20 && Math.hypot(b.x - player.x, b.y - player.y) < gr + R) { addPop(b.x, b.y, "#fff8d8", 0.4); b.y = H + 999; }
      for (const f of fillers) if (f.layer === "air" && f.hp > 0 && !(f.delay > 0) && Math.hypot(f.x - player.x, f.y - player.y) < gr + f.r) { f.hp = 1; damageFiller(f); }
    }
    ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  }

  function fireAt(x, y, pattern, kind, keep, speedMul) {
    const ang = Math.atan2(player.y - y, player.x - x);
    for (const da of pattern) {
      const sp = BATTLE.enemyBulletSpeed * P.bulletSpeed * (speedMul || 1);   // 難易度の線（bulletSpeed）。世界1のはじめはゆっくり
      ebullets.push({ x, y, vx: Math.cos(ang + da) * sp, vy: Math.sin(ang + da) * sp, kind, keep });
    }
  }

  // お題バトルの殻の弾（11/1 決定）: 3つ（2つ）の殻が順番に撃つ。1つの殻が撃つ間隔は前と同じなので、弾の総数は変えない
  let odaiLater = [];   // 少しあとに出る弾（ねらいの2発目・横ながしなど）
  function odaiFire(dt) {
    if (!odai || !BATTLE.odaiShellFire || holdOn() || frozen() || odai.intro > 0) return;
    const list = enemies.filter(e => e.pattern === "odai" && e.hp > 0 && e.y > 0 && e.y < H * 0.62 && !(e.againT > 0)).sort((a, b) => a.slot - b.slot);
    if (!list.length) return;
    odai.fireT = (odai.fireT === undefined ? 0.5 : odai.fireT) - dt;   // 読む時間のあと0.5秒で撃ち始める（前と同じ）
    if (odai.fireT > 0) return;
    const e = list[(odai.fireNo || 0) % list.length];
    odai.fireNo = (odai.fireNo || 0) + 1;
    const shape = odaiShape(e);
    odai.fireT = BATTLE.enemyFireInterval[e.role] / P.fireRate / fireRamp() * 3 * (0.8 + Math.random() * 0.4) / list.length
      * (BATTLE.odaiShots.gap[shape] || 1) * ((opts.stage && opts.stage.odaiGap) || 1) * (e.role === "boss" && opts.stage && opts.stage.bossGap || 1) * (worldDef.odaiGapMul || 1);   // odaiGapMul ＝ 世界ごとの倍率（11/3-3 決定: 世界2 0.8、世界3 0.65）   // bossGap ＝ 大ボスだけの倍率（11/1-4。ステージ12）   // 形ごとの間隔の倍率と、ステージごとの倍率（11/1）
  }
  // 大ボスの殻の残り（0〜1）: 「3つを順に」は3つの合計、ほかは正解のことば（11/3-3）
  function bossShellLeft() {
    const order = odai && odai.mode === "order";
    let hp = 0, max = 0;
    for (const e of enemies) {
      if (e.pattern !== "odai" || e.role !== "boss" || !e.parts || !(order || e.odaiReal)) continue;
      for (const p of e.parts) if (!p.deco) { hp += p.broken || e.open ? 0 : Math.max(0, p.hp); max += p.maxHp; }
    }
    return max > 0 ? hp / max : 1;
  }
  // 弾の形（stages.js の odaiShot: { mid: "aim", boss: "sweep" } など。配列なら順に交互）。扇 fan／ねらい aim／横ながし sweep／輪 ring／ななめ雨 rain
  function odaiShape(e) {
    const os = (opts.stage && opts.stage.odaiShot) || {}, S = BATTLE.odaiShots;
    let shape = (e.phase2 && BATTLE.boss2.shape) || (e.role === "boss" && os.boss2 && bossShellLeft() <= 0.5 && os.boss2) || os[e.role] || "fan";   // 大ボス2段階目は輪（11/1-4）。boss2 ＝ 殻が半分まで削れたあとの形（11/3-3）
    if (Array.isArray(shape)) { odai.shapeNo = (odai.shapeNo || 0) + 1; shape = shape[odai.shapeNo % shape.length]; }
    const pat = BATTLE.shotPattern[e.role] || [0], n = pat.length, y = e.y + e.h / 2;
    const sp = BATTLE.enemyBulletSpeed * P.bulletSpeed * (S.speed[shape] || 1);
    if (shape === "fan") { fireAt(e.x, y, pat, e.role); return shape; }
    if (shape === "ring") {   // 輪: 撃つ数をためて、ringN 発の輪にして広げる（総数は同じ）
      e.ringStock = (e.ringStock || 0) + n;
      if (e.ringStock < S.ringN) return shape;
      e.ringStock -= S.ringN;
      odai.ringA = (odai.ringA || 0) + Math.PI / S.ringN;   // 輪ごとに少し回す
      for (let i = 0; i < S.ringN; i++) { const a = odai.ringA + i * Math.PI * 2 / S.ringN; ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: e.role }); }
      return shape;
    }
    for (let i = 0; i < n; i++) {
      if (shape === "aim") odaiLater.push({ t: i * S.aimGap, aim: true, x: e.x, y, kind: e.role, speed: S.speed.aim });   // ねらい: ふわりに向けて1発ずつ
      else if (shape === "sweep") {   // 横ながし: 左から右へ、列を1つずつずらして、まっすぐ落ちる
        const L = stripRight() + 20, R = W - 20, c = (odai.sweepNo = ((odai.sweepNo || 0) + 1)) % S.sweepCols;
        odaiLater.push({ t: i * S.sweepGap, x: L + (R - L) * c / (S.sweepCols - 1), y, vx: 0, vy: sp, kind: e.role });
      } else if (shape === "rain") {   // ななめ雨: 問題文の帯のすぐ下から、ななめに降る（向きは交互）
        odai.rainNo = (odai.rainNo || 0) + 1;
        const dir = odai.rainNo % 2 ? 1 : -1, x = stripRight() + 10 + Math.random() * (W - stripRight() - 20);
        const vy = sp / Math.hypot(1, S.rainSlant);
        odaiLater.push({ t: i * S.sweepGap, x, y: odaiTop() + 8, vx: dir * vy * S.rainSlant, vy, kind: e.role });
      }
    }
    return shape;
  }

  // 地上の的（地上の語句と、地上の雑魚）
  // 語句の敵が画面に全部入っているか（入るまでは弾が当たらない）
  function onScreen(e) {
    return e.x - e.w / 2 >= 0 && e.x + e.w / 2 <= W && e.y - e.h / 2 >= 0 && e.y + e.h / 2 <= H;
  }
  // 地上のことばの「隠れる」「動く」（10/31-13 決定 B改）: stages.js の groundPlay（地上のことばの出る順に "hide"／"move"／"both"）
  function groundPlayOf(word) {
    const gp = opts.stage && opts.stage.groundPlay;
    return gp ? gp[script.filter(w => groundIds.has(w.id)).indexOf(word)] || null : null;
  }
  const gHides = e => e.gplay === "hide" || e.gplay === "both";
  const gMoves = e => e.gplay === "move" || e.gplay === "both";
  const gHidden = e => gHides(e) && e.hideT >= BATTLE.hideOut && e.hideT < BATTLE.hideOut + BATTLE.hideIn;   // 隠れているあいだは、光が届かない。隠れるのは1回だけ（11/7-8 決定。前は くり返した）
  const gEdges = e => { const lo = Math.max(stripRight(), BATTLE.groundEdge) + e.w / 2, hi = W - BATTLE.groundEdge - e.w / 2; return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2]; };   // はしの60pxに入らない中心の範囲（長いことばは まん中）
  const stayOf = () => worldDef.id >= 2 ? BATTLE.stayW23 : 1;   // ことばが画面にいる時間の倍率（11/7-8）
  // そのステージで初めて「隠れる」「動く」ことばが出た瞬間に1行（stages.js の groundIntro: "hide" ステージ6／"move" ステージ7）
  function groundIntroHint(e) {
    const k = opts.stage && opts.stage.groundIntro;
    if (!k || groundIntroShown || !(k === "hide" ? gHides(e) : gMoves(e))) return;
    groundIntroShown = true;
    const text = tx("groundIntro." + k);
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime }; slow = Math.max(slow, BATTLE.hintSlow); });
  }
  function groundTargets() {
    // ステージ5のチュートリアルの地上のことばは、説明が出るまで爆弾が当たらない（11/7-20）
    //   （11/7-23: この説明が式の途中の行末に入っていて、うしろの「地上の雑魚」の .concat まで説明あつかいで消えていた。地上の雑魚に爆弾が出なかった）
    return enemies.filter(e => e.ground && e.hp > 0 && onScreen(e) && !(e.appearT > 0) && !gHidden(e) && !(e.hold && !e.lesTried && lessonOn("s5ground")))
      .concat(fillers.filter(f => f.layer === "ground" && f.hp > 0 && f.y > 0));
  }
  function inReach(g, x, y, r) {
    if (g.word) return Math.abs(x - g.x) < g.w / 2 + r && Math.abs(y - g.y) < g.h / 2 + r;
    return Math.hypot(x - g.x, y - g.y) < g.r + r;
  }
  // たねが地面に届いた: ぽんっと花が咲いて、まわりの地上の敵に当たる
  // 世界3の光の玉（11/6-3）
  function orbsOn() { return worldDef.id === 3 && state === "play" && phase !== "round1" && !(player.rising > 0); }
  function orbPos() {
    const O = BATTLE.orbs, out = [];
    for (let i = 0; i < O.n; i++) { const a = orbAng + i * Math.PI * 2 / O.n; out.push({ x: player.x + Math.cos(a) * O.radius, y: player.y + Math.sin(a) * O.radius }); }
    return out;
  }
  function landBomb(x, y, n = 1, pair) {
    blasts.push({ x, y, age: 0 });   // 爆発の輪が広がる（11/6-3）
    Sound.se("seedPop");
    for (const g of groundTargets()) {   // （隠れていることばは groundTargets に入らない）
      if (!inReach(g, x, y, BATTLE.bombRing)) continue;
      if (pair) { if (pair.hit.has(g)) continue; pair.hit.add(g); }
      if (!g.word) { damageFiller(g); continue; }
      g.seedAcc = (g.seedAcc || 0) + n;   // 1個の威力は端数なので、たまった分だけ削る（11/2）
      while (g.seedAcc >= 1 - 1e-6 && g.hp > 0) { g.seedAcc -= 1; damageWord(g, x); }
    }
  }

  // x の位置にある、まだ砕けていない文字（near: ゆるめる幅）
  function partAt(e, x, near) {
    return e.parts.find(p => !p.broken && !p.deco && Math.abs(x - (e.x + p.ox)) < p.cw / 2 + near);
  }

  // 縦書きの語句で、いちばん下に残っている文字
  function lowestPart(e) {
    let best = null;
    for (const p of e.parts) if (!p.broken && !p.deco && (!best || p.oy > best.oy)) best = p;
    return best;
  }

  // 空中のザコの語句の硬さは、今の自機の弾の本数に比例（10/3-8）: 弾1本で P.zakoHp 発、2本でその2倍…（太い弾は2本分）
  // 硬さを本数倍にするかわりに、1発で削る量を「1 ÷ 本数」にしている。こうすると、とちゅうで強くなっても弱くなっても
  // 「何回の連射でこわれるか」が変わらない（強くなっても手ごたえが同じ）。地上の語句（たねで倒す）は今のまま
  function shotUnits() {
    return level.spread.length + level.thick.length;   // 太い光は2本分
  }
  const shotDamage = e => (e.role === "zako" && !e.ground && BATTLE.zakoHpByShots) ? BATTLE.shotPower / shotUnits() : 1;   // 1発で削る量（パワーの初期値はここで2割下げる）

  function damageWord(e, hitX, amt = 1) {
    if (e.againT > 0) return;   // 大ボス2段階目の殻が戻っているところ（11/1-4）
    e.flash = 0.12;
    if (e.parts) {
      // 当たった文字（なければ、いちばん近い文字）を削る。縦書きは、いちばん下の文字
      let p = e.vertical ? lowestPart(e) : (hitX === undefined ? null : partAt(e, hitX, 0));
      if (!p) {
        const alive = e.parts.filter(q => !q.broken && !q.deco);
        const hx = hitX === undefined ? e.x : hitX;
        p = alive.sort((a, b) => Math.abs(hx - (e.x + a.ox)) - Math.abs(hx - (e.x + b.ox)))[0];
      }
      if (!p) return;
      p.hp--;
      p.flash = 0.12;
      if (e.role === "boss") bossCheer(e);
      if (p.hp > 0) { Sound.se("hit"); return; }
      // 文字が砕ける: その文字の読みが鳴る
      p.broken = true;
      breakPart(e, p);
      e.hp--;
      if (e.hp <= 0 && e.order && odai && odai.mode === "order") { orderOpen(e); return; }   // 「3つを順に」: 殻を削りきったら、ほどけて番号（11/2-2）
      if (e.hp <= 0 && e.role === "boss" && !e.dummy && (e.pattern !== "odai" || e.odaiReal) && opts.stage && opts.stage.bossTwoStep && !e.phase2) { bossAgain(e); return; }
      if (e.hp <= 0) defeat(e);
      return;
    }
    e.hp -= amt;
    if (e.hp < 1e-6) e.hp = 0;   // 1/3 などを足したときの、こまかい誤差を消す
    if (hasShell(e) && Math.random() < 0.6) {   // 光が当たると、まゆの毛羽が少し散る
      const hx = hitX === undefined ? e.x : Math.min(e.x + e.w / 2, Math.max(e.x - e.w / 2, hitX));
      threads.push({ x: hx, y: e.y + e.size * 0.4, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 40, len: 4, curl: 1, rot: Math.random() * 6, color: "#ffffff", age: 0, scatter: 9, sparkle: true });
    }
    Sound.se("hit");
    if (e.hp <= 0) defeat(e);
  }

  // 大ボス2段階（11/1-4 決定 ステージ12）: 1段階目の殻がほどけたら、ことばが光って殻が戻る（硬さ0.7倍）。弾の形が変わる
  function bossAgain(e) {
    e.phase2 = true; e.flash = 0.8; e.againT = BATTLE.boss2.fxTime;   // 殻が戻るあいだ（fxTime 秒）は、光が効かず、撃たない
    for (const p of e.parts) if (!p.deco) { p.maxHp = Math.max(1, Math.round(p.maxHp * BATTLE.boss2.hp)); p.hp = 1; p.broken = false; p.flash = 0.6; }
    e.hp = e.maxHp;
    e.ringStock = 0;
    for (let i = 0; i < 3; i++) addPop(e.x + rand(-20, 20), e.y + rand(-e.h / 2, e.h / 2), "#fff6c8", 1.6, true);
    againFx = { age: 0 };
    Sound.se("odai");
  }
  function drawAgainFx() {
    const k = againFx.age / BATTLE.boss2.fxTime, pop = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(1, (k - 0.12) / 0.2) * 0.1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.font = font(40); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const fit = Math.min(1, (W - 24) / ((ctx.measureText(tx("rescue.bossAgain")).width + 20) * 1.1));   // 画面の幅に収める
    ctx.translate(W / 2, H * 0.5); ctx.scale(pop * fit, pop * fit);
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.strokeText(tx("rescue.bossAgain"), 0, 0);
    ctx.fillStyle = "#7a3cc0"; ctx.fillText(tx("rescue.bossAgain"), 0, 0);
    ctx.restore();
  }
  function breakPart(e, p) {
    const px = e.x + p.ox, py = e.y + (p.oy || 0);
    shellBits(e, p);
    floats.push({ x: e.vertical ? px + e.size : px, y: e.vertical ? py : e.y - e.size * 0.9, text: p.kana, big: true, kana: true, age: 0 });
    Sound.se("crack");
    if (p.kana !== "ー" && BATTLE.speakWords) Sound.speak(p.kana);
  }
  function shellBits(e, p) {   // 殻のかけらが散る
    const px = e.x + p.ox, py = e.y + (p.oy || 0);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 110;
      threads.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 5 + Math.random() * 6,
        curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6, color: (SHELL[e.role] || SHELL.zako).bit, age: 0, scatter: 9, sparkle: true });
    }
  }
  // ===== お題バトル =====
  // ダミー2つ: 同じステージのほかの語句（大ボス以外）から、本物と文字数が近いものを2つ（ステージごとに毎回同じ）
  function odaiDummies(real, skip) {
    const len = w => baseChars(w).length;
    return opts.words.filter(w => w !== real && w !== bossWord && w !== skip)   // skip ＝「次は？」の1つ前の工程（選ぶことばに入れない。10/31-10 試作）
      .sort((a, b) => Math.abs(len(a) - len(real)) - Math.abs(len(b) - len(real)) || patOf(a).order - patOf(b).order)
      .slice(0, 2);
  }

  // 問題文を折り返す
  // 折り返し（10/21-2）: ブラウザの日本語の区切り（Intl.Segmenter）で、ことばの途中では折り返さない。使えない端末では1文字ずつ
  const segmenter = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("ja", { granularity: "word" }) : null;
  const NO_HEAD = "、。，．！？!?」』）)ーっゃゅょッャュョ…";   // 行の頭に来ないようにする文字（前の行にぶら下げる）
  const PARTICLES = new Set(["を", "は", "が", "に", "の", "と", "で", "へ", "も", "や", "よ", "ね", "て", "た", "か", "な"]);   // 助詞なども前の行に
  function wrapText(text, maxW, rs) {
    let pieces = segmenter ? Array.from(segmenter.segment(text), x => x.segment) : Array.from(text);
    pieces = pieces.reduce((m, pc) => { if (m.length && /[0-9０-９]$/.test(m[m.length - 1]) && !/^\s/.test(pc)) m[m.length - 1] += pc; else m.push(pc); return m; }, []);   // 数字と、すぐあとの語（「3つ」「10枚」など）は折り返さない（11/7-24）
    if (rs && rs.length) {   // ふりがなのついた語の途中では折り返さない（11/7-18）
      const merged = []; let at = 0;
      for (const pc of pieces) { if (merged.length && rs.some(([p, l]) => p < at && p + l > at)) merged[merged.length - 1] += pc; else merged.push(pc); at += pc.length; }
      pieces = merged;
    }
    const lines = []; let line = "";
    for (const pc of pieces) {
      if (ctx.measureText(line + pc).width <= maxW || !line || NO_HEAD.includes(pc[0]) || PARTICLES.has(pc)) { line += pc; continue; }
      if (ctx.measureText(pc).width > maxW) {   // かたまりが1行より長い: 1文字ずつ
        for (const ch of Array.from(pc)) {
          if (ctx.measureText(line + ch).width > maxW && line && !NO_HEAD.includes(ch)) { lines.push(line); line = ch; } else line += ch;
        }
        continue;
      }
      lines.push(line); line = pc;
    }
    if (line) lines.push(line);
    return lines;
  }
  // 小さく出したときの問題文の帯の位置（集めたことばの帯の下）
  // 問題文の大きさを、長さに合わせて決める: いちばん上の大きさから、行数の上限に収まるまで小さくする
  // 10/25-3: 行数（maxLines）に収まり、どの行も幅（width）からはみ出さない大きさまで小さくする。いちばん下は 14px。
  // 14px でも maxLines に入らないときだけ、行数を odaiMaxLines（3行）まで許す（それでも入らなければ odaiMinFont まで小さく）
  // 11/7-18: ふりがな（ルビ）があるときは、行の上にルビの高さ（rf）をあける。rs ＝ Ruby.spans の結果
  function fitOdaiText(text, maxFont, width, maxLines) {
    const rs = Ruby.spans(text);
    const fits = (fs, n) => { ctx.font = font(fs); const ls = wrapText(text, width, rs); return ls.length <= n && ls.every(l => ctx.measureText(l).width <= width) ? ls : null; };
    const out = (fs, lines) => { const rf = rs.length ? Math.max(9, Math.round(fs * 0.46)) : 0; return { fs, lines, lh: Math.round(fs * 1.38) + rf, rf, rs }; };
    const want = maxLines || BATTLE.odaiMaxLines;
    for (let fs = maxFont; fs >= BATTLE.odaiFitFont; fs--) { const ls = fits(fs, want); if (ls) return out(fs, ls); }
    for (let fs = BATTLE.odaiFitFont; fs >= BATTLE.odaiMinFont; fs--) { const ls = fits(fs, BATTLE.odaiMaxLines); if (ls) return out(fs, ls); }
    ctx.font = font(BATTLE.odaiMinFont);
    return out(BATTLE.odaiMinFont, wrapText(text, width, rs));
  }
  // 行を左そろえで描き、ふりがなを漢字の上に小さく描く（textBaseline は top）。y0 ＝ 1行目のルビの上
  function drawRubyLines(f, x, y0) {
    let at = 0;
    f.lines.forEach((l, i) => {
      const ty = y0 + i * f.lh + f.rf;
      ctx.font = font(f.fs); ctx.fillText(l, x, ty);
      const style = ctx.fillStyle;
      for (const [p, n, r] of f.rs) {
        if (p < at || p + n > at + l.length) continue;
        ctx.font = font(f.fs);
        const bx = x + ctx.measureText(l.slice(0, p - at)).width, bw = ctx.measureText(l.slice(p - at, p - at + n)).width;
        ctx.font = font(f.rf); ctx.textAlign = "center"; ctx.fillStyle = "#6b7a5a";
        ctx.fillText(r, bx + bw / 2, ty - f.rf - 1);
        ctx.textAlign = "left"; ctx.fillStyle = style;
      }
      at += l.length;
    });
    ctx.font = font(f.fs);
  }
  function odaiPanel() {
    const y = 40;   // 上の体力ゲージ・点数の下
    const f = fitOdaiText(odai ? odai.q : "", BATTLE.odaiSmallFont, W - stripRight() - 42, BATTLE.odaiPanelLines);   // 枠の中に2行（内側の幅）
    return { y, f, lines: f.lines, fs: f.fs, lh: f.lh, h: f.lines.length * f.lh + 14 };
  }
  function odaiTop() { const p = odaiPanel(); return p.y + p.h; }

  // 「次は？」にする中ボスと、その1つ前の工程（stages.js の nextAsk に書いた中ボスだけ。10/31-12 決定: 1つ前の工程は nextAsk に書く）
  const nextAskOf = real => { const a = opts.stage && opts.stage.nextAsk && opts.stage.nextAsk[real.word]; return a ? (typeof a === "string" ? { prev: a } : a) : null; };
  // 「次は？」の2択の相手（10/31-13 決定）: nextAsk の after（工程の順で1つあとのことば）。書いていないときは、同じステージの文字数が近いことば1つ（1つ前の工程は入れない）
  //   after が大ボスのことばや、ほかのステージのことばのときは、そのことばだけの仮の敵（カードにはならない）
  function nextAfter(real, prev) {
    const a = nextAskOf(real).after;
    if (!a) return odaiDummies(real, prev)[0] || null;
    const w = opts.words.find(x => x.word === a);
    return w && w !== bossWord ? w : { id: -130, stage: real.stage, word: a, kana: w ? w.kana : Ruby.kana(a), hp: 1, role: "zako", order: 0 };
  }
  function nextPrev(real) {
    const a = nextAskOf(real);
    return a ? opts.words.find(w => w.word === a.prev) || { id: -120, stage: real.stage, word: a.prev, kana: Ruby.kana(a.prev), hp: 1, role: "zako", order: 0 } : null;
  }
  // 大ボス「3つを順に」（世界2。10/31-10 試作。構想メモ 5）: stages.js の bossOrder に書いた3つのことば（正しい順。その中に大ボスのことばがあるときだけ。10/31-12 決定）
  //   3つのことばに正しい順に光を当てる（当てたことばに 1・2・3）。順をまちがえたら3つとも最初にもどり、正しい順を一度だけ見せる
  //   11/2 決定: 正しい順に当てたことばは、その場で殻（いばら）がほどけて文字がはっきり読める（e.open）。3つ目で全部ほどけたら、大ボスのことばが助かる
  //   順をまちがえたら、ほどけた殻が戻り、番号も消える。問題文は texts.js の odaiForm.orderLead（ステージごと）
  function orderSet(real) {
    const toks = (opts.stage && opts.stage.bossOrder) || [];
    if (toks.length !== 3 || !toks.includes(baseChars(real).join(""))) return null;
    return toks.map((tk, i) => tk === baseChars(real).join("") ? real : (opts.words.find(w => w.word === tk) || { id: -100 - i, stage: real.stage, word: tk, kana: Ruby.kana(tk), hp: 1, role: "zako", order: 0 }));
  }
  // 世界3「どっち？」（10/31-10 試作）: stages.js の which: true のステージで、choices が2つ、1つ目が本物のことば（かっこの中をのぞいて同じ）のときだけ。
  //   2つ目のことばを、もう1つの候補にする（同じステージにあることばなら、それを使う）。そうでないときは世界1と同じ「どれ？」
  const plainWord = c => String(c).replace(/[（(][^）)]*[）)]/g, "").trim();
  //   11/7-11 決定: 世界1・2もすべて、正解の語とCSVの「はずれ」の2択（自動で選ぶ odaiDummies は使わない）。ボスの問い（bossQ）のある中ボスは、はずれも bossMiss
  function whichPair(real) {
    const ch = real.choices || [];
    const other = real.bossQ && real.bossMiss ? real.bossMiss : ch.length === 2 && plainWord(ch[0]) === real.word ? plainWord(ch[1]) : null;
    if (!other) return null;
    return opts.words.find(w => w.word === other) || { id: -110, stage: real.stage, word: other, kana: Ruby.kana(other), hp: 1, role: "zako", order: 0 };
  }
  // 場面の曲へ替える（11/7-21 から: 前の曲を0.3秒で止め、0.4秒の無音のあと次の曲。js/audio.js の MUSIC_SWITCH）
  function music(scene) {
    Sound.fadeTo(scene, 0.5);   // 場面（explore／rescue／odai）で、その世界の mp3 をえらぶ（11/7-4）
  }
  function startOdai(real, isBoss) {
    if (phase !== "round1") fillGauge();   // 中ボス・大ボスが出た瞬間に、ゲージが満タン（11/6-6）
    const role = isBoss ? "boss" : "mid";
    const seq = isBoss && orderSet(real);   // 大ボス「3つを順に」
    const prev = !isBoss && !real.bossQ && nextPrev(real);   // ボスの問いのある中ボスは「次は？」にしない（11/7-11）   // 中ボス「次は？」（世界2。10/31-10 試作）: 1つ前の工程
    const pair = !seq && !prev && whichPair(real);   // 世界3「どっち？」
    const after = prev && nextAfter(real, prev);   // 「次は？」は2択（10/31-13 決定）: 正解と、工程の順で1つあとのことば
    const cands = seq ? shuffle(seq.slice()) : pair ? shuffle([real, pair]) : after ? shuffle([real, after]) : shuffle([real, ...odaiDummies(real, prev)]);   // ならびは毎回入れかえ
    // 3つとも同じ大きさ（いちばん長い語句が、縦書きで画面に入る大きさ。24px より小さくしない）
    clearMsgs(9); msgQ = [];   // お題が始まるときは、出ているメッセージと待っているものを、すべて消してから問題文を出す
    const q = seq ? (real.bossQ ? real.bossQ + tx("odaiForm.orderTail") : tx("odaiForm.orderLead." + opts.stage.id)) : pair && real.bossQ ? real.bossQ : pair ? (/は[?？]\s*$/.test(real.question) ? real.question.replace(/[?？]\s*$/, "") + tx("odaiForm.which") : real.question) :   /* 「〜は？」だけ「〜はどっち？」に。「何という？」などはそのまま（11/7-11） */ prev ? tx("odaiForm.next", { prev: prev.word }) : (real.odaiQuestion || real.question);
    // 問題文を読む時間（10/25-16）: 文の長さに合わせる。1文字あたり odaiReadPerChar 秒＋odaiReadBase 秒（最短 odaiReadMin、最長 odaiReadMax）
    const read = Math.min(BATTLE.odaiReadMax, Math.max(BATTLE.odaiReadMin, Array.from(q).length * BATTLE.odaiReadPerChar + BATTLE.odaiReadBase));
    odai = { real, boss: isBoss, t: 0, intro: read, firstHit: null, q, wrongRun: 0, mode: seq ? "order" : "pick", step: 0, show: 0, slip: false, seq: seq || null, cols: pair || after ? 2 : 3 };
    music("odai");   // お題バトルの曲へ（11/3-4）
    // 案内: 最初のお題は、問題文の下に1行そえて、読む時間を少しのばす（順番待ちにはのせない。お題がいちばん大事なため）
    // （ステージ1の最初のお題の、問題文の下の1行は 11/7-20 にやめた。読む時間のあとのチュートリアルで説明する）
    const longest = Math.max(...cands.map(w => Array.from(w.word).length));
    const room = H * 0.66 - odaiTop() - 30;   // 問題文の帯の下から、自機の上まで
    const size = Math.round(Math.max(24, Math.min(BATTLE.fontSize[role], Math.floor(room / (longest * 1.12)))) * BATTLE.odaiTextScale);   // 11/1 決定: 0.8倍
    cands.forEach((w, i) => spawn(w, { role, size, slot: i, real: w === real, order: !!seq }));
    if (seq) for (const e of enemies) if (e.pattern === "odai") { e.seqNo = seq.indexOf(e.word); e.dummy = true; e.num = 0; }   // 3つを順に: 正しい順のことばだけ削れる（orderHit）
    // お題のあいだは、雑魚と雑魚の弾を出さない（10/3-12）。始まる瞬間に画面の雑魚と弾を消す（殻から飛ぶ弾は、読む時間が終わってから）
    fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
    fillers = []; ebullets = []; odaiLater = [];
    slow = odai.intro;   // 吸い込みと同じスロー。読む時間をつくる（10/25-16: 読む時間の長さに合わせる。前は最初のお題の案内でのばした分が消えていた）
    // （「お題だよ！」の一言は、問題文と重なるので出さない。説明はチュートリアルで。10/7-1）
    Sound.se("odai");
  }

  // お題の語句に弾が当たった
  function odaiHit(e, s) {
    if (odai.mode === "order") { orderHit(e, s); return; }
    // 11/1 決定: 「どれ？」「次は？」「どっち？」も、同じことばに orderHitGap 秒以内に続けて orderHits 発当たってから数える（横切った光では、まちがいにならない）。
    // 同じ瞬間に当たった光（パワーの2本・3本）は1発と数える。続けて当てているあいだは、そのあとの光はみな数える
    if (e.hitT !== t) {
      if (t - (e.hitT || -9) > BATTLE.orderHitGap) e.hitN = 0;
      e.hitT = t; e.hitN = (e.hitN || 0) + 1;
    }
    if (e.hitN < BATTLE.orderHits) { e.flash = 0.12; Sound.se("hit"); return; }
    if (odai.firstHit === null) {
      odai.firstHit = e.dummy ? "dummy" : "real";
      if (!e.dummy) {   // 最初から本物: ひらめき
        score += BATTLE.odaiBonus;
        floats.push({ x: e.x, y: e.y - e.size - 10, text: `ひらめき！ +${BATTLE.odaiBonus}`, big: true, age: 0 });
        Sound.se("hirameki");
      }
    }
    if (!e.dummy) { odai.wrongRun = 0; damageWord(e, s.x); return; }
    // ダミー: 弾がはね返る。少し減点（コンボは切らない）
    e.flash = 0.12;
    bounces.push({ x: s.x, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 120, vy: 320, age: 0 });
    if (t - e.penaltyAt >= BATTLE.odaiPenaltyCool) {   // 間違いなので減点（同じダミーで続けては減らさない）
      e.penaltyAt = t;
      score = Math.max(0, score - BATTLE.odaiPenalty);
      floats.push({ x: e.x, y: e.y - e.size, text: `−${BATTLE.odaiPenalty}`, big: true, wrong: true, age: 0 });
      Sound.se("boing");
      // 10/25-16: 「ちがうよ」を画面の中ほどに大きく。そのことばは赤く点滅。続けて3回ちがったら、ふわりが一言
      wrongFx = { age: 0 }; e.wrongT = BATTLE.odaiWrongTime;
      odai.wrongRun++;
      if (odai.wrongRun >= BATTLE.odaiWrongRun) { odai.wrongRun = 0; fsay = { text: tx("rescue.odaiReread"), t: BATTLE.fuwariSayTime }; }   // お題のあいだは順番待ちが止まるので、直接出す
    }
  }

  // 大ボス「3つを順に」で、ことばに光が当たった（11/2-2 決定: 正しい順に1つずつ殻を削りきってほどく）
  function orderHit(e, s) {
    if (e.open || odai.show > 0) { bounces.push({ x: s.x, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 120, vy: 320, age: 0 }); return; }   // もうほどけた・正しい順を見せているあいだ
    if (e.seqNo === odai.step) { e.hitN = 0; odai.goodT = t; damageWord(e, s.x); return; }   // 正しい順のことば: 殻を削る
    // 正しい順のことばに当てていたすぐあと（orderGoodHold 秒）は、広がった光や、弾をよけたときの光がとなりのことばに当たっても、まちがいにしない
    if (t - (odai.goodT === undefined ? -9 : odai.goodT) <= BATTLE.orderGoodHold) { e.hitN = 0; bounces.push({ x: s.x, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 120, vy: 320, age: 0 }); return; }
    // 順がちがうことば: 光は自動で出るので、となりの列へ動くとちゅうに横切ってしまう。続けて orderHits 発当てたときだけ「まちがい」にする
    if (e.hitT === t && e.hitN) return;   // 同じ瞬間に当たった光（パワーの2本・3本）は1発と数える（11/1）
    if (t - (e.hitT || -9) > BATTLE.orderHitGap) e.hitN = 0;
    e.hitT = t; e.hitN = (e.hitN || 0) + 1; e.flash = 0.12;
    if (e.hitN < BATTLE.orderHits) { Sound.se("hit"); return; }
    e.hitN = 0;
    // まちがい: 3つとも最初にもどして（ほどけた殻が戻り、番号も消える）、正しい順を一度だけ見せる。減点は世界1のダミーと同じ
    odai.slip = true;
    if (t - e.penaltyAt >= BATTLE.odaiPenaltyCool) {
      e.penaltyAt = t;
      score = Math.max(0, score - BATTLE.odaiPenalty);
      floats.push({ x: e.x, y: e.y - e.size, text: `−${BATTLE.odaiPenalty}`, big: true, wrong: true, age: 0 });
      Sound.se("boing");
      wrongFx = { age: 0, text: tx("odaiForm.orderWrong") }; odai.answered = true; e.wrongT = BATTLE.odaiWrongTime;
    }
    for (const q of enemies) {   // ほどけた殻だけ戻る（削っているとちゅうのことばは、削ったぶんを残す）
      if (!q.order || q.hp <= 0 || !q.open) continue;
      addPop(q.x, q.y, "#d8e6b0", 0.8);
      for (const p of q.parts || []) if (!p.deco) { p.broken = false; p.hp = p.maxHp; }
      q.hp = q.maxHp; q.num = 0; q.open = false;
    }
    odai.step = 0; odai.show = 1.8;
  }
  // 「3つを順に」: 正しい順のことばの殻を削りきった。ほどけて番号がつく。3つ目で大ボスのことばが助かる
  function orderOpen(e) {
    odai.answered = true;   // チュートリアル（11/7-24）: 順番のお題に答えた
    odai.step++; e.num = odai.step; e.open = true; e.hp = 1; e.flash = 0.3;   // （hp は残す: まちがえたときに殻を戻すため）
    floats.push({ x: e.x, y: e.y - e.h / 2 - 16, text: String(e.num), big: true, age: 0 });
    Sound.se("shine");
    if (odai.step < 3) return;
    if (!odai.slip) { score += BATTLE.odaiBonus; floats.push({ x: W / 2, y: H * 0.45, text: `ひらめき！ +${BATTLE.odaiBonus}`, big: true, age: 0 }); Sound.se("hirameki"); }
    let real = null;
    for (const q of enemies) {
      if (!q.order || q.hp <= 0) continue;
      if (q.word === odai.real) { real = q; continue; }
      vanish.push({ word: q.word, x: q.x, y: q.y, size: q.size, w: q.w, ground: false, age: 0 }); q.hp = 0;
    }
    odai.firstHit = "done";
    if (real) { real.dummy = false; for (const p of real.parts || []) p.broken = true; real.hp = 0; defeat(real); }
    enemies = enemies.filter(q => q.hp > 0);
  }

  // お題バトルの終わり。ok: 本物を吸い込んだ／false: 時間切れ（取り逃がし）
  function endOdai(ok) {
    for (const e of enemies) {
      if (e.pattern !== "odai" || e.hp <= 0) continue;
      if (!ok && e.odaiReal) { missed.push(e.word); combo = 0; }
      vanish.push({ word: e.word, x: e.x, y: e.y, size: e.size, w: e.w, ground: false, age: 0 });
      if (!e.odaiReal || !ok) e.hp = 0;
    }
    enemies = enemies.filter(e => e.hp > 0);
    if (!odai.boss) music("rescue");   // 救出の旅の曲へもどる（大ボスのあとは結果の画面の曲）
    odai = null;
    if (!ok) post("say", () => { fsay = { text: tx("rescue.odaiLost"), t: 2 }; });
  }

  // ゲージ（11/6-6 決定）: 虫を倒す・ことばを取り戻す・被弾する、でたまる（ゲージ2倍速なら2倍）。中ボス・大ボスが出た瞬間は満タン
  function addGauge(v) {
    if (phase === "round1") return;
    const before = gauge;
    gauge = Math.min(100, gauge + v * gaugeMul);
    if (before < 100 && gauge >= 100) { skillUse.fullAcc++; if (skillUse.firstAcc < 0) skillUse.firstAcc = rescueT; bombReady(); firstFullSay(); }
  }
  function fillGauge() { if (gauge < 100) { gauge = 100; skillUse.fullBoss++; bombReady(); firstFullSay(); } }
  // ゲージが初めて満タンになったとき（そのステージで1回だけ）: ふわりの一言で巻き戻しを教える（11/7-9 決定）
  function firstFullSay() {
    if (rewindSaid || rewindUsed) return;
    rewindSaid = true; rewindHintWait = true;   // ほかの表示（助けたことば・案内など）が消えてから出す（順番待ちで捨てられないように）
  }
  // 必殺ワザを使う（11/6-6 決定）: ゲージを全部使う
  function useSkill(id) {
    if (!skillOk(id)) return;
    gauge = 0;
    bombsUsed++; skillUse[id]++;
    post("say", () => { fsay = { text: tx("skills.say." + id), t: 1.5 }; });
    Sound.se("light");
    player.glow = 0.35;
    if (id === "guard") { guardT = BATTLE.skillGuardTime; return; }
    if (id === "rewind") { rewind(); return; }
    // パワー全開（11/7-25 決定）: 8秒間、パワーが1段上がる（上限を1つ超えてよい）。使った瞬間に、画面の敵の弾だけ消す（敵は消さない）
    boostT = BATTLE.skillBoostTime;
    level = POWER_LEVELS[levelIdx()];
    typhoon = { age: 0 };
    for (const b of ebullets) addPop(b.x, b.y, "#fff8d8", 0.5);
    ebullets = [];
  }
  // 巻き戻し（11/6-6 決定）: その救出の旅の最初にもどる。取り戻したことばは残り、取り逃したことばだけもう一度出る。元気は全回復、敵は最初から。ボス戦の途中でも使える
  function rewind() {
    rewindUsed = true;
    const got = new Set(absorbed.map(w => w.id));
    script = baseScript.filter(w => !got.has(w.id));
    missed = []; extraRound = false;
    enemies = []; fillers = []; ebullets = []; bombs = []; blasts = []; items = []; obs = []; bounces = []; odai = null; rest = null; guide = null;
    gapT = 0; typhoon = null; wave = null; wrongFx = null; againFx = null; showWord = null;
    clearMsgs(9); msgQ = [];
    player.hp = maxHp(); player.inv = Math.max(player.inv, 1.5);
    rescueT = 0; evShown = {}; evPlans = {}; meteorT = 0; bgOff = 0; bgGo = false;
    startPhase("round2");
    rewindFx = { age: 0 };
    Sound.se("power");
  }
  // 大ボスの殻: 2割減るごとに、ふわりが短い声（10/25-17。言葉は texts.js の rescue.bossCheer から順に）
  function bossCheer(e) {
    if (!e.parts) return;
    let hp = 0, max = 0;
    for (const p of e.parts) if (!p.deco) { hp += p.broken ? 0 : Math.max(0, p.hp); max += p.maxHp; }
    const step = Math.floor((1 - hp / Math.max(1e-6, max)) * 5 + 1e-6);   // 0〜5（2割ごと）
    if (step > (e.cheer || 0) && step < 5) {
      e.cheer = step;
      const list = window.TEXTS.rescue.bossCheer || [];
      if (list.length) fsay = { text: list[(step - 1) % list.length], t: BATTLE.fuwariSayTime, small: true };   // お題のあいだは順番待ちが止まるので、直接出す
    }
  }

  function comboMul() { return Math.min(1 + BATTLE.comboStep * Math.max(0, combo - 1), BATTLE.comboMax); }

  function damageFiller(f) {
    f.hp--;
    f.flash = 0.12;
    if (f.hp > 0) { Sound.se("hit"); return; }
    score += BATTLE.scoreFiller;
    addGauge(BATTLE.gaugeKill / (1 + killN++ / BATTLE.gaugeKillHalf));
    floats.push({ x: f.x, y: f.y - 10, text: `+${BATTLE.scoreFiller}`, big: f.layer === "ground", xl: f.layer === "ground", age: 0 });   // 地上の雑魚は「＋100」を大きめに（11/7-23）
    if (f.layer === "ground") shatter(f);   // 地上の雑魚（星など）は、パリンと割れてかけらと光の粒が飛び散る（11/7-23）
    // 倒した雑魚は、ぽんっと大きな花になって、輪ときらきらが広がる
    addPop(f.x, f.y, f.layer === "ground" ? "#f6c9d6" : "#fff2b8", BATTLE.popScale, f.layer === "ground", true);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 120;
      threads.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 3, curl: 0, rot: 0,
        color: ["#ffe9a0", "#ffffff", "#f8c8d8"][i % 3], age: 0, scatter: 9, sparkle: true });
    }
    Sound.se("pop");
    if (Math.random() < BATTLE.dropRate) items.push({ x: Math.max(stripRight() + 14, Math.min(W - 14, f.x)), y: f.y, age: 0 });   // たねは、左の帯の下や画面の端に落ちないように（11/7-28）
  }

  // 地上の雑魚が割れる（11/7-23）: とがったかけらが回りながら飛び散り、光の粒も散る。音は「パリン」
  function shatter(f) {
    const w2 = worldDef.id === 2, cols = w2 ? ["#e8e2d8", "#b8b2aa", "#fff6d8"] : ["#ffffff", "#e8e4f4", "#fff2b8"];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + Math.random() * 0.4, sp = 120 + Math.random() * 130;
      shards.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 60, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 6 + Math.random() * 6, color: cols[i % 3], age: 0 });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 140 + Math.random() * 140;
      threads.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 3, curl: 0, rot: 0, color: ["#ffffff", "#fff2b8", "#d8f0ff"][i % 3], age: 0, scatter: 9, sparkle: true });
    }
    Sound.se("shatter");
  }
  // 花が咲くような小さな演出
  function addPop(x, y, color, scale, ground, ring) {
    pops.push({ x, y, color, scale, ground: !!ground, ring: !!ring, age: 0 });
  }
  function updatePops(dt) {
    const sc = scrollSpeed();
    for (const p of pops) { p.age += dt; if (p.ground) p.y += sc * dt; }
    for (const s of shards) { s.age += dt; s.x += s.vx * dt; s.y += (s.vy + sc) * dt; s.vy += 420 * dt; s.vx *= 0.97; s.rot += s.vr * dt; }   // かけら: 飛んで、少し落ちて消える（11/7-23）
    shards = shards.filter(s => s.age < 0.6);
    pops = pops.filter(p => p.age < 0.7);
  }

  // 語句を倒した
  function defeat(e) {
    // 語句を続けて倒すとコンボ（語句を下へ逃がすか、弾に当たると0にもどる）
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    const mul = comboMul();
    const pts = Math.round(BATTLE.scoreWord * mul);
    score += pts;
    floats.push({ x: e.x, y: e.y - e.size, text: `+${pts}` + (mul > 1 ? ` ×${mul}` : ""), big: true, age: 0 });
   // gaugeRate ＝ 救出の旅のゲージのたまる速さ（11/1-3 決定: 3つ目 1.5、4つ目 2）
    if (!e.last) { firstPass(e); return; }
    absorb(e);
  }

  // ===== 1回目の旅: 双眼鏡でことばをさがす =====
  const binoR = () => W * BATTLE.binoR;
  const binoCenters = () => { const d = binoR() * BATTLE.binoSpread; return [{ x: bino.x - d, y: bino.y }, { x: bino.x + d, y: bino.y }]; };
  const inBino = (x, y, k = 1) => binoCenters().some(c => Math.hypot(x - c.x, y - c.y) < binoR() * k);
  function exploreWords() { return script.concat([bossWord]); }   // 10語すべて（10/25-1）。大ボスの語句も同じ形でただよう（殻は救出の旅だけ）

  function spawnDrifter(word, center) {
    const size = isShortWord(word) ? Math.round(BATTLE.fontSize.zako * BATTLE.shortScale) : BATTLE.fontSize.zako;
    ctx.font = font(size);
    const w = ctx.measureText(word.word).width;
    const minX = stripRight() + w / 2 + 12, maxX = Math.max(minX, W - w / 2 - 12);
    let x = rand(minX, maxX), y = rand(100, H * 0.7);
    for (let k = 0; k < 10 && inBino(x, y, 1.5); k++) { x = rand(minX, maxX); y = rand(100, H * 0.7); }   // 双眼鏡のすぐそばには出さない
    const mv = exMove, a = Math.random() * Math.PI * 2, sp = center ? 6 : BATTLE.exploreSpeed * rand(0.7, 1.3) * (mv.speedMul || 1);
    if (center) { x = W / 2; y = H * 0.36; }   // チュートリアル: 最初のことばは中央に、ゆっくり
    const d = { word, role: "zako", size, w, h: size * 1.2, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, life: center ? 1e9 : BATTLE.exploreLife * (mv.lifeMul || 1),
      age: 0, since: 0, vis: 0, wait: 0, look: 0, found: false, foundT: 0, phase: Math.random() * 6, hintT: Math.random() * BATTLE.hintEvery, flash: 0, explore: true, last: false };
    if (!center) exStart(d, true);
    if (mv.flies) d.flies = Array.from({ length: mv.flies }, (_, i) => ({ a: i * 2.1 + Math.random(), r: rand(14, 30), sp: rand(0.8, 1.4) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 6 }));
    explore.list.push(d);
  }
  // 動きの型ごとの、出てくる場所と向き（first ＝ 初めて出るとき。出直すときは first なし）
  function exStart(d, first) {
    const mv = exMove, minX = stripRight() + d.w / 2 + 12, maxX = Math.max(minX, W - d.w / 2 - 12);
    d.since = 0; d.look = 0;
    if (mv.move === "fall") { d.baseX = rand(minX, maxX); d.x = d.baseX; d.y = rand(70, 110); d.vx = 0; d.vy = mv.fallSpeed * rand(0.85, 1.15); }
    else if (mv.move === "wind") { d.vx = mv.wind * rand(0.8, 1.2); d.vy = 0; if (!first) { d.x = minX; d.y = rand(100, H * 0.7); } }
  }
  const windNow = () => exMove.wind * (1 + exMove.gust * Math.sin(explore.t * 0.7));

  function updateExplore(dt) {
    const ex = explore;
    if (ex.endT > 0) {   // 時間切れ（または全部見つけた）: 一言を出して、2回目の旅の準備へ
      ex.endT -= dt;
      if (ex.endT <= 0) {
        state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; sortieStep = "say";
        scoreAtMain = score; drag = null;
      }
      return;
    }
    if (!lesDo()) ex.t += dt;   // チュートリアルの「やってみる」のあいだは、時間（タイムバー）も、ことば・箱の動きも止まる（11/7-20）
    if (exMove.space) { updateSpace(dt); return; }   // 世界3の無重力（10/31-10 試作）
    if (exMove.box) { updateBoxes(dt); return; }   // 世界2の箱（10/31-10 試作）
    const words = exploreWords();
    // 出す順: はじめの10のことば → 見つけられずに消えたことば（時間切れがないので、見つかるまで出直す。10/25-17）
    // exMove.maxOn ＝ 同時に出しておく数の上限（ステージ2の落ち葉は2つ）。いっぱいのときは、空くまで待って時刻を後ろにずらす
    while (ex.t >= ex.nextAt) {
      const w = ex.next < words.length ? words[ex.next] : ex.again[0];
      if (!w) break;
      if (exMove.maxOn && ex.list.filter(d => !d.found).length >= exMove.maxOn) { ex.nextAt = ex.t; break; }
      if (ex.next < words.length) ex.next++; else ex.again.shift();
      spawnDrifter(w);
      ex.nextAt += ex.next < words.length ? BATTLE.exploreGap : BATTLE.exploreAgainGap;
    }
    const mv = exMove;
    if (mv.move === "wind") {   // 風: 双眼鏡も少し流される（指で押さえていても）
      const dx = mv.binoDrift * windNow() / mv.wind * dt, nx = Math.min(Math.max(bino.x + dx, stripRight() + 10), W - 10);
      if (drag) drag.px += nx - bino.x;
      bino.x = nx;
    }
    const xdt = dt;
    for (const d of ex.list) {
      const dt = lesDo() ? 0 : xdt;   // チュートリアルの「やってみる」のあいだは、ことばは止まる（見つける1秒は進む）
      d.age += dt;
      if (d.found) { d.foundT += xdt; continue; }
      if (d.wait > 0) { d.wait -= dt; d.vis = 0; if (d.wait <= 0) exStart(d); continue; }   // 落ちた・流れて出たあと、出直すまで見えない
      d.since += dt;
      const minX = stripRight() + d.w / 2 + 8, maxX = W - d.w / 2 - 8;
      let fade = 1;
      if (mv.move === "fall") {   // 落ち葉: 揺れながら降り、地面（画面の下のほう）に落ちたら消える
        d.y += d.vy * dt;
        d.x = Math.min(Math.max(d.baseX + Math.sin(d.age * mv.swaySpeed + d.phase) * mv.sway, minX), maxX);
        const ground = H * 0.8;
        fade = Math.min(1, (ground - d.y) / 50);
        if (d.y >= ground) { d.wait = mv.wait; d.vis = 0; continue; }
      } else if (mv.move === "wind") {   // 風: 横に流され、右に出たら左から出直す
        d.x += d.vx * windNow() / mv.wind * dt; d.y += Math.sin(d.age * 1.6 + d.phase) * 14 * dt;
        fade = Math.min(1, (W - d.x) / 60);
        if (d.x - d.w / 2 > W) { d.wait = mv.wait; d.vis = 0; continue; }
      } else {   // ただよう（drift・firefly）
        d.x += d.vx * dt; d.y += d.vy * dt + Math.sin(d.age * 1.3 + d.phase) * 10 * dt;
        if (d.x < minX) { d.x = minX; d.vx = Math.abs(d.vx); }
        if (d.x > maxX) { d.x = maxX; d.vx = -Math.abs(d.vx); }
        if (d.y < 80) { d.y = 80; d.vy = Math.abs(d.vy); }
        if (d.y > H * 0.78) { d.y = H * 0.78; d.vy = -Math.abs(d.vy); }
      }
      d.vis = Math.max(0, Math.min(1, d.since / 0.8, (d.life - d.age) / 1.2, fade));
      if (d.flies) for (const f of d.flies) f.a += f.sp * dt;
      d.hintT += dt;
      if (d.vis > 0.5 && !les && d.x - (d.w || 0) / 2 > stripRight() + 4 && d.x + (d.w || 0) / 2 < W - 4) { const n0 = reacted; lesson("binoMove", { ty: d.y, target: d, done: () => reacted > n0 }); }   // チュートリアル: 最初のことばが見えた → 見つける（11/7-20）。左の帯にかからず、画面の中に入りきってから（11/7-28）
      if (d.age < d.life && d.vis > 0.5 && inBino(d.x, d.y, 0.9)) {
        d.look += xdt;
        if (d.look >= (exMove.lookTime || BATTLE.lookTime)) findWord(d);
      }
    }
    exploreOverCheck(words, dt);
    for (const d of ex.list) if (!d.found && d.age >= d.life && !ex.again.includes(d.word)) ex.again.push(d.word);   // 見つけられずに消えた: あとで出直す
    ex.list = ex.list.filter(d => d.found ? d.foundT < 0.9 : d.age < d.life);
    // 飾りの虫（円の中を横切る）
    ex.bugT -= dt;
    if (ex.bugT <= 0) {
      ex.bugT = BATTLE.bugEvery * rand(0.7, 1.3);
      const fromLeft = Math.random() < 0.5;
      ex.bugs.push({ x: fromLeft ? -10 : W + 10, y: rand(H * 0.2, H * 0.7), vx: (fromLeft ? 1 : -1) * rand(50, 80), ph: Math.random() * 6, kind: Math.random() < 0.5 ? "ladybug" : "moth" });
    }
    for (const b of ex.bugs) { b.x += b.vx * dt; b.y += Math.sin(t * 3 + b.ph) * 20 * dt; }
    ex.bugs = ex.bugs.filter(b => b.x > -20 && b.x < W + 20);
    if (mv.stray) {   // ひとりで飛ぶホタル（ことばの目印ではない）
      while (ex.flies.length < mv.stray) ex.flies.push({ x: rand(stripRight() + 10, W - 10), y: rand(90, H * 0.75), ph: Math.random() * 6, vx: rand(-14, 14), vy: rand(-10, 10) });
      for (const f of ex.flies) {
        f.x += (f.vx + Math.sin(t * 0.9 + f.ph) * 12) * dt; f.y += (f.vy + Math.cos(t * 1.1 + f.ph) * 10) * dt;
        if (f.x < stripRight() + 10 || f.x > W - 10) f.vx = -f.vx;
        if (f.y < 90 || f.y > H * 0.78) f.vy = -f.vy;
      }
    }
    if (mv.move === "wind") {   // 風の筋（見た目だけ）
      if (Math.random() < dt * 6) ex.streaks.push({ x: -60, y: rand(70, H * 0.85), len: rand(30, 70), sp: rand(3, 5) });
      for (const k of ex.streaks) k.x += windNow() * k.sp * dt;
      ex.streaks = ex.streaks.filter(k => k.x < W + 80);
    }
    exploreEndCheck(words, ex.list.length === 0);
  }
  function exploreOverCheck(words, dt) {
    const ex = explore;
    if (!ex.over && ex.t >= BATTLE.exploreTime && reacted < words.length) {   // 基準の時間を過ぎた瞬間: 上に「時間オーバー！…」を2秒（10/25-21）
      ex.over = BATTLE.exploreOverMsg; Sound.se("boing");
    }
    if (ex.over > 0) ex.over = Math.max(0, ex.over - dt);
  }
  function exploreEndCheck(words, idle) {
    const ex = explore;
    // 終わり: 10のことばをぜんぶ見つけたとき（時間切れはない。10/25-17）。基準の時間（exploreTime）より早ければ残り1秒につき＋、おそければ1秒につき−（0点より下にはしない）
    const all = reacted >= words.length;
    if (all && idle) {
      ex.endT = 2.4;
      const diff = BATTLE.exploreTime - ex.t, sec = Math.ceil(Math.abs(diff)), pts = sec * BATTLE.exploreTimeScore;
      if (diff >= 0) score += pts; else score = Math.max(0, score - pts);
      ex.settled = true; ex.settledT = ex.t;   // 時間の点を足した（これより前は、画面の点数におくれの−を先に見せる）。時計はこの時刻で止める
      const text = tx(diff >= 0 ? "explore.endEarly" : "explore.endLate", { n: sec, p: pts });
      post("banner", () => { banner = { text, t: 2.4, color: tint("rgba(72,105,58,0.92)") }; });
    }
  }

  // ===== 世界2の発見の旅「箱」（10/31-10 試作。構想メモ 2・10.5） =====
  // 工場の床の上のコンベアを、箱が流れてくる。指で押さえ続けて exMove.hold 秒で開く。中のことばは左の札へ（世界1の「見つけた」と同じ点・ゲージ）
  // 空箱は「からっぽ…」。流れきった箱は exMove.wait 秒あとに、流れの上手から戻ってくる（時間切れなし）
  const convDir = () => evActive("reverse") ? -1 : 1;   // コンベアの向き（ステージ6の出来事「コンベアが逆」で左へ）
  function boxSetup() {
    const mv = exMove, ex = explore;
    let list = shuffle(exploreWords().map(w => ({ word: w })).concat(Array.from({ length: mv.empty || 0 }, () => ({ word: null })), Array.from({ length: mv.fake || 0 }, () => ({ word: null, fake: true }))));   // にせOPEN（11/1-2）: 空箱で、いつも OPEN の面
    if (mv.lock > 0) {   // 鍵つきの箱: ことばの箱から lock 個（いちばん前のものはのぞく）。鍵の箱は2番目に出す
      shuffle(list.slice(1).filter(b => b.word)).slice(0, mv.lock).forEach(b => (b.lock = true));
      list.splice(1, 0, { word: null, key: true });
    }
    if (lessonOn("s5box")) { const i = list.findIndex(b => b.word); if (i > 0) list.unshift(list.splice(i, 1)[0]); }   // チュートリアルのときは、最初の箱にことばを入れる（11/7-20）
    ex.queue = list.map((b, i) => Object.assign(b, { w: mv.boxW, h: mv.boxH, hold: 0, open: false, openT: 0, out: false, wait: 0, phase: (i * 0.77) % 3, shake: 0, warnT: 0 }));
    ex.boxes = []; ex.nextBoxAt = BATTLE.exploreFirst; ex.laneNo = 0; ex.belt = 0; ex.keyFound = false;
  }
  const laneY = i => H * exMove.lanes[i % exMove.lanes.length];
  const entryX = b => convDir() > 0 ? -b.w / 2 : W + b.w / 2;
  const entryFree = (lane, b) => !explore.boxes.some(q => q !== b && !q.out && q.lane === lane && Math.abs(q.x - entryX(b)) < q.w / 2 + b.w / 2 + 14);
  // 「OPEN」の面が上を向いているか（ステージ6から。箱は回りながら流れる）
  function boxFace(b) {
    const mv = exMove, cyc = mv.openTime + 3 * mv.faceTime, ph = (explore.t + b.phase * cyc / 3) % cyc;
    return ph < mv.openTime ? 0 : 1 + Math.min(2, Math.floor((ph - mv.openTime) / mv.faceTime));
  }
  const boxCanOpen = b => b.fake || (!(b.lock && !explore.keyFound) && (!exMove.open || boxFace(b) === 0));
  function updateBoxes(dt) {
    const ex = explore, mv = exMove, words = exploreWords();
    if (!ex.queue) boxSetup();
    evBanners();
    const dir = convDir(), md = lesDo() ? 0 : dt;   // チュートリアルの「やってみる」のあいだは、コンベアが止まる（押さえる時間は進む）
    ex.belt += dir * mv.speed * md;
    // 箱を出す（コンベアの入り口があいているレーンへ）
    while (ex.queue.length && ex.t >= ex.nextBoxAt) {
      const b = ex.queue[0];
      let lane = -1;
      for (let k = 0; k < mv.lanes.length; k++) { const l = (ex.laneNo + k) % mv.lanes.length; if (entryFree(l, b)) { lane = l; break; } }
      if (lane < 0) { ex.nextBoxAt = ex.t + 0.3; break; }
      ex.queue.shift();
      ex.laneNo = lane + 1;
      Object.assign(b, { lane, x: entryX(b), y: laneY(lane) });
      ex.boxes.push(b);
      ex.nextBoxAt += mv.gap;
    }
    let pressed = null;   // 指の下の箱（いちばん手前の1つ）
    for (const b of ex.boxes) {
      b.shake = Math.max(0, b.shake - dt); b.warnT = Math.max(0, b.warnT - dt);
      if (b.out) {   // 流れきって見えない: しばらくして上手から戻ってくる
        b.wait -= md;
        if (b.wait <= 0) { if (entryFree(b.lane, b)) { b.out = false; b.x = entryX(b); b.hold = 0; } else b.wait = 0.3; }
        continue;
      }
      const entering = dir > 0 ? b.x - b.w / 2 < stripRight() + 6 : b.x + b.w / 2 > W - 6;   // まだ全部は見えていない箱は、チュートリアルのあいだも入ってくる
      b.x += dir * mv.speed * (entering ? dt : md);
      b.y = laneY(b.lane);
      if (b.word && !b.open && !entering) { const n0 = reacted; lesson("s5box", { ty: b.y, target: b, done: () => reacted > n0 }); }   // チュートリアル: 最初の箱が全部見えた → 止めて説明 → 押さえて開ける（11/7-20）
      if (b.open) { b.openT += dt; continue; }
      if ((dir > 0 && b.x - b.w / 2 > W) || (dir < 0 && b.x + b.w / 2 < 0)) { b.out = true; b.wait = mv.wait; b.hold = 0; continue; }
      if (press && !pressed && Math.abs(press.x - b.x) < b.w / 2 + 6 && Math.abs(press.y - b.y) < b.h / 2 + 6 && b.x > stripRight() && b.x < W) pressed = b;
    }
    for (const b of ex.boxes) {
      if (b.out || b.open) continue;
      if (b !== pressed || (lessonOn("s5box") && !les)) { b.hold = 0; continue; }   // チュートリアルの説明の前は、まだ開かない（11/7-20）
      if (!boxCanOpen(b)) {
        b.hold = 0;
        if (b.lock && !ex.keyFound && b.warnT <= 0) { b.shake = 0.3; b.warnT = 1.5; floats.push({ x: b.x, y: b.y - b.h / 2 - 10, text: tx("box.locked"), big: false, age: 0 }); Sound.se("boing"); }
        continue;
      }
      b.hold += dt;
      if (b.hold >= mv.hold) openBox(b);
    }
    ex.boxes = ex.boxes.filter(b => !(b.open && b.openT > 1.2));
    exploreOverCheck(words, dt);
    exploreEndCheck(words, !ex.boxes.some(b => b.open));
  }
  function openBox(b) {
    const ex = explore;
    b.open = true; b.openT = 0; moved = true;
    if (b.word) {
      const size = isShortWord(b.word) ? Math.round(BATTLE.fontSize.zako * BATTLE.shortScale) : BATTLE.fontSize.zako;
      ctx.font = font(size);
      b.d = { word: b.word, role: "zako", size, w: ctx.measureText(b.word.word).width, h: size * 1.2, x: b.x, y: b.y - b.h * 0.3, phase: 0, explore: true, last: true, found: false, flash: 0 };
      findWord(b.d);
    } else if (b.key) {
      ex.keyFound = true;
      floats.push({ x: b.x, y: b.y - b.h / 2 - 10, text: tx("box.key"), big: true, found: true, age: 0 });
      Sound.se("power");
    } else {
      floats.push({ x: b.x, y: b.y - b.h / 2 - 10, text: tx("box.empty"), big: false, age: 0 });
      Sound.se("boing");
    }
  }

  function findWord(d) {
    d.found = true;
    hint("found");   // 案内: 初めて見つけた
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      threads.push({ x: d.x + (Math.random() - 0.5) * d.w, y: d.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 30,
        len: 3, curl: 0, rot: 0, color: "#ffe9a0", age: 0, scatter: 9, sparkle: true });
    }
    player.glow = 0.5;
    player.notice = 0.8;   // ふわりの「！」
    reacted++;
    found.add(d.word.id); foundAt[d.word.id] = t;
    score += BATTLE.scoreWord;
    floats.push({ x: d.x, y: d.y - d.size, text: tx("explore.found"), big: false, found: true, age: 0 });
    Sound.se("shine");
  }

  // 1周目: 吸い込まずに、光って消えるだけ。ふわりが反応する
  function firstPass(e) {
    vanish.push({ word: e.word, x: e.x, y: e.y, size: e.size, w: e.w, ground: e.ground, age: 0 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      threads.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 30,
        len: 3, curl: 0, rot: 0, color: "#ffe9a0", age: 0, scatter: 9, sparkle: true });
    }
    player.glow = 0.35;
    player.notice = 0.8;   // ふわりの「！」
    reacted++;
    found.add(e.word.id);
    floats.push({ x: e.x, y: e.y - e.size, text: tx("explore.found"), big: false, found: true, age: 0 });
    Sound.se("shine");
  }

  // 2周目・大ボス: 糸がほどけるように散って、自機へ吸い込まれる
  function absorb(e) {
    absorbed.push(e.word);
    addGauge(BATTLE.gaugeWord);
    if (e.hold && e.ground && !hintShown.s5ground) post("banner", () => { banner = { text: tx("newInWorld.groundDone"), t: 2.4, color: "rgba(111,154,74,0.9)" }; });   // ステージ5の最初の地上のことばを助けた（10/31-12）
    if (e.odaiReal && odai) endOdai(true);
    const lv = POWER_LEVELS[levelIdx()];
    if (lv !== level && absorbed.length < opts.total) {
      level = lv;
      powerFx = { age: 0, top: !!lv.top };   // その瞬間に、画面に大きく「パワーアップ！」と音（順番待ちはしない。10/25-9）。4段目は大きく金色に（11/1-4）
      Sound.se(lv.top ? "powerTop" : "power");
    }
    const n = Math.min(60, 14 + e.word.word.length * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      threads.push({
        x: e.x + (Math.random() - 0.5) * e.w, y: e.y + (Math.random() - 0.5) * e.h * 0.6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        len: 6 + Math.random() * 12, curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6,
        color: (SHELL[e.role] || SHELL.zako).bit, age: 0, scatter: 9, sparkle: true   // ほどけるのは殻。殻のかけらは散って消える
      });
    }
    freed.push({ word: e.word.word, x: e.x, y: e.y, size: e.size, age: 0 });   // ことばは形をたもったまま、ふわりのところへ飛んでくる
    Sound.se("absorb");
    if (BATTLE.speakWords) Sound.speak(e.word.kana || e.word.word);   // 語句を読み上げる（仮: 端末の読み上げ機能。10/31-3 から初期値はオフ）
    player.hp = Math.min(maxHp(), player.hp + BATTLE.healOnAbsorb);
    post("word", () => { showWord = { word: e.word, t: BATTLE.wordShowTime }; });
    slow = BATTLE.slowTime;
    // 光が広がって、画面上の雑魚と敵の弾が全部消える（keep の虫＝コガネムシは残る。10/25-2）
    wave = { x: e.x, y: e.y, age: 0 };
    fillers.forEach(f => { if (!FILLER_TYPES[f.type].keep) addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"); });
    fillers = fillers.filter(f => FILLER_TYPES[f.type].keep);
    ebullets = ebullets.filter(b => b.keep);   // keep の虫の弾も残る
    if (e.role === "boss") {
      // 大ボスを吸い込んだらバトル終了。残っている雑魚はみんな花になる
      enemies.forEach(x => (x.hp = 0));
      fillers.forEach(f => addPop(f.x, f.y, "#fff2b8", 1, f.layer === "ground"));
      fillers = []; ebullets = []; bombs = []; blasts = [];
      state = "clear";
      stateTimer = 2;
      banner = null;
    }
  }

  function finishBattle() {
    stop(); opts.onEnd(absorbed.map(w => w.id), { time: t, hits, downs, gameOvers, score, maxCombo, bombsUsed, missed: missed.map(w => w.id), found: [...found] });
  }
  // 延長戦に出すことば: 助けられなかったことば（同じことばは1回。大ボスはもう助けたので出ない）
  function extraWords() {
    const ids = new Set(absorbed.map(w => w.id)), out = [];
    for (const w of missed) if (!ids.has(w.id) && !out.includes(w)) out.push(w);
    return out;
  }
  // ラストチャンス（11/7-10 決定、11/7-12 作り直し）: 15秒。取り逃したことばが、本編と同じ姿（出方・地上・殻）でもう一度出てくる（3秒以内に全部）。
  //   ふつうの敵と出来事は出ない。持ち物・元気・パワー・ゲージは今のまま
  function startLast() {
    const L = BATTLE.lastChance;
    lcWords = extraWords();
    extraUsed = true; extraRound = true;
    enemies = []; fillers = []; ebullets = []; bombs = []; blasts = []; items = []; odai = null; obs = []; rest = null; guide = null;
    state = "play";
    lastT = L.time;
    const step = Math.min(0.6, (L.spawnIn - 0.3) / Math.max(1, lcWords.length - 1));   // 3秒以内に全部出る（間は最大0.6秒）
    lcQueue = lcWords.map((w, i) => ({ w, at: 0.3 + i * step }));
    lcClock = 0;
    music("quiz");   // そのステージのクイズの曲（いちばん速い曲）
    Sound.se("odai");
  }
  function updateLast(dt) {
    lastT = Math.max(0, lastT - dt);
    lcClock += dt;
    while (lcQueue.length && lcClock >= lcQueue[0].at) spawn(lcQueue.shift().w);   // 本編と同じ spawn（出方・地上・殻・硬さ）
    const got = new Set(absorbed.map(w => w.id));
    const left = lcWords.filter(w => !got.has(w.id));
    const onField = enemies.some(e => e.hp > 0 && lcWords.includes(e.word));
    if (lastT <= 0 || !left.length || (!lcQueue.length && !onField)) endLast();   // 時間切れ・全部取れた・もう画面にいない
  }
  function endLast() {
    const got = new Set(absorbed.map(w => w.id));
    missed = lcWords.filter(w => !got.has(w.id));   // 15秒で取れなかったことばは、取り逃しのまま
    for (const e of enemies) addPop(e.x, e.y, "#fff8d8", 0.8, !!e.ground);
    enemies = []; ebullets = []; lcQueue = [];
    lastT = 0; extraRound = false;
    state = "clear"; stateTimer = 1.2;
  }
  // ラストチャンスの表示（11/7-12）: 上に「ラスト15秒！のこりをとろう」の帯、その下に大きく残り秒数（どちらもいちばん手前）
  function drawLastHud() {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const label = tx("rescue.lastChance", { n: BATTLE.lastChance.time }), y = 58, warn = lastT <= 5;
    let fs = 22; ctx.font = font(fs); while (ctx.measureText(label).width > W - 60 && fs > 14) { fs -= 1; ctx.font = font(fs); }
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(192,57,43,0.88)"; roundRect(W / 2 - tw / 2 - 14, y - fs * 0.75, tw + 28, fs * 1.5, fs * 0.75); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillText(label, W / 2, y + 1);
    const k = warn ? 1 + 0.12 * Math.max(0, 1 - (Math.ceil(lastT) - lastT) * 4) : 1;   // のこり5秒からは赤く、1秒ごとに少しはねる
    ctx.font = font(Math.round(50 * k)); ctx.lineWidth = 8; ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.fillStyle = warn ? "#e74c3c" : "#4b3a1a";
    ctx.strokeText(String(Math.ceil(lastT)), W / 2, y + 52); ctx.fillText(String(Math.ceil(lastT)), W / 2, y + 52);
    ctx.restore();
  }
  // ふわりが光って、近くのことばを引き寄せる（引き寄せる広さを、うすい光の輪で見せる）
  function drawLastPull() {
    if (!player || player.hp <= 0) return;
    const pulling = enemies.some(e => e.pulled);
    const R = BATTLE.lastChance.pullR, pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    const g = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, R);
    g.addColorStop(0, `rgba(255,240,150,${pulling ? 0.45 : 0.22})`); g.addColorStop(1, "rgba(255,240,150,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x, player.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(224,176,58,${0.35 + 0.3 * pulse})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(player.x, player.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function updateThreads(dt) {
    for (const th of threads) {
      th.age += dt;
      th.rot += th.curl * dt * 4;
      if (th.sparkle) {               // 1回目の光の粒: その場で散って消える
        th.x += th.vx * dt; th.y += th.vy * dt; th.vx *= 0.92; th.vy *= 0.92;
        if (th.age > 0.7) th.done = true;
        continue;
      }
      if (th.age < th.scatter) {      // ほどけて散る
        th.x += th.vx * dt; th.y += th.vy * dt;
        th.vx *= 0.93; th.vy *= 0.93;
      } else {                        // 自機（ふわり）へ吸い込まれる
        const tx = player.x, ty = player.y;
        const k = Math.min(1, (th.age - th.scatter) * 3.2);
        th.x += (tx - th.x) * k * dt * 9;
        th.y += (ty - th.y) * k * dt * 9;
        if (Math.hypot(tx - th.x, ty - th.y) < 8) { th.done = true; player.glow = 0.35; }
      }
      if (th.age > 2.5) th.done = true;
    }
    threads = threads.filter(th => !th.done);
  }

  function hurt() {
    if (BATTLE.debugInvincible) return;   // デバッグ: 無敵
    if (les) return;   // チュートリアルのあいだは、ぶつかっても減らない（11/7-20）
    if (guardT > 0) return;   // 必殺ワザ「無敵タイム」: ぶつかっても元気が減らない（10/31-10 試作）
    player.hp -= BATTLE.damage;
    player.inv = BATTLE.invincibleTime * (loadout === "shield" ? BATTLE.guardInvMul : 1);   // 守りアップ: 被弾後の無敵が少し長い（11/6-6）
    addGauge(BATTLE.gaugeHit);
    player.hurt = 0.4;
    hits++;
    combo = 0;
    shake = 0.25;
    Sound.se("damage");
    if (player.hp <= 0) loseLife();
  }

  // 体力ゼロ: 1機失う。のこっていれば画面の下から復活（吸い込んだ語句と帯はそのまま）
  function loseLife() {
    downs++;
    lives--;
    addPop(player.x, player.y, "#ffffff", 1.6, false, true);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 140;
      threads.push({ x: player.x, y: player.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 4, curl: 0, rot: 0, color: "#ffffff", age: 0, scatter: 9, sparkle: true });
    }
    if (lives > 0) { respawn(); return; }
    gameOver();
  }
  function respawn() {
    player.hp = maxHp();
    player.x = W / 2; player.y = H + 30;
    player.rising = BATTLE.respawnRise;
    player.inv = BATTLE.respawnRise + BATTLE.respawnInv;
    if (drag) { drag.sx = lastPX; drag.sy = lastPY; drag.px = player.x; drag.py = H * 0.8; }   // 指を置いたままでも動かせる
  }
  // 3機すべて失った: 本番（出撃2）の最初からやり直す。探検はとばし、本番で集めた語句は消える
  function gameOver() {
    gameOvers++;
    lives = BATTLE.lives;
    player.hp = BATTLE.playerMaxHp; player.inv = 0; player.rising = 0;
    enemies = []; fillers = []; ebullets = []; bombs = []; blasts = []; items = []; obs = []; odai = null;
    if (phase !== "round1") {
      absorbed = []; missed = []; script = baseScript; guardT = 0; boostT = 0;
      score = scoreAtMain;
    } else {
      scoreAtMain = score;   // 探検中に3機失ったら、探検はそこまで
    }
    combo = 0; gauge = 0; level = POWER_LEVELS[basePower()];
    loadout = null; powerBonus = basePower(); shield = 0; gaugeMul = 1;
    retryMain = true;
    state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; sortieStep = "say"; drag = null;
    player.x = W / 2; player.y = H * 0.8;
  }

  // ===== 描く =====
  // 描く順番: 地面 → 地上の敵 → 照準 → 空中のものの影 → 空中の敵 → 弾 → 自機 → 文字
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake / 0.25, (Math.random() - 0.5) * 10 * shake / 0.25);

    drawTerrain();
    if (phase === "round1") { drawExplore(); ctx.restore(); return; }   // 1回目の旅は双眼鏡の画面だけ

    // 地上の花（たねが咲いたあと）
    for (const p of pops) if (p.ground) drawPop(p);
    // 地上の雑魚と、地上の語句
    for (const f of fillers) if (f.layer === "ground") drawFiller(f);
    for (const e of enemies) if (e.ground) drawGroundWord(e);
    // 落ちていくたね
    for (const r of blasts) drawBlast(r);
    for (const s of shards) drawShard(s);
    for (const b of bombs) drawBomb(b);
    // 照準
    if (state === "play" && groundOn) drawGroundSpot();   // 真上の薄い丸と光の筋は、地上のある世界だけ

    // 雲の影（地面の上を流れる）
    ctx.fillStyle = theme.cloudShadow;
    for (const c of cloudShadows) { ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2); ctx.fill(); }

    // 障害物
    for (const o of obs) drawObstacle(o);
    // 救出の旅の出来事「照明が落ちる」（10/31-13）: 地面と地上のものだけ暗く（空中のことば・虫・弾・ふわりは、その上に明るく出る）
    if (evActive("dark")) { ctx.fillStyle = `rgba(6,10,24,${BATTLE.darkRescue})`; ctx.fillRect(0, 0, W, H); }

    // 空中のものの影（右下にずらして、浮いているように見せる）
    ctx.fillStyle = "rgba(60,80,40,0.16)";
    for (const f of fillers) if (f.layer === "air" && !(f.delay > 0)) { ctx.beginPath(); ctx.ellipse(f.x + 16, f.y + 26, f.r * 0.9, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const it of items) { ctx.beginPath(); ctx.ellipse(it.x + 8, it.y + 14, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(player.x + 20, player.y + 34, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

    // 綿のたね（体力回復）
    for (const it of items) drawItem(it);

    // 自機の弾（ふわりの光）: 白寄りの明るい桃色の細長い光。敵の弾（濃い色の球）と見分けられるように（10/25-7。色は BULLET_COLORS）
    for (const s of shots) {
      const k = BATTLE.shotDrawScale * (s.boost ? 1.3 : 1);   // 見た目だけ大きく（当たりは今のまま）。パワー全開の光はひとまわり大きく、金色の尾がつく（11/7-25）
      if (s.boost) {
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y + 46);
        g.addColorStop(0, "rgba(255,214,90,0.85)"); g.addColorStop(1, "rgba(255,214,90,0)");
        ctx.strokeStyle = g; ctx.lineWidth = s.thick ? 10 : 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y + 46); ctx.stroke();
        ctx.fillStyle = "rgba(255,226,120,0.5)";
        ctx.beginPath(); ctx.ellipse(s.x, s.y, (s.thick ? 16 : 11) * k, (s.thick ? 22 : 15) * k, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = BULLET_COLORS.shotHalo;   // まわりにやわらかい光の輪
      ctx.beginPath(); ctx.ellipse(s.x, s.y, (s.thick ? 12 : 8) * k, (s.thick ? 18 : 12) * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s.x, s.y, (s.thick ? 7 : 4) * k, (s.thick ? 13 : 8) * k, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = BULLET_COLORS.shotRim; ctx.stroke();
      ctx.fillStyle = BULLET_COLORS.shot; ctx.fill();
    }

    // 空中の雑魚
    for (const f of fillers) if (f.layer === "air") drawFiller(f);
    for (const f of fillers) if (f.rear && f.delay > 0) {   // うしろから来る敵（世界3）: 出てくる前に、下のはしに「！」（10/31-10 試作）
      ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 14); ctx.font = font(26); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.strokeText("！", f.x, H - 34); ctx.fillStyle = "#c23a6a"; ctx.fillText("！", f.x, H - 34); ctx.restore();
    }

    // 空中の語句の敵
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of enemies) {
      if (e.ground) continue;
      ctx.font = font(e.size);
      const alpha = e.role === "boss" && e.age < BATTLE.bossEnterTime ? 0.55 : 1;   // 降りてくる間はうすく（まだ当たらない）
      const wob = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
      // 影: だ円（10/31-7。前は同じ文字を右下にうすく描いていて、殻が黄色く光ると二重の文字に見えた）
      ctx.fillStyle = "rgba(60,80,40,0.16)";
      if (!e.vertical) { ctx.beginPath(); ctx.ellipse(e.x + 14, e.y + 22, e.w * 0.5, e.size * 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
      drawWordText(e, e.x + wob, e.y, alpha);
      ctx.globalAlpha = alpha;
      drawHpDots(e);
      ctx.globalAlpha = 1;
    }

    // 1回目に倒した語句: 光ってふわっと上へ消える
    for (const v of vanish) {
      const k = v.age / 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(v.size * (1 + k * 0.3));
      ctx.shadowColor = "rgba(255,240,180,1)"; ctx.shadowBlur = 20;
      ctx.fillStyle = "#fffbe8";
      ctx.fillText(v.word.word, v.x, v.y - k * 20);
      ctx.restore();
    }

    // 空の花（空中の雑魚が咲いたあと）
    for (const p of pops) if (!p.ground) drawPop(p);

    // 敵の弾
    for (const b of ebullets) drawEnemyBullet(b);
    drawEvWarn();

    // ほどけた糸
    ctx.lineCap = "round";
    ctx.lineWidth = 2.2;
    for (const th of threads) {
      ctx.strokeStyle = th.color;
      ctx.globalAlpha = Math.max(0, 1 - th.age / 2.5);
      ctx.beginPath();
      const c = Math.cos(th.rot), s = Math.sin(th.rot);
      ctx.moveTo(th.x - c * th.len / 2, th.y - s * th.len / 2);
      ctx.quadraticCurveTo(th.x + s * th.len * 0.4, th.y - c * th.len * 0.4, th.x + c * th.len / 2, th.y + s * th.len / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (fogLevel > 0.01) drawFog();
    // ホタルの光（霧の上にも出る。霧の中の目印）
    for (const f of fillers) if (FILLER_TYPES[f.type].glow && !(f.delay > 0)) {
      const a = 0.5 + Math.sin(t * 4 + f.x) * 0.3;
      const g = ctx.createRadialGradient(f.x, f.y + 4, 1, f.x, f.y + 4, 16);
      g.addColorStop(0, `rgba(230,255,140,${a})`); g.addColorStop(1, "rgba(230,255,140,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y + 4, 16, 0, Math.PI * 2); ctx.fill();
    }
    drawWeather();
    if (stopT > 0) { ctx.fillStyle = `rgba(110,140,220,${0.2 * Math.min(1, stopT / 0.4)})`; ctx.fillRect(0, 0, W, H); }   // 時間止め（10/31-10 試作。仮の見た目）
    if (guardT > 0) drawGuardGlow();   // 無敵タイム: 自機のうしろに大きな光
    if (lastT > 0) drawLastPull();   // ラストチャンス: ふわりの引き寄せる光
    drawPlayer();
    drawOrbs();   // 世界3の光の玉（11/6-3）
    for (const f of freed) {   // 助けた語句（金色に光って、小さくなりながらふわりへ）
      const k = Math.min(1, f.age / 0.7);
      ctx.save();
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.font = font(f.size * (1 - k * 0.6));
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,214,90,1)"; ctx.shadowBlur = 16;
      ctx.lineWidth = 6; ctx.strokeStyle = "#fff6d8"; ctx.lineJoin = "round"; ctx.strokeText(f.word, f.x, f.y);
      ctx.fillStyle = GOLD_COLOR; ctx.fillText(f.word, f.x, f.y);
      ctx.restore();
    }
    if (guide) drawGuide();
    if (typhoon) drawTyphoon();
    if (powerFx) drawPowerFx();
    if (wrongFx) drawWrongFx();
    if (againFx) drawAgainFx();

    // 吸い込んだときに広がる光
    if (wave) {
      const k = wave.age / 0.6, R = Math.hypot(W, H) * k;
      const g = ctx.createRadialGradient(wave.x, wave.y, R * 0.6, wave.x, wave.y, R);
      g.addColorStop(0, "rgba(255,250,215,0)");
      g.addColorStop(0.8, `rgba(255,248,200,${0.55 * (1 - k)})`);
      g.addColorStop(1, "rgba(255,250,215,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    // いちばん上を舞う綿毛
    ctx.fillStyle = theme.fluff;
    for (const f of fluff) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    // 被弾したとき、画面のふちをうすく赤く
    if (player.hurt > 0) {
      const a = player.hurt / 0.4 * 0.45;
      const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      rg.addColorStop(0, "rgba(232,130,150,0)");
      rg.addColorStop(1, `rgba(232,130,150,${a})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    // 浮かぶ点数
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const fl of floats) {
      ctx.globalAlpha = 1 - fl.age / 0.9;
      ctx.font = font(fl.xl ? 26 : fl.kana ? 22 : (fl.big ? 18 : 12));   // xl: 地上の雑魚を倒した「＋100」（11/7-23）
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      ctx.strokeText(fl.text, fl.x, fl.y - fl.age * 30);
      ctx.fillStyle = fl.wrong ? "#b05068" : (fl.found ? tint("#6f9a4a") : (fl.kana ? "#5d6b4c" : (fl.big ? "#c98a1e" : "#8a9a78")));   // 砕けた文字の読みは、ふりがなの色
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 30);
    }
    ctx.globalAlpha = 1;
    drawHud();
    if (lastT > 0) drawLastHud();   // ラストチャンスの帯と残り秒数（いちばん手前。11/7-12）
    drawSkillButtons();
    if (rewindFx) drawRewind();
    // 操作のヒント（まだ動かしていないとき）
    if (!moved && state !== "clear" && !(les && les.id === "rescueStart")) {   // チュートリアル「ふわりを動かそう」のあいだは、吹き出しと同じことなので出さない（11/7-28）
      ctx.globalAlpha = hintFadeIn();   // 点滅しない。出るときに一度ふわっと現れるだけ（10/25-12）
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(16);
      ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
      const hy = player.y + 54 > H - 92 ? player.y - 56 : player.y + 54;   // 下のボタンの帯にかかるときは、ふわりの上に（11/7-28）
      if (!hintCard) ctx.strokeText(tx("rescue.moveHint"), W / 2, hy);   // 案内が出ているあいだは出さない（同じことを2か所に書かない）
      ctx.fillStyle = tint("#48693a");
      if (!hintCard) ctx.fillText(tx("rescue.moveHint"), W / 2, hy);
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();

    if (odai) drawOdai();
    // はね返った弾
    for (const b of bounces) {
      ctx.globalAlpha = 1 - b.age / 0.5;
      ctx.fillStyle = "#c9c2b0";
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 吸い込んだ語句を画面中央に大きく（読み仮名つき）
    if (showWord) drawBigWord(showWord.word, showWord.t);

    // 状態の文字
    if (hintCard) drawHintCard();
    if (state === "sortie") drawSortie();
    if (doorFade > 0) { ctx.fillStyle = `rgba(255,253,240,${doorFade / BATTLE.doorFade})`; ctx.fillRect(0, 0, W, H); }   // 扉から入ったあとの白い光が消えていく
    if (les) drawLesson();
    if (tut) drawTut();
    if (state === "clear") centerText(`${absorbed.length}のことばを助けた！`, `${score}点`);
    if (paused) drawSleep();
  }

  const exploreBgImgs = {};
  // 世界の繰り返し背景の絵（stages.js の WORLDS の exploreBg。制作側の world01_02〜03_02。上下がつながる）。読み込めないときは null
  function worldBgImg() {
    const wd = (window.WORLDS || []).find(w => opts.stage && w.id === opts.stage.world), src = wd && wd.exploreBg;
    if (!src) return null;
    const img = exploreBgImgs[src] || (exploreBgImgs[src] = Object.assign(new Image(), { src }));
    return img.complete && img.naturalWidth ? img : null;
  }
  function drawExploreBg() {
    const img = worldBgImg();
    if (!img) return false;   // 読み込めないときは、今までの背景
    const sc = W / img.naturalWidth, ih = img.naturalHeight * sc;
    const off = exMove.box ? 0 : (explore ? explore.t : 0) * BATTLE.exploreBgSpeed % ih;   // 下へ流す（世界2の箱のときは工場の床なので止める。10/31-10 試作）
    for (let y = off - ih; y < H; y += ih) ctx.drawImage(img, 0, y, W, ih + 1);
    drawLight(theme.imageLight !== undefined ? theme.imageLight : theme.light);   // 時間帯の色（明け方・夕暮れ・夜）は今までどおり重ねる
    return true;
  }

  // 地面: 草地のうえに、畑・花・小川・あぜ道
  function drawTerrain() {
    // 発見の旅（11/1）: 世界の背景の絵（stages.js の WORLDS の exploreBg。上下がつながる絵）を縦に流す。見えるのは双眼鏡の中だけ
    if (phase === "round1" && drawExploreBg()) return;
    // 背景の絵があれば（stages.js の theme.image。10/21-2）: 絵は動かさず画面いっぱいに（はみ出す左右は切る）。
    // その上を、地面の飾り（綿の実・花・草むら）を少なめ・半透明で流す。畑や小川の大きな面は、絵とぶつかるので描かない。
    // 時間帯の色は、いちばん上にうすく重ねる（theme.imageLight。なければ theme.light）
    if (theme.image) {
      if (!theme._img || theme._imgSrc !== theme.image) { theme._img = new Image(); theme._img.src = theme.image; theme._imgSrc = theme.image; }
      const img = theme._img;
      if (img.complete && img.naturalWidth) {
        const wbg = worldBgImg();
        if (wbg) {   // 11/1-2 決定: 救出の旅は、世界の繰り返し背景を絵ごと縦に流す（幅いっぱい。速さは地面と同じ。1語目が出るまでと、お題のあいだ・終わりは止まる）
          const ih = wbg.naturalHeight * W / wbg.naturalWidth, off = ((bgOff % ih) + ih) % ih;
          for (let y = off - ih; y < H; y += ih) ctx.drawImage(wbg, 0, y, W, ih + 1);
        } else {   // 読み込めないときは、今までの止まった絵
          const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight), iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
          ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
        }
        ctx.save();
        ctx.globalAlpha = theme.deco === false ? 0 : BATTLE.imageDecoAlpha;   // deco: false ＝ 綿の実などの飾りを流さない（世界2の工場。10/31-10 試作）
        for (const s of terrain) {
          const y = s.y;
          if (s.kind === "field") for (const d of s.deco) {
            ctx.fillStyle = theme.plant; ctx.beginPath(); ctx.arc(d.x, y + d.y + 3, d.r * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = theme.cotton; ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r * 0.6, 0, Math.PI * 2); ctx.fill();
          } else if (s.kind === "meadow") for (const d of s.deco) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, y + d.y, 3, 0, Math.PI * 2); ctx.fill(); }
          else if (s.kind === "path") { ctx.fillStyle = theme.bush; for (const d of s.deco) { ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r * 0.7, 0, Math.PI * 2); ctx.fill(); } }
        }
        ctx.restore();
        drawLight(theme.imageLight !== undefined ? theme.imageLight : theme.light);
        return;
      }
    }
    ctx.fillStyle = theme.ground;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    for (const s of terrain) {
      const y = s.y;
      if (s.kind === "field") {
        ctx.fillStyle = theme.field;
        roundRect(s.x0, y + 8, s.x1 - s.x0, SEG_H - 16, 18); ctx.fill();
        ctx.strokeStyle = theme.furrow; ctx.lineWidth = 6; ctx.lineCap = "round";
        for (let yy = y + 26; yy < y + SEG_H - 16; yy += 22) { ctx.beginPath(); ctx.moveTo(s.x0 + 14, yy); ctx.lineTo(s.x1 - 14, yy); ctx.stroke(); }
        for (const d of s.deco) {   // 綿の実
          ctx.fillStyle = theme.plant; ctx.beginPath(); ctx.arc(d.x, y + d.y + 3, d.r * 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = theme.cotton; ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r * 0.6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.kind === "meadow") {
        for (const d of s.deco) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, y + d.y, 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (s.kind === "creek") {
        ctx.strokeStyle = theme.creek; ctx.lineWidth = 34; ctx.lineCap = "round";
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 16) { const yy = y + s.cy + Math.sin(x / 55 + s.ph) * 18; x === -20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
        ctx.strokeStyle = theme.creekLight; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 16) { const yy = y + s.cy - 4 + Math.sin(x / 55 + s.ph) * 18; x === -20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
      } else {
        ctx.strokeStyle = theme.path; ctx.lineWidth = 26; ctx.lineCap = "round";
        ctx.beginPath();
        for (let yy = 0; yy <= SEG_H; yy += 20) { const xx = s.px + Math.sin(yy / 60 + s.ph) * 30; yy === 0 ? ctx.moveTo(xx, y + yy) : ctx.lineTo(xx, y + yy); }
        ctx.stroke();
        ctx.fillStyle = theme.bush;
        for (const d of s.deco) { ctx.beginPath(); ctx.arc(d.x, y + d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    drawLight();
  }
  // 時間帯の光: 地面の上にだけうすくかける（語句・雑魚・自機・帯にはかけないので、夜でも文字は読める）
  function drawLight(color) {
    const c = color !== undefined ? color : theme.light;
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }

  // 霧: 画面の上のほうをかくす（fogTop まではほぼ見えず、その下でうすれていく）
  function drawFog() {
    const y1 = H * fogTopNow, y2 = y1 + 70;
    ctx.save();
    ctx.globalAlpha = fogLevel;
    ctx.fillStyle = BATTLE.fogColor;
    ctx.fillRect(-10, -10, W + 20, y1 + 10);
    const g = ctx.createLinearGradient(0, y1, 0, y2);
    g.addColorStop(0, BATTLE.fogColor); g.addColorStop(1, BATTLE.fogColor.replace(/[\d.]+\)$/, "0)"));
    ctx.fillStyle = g; ctx.fillRect(-10, y1, W + 20, y2 - y1);
    // もやもや
    ctx.fillStyle = "rgba(200,210,235,0.12)";
    for (let i = 0; i < 6; i++) { const x = ((i * 97 + t * 14) % (W + 160)) - 80; ctx.beginPath(); ctx.ellipse(x, y1 - 10 + (i % 3) * 14, 90, 22, 0, 0, Math.PI * 2); ctx.fill(); }
    // 語句の光る縁取りだけは霧の上に出す（霧の中でも「語句がいる」とわかる）
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const e of enemies) {
      if (e.ground || e.vertical || e.y - e.size > y2) continue;
      const k = e.y < y1 ? 1 : Math.max(0, 1 - (e.y - y1) / (y2 - y1));
      if (k <= 0) continue;
      ctx.globalAlpha = fogLevel * k * (e.last ? 0.9 : 0.6);
      ctx.font = font(e.size);
      ctx.shadowColor = e.last ? "rgba(255,214,90,1)" : "rgba(255,255,255,1)"; ctx.shadowBlur = 14;
      ctx.lineWidth = 3; ctx.strokeStyle = e.last ? "#ffe9a0" : "#ffffff";
      if (e.parts) { for (const q of e.parts) if (!q.broken) ctx.strokeText(q.ch, e.x + q.ox, e.y); }
      else ctx.strokeText(e.word.word, e.x, e.y);
    }
    ctx.restore();
  }
  // 風・雨・雪の粒（見た目だけ）
  function drawWeather() {
    if (!weatherDef) return;
    ctx.save();
    if (windOn()) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (const p of streaks) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - windDirNow() * 26 * p.s, p.y - 2); ctx.stroke(); }
    } else if (weatherOn("rain")) {
      ctx.strokeStyle = "rgba(200,220,255,0.55)"; ctx.lineWidth = 1.5;
      for (const p of streaks) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 14 * p.s); ctx.stroke(); }
    } else if (weatherOn("snow")) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const p of streaks) { ctx.beginPath(); ctx.arc(p.x, p.y, 2 + p.s * 1.5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  // お題の「ちがうよ」（10/25-16）: 画面の中ほどに大きく、少しゆれて消える
  function drawWrongFx() {
    const k = wrongFx.age / BATTLE.odaiWrongTime;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
    ctx.translate(W / 2 + Math.sin(wrongFx.age * 40) * 4 * (1 - k), H * 0.5);
    ctx.font = font(40); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const wt = wrongFx.text || tx("rescue.odaiWrong");   // 「3つを順に」では「順番がちがうよ」（10/31-10 試作）
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.strokeText(wt, 0, 0);
    ctx.fillStyle = "#d8413a"; ctx.fillText(wt, 0, 0);
    ctx.restore();
  }
  const wrongBlink = e => e.wrongT > 0 && Math.floor(e.wrongT * 10) % 2 === 0;   // ちがうことば: 赤く点滅

  // 「パワーアップ！」（10/25-9）: 大きく、ぽんと出て、少し上がりながら消える
  //   10/25-11: 助けたことばの大きな表示（画面の中ほど）と重ならないよう、自機の上に出す（パワーアップは、ことばを助けた瞬間に起きるので）
  function drawPowerFx() {
    const k = powerFx.age / BATTLE.powerFxTime, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.55 : 1.15 - Math.min(1, (k - 0.15) / 0.2) * 0.15;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.translate(W / 2, Math.min(player.y, H - 80) - 110 - k * 30); ctx.scale(pop, pop);
    ctx.font = font(44); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (powerFx.top) {   // 4段目（11/1-4）: ふつうより大きく（画面の幅に収まるまで）、金色、光の輪
      const big = Math.min(1.35, (W - 24) / ((ctx.measureText(tx("rescue.powerUp")).width + 20) * pop));
      ctx.scale(big, big);
      ctx.strokeStyle = `rgba(255,226,120,${0.8 * (1 - k)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 60 + k * 120, 0, Math.PI * 2); ctx.stroke();
      const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, "#fff3a6"); g.addColorStop(0.5, "#ffc928"); g.addColorStop(1, "#d08a00");
      ctx.shadowColor = "rgba(255,200,40,0.95)"; ctx.shadowBlur = 18;
      ctx.lineWidth = 10; ctx.strokeStyle = "#7a4a00"; ctx.strokeText(tx("rescue.powerUp"), 0, 0);
      ctx.shadowBlur = 0; ctx.fillStyle = g; ctx.fillText(tx("rescue.powerUp"), 0, 0);
      ctx.restore(); return;
    }
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.strokeText(tx("rescue.powerUp"), 0, 0);
    ctx.fillStyle = "#d39a12"; ctx.fillText(tx("rescue.powerUp"), 0, 0);
    ctx.restore();
  }

  // 無敵タイム（11/6-6）: 自機のうしろに大きな光の輪。残り2秒で点滅
  function drawGuardGlow() {
    const R = BATTLE.skillGuardR, p = 0.5 + 0.5 * Math.sin(t * 8), fade = Math.min(1, guardT / 0.4) * (guardT < 2 && Math.sin(t * 18) < 0 ? 0.45 : 1);
    ctx.save(); ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(player.x, player.y, R * 0.2, player.x, player.y, R * 2);
    g.addColorStop(0, "rgba(255,255,235,0.9)"); g.addColorStop(0.55, `rgba(255,214,90,${0.5 + 0.25 * p})`); g.addColorStop(1, "rgba(255,190,60,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x, player.y, R * 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,170,0.95)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, player.y, R * (1 + 0.06 * p), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 巻き戻し（11/6-6）: 画面が青白く光り、まん中で大きな矢印がぐるっと逆に回る
  function drawRewind() {
    const k = rewindFx.age / 1.2;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = "rgba(210,228,255,0.6)"; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H * 0.45); ctx.rotate(-k * Math.PI * 3);
    drawRewindArrow(70, "#3f8cf0", 12);
    ctx.restore();
  }
  function drawRewindArrow(r, color, lw) {   // 左回りの矢印（いまの位置が中心。右回りの形を左右に返して描く）
    ctx.scale(-1, 1);
    const a1 = Math.PI * 1.65;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 0.35, a1); ctx.stroke();
    const hx = Math.cos(a1) * r, hy = Math.sin(a1) * r, d = lw * 1.8;
    ctx.beginPath(); ctx.moveTo(hx + d, hy - d * 0.2); ctx.lineTo(hx - d * 0.3, hy - d * 1.1); ctx.lineTo(hx - d * 0.6, hy + d * 0.9); ctx.closePath(); ctx.fill();
  }
  // パワー全開を使った瞬間（11/7-25。前の1つ目のワザの絵を使う）: 自機のまわりに白いうずが広がり、大きなふわりがふくらむ
  function drawTyphoon() {
    const k = typhoon.age / 0.9, cx = player.x, cy = player.y;
    ctx.save();
    // うず
    ctx.lineCap = "round";
    for (let j = 0; j < 3; j++) {
      const r = (30 + k * Math.max(W, H) * 0.8) * (0.55 + j * 0.2), a0 = k * Math.PI * 5 + j * 2.1;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.lineWidth = 10 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI * 1.1); ctx.stroke();
    }
    // 大きなふわり（3のコマ）が画面のまん中にふくらんで、消えていく（10/25-6）
    const grow = Math.min(1, k * 4), big = Math.min(W, H) * BATTLE.fuwariBombSize * (0.5 + grow * 0.5);
    ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
    const g = ctx.createRadialGradient(W / 2, H * 0.45, big * 0.2, W / 2, H * 0.45, big * 0.8);
    g.addColorStop(0, "rgba(255,246,200,0.8)"); g.addColorStop(1, "rgba(255,246,200,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H * 0.45, big * 0.8, 0, Math.PI * 2); ctx.fill();
    drawFuwariArt(3, W / 2, H * 0.45, big, Math.sin(k * Math.PI * 2) * 0.15);
    ctx.restore();
  }

  // 木のよけ方の案内の矢印
  // 木の案内（10/25-1）: 矢印は木の横（よける向き）、文字は画面の中ほどの案内の位置に分けて出す
  function drawGuide() {
    const k = Math.min(1, guide.t / 0.3), pulse = 1;   // 矢印は点滅させない（10/25-12）
    const tr = guide.tree, ty = Math.max(70, Math.min(H - 140, tr.y));
    ctx.save(); ctx.globalAlpha = k;
    if (guide.kind === "dodge") {   // 木の横に、よける向きの矢印
      const dir = guide.dir, x1 = tr.x + dir * (tr.r + 10), x2 = x1 + dir * 64;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 12; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x1, ty); ctx.lineTo(x2 - dir * 10, ty); ctx.stroke();
      ctx.strokeStyle = `rgba(230,160,40,${0.7 + pulse * 0.3})`; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x1, ty); ctx.lineTo(x2 - dir * 10, ty); ctx.stroke();
      ctx.fillStyle = `rgba(230,160,40,${0.7 + pulse * 0.3})`; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x2 + dir * 8, ty); ctx.lineTo(x2 - dir * 12, ty - 14); ctx.lineTo(x2 - dir * 12, ty + 14); ctx.closePath();
      ctx.stroke(); ctx.fill();
    } else {                        // 木と木のあいだに、下向きの印
      ctx.fillStyle = `rgba(255,214,90,${0.6 + pulse * 0.4})`; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(guide.gx - 16, ty - 10); ctx.lineTo(guide.gx + 16, ty - 10); ctx.lineTo(guide.gx, ty + 12); ctx.closePath();
      ctx.stroke(); ctx.fill();
    }
    // 文字: 画面の中ほどに
    ctx.font = font(20); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(guide.text).width + 36, cy = H * 0.5;
    ctx.fillStyle = "rgba(255,253,245,0.95)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 2.5;
    roundRect(W / 2 - tw / 2, cy - 22, tw, 44, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8a5a10"; ctx.fillText(guide.text, W / 2, cy + 1);
    ctx.restore();
  }

  // 障害物の絵（仮）。kind ごとに描き分ける（今は木。岩・山はあとで足す）
  function drawObstacle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    // 影
    ctx.fillStyle = theme.treeShadow;   // 影（夜は濃く、夕暮れは長く）
    const sl = theme.treeShadowScale;
    ctx.beginPath(); ctx.ellipse(10 * sl, 14 * sl, o.r * (0.98 + 0.06 * sl), o.r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    if (o.kind === "pillar") {   // 機械の柱（世界2。10/31-13 決定。上から見た丸い鉄の柱。仮の図形）
      ctx.fillStyle = "#7d8798"; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a9b2c0"; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c9d0da"; ctx.beginPath(); ctx.arc(-o.r * 0.18, -o.r * 0.18, o.r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4f5868";
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * o.r * 0.89, Math.sin(a) * o.r * 0.89, Math.max(2.5, o.r * 0.06), 0, Math.PI * 2); ctx.fill(); }   // ボルト
      ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);   // 黄色と黒の注意の帯
      ctx.beginPath(); ctx.arc(0, 0, o.r * 0.62, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (o.kind === "star") {   // 星のかたまり（世界3。11/1-3。仮の図形）: 白と灰色の岩に、光る小さな星
      ctx.fillStyle = "#8d8aa6"; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b9b6cf"; ctx.beginPath(); ctx.arc(-o.r * 0.15, -o.r * 0.15, o.r * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e4e2f2"; ctx.beginPath(); ctx.arc(-o.r * 0.3, -o.r * 0.3, o.r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff6c8";
      for (let i = 0; i < 6; i++) { const a = i * 2.4, rr = o.r * (0.3 + 0.1 * (i % 3)), x = Math.cos(a) * rr * 1.6, y = Math.sin(a) * rr * 1.6, k = 3 + (i % 2) * 2;
        ctx.beginPath(); ctx.moveTo(x, y - k); ctx.lineTo(x + k * 0.35, y - k * 0.35); ctx.lineTo(x + k, y); ctx.lineTo(x + k * 0.35, y + k * 0.35); ctx.lineTo(x, y + k); ctx.lineTo(x - k * 0.35, y + k * 0.35); ctx.lineTo(x - k, y); ctx.lineTo(x - k * 0.35, y - k * 0.35); ctx.closePath(); ctx.fill(); }
    } else if (o.kind === "rock") {
      ctx.fillStyle = "#b9b3a6"; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    } else {
      // 大きな木: 幹のまわりに、重なった葉のかたまり
      ctx.fillStyle = theme.tree[0];
      ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
      const blobs = 7;
      for (let i = 0; i < blobs; i++) {
        const a = i / blobs * Math.PI * 2;
        ctx.fillStyle = i % 2 ? theme.tree[2] : theme.tree[1];
        ctx.beginPath(); ctx.arc(Math.cos(a) * o.r * 0.55, Math.sin(a) * o.r * 0.55, o.r * 0.48, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = theme.tree[3];
      ctx.beginPath(); ctx.arc(-o.r * 0.2, -o.r * 0.2, o.r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a5a3a";   // 幹のてっぺん
      ctx.beginPath(); ctx.arc(0, 0, Math.max(6, o.r * 0.14), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // 地上の攻撃（10/31-12 決定 B）: 自機の真上の地面に薄い丸。真上の列に地上の敵がいるあいだは、自機からそこへ光の筋が落ちる
  function drawGroundSpot() {
    const tg = lock && lock.hp > 0 ? lock : null;
    const x = tg && tg.word ? Math.min(tg.x + tg.w / 2 - 4, Math.max(tg.x - tg.w / 2 + 4, player.x)) : tg ? tg.x : player.x;
    const y = tg ? tg.y : player.y - BATTLE.bombRange, r = BATTLE.lockRadius;
    ctx.save();
    if (tg && !BATTLE.bombInterval) {   // （11/1-4 から光のたねを投げるので、光の筋は描かない）
      const pulse = 0.75 + Math.sin(t * 30) * 0.25;
      const g = ctx.createLinearGradient(0, player.y - 24, 0, y);
      g.addColorStop(0, `rgba(255,250,215,${0.2 * pulse})`); g.addColorStop(1, `rgba(255,236,150,${0.85 * pulse})`);
      ctx.strokeStyle = g; ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,220,110,0.9)"; ctx.shadowBlur = 14;
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(player.x, player.y - 24); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,255,255,${0.9 * pulse})`; ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // 薄い丸（地面に置いた形なので、少し平たい）
    ctx.globalAlpha = tg ? 0.8 : 0.4;
    ctx.fillStyle = tg ? "rgba(255,240,170,0.35)" : "rgba(255,255,255,0.18)";
    ctx.strokeStyle = tg ? "rgba(255,236,150,0.9)" : "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 爆弾（11/6-3。11/7-23 で少し大きく、山なりを高く、光の尾）: 丸い爆弾に導火線と火花。左右45度へ出て山なりに落ちる。色は黄緑のまま
  //   山なりの高さは見た目だけ（落ちる場所と時刻は前と同じ）
  function bombPos(b, k) {
    const lift = Math.sin(Math.PI * k);
    return { x: b.sx + (b.tx - b.sx) * Math.sqrt(k), y: b.sy + (b.ty - b.sy) * k - lift * BATTLE.seedArc * BATTLE.bombLook.arc, lift };   // 横は先に進む（ななめ45度に飛び出して見える）
  }
  function drawBomb(b) {
    const L = BATTLE.bombLook, k = Math.min(1, b.age / BATTLE.bombFlight), { x, y, lift } = bombPos(b, k);
    const r = (6 + lift * 4) * BATTLE.seedSize * 0.9 * L.size;
    ctx.fillStyle = "rgba(30,30,40,0.22)";   // 地面の影（落ちる先へまっすぐ進む）
    ctx.beginPath(); ctx.ellipse(x, y + lift * BATTLE.seedArc * L.arc, r * 0.8, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // 光の尾: 少し前までの軌道を、うしろほど細く・うすく
    const k0 = Math.max(0, k - L.trail), N = 10;
    ctx.save(); ctx.lineCap = "round";
    for (let i = 0; i < N; i++) {
      const ka = k0 + (k - k0) * i / N, kb = k0 + (k - k0) * (i + 1) / N, pa = bombPos(b, ka), pb = bombPos(b, kb), q = (i + 1) / N;
      ctx.strokeStyle = `rgba(255,190,60,${0.55 * q})`; ctx.lineWidth = 3 + q * r * 1.1;   // 金色の光（明るい床でも見えるように）
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,240,${0.9 * q})`; ctx.lineWidth = 1 + q * r * 0.4;   // まん中の白い筋
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.side * (0.5 + k * 1.2));   // 少しずつ回る
    ctx.fillStyle = BULLET_COLORS.seedHalo; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = BULLET_COLORS.seed; ctx.strokeStyle = "#35501a"; ctx.lineWidth = 2.2;   // 丸い爆弾
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#35501a"; ctx.fillRect(-r * 0.32, -r - 3, r * 0.64, 4);   // 口金
    ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 2.2;   // 導火線
    ctx.beginPath(); ctx.moveTo(0, -r - 3); ctx.quadraticCurveTo(r * 0.5, -r - 9, r * 0.2, -r - 13); ctx.stroke();
    const sx = r * 0.2, sy = -r - 13, fl = 3.5 + Math.sin(b.age * 40) * 1.5;   // 火花（ちらちら）
    ctx.fillStyle = "#ffd23a"; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + b.age * 9, rr = i % 2 ? fl : fl * 2.2; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.3, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();   // つや
    ctx.restore();
  }
  // 爆発（11/6-3。11/7-23 で地面を走る光）: 落ちた場所で輪が広がり、地面に光の筋が放射状に走る
  function drawBlast(r) {
    const k = Math.min(1, r.age / BATTLE.bombRingTime), fade = r.age > BATTLE.bombRingTime ? 1 - (r.age - BATTLE.bombRingTime) / 0.25 : 1;
    const R = BATTLE.bombRing * (0.35 + 0.65 * k);
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = `rgba(200,255,120,${0.28 * (1 - k * 0.5)})`;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    // 地面を走る光（輪より少し先まで伸びる、細長い光の筋）
    ctx.lineCap = "round";
    for (let i = 0; i < BATTLE.bombLook.rays; i++) {
      const a = i / BATTLE.bombLook.rays * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a) * 0.62;
      const r0 = R * 0.25, r1 = BATTLE.bombRing * (0.6 + 1.1 * k);
      const g = ctx.createLinearGradient(r.x + c * r0, r.y + s * r0, r.x + c * r1, r.y + s * r1);
      g.addColorStop(0, "rgba(255,200,60,0)"); g.addColorStop(0.65, `rgba(255,190,50,${0.95 * (1 - k * 0.5)})`); g.addColorStop(1, "rgba(255,240,180,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 5 * (1 - k) + 2;
      ctx.beginPath(); ctx.moveTo(r.x + c * r0, r.y + s * r0); ctx.lineTo(r.x + c * r1, r.y + s * r1); ctx.stroke();
    }
    ctx.strokeStyle = "#f4ffd0"; ctx.lineWidth = 4.5 * (1 - k) + 2;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    if (k < 0.6) { ctx.fillStyle = `rgba(255,240,170,${0.9 * (1 - k / 0.6)})`; ctx.beginPath(); ctx.arc(r.x, r.y, 14 + k * 20, 0, Math.PI * 2); ctx.fill(); }   // まん中の光
    ctx.restore();
  }
  // 割れたかけら（11/7-23）: とがった三角が回りながら飛び、消える
  function drawShard(s) {
    const a = Math.max(0, 1 - s.age / 0.6);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.fillStyle = s.color; ctx.strokeStyle = "rgba(80,70,100,0.75)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.7, s.s * 0.6); ctx.lineTo(-s.s * 0.5, s.s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawOrbs() {   // 世界3の光の玉（11/6-3）
    if (!orbsOn()) return;
    const O = BATTLE.orbs;
    ctx.save();
    ctx.strokeStyle = "rgba(63,140,240,0.28)"; ctx.lineWidth = 1.5;   // 回る道のうすい輪（自分の弾と同じ青。11/6-6）
    ctx.beginPath(); ctx.arc(player.x, player.y, O.radius, 0, Math.PI * 2); ctx.stroke();
    orbPos().forEach((o, i) => {
      const fl = orbFlash[i] / 0.3, R = O.r * (2.2 + fl * 1.6);   // 虫に当たったとき: 大きく白く光る
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, R);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3 + fl * 0.2, fl > 0 ? "rgba(200,230,255,1)" : "rgba(63,140,240,0.95)"); g.addColorStop(1, "rgba(63,140,240,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BULLET_COLORS.shot; ctx.strokeStyle = BULLET_COLORS.shotRim; ctx.lineWidth = 2;   // 玉のしん: 自分の弾と同じ青に白い縁
      ctx.beginPath(); ctx.arc(o.x, o.y, O.r * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (fl > 0) { ctx.strokeStyle = `rgba(255,255,255,${fl})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, O.r * (1.2 + (1 - fl) * 2), 0, Math.PI * 2); ctx.stroke(); }   // 広がる白い輪
    });
    ctx.restore();
  }
  function drawSeedOld(b) {   // 前の光のたねの絵（11/6-3 から使っていない）   // 光のたね（11/1-4。11/2 決定で黄緑・白い縁・1.5倍・回りながら飛ぶ。色は BULLET_COLORS の seed）: 放物線で飛ぶ。地面には影が、まっすぐ進む
    const k = Math.min(1, b.age / BATTLE.bombFlight), lift = Math.sin(Math.PI * k);
    const x = b.sx + (b.tx - b.sx) * k, y = b.sy + (b.ty - b.sy) * k - lift * BATTLE.seedArc;
    const r = (5 + lift * 4) * BATTLE.seedSize;   // 高いところほど大きく
    ctx.fillStyle = "rgba(30,30,40,0.22)";   // 地面の影（落ちる先へまっすぐ）
    ctx.beginPath(); ctx.ellipse(x, y + lift * BATTLE.seedArc, (4 + k * 2) * BATTLE.seedSize, (2.5 + k) * BATTLE.seedSize, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.fillStyle = BULLET_COLORS.seedHalo;
    ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y); ctx.rotate(b.age * 11 * (b.spin || 1));   // 回りながら飛ぶ
    ctx.fillStyle = BULLET_COLORS.seed; ctx.strokeStyle = BULLET_COLORS.seedRim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.2, r * 0.3, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 花がひらく（倒したとき・たねが落ちたとき）
  function drawPop(p) {
    const k = p.age / 0.7;
    const r = (8 + k * 22) * p.scale;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = p.color;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + k;
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * r * 0.6, p.y + Math.sin(a) * r * 0.6, r * 0.35, r * 0.2, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#f3d27a";
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.18, 0, Math.PI * 2); ctx.fill();
    if (p.ring) {   // 広がる光の輪
      ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawItem(it) {
    drawGoldSeed(it.x, it.y + Math.sin(it.age * 5) * 2, 1, it.age);
  }
  // 綿のたね（回復）: 金色できらきら（10/7-1。殻・虫と見分けやすく）
  function drawGoldSeed(x, y, k, age) {
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(age * 8) * 0.25;
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 22 * k);
    gr.addColorStop(0, "rgba(255,225,120,0.95)"); gr.addColorStop(1, "rgba(255,225,120,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 22 * k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e8b22a"; ctx.strokeStyle = "#a87812"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, 7 * k, 9 * k, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff6c8";
    ctx.beginPath(); ctx.arc(x - 2 * k, y - 3 * k, 2 * k, 0, Math.PI * 2); ctx.fill();
    // きらきら（まわりを回る小さな星）
    ctx.fillStyle = "#fff3b0";
    for (let i = 0; i < 3; i++) {
      const a = age * 2.5 + i * 2.1, r = 14 * k, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r, sz = (2.5 + Math.sin(age * 9 + i) * 1.2) * k;
      ctx.beginPath(); ctx.moveTo(sx, sy - sz * 1.6); ctx.lineTo(sx + sz * 0.5, sy); ctx.lineTo(sx, sy + sz * 1.6); ctx.lineTo(sx - sz * 0.5, sy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - sz * 1.6, sy); ctx.lineTo(sx, sy + sz * 0.5); ctx.lineTo(sx + sz * 1.6, sy); ctx.lineTo(sx, sy - sz * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 時間帯の虫の絵（仮の図形。10/25-1）。描いたら true
  function drawBug(f, lit) {
    const k = f.type, flap = Math.abs(Math.sin(f.age * 14));
    if (k === "butterfly") {
      ctx.fillStyle = lit ? "#ffd6f0" : "#f59ac8";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 7, -3, 8 * (0.4 + flap * 0.6), 9, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 5, 7, 5 * (0.4 + flap * 0.6), 6, -s * 0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#5a3a2a"; ctx.fillRect(-1.5, -9, 3, 18);
    } else if (k === "grasshopper") {
      ctx.fillStyle = lit ? "#cfe8a0" : "#7fae3a";
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4f7a26"; ctx.lineWidth = 2.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4, 4); ctx.lineTo(s * 13, -2); ctx.lineTo(s * 11, 12); ctx.stroke(); }
    } else if (k === "dragonfly") {
      ctx.rotate((f.dir || 1) > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillStyle = "rgba(220,240,255,0.8)";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 10, -3, 10, 3.5 + flap * 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 9, 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = lit ? "#ffd0a0" : "#d86a2a"; ctx.fillRect(-2.5, -10, 5, 22);
    } else if (k === "kanabun") {   // コガネムシ: つやのある緑の丸い背中
      ctx.fillStyle = lit ? "#c8f0c0" : "#3f8a5a";
      ctx.beginPath(); ctx.ellipse(0, 1, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1f4a30"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 13); ctx.stroke();
      ctx.fillStyle = "#1f4a30"; ctx.beginPath(); ctx.arc(0, -11, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-4, -3, 2, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (k === "moth") {
      ctx.fillStyle = lit ? "#f4ead0" : "#bba98a";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 7, 0, 9 * (0.5 + flap * 0.5), 10, s * 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#6a5a40"; ctx.fillRect(-2, -8, 4, 16);
    } else if (k === "bat") {
      ctx.fillStyle = lit ? "#a090c0" : "#3a2f50";
      ctx.beginPath(); ctx.moveTo(0, -4);
      for (const s of [-1, 1]) { ctx.lineTo(s * 18, -8 + flap * 8); ctx.lineTo(s * 12, 2); ctx.lineTo(s * 6, -1); }
      ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (k === "firefly") {
      ctx.fillStyle = "#4a4a30"; ctx.beginPath(); ctx.ellipse(0, -3, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#ffffff" : "#e8ff7a"; ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI * 2); ctx.fill();
    } else return false;
    return true;
  }

  // 雑魚の絵（仮）
  function drawFiller(f) {
    if (f.delay > 0) return;
    const { x, y } = f;
    const r = FILLER_TYPES[f.type].r;
    const hasFilter = "filter" in ctx;
    if (f.layer === "ground" && worldDef.id >= 2) { drawGroundJunk(f); fillerHpDots(f); return; }   // 世界2・3の地上の雑魚は、虫とは別の種類（11/1 決定）
    if (bugSprites && hasFilter) {   // 前もって作った絵を置くだけ（毎フレームの filter と輪郭のぼかしをやめる。10/31-14、世界1も 11/3-8）
      const sp = bugSprite(f, f.flash > 0);
      ctx.save();
      ctx.translate(x, y);
      if (f.flash > 0) ctx.translate((Math.random() - 0.5) * 3 * BATTLE.fillerDrawScale, 0);
      if (f.type === "ladybug") ctx.rotate(f.ang || 0);
      ctx.drawImage(sp.c, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
      ctx.restore();
      fillerHpDots(f);
      return;
    }
    ctx.save();
    ctx.globalAlpha = BATTLE.fillerAlpha;
    if (hasFilter) ctx.filter = [theme.fillerFilter !== "none" ? theme.fillerFilter : "", BATTLE.fillerDark].join(" ").trim() || "none";   // 時間帯の色味＋暗い色
    ctx.shadowColor = BATTLE.fillerOutline; ctx.shadowBlur = 3;   // 濃い輪郭（背景の飾りと見分けやすく。10/21-1）
    ctx.translate(x, y);
    ctx.scale(BATTLE.fillerDrawScale, BATTLE.fillerDrawScale);
    if (!hasFilter) f._darkFallback = true;
    if (f.flash > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
    fillerShape(f, f.flash > 0);
    ctx.restore();
    if (f._darkFallback) {   // filter が使えない端末: 上にうすく暗い色を重ねる
      ctx.fillStyle = "rgba(30,25,40,0.4)";
      ctx.beginPath(); ctx.arc(x, y, r * BATTLE.fillerDrawScale * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    fillerHpDots(f);
  }
  // 世界2・3の地上の雑魚（11/1 決定。仮の図形）: 色は灰・茶（空中の虫は青・紫）。硬さ・数・弾は世界1の からまり草（weed）・いばらの株（thorn）と同じ
  //   世界2: 歯車・ねじ・糸くずの玉（weed の3種を x で決める）、大きい歯車（thorn）。床に貼りついて影が濃い
  //   世界3: 星のかけら（weed）・小さな隕石（thorn）。ふわっと跳ねる（影は地面に残る）
  function drawGroundJunk(f) {
    const r = f.r * 0.95, lit = f.flash > 0, w2 = worldDef.id === 2, big = f.type === "thorn";
    const kind = big ? 0 : (Math.floor(f.x0 === undefined ? (f.x0 = f.x) : f.x0) % 3 + 3) % 3;   // 出たときの位置で3種
    const hop = w2 ? 0 : Math.abs(Math.sin(f.age * 2.6 + f.x0 * 0.05)) * BATTLE.groundHop;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.flash > 0) ctx.translate((Math.random() - 0.5) * 2, 0);
    ctx.fillStyle = w2 ? "rgba(25,20,15,0.55)" : "rgba(20,15,40,0.35)";   // 影
    ctx.beginPath(); ctx.ellipse(3, r * 0.45, r * (1 - hop / 40), r * 0.42 * (1 - hop / 40), 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -hop);
    const c1 = lit ? "#e8e2d8" : w2 ? "#8a8580" : "#d8d6dc", c2 = lit ? "#cdb898" : w2 ? "#7a5a3a" : "#9a96a2", c3 = w2 ? "#4a443e" : "#6e6a78";
    ctx.strokeStyle = c3; ctx.lineWidth = 1.5;
    if (w2 && (big || kind === 0)) {   // 歯車（灰色）
      const R = big ? r : r * 0.85, rot = f.age * (f.slide || 1) * 1.5;
      ctx.rotate(rot); ctx.fillStyle = c1; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? R * 0.78 : R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (w2 && kind === 1) {   // ねじ（灰色の頭と茶色の軸）
      ctx.rotate(0.5); ctx.fillStyle = c2; ctx.fillRect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.95); ctx.strokeRect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.95);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(r * 0.3, -r * 0.3); ctx.stroke();
    } else if (w2) {   // 糸くずの玉（茶色。もしゃもしゃ）
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#a88a62"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15, r * (0.35 + i * 0.05), a, a + 2.2); ctx.stroke(); }
    } else if (big) {   // 小さな隕石（灰色のごつごつ）
      ctx.fillStyle = c2; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = r * (0.8 + 0.2 * Math.sin(i * 2.7)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c3; for (const [dx, dy, rr] of [[-5, -3, 3.5], [5, 4, 2.5], [2, -7, 2]]) { ctx.beginPath(); ctx.arc(dx, dy, rr, 0, Math.PI * 2); ctx.fill(); }
    } else {   // 星のかけら（白）
      ctx.rotate(f.age * 0.8); ctx.fillStyle = c1; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.38 : r * 0.85; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // 硬い雑魚は、のこりの硬さを小さな点で
  function fillerHpDots(f) {
    const { x, y } = f;
    if ((f.maxHp || 1) > 1 && f.hp < f.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < f.hp; i++) { ctx.beginPath(); ctx.arc(x - (f.hp - 1) * 4 + i * 8, y - f.r - 6, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 虫の形（drawFiller と、世界2・3の前もって作る絵で使う）
  function fillerShape(f, lit) {
    const r = FILLER_TYPES[f.type].r;
    if (drawBug(f, lit)) { /* 時間帯の虫（仮の図形） */ }
    else if (f.type === "ladybug") {
      ctx.rotate((f.ang || 0) + (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillStyle = "rgba(255,255,255,0.7)";   // はね
      ctx.beginPath(); ctx.ellipse(-8, 2, 8, 4, 0.5 + Math.sin(t * 40) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 2, 8, 4, -0.5 - Math.sin(t * 40) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#ffb3a8" : "#e86f5f";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4b3a35";
      ctx.beginPath(); ctx.arc(0, -r * 0.75, r * 0.4, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy] of [[-4, -2], [4, -2], [-4, 5], [4, 5]]) { ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (f.type === "bee") {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.ellipse(-7, -8, 7, 4, -0.6 + Math.sin(t * 45) * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -8, 7, 4, 0.6 - Math.sin(t * 45) * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#fff0a8" : "#f2c84b";
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6b5232";
      ctx.fillRect(-r * 0.62, -2, r * 1.24, 3); ctx.fillRect(-r * 0.55, 4, r * 1.1, 3);
      ctx.beginPath(); ctx.arc(-3, -6, 1.5, 0, Math.PI * 2); ctx.arc(3, -6, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === "ghost") {
      ctx.fillStyle = lit ? "#fff6c8" : "#ffffff";
      ctx.strokeStyle = "#d6dcc8"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + t;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6c7562";
      ctx.beginPath(); ctx.arc(-4, -1, 2, 0, Math.PI * 2); ctx.arc(4, -1, 2, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === "weed") {
      ctx.fillStyle = "rgba(35,50,20,0.45)";   // 濃い影: 地面に貼りついて見える
      ctx.beginPath(); ctx.ellipse(0, 4, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = lit ? "#b8dc8c" : "#5e8a3a"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + Math.sin(t * 2 + i) * 0.2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a + 0.6) * r, Math.sin(a + 0.6) * r, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = "#4b6b2e";
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-2, -1, 1.4, 0, Math.PI * 2); ctx.arc(2, -1, 1.4, 0, Math.PI * 2); ctx.fill();
    } else {   // thorn
      ctx.fillStyle = "rgba(35,50,20,0.45)";   // 濃い影: 地面に貼りついて見える
      ctx.beginPath(); ctx.ellipse(0, 5, r * 1.05, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit ? "#a7c88a" : "#557a41";
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.7 : r;
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f2a7bd";
      for (const [dx, dy] of [[-5, -4], [6, 2], [-1, 7]]) { ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 虫の絵（世界1〜3。地上の雑魚の からまり草・いばらの株も）: 種類・光っているか・向き・羽ばたきの段（12段）ごとに、色を変えて輪郭をつけた絵を1回だけ作る（10/31-14）
  // 作り方は drawFiller とまったく同じ（同じ filter・輪郭・濃さで、別の小さな canvas に描く）。てんとう虫の向き（ang）だけは置くときに回す
  let bugSprites = null;
  const BUG_STEPS = 12;
  const BUG_CYCLE = { butterfly: [Math.PI / 14, "age"], moth: [Math.PI / 14, "age"], bat: [Math.PI / 14, "age"], dragonfly: [Math.PI / 14, "age"],
    ladybug: [Math.PI * 2 / 40, "t"], bee: [Math.PI * 2 / 45, "t"], ghost: [Math.PI * 2 / 7, "t"], weed: [Math.PI, "t"] };   // 羽ばたき・ゆれの1回りの秒数と、もとにする時間
  function bugSprite(f, lit) {
    const cy = BUG_CYCLE[f.type];
    const step = cy ? Math.floor((((cy[1] === "age" ? f.age : t) % cy[0]) + cy[0]) % cy[0] / cy[0] * BUG_STEPS) % BUG_STEPS : 0;
    const dir = f.type === "dragonfly" || f.type === "ladybug" ? ((f.dir || 1) > 0 ? 1 : -1) : 1;
    const key = f.type + (lit ? "+" : "-") + dir + ":" + step + "@" + dpr;
    if (bugSprites[key]) return bugSprites[key];
    const half = (Math.max(24, FILLER_TYPES[f.type].r * 1.35) + 4) * BATTLE.fillerDrawScale + 4;   // 絵の半分の大きさ（CSS px。羽・輪郭のぼかしが入るように）
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(half * 2 * dpr);
    const g = c.getContext("2d"), keepCtx = ctx, keepT = t;
    const ph = cy ? (step + 0.5) / BUG_STEPS * cy[0] : 0;
    try {
      ctx = g; if (cy && cy[1] === "t") t = ph;
      ctx.setTransform(dpr, 0, 0, dpr, c.width / 2, c.height / 2);
      ctx.globalAlpha = BATTLE.fillerAlpha;
      ctx.filter = [theme.fillerFilter !== "none" ? theme.fillerFilter : "", BATTLE.fillerDark].join(" ").trim() || "none";
      ctx.shadowColor = BATTLE.fillerOutline; ctx.shadowBlur = 3;
      ctx.scale(BATTLE.fillerDrawScale, BATTLE.fillerDrawScale);
      fillerShape({ type: f.type, age: cy && cy[1] === "age" ? ph : 0, dir, ang: 0 }, lit);
    } finally { ctx = keepCtx; t = keepT; }
    return (bugSprites[key] = { c, half });
  }

  // 地上の語句: 畑にうまった土の盛り上がりの上に文字
  // 語句の文字: 光る縁取りと、漢字の上に小さくふりがな
  // 吸い込める回（最後の回）は金色に光る。それより前は白く光る
  // 縦書きのときの文字の形（のばす棒・かっこは縦向きに）
  const VERTICAL_GLYPH = { "ー": "｜", "(": "︵", ")": "︶", "（": "︵", "）": "︶", "〜": "≀" };

  // 縦書きの語句（お題バトル）
  function drawVerticalWord(e, x, y, alpha) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(e.size); ctx.lineJoin = "round";
    const fillColor = e.last ? GOLD_COLOR : ENEMY_COLOR[e.role];
    for (const p of e.parts) {
      const ch = VERTICAL_GLYPH[p.ch] || p.ch, py = y + p.oy;
      if (p.broken || e.open) {   // 殻から解けた文字: 金色に光る（e.open ＝ 大ボス「3つを順に」で正しい順に当てたことば。白い縁どりで、はっきり読めるように。11/2）
        ctx.globalAlpha = alpha;
        if (e.open && !p.broken) { ctx.globalAlpha = 1; ctx.lineWidth = 7; ctx.strokeStyle = "#ffffff"; ctx.strokeText(ch, x, py); }
        ctx.shadowColor = "rgba(255,214,90,1)"; ctx.shadowBlur = 12; ctx.fillStyle = GOLD_COLOR; ctx.fillText(ch, x, py); ctx.shadowBlur = 0; continue;
      }
      const wob = p.flash > 0 ? (Math.random() - 0.5) * 3 : 0;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,214,90,0.9)"; ctx.shadowBlur = 12;
      ctx.lineWidth = 8; ctx.strokeStyle = wrongBlink(e) ? "#ff6b6b" : e.flash > 0 ? "#fff6c8" : (theme.wordStroke || "#fff6d8");
      ctx.strokeText(ch, x + wob, py);
      ctx.shadowBlur = 0;
      ctx.fillStyle = fillColor; ctx.fillText(ch, x + wob, py);
      if (hasShell(e) && p.maxHp) { drawCharShell(e.role, x + wob, py, e.size, p.hp / p.maxHp); textOverShell(ch, x + wob, py, fillColor, alpha); }
      if (p.maxHp && p.hp < p.maxHp) {   // 文字ごとの残りの耐久（右に小さな帯）
        const bh = e.charH * 0.7;
        ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(x + e.w / 2 + 2, py - bh / 2, 3, bh);
        ctx.fillStyle = ENEMY_COLOR[e.role]; ctx.fillRect(x + e.w / 2 + 2, py + bh / 2 - bh * p.hp / p.maxHp, 3, bh * p.hp / p.maxHp);
      }
    }
    // ふりがなは列の右に縦書きで（となりの列とぶつからないように）
    if (hasKanji(e.word.word)) {
      ctx.globalAlpha = alpha;
      const ks = Math.max(9, Math.min(BATTLE.kanaSize, Math.floor(e.h / Math.max(1, Array.from(e.word.kana).length))));
      ctx.font = font(ks); ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.fillStyle = "#5d6b4c";
      const kx = x + e.w / 2 + ks / 2 + 2;
      Array.from(e.word.kana).forEach((ch, i) => {
        const c = VERTICAL_GLYPH[ch] || ch, ky = y - e.h / 2 + ks / 2 + i * ks;
        ctx.strokeText(c, kx, ky); ctx.fillText(c, kx, ky);
      });
    }
    // 大ボス「3つを順に」（10/31-10 試作）: 当てたことばの上に 1・2・3。まちがえた直後は、正しい順を青い数字で一度だけ見せる
    if (odai && odai.mode === "order" && e.seqNo !== undefined) {
      const n = e.num || (odai.show > 0 ? e.seqNo + 1 : 0);
      if (n) {
        const cy = y - e.h / 2 - 18;
        ctx.globalAlpha = 1; ctx.fillStyle = e.num ? "#e07a3a" : "rgba(60,110,200,0.9)"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, cy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = font(17); ctx.fillStyle = "#ffffff"; ctx.fillText(String(n), x, cy + 1);
      }
    }
    ctx.restore();
  }

  // 殻があるか（2回目の旅の語句。1回目の旅の双眼鏡の語句にはない）
  const hasShell = e => e.last && !e.explore && !!e.pattern;
  const SHELL = {
    zako: { name: "綿毛のまゆ", color: "#ffffff", bit: "#ffffff" },
    mid:  { name: "いばら",     color: "#5f6f34", bit: "#8a9a50" },
    boss: { name: "霧",         color: "#b9b6cc", bit: "#d6d3e6" },
  };
  // 綿毛のまゆ（語句全体を包む）。k ＝ 殻の残り（1〜0）。うしろ側（front=false）と、語句の上にかかる側（front=true）
  function drawCocoon(e, x, y, k, front) {
    if (k <= 0) return;
    const kanaUp = hasKanji(e.word.word) ? BATTLE.kanaSize * 0.6 : 0;
    const rx = e.w / 2 + 22, ry = e.size * 0.85 + kanaUp * 0.6, cy = y - kanaUp * 0.5;   // 10/7-1: 白く光る大きなもの
    ctx.save();
    const near = k <= BATTLE.shellNearDone;   // あと少し: 黄色く光る（10/25-16）
    if (!front) {
      ctx.globalAlpha = near ? 0.8 + 0.2 * Math.sin(t * 10) : 0.45 + 0.5 * k;
      ctx.shadowColor = near ? "rgba(255,214,60,1)" : "rgba(255,255,255,1)"; ctx.shadowBlur = near ? 26 : 18;
      const lk = WORLD_LOOK[worldDef.id] || {};
      ctx.fillStyle = near ? "rgba(255,232,120,0.85)" : (lk.cocoon || "rgba(255,255,255,0.75)");
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // ふちの毛羽（残りが少ないほど減る）
      const n = Math.round(10 + 14 * k);
      ctx.fillStyle = near ? "#ffe27a" : (lk.fuzz || "#ffffff");
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + Math.sin(t * 0.8 + i) * 0.05;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx, cy + Math.sin(a) * ry, 4 + 3 * k + Math.sin(t * 2 + i * 1.7) * 1, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // 語句の上にかかる、細い糸と、うすいベール
      ctx.globalAlpha = BATTLE.shellVeil * k;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(x, cy, rx * 0.95, ry * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55 * k;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        const yy = cy + (i - 1) * ry * 0.55, sw = Math.sin(t * 1.5 + i) * 4;
        ctx.beginPath(); ctx.moveTo(x - rx, yy + sw); ctx.quadraticCurveTo(x, yy - ry * 0.35 - sw, x + rx, yy - sw); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 殻を描いたあと、文字をもう一度縁取りして上に描く（WORLD_LOOK の textOver がある世界だけ。10/31-12 世界3）
  function textOverShell(ch, x, y, fillColor, alpha) {
    const w = (WORLD_LOOK[worldDef.id] || {}).textOver;
    if (!w) return;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.lineJoin = "round";
    ctx.lineWidth = w; ctx.strokeStyle = theme.wordStroke || "#ffffff"; ctx.strokeText(ch, x, y);
    ctx.fillStyle = fillColor; ctx.fillText(ch, x, y);
    ctx.restore();
  }
  // 1文字ずつの殻（中ボス＝いばら、大ボス＝霧）。k ＝ その文字の殻の残り（1〜0）
  function drawCharShell(role, cx, cy, sz, k) {
    if (k <= 0) return;
    ctx.save();
    if (k <= BATTLE.shellNearDone) {   // あと少し: 文字のまわりが黄色く光る（10/25-16）
      const g = ctx.createRadialGradient(cx, cy, sz * 0.2, cx, cy, sz * 0.9);
      g.addColorStop(0, `rgba(255,224,90,${0.65 + 0.25 * Math.sin(t * 10)})`); g.addColorStop(1, "rgba(255,224,90,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, sz * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    if (role === "boss") {   // 霧のかたまり: 文字のまわりに、うすいもや
      ctx.globalAlpha = 0.25 + 0.4 * k;
      ctx.fillStyle = (WORLD_LOOK[worldDef.id] || {}).boss || SHELL.boss.bit;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + t * 0.4;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * sz * 0.5, cy + Math.sin(a) * sz * 0.45, sz * (0.22 + 0.12 * k), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = BATTLE.shellVeil * k * 1.2;
      ctx.fillStyle = SHELL.boss.color;
      ctx.beginPath(); ctx.ellipse(cx, cy, sz * 0.55, sz * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } else {                 // いばら: 文字にからむ、とげのあるつる
      const lk = WORLD_LOOK[worldDef.id] || {}, ta = lk.thornAlpha || [0.45, 0.5];
      ctx.globalAlpha = ta[0] + ta[1] * k;
      ctx.strokeStyle = lk.mid || SHELL.mid.color; ctx.lineWidth = lk.thornWidth || 2; ctx.lineCap = "round";
      const n = k > 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const s0 = i ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.6, cy + s0 * sz * 0.3);
        ctx.bezierCurveTo(cx - sz * 0.2, cy - s0 * sz * 0.6, cx + sz * 0.2, cy + s0 * sz * 0.6, cx + sz * 0.6, cy - s0 * sz * 0.3);
        ctx.stroke();
        for (let j = 1; j <= 3; j++) {   // とげ
          const u = j / 4, px = cx - sz * 0.6 + sz * 1.2 * u, py = cy + s0 * sz * 0.3 * Math.cos(u * Math.PI);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - s0 * 5); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawWordText(e, x, y, alpha) {
    if (e.vertical) { drawVerticalWord(e, x, y, alpha); return; }
    const word = e.word;
    const cocoon = hasShell(e) && !e.parts && !e.ground && e.maxHp > 0 ? e.hp / e.maxHp : 0;   // ザコの語句: 綿毛のまゆ（残りの硬さで、うすくなる）。地上のことばは木箱・歯車（drawGroundWord）
    if (cocoon > 0) { ctx.save(); ctx.globalAlpha = alpha; drawCocoon(e, x, y, cocoon, false); ctx.restore(); }
    if (!e.last && !e.explore) alpha *= 0.55;   // （1回目の旅の双眼鏡の語句は、半透明にしない）
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(e.size);
    ctx.lineJoin = "round";
    const pulse = 0.6 + Math.sin(t * 5 + e.phase) * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = e.last ? `rgba(255,214,90,${0.7 + pulse * 0.3})` : "rgba(255,255,255,0.95)";
    ctx.shadowBlur = e.last ? 10 + pulse * 8 : 10;
    if (e.appearT > 0) {   // 画面に入ったばかり: 強く光って「来た」とわかる（まだ撃てない）
      const f = 0.6 + Math.sin(t * 18) * 0.4;
      ctx.shadowColor = `rgba(255,255,230,${f})`; ctx.shadowBlur = 26;
    }
    ctx.lineWidth = 8;
    ctx.strokeStyle = wrongBlink(e) ? "#ff6b6b" : e.flash > 0 ? "#fff6c8" : (theme.wordStroke || (e.last ? "#fff6d8" : "#ffffff"));   // 縁取りの色は時間帯で変えられる（ちがうことばは赤く点滅）
    if (e.parts) {
      for (const p of e.parts) if (!p.broken) ctx.strokeText(p.ch, x + p.ox, y);
    } else {
      ctx.strokeText(word.word, x, y);
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
    const fillColor = e.last ? GOLD_COLOR : ENEMY_COLOR[e.role];   // 本番の語句は金色
    ctx.fillStyle = fillColor;
    if (e.parts) {
      for (const p of e.parts) {
        const px = x + p.ox;
        if (p.broken) {   // 殻から解けた文字: 金色に光る（1回目の旅のしくみのころは、うすい形だけ残していた）
          ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = "rgba(255,214,90,1)"; ctx.shadowBlur = 12; ctx.fillStyle = GOLD_COLOR; ctx.fillText(p.ch, px, y); ctx.restore();
          continue;
        }
        const wob = p.flash > 0 ? (Math.random() - 0.5) * 3 : 0;
        ctx.fillText(p.ch, px + wob, y);
        if (hasShell(e) && p.maxHp) { drawCharShell(e.role, px, y, e.size, p.hp / p.maxHp); textOverShell(p.ch, px + wob, y, fillColor, alpha); ctx.fillStyle = fillColor; }
        // 文字ごとの残りの耐久（小さな帯）
        if (p.hp < p.maxHp) {
          const bw = p.cw * 0.7;
          ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(px - bw / 2, y + e.size / 2 + 3, bw, 3);
          ctx.fillStyle = ENEMY_COLOR[e.role]; ctx.fillRect(px - bw / 2, y + e.size / 2 + 3, bw * p.hp / p.maxHp, 3);
        }
        ctx.fillStyle = fillColor;
      }
    } else {
      ctx.fillText(word.word, x, y);
    }
    if (cocoon > 0) { ctx.save(); ctx.globalAlpha = alpha; drawCocoon(e, x, y, cocoon, true); ctx.restore(); ctx.globalAlpha = alpha; }
    if (hasKanji(word.word)) {
      ctx.font = font(BATTLE.kanaSize);
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      const ky = y - e.size / 2 - BATTLE.kanaSize / 2 - 1;
      ctx.strokeText(word.kana, x, ky);
      ctx.fillStyle = "#5d6b4c";
      ctx.fillText(word.kana, x, ky);
    }
    ctx.globalAlpha = 1;
  }

  function drawGroundWord(e) {
    const wob = e.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
    if (worldDef.id >= 2) {   // 世界2・3（10/31-12 決定）: 地面に貼りついた見た目。下に濃い影、殻は地面らしい形（世界2 木箱・世界3 歯車。仮の図形）、文字は少し平たく
      const k = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 0;   // 殻は残りの硬さでうすくなる
      const bw = e.w + 30, bh = e.size * 1.15;
      if (gMoves(e)) drawBelt(e.y, bh + 14, e.vx * (evActive("reverse") ? -1 : 1));   // 動く: コンベアの帯（10/31-13）
      if (gHides(e)) {   // 隠れる: 隠れているあいだは隠れ場所だけ。顔を出すときは、隠れ場所から「ぴょこ」と出る（10/31-13）
        drawHatch(e.x, e.y + (gHidden(e) ? 0 : bh * 0.42), bw, gHidden(e) ? bh * 0.85 : bh * 0.4);
        if (gHidden(e)) return;
      }
      const pop = gHides(e) && e.popT !== undefined && e.popT < 0.3 ? Math.min(1.15, e.popT / 0.15) - Math.max(0, e.popT - 0.15) : 1;   // 出てくる瞬間に少しのびる
      ctx.save();
      if (pop !== 1) { ctx.translate(e.x, e.y + bh / 2); ctx.scale(1, pop); ctx.translate(-e.x, -e.y - bh / 2); }
      ctx.fillStyle = "rgba(15,20,35,0.6)";
      ctx.beginPath(); ctx.ellipse(e.x + 5, e.y + bh * 0.45, bw * 0.56, bh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      if (k > 0) { ctx.globalAlpha = 0.35 + 0.65 * k; if (worldDef.id === 2) drawCrate(e.x, e.y, bw, bh); else drawGear(e.x, e.y, bw, bh); }
      ctx.restore();
      ctx.save(); ctx.translate(e.x + wob, e.y); ctx.scale(1, BATTLE.groundTextScale * pop); drawWordText(e, 0, 0, 1); ctx.restore();
      drawHpDots(e);
      return;
    }
    // 濃い影: 地面に貼りついて見える
    ctx.fillStyle = "rgba(35,50,20,0.4)";
    roundRect(e.x - e.w / 2 - 18, e.y - e.h / 2 - 2, e.w + 36, e.h + 16, 18); ctx.fill();
    ctx.fillStyle = "#c9ab7f";
    roundRect(e.x - e.w / 2 - 14, e.y - e.h / 2 - 6, e.w + 28, e.h + 12, 16); ctx.fill();
    ctx.fillStyle = "#dcc297";
    roundRect(e.x - e.w / 2 - 10, e.y - e.h / 2 - 4, e.w + 20, e.h + 4, 14); ctx.fill();
    // 小さな芽
    ctx.fillStyle = "#7fae55";
    ctx.beginPath(); ctx.ellipse(e.x + e.w / 2 + 6, e.y - e.h / 2 - 4, 5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    drawWordText(e, e.x + wob, e.y, 1);
    drawHpDots(e);
    // 地上のかげ: 木のかげが語句の上にかかっていて、見えにくい
    const cx = e.x - e.w * 0.25, cy = e.y - e.h * 0.3;
    ctx.fillStyle = "rgba(60,90,45,0.32)";
    ctx.beginPath(); ctx.ellipse(cx, cy, e.w * 0.55, e.h * 0.95, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(110,150,80,0.55)";
    for (const [dx, dy, r] of [[-0.45, -0.7, 0.22], [-0.15, -0.95, 0.26], [0.15, -0.75, 0.2], [-0.6, -0.25, 0.18]]) {
      ctx.beginPath(); ctx.arc(cx + dx * e.w * 0.6, cy + dy * e.h, r * e.w * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 動く地上のことばのコンベア（10/31-13 仮の図形）: 画面の横いっぱいの帯。すじが動く向きに流れる
  function drawBelt(y, h, vx) {
    const x0 = stripRight();
    ctx.save();
    ctx.fillStyle = worldDef.id === 3 ? "rgba(70,60,110,0.75)" : "rgba(60,70,88,0.75)";
    ctx.fillRect(x0, y - h / 2, W - x0, h);
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3;
    const off = ((t * vx) % 24 + 24) % 24;
    for (let x = x0 - 24 + off; x < W + 24; x += 24) { ctx.beginPath(); ctx.moveTo(x, y - h / 2 + 3); ctx.lineTo(x + (vx >= 0 ? 8 : -8), y); ctx.lineTo(x, y + h / 2 - 3); ctx.stroke(); }
    ctx.fillStyle = "rgba(20,24,36,0.6)"; ctx.fillRect(x0, y - h / 2 - 3, W - x0, 3); ctx.fillRect(x0, y + h / 2, W - x0, 3);
    ctx.restore();
  }
  // 隠れ場所（10/31-13 仮の図形）: 機械のふた（世界2は鉄色、世界3は紫）。注意の黄色い線
  function drawHatch(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(15,20,35,0.55)"; ctx.beginPath(); ctx.ellipse(x + 4, y + h * 0.55, w * 0.55, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = worldDef.id === 3 ? "#6c6390" : "#6b7486"; roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill();
    ctx.strokeStyle = worldDef.id === 3 ? "#3f3760" : "#3f4656"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
    for (const f of [-0.15, 0.15]) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 8, y + h * f); ctx.lineTo(x + w / 2 - 8, y + h * f); ctx.stroke(); }
    ctx.fillStyle = "#e0b03a"; ctx.fillRect(x - w / 2 + 6, y - h / 2 + 3, w - 12, 3);
    ctx.restore();
  }
  // 地上のことばの殻（10/31-12 仮の図形）: 世界2 木箱（板の線とくぎ）／世界3 歯車（平たい楕円のまわりに歯）
  function drawCrate(x, y, w, h) {
    ctx.fillStyle = "#c39a62"; roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#7a5530"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(122,85,48,0.55)";
    for (const f of [-0.17, 0.17]) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y + h * f); ctx.lineTo(x + w / 2 - 4, y + h * f); ctx.stroke(); }
    ctx.fillStyle = "#6a4a2a";
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + sx * (w / 2 - 6), y + sy * (h / 2 - 6), 2, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawGear(x, y, w, h) {
    const rx = w / 2, ry = h / 2, n = Math.max(10, Math.round(w / 14));
    ctx.fillStyle = "#77739c";
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ctx.save(); ctx.translate(x + Math.cos(a) * rx, y + Math.sin(a) * ry); ctx.rotate(Math.atan2(Math.sin(a) * rx, Math.cos(a) * ry));
      ctx.fillRect(-5, -4, 10, 8); ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a9a5cc"; ctx.beginPath(); ctx.ellipse(x, y, rx - 5, ry - 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 中ボス・大ボスは硬さを小さな丸で表示
  function drawHpDots(e) {
    if (e.parts || e.maxHp <= 1) return;
    if (hasShell(e)) return;   // 2回目の旅は、硬さを丸ではなく殻の厚みで見せる   // 1文字ずつ壊す敵は、文字ごとの帯で出す
    const n = e.maxHp, gap = 10, x0 = e.x - (n - 1) * gap / 2;
    const dy = e.y - e.h / 2 - 10 - (hasKanji(e.word.word) ? BATTLE.kanaSize + 4 : 0);   // ふりがなより上に出す
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(x0 + i * gap, dy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i < e.hp - 1e-6 ? ENEMY_COLOR[e.role] : "rgba(0,0,0,0.12)";
      ctx.fill();
    }
  }

  function drawBanner() {
    const total = banner.total || (banner.total = banner.t);
    const a = Math.min(1, banner.t / 0.3, (total - banner.t) / 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const y = H * 0.42;
    const lines = banner.text.split("\n");   // 「\n」で2行にできる
    const bh = 60 + (lines.length - 1) * 30;
    ctx.fillStyle = banner.color || "rgba(196,87,122,0.88)";
    ctx.fillRect(0, y - bh / 2, W, bh);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let size = 28;
    ctx.font = font(size);
    while (Math.max(...lines.map(l => ctx.measureText(l).width)) > W - 24 && size > 16) { size -= 2; ctx.font = font(size); }
    ctx.fillStyle = "#fffdf7";
    lines.forEach((l, i) => ctx.fillText(l, W / 2 + (1 - a) * 40, y + (i - (lines.length - 1) / 2) * (size + 6)));
    ctx.globalAlpha = 1;
  }

  // 敵の弾（10/25-7）: 単純な球。色は BULLET_COLORS（虫の弾はザコと同じ赤紫）
  function drawEnemyBullet(b) {
    if (b.kind === "screw") {   // 出来事のねじ（11/1-2）: 回りながら飛ぶ、金属の灰色のねじ（仮の図形）
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t * 9); ctx.scale(1.4, 1.4);
      ctx.fillStyle = "#6f6a64"; ctx.fillRect(-3, 2, 6, 12);
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = "#9a958e"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#4a4640"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.restore(); return;
    }
    if (b.kind === "spark") {   // 星がはじけた小さな弾（11/1-2）
      ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fillStyle = "#fff6c8"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#b08a20"; ctx.stroke(); return;
    }
    const lb = (WORLD_LOOK[worldDef.id] || {}).bullet, C = lb ? Object.assign({}, BULLET_COLORS, lb) : BULLET_COLORS, r = BATTLE.enemyBulletSize * (1 + C.pulse * Math.sin(t * C.pulseSpeed + b.x * 0.05));
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C[b.kind] || C.zako; ctx.fill();
    ctx.lineWidth = C.rimWidth; ctx.strokeStyle = C.rim; ctx.stroke();
  }

  // 自機＝ふわり（10/25-6。A君はふわりに乗っている設定なので、乗り物の絵はない）
  // 絵は assets/fuwari_1〜3.png（資料/絵/ のふわりの絵から tools/fuwari_cut.js で切り出し、背景を透明にしたもの）
  const fuwariImgs = [1, 2, 3].map(n => Object.assign(new Image(), { src: `assets/fuwari_${n}.png` }));
  // ふわりの絵を (x, y) を中心に、幅 size で描く。frame: 1〜3
  // 元気の絵（11/2-3）: ふわりの1のコマに細い濃い縁取りをつけた絵を、一度だけ作っておく。lost ＝ 失ったぶん（灰色）
  const LIFE_RES = 3, LIFE_SIZE = 24;
  let lifeSprites = null;
  function lifeSprite(alive) {
    const img = fuwariImgs[0];
    if (!img.complete || !img.naturalWidth) return null;
    if (!lifeSprites) {
      const make = gray => {
        const s = LIFE_SIZE * LIFE_RES, pad = 2 * LIFE_RES, c = document.createElement("canvas");
        c.width = c.height = s + pad * 2;
        const g = c.getContext("2d");
        const sil = document.createElement("canvas"); sil.width = sil.height = c.width;   // 縁取り用の濃い影
        const sg = sil.getContext("2d");
        sg.drawImage(img, pad, pad, s, s); sg.globalCompositeOperation = "source-in"; sg.fillStyle = gray ? "#6a6a6a" : "#3d4a35"; sg.fillRect(0, 0, sil.width, sil.height);
        const o = 1.2 * LIFE_RES;
        for (let a = 0; a < 8; a++) g.drawImage(sil, Math.cos(a * Math.PI / 4) * o, Math.sin(a * Math.PI / 4) * o);
        g.drawImage(img, pad, pad, s, s);
        if (gray) {   // 灰色に: 色を抜いて（saturation）、形の外にはみ出た分を、元の形で切り取る。少し白っぽく
          const mask = document.createElement("canvas"); mask.width = mask.height = c.width; mask.getContext("2d").drawImage(c, 0, 0);
          g.globalCompositeOperation = "saturation"; g.fillStyle = "#808080"; g.fillRect(0, 0, c.width, c.height);
          g.globalCompositeOperation = "destination-in"; g.drawImage(mask, 0, 0);
          g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, 0, c.width, c.height);
        }
        return c;
      };
      lifeSprites = { on: make(false), off: make(true) };
    }
    return alive ? lifeSprites.on : lifeSprites.off;
  }
  function drawFuwariArt(frame, x, y, size, rot) {
    const img = fuwariImgs[frame - 1];
    if (!img.complete || !img.naturalWidth) return false;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  }
  // 飛んでいるときのコマ: 1→2→3 を順に切り替える
  function fuwariFrame() { return 1 + Math.floor(t / BATTLE.fuwariFrameTime) % 3; }

  function drawPlayer() {
    const { x, y } = player;
    if (player.red > 0) {   // うしろの虫にぶつかった: 赤く光る（11/6-3）
      ctx.save(); const a = player.red / 0.5;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 46);
      g.addColorStop(0, `rgba(255,60,70,${0.75 * a})`); g.addColorStop(1, "rgba(255,60,70,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (shield > 0) {   // 盾のまく
      ctx.save();
      ctx.strokeStyle = `rgba(140,190,230,${0.6 + Math.sin(t * 4) * 0.2})`; ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(200,230,250,0.18)";
      ctx.beginPath(); ctx.arc(x, y + 2, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const explore1 = sortieNo === 1;   // 発見の旅: 下のまん中で待つ小さなふわり（1のコマ）
    const glow = player.glow, fy = y + Math.sin(t * 3) * 2;
    if (glow > 0) {   // ことばを助けた瞬間: 光って、2のコマ
      const gr = ctx.createRadialGradient(x, fy, 4, x, fy, 46);
      gr.addColorStop(0, `rgba(255,248,200,${Math.min(1, glow / 0.35)})`);
      gr.addColorStop(1, "rgba(255,248,200,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, fy, 46, 0, Math.PI * 2); ctx.fill();
    }
    if (player.inv > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.4;
    const frame = typhoon ? 3 : glow > 0 && !explore1 ? 2 : explore1 ? 1 : fuwariFrame();
    const size = (explore1 ? BATTLE.fuwariExploreSize : BATTLE.fuwariSize) * (1 + glow * 0.5);
    if (!drawFuwariArt(frame, x, fy, size)) {   // 絵の読みこみ前は、白い四角
      ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#c9b98f"; ctx.lineWidth = 2;
      roundRect(x - 18, fy - 16, 36, 32, 6); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (player.notice > 0) {   // 1回目の語句に反応した「！」
      ctx.font = font(16); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff"; ctx.strokeText("！", x + size * 0.42, fy - size * 0.45);
      ctx.fillStyle = "#e0a93a"; ctx.fillText("！", x + size * 0.42, fy - size * 0.45);
    }
    if (fsay) drawFuwariSay(x, fy - size * 0.2);
  }

  // お題の問題文: 始まりは画面中央に大きく、読む時間が終わったら上の帯の下へ小さく移す
  function drawOdai() {
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    if (odai.intro > 0) {
      const fo = fitOdaiText(odai.q, BATTLE.odaiBigFont, W - 72, BATTLE.odaiMaxLines), { fs, lh, lines } = fo;   // 画面の幅に3行以内（はみ出さない大きさ）
      ctx.font = font(14);
      const hl = odai.hint ? wrapText(odai.hint, W - 72) : [];   // 最初のお題だけ、案内を1行そえる
      const h = lines.length * lh + 50 + hl.length * 20 + (hl.length ? 10 : 0), y = H * 0.4 - h / 2;
      ctx.fillStyle = "rgba(255,253,245,0.97)"; ctx.strokeStyle = tint("#e0b03a"); ctx.lineWidth = 3;
      roundRect(20, y, W - 40, h, 18); ctx.fill(); ctx.stroke();
      ctx.font = font(14); ctx.fillStyle = tint("#b0801a");
      ctx.fillText(tx(odai.cols === 2 ? "rescue.odaiPanel2" : "rescue.odaiPanel"), 34, y + 12);   // 2択（「どっち？」「次は？」）は「2つから」
      ctx.fillStyle = "#3e4a34";
      drawRubyLines(fo, 32, y + 36);   // ふりがな（11/7-18）。ルビの分だけ文が下がる（枠の高さ h は lh にルビの分が入っている）
      if (hl.length) {
        ctx.font = font(14); ctx.fillStyle = tint("#6f9a4a");
        hl.forEach((l, i) => ctx.fillText(l, 32, y + 36 + lines.length * lh + 10 + i * 20));
      }
    } else {
      const pnl = odaiPanel();
      ctx.fillStyle = "rgba(255,253,245,0.92)"; ctx.strokeStyle = tint("#e0b03a"); ctx.lineWidth = 2;
      const px = stripRight() + 6;
      roundRect(px, pnl.y, W - px - 10, pnl.h, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3e4a34";
      drawRubyLines(pnl.f, px + 12, pnl.y + 7);
      // 中ボスは残り時間
      if (!odai.boss) {
        const r = Math.max(0, 1 - odai.t / BATTLE.odaiTimeLimit);
        ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, W - px - 18, 3);
        ctx.fillStyle = r > 0.3 ? tint("#e0b03a") : "#d0607f"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, (W - px - 18) * r, 3);
      }
    }
    ctx.restore();
  }

  // 出撃の画面（1945の面の始まりのように）
  function drawSortie() {
    ctx.save();
    ctx.fillStyle = sortieNo === 1 ? tint("rgba(236,244,226,0.93)") : "rgba(255,246,220,0.94)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (sortieNo === 2 && sortieStep === "say") drawChoiceSay();
    else if (sortieNo === 2 && sortieStep === "choice") drawChoice(); else if (door) drawDoor();
    ctx.restore();
  }

  // 双眼鏡のふち: 2つの円の外側の輪郭だけ（重なっている部分の線は描かない。10/25-1）
  function binoOutline(cs, r) {
    const d = (cs[1].x - cs[0].x) / 2, th = Math.acos(Math.min(1, d / r));   // 円どうしが交わる角度
    ctx.beginPath(); ctx.arc(cs[0].x, cs[0].y, r, th, Math.PI * 2 - th); ctx.stroke();            // 左の円: 右側（重なり）をのぞく
    ctx.beginPath(); ctx.arc(cs[1].x, cs[1].y, r, Math.PI + th, Math.PI - th); ctx.stroke();      // 右の円: 左側（重なり）をのぞく
  }

  // 発見の旅の画面: 暗い中に、双眼鏡の2つの円の中だけが見える（仮の見た目）
  function drawExplore() {
    if (exMove.box) { drawBoxExplore(); return; }   // 世界2の箱（10/31-10 試作）
    const ex = explore, R = binoR(), cs = binoCenters();
    // 飾りの虫
    for (const b of ex.bugs) {
      ctx.save(); ctx.translate(b.x, b.y);
      if (b.kind === "ladybug") {
        ctx.fillStyle = "#d8443a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(b.vx > 0 ? 4 : -4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-1, -2, 1.1, 0, Math.PI * 2); ctx.arc(1, 2, 1.1, 0, Math.PI * 2); ctx.fill();
      } else {
        const f = Math.abs(Math.sin(t * 18 + b.ph));
        ctx.fillStyle = "rgba(240,232,210,0.9)";
        ctx.beginPath(); ctx.ellipse(-3, 0, 4, 6 * f + 1, -0.4, 0, Math.PI * 2); ctx.ellipse(3, 0, 4, 6 * f + 1, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // ただよう語句（見つけた語句は金色に光って、ふわっと上へ消える）
    for (const d of ex.list) {
      const a = d.found ? 1 - d.foundT / 0.9 : d.vis;
      if (a <= 0) continue;
      d.last = d.found;
      ctx.font = font(d.size);
      drawWordText(d, d.x, d.y - d.foundT * 24, Math.max(0, a));
      ctx.globalAlpha = 1;
      if (!d.found && d.look > 0) {   // 見つめているあいだ、まわりの輪がたまる
        const rr = d.w / 2 + 12;
        ctx.save();
        ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath(); ctx.ellipse(d.x, d.y, rr, d.size * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#e0b03a";
        ctx.beginPath(); ctx.ellipse(d.x, d.y, rr, d.size * 0.9, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, d.look / (exMove.lookTime || BATTLE.lookTime))); ctx.stroke();
        ctx.restore();
      }
    }
    // 光の粒
    for (const th of threads) {
      ctx.globalAlpha = Math.max(0, 1 - th.age / 0.7);
      ctx.fillStyle = th.color; ctx.beginPath(); ctx.arc(th.x, th.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (exMove.fog) { ctx.fillStyle = `rgba(200,206,220,${exMove.fog})`; ctx.fillRect(0, 0, W, H); }   // 霧（円の中も、うすくかすむ）
    // 双眼鏡の外を暗くする（裏の画面に暗い色をぬって、円の形にくりぬく）
    if (maskCv === null) { try { maskCv = document.createElement("canvas"); } catch (_) { maskCv = false; } }
    if (maskCv) {
      if (maskCv.width !== Math.round(W * dpr) || maskCv.height !== Math.round(H * dpr)) { maskCv.width = Math.round(W * dpr); maskCv.height = Math.round(H * dpr); }
      const m = maskCv.getContext("2d");
      m.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.globalCompositeOperation = "source-over";
      m.clearRect(0, 0, W, H);
      m.fillStyle = `rgba(10,16,34,${BATTLE.exploreDark})`; m.fillRect(0, 0, W, H);
      m.globalCompositeOperation = "destination-out";
      for (const c of cs) {   // 2つの円をくりぬく（ふちはぼかす）
        const g = m.createRadialGradient(c.x, c.y, R * 0.8, c.x, c.y, R);
        g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = g; m.beginPath(); m.arc(c.x, c.y, R, 0, Math.PI * 2); m.fill();
      }
      ctx.drawImage(maskCv, 0, 0, W, H);
    }
    // 暗いところで、語句のある場所がきらっと光る（さがす手がかり）
    for (const d of ex.list) {
      if (d.found || BATTLE.hintAlpha <= 0 || exMove.hint === false || d.vis < 0.5) continue;
      const k = (d.hintT % BATTLE.hintEvery) / 0.4;
      if (k > 1 || inBino(d.x, d.y, 1)) continue;
      const a = Math.sin(k * Math.PI) * BATTLE.hintAlpha, r = (3 + Math.sin(k * Math.PI) * 6) * BATTLE.hintSize;
      ctx.save();
      ctx.globalAlpha = a; ctx.fillStyle = "#fff6c8"; ctx.shadowColor = "rgba(255,240,170,1)"; ctx.shadowBlur = 10;
      ctx.translate(d.x, d.y);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.3 : r, an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // ホタル（暗いところでも見える）: ことばのまわりに集まるホタルと、ひとりで飛ぶホタル
    if (exMove.flies || exMove.stray) {
      const dots = [];
      for (const d of ex.list) if (d.flies && !d.found && d.vis > 0) for (const f of d.flies) {
        const r = f.r * (1 + 0.25 * Math.sin(t * 1.7 + f.ph));
        dots.push([d.x + Math.cos(f.a) * r, d.y + Math.sin(f.a) * r * 0.7, d.vis]);
      }
      for (const f of ex.flies) dots.push([f.x, f.y, 0.8]);
      for (const [x, y, v] of dots) {
        const a = v * (0.7 + 0.3 * Math.sin(t * 5 + x * 0.1));
        const g = ctx.createRadialGradient(x, y, 0.5, x, y, 12);
        g.addColorStop(0, `rgba(235,255,150,${a})`); g.addColorStop(1, "rgba(235,255,150,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(250,255,210,${a})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (ex.streaks.length) {   // 風の筋
      ctx.save(); ctx.strokeStyle = "rgba(230,236,250,0.28)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      for (const k of ex.streaks) { ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + k.len, k.y); ctx.stroke(); }
      ctx.restore();
    }
    // 双眼鏡のふち
    ctx.save();
    ctx.strokeStyle = "rgba(40,44,60,0.9)"; ctx.lineWidth = 5;
    binoOutline(cs, R);
    ctx.strokeStyle = "rgba(200,215,240,0.35)"; ctx.lineWidth = 1.5;
    binoOutline(cs, R - 4);
    ctx.restore();
    drawPlayer();
    // 浮かぶ文字（みつけた！）
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const fl of floats) {
      ctx.globalAlpha = Math.max(0, 1 - fl.age / 0.9);
      ctx.font = font(fl.big ? 18 : 14);
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      ctx.strokeText(fl.text, fl.x, fl.y - fl.age * 30);
      ctx.fillStyle = fl.found ? tint("#6f9a4a") : "#c98a1e";
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 30);
    }
    ctx.globalAlpha = 1;
    drawHud();
    if (ex.over > 0) {   // 時間オーバー！ 1秒ごとに−100点（10/25-21）
      const a = Math.min(1, ex.over / 0.3, (BATTLE.exploreOverMsg - ex.over) / 0.2 + 0.01);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.font = font(18); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const text = tx("explore.overTime", { p: BATTLE.exploreTimeScore }), tw = Math.min(W - 24, ctx.measureText(text).width + 32);
      ctx.fillStyle = "rgba(255,240,236,0.97)"; ctx.strokeStyle = "#e0483a"; ctx.lineWidth = 2.5;
      roundRect(W / 2 - tw / 2, 82, tw, 40, 14); ctx.fill(); ctx.stroke();   // 右上の時計（11/1）と重ならない高さ
      ctx.fillStyle = "#c8382c"; ctx.fillText(text, W / 2, 103, W - 40);
      ctx.restore();
    }
    if (!moved && state === "play") {   // 操作のヒント
      ctx.globalAlpha = hintFadeIn();   // 点滅しない（10/25-12）
      ctx.font = font(16); ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const hy = Math.min(H - 110, bino.y + R + 26);
      if (!hintCard) ctx.strokeText(tx("explore.moveHint"), W / 2, hy);
      ctx.fillStyle = tint("#48693a"); if (!hintCard) ctx.fillText(tx("explore.moveHint"), W / 2, hy);
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();
    if (hintCard) drawHintCard();
    if (state === "sortie") drawSortie();
    if (doorFade > 0) { ctx.fillStyle = `rgba(255,253,240,${doorFade / BATTLE.doorFade})`; ctx.fillRect(0, 0, W, H); }   // 扉から入ったあとの白い光が消えていく
    if (les) drawLesson();
    if (tut) drawTut();
    if (paused) drawSleep();
  }

  // ===== 世界3の発見の旅「無重力」（10/31-10 試作。構想メモ 3 のうち「回転」だけ） =====
  // 星空を、ことばが回りながら漂う（画面のはしで はね返る）。向きがまっすぐのあいだに指で押さえ続けて hold 秒で見つかる（世界2の箱と同じ「押さえて1秒」）
  // 10/31-14 決定: 押さえると、そのことばは回るのをやめて turn 秒でまっすぐに向き直り、向き直ってから輪がたまる。はなすと0にもどり、また回り出す。時間切れなし
  const angOff = a => Math.abs(((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);   // まっすぐからのずれ（0〜π）
  const spaceAligned = b => angOff(b.ang) < exMove.align;
  function spaceSetup() {
    const ex = explore;
    ex.queue = shuffle(exploreWords().slice()).map(w => {
      const size = isShortWord(w) ? Math.round(BATTLE.fontSize.zako * BATTLE.shortScale) : BATTLE.fontSize.zako;
      ctx.font = font(size);
      const tw = ctx.measureText(w.word).width;
      return { word: w, w: tw + 20, h: size * 1.6, hold: 0, open: false, openT: 0, out: false, ang: rand(1.2, 5.1), spin: exMove.spin * rand(0.8, 1.2) * (Math.random() < 0.5 ? 1 : -1),
        d: { word: w, role: "zako", size, w: tw, h: size * 1.2, x: 0, y: 0, phase: Math.random() * 6, explore: true, last: true, found: false, flash: 0 } };
    });
    ex.boxes = []; ex.nextBoxAt = BATTLE.exploreFirst; ex.keyFound = true;
    const avg = ex.queue.reduce((a, b) => a + baseChars(b.word).length, 0) / Math.max(1, ex.queue.length);
    ex.maxOn = exMove.on || (exMove.chars ? Math.max(exMove.minOn || 1, Math.min(exMove.maxOn, Math.floor(exMove.chars / avg))) : exMove.maxOn);   // 同時に漂う数（長いことばのステージほど少なく）。11/1-2 決定: stages.js の explore.on で決める（9・10 は4つ、11・12 は3つ）
  }
  function updateSpace(dt) {
    const ex = explore, mv = exMove, words = exploreWords();
    if (!ex.queue) spaceSetup();
    const minX = stripRight() + 8, maxX = W - 8, minY = 96, maxY = H * 0.78;
    while (ex.queue.length && ex.t >= ex.nextBoxAt && ex.boxes.filter(b => !b.open).length < ex.maxOn) {
      const b = ex.queue.shift(), a = Math.random() * Math.PI * 2;
      Object.assign(b, { x: rand(minX + b.w / 2, maxX - b.w / 2), y: rand(minY + b.h, maxY - b.h), vx: Math.cos(a) * mv.speed, vy: Math.sin(a) * mv.speed });
      ex.boxes.push(b);
      ex.nextBoxAt = ex.t + mv.gap;
    }
    if (ex.queue.length && ex.boxes.filter(b => !b.open).length >= ex.maxOn) ex.nextBoxAt = Math.max(ex.nextBoxAt, ex.t);   // いっぱいのあいだは、1つ見つかったらすぐ次を出す
    let pressed = null, pressedD = 0;
    for (const b of ex.boxes) {
      if (b.open) { b.openT += dt; continue; }
      const md = lesDo() ? 0 : dt;   // チュートリアルの「やってみる」のあいだは、ことばは動かない（回るのは続く）
      b.x += b.vx * md; b.y += b.vy * md; if (!b.grab) b.ang += b.spin * dt;
      { const n0 = reacted; lesson("s9spin", { ty: b.y, target: b, done: () => reacted > n0 }); }   // チュートリアル: 最初のことばが出た → 向きを直して見つける（11/7-20）   // 押さえているあいだは回らない
      if (b.x - b.w / 2 < minX) { b.x = minX + b.w / 2; b.vx = Math.abs(b.vx); }
      if (b.x + b.w / 2 > maxX) { b.x = maxX - b.w / 2; b.vx = -Math.abs(b.vx); }
      if (b.y - b.h / 2 < minY) { b.y = minY + b.h / 2; b.vy = Math.abs(b.vy); }
      if (b.y + b.h / 2 > maxY) { b.y = maxY - b.h / 2; b.vy = -Math.abs(b.vy); }
      if (press) {   // 当たりは、ことばの向きに回した長方形（10/31-14。前は丸で、長いことばが近くのことばの上まで取っていた）。重なったら中心の近いほう
        const dx = press.x - b.x, dy = press.y - b.y, c = Math.cos(b.ang), s = Math.sin(b.ang);
        const lx = dx * c + dy * s, ly = -dx * s + dy * c, d = Math.hypot(dx, dy);
        if (Math.abs(lx) < b.w / 2 + 8 && Math.abs(ly) < b.h / 2 + 12 && (!pressed || d < pressedD)) { pressed = b; pressedD = d; }
      }
    }
    for (const b of ex.boxes) {
      if (b.open) continue;
      if (b !== pressed) { b.hold = 0; b.grab = null; continue; }
      if (!b.grab) {
        if (!spaceAligned(b)) continue;   // ずれが大きいあいだは、押さえても向き直らない（回ってきて判定に入ったら向き直る）
        const sd = ((b.ang % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;   // まっすぐからのずれ（向きつき）
        b.grab = { a0: b.ang, a1: b.ang - sd, t: 0 };
      }
      const gr = b.grab;
      if (gr.t < mv.turn) {   // 向き直るあいだ（少しずつゆっくりに）
        gr.t = Math.min(mv.turn, gr.t + dt);
        const k = gr.t / mv.turn;
        b.ang = gr.a0 + (gr.a1 - gr.a0) * (1 - (1 - k) * (1 - k));
        continue;
      }
      b.hold += dt;
      if (b.hold >= mv.hold) {
        b.open = true; b.openT = 0; moved = true;
        Object.assign(b.d, { x: b.x, y: b.y });
        findWord(b.d);
      }
    }
    ex.boxes = ex.boxes.filter(b => !(b.open && b.openT > 1.2));
    exploreOverCheck(words, dt);
    exploreEndCheck(words, !ex.boxes.some(b => b.open));
  }
  function drawSpaceExplore() {
    const ex = explore;
    if (ex.boxes) for (const b of ex.boxes) {
      if (b.open) {   // 見つかった: まっすぐになって、上へのぼって消える
        const k = Math.min(1, b.openT / 1.2);
        ctx.font = font(b.d.size);
        drawWordText(b.d, b.x, b.y - k * 40, Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4));
        ctx.globalAlpha = 1;
        continue;
      }
      const al = spaceAligned(b);
      if (al) {   // 向きがそろっている: うすい光の輪
        ctx.save(); ctx.fillStyle = "rgba(255,240,180,0.22)"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.w * 0.62, b.h * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.font = font(b.d.size);
      drawWordText(Object.assign(b.d, { last: al }), 0, 0, al ? 1 : exMove.dim);
      ctx.restore(); ctx.globalAlpha = 1;
      if (b.hold > 0) {
        const rr = Math.max(b.w, b.h) * 0.6;
        ctx.save(); ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#e0b03a"; ctx.beginPath(); ctx.arc(b.x, b.y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.hold / exMove.hold)); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ===== 世界2の発見の旅「箱」の画面（10/31-10 試作。箱とコンベアは仮の図形） =====
  function drawBox(b) {
    const ex = explore, x = b.x + (b.shake > 0 ? Math.sin(b.shake * 60) * 3 : 0), y = b.y, w = b.w, h = b.h;
    const face = b.fake ? 0 : exMove.open ? boxFace(b) : -1;   // にせOPEN は、いつも OPEN の面
    const squash = exMove.open && !b.open ? 1 - 0.12 * Math.abs(Math.sin(((explore.t + b.phase) % 1) * Math.PI)) * (face > 0 ? 1 : 0) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, squash);
    ctx.fillStyle = "rgba(30,30,40,0.25)"; roundRect(-w / 2 + 4, -h / 2 + 8, w, h, 8); ctx.fill();   // 影
    ctx.fillStyle = "#c9955a"; ctx.strokeStyle = "#8a6232"; ctx.lineWidth = 2;
    roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill(); ctx.stroke();
    if (b.open) {   // ふたが開いている
      ctx.fillStyle = "#6a4a28"; roundRect(-w / 2 + 6, -h / 2 + 4, w - 12, 14, 4); ctx.fill();
      ctx.fillStyle = "#d9a86a";
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 - 10, -h / 2 - 16); ctx.lineTo(-6, -h / 2 - 14); ctx.lineTo(-4, -h / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2 + 10, -h / 2 - 16); ctx.lineTo(6, -h / 2 - 14); ctx.lineTo(4, -h / 2); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "#e8d2a0"; ctx.fillRect(-7, -h / 2, 14, h);   // テープ
      ctx.strokeStyle = "rgba(120,80,40,0.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h / 2 + 14); ctx.lineTo(w / 2 - 4, -h / 2 + 14); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (face === 0) {   // 「OPEN」の面
        ctx.fillStyle = "#3f9a5a"; roundRect(-w * 0.36, -h * 0.2, w * 0.72, h * 0.42, 6); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = font(16); ctx.fillText("OPEN", 0, 1);
      } else if (face > 0) {   // ほかの面（回っている）
        ctx.fillStyle = "rgba(90,60,30,0.55)"; ctx.font = font(22); ctx.fillText("↻", 0, 4);
      } else { ctx.fillStyle = "rgba(90,60,30,0.6)"; ctx.font = font(26); ctx.fillText("？", 0, 4); }
      if (b.lock && !ex.keyFound) {   // 鍵（南京錠）
        ctx.strokeStyle = "#5a5f6a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2 - 14, h / 2 - 22, 6, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = "#8a909c"; roundRect(w / 2 - 22, h / 2 - 22, 16, 13, 3); ctx.fill();
      }
    }
    ctx.restore();
    // 押さえているあいだ、まわりの輪がたまる
    if (!b.open && b.hold > 0) {
      const rr = Math.max(w, h) * 0.66;
      ctx.save(); ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#e0b03a"; ctx.beginPath(); ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.hold / exMove.hold)); ctx.stroke();
      ctx.restore();
    }
    // 開いた箱から、ことばが出て上へ（金色に光って消える）
    if (b.open && b.d) {
      const k = Math.min(1, b.openT / 1.2);
      ctx.font = font(b.d.size);
      drawWordText(b.d, x, y - h * 0.3 - k * 40, Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4));
      ctx.globalAlpha = 1;
    }
  }
  function drawBoxExplore() {
    const ex = explore;
    // コンベア（仮の図形）: レーンごとに横の帯。ローラーの線が流れる
    if (ex.boxes && !exMove.space) for (let i = 0; i < exMove.lanes.length; i++) {
      const y = laneY(i), bh = exMove.boxH + 18;
      ctx.fillStyle = "rgba(70,84,100,0.92)"; ctx.fillRect(0, y - bh / 2, W, bh);
      ctx.fillStyle = "rgba(150,165,180,0.9)"; ctx.fillRect(0, y - bh / 2, W, 4); ctx.fillRect(0, y + bh / 2 - 4, W, 4);
      ctx.strokeStyle = "rgba(40,50,62,0.6)"; ctx.lineWidth = 2;
      const off = ((ex.belt % 22) + 22) % 22;
      for (let x = -22 + off; x < W + 22; x += 22) { ctx.beginPath(); ctx.moveTo(x, y - bh / 2 + 6); ctx.lineTo(x, y + bh / 2 - 6); ctx.stroke(); }
    }
    if (exMove.space) drawSpaceExplore();   // 世界3の無重力（10/31-10 試作）。コンベアはない
    else if (ex.boxes) for (const b of ex.boxes) if (!b.out) drawBox(b);
    for (const th of threads) {   // 光の粒
      ctx.globalAlpha = Math.max(0, 1 - th.age / 0.7);
      ctx.fillStyle = th.color; ctx.beginPath(); ctx.arc(th.x, th.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (evActive("dark")) { ctx.fillStyle = "rgba(6,10,24,0.84)"; ctx.fillRect(0, 0, W, H); }   // ステージ7の出来事「照明が落ちる」（仮: 画面ぜんたいを暗く）
    drawPlayer();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const fl of floats) {
      ctx.globalAlpha = Math.max(0, 1 - fl.age / 0.9);
      ctx.font = font(fl.big ? 18 : 15);
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      ctx.strokeText(fl.text, fl.x, fl.y - fl.age * 30);
      ctx.fillStyle = fl.found ? tint("#6f9a4a") : "#8a6a4a";
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 30);
    }
    ctx.globalAlpha = 1;
    drawHud();
    if (ex.over > 0) {   // 時間オーバー（世界1と同じ）
      const a = Math.min(1, ex.over / 0.3, (BATTLE.exploreOverMsg - ex.over) / 0.2 + 0.01);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.font = font(18); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const text = tx("explore.overTime", { p: BATTLE.exploreTimeScore }), tw = Math.min(W - 24, ctx.measureText(text).width + 32);
      ctx.fillStyle = "rgba(255,240,236,0.97)"; ctx.strokeStyle = "#e0483a"; ctx.lineWidth = 2.5;
      roundRect(W / 2 - tw / 2, 82, tw, 40, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c8382c"; ctx.fillText(text, W / 2, 103, W - 40);
      ctx.restore();
    }
    if (!moved && state === "play") {   // 操作のヒント
      ctx.globalAlpha = hintFadeIn();
      ctx.font = font(16); ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const hy = H * 0.14;
      const ht = tx(exMove.space ? "space.moveHint" : exMove.open ? "box.openHint" : exMove.lock ? "box.lockHint" : "box.moveHint");   // ステージごとの1行（6 OPEN／7 鍵。10/31-10 試作）
      if (!hintCard) { ctx.strokeText(ht, W / 2, hy); ctx.fillStyle = "#3f4f6a"; ctx.fillText(ht, W / 2, hy); }
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();
    if (hintCard) drawHintCard();
    if (state === "sortie") drawSortie();
    if (doorFade > 0) { ctx.fillStyle = `rgba(255,253,240,${doorFade / BATTLE.doorFade})`; ctx.fillRect(0, 0, W, H); }   // 扉から入ったあとの白い光が消えていく
    if (les) drawLesson();
    if (tut) drawTut();
    if (paused) drawSleep();
  }

  // 案内（10/21-2）: 画面の上のほうに、ふわりと1〜2行の文。ゲームは止めない
  function drawHintCard() {
    const a = Math.max(0, Math.min(1, hintCard.t / 0.3, (BATTLE.hintTime - hintCard.t) / 0.25));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = font(15); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const px = stripRight() + 8, pw = W - px - 10, lines = wrapText(hintCard.text, pw - 56);
    const ph = 22 + lines.length * 21, py = 46;
    ctx.fillStyle = hintCard.yellow ? "rgba(255,236,150,0.97)" : "rgba(255,253,245,0.96)"; ctx.strokeStyle = hintCard.yellow ? "#e0b03a" : tint("#9cbf7c"); ctx.lineWidth = 2.5;
    roundRect(px, py, pw, ph, 14); ctx.fill(); ctx.stroke();
    drawFuwariArt(1, px + 24, py + ph / 2, 34);   // セリフの横の小さなふわり（1のコマ）
    ctx.fillStyle = "#3f4a35";
    lines.forEach((l, i) => ctx.fillText(l, px + 46, py + 11 + 10.5 + i * 21));
    ctx.restore();
  }

  // チュートリアル（11/7-20）の絵: 説明のあいだは画面をうす暗くして、まん中にふわりと吹き出し（ふりがなつき）と「タップでやってみよう！」。
  //   やってみるあいだは、上に同じ文を小さく（お題のときは問題文と重なるので出さない）。できたら、まん中に「OK！」（扉と同じデコ文字・世界の色）
  function drawLesson() {
    const L = les;
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    if (L.step === "say" || (L.step === "do" && !odai)) {
      const say = L.step === "say", a = say ? Math.min(1, L.t / 0.2) : 1;
      ctx.globalAlpha = a;
      if (say) { ctx.fillStyle = "rgba(25,35,30,0.45)"; ctx.fillRect(0, 0, W, H); }
      const tg = L.target;
      if (tg && tg.x !== undefined && !(tg.hp <= 0) && !tg.open && !tg.got && !tg.found) {   // やってみる相手を、光る輪で示す
        const r = ringR(tg) * (1 + 0.08 * Math.sin(performance.now() / 160));
        ctx.save(); ctx.globalAlpha = a * 0.95; ctx.strokeStyle = "#fff6b8"; ctx.lineWidth = 4; ctx.shadowColor = "rgba(255,220,90,0.9)"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(tg.x, tg.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      const B = L.box = lessonBox(L), { px, py, pw, ph, f, art, tapH } = B;   // 吹き出しの場所は lessonBox（11/7-28）
      ctx.fillStyle = "rgba(255,253,245,0.98)"; ctx.strokeStyle = tint("#9cbf7c"); ctx.lineWidth = say ? 3 : 2.5;
      roundRect(px, py, pw, ph, say ? 18 : 14); ctx.fill(); ctx.stroke();
      drawFuwariArt(1, px + 8 + art / 2, py + (ph - tapH) / 2, art * 0.9);
      ctx.fillStyle = "#3f4a35";
      drawRubyLines(f, px + art + 12, py + (ph - tapH - f.lines.length * f.lh) / 2);
      if (say && L.t >= BATTLE.lesson.tapAfter) {
        ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = font(15); ctx.fillStyle = tint("#6f9a4a");
        ctx.fillText(tx("lessons.tap"), W / 2, py + ph - 20);
      }
    } else if (L.step === "ok") {
      const k = Math.min(1, L.t / 0.25), sc = k < 1 ? 0.4 + 0.9 * k : 1.3 - 0.3 * Math.min(1, (L.t - 0.25) / 0.15);
      const d = Door.deco([tx("lessons.ok")], 52, worldDef.id || 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, (BATTLE.lesson.okTime - L.t) / 0.2));
      ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc);
      if (d) ctx.drawImage(d.c, -d.w / 2, -d.h / 2, d.w, d.h);
    }
    ctx.restore();
  }
  // やる相手の光る輪の半径
  function ringR(tg) { return Math.max(26, (tg.w ? Math.max(tg.w, tg.h || 0) : 2 * (tg.r || 12)) / 2 + 14); }
  // 吹き出しが重なってはいけない所（11/7-28 決定）: やる相手（輪）・自機・お題の問題文とことば・とくいの3つのボタン
  function lessonKeepOut(L) {
    const r = [], tg = L.target;
    if (tg && tg.x !== undefined) { const rr = ringR(tg) * 1.08; r.push({ x: tg.x - rr, y: tg.y - rr, w: rr * 2, h: rr * 2 }); }
    if (player && state === "play" && phase !== "round1") r.push({ x: player.x - 36, y: player.y - 42, w: 72, h: 84 });
    if (odai) {
      for (const e of enemies) if (e.pattern === "odai" && e.hp > 0) r.push({ x: e.x - e.w / 2 - 6, y: e.y - e.h / 2 - 6, w: e.w + 12, h: e.h + 12 });
      if (!(odai.intro > 0)) { const p = odaiPanel(); r.push({ x: 0, y: p.y, w: W, h: p.h }); }
    }
    if (state === "sortie" && sortieNo === 2 && sortieStep === "choice") for (const c of choiceRects()) r.push({ x: c.x, y: c.y, w: c.w, h: c.h });
    if (lastT > 0) r.push({ x: 0, y: 34, w: W, h: 110 });   // ラストチャンスの帯と、大きな残り秒数（drawLastHud）
    return r;
  }
  // 吹き出しの場所（11/7-28）: 上の帯（元気・点数）と下のボタンの間で、重なってはいけない所に重ならない高さ。
  //   説明（say）は 30%・68%・50%・80% の順（お題は下から）、やってみる（do）は上から試し、なければ8pxずつずらして探す。どこも重なるなら、いちばん重なりの少ない所
  function lessonBox(L) {
    const say = L.step === "say";
    const px = say ? Math.max(14, (W - 380) / 2) : stripRight() + 8, pw = say ? W - px * 2 : W - px - 10;
    const art = say ? 64 : 40, f = fitOdaiText(L.text, say ? 18 : 15, pw - art - 22, 2);
    const tapH = say ? 34 : 0, ph = Math.max(say ? 92 : 50, 20 + f.lines.length * f.lh + tapH);
    const keep = lessonKeepOut(L);
    const top = LES_TOP, bot = Math.max(top, H - (state === "play" && phase !== "round1" ? 92 : 16) - ph);
    const pref = say ? (L.low ? [0.8, 0.68, 0.5, 0.3] : [0.3, 0.68, 0.5, 0.8]).map(k => H * k - ph / 2) : [top];
    const ov = (y, q) => Math.max(0, Math.min(px + pw, q.x + q.w) - Math.max(px, q.x)) * Math.max(0, Math.min(y + ph, q.y + q.h) - Math.max(y, q.y));
    let best = null;
    for (const y0 of pref.concat(Array.from({ length: Math.floor((bot - top) / 8) + 1 }, (_, i) => top + i * 8))) {
      const y = Math.max(top, Math.min(bot, y0)), o = keep.reduce((sum, q) => sum + ov(y, q), 0);
      if (!best || o < best.o) best = { y, o };
      if (o === 0) break;
    }
    return { px, py: best.y, pw, ph, f, art, tapH, over: best.o };
  }
  // 紙芝居（デバッグ。一時停止メニューの「案内を紙芝居で見る」）: 案内の文を1つずつ札にして見せる
  function drawTut() {
    const d = { title: "案内", lines: wrapTextFont(tut.text || "", 17, Math.min(W - 32, 360) - 40) };
    ctx.save();
    ctx.fillStyle = "rgba(25,35,30,0.55)"; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 32, 360), px = (W - pw) / 2;
    const picH = 0;
    const ph = 70 + d.lines.length * 26 + picH + 46, py = Math.max(60, H * 0.42 - ph / 2);
    ctx.fillStyle = "rgba(255,253,245,0.98)"; ctx.strokeStyle = tint("#9cbf7c"); ctx.lineWidth = 3;
    roundRect(px, py, pw, ph, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(22); ctx.fillStyle = tint("#48693a");
    ctx.fillText(d.title, W / 2, py + 32);
    ctx.font = font(17); ctx.fillStyle = "#3f4a35";
    d.lines.forEach((l, i) => ctx.fillText(l, W / 2, py + 70 + i * 26));
    const top = py + 70 + d.lines.length * 26;
    if (tut.t >= BATTLE.tutCloseAfter) {
      ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
      ctx.font = font(15); ctx.fillStyle = tint("#6f9a4a");
      ctx.fillText("タップでつづける", W / 2, py + ph - 22);
    }
    ctx.restore();
  }
  // 主人公の絵（assets/hero_男女_ポーズ.png。10/31-7: 制作側の地が透明な絵）
  const heroImgs = {};
  function drawHero(pose, x, y, h) {
    const src = `assets/hero_${opts.hero || "boy"}_${pose}.png`;
    const img = heroImgs[src] || (heroImgs[src] = Object.assign(new Image(), { src }));
    if (!img.complete || !img.naturalWidth) return;
    const w = h * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, x, y, w, h);
  }

  // 扉（11/7-19）: 「発見の旅へ、出発！」「救出の旅へ、出発！」。描き方は js/door.js。旅の表紙にあった一言（目安の秒など）を小さくそえる
  function drawDoor() {
    const trip = window.TEXTS.trips[sortieNo];
    ctx.font = font(15);
    const sub = [];
    if (sortieNo === 1 && opts.stage && opts.stage.tutorial) sub.push(...wrapText(tx("tutorial.cover"), W - 40));   // ステージ1: やり方をおぼえようの1行
    if (trip.cover) sub.push(...trip.cover.replace("{sec}", Math.round(BATTLE.exploreTime)).split("\n").flatMap(t => wrapText(t, W - 40)));
    Door.draw(ctx, W, H, door.t, { kind: sortieNo === 1 ? "explore" : "rescue", world: worldDef.id, stageId: opts.stage ? opts.stage.id : "", stageName: opts.stageName, sub, tap: tx("tapToGo"), go: door.go, goX: door.goX, goY: door.goY });
  }

  // 救出の旅の前のふわりの一言（10/25-5）: 持ち物選択の前に、画面の真ん中に単独で出す。タップで持ち物選択へ
  function drawChoiceSay() {
    const say = retryMain ? tx("choice.retry") : tx("choice.found", { n: reacted });
    heroThinkImg();   // 次の持ち物選択の主人公の絵を、先に読んでおく
    ctx.font = font(18);
    const lines = wrapText(say, W - 84);
    const bh = lines.length * 28 + 28, bw = W - 40, bx = 20, by = H * 0.42 - bh / 2;
    drawFuwariArt(1, W / 2, by - 44, 72);   // セリフの上のふわり（1のコマ）
    ctx.fillStyle = "rgba(255,253,245,0.98)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 2.5;
    roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#4b3a1a";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 28 + i * 28));
    ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
    ctx.font = font(18); ctx.fillStyle = "#c98a1e";
    ctx.fillText(tx("intro.tap"), W / 2, by + bh + 46);
    ctx.globalAlpha = 1;
  }

  // 見出しと、その上のふりがな（10/25-5: 画面の見出しにはふりがな）
  function drawHeading(text, kana, x, y, size, color) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(size); ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    if (kana) { ctx.font = font(Math.max(11, Math.round(size * 0.3))); ctx.fillText(kana, x, y - size * 0.72); }
  }

  // 持ち物選択の絵（11/1）: 背景は制作側の bg_start（門と小道）。見本 sample_bg_start の配置で、門のところにふわり（2のコマ）と主人公
  const choiceBg = Object.assign(new Image(), { src: "assets/choice_bg.jpg" });
  const heroThinkImgs = {};   // 主人公の「考える」絵の、地が透明なもの（制作側の b03・g03）
  function heroThinkImg() {
    const src = `assets/hero_${opts.hero || "boy"}_think.png`;
    return heroThinkImgs[src] || (heroThinkImgs[src] = Object.assign(new Image(), { src }));
  }
  function choiceArtRect() {
    if (!choiceBg.complete || !choiceBg.naturalWidth) return null;
    const sc = Math.min(W / choiceBg.naturalWidth, H / choiceBg.naturalHeight), w = choiceBg.naturalWidth * sc, h = choiceBg.naturalHeight * sc;
    return { x: (W - w) / 2, y: H - h, w, h };   // 画面の下にそろえる（drawArtFit の edge と同じ）
  }
  // ボタンの右の小さな絵（見本と同じ: パワーUP＝きらきら、守りUP＝盾、必殺ワザ＝星）
  function drawChoiceIcon(id, cx, cy, r) {
    ctx.save(); ctx.translate(cx, cy);
    if (id === "power") {
      ctx.fillStyle = "#f2c230";
      const star4 = (x, y, rr) => { ctx.beginPath(); for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4 - Math.PI / 2, d = k % 2 ? rr * 0.28 : rr; ctx.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d); } ctx.closePath(); ctx.fill(); };
      star4(0, 0, r); star4(r * 0.85, -r * 0.75, r * 0.3); star4(r * 0.75, r * 0.8, r * 0.25);
    } else if (id === "shield") {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.5, -r * 0.65, r * 0.85, -r * 0.7); ctx.lineTo(r * 0.8, r * 0.05);
      ctx.quadraticCurveTo(r * 0.7, r * 0.7, 0, r); ctx.quadraticCurveTo(-r * 0.7, r * 0.7, -r * 0.8, r * 0.05); ctx.lineTo(-r * 0.85, -r * 0.7); ctx.quadraticCurveTo(-r * 0.5, -r * 0.65, 0, -r); ctx.closePath();
      ctx.fillStyle = "#8fbbe8"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#4f86c6"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(0, r * 0.82); ctx.strokeStyle = "rgba(79,134,198,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.strokeStyle = "#b9a2e6"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      for (let k = 0; k < 12; k++) { const ang = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r * 0.8, Math.sin(ang) * r * 0.8); ctx.lineTo(Math.cos(ang) * r * 1.05, Math.sin(ang) * r * 1.05); ctx.stroke(); }
      ctx.beginPath(); for (let k = 0; k < 10; k++) { const ang = k * Math.PI / 5 - Math.PI / 2, d = k % 2 ? r * 0.3 : r * 0.68; ctx.lineTo(Math.cos(ang) * d, Math.sin(ang) * d); } ctx.closePath();
      ctx.fillStyle = "#f2c230"; ctx.fill();
    }
    ctx.restore();
  }
  function drawChoiceArt(a) {
    drawArtFit(choiceBg, "#fcf6ea");   // 下にそろえ、上の余りは紙の地の色
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const hs = Math.min(34, a.w * 0.085);
    // 見出しと「3つのうち1つを選んでね」は、上の余り（紙の地）が広いときはそこへ移す（10/31-6）。狭いときは見本の位置（絵の高さの12%・18%）
    const up = a.y >= 120, hy = up ? a.y / 2 - 12 : a.y + a.h * 0.12, sy = up ? hy + 46 : a.y + a.h * 0.182;
    drawHeading(window.TEXTS.trips[2].name, window.TEXTS.trips[2].kana, W / 2, hy, hs, "#9a6418");
    ctx.font = font(Math.min(16, a.w * 0.042)); ctx.fillStyle = "#3e4a34";
    ctx.fillText(tx("choice.title", { trip: window.TEXTS.trips[2].name }), W / 2, sy);
    // 門の手前の小道に主人公（足もとは絵の高さの 44%）、その左にゆれるふわり
    const hi = heroThinkImg();
    const hh = a.h * 0.23, hb = a.y + a.h * 0.44;
    if (hi.complete && hi.naturalWidth) ctx.drawImage(hi, a.x + a.w * 0.44, hb - hh, hh * hi.naturalWidth / hi.naturalHeight, hh);
    else drawHero("think", a.x + a.w * 0.47, hb - hh, hh);
    drawFuwariArt(2, a.x + a.w * 0.34, a.y + a.h * 0.375, a.w * 0.26, Math.sin(t * 2.2) * 0.12);
    choiceRects().forEach((r, i) => {
      const l = LOADOUTS[i];
      ctx.fillStyle = "rgba(255,252,242,0.96)"; ctx.strokeStyle = tint("#dcae3c"); ctx.lineWidth = 3;   // とくいの枠: 世界の色（11/7-16、世界1も 11/7-17）
      roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = tint("rgba(220,174,60,0.35)"); ctx.lineWidth = 1.5;
      roundRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 14); ctx.stroke();
      const nfs = Math.min(22, r.h * 0.32), dfs = Math.min(14, r.h * 0.2), nx = r.x + r.w * 0.065;
      ctx.textAlign = "left";
      ctx.font = font(nfs); ctx.fillStyle = "#8a5a10";
      ctx.fillText(l.name, nx, r.y + r.h * 0.42);
      if (l.kana) {
        const kanji = (l.name.match(/^[\u4e00-\u9fff]+/) || [""])[0], kw = ctx.measureText(kanji).width;
        ctx.font = font(10); ctx.textAlign = "center";
        ctx.fillText(l.kana, nx + kw / 2, r.y + r.h * 0.42 - nfs * 0.85);
        ctx.textAlign = "left";
      }
      ctx.font = font(dfs); ctx.fillStyle = "#4b5e3a";
      ctx.fillText(l.desc, nx, r.y + r.h * 0.73);
      drawChoiceIcon(l.id, r.x + r.w * 0.85, r.y + r.h / 2, r.h * 0.3);
      ctx.textAlign = "center";
    });
  }

  function drawChoice() {
    const art = choiceArtRect();
    if (art) { drawChoiceArt(art); return; }   // 絵が読めなかったら、下の今までの見た目
    // （ふわりの一言は、10/25-5 から前の画面に単独で出す）
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const top = H * 0.08;
    drawHeading(window.TEXTS.trips[2].name, window.TEXTS.trips[2].kana, W / 2, top + 24, 34, "#b0801a");
    // （見出しの下の「（光で助けよう）」は、10/25-1 に消した）
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    ctx.fillText(tx("choice.title", { trip: window.TEXTS.trips[2].name }), W / 2, top + 82);
    // 上の空きに、ゆれるふわり（2のコマ）と、主人公の「考える」絵（10/25-14: 「どれにしようかな」の場面）
    const ay0 = top + 104, ay1 = choiceRects()[0].y - 10, ah = ay1 - ay0;
    if (ah > 40) {
      const fs = Math.min(110, ah), hh = Math.min(ah, 150);
      drawFuwariArt(2, W / 2 - fs * 0.45, ay0 + ah / 2, fs, Math.sin(t * 2.2) * 0.12);
      drawHero("think", W / 2 + fs * 0.15, ay1 - hh, hh);
    }
    choiceRects().forEach((r, i) => {
      const l = LOADOUTS[i];
      ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = tint("#e0b03a"); ctx.lineWidth = 3;
      roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left";
      ctx.font = font(20); ctx.fillStyle = "#8a5a10";
      ctx.fillText(l.name, r.x + 18, r.y + 22);
      if (l.kana) {   // 名前の頭の漢字の上に、小さくふりがな（10/25-6: 必殺ワザ）
        const kanji = (l.name.match(/^[\u4e00-\u9fff]+/) || [""])[0], kw = ctx.measureText(kanji).width;
        ctx.font = font(10); ctx.textAlign = "center";
        ctx.fillText(l.kana, r.x + 18 + kw / 2, r.y + 7);
        ctx.textAlign = "left";
      }
      ctx.font = font(13); ctx.fillStyle = "#5d6b4c";
      ctx.fillText(l.desc, r.x + 18, r.y + 45);
      ctx.textAlign = "center";
    });
    // （残り時間の帯と「あと○秒」は、10/25-14 に時間制限といっしょになくした）
  }

  // ふわりの一言（吹き出し）。画面からはみ出さない位置に出す
  function drawFuwariSay(fx, fy) {
    const a = Math.min(1, fsay.t / 0.3, (BATTLE.fuwariSayTime - fsay.t) / 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    if (fsay.big) {   // 大きな一言: 画面のまん中に
      ctx.font = font(22);
      const tw = Math.min(ctx.measureText(fsay.text).width, W - 40), bw = tw + 32, bh = 52;
      const bx = W / 2 - bw / 2, by = H * 0.3 - bh / 2;   // 吸い込んだ語句の大きな表示（まん中）と重ならない高さ
      ctx.fillStyle = "rgba(255,250,232,0.97)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
      roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8a5a10"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(fsay.text, W / 2, by + bh / 2 + 1, W - 56);
      ctx.restore();
      return;
    }
    ctx.font = font(fsay.small ? 12 : 15);
    // 画面に入らない長い一言は2行に（「、」で分ける。11/7-9 の巻き戻しの一言）
    let lines = [fsay.text];
    if (ctx.measureText(fsay.text).width > W - 24) { const cs = Array.from(fsay.text), mid = cs.length / 2; let cut = Math.round(mid), best = 99; cs.forEach((c, i) => { if (c === "、" && Math.abs(i + 1 - mid) < best) { best = Math.abs(i + 1 - mid); cut = i + 1; } }); lines = [cs.slice(0, cut).join(""), cs.slice(cut).join("")]; }
    const lh = fsay.small ? 15 : 20, tw = Math.max(...lines.map(l => ctx.measureText(l).width)), pad = fsay.small ? 7 : 10, bw = tw + pad * 2, bh = (fsay.small ? 22 : 30) + (lines.length - 1) * lh;
    const bx = Math.min(Math.max(fx - bw / 2, 8), W - bw - 8), by = fy - 30 - bh;
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.strokeStyle = "#cfe0b6"; ctx.lineWidth = 2;
    roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 6, by + bh); ctx.lineTo(fx, by + bh + 8); ctx.lineTo(fx + 6, by + bh); ctx.closePath();
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.fill();
    ctx.fillStyle = "#4b5e3a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + bh / 2 + 1 + (i - (lines.length - 1) / 2) * lh));
    ctx.restore();
  }

  // 操作のヒント（「指で双眼鏡を動かそう」など）は点滅させず、出るときに0.6秒かけてふわっと現れる（10/25-12）
  let moveHintAt = null, moveHintFrame = -1, frameNo = 0;
  // 1秒あたりの描画回数（fps。調整パネルで見る。10/31-14）: 0.5秒ごとの今の値と、バトルが始まってからの最低値（救出の旅と大ボスのあいだ）
  let fpsT0 = 0, fpsN = 0, fpsNow = 0, fpsMin = 0;
  function hintFadeIn() {
    if (moveHintAt === null || frameNo - moveHintFrame > 2) moveHintAt = t;   // しばらく出ていなかったら、もう一度ふわっと（時間はゲームの時間）
    moveHintFrame = frameNo;
    return Math.min(1, (t - moveHintAt) / 0.6);
  }

  function drawHud() {
    const top = 14;
    if (phase === "round1") { drawExploreHud(); return; }   // 発見の旅は、見本 smple_tansaku の配置（11/1）
    {
    // 元気のゲージと元気3つの後ろに、半透明の白い板（角丸。11/2-3 決定: どの世界の背景の上でも見やすく）
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    roundRect(6, top - 6, 160 + BATTLE.lives * 26, 28, 12); ctx.fill();
    ctx.strokeStyle = "rgba(90,100,80,0.25)"; ctx.lineWidth = 1; ctx.stroke();
    // 体力
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(12, top, 130, 16, 8); ctx.fill();
    ctx.strokeStyle = "rgba(90,100,80,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    const rate = player.hp / maxHp();
    ctx.fillStyle = rate > 0.4 ? "#8cbf5a" : (Math.floor(t * 4) % 2 ? "#e39a8e" : "#f2c4bb");
    roundRect(14, top + 2, 126 * rate, 12, 6); ctx.fill();
    if (player.healFlash > 0) {   // 綿のたねを取った: ゲージが光って「+回復」
      const k = player.healFlash;
      ctx.save();
      ctx.shadowColor = `rgba(255,240,150,${k})`; ctx.shadowBlur = 14 * k;
      ctx.strokeStyle = `rgba(255,236,140,${k})`; ctx.lineWidth = 3;
      roundRect(12, top, 130, 16, 8); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = font(11); ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.strokeText(tx("rescue.heal"), 138, top + 8 - (1 - k) * 4);
      ctx.fillStyle = "#4f8a2c"; ctx.fillText(tx("rescue.heal"), 138, top + 8 - (1 - k) * 4);
      ctx.restore();
    }
    }
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineJoin = "round";
    // 元気（残機）: ふわりの小さな絵（1のコマ）をならべる（10/25-12。前は雲の絵）。発見の旅では減らないので出さない（10/25-17）
    //   11/2-3 決定: 絵に細い濃い縁取り。失ったぶんは灰色にして小さな×を重ねる（全世界共通）
    if (phase !== "round1") for (let i = 0; i < BATTLE.lives; i++) {
      const lx = 158 + i * 26, ly = top + 8, sp = lifeSprite(i < lives);
      if (sp) ctx.drawImage(sp, lx - sp.width / 2 / LIFE_RES, ly - sp.height / 2 / LIFE_RES, sp.width / LIFE_RES, sp.height / LIFE_RES);
      if (i >= lives) {
        ctx.save(); ctx.strokeStyle = "#5a5a5a"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(lx - 5, ly - 5); ctx.lineTo(lx + 5, ly + 5); ctx.moveTo(lx + 5, ly - 5); ctx.lineTo(lx - 5, ly + 5); ctx.stroke();
        ctx.restore();
      }
    }
    // 点数（右）。上に出すのは体力ゲージ、残機、点数だけ
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    ctx.strokeText(String(score), W - 14, top);   // （発見の旅の点数は drawExploreHud。11/1）
    ctx.fillText(String(score), W - 14, top);
    // パワーと持ちものは、左下の必殺ワザのボタンの横に小さく（1回目の旅は光を使わないので出さない）
    if (phase === "round1") { drawStrip(); return; }
    const b = skillButtons()[SKILL_IDS.length - 1];   // 3つ目のボタンの右
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = font(11);
    const lvNo = POWER_LEVELS.indexOf(level) + 1;
    const lvText = `${tx("rescue.lightLabel")} ${"★".repeat(lvNo)}`;
    ctx.strokeText(lvText, b.x + b.r + 8, b.y - 8); ctx.fillText(lvText, b.x + b.r + 8, b.y - 8);
    if (loadout) {   // 持っていったもの（盾は使うと消える）
      const l = LOADOUTS.find(x => x.id === loadout);
      const it = `${tx("rescue.itemLabel")}: ${l.name}`; ctx.strokeText(it, b.x + b.r + 8, b.y + 8); ctx.fillText(it, b.x + b.r + 8, b.y + 8);
    }
    drawStrip();
  }

  // 必殺ワザの3つのボタン（11/6-6）: どれも同じゲージ（まわりの輪）。満タンで色がつき、脈打って光る。巻き戻しは使ったら灰色
  const SKILL_COLORS = { boost: ["#f2541b", "#ffd2b8"], guard: ["#e8a412", "#fff0b8"], rewind: ["#3f8cf0", "#cfe4ff"] };
  function drawSkillButtons() {
    for (const b of skillButtons()) drawSkillButton(b);
  }
  function drawSkillButton(b) {
    const used = b.id === "rewind" && (rewindUsed || lastT > 0), full = gauge >= 100 && !used, [C, rim] = SKILL_COLORS[b.id];
    ctx.save();
    if (bombFlash > 0 && !used) {   // たまった瞬間: 大きく光る
      const k = bombFlash / 1.2;
      const g2 = ctx.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r * (1.6 + 1.0 * k));
      g2.addColorStop(0, `rgba(255,170,80,${0.8 * k})`); g2.addColorStop(1, "rgba(255,170,80,0)");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.6 + 1.0 * k), 0, Math.PI * 2); ctx.fill();
    }
    const pulse = full ? 0.5 + 0.5 * Math.sin(t * 6) : 0, r = b.r * (1 + pulse * 0.08);
    if (full) {
      const g = ctx.createRadialGradient(b.x, b.y, r * 0.6, b.x, b.y, r * 1.7);
      g.addColorStop(0, C + "88"); g.addColorStop(1, C + "00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r * 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = used ? 0.45 : 1;
    ctx.fillStyle = full ? C : used ? "rgba(200,200,200,0.85)" : "rgba(255,253,245,0.85)";
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = full ? rim : "rgba(0,0,0,0.1)"; ctx.lineWidth = full ? 3 : 5;
    ctx.beginPath(); ctx.arc(b.x, b.y, r - 3, 0, Math.PI * 2); ctx.stroke();
    if (!full && !used) {   // たまっていないとき: 薄い色のゲージ
      ctx.strokeStyle = "#8cbf5a"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * gauge / 100); ctx.stroke();
    }
    // まん中の絵: パワー全開＝上向きの太い矢印、無敵タイム＝星（どちらも使っているあいだは残りの秒数）、巻き戻し＝左回りの矢印
    if (b.id === "boost") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = full ? "#ffffff" : C;
      if (boostT > 0) { ctx.font = font(18); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(Math.ceil(boostT)), 0, 1); }
      else {
        const a = b.r * 0.55, w = b.r * 0.22;
        ctx.beginPath(); ctx.moveTo(0, -a); ctx.lineTo(a * 0.8, -a * 0.1); ctx.lineTo(w, -a * 0.1); ctx.lineTo(w, a * 0.75); ctx.lineTo(-w, a * 0.75); ctx.lineTo(-w, -a * 0.1); ctx.lineTo(-a * 0.8, -a * 0.1); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    else if (b.id === "guard") {
      ctx.save(); ctx.translate(b.x, b.y);
      if (guardT > 0) { ctx.font = font(18); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = full ? "#ffffff" : C; ctx.fillText(String(Math.ceil(guardT)), 0, 1); }
      else { ctx.beginPath(); for (let k = 0; k < 10; k++) { const ang = k * Math.PI / 5 - Math.PI / 2, d = k % 2 ? b.r * 0.26 : b.r * 0.6; ctx.lineTo(Math.cos(ang) * d, Math.sin(ang) * d); } ctx.closePath(); ctx.fillStyle = full ? "#ffffff" : C; ctx.fill(); }
      ctx.restore();
    } else { ctx.save(); ctx.translate(b.x, b.y); drawRewindArrow(b.r * 0.48, full ? "#ffffff" : used ? "#888888" : C, 4); ctx.restore(); }
    // 上の名前（使った巻き戻しは「使った」）
    const label = used ? tx("skills.used") : skillName(b.id);
    ctx.font = font(full ? 10 : 9); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const ly = b.y - r - (full ? 9 : 7);
    ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.strokeText(label, b.x, ly);
    ctx.fillStyle = full ? C : "#7a8a68"; ctx.fillText(label, b.x, ly);
    if (b.id === "rewind" && !used) {   // 下に小さく「はじめから」（11/7-9 決定）
      ctx.font = font(9); const sy = b.y + b.r + 9;
      ctx.lineWidth = 3; ctx.strokeText(tx("skills.rewindSub"), b.x, sy);
      ctx.fillStyle = full ? C : "#7a8a68"; ctx.fillText(tx("skills.rewindSub"), b.x, sy);
    }
    ctx.restore();
  }

  // 帯: 画面の左端に、10のあき枠を上から縦にならべる（出てくる順。いちばん下が大ボス）
  // はじめは「？」、探検で見つけると灰色の名前、本番で吸い込むと金色。名前は枠の中に縦書き
  // 発見の旅の表示（11/1。見本 smple_tansaku）: 右上に目安の秒数からのカウントダウン（時計の形）、左下に「スコア ○」、左の縦の札
  //   目安を過ぎたら、時計と数字を赤にして −○ 秒。点数は、おくれの−をその場で引いて見せる（指摘39。点の決まりは同じ）
  function drawExploreHud() {
    const tt = explore.settled ? explore.settledT : explore.t;
    const left = BATTLE.exploreTime - tt, over = left < 0;
    const sec = over ? -Math.ceil(-left) : Math.ceil(left);
    const warn = !over && left <= BATTLE.timeBarWarn;
    // 時計
    const cr = 25, cx = W - 14 - cr, cy = 18 + cr;
    const rim = over ? "#e0483a" : (warn ? "#f0a84a" : "#8fc8e8");
    ctx.save();
    ctx.fillStyle = over ? "#e0483a" : "#e8b84a"; roundRect(cx - 6, cy - cr - 7, 12, 7, 2); ctx.fill();   // 上のつまみ
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf5"; ctx.beginPath(); ctx.arc(cx, cy, cr - 4, 0, Math.PI * 2); ctx.fill();
    if (!over) {   // 残りの量（扇形がへっていく）
      ctx.fillStyle = warn ? "rgba(240,168,74,0.22)" : "rgba(143,200,232,0.25)";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, cr - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left) / BATTLE.exploreTime); ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const label = over ? `−${-sec}` : String(sec);
    ctx.font = font(label.length >= 3 ? 16 : 20); ctx.fillStyle = over ? "#d8392a" : "#2f3d55";
    ctx.fillText(label, cx, cy + 1);
    // 左下の点数
    const sb = { x: 6, y: H - 80, w: 96, h: 52 };
    ctx.fillStyle = "rgba(255,253,245,0.94)"; ctx.strokeStyle = tint("#b9d39a"); ctx.lineWidth = 2;
    roundRect(sb.x, sb.y, sb.w, sb.h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4b5e3a"; ctx.font = font(11); ctx.fillText(tx("explore.scoreLabel"), sb.x + sb.w / 2, sb.y + 14);
    const o = over && !explore.settled ? -left : 0;
    const shown = o > 0 ? Math.max(0, score - Math.ceil(o) * BATTLE.exploreTimeScore) : score;
    ctx.font = font(20); ctx.fillStyle = "#2f3d2a"; ctx.fillText(String(shown), sb.x + sb.w / 2, sb.y + 35);
    ctx.restore();
    drawStrip();
  }

  function drawStrip() {
    const x = 6, cw = BATTLE.stripWidth, gap = 3;
    const y0 = 40, y1 = bombButton().y - bombButton().r - 22;   // 体力ゲージの下から、必殺ワザのボタンの上まで
    const n = Math.max(1, slots.length), sh = (y1 - y0 - gap * (n - 1)) / n;
    ctx.save();
    ctx.fillStyle = "rgba(255,253,245,0.55)";
    roundRect(x - 3, y0 - 3, cw + 6, y1 - y0 + 6, 8); ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    slots.forEach((w, i) => {
      const y = y0 + i * (sh + gap);
      const got = absorbed.includes(w), seen = found.has(w.id);
      const isNew = got && absorbed[absorbed.length - 1] === w && showWord;
      ctx.fillStyle = got ? (isNew ? "#ffe9a8" : "#fff2c8") : "rgba(255,255,255,0.88)";
      ctx.strokeStyle = got ? "#d8a42c" : "#d6d2c2"; ctx.lineWidth = got ? 2 : 1.2;
      roundRect(x, y, cw, sh, 6); ctx.fill(); ctx.stroke();
      const chars = got || seen ? Array.from(w.word) : ["？"];
      const fs = Math.max(6, Math.min(13, Math.floor((sh - 4) / chars.length), cw - 6));
      ctx.font = font(fs);
      ctx.fillStyle = got ? "#8a5a10" : (seen ? "#a3a396" : "#c2bdab");
      const top = y + sh / 2 - (chars.length - 1) * fs / 2;
      chars.forEach((ch, k) => ctx.fillText(VERTICAL_GLYPH[ch] || ch, x + cw / 2, top + k * fs));
      const justFound = foundAt[w.id] !== undefined && t - foundAt[w.id] < BATTLE.stripFoundFlash;   // 発見の旅で見つけた瞬間: その名前がきらっと（10/25-17）
      if ((stripFlash > 0 || justFound) && seen && !got) {   // 出撃の瞬間: 灰色の名前がいっせいに光る
        const k = justFound ? 1 - (t - foundAt[w.id]) / BATTLE.stripFoundFlash : stripFlash / 0.6;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.shadowColor = "rgba(255,214,90,1)"; ctx.shadowBlur = 12;
        ctx.fillStyle = "rgba(255,244,200,0.9)"; roundRect(x, y, cw, sh, 6); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "#c98a1e";
        chars.forEach((ch, kk) => ctx.fillText(VERTICAL_GLYPH[ch] || ch, x + cw / 2, top + kk * fs));
        ctx.restore();
      }
      // 地上に出る語句の枠: 小さな地面の絵のマーク（帯の右に出す。10/31-12 決定。文字の「地」ではない）
      if (BATTLE.groundMark && groundIds.has(w.id)) {
        const mx = x + cw + 9, my = y + sh / 2;
        ctx.fillStyle = "rgba(255,255,255,0.9)"; roundRect(mx - 7, my - 7, 14, 14, 4); ctx.fill();
        ctx.fillStyle = "#9a7650"; ctx.beginPath(); ctx.ellipse(mx, my + 4, 6, 3.2, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(mx - 6, my + 4, 12, 2);   // 土の盛り上がり
        ctx.strokeStyle = "#5f9a3e"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(mx, my + 1); ctx.lineTo(mx, my - 3); ctx.stroke();   // 小さな芽
        ctx.fillStyle = "#5f9a3e"; ctx.beginPath(); ctx.ellipse(mx + 2, my - 4, 2.4, 1.2, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      // （大ボスの枠の「さいごに出る」の印は、10/25-1 に廃止。発見の旅で10語すべてを探すため）
    });
    ctx.restore();
  }

  function drawBigWord(word, remain) {
    const a = Math.min(1, remain / 0.15, (BATTLE.wordShowTime - remain) / 0.08 + 0.2);
    ctx.globalAlpha = Math.max(0, a);
    const showKana = hasKanji(word.word);
    let size = 52;
    ctx.font = font(size);
    while (ctx.measureText(word.word).width > W - 60 && size > 24) { size -= 2; ctx.font = font(size); }
    const w = Math.max(ctx.measureText(word.word).width, 160) + 48;
    const h = size + (showKana ? 56 : 36);
    const cy = H * 0.45;
    const wc = WORLD_TINT[worldDef.id] || WORLD_TINT[1];   // 世界ごとの色（11/7-9 決定: 世界1 緑・世界2 青・世界3 紫）
    ctx.fillStyle = "rgba(255,253,245,0.95)";
    ctx.strokeStyle = wc.frame;
    ctx.lineWidth = 3;
    roundRect(W / 2 - w / 2, cy - h / 2, w, h, 22);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (showKana) {
      ctx.font = font(20);
      ctx.fillStyle = wc.kana;
      ctx.fillText(word.kana, W / 2, cy - size / 2 - 4);
    }
    ctx.font = font(size);
    ctx.fillStyle = word.role === "zako" ? wc.zako : ENEMY_COLOR[word.role];   // ザコのことばは世界の色（11/7-9）
    ctx.fillText(word.word, W / 2, cy + (showKana ? 12 : 0));
    ctx.globalAlpha = 1;
  }

  // ひと休み中（11/1）: 制作側の絵 smple_sleep（文字「ひと休み中」「画面をタップすると続きから」と右下の「Ⅱ」は絵に入っている）
  //   絵は全体を見せ、余りは絵のふちの色で埋める。絵が読み込めないときは前の文字の画面
  const sleepImg = Object.assign(new Image(), { src: "assets/sleep.jpg" });
  function drawSleep() {
    if (drawArtFit(sleepImg)) return;
    ctx.fillStyle = "rgba(248,243,228,0.85)";
    ctx.fillRect(0, 0, W, H);
    centerText("ひと休み中", "画面をタップすると続きから");
  }

  // 1枚の絵を、切らずに画面へ収めて描く（11/1）。余りは、同じ絵をうんと小さくしてから大きくのばしたもの（ぼかした絵）で埋める。
  // タイトルと同じ見せ方。絵がまだ読めていなければ false（呼んだほうが今までの見た目で描く）。描いたら絵の場所 {x, y, w, h} を返す
  // edge（色）を渡すと、絵を画面の下にそろえて、上の余りをその色でぬる（上のふちが紙の地だけの絵）
  const artSmall = new Map();
  function drawArtFit(img, edge) {
    if (!img.complete || !img.naturalWidth) return false;
    const sc = Math.min(W / img.naturalWidth, H / img.naturalHeight), iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
    const x0 = (W - iw) / 2, y0 = edge ? H - ih : (H - ih) / 2;
    ctx.fillStyle = edge || "#f8f0dc"; ctx.fillRect(0, 0, W, H);   // 絵のふちの生成り
    let sm = artSmall.get(img);
    if (sm === undefined) { try { sm = document.createElement("canvas"); sm.width = 9; sm.height = 16; sm.getContext("2d").drawImage(img, 0, 0, 9, 16); } catch (_) { sm = null; } artSmall.set(img, sm); }
    if (!edge && sm && (x0 > 0.5 || y0 > 0.5)) {
      const k = Math.max(W / 9, H / 16);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(sm, (W - 9 * k) / 2, (H - 16 * k) / 2, 9 * k, 16 * k); ctx.restore();
    }
    ctx.drawImage(img, x0, y0, iw, ih);
    return { x: x0, y: y0, w: iw, h: ih };
  }

  function centerText(big, small) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(30);
    ctx.lineWidth = 8; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
    ctx.strokeText(big, W / 2, H * 0.32);
    ctx.fillStyle = tint("#48693a");
    ctx.fillText(big, W / 2, H * 0.32);
    ctx.font = font(20);
    ctx.strokeText(small, W / 2, H * 0.32 + 40);
    ctx.fillText(small, W / 2, H * 0.32 + 40);
  }

  function fmtTime(sec) { return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ===== デバッグ用（タイトルを5回続けて押すと使える） =====
  const debug = {
    // 1回目の旅のようす（確かめる用）
    exploreInfo() { return explore && { t: explore.t, found: reacted, bino: Object.assign({}, bino), words: explore.list.map(d => ({ word: d.word.word, x: d.x, y: d.y, found: d.found, look: d.look })) }; },
    // 探検をとばして、「本番に持っていくもの」を選ぶ画面へ
    skipRecon() {
      if (!running || phase !== "round1") return;
      enemies = []; fillers = []; ebullets = []; bombs = []; blasts = []; items = []; odai = null;
      nextIdx = script.length;
      for (const w of script) found.add(w.id);
      reacted = found.size;
      state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; sortieStep = "say"; paused = false; drag = null;
    },
    // 本番をとばして、大ボスへ
    skipToBoss() {
      if (!running || phase === "boss") return;
      if (phase === "round1") { chooseLoadout("power"); startPhase("round2"); }
      enemies = enemies.filter(e => e.role === "boss"); fillers = []; ebullets = []; odai = null; obs = [];
      nextIdx = script.length;
      gapT = 0.01; state = "play"; paused = false;
    },
    // すぐクリア（10語ぜんぶ吸い込んだことにする）
    clearAll() {
      if (!running || state === "clear") return;
      absorbed = slots.slice(); missed = [];
      enemies = []; fillers = []; ebullets = []; odai = null;
      state = "clear"; stateTimer = 1; paused = false;
    },
  };

  return { start, stop, resize, pause, resume, choiceRects, tutorialSlides, debug, fps: () => ({ now: fpsNow, min: fpsMin }) };   // （自動プレイヤーで確かめるときは、ここで中の状態を外に出している）
})();
