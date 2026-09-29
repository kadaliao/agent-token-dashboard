#!/usr/bin/env bash
# 下载思源宋体 / 思源黑体（Noto Serif/Sans CJK SC，SIL OFL）到 fonts/
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p fonts
base=https://github.com/notofonts/noto-cjk/raw/main
for w in Regular SemiBold Bold Black; do f=fonts/NotoSerifSC-$w.otf; [ -s "$f" ] || curl -fsSL -o "$f" "$base/Serif/SubsetOTF/SC/NotoSerifSC-$w.otf"; done
for w in Light Regular Medium Bold; do f=fonts/NotoSansSC-$w.otf; [ -s "$f" ] || curl -fsSL -o "$f" "$base/Sans/SubsetOTF/SC/NotoSansSC-$w.otf"; done
ls -la fonts
