# run-api.ps1
Write-Host "Starting Betting API..." -ForegroundColor Green
# Connection string comes from src\Betting.Api\appsettings.json (localhost\SQLEXPRESS)
Remove-Item Env:ConnectionStrings__BettingDb -ErrorAction SilentlyContinue
$env:Frontend__AllowedOrigin = "http://localhost:5173"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"
Set-Location "$PSScriptRoot\src\Betting.Api"
dotnet run