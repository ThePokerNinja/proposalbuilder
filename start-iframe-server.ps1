# PowerShell script to start the production server for iframe embedding

Write-Host "Starting Proposal Builder Production Server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

node server-production.js
