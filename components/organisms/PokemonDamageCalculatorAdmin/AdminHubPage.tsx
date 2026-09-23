'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import { AdminPageShell, AdminStateMessage, AdminSectionCard } from './shared';
import { getAdminApiErrorMessage, isAdminApiUnauthorized } from '@/lib/pokemon-damage-calculator/admin/api';
import { canManageRuleSets, canManageUserAuthorizations, probeAdminCapability } from '@/lib/pokemon-damage-calculator/admin/capability';
import { getAdminRuleSetsPath, getAdminUserAuthorizationsPath } from '@/lib/pokemon-damage-calculator/admin/routes';
import type { AdminCapability } from '@/lib/pokemon-damage-calculator/admin/constants';

export function AdminHubPage() {
  const router = useRouter();
  const { status } = useSession();
  const [capability, setCapability] = useState<AdminCapability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (status === 'loading') {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const nextCapability = await probeAdminCapability(status === 'authenticated');
        if (!cancelled) {
          setCapability(nextCapability);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <AdminPageShell
      title="ポケモンダメージ計算 管理トップ"
      description="RuleSet と UserAuthorization の管理画面です。利用可能な機能だけを表示します。"
    >
      {loading ? <AdminStateMessage title="管理権限を確認しています..." /> : null}
      {error && isAdminApiUnauthorized(error) ? (
        <AdminStateMessage
          title="再ログインしてください。"
          detail="セッションの有効期限が切れています。ログインし直してください。"
          signInCallbackUrl="/pokemon-damage-calculator/admin"
        />
      ) : null}
      {error && !isAdminApiUnauthorized(error) ? (
        <AdminStateMessage
          tone="error"
          title="管理トップの読み込みに失敗しました。"
          detail={getAdminApiErrorMessage(error, '管理権限の確認に失敗しました。')}
        />
      ) : null}
      {!loading && !error && capability === 'anonymous' ? (
        <AdminStateMessage
          title="ログインしてください。"
          detail="管理画面を利用するには Google ログインが必要です。"
          signInCallbackUrl="/pokemon-damage-calculator/admin"
        />
      ) : null}
      {!loading && !error && capability === 'member' ? (
        <AdminStateMessage
          tone="warning"
          title="このアカウントには管理権限がありません。"
          detail="管理者またはマスタ編集権限のあるアカウントでログインしてください。"
        />
      ) : null}

      {!loading && !error && capability && capability !== 'anonymous' && capability !== 'member' ? (
        <div className="grid gap-6 md:grid-cols-2">
          <AdminSectionCard
          title="RuleSet 管理"
          description="RuleSet の一覧、作成、更新、削除を行います。"
            actions={(
              <CustomButton variant="accent" disabled={!canManageRuleSets(capability)} onClick={() => router.push(getAdminRuleSetsPath())}>
                開く
              </CustomButton>
            )}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {canManageRuleSets(capability) ? 'MasterEditor 以上で利用できます。' : '利用できません。'}
            </p>
          </AdminSectionCard>

          <AdminSectionCard
          title="UserAuthorization 管理"
          description="Google ユーザーごとの role と permissions を管理します。"
            actions={(
              <CustomButton
                variant="accent"
                disabled={!canManageUserAuthorizations(capability)}
                onClick={() => router.push(getAdminUserAuthorizationsPath())}
              >
                開く
              </CustomButton>
            )}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {canManageUserAuthorizations(capability) ? 'Administrator で利用できます。' : '利用できません。'}
            </p>
          </AdminSectionCard>
        </div>
      ) : null}
    </AdminPageShell>
  );
}

