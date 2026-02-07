'use client';

/**
 * EnvironmentBadge - 環境バッジコンポーネント
 * 環境に応じて異なるバッジを表示：
 * - debug: 赤色バッジ
 * - development: 黄色バッジ
 * - production: 表示なし
 */

import { getEnvironment } from '@/lib/config/env';

export interface EnvironmentBadgeProps {
  className?: string;
}

export default function EnvironmentBadge({ className = '' }: EnvironmentBadgeProps) {
  const environment = getEnvironment();
  const isNotProduction = environment !== 'production';

  // 環境に応じたバッジの色とテキストを定義
  const badgeConfig = {
    debug: {
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-800 dark:text-red-200',
      icon: (
        <svg 
          className="w-4 h-4 mr-1.5" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
      ),
      label: 'DEBUG',
    },
    development: {
      bgColor: 'bg-amber-100 dark:bg-amber-900',
      textColor: 'text-amber-800 dark:text-amber-200',
      icon: (
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
      ),
      label: '開発環境',
    },
  };

  const config = badgeConfig[environment as keyof typeof badgeConfig];

  if (!isNotProduction || !config) {
    return null;
  }

  return (
    <span 
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
