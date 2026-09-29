#!/usr/bin/env bash
# 母带（轻压缩 → 限幅 → 两遍 loudnorm 线性模式，-16 LUFS / TP -1.5）并与画面封装为 out/final.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
PRE="acompressor=threshold=-20dB:ratio=2.2:attack=8:release=160:knee=4,alimiter=limit=0.34:attack=3:release=60:level=false"
M=$(ffmpeg -hide_banner -i out/mix.wav -af "${PRE},loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
read -r i tp lra th off <<< "$(echo "$M" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")"
ffmpeg -y -loglevel error -i out/mix.wav -af "${PRE},loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${i}:measured_TP=${tp}:measured_LRA=${lra}:measured_thresh=${th}:offset=${off}:linear=true,aresample=48000" -c:a pcm_s16le out/master.wav
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video.mp4)
ffmpeg -y -loglevel error -i out/video.mp4 -i out/master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -t "${VD}" -movflags +faststart -metadata title="保险，到底在保什么" out/final.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/final.mp4
