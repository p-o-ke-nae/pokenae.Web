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
  transpilePackages: ['pokenae-webcomponent'],
  
  // Webpackのエイリアス設定
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@components': require('path').resolve(__dirname, 'pokenae.WebComponent/src/components'),
      '@webcomponent': require('path').resolve(__dirname, 'pokenae.WebComponent/src')
    };
    return config;
  }
};

export default nextConfig;
