'use client';

/**
 * NavigationBar - ナビゲーションバーコンポーネント
 * 開発環境の場合は、環境を示すバッジを表示
 */

import { isDevelopment } from '@/lib/config/env';

export default function NavigationBar() {
  const isDevEnvironment = isDevelopment();

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

          {/* 開発環境バッジ */}
          {isDevEnvironment && (
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <svg 
                  className="w-4 h-4 mr-1.5" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                    clipRule="evenodd" 
                  />
                </svg>
                開発環境
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
