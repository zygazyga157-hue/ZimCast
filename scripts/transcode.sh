#!/bin/bash
# FFmpeg Adaptive Bitrate Transcoding Script for ZimCast
# Usage: ./transcode.sh <input_srt_url> <output_path>
#
# Example:
#   ./transcode.sh "srt://zbc-stream.zw:9000?streamid=ztv_main" /output/ztv

INPUT_URL="${1}"
OUTPUT_PATH="${2}"

if [ -z "$INPUT_URL" ] || [ -z "$OUTPUT_PATH" ]; then
  echo "Usage: $0 <input_srt_url> <output_path>"
  exit 1
fi

mkdir -p "$OUTPUT_PATH"

ffmpeg -i "$INPUT_URL" \
  -filter_complex "[0:v]split=4[v1080][v720][v480][v360];\
    [v1080]scale=1920:1080[out1080];\
    [v720]scale=1280:720[out720];\
    [v480]scale=854:480[out480];\
    [v360]scale=640:360[out360]" \
  -map "[out1080]" -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5500k -bufsize:v:0 10000k -preset fast -g 50 -sc_threshold 0 \
  -map "[out720]"  -c:v:1 libx264 -b:v:1 3000k -maxrate:v:1 3300k -bufsize:v:1 6000k  -preset fast -g 50 -sc_threshold 0 \
  -map "[out480]"  -c:v:2 libx264 -b:v:2 1500k -maxrate:v:2 1650k -bufsize:v:2 3000k  -preset fast -g 50 -sc_threshold 0 \
  -map "[out360]"  -c:v:3 libx264 -b:v:3 700k  -maxrate:v:3 770k  -bufsize:v:3 1400k  -preset fast -g 50 -sc_threshold 0 \
  -map 0:a -c:a aac -b:a 128k -ac 2 \
  -map 0:a -c:a aac -b:a 128k -ac 2 \
  -map 0:a -c:a aac -b:a 96k  -ac 2 \
  -map 0:a -c:a aac -b:a 64k  -ac 2 \
  -f hls \
  -hls_time 2 \
  -hls_list_size 3 \
  -hls_flags delete_segments+independent_segments \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p" \
  "$OUTPUT_PATH/%v/index.m3u8"
