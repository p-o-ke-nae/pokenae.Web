/**
 * NextAuth.js APIルート
 * すべての認証リクエストを処理
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
