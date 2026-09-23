'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import { AdminPageShell, AdminEmptyState, AdminStateMessage, AdminSectionCard } from './shared';
import { fetchAdminRuleSets, getAdminApiErrorMessage, isAdminApiForbidden, isAdminApiUnauthorized } from '@/lib/pokemon-damage-calculator/admin/api';
import { formatAdminRuleSetLabel, sortAdminRuleSets } from '@/lib/pokemon-damage-calculator/admin/mappers';
import { getAdminRuleSetNewPath, getAdminRuleSetPath, getAdminRuleSetsPath, getAdminHomePath } from '@/lib/pokemon-damage-calculator/admin/routes';
import type { AdminRuleSetDto } from '@/lib/pokemon-damage-calculator/admin/types';

export function AdminRuleSetListPage() {
  const router = useRouter();
  const { status } = useSession();
  const [ruleSets, setRuleSets] = useState<AdminRuleSetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextRuleSets = await fetchAdminRuleSets();
      setRuleSets(sortAdminRuleSets(nextRuleSets));
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

  const errorMessage = error ? getAdminApiErrorMessage(error, 'RuleSet 一覧の読み込みに失敗しました。') : null;

  return (
    <AdminPageShell
      title="RuleSet 管理"
      description="管理用 RuleSet の一覧、作成、更新、削除を行います。"
    >
      <div className="flex flex-wrap gap-3">
        <CustomButton variant="ghost" onClick={() => void load()} disabled={loading || status !== 'authenticated'}>
          再取得
        </CustomButton>
        <CustomButton variant="accent" disabled={status !== 'authenticated'} onClick={() => router.push(getAdminRuleSetNewPath())}>
          新規作成
        </CustomButton>
        <CustomButton variant="ghost" onClick={() => router.push(getAdminHomePath())}>
          管理トップへ戻る
        </CustomButton>
      </div>

      {status === 'loading' || loading ? <AdminStateMessage title="RuleSet を読み込んでいます..." /> : null}
      {status !== 'authenticated' ? (
        <AdminStateMessage
          title="ログインしてください。"
          detail="RuleSet 管理を利用するには Google ログインが必要です。"
          signInCallbackUrl={getAdminRuleSetsPath()}
        />
      ) : null}
      {error && isAdminApiUnauthorized(error) ? (
        <AdminStateMessage
          title="再ログインしてください。"
          detail="セッションの有効期限が切れています。ログインし直してください。"
          signInCallbackUrl={getAdminRuleSetsPath()}
        />
      ) : null}
      {error && isAdminApiForbidden(error) ? (
        <AdminStateMessage
          tone="warning"
          title="RuleSet 管理の権限がありません。"
          detail="MasterEditor 以上のアカウントでログインしてください。"
        />
      ) : null}
      {error && !isAdminApiUnauthorized(error) && !isAdminApiForbidden(error) ? (
        <AdminStateMessage tone="error" title="読み込みに失敗しました。" detail={errorMessage ?? undefined} />
      ) : null}

      {!loading && status === 'authenticated' && !error ? (
        <AdminSectionCard
          title="RuleSet 一覧"
          description="slug、generation、title、version、status、参照状況を確認できます。"
        >
          {ruleSets.length === 0 ? (
            <AdminEmptyState>
              RuleSet はまだありません。新規作成から追加してください。
            </AdminEmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Generation</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Referenced</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {ruleSets.map((ruleSet) => (
                    <tr key={ruleSet.id}>
                      <td className="px-3 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{ruleSet.slug}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{ruleSet.generation}</td>
                      <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">{ruleSet.title}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{ruleSet.version}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{ruleSet.status}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{ruleSet.isReferencedByRuns ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-3">
                        <Link className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300" href={getAdminRuleSetPath(ruleSet.id)}>
                          {formatAdminRuleSetLabel(ruleSet)}
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

