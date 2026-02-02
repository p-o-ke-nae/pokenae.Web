/**
 * 環境変数の管理
 * Next.jsの環境変数を型安全に扱うためのユーティリティ
 */

export type Environment = 'development' | 'production';

/**
 * 現在の環境を取得
 */
export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
  if (env === 'production') {
    return 'production';
  }
  return 'development';
}

/**
 * 開発環境かどうかを判定
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * 本番環境かどうかを判定
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * バックエンドAPIのベースURLを取得
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}
