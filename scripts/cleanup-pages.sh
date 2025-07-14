#!/bin/bash
# Pages Router 競合ファイル削除スクリプト
# デプロイ前にサーバー上の古いpagesディレクトリを削除

echo "🧹 Cleaning up conflicting Pages Router files..."

# src/pages ディレクトリを削除
if [ -d "src/pages" ]; then
    echo "Removing src/pages directory..."
    rm -rf src/pages/
    echo "✅ src/pages removed"
else
    echo "ℹ️  src/pages not found (already clean)"
fi

# pages ディレクトリを削除（ルートレベル）
if [ -d "pages" ]; then
    echo "Removing root pages directory..."
    rm -rf pages/
    echo "✅ pages removed"
else
    echo "ℹ️  pages not found (already clean)"
fi

# .next キャッシュをクリア
if [ -d ".next" ]; then
    echo "Clearing .next cache..."
    rm -rf .next/
    echo "✅ .next cache cleared"
fi

echo "🎉 Cleanup completed - ready for App Router build"
