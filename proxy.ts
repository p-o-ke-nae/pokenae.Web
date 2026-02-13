/**
 * NextAuth.js Proxy
 * 認証が必要なルートを保護する
 * 
 * 保護対象:
 * - /api/fetch-user: ユーザー情報取得API
 * - /api/services/*: バックエンドプロキシAPI
 * 
 * 除外対象:
 * - /api/auth/*: NextAuth.jsの認証エンドポイント（認証フロー自体）
 * - /: ホームページ（ログインボタンを含む）
 * - /_next/*: Next.jsの静的アセット
 */

import { type NextRequest } from 'next/server';
import authMiddleware from 'next-auth/middleware';

export function proxy(request: NextRequest) {
  return (authMiddleware as unknown as (req: NextRequest) => Response | Promise<Response | undefined> | undefined)(request);
}

export default proxy;

export const config = {
  // 保護するルートのパターンを指定
  // /api/auth/* は除外（NextAuth.jsの内部エンドポイント）
  matcher: [
    '/api/fetch-user/:path*',
    '/api/services/:path*',
    '/api-example/:path*',
  ],
};
