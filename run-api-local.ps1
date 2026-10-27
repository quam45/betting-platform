Write-Host "Starting Betting API on SQLEXPRESS..." -ForegroundColor Green
$env:ConnectionStrings__BettingDb = "Server=localhost\SQLEXPRESS;Database=BettingPlatformDb;Trusted_Connection=True;TrustServerCertificate=True"
$env:Jwt__SigningKey = "super-secret-key-for-dev-only-min-32-chars-long!"
$env:Jwt__Issuer = "BettingPlatform"
$env:Jwt__Audience = "BettingPlatformClient"
$env:Frontend__AllowedOrigin = "http://localhost:5173"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"
Set-Location src/Betting.Api
dotnet run
