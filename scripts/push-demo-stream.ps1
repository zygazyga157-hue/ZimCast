<#
PowerShell helper to push a demo SRT stream to MediaMTX (local)
Usage examples:
  # push test pattern with default params
  ./scripts/push-demo-stream.ps1

  # push a local file in loop
  ./scripts/push-demo-stream.ps1 -Input "C:\path\to\sample.mp4" -StreamKey demo_match_01

  # push N simultaneous streams (spawn new PS windows or run background jobs)
  ./scripts/push-demo-stream.ps1 -StreamKey demo1
  ./scripts/push-demo-stream.ps1 -StreamKey demo2

Notes:
- Requires ffmpeg to be installed and on PATH.
- Default publishes to srt://127.0.0.1:9000 (MediaMTX default ingest port).
- The HLS output will be available at http://localhost:8888/<streamKey>/index.m3u8
#>
param(
    [string]$SrtHost = '127.0.0.1',
    [int]$Port = 9000,
    [string]$StreamKey = 'demo_match_01',
    [string]$Input = '', # path to file; if empty use test pattern
    [int]$VideoBitrate = 1500
)

function Test-FFmpeg {
    $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if (-not $ff) {
        Write-Error "ffmpeg not found in PATH. Install FFmpeg and add to PATH."
        exit 1
    }
}

Test-FFmpeg

if ($Input -and -not (Test-Path $Input)) {
    Write-Error "Input file not found: $Input"
    exit 1
}

$SrtUrl = "srt://$($SrtHost):$($Port)?streamid=$StreamKey"

if ($Input) {
    Write-Host "Publishing file $Input -> $SrtUrl"
    & ffmpeg -re -stream_loop -1 -i $Input -c:v libx264 -preset veryfast -b:v ${VideoBitrate}k -maxrate ${VideoBitrate}k -bufsize 2M -c:a aac -ar 48000 -ac 2 -f mpegts "$SrtUrl"
} else {
    Write-Host "Publishing test pattern -> $SrtUrl"
    & ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000 -c:v libx264 -preset veryfast -tune zerolatency -b:v ${VideoBitrate}k -c:a aac -b:a 128k -ar 48000 -ac 2 -f mpegts "$SrtUrl"
}

# End of script
