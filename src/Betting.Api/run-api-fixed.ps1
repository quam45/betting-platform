# run-api.ps1 - FIXED
Write-Host "Starting Betting API..." -ForegroundColor Green

$dockerSql = "Server=localhost,1433;Database=BettingPlatformDb;User Id=sa;Password=YourStrong!Passw0rd123;TrustServerCertificate=True"

$env:ConnectionStrings__BettingDb = $dockerSql
$env:Jwt__SigningKey = "super-secret-key-for-dev-only-min-32-chars-long!"
$env:Jwt__Issuer = "BettingPlatform"
$env:Jwt__Audience = "BettingPlatformClient"
$env:Frontend__AllowedOrigin = "http://localhost:5173"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Using: $env:ConnectionStrings__BettingDb" -ForegroundColor Gray
Write-Host "JWT Key: $env:Jwt__SigningKey" -ForegroundColor Gray

Set-Location src/Betting.Api
dotnet run
