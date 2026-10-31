// バトル（縦スクロールのシューティング）
// 空中と地上の2つの層がある
//   空中の敵 … 自機の弾（自動で連射）で倒す
//   地上の敵 … 自機の前にある照準◎に入ると、自動で「たね」を落として倒す
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
  perCharHp: { mid: { min: 2, max: 6 }, boss: { min: 6, max: 30 } },   // 1文字あたりの耐久の下限と上限
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
  firstHoldY: 0.42,            // ステージ1の救出の旅の1語目が止まって待つ高さ（画面の高さに対する割合。stages.js の firstHold）
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
  bombRange: 170,              // 照準◎の位置（自機からどれだけ前か、px）
  lockRadius: 26,              // 照準◎の大きさ（この中に地上の敵が入ると、たねを落とす）
  bombInterval: 0.15,          // たねを落とす間隔（秒）。ザコの語句が硬くなるたびに短くしている（0.3 → 0.22 → 0.15）
  bombFlight: 0.4,             // たねが地面に届くまでの秒数
  bombRadius: 36,              // たねが当たる広さ（px）

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
  odaiTimeLimit: 20,           // 中ボスのお題の制限時間（秒）。時間切れは取り逃がし。大ボスは制限なし
  odaiPenalty: 300,            // ダミーに当てたときの減点（コンボは切らない）
  odaiPenaltyCool: 1,          // 同じダミーで続けて減点しない秒数（連射で何度も減らないように）
  odaiBonus: 2000,             // 最初に当てたのが本物なら「ひらめき」ボーナス
  odaiColumns: [0.2, 0.5, 0.8], // 3つの語句をならべる列の位置（画面の幅に対する割合）。縦書きで動かさない

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

  // 旅の名前と表紙の文は data/texts.js の trips（10/21-1 に移した）
  // 本番の表紙（10/3-9）
  countStep: 0.45,             // 表紙のあとのカウント「3」「2」「1」のそれぞれの時間（秒）
  countGo: 0.5,                // 「出撃！」の時間（秒）。カウントの合計は2秒以内
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

  // --- 「ぜんぶ消し」ボム ---
  bombGain: 12,                // 語句を倒したときにたまるゲージ（×コンボ倍率）。100で満タン
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
    bossHpScale:   [[1, 1.1], [12, 2]],       // 中ボス・大ボスの1文字あたりの耐久の倍率
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
  bombShell: 0.5,              // ぜんぶ消しで、画面のことばの殻の硬さを何倍にするか（0.5 ＝ 半分減る。ほどけはしない。10/25-17）
  powerFxTime: 1.3,
  timeBarH: 6,                 // 発見の旅の残り時間の帯の太さ（px。画面のいちばん上。10/25-12）
  timeBarWarn: 10,             // 残り何秒で帯の色が変わるか
  exploreTimeScore: 100,       // 発見の旅: 基準の時間より早く終われば残り1秒につき＋、おそければ1秒につき−（10/25-17）
  exploreOverMsg: 2,           // 基準の時間を過ぎた瞬間に「時間オーバー！…」を出す秒数（10/25-21）
  exploreAgainGap: 2,          // 見つけられずに消えたことばが、出直すまでの間隔（秒）
  stripFoundFlash: 0.5,        // 見つけた瞬間に、左の枠の名前がきらっと光る秒数            // 「パワーアップ！」を出す秒数（10/25-9）
  fuwariSize: 62,              // 自機のふわりの絵の幅（px。10/25-6）
  fuwariExploreSize: 50,       // 発見の旅の、下のまん中の小さなふわりの幅
  fuwariFrameTime: 0.18,       // 飛んでいるときに1→2→3のコマを切り替える秒数
  fuwariBombSize: 0.75,        // ぜんぶ消しの大きなふわり（3のコマ）の幅（画面の短いほうの何倍か）            // 周の始まりの、ふわりの一言を出す秒数
  slowTime: 0.3,               // 吸い込む瞬間に画面全体がゆっくりになる秒数
  slowScale: 0.25,             // ゆっくりのときの速さ（1でふつう、小さいほどゆっくり）
  stripWidth: 24,              // 左端の「集めたことば」の縦の帯の幅（px。縦書き1文字分ほど）

  // --- 世界2・3の試作（10/31-10。docs/世界2・3の構想メモ.md）。数は仮 ---
  groundMark: false,           // 帯の「地」の印（試作では出さない。地上のことばは影を濃くするだけ）
  skillStopTime: 4,            // 必殺ワザ「時間止め」の秒数（敵も弾もことばも止まる。ふわりの光は出る）
  skillGuardTime: 10,          // 必殺ワザ「無敵タイム」の秒数（ぶつかっても元気が減らない）
  skillShowerShell: 0.5,
  orderHits: 3,                // 大ボス「3つを順に」: 同じことばに続けて何発当てたら「当てた」にするか（横切っただけでは数えない）
  orderHitGap: 0.35,           //   この秒数あいだがあくと、続けて当てた数は0にもどる       // 必殺ワザ「光のシャワー」: 画面じゅうのことばの殻の硬さを何倍にするか（0.5 ＝ 半分けずる）
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
  box:     { box: true, boxW: 88, boxH: 64, speed: 32, gap: 2.6, wait: 2, empty: 2, hold: 1, lanes: [0.3, 0.52, 0.74], open: false, openTime: 2.4, faceTime: 0.6, lock: 0 },
};

// ===== 必殺ワザ（10/31-10 試作。構想メモ 6）: 4つ。名前と説明は texts.js の skills。持っているワザは main.js が宝石の数で決める
const SKILL_IDS = ["clear", "stop", "guard", "shower"];   // clear ぜんぶ消し／stop 時間止め／guard 無敵タイム／shower 光のシャワー
const LOADOUT_VARS = { skill: "" };   // 持ち物「必殺ワザ」の説明の {skill}（選んでいるワザの名前）

// ===== 世界ごとの殻・弾の色（10/31-10 試作。絵が来るまでの仮: 世界1の絵の色を変えただけ）。書いていない世界は世界1のまま
const WORLD_LOOK = {
  2: { cocoon: "rgba(214,232,255,0.8)", fuzz: "#e4f0ff", mid: "#3f6a8f", boss: "#a8bcd8", bullet: { zako: "#1f5f8a", mid: "#2a3f9a", boss: "#2a2a6a", rim: "#bfe6ff" } },
  3: { cocoon: "rgba(238,226,255,0.8)", fuzz: "#f1e8ff", mid: "#6a4a8f", boss: "#c4aee4", bullet: { zako: "#6a2a8a", mid: "#8a1f5a", boss: "#2a1a5a", rim: "#ffd6f6" } },
};

