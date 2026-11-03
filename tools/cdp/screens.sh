#!/bin/bash
# 1つの世界の画面を順に撮る（11/3-8。iPhone の幅 375）: ステージ一覧・カード図鑑・発見の旅・持ち物選択・救出の旅・お題・クイズ・結果・宝石
# 使い方: screens.sh <一覧の1行目の番号 1/5/9> <撮影先のフォルダ> <名前の頭（例 w2）>   … 試しのサイトは ?debug で開いておく。その世界のステージが開いていること
cd "$(dirname "$0")"; F=$1; O=$2; T=$3
R() { node run.mjs "$(cat pre.js) $(cat screens.js) $1" ${2:+$O/$2.jpg}; }
node run.mjs RELOAD >/dev/null
R "document.getElementById('btn-start').click(); await sl(1000); await goWorld('$F'); return A()" "${T}_01_ステージ一覧"
R "document.getElementById('btn-zukan').click(); await sl(1500); return A()" "${T}_02_カード図鑑"
R "document.getElementById('btn-zukan-back').click(); await sl(1000); document.querySelectorAll('.stage-row')[0].click(); await sl(1500); await adv(8000); return A()" "${T}_03_発見の旅"
R "Battle.debug.skipRecon(); await sl(2500); for(let i=0;i<4;i++){ await tap(187,300); await sl(900); } return Battle.peek().state" "${T}_04_持ち物選択"
R "await tap(187,380); await sl(600); await tap(187,400); await sl(2800); ev('pointerdown',187,560); BATTLE.debugInvincible=true; const COND=S=>S.rescueT>14; $(cat until.js)" "${T}_05_救出の旅"
R "BATTLE.debugInvincible=true; const COND=S=>S.odai && !(S.odai.intro>0) && S.odai.t>3; $(cat until.js)" "${T}_06_お題"
R "Battle.debug.clearAll(); for(let i=0;i<40 && A()!=='screen-quiz';i++){ await sl(600); if (A()==='screen-quizintro') document.getElementById('screen-quizintro').click(); } await sl(1500); return A()" "${T}_07_クイズ"
R "await solve(); return A()" "${T}_08_結果"
R "document.getElementById('cards-retake').click(); await sl(3500); return A()" "${T}_09_宝石"
