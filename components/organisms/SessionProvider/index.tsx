'use client';

/**
 * SessionProvider - NextAuth.jsのSessionProviderをラップするコンポーネント
 * クライアントコンポーネントとして分離することで、layout.tsxをServer Componentとして保持
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Google アクセストークン（約1時間）を期限前に更新し Cookie へ保存するため、定期的にセッションを再取得する。
 * API Route の getServerSession では更新後のトークンを Cookie に保存できないため、この経路で永続化する。
 * 一覧画面はセッションのオブジェクト参照ではなくユーザー識別子に依存するため、再取得で再検索は発生しない。
 */
const SESSION_REFETCH_INTERVAL_SECONDS = 10 * 60;

export default function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS} refetchWhenOffline={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
