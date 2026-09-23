'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import { AdminPageShell, AdminEmptyState, AdminStateMessage, AdminSectionCard } from './shared';
import { fetchAdminUserAuthorizations, getAdminApiErrorMessage, isAdminApiForbidden, isAdminApiUnauthorized } from '@/lib/pokemon-damage-calculator/admin/api';
import { sortAdminUserAuthorizations } from '@/lib/pokemon-damage-calculator/admin/mappers';
import { getAdminHomePath, getAdminUserAuthorizationNewPath, getAdminUserAuthorizationPath, getAdminUserAuthorizationsPath } from '@/lib/pokemon-damage-calculator/admin/routes';
import type { AdminUserAuthorizationDto } from '@/lib/pokemon-damage-calculator/admin/types';

export function AdminUserAuthorizationListPage() {
  const router = useRouter();
  const { status } = useSession();
  const [items, setItems] = useState<AdminUserAuthorizationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextItems = await fetchAdminUserAuthorizations();
      setItems(sortAdminUserAuthorizations(nextItems));
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }

    void load();
  }, [load, status]);

  const errorMessage = error ? getAdminApiErrorMessage(error, 'UserAuthorization 一覧の読み込みに失敗しました。') : null;

  return (
    <AdminPageShell
      title="UserAuthorization 管理"
      description="Google ユーザーの role と permissions を管理します。"
    >
      <div className="flex flex-wrap gap-3">
        <CustomButton variant="ghost" onClick={() => void load()} disabled={loading || status !== 'authenticated'}>
          再取得
        </CustomButton>
        <CustomButton variant="accent" disabled={status !== 'authenticated'} onClick={() => router.push(getAdminUserAuthorizationNewPath())}>
          新規作成
        </CustomButton>
        <CustomButton variant="ghost" onClick={() => router.push(getAdminHomePath())}>
          管理トップへ戻る
        </CustomButton>
      </div>

      {status === 'loading' || loading ? <AdminStateMessage title="UserAuthorization を読み込んでいます..." /> : null}
      {status !== 'authenticated' ? (
        <AdminStateMessage
          title="ログインしてください。"
          detail="UserAuthorization 管理を利用するには Google ログインが必要です。"
          signInCallbackUrl={getAdminUserAuthorizationsPath()}
        />
      ) : null}
      {error && isAdminApiUnauthorized(error) ? (
        <AdminStateMessage
          title="再ログインしてください。"
          detail="セッションの有効期限が切れています。ログインし直してください。"
          signInCallbackUrl={getAdminUserAuthorizationsPath()}
        />
      ) : null}
      {error && isAdminApiForbidden(error) ? (
        <AdminStateMessage
          tone="warning"
          title="UserAuthorization 管理の権限がありません。"
          detail="Administrator でログインしてください。"
        />
      ) : null}
      {error && !isAdminApiUnauthorized(error) && !isAdminApiForbidden(error) ? (
        <AdminStateMessage tone="error" title="読み込みに失敗しました。" detail={errorMessage ?? undefined} />
      ) : null}

      {!loading && status === 'authenticated' && !error ? (
        <AdminSectionCard
          title="UserAuthorization 一覧"
          description="googleUserId、role、permissions、最終管理者保護を確認できます。"
        >
          {items.length === 0 ? (
            <AdminEmptyState>
              UserAuthorization はまだありません。新規作成から追加してください。
            </AdminEmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2">Google User ID</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Permissions</th>
                    <th className="px-3 py-2">Last Admin</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {items.map((item) => (
                    <tr key={item.googleUserId}>
                      <td className="px-3 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{item.googleUserId}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{item.role}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{item.permissions.join(', ') || '—'}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{item.isLastAdministrator ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-3">
                        <Link className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300" href={getAdminUserAuthorizationPath(item.googleUserId)}>
                          詳細を開く
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSectionCard>
      ) : null}
    </AdminPageShell>
  );
}

