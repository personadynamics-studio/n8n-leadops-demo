$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install Docker Desktop with its WSL2 backend first: https://docs.docker.com/desktop/setup/install/windows-install/' }
docker info --format '{{.ServerVersion}}' 2>$null
if ($LASTEXITCODE -ne 0) {
  $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path -LiteralPath $desktop)) { throw 'Start your Docker Engine and rerun this script.' }
  Start-Process -FilePath $desktop -WindowStyle Hidden
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    docker info --format '{{.ServerVersion}}' 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { throw 'Docker Desktop has not become ready. Complete its WSL2 setup and retry.' }
}
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'The stack could not start. Check ports 3000/5678 and docker compose logs.' }
# Skip reimport on ordinary restarts, preserving any editor changes.
$existing = docker compose exec -T n8n n8n export:workflow --id=LeadOpsDemoV1 --output=/tmp/leadops-check.json 2>&1
if ($LASTEXITCODE -ne 0 -or $env:LEADOPS_REIMPORT -eq '1') {
  docker compose exec -T n8n n8n import:workflow --input=/demo/workflows/leadops.json
  if ($LASTEXITCODE -ne 0) { throw 'Workflow import failed.' }
}
docker compose exec -T n8n n8n publish:workflow --id=LeadOpsDemoV1
if ($LASTEXITCODE -ne 0) { throw 'Workflow publication failed.' }
docker compose restart n8n
if ($LASTEXITCODE -ne 0) { throw 'n8n restart failed.' }
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    $health = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 3
    if ($health.n8n) { Write-Output 'Ready: http://localhost:3000 | n8n: http://localhost:5678'; exit 0 }
  } catch { }
  Start-Sleep -Seconds 2
}
throw 'n8n did not become ready. Run docker compose logs n8n.'
