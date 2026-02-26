/**
 * NextAuth.js APIルート
 * すべての認証リクエストを処理
 *
 * ハンドラーはモジュールレベルで一度だけ生成する。
 * リクエストごとに NextAuth() を呼ぶと内部状態・イベントリスナーが
 * 蓄積してメモリリークが発生するため、シングルトンパターンを採用する。
 */

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/auth-options';

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };
