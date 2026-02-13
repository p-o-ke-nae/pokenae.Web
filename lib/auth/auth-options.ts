/**
 * NextAuth.js 設定
 * Google OAuth2認証の設定
 */

import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Googleのトークンエンドポイントを使用してアクセストークンをリフレッシュする
 * リフレッシュトークンが存在し、アクセストークンの有効期限が切れている場合に呼び出される
 */
async function refreshAccessToken(token: {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
        client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken || '',
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(refreshedTokens.error || 'トークンのリフレッシュに失敗しました');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      // 新しい有効期限を設定（expires_in は秒数）
      accessTokenExpires: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      // リフレッシュトークンは新しいものが返された場合のみ更新
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('アクセストークンのリフレッシュに失敗:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * 必須環境変数の検証
 * サーバー起動時にシークレットが設定されていなければエラーを投げる
 * Docker Compose secrets 経由で entrypoint.sh が環境変数に展開する
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const isBuildPhase =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build';

    if (isBuildPhase) {
      console.warn(`ビルド時のため環境変数 ${key} の未設定を一時的に許容します。`);
      return `BUILD_TIME_PLACEHOLDER_${key}`;
    }

    throw new Error(
      `環境変数 ${key} が設定されていません。\n` +
      `secrets/ ディレクトリにシークレットファイルが配置されているか確認してください。\n` +
      `詳細: docs/ENVIRONMENT_SETUP.md を参照`
    );
  }
  return value;
}

export function getAuthOptions(): AuthOptions {
  return {
    providers: [
      GoogleProvider({
        clientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
        clientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
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
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            // expires_at はUNIXタイムスタンプ（秒）
            accessTokenExpires: account.expires_at,
          };
        }

        // アクセストークンがまだ有効な場合はそのまま返す
        if (token.accessTokenExpires && Date.now() / 1000 < token.accessTokenExpires) {
          return token;
        }

        // アクセストークンが期限切れの場合、リフレッシュを試行
        if (token.refreshToken) {
          return await refreshAccessToken(token);
        }

        return token;
      },
      async session({ session, token }) {
        // セッションにアクセストークンを含める
        // これによりクライアント側でアクセストークンを利用可能にする
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        // トークンリフレッシュエラーをセッションに伝播
        if (token.error) {
          session.error = token.error as string;
        }
        return session;
      },
    },
    pages: {
      signIn: '/', // カスタムサインインページ（今回はホーム画面）
    },
    session: {
      strategy: 'jwt',
    },
    // セッションの秘密鍵（環境変数から取得）
    secret: getRequiredEnv('NEXTAUTH_SECRET'),
  };
}
