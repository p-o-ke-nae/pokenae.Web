import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 【必須】Docker用の自己完結型ビルド
  output: 'standalone',
  
};

export default nextConfig;
