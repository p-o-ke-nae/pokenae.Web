/**
 * NextAuth.js APIルート
 * すべての認証リクエストを処理
 */

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/auth-options';

type NextAuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

export async function GET(request: Request, context: NextAuthRouteContext) {
	const handler = NextAuth(getAuthOptions());
	return handler(request, context);
}

export async function POST(request: Request, context: NextAuthRouteContext) {
	const handler = NextAuth(getAuthOptions());
	return handler(request, context);
}
