#!/usr/bin/env bash
# 由母版压出适合放进 git 的版本（单文件 < 100MB）：1080p60 约 95MB、720p60 约 50MB
set -euo pipefail
cd "$(dirname "$0")/.."
IN=${1:-out/final.mp4}
NAME=insurance-101
mkdir -p work
VF_DN="hqdn3d=2:1.5:4:3"
X264="aq-mode=3:aq-strength=0.9:deblock=-1,-1"
enc() { # 分辨率 视频码率 输出
  local scale=$1 br=$2 out=$3 vf="$VF_DN"
  [ "$scale" != "1080" ] && vf="$vf,scale=-2:$scale:flags=lanczos"
  ffmpeg -y -loglevel error -i "$IN" -vf "$vf" -c:v libx264 -preset slow -tune film -x264-params "$X264" -b:v "$br" -pass 1 -passlogfile "work/pass_$scale" -an -f null /dev/null
  ffmpeg -y -loglevel error -i "$IN" -vf "$vf" -c:v libx264 -preset slow -tune film -x264-params "$X264" -b:v "$br" -maxrate "$((${br%k} * 2))k" -bufsize "$((${br%k} * 4))k" \
    -pass 2 -passlogfile "work/pass_$scale" -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$out"
}
enc 1080 1880k "${NAME}_1080p60.mp4"
enc 720 1000k "${NAME}_720p60.mp4"
ls -la "${NAME}"_*.mp4
