Write-Host "==> Starting Postgres via Docker (docker compose up -d)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose up failed - is Docker Desktop running?" -ForegroundColor Red; exit 1 }

Write-Host "==> Waiting for the database to become healthy..." -ForegroundColor Cyan
$attempts = 0
$healthy = $false
while ($attempts -lt 30 -and -not $healthy) {
    Start-Sleep -Seconds 1
    $status = docker inspect --format='{{.State.Health.Status}}' armarmhire-db-1 2>$null
    if ($status -eq "healthy") { $healthy = $true }
    $attempts++
}
if (-not $healthy) {
    Write-Host "Database did not become healthy in time - check 'docker compose logs db'." -ForegroundColor Red
    exit 1
}
Write-Host "Database is healthy." -ForegroundColor Green

Write-Host "==> Installing dependencies (npm install)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed - stopping." -ForegroundColor Red; exit 1 }

Write-Host "==> Syncing database schema (npx prisma db push)..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) { Write-Host "prisma db push failed - stopping." -ForegroundColor Red; exit 1 }

Write-Host "==> Seeding database (npm run prisma:seed)..." -ForegroundColor Cyan
npm run prisma:seed
if ($LASTEXITCODE -ne 0) { Write-Host "prisma:seed failed - stopping." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Setup complete. Run 'npm run dev' to start the app." -ForegroundColor Green
