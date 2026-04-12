# Validate HLS playlists from scripts/hls-list.txt
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/validate-hls.ps1

$ListPath = Join-Path $PSScriptRoot 'hls-list.txt'
if (-not (Test-Path $ListPath)) {
    Write-Error "HLS list not found: $ListPath"
    exit 2
}

$urls = Get-Content $ListPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }

foreach ($url in $urls) {
    Write-Host "\n=== Checking: $url ===" -ForegroundColor Cyan
    try {
        # Try GET (some servers reject HEAD)
        $resp = Invoke-WebRequest -Uri $url -Method GET -Headers @{ 'User-Agent' = 'ZimCastHLSValidator/1.0' } -TimeoutSec 12 -MaximumRedirection 5 -ErrorAction Stop
        $code = $resp.StatusCode
        $ct = $resp.Headers['Content-Type'] -join ', '
        $snippet = $null
        if ($resp.Content -is [byte[]]) {
            try {
                $snippet = [System.Text.Encoding]::UTF8.GetString($resp.Content)
            } catch {
                # Fallback: base64 so we still have something to inspect
                $snippet = [System.Convert]::ToBase64String($resp.Content)
            }
        } else {
            $snippet = $resp.Content
        }
        if ($snippet -and $snippet.Length -gt 2000) { $snippet = $snippet.Substring(0,2000) }
        $hasExtM3U = $false
        if ($snippet) { $hasExtM3U = ($snippet -match '#EXTM3U') }
        Write-Host "Status: $code; Content-Type: $ct; Contains #EXTM3U: $hasExtM3U"
    } catch {
        $err = $_.Exception.Message
        Write-Host "Error fetching: $err" -ForegroundColor Yellow
        # Try fallback to curl.exe if available
        try {
            $curl = (Get-Command curl.exe -ErrorAction SilentlyContinue)
            if ($curl) {
                Write-Host "Trying curl.exe fallback..."
                $out = & curl.exe -m 12 -L -sS "$url" 2>&1
                if ($LASTEXITCODE -eq 0 -and $out) {
                    $has = $out -match '#EXTM3U'
                    Write-Host "curl: fetched content; Contains #EXTM3U: $has"
                } else {
                    Write-Host "curl failed (exit $LASTEXITCODE)" -ForegroundColor Yellow
                }
            }
        } catch {
            # ignore
        }
    }
}

Write-Host "\nValidation complete. Review results above." -ForegroundColor Green
