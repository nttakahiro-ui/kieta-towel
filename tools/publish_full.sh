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
a = '        <button id="btn-tune" class="link-btn hidden">調整パネル</button>\n'
assert s.count(a) == 1
s = s.replace(a, a + '        <p class="title-note title-ver" style="font-size:11px;opacity:0.7;margin-top:6px">' + os.environ["LABEL"] + '</p>\n')
open(p, "w", encoding="utf-8").write(s)
PY
git -C "$M" add -A versions/full
git -C "$M" commit -qm "11/5 の説明用の完全版（versions/full。$LABEL）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C "$M" tag "$TAG"
git -C "$M" push -q origin HEAD "$TAG"
git -C "$M" log --oneline -1
test "$W23" = "$(git -C "$M" rev-parse HEAD:versions/world23)" && echo "試作 versions/world23: 変わっていない"
test -z "$(git -C "$M" diff --stat v20261101h HEAD -- index.html js css data assets)" && echo "親の公開版: 変わっていない"
echo "タグ v20261101h: $(git -C "$M" rev-parse --short 'v20261101h^{commit}')  $TAG: $(git -C "$M" rev-parse --short "$TAG^{commit}")"
