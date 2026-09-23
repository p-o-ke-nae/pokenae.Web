'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import type { ReactNode } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import {
  EmptyState,
  PageShell,
  SectionCard,
  StatusMessage,
} from '@/components/organisms/PokemonDamageCalculator/shared';
import {
  getAdminHomePath,
  getAdminRuleSetsPath,
  getAdminUserAuthorizationsPath,
} from '@/lib/pokemon-damage-calculator/admin/routes';

export function AdminPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PageShell title={title} description={description}>
      <div className="flex flex-wrap gap-3">
        <Link className="text-sm font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300" href={getAdminHomePath()}>
          管理トップ
        </Link>
        <Link className="text-sm font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300" href={getAdminRuleSetsPath()}>
          RuleSet 管理
        </Link>
        <Link className="text-sm font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300" href={getAdminUserAuthorizationsPath()}>
          UserAuthorization 管理
        </Link>
      </div>
      {children}
    </PageShell>
  );
}

export function AdminStateMessage({
  title,
  detail,
  tone = 'info',
  signInCallbackUrl,
}: {
  title: string;
  detail?: string;
  tone?: 'info' | 'warning' | 'error' | 'success';
  signInCallbackUrl?: string;
}) {
  const { status } = useSession();

  return (
    <StatusMessage tone={tone}>
      <div className="space-y-3">
        <p className="font-medium">{title}</p>
        {detail ? <p>{detail}</p> : null}
        {status !== 'authenticated' && signInCallbackUrl ? (
          <CustomButton variant="accent" onClick={() => void signIn('google', { callbackUrl: signInCallbackUrl })}>
            Google でログイン
          </CustomButton>
        ) : null}
      </div>
    </StatusMessage>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>;
}

export function AdminSectionCard(props: Parameters<typeof SectionCard>[0]) {
  return <SectionCard {...props} />;
}

