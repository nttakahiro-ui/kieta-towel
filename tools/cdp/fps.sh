#!/bin/bash
# ステージを救出の旅から最後まで遊び、fps の最低値を出す（CPU を4倍遅く）。引数は "一覧の1行目の番号 何番目" をいくつでも（例: "5 3" ＝ ステージ8、"9 3" ＝ ステージ12）
# 前の5行目で WORLDS を書きかえたいときは EXPR に式を入れる（例: EXPR='window.WORLDS[1].music = window.WORLDS[0].music;'）
cd "$(dirname "$0")"
for p in "$@"; do set -- $p
  node run.mjs RELOAD >/dev/null
  echo "$1 $2 $(CPU=4 node run.mjs "$(cat pre.js) ${EXPR:-} const FIRST='$1', ROW=$2; $(cat play.js)")"
done
