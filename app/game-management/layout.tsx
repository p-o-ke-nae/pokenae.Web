import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getAuthOptions } from '@/lib/auth/auth-options';

export default async function GameManagementLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(getAuthOptions());
  if (!session) {
    redirect('/');
  }
  return children;
}