'use client';

/**
 * AuthBadge - 認証状態バッジコンポーネント
 * ログイン状態に応じてユーザー名とログアウトボタンを表示
 */

import { signOut } from 'next-auth/react';

export interface AuthBadgeProps {
  userName: string;
  userEmail?: string;
  className?: string;
}

export default function AuthBadge({ userName, userEmail, className = '' }: AuthBadgeProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* ユーザー情報 */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-zinc-900 dark:text-white">
          {userName}
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
