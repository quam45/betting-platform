# setup-phase1.ps1 - ONE COMMAND SETUP FOR PHASE 1
# Run as: powershell -ExecutionPolicy Bypass -File setup-phase1.ps1

Write-Host "=== BETTING PLATFORM - PHASE 1 SETUP ===" -ForegroundColor Green

# 1. Check .NET 8
Write-Host "`n[1/5] Checking .NET 8..." -ForegroundColor Yellow
try {
    $dotnet = dotnet --version
    Write-Host "Found .NET $dotnet" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Install .NET 8 SDK from https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit
}

# 2. Check Docker
Write-Host "`n[2/5] Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "Docker found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Install Docker Desktop" -ForegroundColor Red
    exit
}

# 3. Start SQL Server
Write-Host "`n[3/5] Starting SQL Server..." -ForegroundColor Yellow
docker-compose up -d sqlserver
Write-Host "Waiting 20 seconds for SQL to start..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# 4. Create Database and Run Scripts
Write-Host "`n[4/5] Creating Database..." -ForegroundColor Yellow
$saPassword = "YourStrong!Passw0rd123"
$scripts = @(
    "database/migrations/001_Initial_Schema.sql",
    "database/stored-procedures/usp_Bet_Place.sql",
    "database/stored-procedures/usp_Settlement_SettleBet.sql",
    "database/seed/001_Seed_Demo_Data.sql"
)

# Use sqlcmd inside container
docker exec betting_sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $saPassword -Q "IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = 'BettingPlatformDb') CREATE DATABASE BettingPlatformDb"
Write-Host "Database BettingPlatformDb created" -ForegroundColor Green

foreach ($script in $scripts) {
    Write-Host "Running $script..." -ForegroundColor Gray
    $content = Get-Content $script -Raw
    # Write temp file and execute via container
    $tempFile = "/tmp/$(Split-Path $script -Leaf)"
    docker cp $script betting_sqlserver`:$tempFile
    docker exec betting_sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $saPassword -d BettingPlatformDb -i $tempFile
}

Write-Host "All SQL scripts executed!" -ForegroundColor Green

# 5. Build API
Write-Host "`n[5/5] Building API..." -ForegroundColor Yellow
Push-Location src/Betting.Api
dotnet restore
dotnet build
Pop-Location

Write-Host "`n=== PHASE 1 DONE ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run API: .\run-api.ps1"
Write-Host "2. In new PowerShell: .\run-web.ps1"
Write-Host "3. Open http://localhost:5000/swagger"
Write-Host "4. Open http://localhost:5173"