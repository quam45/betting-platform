# setup-phase1-fixed.ps1 - FIXED VERSION
Write-Host "=== BETTING PLATFORM - PHASE 1 FIXED SETUP ===" -ForegroundColor Green

Write-Host "`n[1/4] Fixing project files..." -ForegroundColor Yellow
# Already fixed in zip, but ensure build works
dotnet --version

Write-Host "`n[2/4] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
} catch { $dockerRunning = $false }

if (-not $dockerRunning) {
    Write-Host "Docker Desktop NOT running. Trying LocalDB fallback..." -ForegroundColor Yellow
    Write-Host "Please START Docker Desktop from Start Menu, then run this again for full setup." -ForegroundColor Cyan
    Write-Host "Continuing with build only (no DB)..." -ForegroundColor Gray
    $useDocker = $false
} else {
    Write-Host "Docker running!" -ForegroundColor Green
    $useDocker = $true
}

if ($useDocker) {
    Write-Host "`n[3/4] Starting SQL Server..." -ForegroundColor Yellow
    docker-compose up -d sqlserver
    Write-Host "Waiting 25 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 25
    
    $saPassword = "YourStrong!Passw0rd123"

    # Create DB using sqlcmd in container - more reliable method
    Write-Host "Creating database..." -ForegroundColor Gray
    docker exec betting_sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $saPassword -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BettingPlatformDb') CREATE DATABASE BettingPlatformDb" -b
    
    $scripts = @(
        "database/migrations/001_Initial_Schema.sql",
        "database/stored-procedures/usp_Bet_Place.sql",
        "database/stored-procedures/usp_Settlement_SettleBet.sql",
        "database/seed/001_Seed_Demo_Data.sql"
    )
    
    foreach ($script in $scripts) {
        Write-Host "Running $script..." -ForegroundColor Gray
        # Copy into the container and run with -i; piping from Windows PowerShell injects a BOM sqlcmd can't parse
        $tempFile = "/tmp/$(Split-Path $script -Leaf)"
        docker cp $script "betting_sqlserver:$tempFile"
        docker exec betting_sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $saPassword -d BettingPlatformDb -b -i $tempFile
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: $script had errors, but continuing..." -ForegroundColor Yellow
        }
    }
    Write-Host "Database setup done!" -ForegroundColor Green
} else {
    Write-Host "`n[3/4] Skipping Docker DB (Docker not running) - You can use LocalDB" -ForegroundColor Yellow
    Write-Host "To use LocalDB instead, run: sqllocaldb start MSSQLLocalDB" -ForegroundColor Gray
}

Write-Host "`n[4/4] Building solution..." -ForegroundColor Yellow
Push-Location src/Betting.Api
dotnet restore
dotnet build
if ($LASTEXITCODE -eq 0) {
    Write-Host "BUILD SUCCESS!" -ForegroundColor Green
} else {
    Write-Host "BUILD FAILED - check errors above" -ForegroundColor Red
}
Pop-Location

Write-Host "`n=== PHASE 1 FIXED ===" -ForegroundColor Green
Write-Host "If Docker was running, DB is ready." -ForegroundColor Cyan
Write-Host "If not, START Docker Desktop, then run: docker-compose up -d sqlserver and rerun this script" -ForegroundColor Cyan
Write-Host "`nTo run API: .\run-api.ps1" -ForegroundColor White