#!/bin/bash
# クロスプラットフォーム対応のPages Router競合ファイル削除スクリプト

echo "🧹 Cleaning up conflicting Pages Router files..."

# Windows環境かチェック
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || -n "$WINDIR" ]]; then
    echo "🪟 Windows environment detected"
    # PowerShellが利用可能かチェック
    if command -v powershell >/dev/null 2>&1; then
        echo "Using PowerShell script..."
        powershell -ExecutionPolicy Bypass -File ./scripts/cleanup-pages.ps1
    elif command -v pwsh >/dev/null 2>&1; then
        echo "Using PowerShell Core..."
        pwsh -ExecutionPolicy Bypass -File ./scripts/cleanup-pages.ps1
    else
        echo "PowerShell not found, using bash fallback..."
        bash ./scripts/cleanup-pages.sh
    fi
else
    echo "🐧 Unix/Linux environment detected"
    echo "Using bash script..."
    bash ./scripts/cleanup-pages.sh
fi
