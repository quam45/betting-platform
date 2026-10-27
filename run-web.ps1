# run-web.ps1
Write-Host "Starting Betting Web..." -ForegroundColor Green
Set-Location "$PSScriptRoot\betting-web"
if (-not (Test-Path node_modules)) {
    Write-Host "Installing npm packages first time..." -ForegroundColor Yellow
    npm install
}
npm run dev