'use client';

/**
 * NavigationBar - ナビゲーションバーコンポーネント
 * 環境バッジと認証状態を表示
 * - 本番環境かつログイン時: 認証バッジ（ユーザー情報+ログアウトボタン）のみ表示
 * - 本番環境かつ未ログイン: 認証バッジ（ログインボタン）のみ表示
 * - 開発環境: 環境バッジを表示、認証バッジも常に表示
 */

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { getEnvironment } from '@/lib/config/env';
import EnvironmentBadge from '@/components/atoms/EnvironmentBadge';
import AuthBadge from '@/components/atoms/AuthBadge';

export default function NavigationBar() {
  const { data: session } = useSession();
  const environment = getEnvironment();
  const isProduction = environment === 'production';
  const isAuthenticated = !!session?.user;
  // トークンリフレッシュに失敗した場合、再ログインを促す
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      // セッションが無効になったため再認証を要求
      signIn('google', { callbackUrl: window.location.href });
    }
  }, [session?.error]);

  return (
    <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ナビゲーションリンク */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
              pokenae
            </Link>
            <Link
              href="/game-library"
              className="text-sm font-medium text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              ゲームライブラリ
            </Link>
            {isAuthenticated && (
              <Link
                href="/game-management"
                className="text-sm font-medium text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                マスタ管理
              </Link>
            )}
          </div>

          {/* バッジエリア */}
          <div className="flex items-center gap-3">
            {/* 認証バッジ（常に表示：ログイン時はユーザー情報、未ログイン時はログインボタン） */}
            <AuthBadge 
              isAuthenticated={isAuthenticated}
              userName={session?.user?.name || undefined}
              userEmail={session?.user?.email || undefined}
            />

            {/* 環境バッジ（開発環境のみ） */}
            {!isProduction && <EnvironmentBadge />}
          </div>
        </div>
      </div>
    </nav>
  );
}
