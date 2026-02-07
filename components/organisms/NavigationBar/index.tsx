'use client';

/**
 * NavigationBar - ナビゲーションバーコンポーネント
 * 環境バッジと認証状態を表示
 * - 本番環境かつログイン時: 認証バッジ（ユーザー情報+ログアウトボタン）のみ表示
 * - 本番環境かつ未ログイン: 認証バッジ（ログインボタン）のみ表示
 * - 開発環境: 環境バッジを表示、認証バッジも常に表示
 */

import { useSession } from 'next-auth/react';
import { getEnvironment } from '@/lib/config/env';
import EnvironmentBadge from '@/components/atoms/EnvironmentBadge';
import AuthBadge from '@/components/atoms/AuthBadge';

export default function NavigationBar() {
  const { data: session } = useSession();
  const environment = getEnvironment();
  const isProduction = environment === 'production';
  const isAuthenticated = !!session?.user;

  return (
    <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ・タイトル */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              pokenae
            </h1>
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
