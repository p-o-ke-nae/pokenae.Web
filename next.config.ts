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
    // - 15秒（デフォルト）: 頻繁な再読み込みでCPU負荷大
    // - 30秒: CPU負荷とレスポンスのバランスが良い
    // - 60秒: メモリ使用量が増加しすぎる
    maxInactiveAge: 30000,
    // メモリ上に保持するページ数（デフォルト: 2）
    // 3に設定してキャッシュヒット率とメモリ使用のバランスを取る
    pagesBufferLength: 3,
  },
};

export default nextConfig;
