# run-api.ps1 - FIXED
Write-Host "Starting Betting API..." -ForegroundColor Green

# Try Docker SQL first, fallback to LocalDB
$dockerSql = "Server=localhost,1433;Database=BettingPlatformDb;User Id=sa;Password=YourStrong!Passw0rd123;TrustServerCertificate=True"
$localDb = "Server=(localdb)\MSSQLLocalDB;Database=BettingPlatformDb;Trusted_Connection=True;TrustServerCertificate=True"

$env:ConnectionStrings__BettingDb = $dockerSql
$env:Frontend__AllowedOrigin = "http://localhost:5173"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Using: $env:ConnectionStrings__BettingDb" -ForegroundColor Gray

Set-Location src/Betting.Api
dotnet run