# 画面ありの測定・撮影の道具（headless Chrome を CDP で動かす。11/3-6 に tools/ へ）

画面なしの自動プレイヤーは `tools/autoplay.js`。こちらは本物のブラウザで fps・曲の大きさ・撮影を見るための道具。

- Chrome は必ず消音（`--mute-audio`）で起動する（chrome.sh）。曲は耳でなく数値（平均の大きさ・同時に鳴った音の数・鳴らせなかった音の数）で見る
- 遊ぶページは、作業中のファイルをコピーした「試しのサイト」（site.sh が作る。Battle.peek などの調べる口を足す）

## 使い方
```
SITE=/tmp/kieta-site tools/cdp/site.sh          # 作業中のファイルから試しのサイトを作る（もう一度呼ぶと上書き）
python3 -m http.server 8765 --bind 127.0.0.1 -d /tmp/kieta-site   # 試しのサイトを出す（別の窓で）
tools/cdp/chrome.sh                                # 消音の headless Chrome（9333 番で操作を受ける）
node tools/cdp/songvol.mjs                         # 全曲の大きさと、同時に鳴った音の数
tools/cdp/fps.sh "5 3" "9 3"                       # ステージの fps の最低値（"一覧の1行目の番号 何番目"。5 3 ＝ ステージ8）
tools/cdp/shot.sh 9 1 out.jpg "S=>S.rescueT>10"     # 条件になった瞬間を撮影
```
- run.mjs: ページで式を動かす（`node run.mjs '<式>' [撮影先.jpg]`、`node run.mjs RELOAD`）。CPU=4 で4倍遅く
- pre.js: タップなどの小さな関数と、ページの読み込み待ち。play.js: 救出の旅から最後まで自動で遊んで fps を返す
- aud_pre.js・aud_play.js: 遊びながら、曲ごとの大きさと同時に鳴った音の数を測る
