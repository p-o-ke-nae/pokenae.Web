import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 【必須】Docker用の自己完結型ビルド
  output: 'standalone',
  
  // 開発環境でのカーネルスタック問題の軽減
  // ファイル監視とメモリ管理の最適化
  onDemandEntries: {
    // ページキャッシュの有効期限を延長（デフォルト: 15000ms）
    maxInactiveAge: 60000,
    // メモリ上に保持するページ数（デフォルト: 2）
    pagesBufferLength: 5,
  },
};

export default nextConfig;
