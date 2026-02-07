/**
 * 環境変数の管理
 * Next.jsの環境変数を型安全に扱うためのユーティリティ
 * 
 * 環境モードの区別方法：
 * - debug: ローカル実行時（package.json の "dev" スクリプト実行）
 *   判定：process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENVIRONMENT === 'debug'
 *   使用場面：ローカル開発で詳細なデバッグ情報が必要な場合
 * 
 * - development: 開発環境サーバーでの実行
 *   判定：process.env.NEXT_PUBLIC_ENVIRONMENT === 'development'
 *   使用場面：開発環境での動作確認
 * 
 * - production: 本番環境サーバーでの実行
 *   判定：process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
 *   使用場面：本番環境での実行
 */

export type Environment = 'debug' | 'development' | 'production';

/**
 * 現在の環境を取得
 */
export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
  
  // NEXT_PUBLIC_ENVIRONMENT が明示的に設定されている場合
  if (env === 'production') {
    return 'production';
  }
  if (env === 'debug') {
    return 'debug';
  }
  
  return 'development';
}

/**
 * デバッグモードかどうかを判定
 * ローカル開発環境での実行を示します
 */
export function isDebug(): boolean {
  return getEnvironment() === 'debug';
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
 * 本番環境ではないかを判定（debug または development）
 */
export function isDev(): boolean {
  return isDebug() || isDevelopment();
}

/**
 * バックエンドAPIのベースURLを取得
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}
