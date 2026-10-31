
$ErrorActionPreference = "Stop"

Write-Host "`n=== CHATTING WEB DEPLOYMENT ===" -ForegroundColor Cyan

Write-Host "`n[1/3] Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed! GitHub upload cancelled."
}

Write-Host "`n[2/3] Adding changes..." -ForegroundColor Yellow
git add .

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No new changes to upload." -ForegroundColor Green
    exit 0
}

Write-Host "`n[3/3] Uploading to GitHub..." -ForegroundColor Yellow

git commit -m "Update Chatting Web App"

if ($LASTEXITCODE -ne 0) {
    throw "Git commit failed."
}

git push

if ($LASTEXITCODE -ne 0) {
    throw "GitHub push failed."
}

Write-Host "`nUpload successful! GitHub Actions will deploy your website." -ForegroundColor Green