// ===== ぜんぶ消しのボタンの色（10/25-9）: ゲージがたまったら赤橙（画面のほかの場所に使っていない色）。たまっていないときは薄い色のまま
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
function autoLayout(words, P, obstacles, groundOn) {
  const lanes = [0.3, 0.65, 0.5, 0.25, 0.7, 0.4, 0.6, 0.35, 0.55];
  const list = words.filter(w => w.role !== "boss").sort((a, b) => (a.order || 0) - (b.order || 0));
  const n = Math.min(P.tricky, list.length - 1);
  const kinds = P.difficulty >= 9 ? ["cross", "edge", "cross", "edge", "behind"]
    : P.difficulty >= 5 ? ["edge", "behind", "cross"] : ["edge", "behind"];
  const trickyIdx = new Set();
  for (let k = 0; k < n; k++) trickyIdx.add(Math.min(list.length - 1, 1 + Math.floor(k * (list.length - 1) / Math.max(1, n))));
  const layout = {};
  let kindNo = 0, groundLeft = groundOn === false ? 0 : BATTLE.autoGroundCount;   // 地上のない世界では0
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
  let script, absorbed, missed, bossWord, groundIds;
  let P = null;              // このステージの難易度から決まった数値
  let worldDef = {}, groundOn = true;   // 今の世界（stages.js の WORLDS）。groundOn: 地上の仕組みがあるか
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
  let groundHinted = false;  // 地上の敵のヒントを出したか
  let banner = null;         // 「大ボス あらわる！」などの帯
  let shake = 0;             // 画面のゆれ（被弾したとき）
  let level = POWER_LEVELS[0];
  let score = 0, combo = 0, maxCombo = 0;
  let floats = [];           // 点数が浮かぶ表示
  let hits = 0, downs = 0;   // 被弾した回数、失った機体の数
  let lives = 3;             // 残機
  let gameOvers = 0;         // 3機すべて失って、本番をやり直した回数
  let scoreAtMain = 0;       // 本番が始まったときの点数（やり直しでここに戻す）
  let retryMain = false;     // 本番のやり直しの画面か
  let lastPX = 0, lastPY = 0;   // いちばん最近の指の位置
  let lock = false;          // 照準に地上の敵が入っているか
  let slow = 0;              // ゆっくりの残り時間（秒）
  let gauge = 0;             // 「ぜんぶ消し」ボムのゲージ（0〜100）
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
  let fogLevel = 0;          // 霧の濃さ（0〜1。お題バトルと大ボスのときはうすくなる）
  let streaks = [];          // 風・雨・雪の見た目
  let found = new Set();     // 探検で見つけた語句の id
  let foundAt = {};          // 見つけた時刻（id → t。左の枠の名前をきらっと光らせる。10/25-17）
  let loadout = null;        // 本番に持っていくもの（LOADOUTS の id）
  let choiceT = 0;           // 選ぶ時間の残り（秒）
  let choiceFree = false;    // 持ち物選択に時間制限がないか（初めて選ぶとき。main.js の opts.firstChoice）
  let sortieStep = "choice"; // 出撃2の画面の段階: "say" ふわりの一言（10/25-5。タップで次へ）→ "choice" 持っていく物を選ぶ → "cover" 表紙（タップ待ち）→ "count" 3・2・1・出撃！
  let countT = 0;            // カウントの経過（秒）
  let freed = [];            // 殻から助けられて、ふわりのところへ飛んでいく語句
  let tut = null;            // 出ているチュートリアルの案内（出ているあいだはゲームが止まる）{ id, t, rest(紙芝居のつづき) }
  let hintOpts = null, hintShown = {};   // 案内: main.js から { seen, mark, all }（ステージ1だけ。all ＝ おさらいで全部出す）と、このバトルで出したもの
  let hintCard = null;       // 出している案内 { text, t }
  let bombHinted = false, bombFlash = 0;   // ぜんぶ消しの案内を出したか、ゲージがたまったときに左下を光らせる残り秒
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
  let typhoon = null;        // ぜんぶ消しの演出（タオルをくるっと振り回す）
  let extraUsed = false;     // 延長戦をしたか（1回だけ。10/25-19）
  let extraRound = false;    // いま延長戦か
  let wrongFx = null;        // お題で「ちがうよ」を大きく出している（10/25-16）{ age }
  let powerFx = null;        // 「パワーアップ！」の大きな文字（10/25-9）{ age }
  let bombing = false;       // 「ぜんぶ消し」で反応させている最中（ゲージをためない）
  let wave = null;           // 吸い込んだときに広がる光
  // 世界2・3の試作（10/31-10）
  let skill = "clear", skills = ["clear"];   // 選んでいる必殺ワザと、持っているワザ（main.js の opts.skill・opts.skills）
  let stopT = 0, guardT = 0, showerFx = null;   // 時間止め・無敵タイムの残り秒、光のシャワーの演出
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

  // 「ぜんぶ消し」ボムのボタン（画面左下のふわりマーク）
  function bombButton() { return { x: 14 + BATTLE.bombButtonR, y: H - 18 - BATTLE.bombButtonR, r: BATTLE.bombButtonR }; }

  // ===== 操作: 指一本のドラッグ（指の動いたぶんだけ自機が動く） =====
  function onDown(e) {
    e.preventDefault();
    if (paused) { resume(); return; }
    if (tut) { if (tut.t >= BATTLE.tutCloseAfter) closeTut(); return; }
    if (!player) return;
    if (state === "extraAsk") {   // 「行く」→ 延長戦、「クイズへ」→ クイズ
      const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      const b = extraButtons().find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
      if (b && b.id === "go") { Sound.se("start"); startExtra(); }
      else if (b) { Sound.se("item"); finishBattle(); }
      return;
    }
    if (state === "sortie") {   // 旅の画面: 選ぶ（救出の旅だけ）→ 表紙をタップ → カウント
        if (sortieNo === 2 && sortieStep === "say") { sortieStep = "choice"; Sound.se("item"); return; }   // ふわりの一言 → 持ち物選択
        if (sortieNo === 2 && sortieStep === "choice") {
          const rect = canvas.getBoundingClientRect();
          const px = e.clientX - rect.left, py = e.clientY - rect.top;
          const sk = skillRects().find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
          if (sk) { if (sk.id !== skill) { skill = sk.id; LOADOUT_VARS.skill = skillName(skill); if (opts.onSkill) opts.onSkill(skill); } Sound.se("item"); return; }   // 必殺ワザの段（ワザが2つ以上のとき。10/31-10 試作）
          const c = choiceRects().find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
          if (!c) return;   // 選ぶまで出撃しない（10秒で「つよい弾」）
          chooseLoadout(c.id);
          sortieStep = "cover";   // 選んだら表紙へ
        } else if (sortieStep === "cover") {
          sortieStep = "count"; countT = 0;   // タップで 3・2・1・出撃！
          Sound.se("odai");
          const ex = sortieNo === 1;   // 発見の旅は双眼鏡、救出の旅は自機
          drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: ex ? bino.x : player.x, py: ex ? bino.y : player.y };   // 指をつけたままなら、出発してすぐ動かせる
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
        return;
    }
    // ふわりマークをタップ: ゲージが満タンなら「ぜんぶ消し」
    const rect = canvas.getBoundingClientRect(), bb = bombButton();
    if (phase !== "round1" && Math.hypot(e.clientX - rect.left - bb.x, e.clientY - rect.top - bb.y) < bb.r + 10) {   // （1回目の旅にはボタンがない）
      if (gauge >= 100 && state === "play") useBomb();
      return;
    }
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
      if (state === "play") hint("binoMove");   // 案内: 双眼鏡を初めて動かした
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
    layout = opts.stage && opts.stage.patterns === "auto" ? autoLayout(words, P, opts.stage.obstacles, groundOn) : null;
    obsDef = (opts.stage && opts.stage.obstacles) || null;
    theme = Object.assign({}, DEFAULT_THEME, (opts.stage && opts.stage.theme) || {});
    weatherDef = (opts.stage && opts.stage.weather) || null;
    fogLevel = 0;
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
    shots = []; enemies = []; ebullets = []; fillers = []; bombs = []; items = []; obs = []; guide = null;
    startPhase("round1");
    fillerTimer = 1.2; shotTimer = 0; bombTimer = 0;
    player = { x: W / 2, y: H * 0.8, hp: BATTLE.playerMaxHp, inv: 0, glow: 0, hurt: 0 };
    level = POWER_LEVELS[0];
    score = 0; combo = 0; maxCombo = 0; floats = [];
    hits = 0; downs = 0; lives = BATTLE.lives; gameOvers = 0; scoreAtMain = 0; retryMain = false;
    paused = false; moved = false; groundHinted = false; banner = null; shake = 0; showWord = null; threads = []; pops = [];
    slow = 0; wave = null; gauge = 0; bombsUsed = 0; fsay = null; odai = null; bounces = [];
    msgQ = []; msgGap = 0; msgWasBusy = false;
    choiceFree = !!opts.firstChoice;
    tut = null; hintOpts = opts.hints || null; hintShown = {}; hintCard = null; bombHinted = false; bombFlash = 0; powerFx = null; wrongFx = null; extraUsed = false; extraRound = false;
    stripFlash = 0; sortieStep = "choice"; freed = [];
    explore = { t: 0, next: 0, nextAt: BATTLE.exploreFirst, again: [], list: [], bugs: [], bugT: 2, endT: 0, flies: [], streaks: [] };
    {
      const se = (opts.stage && opts.stage.explore) || {}, type = EXPLORE_MOVES[se.move] ? se.move : "drift";
      exMove = Object.assign({ move: type }, EXPLORE_MOVES[type], se);
    }
    bino = { x: W / 2 + 10, y: H * 0.42 };
    state = "sortie"; sortieNo = 1; reacted = 0; sortieStep = "cover";   // 発見の旅の表紙から始める   // 「出撃1 探検」の画面から始める
    loadout = null; powerBonus = 0; shield = 0; gaugeMul = 1;
    skills = (opts.skills && opts.skills.length ? opts.skills : ["clear"]).filter(id => SKILL_IDS.includes(id));
    skill = skills.includes(opts.skill) ? opts.skill : skills[0];
    LOADOUT_VARS.skill = skillName(skill);
    stopT = 0; guardT = 0; showerFx = null; rescueT = 0; evShown = {}; press = null;
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
  const obsActive = () => obsDef && phase === (obsDef.sortie === 1 ? "round1" : "round2");
  function addObstacle(x, r) { const o = { kind: obsDef ? obsDef.kind : "tree", x, y: -r, r }; obs.push(o); return o; }
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
    if (!hintOpts || hintShown[id]) return;
    if (!hintOpts.all && hintOpts.seen && hintOpts.seen[id]) return;
    hintShown[id] = true;
    if (hintOpts.mark) hintOpts.mark(id);
    const text = tx("hints." + id, Object.assign({ seed: seedName() }, vars || {}));
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime, yellow: id === "seed" }; slow = Math.max(slow, BATTLE.hintSlow); });   // たねの案内は黄色い帯（たねが黄色いとわかるように。10/25-17）
  }
  // ぜんぶ消しのゲージがたまった（10/25-1）: 初めての1回だけ、1秒ゆっくりにして案内。以後はたまるたびに左下が光って音が鳴る
  function bombReady() {
    bombFlash = 1.2;
    Sound.se("item");
    if (opts.bombHintSeen || bombHinted) return;
    bombHinted = true;
    if (opts.onBombHint) opts.onBombHint();
    const text = tx("bombReady");
    post("tutorial", () => { hintCard = { text, t: BATTLE.hintTime }; slow = Math.max(slow, BATTLE.hintSlow); });
  }
  const seedName = () => tx(`byWorld.${worldDef.id || 1}.seed`);
  // 世界2・3の新しい仕組み（地上など）は、その世界の最初のステージでだけ案内を出す（難しさは下げない。10/21-2）
  function newInWorld(kind) {
    const ids = (window.STAGES || []).filter(s => s.world === worldDef.id).map(s => s.id);
    if (!opts.stage || opts.stage.id !== Math.min(...ids)) return;
    if (kind === "ground") groundHint();
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
    if (tut) return 4;
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
    guide = Object.assign(g, { t: BATTLE.guideTime, text: tx(g.kind === "gate" ? "rescue.treeGate" : "rescue.treeDodge") });   // 文字は画面の中ほど、矢印は木の横（10/25-1）
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
    if (p !== "round1") Sound.fadeTo("battle");   // 本番の曲へ（探検は静かめの曲）
  }
  // カウントの今の段階（0〜2 ＝「3」「2」「1」、3 ＝「出撃！」）
  const holdOn = () => enemies.some(e => e.hold && e.hp > 0);   // 1語目を待っているあいだ（弾も虫も出さない。台本も進めない）
  const countStepNo = () => Math.min(3, Math.floor(countT / BATTLE.countStep));
  const roundInterval = () => phase === "round1" ? BATTLE.roundInterval1 : BATTLE.roundInterval2;
  // 坂: 今の出撃の弾の量の倍率（大きいほど撃つ間隔が短い）
  const fireRamp = () => Math.max(0.1, (BATTLE.ramp[phase] || BATTLE.ramp.round2).fire);
  // ===== 世界2・3の試作（10/31-10） =====
  const skillName = id => tx(`skills.${id}.name`);
  const frozen = () => stopT > 0;   // 時間止めのあいだ（敵・弾・ことば・コンベアが止まる）
  // 出来事（stages.js の event: { kind, sortie, at, dur }）がいま起きているか。sortie 1 ＝ 発見の旅の時刻、2 ＝ 救出の旅の時刻
  function evActive(kind) {
    const e = events.find(v => v.kind === kind);
    if (!e) return false;
    const tt = e.sortie === 1 ? (phase === "round1" && explore ? explore.t : -1) : (phase !== "round1" ? rescueT : -1);
    return tt >= e.at && tt < e.at + e.dur;
  }
  // 出来事が始まった瞬間に帯を1回
  function evBanners() {
    for (const e of events) if (!evShown[e.kind] && evActive(e.kind)) {
      evShown[e.kind] = true;
      Sound.se("odai");
      const text = tx("events." + e.kind);
      post("banner", () => { banner = { text, t: 2.2, color: "rgba(60,80,130,0.92)" }; });
    }
  }

  // 出撃の画面をタップ: 出撃する
  function startSortie() {
    state = "play";
    retryMain = false;
    Sound.se("start");
    if (sortieNo === 1) {
      player.x = W / 2; player.y = H - 70;   // 1回目の旅: ふわりは下のまん中で待つ（動かない・撃たない）
      // （始まりのふわりの一言は、表紙と案内に同じことがあるので出さない。10/25-1）
    } else {
      startPhase("round2");
      player.x = W / 2; player.y = H * 0.8;
      moved = false;   // 2回目の旅の最初に、もう一度「ゆびでふわりをうごかそう」を出す
      stripFlash = 0.6;   // 帯の灰色の名前がいっせいに光る
      hint("rescueStart");   // 案内: 救出の旅が始まった
      if (gauge >= 100) bombReady();   // 必殺ワザ（最初からゲージ満タン）や、発見の旅でたまっていたとき
      // （「ことばを助けよう！」の一言は、表紙の「ことばを助けに行こう！」と同じなので出さない。10/25-1）
      Sound.se("power");
    }
  }

  // 持っていくものを決める
  function chooseLoadout(id) {
    if (choiceFree && opts.onFirstChoice) opts.onFirstChoice();   // 初めて選んだ（次からは10秒の時間制限）
    choiceFree = false;
    loadout = id;
    if (id === "power") powerBonus = 1;
    if (id === "shield") shield = 1;
    if (id === "bomb") gauge = 100;   // 必殺ワザ: ぜんぶ消しがすぐ使える（救出の旅の最初からゲージ満タン。10/25-1）
    level = POWER_LEVELS[Math.min(Math.floor(absorbed.length / BATTLE.powerEvery) + powerBonus, POWER_LEVELS.length - 1)];
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

  // 持ち物選択の画面の「必殺ワザ」の段（10/31-10 試作）: 持っているワザが2つ以上のときだけ、3つのボタンの下に出す。1つのあいだは今の見た目のまま
  function skillRects() {
    if (skills.length < 2) return [];
    const rs = choiceRects(), last = rs[rs.length - 1];
    const per = skills.length <= 3 ? skills.length : 2, gap = 8, h = 38;
    const rowW = Math.min(last.w, W - 66 - last.x);   // 右下の一時停止のボタンと重ならない幅
    const w = (rowW - gap * (per - 1)) / per, y0 = Math.min(last.y + last.h + 30, H - 8 - Math.ceil(skills.length / per) * (h + gap));
    return skills.map((id, i) => ({ id, x: last.x + (i % per) * (w + gap), y: y0 + Math.floor(i / per) * (h + gap), w, h }));
  }
  function drawSkillRow() {
    const rs = skillRects();
    if (!rs.length) return;
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = font(13);
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,252,242,0.95)"; ctx.lineJoin = "round";
    ctx.strokeText(tx("skills.row"), rs[0].x + 2, rs[0].y - 12); ctx.fillStyle = "#6b4a10"; ctx.fillText(tx("skills.row"), rs[0].x + 2, rs[0].y - 12);
    ctx.textAlign = "center";
    for (const r of rs) {
      const on = r.id === skill;
      ctx.fillStyle = on ? "#f2541b" : "rgba(255,252,242,0.96)"; ctx.strokeStyle = on ? "#b8400f" : "#dcae3c"; ctx.lineWidth = on ? 3 : 2;
      roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
      let fs = 15; ctx.font = font(fs);
      const name = skillName(r.id);
      while (ctx.measureText(name).width > r.w - 10 && fs > 11) { fs--; ctx.font = font(fs); }
      ctx.fillStyle = on ? "#ffffff" : "#8a5a10";
      ctx.fillText(name, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }
    ctx.restore();
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
    const hp = BATTLE.hpOverride[role] || (role === "zako" ? Math.max(1, Math.max(word.hp, P.zakoHp) * (ground ? 1 : (BATTLE.zakoPatternHp[pattern] || 1))) : Math.max(1, Math.round(word.hp * P.bossHpScale)));
    if (od) { x = W / 2; y = -size - od.slot * 40; }
    const e = {
      hold: BATTLE.firstHold && phase === "round2" && !od && !extraRound && word === script[0],   // ステージ1の救出の旅の1語目
      word, role, size, w, h: size * 1.2, ground, pattern, lane,
      slot: od ? od.slot : 0, dummy: od ? !od.real : false, odaiReal: od ? od.real : false, penaltyAt: -9,
      last: phase !== "round1",                    // 2周目と大ボスは、倒せば吸い込む
      spd: (phase === "round1" ? BATTLE.round1Speed : 1) * P.speedScale,
      bx: x, x, y, hp, maxHp: hp,
      age: 0, phase: (word.id * 1.7) % 6, fire: 1.2, flash: 0
    };
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
        Math.min(lim.max, Math.max(lim.min, Math.round(BATTLE.wordTotalHp[role] * P.bossHpScale / n)));
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
    post("banner", () => { banner = { text: tx("newInWorld.ground"), t: 2.4, color: "rgba(111,154,74,0.9)" }; });
  }

  // ===== 雑魚の群れを出す =====
  // 本番と大ボスだけ雑魚を濃くする（難しさは雑魚の弾でなく数で作る）
  const fillerDense = () => phase === "round1" ? 1 : P.fillerDensity * ((theme.bugs && theme.bugs.density) || 1);   // 難易度の線（fillerDensity）× 時間帯の虫の数
  function spawnFiller(type, x, y, extra) {
    const def = FILLER_TYPES[type];
    const fhp = Math.max(1, Math.round(def.hp * (P.fillerHp || 1)));   // 虫の硬さ（難易度の線）
    fillers.push(Object.assign({ type, layer: def.layer, hp: fhp, maxHp: fhp, r: def.r * BATTLE.fillerScale, x, y, age: 0, flash: 0,
      fire: def.fire ? rand(0.8, 1.6) * def.fire * BATTLE.fillerFireScale * fillerDense() / P.fireRate / fireRamp() : 0 }, extra || {}));
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
    syncPauseBtn();
    rafId = requestAnimationFrame(loop);
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
    if (state === "sortie") {   // 出撃の画面のあいだは止まっている
      // （持ち物選択の時間制限は、10/25-14 になくした。選ぶまで待つ）
      if (sortieStep === "count") {
        const prev = countStepNo();
        countT += realDt;
        if (countT >= BATTLE.countStep * 3 + BATTLE.countGo) startSortie();
        else if (countStepNo() !== prev && countStepNo() < 3) Sound.se("odai");
      }
      return;
    }
    // 本番が始まったら、コクピットの枠が外れていく
    stripFlash = Math.max(0, stripFlash - realDt);
    // 吸い込む瞬間は、画面全体がゆっくりになる
    let dt = realDt;
    if (slow > 0) { slow -= realDt; dt = realDt * BATTLE.slowScale; }
    // 吸い込んだ語句の表示と、広がる光は実際の時間で進める
    if (showWord) { showWord.t -= realDt; if (showWord.t <= 0) showWord = null; }
    if (wave) { wave.age += realDt; if (wave.age > 0.6) wave = null; }
    if (fsay) { fsay.t -= realDt; if (fsay.t <= 0) fsay = null; }
    if (hintCard) { hintCard.t -= realDt; if (hintCard.t <= 0) hintCard = null; }
    bombFlash = Math.max(0, bombFlash - realDt);
    updateMsgs(realDt);
    if (guide) { guide.t -= realDt; if (guide.t <= 0) guide = null; }
    if (typhoon) { typhoon.age += realDt; if (typhoon.age > 0.9) typhoon = null; }
    if (wrongFx) { wrongFx.age += realDt; if (wrongFx.age > BATTLE.odaiWrongTime) wrongFx = null; }
    if (powerFx) { powerFx.age += realDt; if (powerFx.age > BATTLE.powerFxTime) powerFx = null; }
    if (odai && odai.intro > 0) odai.intro -= realDt;
    if (odai && odai.show > 0) odai.show -= realDt;   // 「3つを順に」の正しい順を見せている残り
    for (const b of bounces) { b.age += realDt; b.x += b.vx * realDt; b.y += b.vy * realDt; }
    bounces = bounces.filter(b => b.age < 0.5);
    t += dt;
    stopT = Math.max(0, stopT - dt); guardT = Math.max(0, guardT - dt);   // 必殺ワザの残り（10/31-10 試作）
    if (showerFx) { showerFx.age += realDt; if (showerFx.age > 1.2) showerFx = null; }
    shake = Math.max(0, shake - dt);
    player.glow = Math.max(0, player.glow - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    const sc = frozen() ? 0 : scrollSpeed();   // 時間止めのあいだは地面も止まる

    // 地面・雲の影・綿毛（奥行きのために、速さを変えて流す）
    for (const s of terrain) s.y += sc * dt;
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
        // 大ボスのあと、助けられなかったことばがあれば、その場で「もう一度さがしに行く？」（延長戦は1回だけ。10/25-19）
        if (!extraUsed && extraWords().length) { state = "extraAsk"; drag = null; Sound.se("odai"); return; }
        finishBattle();
      }
      return;
    }
    if (state === "extraAsk") return;   // 「行く」「クイズへ」を待っている
    if (phase === "round1") { updateExplore(dt); return; }   // 1回目の旅（双眼鏡）。雑魚・弾・木・天気は出さない
    if (!frozen()) rescueT += dt;   // 救出の旅の経過（出来事の時刻。10/31-10 試作）
    evBanners();

    // ===== 台本: 決まった時刻に、決まった順番で語句を出す（倒したかどうかには関係しない） =====
    if (gapT > 0) {
      // 周と周のあいだ
      gapT -= dt;
      if (gapT <= 0) {
        if (phase === "round1") {
          // 探検が終わった: 画面の雑魚と弾を片づけて、「出撃2 本番」の画面で止まる
          fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
          fillers = []; ebullets = []; bombs = []; items = [];
          state = "sortie"; sortieNo = 2; choiceT = BATTLE.choiceTime; sortieStep = "say";
          scoreAtMain = score;
          drag = null;
        } else if (extraRound) {   // 延長戦が終わった: そのままクイズへ（大ボスはもう助けたので出ない）
          extraRound = false;
          state = "clear"; stateTimer = 1.5;
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
          while (obsNext < list.length && roundT >= list[obsNext].at) spawnObstacle(list[obsNext++]);
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
    if (!odai && !rest && !holdOn() && !frozen()) fillerTimer -= dt;   // お題のあいだと、木の前後の休みのあいだは、雑魚を出さない
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
      // お題バトルの間は正面1本だけ（強化は一時休止。広がる弾がダミーに当たらないように）
      const spread = odai ? [0] : level.spread;
      for (const k of spread) shots.push({ x: player.x + k * 9, y: player.y - 22, vx: k * 55, thick: !odai && level.thick.includes(k) });
      shotTimer = BATTLE.shotInterval * level.rate;
    }
    for (const s of shots) { s.y -= BATTLE.shotSpeed * dt; s.x += s.vx * dt; }
    shots = shots.filter(s => s.y > -20);

    // 地上の攻撃: 照準に地上の敵が入ったら、自動でたねを落とす
    const rx = player.x, ry = player.y - BATTLE.bombRange;
    lock = groundTargets().some(g => inReach(g, rx, ry, BATTLE.lockRadius));
    bombTimer -= dt;
    if (lock && bombTimer <= 0) {
      bombs.push({ sx: player.x, sy: player.y - 10, tx: rx, ty: ry, age: 0 });
      bombTimer = BATTLE.bombInterval;
      Sound.se("bomb");
    }
    for (const b of bombs) {
      b.age += dt;
      b.ty += sc * dt;   // 落ちる先も地面といっしょに流れる
      if (b.age >= BATTLE.bombFlight && !b.done) { b.done = true; landBomb(b.tx, b.ty); }
    }
    bombs = bombs.filter(b => !b.done);

    // 語句の敵の動き
    for (const e of enemies) {
      if (frozen()) { e.flash = Math.max(0, e.flash - dt); if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt); continue; }   // 時間止め: ことばは止まって撃たない
      // ザコの語句: 画面に全部入ったら1秒止まって光る（この間は撃てない）
      if (e.role === "zako" && e.pattern !== "odai" && !e.appeared && onScreen(e)) { e.appeared = true; e.appearT = BATTLE.zakoAppearTime; if (!e.ground) hint("shell"); else if (worldDef.id > 1) newInWorld("ground"); }   // 案内: 最初の殻
      if (e.appearT > 0 && !(odai && e.pattern !== "odai")) { e.appearT -= dt; e.flash = Math.max(0, e.flash - dt); continue; }
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.wrongT > 0) e.wrongT = Math.max(0, e.wrongT - dt);
      if (e.parts) for (const p of e.parts) p.flash = Math.max(0, p.flash - dt);
      if (odai && e.pattern !== "odai") continue;   // お題バトルの間は、画面のほかの語句も止める（動かない・撃たない）
      if (e.pattern === "odai") {
        // お題の語句: 縦書きで左・中・右の列にならび、動かない（上から降りてきて止まる）
        const ty = odaiTop() + 30 + e.h / 2;
        e.y += (ty - e.y) * Math.min(1, dt * 4);
        e.x = W * BATTLE.odaiColumns[e.slot % BATTLE.odaiColumns.length];
      } else if (e.role === "boss") {
        const enter = Math.min(e.age / BATTLE.bossEnterTime, 1);
        e.y = -e.size + (H * BATTLE.bossStopY + e.size) * (1 - Math.pow(1 - enter, 2));
        const range = Math.min(W * BATTLE.bossSway, Math.max(0, W / 2 - e.w / 2 - 12));
        e.x = W / 2 + Math.sin(e.age * 0.7) * range;
      } else if (e.ground) {
        e.y += sc * dt;     // 地上の語句は地面といっしょに流れる
      } else if (e.pattern === "edge") {
        // 端にかくれる: 半分だけ顔を出して、出たり引っこんだりしながら降りる
        e.y += (H + e.size * 2) / BATTLE.edgeFallTime * dt * e.spd;
        const show = Math.min(1, 0.45 + 0.65 * Math.sin(e.age * 1.2));   // 見えている割合（ときどき全部出てくる。全部出ている間だけ当たる）
        e.x = e.lane < 0.5 ? -e.w / 2 + e.w * show : W + e.w / 2 - e.w * show;
      } else if (e.pattern === "treeshade") {
        // 木のかげ: 地面といっしょに降りてきて、上のほうで止まって待つ。木が去ってしばらくしたら降りてくる
        const holdY = H * BATTLE.shadeHoldY;
        const treeGone = !e.tree || e.tree.y - e.tree.r > H;
        if (e.y < holdY) e.y += sc * dt;
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
        e.x = e.bx + Math.sin(e.age * BATTLE.swaySpeed + e.phase) * BATTLE.sway;
      }
      // 弾を撃つ（画面の上のほうにいる間だけ）。1語目を待っているあいだと、ステージ1のお題では撃たない
      if (holdOn() || (e.pattern === "odai" && !BATTLE.odaiShellFire)) continue;
      e.fire -= dt;
      if (e.pattern === "odai" && odai && odai.intro > 0) e.fire = Math.max(e.fire, 0.5);
      if (e.fire <= 0 && e.y > 0 && e.y < H * 0.62) {
        e.fire = BATTLE.enemyFireInterval[e.role] / P.fireRate / fireRamp() * (e.pattern === "odai" ? 3 : 1) * (0.8 + Math.random() * 0.4);
        fireAt(e.x, e.y + (e.ground ? 0 : e.h / 2), BATTLE.shotPattern[e.role] || [0], e.role);   // 殻から飛ぶ弾の色: ザコ＝赤紫、中ボス＝赤、大ボス＝濃い紫（10/25-7）
      }
    }

    // 雑魚の動き
    for (const f of fillers) {
      if (frozen()) { f.flash = Math.max(0, f.flash - dt); continue; }   // 時間止め: 虫も止まる
      f.age += dt;
      f.flash = Math.max(0, f.flash - dt);
      const def = FILLER_TYPES[f.type];
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.y > 10 && f.layer === "air") hint("bug");   // 案内: 最初の虫が画面に入った
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
        f.y += H / 11 * BATTLE.fillerSpeed * (def.speed || 1) * dt;
        f.x += Math.sin(f.age * 1.3) * 40 * dt;
      } else {
        f.y += sc * dt;     // 地上の雑魚は地面といっしょに流れる
      }
      if (def.wind && weatherOn("wind")) f.x += BATTLE.windDir * BATTLE.windStrength * 1.6 * dt;   // 夕暮れの虫は風に流される
      if (def.fire) {
        f.fire -= dt;
        if (f.fire <= 0 && f.y > 0 && f.y < H * 0.68) {
          f.fire = def.fire * BATTLE.fillerFireScale * fillerDense() / P.fireRate / fireRamp() * rand(0.8, 1.2);
          fireAt(f.x, f.y, def.spread || [0], undefined, def.keep);
        }
      }
    }

    // 自機の弾が空中の敵に当たったか（地上の敵には当たらない）
    // 天気: 風（自機が横に流される。指で動かしていても流される）
    if (weatherOn("wind") && !(player.rising > 0) && !(odai && odai.intro > 0)) {
      const dx = BATTLE.windDir * BATTLE.windStrength * dt;
      const nx = Math.min(Math.max(player.x + dx, 24), W - 24);
      if (drag) drag.px += nx - player.x;
      player.x = nx;
    }
    // 霧: お題バトルと大ボスのときは晴れる（語句が見えないと選べないため）
    const fogWant = weatherOn("fog") && !odai && phase !== "boss" ? 1 : 0;
    fogLevel += (fogWant - fogLevel) * Math.min(1, dt * 2);
    for (const p of streaks) {   // 風・雨・雪の粒
      if (weatherOn("wind")) { p.x += BATTLE.windDir * 260 * p.s * dt; p.y += 20 * dt; }
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
    const inObstacle = (x, y) => obs.some(o => Math.hypot(x - o.x, y - o.y) < o.r);

    // 雑魚に先に当たる（「雑魚のうしろ」の語句は、前の雑魚をどけないと弾が届かない）
    for (const s of shots) {
      let hit = false;
      if (inObstacle(s.x, s.y)) { s.y = -999; continue; }   // 木は弾をさえぎる
      for (const f of fillers) {
        if (f.layer !== "air" || f.hp <= 0 || f.delay > 0) continue;
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
      if (Math.hypot(it.x - player.x, it.y - player.y) < 28) {
        it.got = true;
        player.hp = Math.min(BATTLE.playerMaxHp, player.hp + BATTLE.healItem);
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
    ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  }

  function fireAt(x, y, pattern, kind, keep) {
    const ang = Math.atan2(player.y - y, player.x - x);
    for (const da of pattern) {
      const sp = BATTLE.enemyBulletSpeed * P.bulletSpeed;   // 難易度の線（bulletSpeed）。世界1のはじめはゆっくり
      ebullets.push({ x, y, vx: Math.cos(ang + da) * sp, vy: Math.sin(ang + da) * sp, kind, keep });
    }
  }

  // 地上の的（地上の語句と、地上の雑魚）
  // 語句の敵が画面に全部入っているか（入るまでは弾が当たらない）
  function onScreen(e) {
    return e.x - e.w / 2 >= 0 && e.x + e.w / 2 <= W && e.y - e.h / 2 >= 0 && e.y + e.h / 2 <= H;
  }
  function groundTargets() {
    return enemies.filter(e => e.ground && e.hp > 0 && onScreen(e) && !(e.appearT > 0)).concat(fillers.filter(f => f.layer === "ground" && f.hp > 0 && f.y > 0));
  }
  function inReach(g, x, y, r) {
    if (g.word) return Math.abs(x - g.x) < g.w / 2 + r && Math.abs(y - g.y) < g.h / 2 + r;
    return Math.hypot(x - g.x, y - g.y) < g.r + r;
  }
  // たねが地面に届いた: ぽんっと花が咲いて、まわりの地上の敵に当たる
  function landBomb(x, y) {
    addPop(x, y, "#ffffff", 1.1, true);
    Sound.se("pop");
    for (const g of groundTargets()) {
      if (!inReach(g, x, y, BATTLE.bombRadius * 0.6)) continue;
      if (g.word) damageWord(g, x); else damageFiller(g);
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
    if (odai) return 1;   // お題バトルの間は正面1本だけ
    return level.spread.length + level.thick.length;   // 太い光は2本分
  }
  const shotDamage = e => (e.role === "zako" && !e.ground && BATTLE.zakoHpByShots) ? BATTLE.shotPower / shotUnits() : 1;   // 1発で削る量（パワーの初期値はここで2割下げる）

  function damageWord(e, hitX, amt = 1) {
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

  function breakPart(e, p) {
    const px = e.x + p.ox, py = e.y + (p.oy || 0);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 110;
      threads.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 5 + Math.random() * 6,
        curl: (Math.random() - 0.5) * 2, rot: Math.random() * 6, color: (SHELL[e.role] || SHELL.zako).bit, age: 0, scatter: 9, sparkle: true });
    }
    floats.push({ x: e.vertical ? px + e.size : px, y: e.vertical ? py : e.y - e.size * 0.9, text: p.kana, big: true, kana: true, age: 0 });
    Sound.se("crack");
    if (p.kana !== "ー" && BATTLE.speakWords) Sound.speak(p.kana);
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
  function wrapText(text, maxW) {
    const pieces = segmenter ? Array.from(segmenter.segment(text), x => x.segment) : Array.from(text);
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
  function fitOdaiText(text, maxFont, width, maxLines) {
    const fits = (fs, n) => { ctx.font = font(fs); const ls = wrapText(text, width); return ls.length <= n && ls.every(l => ctx.measureText(l).width <= width) ? ls : null; };
    const want = maxLines || BATTLE.odaiMaxLines;
    for (let fs = maxFont; fs >= BATTLE.odaiFitFont; fs--) { const ls = fits(fs, want); if (ls) return { fs, lines: ls, lh: Math.round(fs * 1.38) }; }
    for (let fs = BATTLE.odaiFitFont; fs >= BATTLE.odaiMinFont; fs--) { const ls = fits(fs, BATTLE.odaiMaxLines); if (ls) return { fs, lines: ls, lh: Math.round(fs * 1.38) }; }
    ctx.font = font(BATTLE.odaiMinFont);
    return { fs: BATTLE.odaiMinFont, lines: wrapText(text, width), lh: Math.round(BATTLE.odaiMinFont * 1.38) };
  }
  function odaiPanel() {
    const y = 40;   // 上の体力ゲージ・点数の下
    const f = fitOdaiText(odai ? odai.q : "", BATTLE.odaiSmallFont, W - stripRight() - 42, BATTLE.odaiPanelLines);   // 枠の中に2行（内側の幅）
    return { y, lines: f.lines, fs: f.fs, lh: f.lh, h: f.lines.length * f.lh + 14 };
  }
  function odaiTop() { const p = odaiPanel(); return p.y + p.h; }

  // 「次は？」にする中ボスと、その1つ前の工程（stages.js の nextAsk に書いた中ボスだけ。1つ前は words.js の order が1つ前のことば）
  function nextPrev(real) {
    const list = (opts.stage && opts.stage.nextAsk) || [];
    if (!list.includes(real.word)) return null;
    return opts.words.find(w => w.order === real.order - 1) || null;
  }
  // 大ボス「3つを順に」（世界2。10/31-10 試作。構想メモ 5）: stages.js の bossOrder: true のステージで、大ボスの choices の1つ目が「A→B→C」の3つで、
  //   その中に大ボスのことばがあるときだけ。3つのことばに正しい順に光を当てる（当てたことばに 1・2・3）。順をまちがえたら3つとも最初にもどり、正しい順を一度だけ見せる
  //   3つそろったら、ほかの2つは消えて、大ボスのことばの殻を世界1と同じようにほどく
  function orderSet(real) {
    if (!(opts.stage && opts.stage.bossOrder)) return null;
    const toks = String((real.choices || [])[0] || "").split("→").map(x => x.trim());
    if (toks.length !== 3 || !toks.includes(baseChars(real).join(""))) return null;
    return toks.map((tk, i) => tk === baseChars(real).join("") ? real : (opts.words.find(w => w.word === tk) || { id: -100 - i, stage: real.stage, word: tk, kana: "", hp: 1, role: "zako", order: 0 }));
  }
  function startOdai(real, isBoss) {
    const role = isBoss ? "boss" : "mid";
    const seq = isBoss && orderSet(real);   // 大ボス「3つを順に」
    const prev = !isBoss && nextPrev(real);   // 中ボス「次は？」（世界2。10/31-10 試作）: 1つ前の工程
    const cands = seq ? shuffle(seq.slice()) : shuffle([real, ...odaiDummies(real, prev)]);   // ならびは毎回入れかえ
    // 3つとも同じ大きさ（いちばん長い語句が、縦書きで画面に入る大きさ。24px より小さくしない）
    clearMsgs(9); msgQ = [];   // お題が始まるときは、出ているメッセージと待っているものを、すべて消してから問題文を出す
    const q = seq ? tx("odaiForm.order", { lead: (real.question.split(/[。]/)[0] || "") + "。" }) : prev ? tx("odaiForm.next", { prev: prev.word + (hasKanji(prev.word) && prev.kana ? `（${prev.kana}）` : "") }) : (real.odaiQuestion || real.question);
    // 問題文を読む時間（10/25-16）: 文の長さに合わせる。1文字あたり odaiReadPerChar 秒＋odaiReadBase 秒（最短 odaiReadMin、最長 odaiReadMax）
    const read = Math.min(BATTLE.odaiReadMax, Math.max(BATTLE.odaiReadMin, Array.from(q).length * BATTLE.odaiReadPerChar + BATTLE.odaiReadBase));
    odai = { real, boss: isBoss, t: 0, intro: read, firstHit: null, q, wrongRun: 0, mode: seq ? "order" : "pick", step: 0, show: 0, slip: false, seq: seq || null };
    // 案内: 最初のお題は、問題文の下に1行そえて、読む時間を少しのばす（順番待ちにはのせない。お題がいちばん大事なため）
    if (hintOpts && !hintShown.odai && (hintOpts.all || !(hintOpts.seen && hintOpts.seen.odai))) {
      hintShown.odai = true; if (hintOpts.mark) hintOpts.mark("odai");
      odai.hint = tx("hints.odai"); odai.intro += BATTLE.odaiHintExtra; slow = odai.intro;
    }
    const longest = Math.max(...cands.map(w => Array.from(w.word).length));
    const room = H * 0.66 - odaiTop() - 30;   // 問題文の帯の下から、自機の上まで
    const size = Math.max(24, Math.min(BATTLE.fontSize[role], Math.floor(room / (longest * 1.12))));
    cands.forEach((w, i) => spawn(w, { role, size, slot: i, real: w === real }));
    if (seq) for (const e of enemies) if (e.pattern === "odai") { e.seqNo = seq.indexOf(e.word); e.dummy = true; e.num = 0; }   // 3つを順に: そろうまでは3つとも、当てても削れない
    // お題のあいだは、雑魚と雑魚の弾を出さない（10/3-12）。始まる瞬間に画面の雑魚と弾を消す（殻から飛ぶ弾は、読む時間が終わってから）
    fillers.forEach(f => addPop(f.x, f.y, "#fff8d8", 0.8, f.layer === "ground"));
    fillers = []; ebullets = [];
    slow = odai.intro;   // 吸い込みと同じスロー。読む時間をつくる（10/25-16: 読む時間の長さに合わせる。前は最初のお題の案内でのばした分が消えていた）
    // （「お題だよ！」の一言は、問題文と重なるので出さない。説明はチュートリアルで。10/7-1）
    Sound.se("odai");
  }

  // お題の語句に弾が当たった
  function odaiHit(e, s) {
    if (odai.mode === "order") { orderHit(e, s); return; }
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

  // 大ボス「3つを順に」で、ことばに光が当たった
  function orderHit(e, s) {
    const list = enemies.filter(q => q.pattern === "odai" && q.hp > 0);
    if (e.num || odai.show > 0) { bounces.push({ x: s.x, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 120, vy: 320, age: 0 }); return; }   // もう番号がついている・正しい順を見せているあいだ
    // 光は自動で出るので、となりの列へ動くとちゅうに、まん中のことばを横切ってしまう。同じことばに続けて orderHits 発当てたときだけ「当てた」にする
    if (t - (e.hitT || -9) > BATTLE.orderHitGap) e.hitN = 0;
    e.hitT = t; e.hitN = (e.hitN || 0) + 1; e.flash = 0.12;
    if (e.hitN < BATTLE.orderHits) { Sound.se("hit"); return; }
    e.hitN = 0;
    if (e.seqNo === odai.step) {   // 正しい順
      odai.step++; e.num = odai.step; e.flash = 0.3;
      floats.push({ x: e.x, y: e.y - e.h / 2 - 16, text: String(e.num), big: true, age: 0 });
      Sound.se("shine");
      if (odai.step >= 3) {   // そろった: ほかの2つは消えて、大ボスの殻をほどく
        if (!odai.slip) { score += BATTLE.odaiBonus; floats.push({ x: W / 2, y: H * 0.45, text: `ひらめき！ +${BATTLE.odaiBonus}`, big: true, age: 0 }); Sound.se("hirameki"); }
        for (const q of list) {
          if (q.word === odai.real) { q.dummy = false; q.num = 0; continue; }
          vanish.push({ word: q.word, x: q.x, y: q.y, size: q.size, w: q.w, ground: false, age: 0 }); q.hp = 0;
        }
        enemies = enemies.filter(q => q.hp > 0);
        odai.mode = "pick"; odai.firstHit = "done";
      }
      return;
    }
    // 順がちがう: 3つとも最初にもどして、正しい順を一度だけ見せる。減点は世界1のダミーと同じ
    odai.slip = true;
    if (t - e.penaltyAt >= BATTLE.odaiPenaltyCool) {
      e.penaltyAt = t;
      score = Math.max(0, score - BATTLE.odaiPenalty);
      floats.push({ x: e.x, y: e.y - e.size, text: `−${BATTLE.odaiPenalty}`, big: true, wrong: true, age: 0 });
      Sound.se("boing");
      wrongFx = { age: 0, text: tx("odaiForm.orderWrong") }; e.wrongT = BATTLE.odaiWrongTime;
    }
    for (const q of list) q.num = 0;
    odai.step = 0; odai.show = 1.8;
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
    odai = null;
    if (!ok) post("say", () => { fsay = { text: tx("rescue.odaiLost"), t: 2 }; });
  }

  // 「ぜんぶ消し」: 画面の雑魚と敵の弾を全部消す。1周目は、出ている語句を全部「反応」させる
  // 2周目と大ボスのときは、語句には効かない（雑魚と敵の弾だけ）
  function useBomb() {
    if (skill !== "clear") { useSkill(); return; }   // ぜんぶ消し以外の必殺ワザ（10/31-10 試作）
    gauge = 0;
    bombsUsed++;
    typhoon = { age: 0 };
    post("say", () => { fsay = { text: tx("rescue.typhoon"), t: 1.5 }; });
    Sound.se("light");
    wave = { x: player.x, y: player.y, age: 0 };
    player.glow = 0.35;
    player.inv = Math.max(player.inv, 1);
    for (const f of fillers) {
      score += BATTLE.scoreFiller;
      addPop(f.x, f.y, "#fff8d8", 1, f.layer === "ground");
    }
    fillers = [];
    ebullets = [];
    if (phase === "round1") {
      bombing = true;
      for (const e of enemies) {
        if (e.role === "boss" || e.hp <= 0 || !onScreen(e) || e.appearT > 0) continue;
        e.hp = 0;
        defeat(e);
      }
      enemies = enemies.filter(e => e.hp > 0);
      bombing = false;   // 反応させたぶんでは、ゲージはたまらない
    } else {
      // 救出の旅（10/25-17）: 画面のことばの殻の硬さが半分減る（ほどけはしない）。中ボス・大ボスは文字ごとに
      for (const e of enemies) {
        if (e.ground || e.hp <= 0 || !onScreen(e) || !hasShell(e)) continue;
        if (e.parts) { for (const p of e.parts) if (!p.broken && !p.deco) { p.hp *= BATTLE.bombShell; p.flash = 0.3; } }
        else e.hp *= BATTLE.bombShell;
        e.flash = 0.3;
        if (e.role === "boss") bossCheer(e);
      }
    }
  }
  // 必殺ワザ（10/31-10 試作。構想メモ 6）: 時間止め・無敵タイム・光のシャワー。ゲージのため方とボタンは、ぜんぶ消しと同じ
  function useSkill() {
    gauge = 0;
    bombsUsed++;
    post("say", () => { fsay = { text: tx("skills.say." + skill), t: 1.5 }; });
    Sound.se("light");
    player.glow = 0.35;
    if (skill === "stop") stopT = BATTLE.skillStopTime;
    else if (skill === "guard") guardT = BATTLE.skillGuardTime;
    else if (skill === "shower") {   // 画面じゅうのことばの殻を半分けずる（地面のことばも。ほどけはしない）
      showerFx = { age: 0 };
      for (const e of enemies) {
        if (e.hp <= 0 || !onScreen(e) || !hasShell(e) || e.dummy) continue;
        if (e.parts) { for (const p of e.parts) if (!p.broken && !p.deco) { p.hp = Math.max(1, Math.round(p.hp * BATTLE.skillShowerShell)); p.flash = 0.3; } }
        else e.hp = Math.max(0.01, e.hp * BATTLE.skillShowerShell);
        e.flash = 0.3;
        if (e.role === "boss") bossCheer(e);
      }
    }
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
    floats.push({ x: f.x, y: f.y - 10, text: `+${BATTLE.scoreFiller}`, big: false, age: 0 });
    // 倒した雑魚は、ぽんっと大きな花になって、輪ときらきらが広がる
    addPop(f.x, f.y, f.layer === "ground" ? "#f6c9d6" : "#fff2b8", BATTLE.popScale, f.layer === "ground", true);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 120;
      threads.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: 3, curl: 0, rot: 0,
        color: ["#ffe9a0", "#ffffff", "#f8c8d8"][i % 3], age: 0, scatter: 9, sparkle: true });
    }
    Sound.se("pop");
    if (Math.random() < BATTLE.dropRate) { items.push({ x: f.x, y: f.y, age: 0 }); hint("seed"); }   // 案内: 初めてたねが落ちた
  }

  // 花が咲くような小さな演出
  function addPop(x, y, color, scale, ground, ring) {
    pops.push({ x, y, color, scale, ground: !!ground, ring: !!ring, age: 0 });
  }
  function updatePops(dt) {
    const sc = scrollSpeed();
    for (const p of pops) { p.age += dt; if (p.ground) p.y += sc * dt; }
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
    const before = gauge;
    if (!bombing) gauge = Math.min(100, gauge + BATTLE.bombGain * mul * gaugeMul);
    if (before < 100 && gauge >= 100) bombReady();
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
    ex.t += dt;
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
    for (const d of ex.list) {
      d.age += dt;
      if (d.found) { d.foundT += dt; continue; }
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
      if (d.age < d.life && d.vis > 0.5 && inBino(d.x, d.y, 0.9)) {
        d.look += dt;
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
      post("banner", () => { banner = { text, t: 2.4, color: "rgba(72,105,58,0.92)" }; });
    }
  }

  // ===== 世界2の発見の旅「箱」（10/31-10 試作。構想メモ 2・10.5） =====
  // 工場の床の上のコンベアを、箱が流れてくる。指で押さえ続けて exMove.hold 秒で開く。中のことばは左の札へ（世界1の「見つけた」と同じ点・ゲージ）
  // 空箱は「からっぽ…」。流れきった箱は exMove.wait 秒あとに、流れの上手から戻ってくる（時間切れなし）
  const convDir = () => evActive("reverse") ? -1 : 1;   // コンベアの向き（ステージ6の出来事「コンベアが逆」で左へ）
  function boxSetup() {
    const mv = exMove, ex = explore;
    let list = shuffle(exploreWords().map(w => ({ word: w })).concat(Array.from({ length: mv.empty || 0 }, () => ({ word: null }))));
    if (mv.lock > 0) {   // 鍵つきの箱: ことばの箱から lock 個（いちばん前のものはのぞく）。鍵の箱は2番目に出す
      shuffle(list.slice(1).filter(b => b.word)).slice(0, mv.lock).forEach(b => (b.lock = true));
      list.splice(1, 0, { word: null, key: true });
    }
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
  const boxCanOpen = b => !(b.lock && !explore.keyFound) && (!exMove.open || boxFace(b) === 0);
  function updateBoxes(dt) {
    const ex = explore, mv = exMove, words = exploreWords();
    if (!ex.queue) boxSetup();
    evBanners();
    const dir = convDir();
    ex.belt += dir * mv.speed * dt;
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
        b.wait -= dt;
        if (b.wait <= 0) { if (entryFree(b.lane, b)) { b.out = false; b.x = entryX(b); b.hold = 0; } else b.wait = 0.3; }
        continue;
      }
      b.x += dir * mv.speed * dt;
      b.y = laneY(b.lane);
      if (b.open) { b.openT += dt; continue; }
      if ((dir > 0 && b.x - b.w / 2 > W) || (dir < 0 && b.x + b.w / 2 < 0)) { b.out = true; b.wait = mv.wait; b.hold = 0; continue; }
      if (press && !pressed && Math.abs(press.x - b.x) < b.w / 2 + 6 && Math.abs(press.y - b.y) < b.h / 2 + 6 && b.x > stripRight() && b.x < W) pressed = b;
    }
    for (const b of ex.boxes) {
      if (b.out || b.open) continue;
      if (b !== pressed) { b.hold = 0; continue; }
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
    gauge = Math.min(100, gauge + BATTLE.bombGain * gaugeMul);
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
    if (e.odaiReal && odai) endOdai(true);
    const lv = POWER_LEVELS[Math.min(Math.floor(absorbed.length / BATTLE.powerEvery) + powerBonus, POWER_LEVELS.length - 1)];
    if (lv !== level && absorbed.length < opts.total) {
      level = lv;
      powerFx = { age: 0 };   // その瞬間に、画面に大きく「パワーアップ！」と音（順番待ちはしない。10/25-9）
      Sound.se("power");
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
    player.hp = Math.min(BATTLE.playerMaxHp, player.hp + BATTLE.healOnAbsorb);
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
      fillers = []; ebullets = []; bombs = [];
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
  // 延長戦（10/25-19）: 残ったことばだけが出る救出の旅。持ち物・元気・パワー・ゲージは今のまま。全部終わったら、そのままクイズへ
  function startExtra() {
    const list = extraWords();
    extraUsed = true; extraRound = true;
    missed = [];   // 延長戦でまた逃がしたら、もう一度ここに入る
    script = list;
    enemies = []; fillers = []; ebullets = []; bombs = []; items = []; odai = null; obs = []; rest = null;
    state = "play"; drag = null;
    startPhase("round2");
    post("banner", () => { banner = { text: tx("rescue.extraStart"), t: 1.6, color: "rgba(201,138,30,0.92)" }; });
  }
  // 「もう一度さがしに行く？」の2つのボタンの場所
  function extraButtons() {
    const bw = Math.min(W - 60, 150), bh = 54, gap = 14, y = H * 0.52;
    return [{ id: "go", x: W / 2 - bw - gap / 2, y, w: bw, h: bh }, { id: "quiz", x: W / 2 + gap / 2, y, w: bw, h: bh }];
  }
  function drawExtraAsk() {
    ctx.save();
    ctx.fillStyle = "rgba(40,50,35,0.45)"; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 32, 340), ph = 220, px = W / 2 - pw / 2, py = H * 0.52 - 140;
    ctx.fillStyle = "rgba(255,253,245,0.98)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
    roundRect(px, py, pw, ph, 18); ctx.fill(); ctx.stroke();
    drawFuwariArt(1, W / 2, py - 6, 64);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = font(17); ctx.fillStyle = "#4b3a1a";
    wrapText(tx("rescue.extraAsk", { n: extraWords().length }), pw - 40).forEach((l, i) => ctx.fillText(l, W / 2, py + 46 + i * 26));
    extraButtons().forEach(b => {
      ctx.fillStyle = b.id === "go" ? "#6f9a4a" : "#fffdf7"; ctx.strokeStyle = b.id === "go" ? "#4f7a32" : "#c9b98f"; ctx.lineWidth = 2.5;
      roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.stroke();
      ctx.font = font(19); ctx.fillStyle = b.id === "go" ? "#ffffff" : "#6b5a3a";
      ctx.fillText(tx(b.id === "go" ? "rescue.extraGo" : "rescue.extraQuiz"), b.x + b.w / 2, b.y + b.h / 2 + 1);
    });
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
    if (guardT > 0) return;   // 必殺ワザ「無敵タイム」: ぶつかっても元気が減らない（10/31-10 試作）
    if (shield > 0) {   // 盾: 1回だけ弾を防ぐ
      shield = 0;
      player.inv = 1;
      player.glow = 0.35;
      floats.push({ x: player.x, y: player.y - 40, text: tx("rescue.shieldSaved"), big: true, age: 0 });
      Sound.se("shield");
      return;
    }
    player.hp -= BATTLE.damage;
    player.inv = BATTLE.invincibleTime;
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
    player.hp = BATTLE.playerMaxHp;
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
    enemies = []; fillers = []; ebullets = []; bombs = []; items = []; obs = []; odai = null;
    if (phase !== "round1") {
      absorbed = []; missed = [];
      score = scoreAtMain;
    } else {
      scoreAtMain = score;   // 探検中に3機失ったら、探検はそこまで
    }
    combo = 0; gauge = 0; level = POWER_LEVELS[0];
    loadout = null; powerBonus = 0; shield = 0; gaugeMul = 1;
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
    for (const b of bombs) drawBomb(b);
    // 照準
    if (state === "play" && groundOn) drawReticle();   // 照準◎は地上のある世界だけ

    // 雲の影（地面の上を流れる）
    ctx.fillStyle = theme.cloudShadow;
    for (const c of cloudShadows) { ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2); ctx.fill(); }

    // 障害物
    for (const o of obs) drawObstacle(o);

    // 空中のものの影（右下にずらして、浮いているように見せる）
    ctx.fillStyle = "rgba(60,80,40,0.16)";
    for (const f of fillers) if (f.layer === "air" && !(f.delay > 0)) { ctx.beginPath(); ctx.ellipse(f.x + 16, f.y + 26, f.r * 0.9, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const it of items) { ctx.beginPath(); ctx.ellipse(it.x + 8, it.y + 14, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(player.x + 20, player.y + 34, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

    // 綿のたね（体力回復）
    for (const it of items) drawItem(it);

    // 自機の弾（ふわりの光）: 白寄りの明るい桃色の細長い光。敵の弾（濃い色の球）と見分けられるように（10/25-7。色は BULLET_COLORS）
    for (const s of shots) {
      const k = BATTLE.shotDrawScale;   // 見た目だけ大きく（当たりは今のまま）
      ctx.fillStyle = BULLET_COLORS.shotHalo;   // まわりにやわらかい光の輪
      ctx.beginPath(); ctx.ellipse(s.x, s.y, (s.thick ? 12 : 8) * k, (s.thick ? 18 : 12) * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s.x, s.y, (s.thick ? 7 : 4) * k, (s.thick ? 13 : 8) * k, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = BULLET_COLORS.shotRim; ctx.stroke();
      ctx.fillStyle = BULLET_COLORS.shot; ctx.fill();
    }

    // 空中の雑魚
    for (const f of fillers) if (f.layer === "air") drawFiller(f);

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
    drawPlayer();
    if (guardT > 0) drawGuardTowels();
    if (showerFx) drawShower();
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
      ctx.font = font(fl.kana ? 22 : (fl.big ? 18 : 12));
      ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
      ctx.strokeText(fl.text, fl.x, fl.y - fl.age * 30);
      ctx.fillStyle = fl.wrong ? "#b05068" : (fl.found ? "#6f9a4a" : (fl.kana ? "#5d6b4c" : (fl.big ? "#c98a1e" : "#8a9a78")));   // 砕けた文字の読みは、ふりがなの色
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 30);
    }
    ctx.globalAlpha = 1;
    drawHud();
    drawBombButton();
    // 操作のヒント（まだ動かしていないとき）
    if (!moved && state !== "clear") {
      ctx.globalAlpha = hintFadeIn();   // 点滅しない。出るときに一度ふわっと現れるだけ（10/25-12）
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = font(16);
      ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
      const hy = Math.min(H - 24, player.y + 54);
      if (!hintCard) ctx.strokeText(tx("rescue.moveHint"), W / 2, hy);   // 案内が出ているあいだは出さない（同じことを2か所に書かない）
      ctx.fillStyle = "#48693a";
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
    if (tut) drawTut();
    if (state === "clear") centerText(`${absorbed.length}のことばを助けた！`, `${score}点`);
    if (state === "extraAsk") drawExtraAsk();
    if (paused) drawSleep();
  }

  const exploreBgImgs = {};
  function drawExploreBg() {
    const wd = (window.WORLDS || []).find(w => opts.stage && w.id === opts.stage.world), src = wd && wd.exploreBg;
    if (!src) return false;
    const img = exploreBgImgs[src] || (exploreBgImgs[src] = Object.assign(new Image(), { src }));
    if (!img.complete || !img.naturalWidth) return false;   // 読み込めないときは、今までの背景
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
        const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight), iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
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
    const y1 = H * BATTLE.fogTop, y2 = y1 + 70;
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
    if (weatherOn("wind")) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (const p of streaks) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - BATTLE.windDir * 26 * p.s, p.y - 2); ctx.stroke(); }
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
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.strokeText(tx("rescue.powerUp"), 0, 0);
    ctx.fillStyle = "#d39a12"; ctx.fillText(tx("rescue.powerUp"), 0, 0);
    ctx.restore();
  }

  // ぜんぶ消し（仮の絵）: 自機のまわりでタオルがくるっと回りながら広がり、白いうずが残る
  // 無敵タイム: タオルが自機のまわりを回る（10/31-10 試作。仮の図形）
  function drawGuardTowels() {
    const a0 = t * 3, R = 44, fade = Math.min(1, guardT / 0.6);
    ctx.save(); ctx.globalAlpha = 0.9 * fade;
    for (let i = 0; i < 3; i++) {
      const a = a0 + i * Math.PI * 2 / 3, x = player.x + Math.cos(a) * R, y = player.y + Math.sin(a) * R * 0.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = ["#ffffff", "#ffd6e6", "#d6ecff"][i]; ctx.strokeStyle = "#b8a68a"; ctx.lineWidth = 1.5;
      roundRect(-11, -7, 22, 14, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(180,160,130,0.7)"; ctx.beginPath(); ctx.moveTo(-11, -3); ctx.lineTo(11, -3); ctx.moveTo(-11, 3); ctx.lineTo(11, 3); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // 光のシャワー: 画面の上から光の粒が降る（10/31-10 試作。仮の見た目）
  function drawShower() {
    const k = showerFx.age / 1.2;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k) * 0.85; ctx.strokeStyle = "#fff2a8"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let i = 0; i < 24; i++) {
      const x = (i + 0.5) / 24 * W, y = ((k * 1.6 + (i * 0.37) % 1) % 1.2) * H;
      ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
  }
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
    if (o.kind === "rock") {
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

  // 照準◎（自機の前の地面）。地上の敵が入ると色が変わる
  function drawReticle() {
    const x = player.x, y = player.y - BATTLE.bombRange, r = BATTLE.lockRadius;
    ctx.save();
    if (lock) {   // 地上の敵に重なったら、照準が光る
      const pulse = 0.6 + Math.sin(t * 12) * 0.4;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.8);
      g.addColorStop(0, `rgba(255,245,170,${0.75 * pulse})`); g.addColorStop(1, "rgba(255,245,170,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "rgba(255,220,90,1)"; ctx.shadowBlur = 12;
    }
    ctx.globalAlpha = lock ? 1 : 0.55;
    ctx.strokeStyle = lock ? "#e09a1e" : "#6f9a4a";
    ctx.lineWidth = lock ? 3.5 : 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawBomb(b) {
    const k = Math.min(1, b.age / BATTLE.bombFlight);
    const x = b.sx + (b.tx - b.sx) * k, y = b.sy + (b.ty - b.sy) * k;
    const r = 7 - k * 3;   // 地面に近づくほど小さく（落ちていく感じ）
    ctx.fillStyle = "rgba(60,80,40,0.18)";
    ctx.beginPath(); ctx.arc(b.tx, b.ty, 4 + k * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9a7650";
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, k * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
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
    ctx.save();
    ctx.globalAlpha = BATTLE.fillerAlpha;
    const hasFilter = "filter" in ctx;
    if (hasFilter) ctx.filter = [theme.fillerFilter !== "none" ? theme.fillerFilter : "", BATTLE.fillerDark].join(" ").trim() || "none";   // 時間帯の色味＋暗い色
    ctx.shadowColor = BATTLE.fillerOutline; ctx.shadowBlur = 3;   // 濃い輪郭（背景の飾りと見分けやすく。10/21-1）
    ctx.translate(x, y);
    ctx.scale(BATTLE.fillerDrawScale, BATTLE.fillerDrawScale);
    if (!hasFilter) f._darkFallback = true;
    if (f.flash > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
    const lit = f.flash > 0;
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
    ctx.restore();
    if (f._darkFallback) {   // filter が使えない端末: 上にうすく暗い色を重ねる
      ctx.fillStyle = "rgba(30,25,40,0.4)";
      ctx.beginPath(); ctx.arc(x, y, r * BATTLE.fillerDrawScale * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    // 硬い雑魚は、のこりの硬さを小さな点で
    if ((f.maxHp || 1) > 1 && f.hp < f.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < f.hp; i++) { ctx.beginPath(); ctx.arc(x - (f.hp - 1) * 4 + i * 8, y - f.r - 6, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
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
      if (p.broken) {   // 殻から解けた文字: 金色に光る
        ctx.globalAlpha = alpha; ctx.shadowColor = "rgba(255,214,90,1)"; ctx.shadowBlur = 12; ctx.fillStyle = GOLD_COLOR; ctx.fillText(ch, x, py); ctx.shadowBlur = 0; continue;
      }
      const wob = p.flash > 0 ? (Math.random() - 0.5) * 3 : 0;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,214,90,0.9)"; ctx.shadowBlur = 12;
      ctx.lineWidth = 8; ctx.strokeStyle = wrongBlink(e) ? "#ff6b6b" : e.flash > 0 ? "#fff6c8" : (theme.wordStroke || "#fff6d8");
      ctx.strokeText(ch, x + wob, py);
      ctx.shadowBlur = 0;
      ctx.fillStyle = fillColor; ctx.fillText(ch, x + wob, py);
      if (hasShell(e) && p.maxHp) drawCharShell(e.role, x + wob, py, e.size, p.hp / p.maxHp);
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
      ctx.globalAlpha = 0.45 + 0.5 * k;
      ctx.strokeStyle = (WORLD_LOOK[worldDef.id] || {}).mid || SHELL.mid.color; ctx.lineWidth = 2; ctx.lineCap = "round";
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
    const cocoon = hasShell(e) && !e.parts && e.maxHp > 0 ? e.hp / e.maxHp : 0;   // ザコの語句: 綿毛のまゆ（残りの硬さで、うすくなる）
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
        if (hasShell(e) && p.maxHp) { drawCharShell(e.role, px, y, e.size, p.hp / p.maxHp); ctx.fillStyle = fillColor; }
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
    if (worldDef.id >= 2) {   // 世界2・3（10/31-10 試作）: 地面のことばは、影を濃くするだけ（帯の「地」の印は出さない）
      ctx.fillStyle = "rgba(20,25,40,0.55)";
      ctx.beginPath(); ctx.ellipse(e.x + 4, e.y + e.size * 0.45, e.w * 0.62 + 18, e.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      drawWordText(e, e.x + wob, e.y, 1);
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
    const lb = (WORLD_LOOK[worldDef.id] || {}).bullet, C = lb ? Object.assign({}, BULLET_COLORS, lb) : BULLET_COLORS, r = BATTLE.enemyBulletSize * (1 + C.pulse * Math.sin(t * C.pulseSpeed + b.x * 0.05));
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C[b.kind] || C.zako; ctx.fill();
    ctx.lineWidth = C.rimWidth; ctx.strokeStyle = C.rim; ctx.stroke();
  }

  // 自機＝ふわり（10/25-6。A君はふわりに乗っている設定なので、乗り物の絵はない）
  // 絵は assets/fuwari_1〜3.png（資料/絵/ のふわりの絵から tools/fuwari_cut.js で切り出し、背景を透明にしたもの）
  const fuwariImgs = [1, 2, 3].map(n => Object.assign(new Image(), { src: `assets/fuwari_${n}.png` }));
  // ふわりの絵を (x, y) を中心に、幅 size で描く。frame: 1〜3
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
      const { fs, lh, lines } = fitOdaiText(odai.q, BATTLE.odaiBigFont, W - 72, BATTLE.odaiMaxLines);   // 画面の幅に3行以内（はみ出さない大きさ）
      ctx.font = font(14);
      const hl = odai.hint ? wrapText(odai.hint, W - 72) : [];   // 最初のお題だけ、案内を1行そえる
      const h = lines.length * lh + 50 + hl.length * 20 + (hl.length ? 10 : 0), y = H * 0.4 - h / 2;
      ctx.fillStyle = "rgba(255,253,245,0.97)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
      roundRect(20, y, W - 40, h, 18); ctx.fill(); ctx.stroke();
      ctx.font = font(14); ctx.fillStyle = "#b0801a";
      ctx.fillText(tx("rescue.odaiPanel"), 34, y + 12);
      ctx.font = font(fs); ctx.fillStyle = "#3e4a34";
      lines.forEach((l, i) => ctx.fillText(l, 32, y + 36 + i * lh));
      if (hl.length) {
        ctx.font = font(14); ctx.fillStyle = "#6f9a4a";
        hl.forEach((l, i) => ctx.fillText(l, 32, y + 36 + lines.length * lh + 10 + i * 20));
      }
    } else {
      const pnl = odaiPanel();
      ctx.fillStyle = "rgba(255,253,245,0.92)"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 2;
      const px = stripRight() + 6;
      roundRect(px, pnl.y, W - px - 10, pnl.h, 12); ctx.fill(); ctx.stroke();
      ctx.font = font(pnl.fs); ctx.fillStyle = "#3e4a34";
      pnl.lines.forEach((l, i) => ctx.fillText(l, px + 12, pnl.y + 7 + i * pnl.lh));
      // 中ボスは残り時間
      if (!odai.boss) {
        const r = Math.max(0, 1 - odai.t / BATTLE.odaiTimeLimit);
        ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, W - px - 18, 3);
        ctx.fillStyle = r > 0.3 ? "#e0b03a" : "#d0607f"; ctx.fillRect(px + 4, pnl.y + pnl.h - 4, (W - px - 18) * r, 3);
      }
    }
    ctx.restore();
  }

  // 出撃の画面（1945の面の始まりのように）
  function drawSortie() {
    ctx.save();
    ctx.fillStyle = sortieNo === 1 ? "rgba(236,244,226,0.93)" : "rgba(255,246,220,0.94)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (sortieNo === 2 && sortieStep === "say") drawChoiceSay();
    else if (sortieNo === 2 && sortieStep === "choice") drawChoice(); else drawCover();
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
      ctx.fillStyle = fl.found ? "#6f9a4a" : "#c98a1e";
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
      ctx.fillStyle = "#48693a"; if (!hintCard) ctx.fillText(tx("explore.moveHint"), W / 2, hy);
      ctx.globalAlpha = 1;
    }
    if (banner) drawBanner();
    if (hintCard) drawHintCard();
    if (state === "sortie") drawSortie();
    if (tut) drawTut();
    if (paused) drawSleep();
  }

  // ===== 世界2の発見の旅「箱」の画面（10/31-10 試作。箱とコンベアは仮の図形） =====
  function drawBox(b) {
    const ex = explore, x = b.x + (b.shake > 0 ? Math.sin(b.shake * 60) * 3 : 0), y = b.y, w = b.w, h = b.h;
    const face = exMove.open ? boxFace(b) : -1;
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
    if (ex.boxes) for (let i = 0; i < exMove.lanes.length; i++) {
      const y = laneY(i), bh = exMove.boxH + 18;
      ctx.fillStyle = "rgba(70,84,100,0.92)"; ctx.fillRect(0, y - bh / 2, W, bh);
      ctx.fillStyle = "rgba(150,165,180,0.9)"; ctx.fillRect(0, y - bh / 2, W, 4); ctx.fillRect(0, y + bh / 2 - 4, W, 4);
      ctx.strokeStyle = "rgba(40,50,62,0.6)"; ctx.lineWidth = 2;
      const off = ((ex.belt % 22) + 22) % 22;
      for (let x = -22 + off; x < W + 22; x += 22) { ctx.beginPath(); ctx.moveTo(x, y - bh / 2 + 6); ctx.lineTo(x, y + bh / 2 - 6); ctx.stroke(); }
    }
    if (ex.boxes) for (const b of ex.boxes) if (!b.out) drawBox(b);
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
      ctx.fillStyle = fl.found ? "#6f9a4a" : "#8a6a4a";
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
    ctx.fillStyle = hintCard.yellow ? "rgba(255,236,150,0.97)" : "rgba(255,253,245,0.96)"; ctx.strokeStyle = hintCard.yellow ? "#e0b03a" : "#9cbf7c"; ctx.lineWidth = 2.5;
    roundRect(px, py, pw, ph, 14); ctx.fill(); ctx.stroke();
    drawFuwariArt(1, px + 24, py + ph / 2, 34);   // セリフの横の小さなふわり（1のコマ）
    ctx.fillStyle = "#3f4a35";
    lines.forEach((l, i) => ctx.fillText(l, px + 46, py + 11 + 10.5 + i * 21));
    ctx.restore();
  }

  // 紙芝居（デバッグ。一時停止メニューの「案内を紙芝居で見る」）: 案内の文を1つずつ札にして見せる
  function drawTut() {
    const d = { title: "案内", lines: wrapTextFont(tut.text || "", 17, Math.min(W - 32, 360) - 40) };
    ctx.save();
    ctx.fillStyle = "rgba(25,35,30,0.55)"; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 32, 360), px = (W - pw) / 2;
    const picH = 0;
    const ph = 70 + d.lines.length * 26 + picH + 46, py = Math.max(60, H * 0.42 - ph / 2);
    ctx.fillStyle = "rgba(255,253,245,0.98)"; ctx.strokeStyle = "#9cbf7c"; ctx.lineWidth = 3;
    roundRect(px, py, pw, ph, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(22); ctx.fillStyle = "#48693a";
    ctx.fillText(d.title, W / 2, py + 32);
    ctx.font = font(17); ctx.fillStyle = "#3f4a35";
    d.lines.forEach((l, i) => ctx.fillText(l, W / 2, py + 70 + i * 26));
    const top = py + 70 + d.lines.length * 26;
    if (tut.t >= BATTLE.tutCloseAfter) {
      ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
      ctx.font = font(15); ctx.fillStyle = "#6f9a4a";
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

  // 旅の表紙（仮の見た目）: 大きく旅の名前と見出し、ふわりの一言。タップで 3・2・1・「○○の旅へ、出発！」
  function drawCover() {
    const trip = window.TEXTS.trips[sortieNo], green = sortieNo === 1;
    const main = green ? "#48693a" : "#b0801a", accent = green ? "#6f9a4a" : "#c98a1e", line = green ? "#9cbf7c" : "#e0b03a";
    ctx.fillStyle = green ? "rgba(225,238,212,0.6)" : "rgba(255,240,200,0.6)"; ctx.fillRect(0, 0, W, H);
    const cy = H * 0.34;
    if (sortieStep === "cover") {
      ctx.font = font(15); ctx.fillStyle = green ? "#7a8a68" : "#9a7a40";
      ctx.fillText(opts.stageName, W / 2, cy - 128);   // 見出しのふりがなと重ならないように（10/25-5）
      let fs = 50; ctx.font = font(fs);
      while (ctx.measureText(trip.name).width > W - 40 && fs > 30) { fs -= 2; ctx.font = font(fs); }
      drawHeading(trip.name, trip.kana, W / 2, cy - 56, fs, main);
      // チュートリアルのステージ（ステージ1）: 発見の旅の表紙の見出しのすぐ下に1行（毎回。10/25-10）。そのぶん下の文を下げる
      const tut = sortieNo === 1 && opts.stage && opts.stage.tutorial ? wrapTextFont(tx("tutorial.cover"), 15, W - 40) : [];
      if (tut.length) {
        ctx.font = font(15); ctx.fillStyle = "#6f9a4a";
        tut.forEach((l, i) => ctx.fillText(l, W / 2, cy - 14 + i * 18));
      }
      const dy = tut.length ? tut.length * 18 + 8 : 0;
      if (trip.sub) {   // 見出しの下の1行（毎回。長ければ2行）
        ctx.font = font(15); ctx.fillStyle = green ? "#4b5e3a" : "#7a6a40";
        wrapText(trip.sub, W - 48).forEach((l, i, a) => ctx.fillText(l, W / 2, cy + 2 + dy + (i - (a.length - 1) / 2) * 20));
      }
      // ふわり（仮の絵）と吹き出し（表紙の文）
      ctx.font = font(16);
      // {sec} ＝ そのステージの発見の旅の基準の時間（stages.js の値。10/25-21）
      const lines = trip.cover.replace("{sec}", Math.round(BATTLE.exploreTime)).split("\n").flatMap(t => wrapText(t, W - 110)),   // \n で改行（10/31-3）
            bw = W - 92, bh = lines.length * 22 + 20, bx = 70, by = cy + 40 + dy;
      drawFuwariArt(1, 40, by + bh / 2, 50);   // セリフの横の小さなふわり（1のコマ）
      ctx.fillStyle = "rgba(255,253,245,0.97)"; ctx.strokeStyle = line; ctx.lineWidth = 2;
      roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = green ? "#3f5a30" : "#6b4a10";
      lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 21 + i * 22));
      if (sortieNo === 1) drawHero("point", 8, H - H / 3 - 8, H / 3);   // 発見の旅の表紙: 主人公の「指さす」絵（左下）
      ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 250) * 0.4;
      ctx.font = font(22); ctx.fillStyle = accent;
      ctx.fillText(tx("tapToGo"), W / 2, by + bh + 70);
      ctx.globalAlpha = 1;
      return;
    }
    // カウント
    const n = countStepNo(), local = n < 3 ? (countT % BATTLE.countStep) / BATTLE.countStep : (countT - BATTLE.countStep * 3) / BATTLE.countGo;
    const txt = n < 3 ? String(3 - n) : window.TEXTS.trips[sortieNo].go;   // 「発見の旅へ、出発！」（2行）
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - local * 0.6);
    ctx.font = font(n < 3 ? 110 : 40);
    const sc = 1.4 - Math.min(1, local * 3) * 0.4;
    ctx.translate(W / 2, H * 0.42); ctx.scale(n < 3 ? sc : Math.min(sc, 1.15), n < 3 ? sc : Math.min(sc, 1.15));
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
    ctx.fillStyle = n < 3 ? main : "#e07a3a";
    txt.split("\n").forEach((l, i, a) => { const yy = (i - (a.length - 1) / 2) * 50; ctx.strokeText(l, 0, yy); ctx.fillText(l, 0, yy); });
    ctx.restore();
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
      ctx.fillStyle = "rgba(255,252,242,0.96)"; ctx.strokeStyle = "#dcae3c"; ctx.lineWidth = 3;
      roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(220,174,60,0.35)"; ctx.lineWidth = 1.5;
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
    drawSkillRow();
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
      ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3;
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
    drawSkillRow();
    // （ぜんぶ消しの説明の1行は、10/25-17 に消した）
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
    const tw = ctx.measureText(fsay.text).width, pad = fsay.small ? 7 : 10, bw = tw + pad * 2, bh = fsay.small ? 22 : 30;
    const bx = Math.min(Math.max(fx - bw / 2, 8), W - bw - 8), by = fy - 30 - bh;
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.strokeStyle = "#cfe0b6"; ctx.lineWidth = 2;
    roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - 6, by + bh); ctx.lineTo(fx, by + bh + 8); ctx.lineTo(fx + 6, by + bh); ctx.closePath();
    ctx.fillStyle = "rgba(255,253,245,0.96)"; ctx.fill();
    ctx.fillStyle = "#4b5e3a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(fsay.text, bx + pad, by + bh / 2 + 1);
    ctx.restore();
  }

  // 操作のヒント（「指で双眼鏡を動かそう」など）は点滅させず、出るときに0.6秒かけてふわっと現れる（10/25-12）
  let moveHintAt = null, moveHintFrame = -1, frameNo = 0;
  function hintFadeIn() {
    if (moveHintAt === null || frameNo - moveHintFrame > 2) moveHintAt = t;   // しばらく出ていなかったら、もう一度ふわっと（時間はゲームの時間）
    moveHintFrame = frameNo;
    return Math.min(1, (t - moveHintAt) / 0.6);
  }

  function drawHud() {
    const top = 14;
    if (phase === "round1") { drawExploreHud(); return; }   // 発見の旅は、見本 smple_tansaku の配置（11/1）
    {
    // 体力
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(12, top, 130, 16, 8); ctx.fill();
    const rate = player.hp / BATTLE.playerMaxHp;
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
    // 元気（残機）: ふわりの小さな絵（1のコマ）をならべる。失ったぶんはうすく（10/25-12。前は雲の絵）。発見の旅では減らないので出さない（10/25-17）
    if (phase !== "round1") for (let i = 0; i < BATTLE.lives; i++) {
      const lx = 160 + i * 26, ly = top + 8;
      ctx.save();
      ctx.globalAlpha = i < lives ? 1 : 0.25;
      drawFuwariArt(1, lx, ly, 26);
      ctx.restore();
    }
    // 点数（右）。上に出すのは体力ゲージ、残機、点数だけ
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.font = font(16); ctx.fillStyle = "#4b5e3a";
    ctx.strokeText(String(score), W - 14, top);   // （発見の旅の点数は drawExploreHud。11/1）
    ctx.fillText(String(score), W - 14, top);
    // パワーと持ちものは、左下のぜんぶ消しのボタンの横に小さく（1回目の旅は光を使わないので出さない）
    if (phase === "round1") { drawStrip(); return; }
    const b = bombButton();
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = font(11);
    const lvNo = POWER_LEVELS.indexOf(level) + 1;
    const lvText = `${tx("rescue.lightLabel")} ${"★".repeat(lvNo)}`;
    ctx.strokeText(lvText, b.x + b.r + 8, b.y - 8); ctx.fillText(lvText, b.x + b.r + 8, b.y - 8);
    if (loadout) {   // 持っていったもの（盾は使うと消える）
      const l = LOADOUTS.find(x => x.id === loadout);
      const txt = loadout === "shield" && !shield ? l.name + tx("rescue.itemUsed") : l.name;
      const it = `${tx("rescue.itemLabel")}: ${txt}`; ctx.strokeText(it, b.x + b.r + 8, b.y + 8); ctx.fillText(it, b.x + b.r + 8, b.y + 8);
    }
    drawStrip();
  }

  // 「ぜんぶ消し」のボタン: ふわりマークのまわりにゲージ。満タンで光る
  function drawBombButton() {
    const b = bombButton(), full = gauge >= 100, C = BOMB_COLORS;
    ctx.save();
    if (bombFlash > 0) {   // たまった瞬間: 大きく光る
      const k = bombFlash / 1.2;
      const g2 = ctx.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r * (1.8 + 1.4 * k));
      g2.addColorStop(0, `rgba(255,120,60,${0.9 * k})`); g2.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.8 + 1.4 * k), 0, Math.PI * 2); ctx.fill();
    }
    const pulse = full ? 0.5 + 0.5 * Math.sin(t * 6) : 0, r = b.r * (1 + pulse * 0.08);
    if (full) {   // たまったら: 赤橙に変わり、脈打って光る（10/25-9）
      const g = ctx.createRadialGradient(b.x, b.y, r * 0.6, b.x, b.y, r * 2);
      g.addColorStop(0, `rgba(255,110,50,${0.35 + pulse * 0.4})`); g.addColorStop(1, "rgba(255,110,50,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = full ? C.full : "rgba(255,253,245,0.85)";
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = full ? C.fullRim : "rgba(0,0,0,0.1)"; ctx.lineWidth = full ? 3 : 5;
    ctx.beginPath(); ctx.arc(b.x, b.y, r - 3, 0, Math.PI * 2); ctx.stroke();
    if (!full) {   // たまっていないとき: 今の薄い色のゲージ
      ctx.strokeStyle = "#8cbf5a"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * gauge / 100); ctx.stroke();
    }
    // ふわりマーク（小さなふわり。たまったら3のコマ）
    drawFuwariArt(full ? 3 : 1, b.x, b.y, b.r * 1.5);
    // 上の文字: たまったら「タップ」を大きく
    const label = full ? tx("rescue.typhoonTap") : skillName(skill);   // 選んだ必殺ワザの名前（世界1は「ぜんぶ消し」。10/31-10 試作）
    ctx.font = font(full ? 17 : 9); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const ly = b.y - r - (full ? 13 : 7);
    ctx.lineWidth = full ? 5 : 3; ctx.strokeStyle = "#ffffff"; ctx.strokeText(label, b.x, ly);
    ctx.fillStyle = full ? C.full : "#7a8a68"; ctx.fillText(label, b.x, ly);
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
    ctx.fillStyle = "rgba(255,253,245,0.94)"; ctx.strokeStyle = "#b9d39a"; ctx.lineWidth = 2;
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
    const y0 = 40, y1 = bombButton().y - bombButton().r - 22;   // 体力ゲージの下から、ぜんぶ消しのボタンの上まで
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
      // 地上に出る語句の枠: 小さく「地」の印（帯の右に出す）
      if (BATTLE.groundMark && groundIds.has(w.id)) {   // （10/31-10 試作: 出さない）
        ctx.font = font(9);
        ctx.fillStyle = "#9a7650";
        roundRect(x + cw + 2, y + sh / 2 - 7, 14, 14, 4); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tx("rescue.groundMark"), x + cw + 9, y + sh / 2);
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
    ctx.fillStyle = "rgba(255,253,245,0.95)";
    ctx.strokeStyle = "#cfe0b6";
    ctx.lineWidth = 3;
    roundRect(W / 2 - w / 2, cy - h / 2, w, h, 22);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (showKana) {
      ctx.font = font(20);
      ctx.fillStyle = "#6b7a5a";
      ctx.fillText(word.kana, W / 2, cy - size / 2 - 4);
    }
    ctx.font = font(size);
    ctx.fillStyle = ENEMY_COLOR[word.role];
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
    ctx.fillStyle = "#48693a";
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
      enemies = []; fillers = []; ebullets = []; bombs = []; items = []; odai = null;
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

  return { start, stop, resize, pause, resume, choiceRects, tutorialSlides, debug };   // （自動プレイヤーで確かめるときは、ここで中の状態を外に出している）
})();
