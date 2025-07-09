/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Routerを使用
  experimental: {
    appDir: true
  },
  
  // ページ構成を明確にするための設定
  trailingSlash: false,
  env: {
    APP_NAME: 'Pokenae Web'
  },
  
  // WebComponentライブラリの設定
  transpilePackages: ['pokenae-webcomponent']
};

export default nextConfig;
