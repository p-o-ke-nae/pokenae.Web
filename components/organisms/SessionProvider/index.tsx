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

export default function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
