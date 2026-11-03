#!/bin/bash
# 作業中のファイルから「試しのサイト」を作る。Battle.peek（調べる口）と setLives を足す。SITE ＝ 作る場所
set -e
R="$(cd "$(dirname "$0")/../.." && pwd)"; SITE="${SITE:?SITE を指定}"
mkdir -p "$SITE"
rsync -a --delete --exclude .git --exclude docs --exclude tools --exclude versions "$R/" "$SITE/"
sed -i '' 's/return { start, stop, resize, pause, resume,/return { start, stop, resize, pause, resume, setLives: n => { lives = n; }, peek: () => ({ player, enemies, explore, odai, phase, state, paused, tut, obs, fillers, ebullets, bombs, level, againFx, powerFx, rescueT, lives }),/' "$SITE/js/game.js"
grep -q "peek: () => ({ player" "$SITE/js/game.js" && echo "site: $SITE"
