#!/bin/bash
# 測定用の headless Chrome を消音で起動する（--mute-audio。音はスピーカーに出さない）。PORT ＝ 試しのサイトの番号
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
exec "$CHROME" --headless=new --mute-audio --remote-debugging-port=9333 --autoplay-policy=no-user-gesture-required \
  --user-data-dir="${PROFILE:-${TMPDIR:-/tmp}/kieta-cdp-profile}" --no-first-run --window-size=375,667 "http://127.0.0.1:${PORT:-8765}/?debug"
