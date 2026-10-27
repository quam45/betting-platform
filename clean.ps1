# clean.ps1 - Reset everything
Write-Host "Cleaning up..." -ForegroundColor Yellow
docker-compose down -v
docker rm -f betting_sqlserver 2>$null
Write-Host "Done. Run setup-phase1.ps1 again to start fresh" -ForegroundColor Green