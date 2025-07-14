#!/usr/bin/env node
// Node.js クロスプラットフォーム対応のPages Router競合ファイル削除スクリプト

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up conflicting Pages Router files...');

// ディレクトリを再帰的に削除する関数
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Removing ${dirPath} directory...`);
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`✅ ${dirPath} removed`);
    return true;
  } else {
    console.log(`ℹ️  ${dirPath} not found (already clean)`);
    return false;
  }
}

// メイン処理
try {
  // src/pages ディレクトリを削除
  removeDirectory('src/pages');
  
  // pages ディレクトリを削除（ルートレベル）
  removeDirectory('pages');
  
  // .next キャッシュをクリア
  if (removeDirectory('.next')) {
    console.log('✅ .next cache cleared');
  }
  
  console.log('🎉 Cleanup completed - ready for App Router build');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}
