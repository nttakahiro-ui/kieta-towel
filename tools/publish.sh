#!/bin/bash
# 試作の公開（11/3-6 に tools/ へ）: ブランチ world23 の commit ずみの中身を、main の versions/world23/ にそのままコピーして commit・push する
# 使い方: MAINWT=<main を取り出した作業場所（git worktree add で作る）> tools/publish.sh <何回目>
# 親の公開版（index.html・js・css・data・assets）とタグ v20261101h は変えない。終わりに、その2つが変わっていないことを確かめる
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; M="${MAINWT:?MAINWT を指定}"; N="${1:?何回目かを指定}"
git -C "$R" push -q origin world23   # ブランチも push（CLAUDE.md の運用ルール）
git -C "$M" pull -q --ff-only
rm -rf "$M/versions/world23"; mkdir -p "$M/versions/world23"
git -C "$R" archive world23 index.html css data js assets "docs/世界2・3の構想メモ.md" "docs/世界2・3の試作メモ.md" "docs/進捗メモ.md" | tar -x -C "$M/versions/world23"
git -C "$M" add -A versions/world23
git -C "$M" commit -qm "世界2・3の試作のコピー（${N}回目）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C "$M" push -q
git -C "$M" log --oneline -1
test -z "$(git -C "$M" diff --stat v20261101h HEAD -- index.html js css data assets)" && echo "親の公開版: 変わっていない"
echo "タグ v20261101h: $(git -C "$M" rev-parse --short 'v20261101h^{commit}')"
