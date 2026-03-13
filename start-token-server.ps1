# Quick script to start the token server
# Run this in a separate terminal

Write-Host "🚀 Starting LiveKit Token Server..." -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "   Please create .env.local with your LiveKit credentials" -ForegroundColor Yellow
    exit 1
}

# Start the server
Write-Host "📡 Server will start on http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Keep this window open!" -ForegroundColor Yellow
Write-Host ""

npm run dev:server
