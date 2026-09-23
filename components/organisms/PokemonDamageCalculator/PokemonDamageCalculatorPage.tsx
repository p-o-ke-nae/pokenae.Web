'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import {
  createRun,
  fetchRuleSets,
  fetchRuns,
  PokemonDamageCalculatorApiError,
} from '@/lib/pokemon-damage-calculator/api';
import { formatRuleSetLabel, sortRuleSets, sortRuns } from '@/lib/pokemon-damage-calculator/mappers';
import { getRunOwnership } from '@/lib/pokemon-damage-calculator/ownership';
import {
  filterRunsByScope,
  getDefaultRunListScope,
  type RunListScope,
} from '@/lib/pokemon-damage-calculator/run-list';
import { validateCreateRunRequest } from '@/lib/pokemon-damage-calculator/validation';
import type { RuleSetDto, RunDto } from '@/lib/pokemon-damage-calculator/types';
import {
  EmptyState,
  FieldGroup,
  PageShell,
  SectionCard,
  SelectInput,
  StatusMessage,
  TextInput,
} from './shared';

function getErrorMessage(error: unknown): string {
  if (error instanceof PokemonDamageCalculatorApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'データ取得に失敗しました。';
}

export function PokemonDamageCalculatorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [ruleSets, setRuleSets] = useState<RuleSetDto[]>([]);
  const [runs, setRuns] = useState<RunDto[]>([]);
  const [runListScope, setRunListScope] = useState<RunListScope>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    ruleSetId: '',
  });
  const googleUserId = session?.googleUserId ?? null;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [fetchedRuleSets, fetchedRuns] = await Promise.all([
        fetchRuleSets(),
        fetchRuns(),
      ]);

      const orderedRuleSets = sortRuleSets(fetchedRuleSets);
      setRuleSets(orderedRuleSets);
      setRuns(sortRuns(fetchedRuns));
      setCreateForm((current) => ({
        ...current,
        ruleSetId: current.ruleSetId || orderedRuleSets[0]?.id || '',
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setRunListScope(getDefaultRunListScope(googleUserId));
  }, [googleUserId]);

  const ownershipRuns = useMemo(
    () => runs.map((run) => ({
      ...run,
      ownership: getRunOwnership(run.ownerUserId, googleUserId),
    })),
    [googleUserId, runs],
  );

  const visibleRuns = useMemo(
    () => filterRunsByScope(ownershipRuns, runListScope),
    [ownershipRuns, runListScope],
  );

  const handleCreateRun = useCallback(async () => {
    if (status !== 'authenticated') {
      await signIn('google', { callbackUrl: '/pokemon-damage-calculator' });
      return;
    }

    const trimmedRequest = {
      name: createForm.name.trim(),
      ruleSetId: createForm.ruleSetId,
    };
    const validationErrors = validateCreateRunRequest(trimmedRequest);
    setCreateErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      const created = await createRun(trimmedRequest);
      await loadData();
      router.push(`/pokemon-damage-calculator/runs/${created.id}`);
    } catch (error) {
      setCreateErrors([getErrorMessage(error)]);
    } finally {
      setSubmitting(false);
    }
  }, [createForm, loadData, router, status]);

  return (
    <PageShell
      title="ポケモンダメージ計算"
      description="RuleSet と Run を一覧で確認し、Run ごとの Battle / Party State / ダメージ計算ワークスペースへ移動できます。"
    >
      {errorMessage ? <StatusMessage tone="error">{errorMessage}</StatusMessage> : null}
      {status !== 'authenticated' ? (
        <StatusMessage tone="info">
          未ログインでも RuleSet / Run の閲覧は可能です。Run の作成や更新を行う場合は Google ログインしてください。
        </StatusMessage>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Run 一覧"
          description={status === 'authenticated'
            ? runListScope === 'owned'
              ? '認証済みユーザーは既定で自分の Run を表示します。必要に応じて、すべての Run に切り替えられます。'
              : 'すべての Run を表示しています。所有している Run のみ編集可能です。'
            : '全ユーザーの Run を閲覧できます。所有している Run のみ編集可能です。'}
          actions={(
            <CustomButton variant="ghost" onClick={() => void loadData()} disabled={loading}>
              再取得
            </CustomButton>
          )}
        >
          {status === 'authenticated' ? (
            <div className="mb-4 flex flex-wrap gap-3">
              <CustomButton
                variant={runListScope === 'owned' ? 'accent' : 'ghost'}
                onClick={() => setRunListScope('owned')}
                disabled={runListScope === 'owned'}
              >
                自分の Run
              </CustomButton>
              <CustomButton
                variant={runListScope === 'all' ? 'accent' : 'ghost'}
                onClick={() => setRunListScope('all')}
                disabled={runListScope === 'all'}
              >
                すべての Run
              </CustomButton>
            </div>
          ) : null}
          {loading ? (
            <StatusMessage tone="info">データを取得しています...</StatusMessage>
          ) : visibleRuns.length === 0 ? (
            <EmptyState>
              {runListScope === 'owned'
                ? '自分の Run はまだ登録されていません。必要に応じて「すべての Run」に切り替えて他ユーザーの Run を閲覧できます。'
                : 'Run はまだ登録されていません。'}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {visibleRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">{run.name}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{run.status}</td>
                      <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs">{run.ownerUserId}</span>
                          <span className="text-xs">
                            {run.ownership === 'owner'
                              ? '自分の Run'
                              : run.ownership === 'viewer'
                                ? '他ユーザー Run'
                                : '未ログイン閲覧'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300"
                          href={`/pokemon-damage-calculator/runs/${run.id}`}
                        >
                          ワークスペースを開く
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Run 作成" description="RuleSet を選択して新しい Run を作成します。">
          <div className="space-y-4">
            {createErrors.length > 0 ? (
              <StatusMessage tone="error">
                <ul className="list-disc pl-5">
                  {createErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </StatusMessage>
            ) : null}

            <FieldGroup label="Run 名">
              <TextInput
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例: HGSS ストーリー周回"
                disabled={submitting}
              />
            </FieldGroup>
            <FieldGroup label="RuleSet">
              <SelectInput
                value={createForm.ruleSetId}
                onChange={(event) => setCreateForm((current) => ({ ...current, ruleSetId: event.target.value }))}
                disabled={loading || submitting || ruleSets.length === 0}
              >
                {ruleSets.length === 0 ? (
                  <option value="">RuleSet がありません</option>
                ) : null}
                {ruleSets.map((ruleSet) => (
                  <option key={ruleSet.id} value={ruleSet.id}>
                    {formatRuleSetLabel(ruleSet)}
                  </option>
                ))}
              </SelectInput>
            </FieldGroup>
            <CustomButton
              variant="accent"
              onClick={() => void handleCreateRun()}
              isLoading={submitting}
              disabled={loading || ruleSets.length === 0}
            >
              {status === 'authenticated' ? 'Run を作成して開く' : 'ログインして Run を作成'}
            </CustomButton>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="RuleSet 一覧" description="RuleSet は読み取り専用です。Run 作成時の選択候補として使います。">
        {loading ? (
          <StatusMessage tone="info">RuleSet を取得しています...</StatusMessage>
        ) : ruleSets.length === 0 ? (
          <EmptyState>RuleSet はまだ公開されていません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ruleSets.map((ruleSet) => (
              <article key={ruleSet.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{ruleSet.title}</h3>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {ruleSet.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{ruleSet.summary}</p>
                <dl className="mt-4 grid gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <div>
                    <dt className="font-semibold">Generation</dt>
                    <dd>{ruleSet.generation}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Version</dt>
                    <dd>{ruleSet.version}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Slug</dt>
                    <dd className="font-mono">{ruleSet.slug}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

