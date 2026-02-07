/**
 * NextAuth.js 設定
 * Google OAuth2認証の設定
 */

import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          // スプレッドシートへのアクセスに必要なスコープを追加
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          // アクセストークンをオフラインで更新できるようにする
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 初回サインイン時にアクセストークンとリフレッシュトークンを保存
      if (account) {
        token.accessToken = account.access_token;
        // リフレッシュトークンは初回のみ取得できるため、存在する場合のみ保存
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }
        token.accessTokenExpires = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // セッションにアクセストークンを含める
      // これによりクライアント側でアクセストークンを利用可能にする
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/', // カスタムサインインページ（今回はホーム画面）
  },
  session: {
    strategy: 'jwt',
  },
};
