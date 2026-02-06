import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 【必須】Docker用の自己完結型ビルド
  output: 'standalone',
  
  // 開発環境でのカーネルスタック問題の軽減
  // ファイル監視とメモリ管理の最適化
  // 注: onDemandEntriesは開発環境専用のオプションで、本番環境では無視されます
  onDemandEntries: {
    // ページキャッシュの有効期限（デフォルト: 15000ms）
    // CPU負荷を考慮して30秒に設定
    maxInactiveAge: 30000,
    // メモリ上に保持するページ数（デフォルト: 2）
    pagesBufferLength: 3,
  },
};

export default nextConfig;
