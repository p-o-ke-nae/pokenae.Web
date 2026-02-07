'use client';

/**
 * AuthBadge - 認証状態バッジコンポーネント
 * ログイン状態に応じてユーザー名とログアウトボタン、または未ログイン時はログインボタンを表示
 */

import { signOut, signIn } from 'next-auth/react';

export interface AuthBadgeProps {
  isAuthenticated: boolean;
  userName?: string;
  userEmail?: string;
  className?: string;
}

export default function AuthBadge({ isAuthenticated, userName, userEmail, className = '' }: AuthBadgeProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  // 未ログイン時：ログインボタンを表示
  if (!isAuthenticated) {
    return (
      <button
        onClick={handleSignIn}
        className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
        aria-label="Googleでログイン"
      >
        <svg 
          className="w-4 h-4 mr-2" 
          fill="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
        Googleでログイン
      </button>
    );
  }

  // ログイン時：ユーザー情報とログアウトボタンを表示
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* ユーザー情報 */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-zinc-900 dark:text-white">
          {userName || 'ユーザー'}
        </span>
        {userEmail && (
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {userEmail}
          </span>
        )}
      </div>

      {/* ログアウトボタン */}
      <button
        onClick={handleSignOut}
        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
        aria-label="ログアウト"
      >
        <svg 
          className="w-4 h-4 mr-1.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
          />
        </svg>
        ログアウト
      </button>
    </div>
  );
}
