# PowerShell script to start both servers
# Run with: .\start-servers.ps1

Write-Host "🚀 Starting Proposal Builder Servers..." -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env file with your LiveKit credentials" -ForegroundColor Yellow
    exit 1
}

# Start token server in background
Write-Host "📡 Starting token server on port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:server" -WindowStyle Normal

# Wait a moment for server to start
Start-Sleep -Seconds 2

# Check if server started
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Token server is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Token server may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Starting frontend dev server..." -ForegroundColor Cyan
Write-Host "   Open http://localhost:5173 in your browser" -ForegroundColor Yellow
Write-Host ""

# Start frontend
npm run dev
