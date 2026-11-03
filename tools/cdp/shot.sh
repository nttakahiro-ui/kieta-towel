#!/bin/bash
# 撮影: shot.sh 一覧の1行目の番号 何番目 撮影先.jpg "条件の式（S => ...）"
cd "$(dirname "$0")"
node run.mjs RELOAD >/dev/null
node run.mjs "$(cat pre.js) const FIRST='$1', ROW=$2; $(cat nav.js) const COND=$4; $(cat until.js)" "$3"
