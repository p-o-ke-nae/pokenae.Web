/**
 * NextAuth.js 設定
 * Google OAuth2認証の設定
 */

import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

type RefreshableToken = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
};

type RefreshedTokenSet = {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken?: string;
};

/** 有効期限のこの秒数前から更新する（期限ぎりぎりの要求が API 側で失効するのを防ぐ） */
const ACCESS_TOKEN_REFRESH_MARGIN_SECONDS = 5 * 60;

/**
 * Route Handler の getServerSession では更新後の JWT を Cookie に書き戻せないため、
 * 同じリフレッシュトークンによる更新結果をプロセス内で共有し、
 * 期限切れ後に要求ごと・並行要求ごとに Google へ更新通信が発生しないようにする。
 */
const refreshResults = new Map<string, Promise<RefreshedTokenSet>>();

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function needsRefresh(expiresAt: number | undefined): boolean {
  return !expiresAt || nowSeconds() >= expiresAt - ACCESS_TOKEN_REFRESH_MARGIN_SECONDS;
}

async function requestTokenRefresh(refreshToken: string): Promise<RefreshedTokenSet> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const refreshedTokens = await response.json();

  if (!response.ok) {
    throw new Error(refreshedTokens.error || 'トークンのリフレッシュに失敗しました');
  }

  return {
    accessToken: refreshedTokens.access_token,
    // 新しい有効期限を設定（expires_in は秒数）
    accessTokenExpires: nowSeconds() + refreshedTokens.expires_in,
    // リフレッシュトークンは新しいものが返された場合のみ更新
    refreshToken: refreshedTokens.refresh_token,
  };
}

function getSharedRefresh(refreshToken: string): Promise<RefreshedTokenSet> {
  const existing = refreshResults.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = requestTokenRefresh(refreshToken);
  refreshResults.set(refreshToken, promise);
  promise.then(
    (result) => {
      // 更新結果は次の更新時期まで共有し、その後は破棄する
      const ttlMs = Math.max(0, (result.accessTokenExpires - ACCESS_TOKEN_REFRESH_MARGIN_SECONDS - nowSeconds()) * 1000);
      setTimeout(() => {
        if (refreshResults.get(refreshToken) === promise) refreshResults.delete(refreshToken);
      }, ttlMs).unref?.();
    },
    () => {
      refreshResults.delete(refreshToken);
    },
  );
  return promise;
}

/**
 * Googleのトークンエンドポイントを使用してアクセストークンをリフレッシュする
 * リフレッシュトークンが存在し、アクセストークンの有効期限が近い・切れている場合に呼び出される
 */
async function refreshAccessToken(token: RefreshableToken) {
  try {
    const refreshed = await getSharedRefresh(token.refreshToken || '');
    return {
      ...token,
      accessToken: refreshed.accessToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
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

        // アクセストークンが十分に有効な場合はそのまま返す
        if (!needsRefresh(token.accessTokenExpires)) {
          return token;
        }

        // 有効期限が近い・切れている場合、リフレッシュを試行
        if (token.refreshToken) {
          return await refreshAccessToken(token);
        }

        return token;
      },
      async session({ session, token }) {
        // API Route がサーバー側でアクセストークンを付与するため、
        // リフレッシュトークンはクライアントへ公開しない
        session.accessToken = token.accessToken as string;
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
