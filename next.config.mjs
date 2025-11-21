import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ページ構成を明確にするための設定
  trailingSlash: false,
  env: {
    APP_NAME: 'Pokenae Web'
  },
  
};

export default nextConfig;
