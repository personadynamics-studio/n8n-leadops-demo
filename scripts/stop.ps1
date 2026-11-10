$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
docker compose stop
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the demo stack.' }
Write-Output 'Demo stopped. All workflow history and mock CRM records are preserved.'
