param(
  # Use the NON-POOLED Vercel Postgres URL (e.g. POSTGRES_URL_NON_POOLING).
  [Parameter(Mandatory = $false)]
  [string]$DatabaseUrl,

  # Admin password used by `prisma/seed.ts` (required for production seeding).
  [Parameter(Mandatory = $false)]
  [string]$AdminPassword,

  [Parameter(Mandatory = $false)]
  [string]$AdminEmail = "admin@zimcast.tv",

  [Parameter(Mandatory = $false)]
  [string]$DemoEmail = "demo@zimcast.tv",

  [Parameter(Mandatory = $false)]
  [string]$DemoPassword = "demo12345",

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-SecretPlainText([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $DatabaseUrl) {
  $DatabaseUrl = Read-Host "Paste your Vercel Postgres NON-POOLED DATABASE_URL (POSTGRES_URL_NON_POOLING)"
}
if (-not $AdminPassword) {
  $AdminPassword = Read-SecretPlainText "Enter the admin password to seed (input hidden)"
}

Write-Host "[seed-vercel] RepoRoot: $RepoRoot"
Write-Host "[seed-vercel] Running Prisma schema push + seed (no secrets will be printed)..."

Push-Location $RepoRoot
try {
  # Ensure production-safe behavior in the seed script.
  $env:NODE_ENV = "production"

  # Prisma CLI should use a direct (non-pooled) connection for reliability.
  $env:DATABASE_URL = $DatabaseUrl
  $env:DIRECT_URL = $DatabaseUrl

  # Seed controls consumed by prisma/seed.ts
  $env:SEED_ADMIN_EMAIL = $AdminEmail
  $env:SEED_ADMIN_PASSWORD = $AdminPassword

  $env:SEED_DEMO_USER = "true"
  $env:SEED_DEMO_EMAIL = $DemoEmail
  $env:SEED_DEMO_PASSWORD = $DemoPassword

  $env:SEED_SAMPLE_TEMPLATES = "true"
  $env:SEED_SAMPLE_PROGRAMS = "true"
  $env:SEED_SAMPLE_MATCHES = "true"
  $env:SEED_SAMPLE_VIEWING = "true"

  npx prisma db push
  if ($LASTEXITCODE -ne 0) { throw "prisma db push failed with exit code $LASTEXITCODE" }

  npx prisma db seed
  if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed with exit code $LASTEXITCODE" }

  Write-Host "[seed-vercel] Done."
} finally {
  Pop-Location
}

