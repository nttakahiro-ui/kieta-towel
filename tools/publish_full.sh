#!/bin/bash
# 11/5 の説明用の「完全版」の公開（11/3-8）: ブランチ world23 の commit ずみの中身を、main の versions/full/ にコピーして commit・push し、タグを付ける
# 使い方: MAINWT=<main を取り出した作業場所> tools/publish_full.sh <タグ（例 v20261103full）> <タイトルのいちばん下に出す文字（例 "完全版 11/3"）>
# versions/world23/（試作）・親の公開版（index.html・js・css・data・assets）・タグ v20261101h は変えない。終わりに確かめる
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; M="${MAINWT:?MAINWT を指定}"; TAG="${1:?タグを指定}"; LABEL="${2:?文字を指定}"
git -C "$R" push -q origin world23
git -C "$M" pull -q --ff-only
W23="$(git -C "$M" rev-parse HEAD:versions/world23)"
rm -rf "$M/versions/full"; mkdir -p "$M/versions/full"
git -C "$R" archive world23 index.html css data js assets "docs/世界2・3の構想メモ.md" "docs/世界2・3の試作メモ.md" "docs/進捗メモ.md" | tar -x -C "$M/versions/full"
# タイトルのいちばん下の小さな行（このコピーだけ）
LABEL="$LABEL" python3 - "$M/versions/full/index.html" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a = '          <button id="btn-opening" class="link-btn"></button>\n'   # 「音・主人公・記録を消す・オープニング」の2行の下に、3行目として
assert s.count(a) == 1
s = s.replace(a, a + '          <span class="title-ver" style="grid-column: 1 / -1; font-size: 9px; color: rgba(70,80,60,0.6); text-shadow: 0 0 3px rgba(255,251,232,0.9)">' + os.environ["LABEL"] + '</span>\n')
open(p, "w", encoding="utf-8").write(s)
PY
git -C "$M" add -A versions/full
git -C "$M" commit -qm "11/5 の説明用の完全版（versions/full。$LABEL）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C "$M" tag -f "$TAG"   # 同じ日に出し直すときは、このタグを新しい commit へ（v20261101h などほかのタグは動かさない）
git -C "$M" push -q origin HEAD
git -C "$M" push -qf origin "refs/tags/$TAG"
git -C "$M" log --oneline -1
test "$W23" = "$(git -C "$M" rev-parse HEAD:versions/world23)" && echo "試作 versions/world23: 変わっていない"
test -z "$(git -C "$M" diff --stat v20261101h HEAD -- index.html js css data assets)" && echo "親の公開版: 変わっていない"
echo "タグ v20261101h: $(git -C "$M" rev-parse --short 'v20261101h^{commit}')  $TAG: $(git -C "$M" rev-parse --short "$TAG^{commit}")"
