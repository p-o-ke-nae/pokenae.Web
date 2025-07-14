# Pages Router 競合ファイル削除スクリプト (PowerShell版)
# デプロイ前にサーバー上の古いpagesディレクトリを削除

Write-Host "🧹 Cleaning up conflicting Pages Router files..." -ForegroundColor Yellow

# src/pages ディレクトリを削除
if (Test-Path "src/pages" -PathType Container) {
    Write-Host "Removing src/pages directory..." -ForegroundColor Blue
    Remove-Item -Path "src/pages" -Recurse -Force
    Write-Host "✅ src/pages removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  src/pages not found (already clean)" -ForegroundColor Cyan
}

# pages ディレクトリを削除（ルートレベル）
if (Test-Path "pages" -PathType Container) {
    Write-Host "Removing root pages directory..." -ForegroundColor Blue
    Remove-Item -Path "pages" -Recurse -Force
    Write-Host "✅ pages removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  pages not found (already clean)" -ForegroundColor Cyan
}

# .next キャッシュをクリア
if (Test-Path ".next" -PathType Container) {
    Write-Host "Clearing .next cache..." -ForegroundColor Blue
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ .next cache cleared" -ForegroundColor Green
}

Write-Host "🎉 Cleanup completed - ready for App Router build" -ForegroundColor Green
