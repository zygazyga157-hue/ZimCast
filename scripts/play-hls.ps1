<#
Play an HLS URL from `scripts/hls-vetted.txt`.
Usage examples:
  - List candidates: pwsh scripts/play-hls.ps1 -List
  - Print ffplay command for index 2: pwsh scripts/play-hls.ps1 -Index 2 -PrintOnly
  - Attempt to launch ffplay for index 1: pwsh scripts/play-hls.ps1 -Index 1 -Play
#>
param(
    [switch]$List,
    [int]$Index = 0,
    [switch]$Play,
    [switch]$PrintOnly
)

$path = Join-Path $PSScriptRoot 'hls-vetted.txt'
if (-not (Test-Path $path)) { Write-Error "Vetted list not found: $path"; exit 2 }
$urls = Get-Content $path | Where-Object { $_ -and -not $_.TrimStart().StartsWith('#') } | ForEach-Object { $_.Trim() }
if ($List) {
    Write-Host "Vetted HLS streams:" -ForegroundColor Cyan
    for ($i=0; $i -lt $urls.Count; $i++) { Write-Host "[$($i+1)] $($urls[$i])" }
    exit 0
}

if ($Index -le 0 -or $Index -gt $urls.Count) {
    Write-Host "Please pass -Index N where N is 1..$($urls.Count), or use -List to see candidates." -ForegroundColor Yellow
    exit 1
}

$url = $urls[$Index-1]
$ffplayCmd = "ffplay -loglevel warning -hide_banner -fflags nobuffer -probesize 32 -i `"$url`""
if ($PrintOnly) { Write-Host $ffplayCmd; exit 0 }

# If Play requested, attempt to find ffplay.exe and run it
$ffplay = Get-Command ffplay.exe -ErrorAction SilentlyContinue
if (-not $ffplay) {
    Write-Host "ffplay not found in PATH. Print-only mode:" -ForegroundColor Yellow
    Write-Host $ffplayCmd
    exit 3
}

Write-Host "Launching ffplay for: $url" -ForegroundColor Green
Start-Process -FilePath $ffplay.Source -ArgumentList "-loglevel","warning","-hide_banner","-fflags","nobuffer","-probesize","32","-i","$url" -NoNewWindow -Wait
