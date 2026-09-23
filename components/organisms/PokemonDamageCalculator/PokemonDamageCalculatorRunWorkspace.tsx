'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import {
  addProgressionEvent,
  calculateDamage,
  createBattle,
  deleteBattle,
  deleteRun,
  fetchBattles,
  fetchPartyState,
  fetchRun,
  PokemonDamageCalculatorApiError,
  updateBattle,
  updateRun,
} from '@/lib/pokemon-damage-calculator/api';
import { mapCalculationResult, safeParseJsonValue, sortBattles } from '@/lib/pokemon-damage-calculator/mappers';
import { canEditRun, getRunReadOnlyReason } from '@/lib/pokemon-damage-calculator/ownership';
import {
  buildAddProgressionEventRequest,
  getPartyStatePrerequisiteMessage,
} from '@/lib/pokemon-damage-calculator/progression-event';
import {
  validateBattleRequest,
  validateDamageCalculationRequest,
  validateProgressionEventRequest,
  validateUpdateRunRequest,
} from '@/lib/pokemon-damage-calculator/validation';
import type {
  BattleDto,
  CalculationResultViewModel,
  PartyStateDto,
  RunDto,
} from '@/lib/pokemon-damage-calculator/types';
import {
  DataList,
  EmptyState,
  FieldGroup,
  JsonPreview,
  PageShell,
  SectionCard,
  SelectInput,
  StatusMessage,
  TextAreaInput,
  TextInput,
} from './shared';

function getErrorMessage(error: unknown): string {
  if (error instanceof PokemonDamageCalculatorApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'リクエストに失敗しました。';
}

type RunWorkspaceProps = {
  runId: string;
};

export function PokemonDamageCalculatorRunWorkspace({ runId }: RunWorkspaceProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [run, setRun] = useState<RunDto | null>(null);
  const [battles, setBattles] = useState<BattleDto[]>([]);
  const [partyState, setPartyState] = useState<PartyStateDto | null>(null);
  const [latestCalculation, setLatestCalculation] = useState<CalculationResultViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [runFormErrors, setRunFormErrors] = useState<string[]>([]);
  const [battleFormErrors, setBattleFormErrors] = useState<string[]>([]);
  const [partyFormErrors, setPartyFormErrors] = useState<string[]>([]);
  const [calculationErrors, setCalculationErrors] = useState<string[]>([]);
  const [runForm, setRunForm] = useState({ name: '', status: '' });
  const [battleForm, setBattleForm] = useState({ id: '', enemyPokemon: '', sequence: '1' });
  const [progressionForm, setProgressionForm] = useState({
    battleId: '',
    species: '',
    level: '5',
    baseStats: '',
    iVs: '',
    stats: '{"Hp":20,"Attack":10,"Defense":10,"SpecialAttack":10,"SpecialDefense":10,"Speed":10}',
    eVs: '{"Hp":0,"Attack":0,"Defense":0,"SpecialAttack":0,"SpecialDefense":0,"Speed":0}',
  });
  const [calculationForm, setCalculationForm] = useState({
    battleId: '',
    attackerLevel: '50',
    attackStat: '120',
    movePower: '80',
    isSpecialMove: false,
    hasStab: true,
    defenseStat: '100',
    typeEffectiveness: '1',
  });

  const reloadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);

      const [nextRun, nextBattles, nextPartyState] = await Promise.all([
        fetchRun(runId),
        fetchBattles(runId),
        fetchPartyState(runId),
      ]);

      const orderedBattles = sortBattles(nextBattles);
      setRun(nextRun);
      setBattles(orderedBattles);
      setPartyState(nextPartyState);
      setRunForm({ name: nextRun.name, status: nextRun.status });
      setBattleForm((current) => {
        if (current.id) {
          const editingBattle = orderedBattles.find((battle) => battle.id === current.id);
          if (editingBattle) {
            return {
              id: editingBattle.id,
              enemyPokemon: editingBattle.enemyPokemon,
              sequence: String(editingBattle.sequence),
            };
          }
        }

        return { id: '', enemyPokemon: '', sequence: String(Math.max(orderedBattles.length + 1, 1)) };
      });
      setProgressionForm((current) => ({
        ...current,
        battleId: current.battleId || orderedBattles[0]?.id || '',
      }));
      setCalculationForm((current) => ({
        ...current,
        battleId: current.battleId || orderedBattles[0]?.id || '',
      }));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void reloadWorkspace();
  }, [reloadWorkspace]);

  const isEditable = canEditRun(run?.ownerUserId, session?.googleUserId ?? null);
  const readOnlyReason = getRunReadOnlyReason(run?.ownerUserId, session?.googleUserId ?? null);
  const mutationsDisabled = !isEditable || busyAction !== null;
  const partyStatePrerequisiteMessage = getPartyStatePrerequisiteMessage(battles.length);

  const latestBattleOptions = useMemo(
    () => battles.map((battle) => ({ value: battle.id, label: `${battle.sequence}. ${battle.enemyPokemon}` })),
    [battles],
  );

  const handleAuthRequired = useCallback(async () => {
    await signIn('google', { callbackUrl: `/pokemon-damage-calculator/runs/${runId}` });
  }, [runId]);

  const runMutation = useCallback(async <T,>(actionKey: string, action: () => Promise<T>) => {
    try {
      setBusyAction(actionKey);
      return await action();
    } finally {
      setBusyAction(null);
    }
  }, []);

  const handleRunUpdate = useCallback(async () => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const request = { name: runForm.name.trim(), status: runForm.status.trim() };
    const errors = validateUpdateRunRequest(request);
    setRunFormErrors(errors);
    if (errors.length > 0) {
      return;
    }

    try {
      await runMutation('run-update', async () => {
        await updateRun(run.id, request);
        await reloadWorkspace();
      });
      setRunFormErrors([]);
    } catch (error) {
      setRunFormErrors([getErrorMessage(error)]);
    }
  }, [handleAuthRequired, isEditable, reloadWorkspace, run, runForm, runMutation, status]);

  const handleRunDelete = useCallback(async () => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const confirmed = window.confirm('この Run を削除しますか？ Battle / Party State 参照もワークスペースから見えなくなります。');
    if (!confirmed) {
      return;
    }

    try {
      await runMutation('run-delete', async () => {
        await deleteRun(run.id);
      });
      router.push('/pokemon-damage-calculator');
      router.refresh();
    } catch (error) {
      setRunFormErrors([getErrorMessage(error)]);
    }
  }, [handleAuthRequired, isEditable, router, run, runMutation, status]);

  const handleStartBattleEdit = useCallback((battle: BattleDto) => {
    setBattleForm({
      id: battle.id,
      enemyPokemon: battle.enemyPokemon,
      sequence: String(battle.sequence),
    });
  }, []);

  const handleBattleSubmit = useCallback(async () => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const request = {
      enemyPokemon: battleForm.enemyPokemon.trim(),
      sequence: Number.parseInt(battleForm.sequence, 10),
    };
    const errors = validateBattleRequest(request);
    setBattleFormErrors(errors);
    if (errors.length > 0) {
      return;
    }

    try {
      await runMutation('battle-submit', async () => {
        if (battleForm.id) {
          await updateBattle(run.id, battleForm.id, request);
        } else {
          await createBattle(run.id, request);
        }
        await reloadWorkspace();
      });
      setBattleForm({ id: '', enemyPokemon: '', sequence: String(Math.max(battles.length + 1, 1)) });
      setBattleFormErrors([]);
    } catch (error) {
      setBattleFormErrors([getErrorMessage(error)]);
    }
  }, [battleForm, battles.length, handleAuthRequired, isEditable, reloadWorkspace, run, runMutation, status]);

  const handleBattleDelete = useCallback(async (battleId: string) => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const confirmed = window.confirm('この Battle を削除しますか？');
    if (!confirmed) {
      return;
    }

    try {
      await runMutation(`battle-delete-${battleId}`, async () => {
        await deleteBattle(run.id, battleId);
        await reloadWorkspace();
      });
      setBattleForm((current) => (current.id === battleId
        ? { id: '', enemyPokemon: '', sequence: String(Math.max(battles.length, 1)) }
        : current));
    } catch (error) {
      setBattleFormErrors([getErrorMessage(error)]);
    }
  }, [battles.length, handleAuthRequired, isEditable, reloadWorkspace, run, runMutation, status]);

  const handleProgressionSubmit = useCallback(async () => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const request = buildAddProgressionEventRequest(progressionForm);

    const errors = validateProgressionEventRequest(request);
    setPartyFormErrors(errors);
    if (errors.length > 0) {
      return;
    }

    try {
      await runMutation('party-state-submit', async () => {
        await addProgressionEvent(run.id, request);
        await reloadWorkspace();
      });
      setPartyFormErrors([]);
      setProgressionForm((current) => ({
        ...current,
        species: '',
        level: current.level,
        baseStats: '',
        iVs: '',
      }));
    } catch (error) {
      setPartyFormErrors([getErrorMessage(error)]);
    }
  }, [handleAuthRequired, isEditable, progressionForm, reloadWorkspace, run, runMutation, status]);

  const handleCalculationSubmit = useCallback(async () => {
    if (!run) {
      return;
    }

    if (!isEditable) {
      if (status !== 'authenticated') {
        await handleAuthRequired();
      }
      return;
    }

    const battleId = calculationForm.battleId;
    const request = {
      attackerLevel: Number.parseInt(calculationForm.attackerLevel, 10),
      attackStat: Number.parseInt(calculationForm.attackStat, 10),
      movePower: Number.parseInt(calculationForm.movePower, 10),
      isSpecialMove: calculationForm.isSpecialMove,
      hasStab: calculationForm.hasStab,
      defenseStat: Number.parseInt(calculationForm.defenseStat, 10),
      typeEffectiveness: Number.parseFloat(calculationForm.typeEffectiveness),
    };

    const errors = [
      ...(battleId ? [] : ['計算対象 Battle を選択してください。']),
      ...validateDamageCalculationRequest(request),
    ];
    setCalculationErrors(errors);
    if (errors.length > 0) {
      return;
    }

    try {
      const result = await runMutation('calculate-damage', async () => (
        calculateDamage(run.id, battleId, request)
      ));
      setLatestCalculation(mapCalculationResult(result));
      setCalculationErrors([]);
      await reloadWorkspace();
    } catch (error) {
      setCalculationErrors([getErrorMessage(error)]);
    }
  }, [calculationForm, handleAuthRequired, isEditable, reloadWorkspace, run, runMutation, status]);

  return (
    <PageShell
      title="Run ワークスペース"
      description="Run 詳細、Battle 管理、Party State、ダメージ計算を route 単位 state で管理し、更新後は再取得して最新状態に揃えます。"
    >
      <div className="flex items-center gap-3 text-sm">
        <Link href="/pokemon-damage-calculator" className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300">
          一覧へ戻る
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="font-mono text-zinc-500 dark:text-zinc-400">{runId}</span>
      </div>

      {pageError ? <StatusMessage tone="error">{pageError}</StatusMessage> : null}
      {readOnlyReason ? <StatusMessage tone="warning">{readOnlyReason}</StatusMessage> : null}
      {!isEditable && status === 'unauthenticated' ? (
        <StatusMessage tone="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>自分の Run を編集するには Google でログインしてください。</span>
            <CustomButton variant="ghost" onClick={() => void handleAuthRequired()} disabled={busyAction !== null}>
              Google でログイン
            </CustomButton>
          </div>
        </StatusMessage>
      ) : null}
      {busyAction ? <StatusMessage tone="info">処理中: {busyAction}</StatusMessage> : null}

      <SectionCard
        title="Run 詳細"
        description="OwnerUserId と現在セッションの googleUserId を比較し、owner のみ更新 / 削除を許可します。"
        actions={(
          <CustomButton variant="ghost" onClick={() => void reloadWorkspace()} disabled={loading}>
            再取得
          </CustomButton>
        )}
      >
        {loading && !run ? (
          <StatusMessage tone="info">Run を取得しています...</StatusMessage>
        ) : !run ? (
          <EmptyState>Run が見つかりません。</EmptyState>
        ) : (
          <div className="space-y-6">
            <DataList
              items={[
                { label: 'Run ID', value: <span className="font-mono text-xs">{run.id}</span> },
                { label: 'OwnerUserId', value: <span className="font-mono text-xs">{run.ownerUserId}</span> },
                { label: 'RuleSetId', value: <span className="font-mono text-xs">{run.ruleSetId}</span> },
                { label: 'Current User', value: <span className="font-mono text-xs">{session?.googleUserId ?? 'anonymous'}</span> },
              ]}
            />
            {runFormErrors.length > 0 ? (
              <StatusMessage tone="error">
                <ul className="list-disc pl-5">
                  {runFormErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </StatusMessage>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup label="Run 名">
                <TextInput
                  value={runForm.name}
                  disabled={mutationsDisabled}
                  onChange={(event) => setRunForm((current) => ({ ...current, name: event.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="ステータス">
                <TextInput
                  value={runForm.status}
                  disabled={mutationsDisabled}
                  onChange={(event) => setRunForm((current) => ({ ...current, status: event.target.value }))}
                />
              </FieldGroup>
            </div>
            <div className="flex flex-wrap gap-3">
              <CustomButton variant="accent" onClick={() => void handleRunUpdate()} disabled={mutationsDisabled}>
                Run を更新
              </CustomButton>
              <CustomButton variant="ghost" onClick={() => void handleRunDelete()} disabled={mutationsDisabled}>
                Run を削除
              </CustomButton>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Battle 一覧 / 編集" description="Battle は append / update / delete に対応します。更新後は一覧を再取得します。">
          {battleFormErrors.length > 0 ? (
            <StatusMessage tone="error">
              <ul className="list-disc pl-5">
                {battleFormErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </StatusMessage>
          ) : null}
          {!isEditable ? (
            <StatusMessage tone="info">
              Battle の作成 / 編集 / 削除は所有者のみ実行できます。
            </StatusMessage>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {battles.length === 0 ? (
                <EmptyState>Battle はまだありません。</EmptyState>
              ) : (
                battles.map((battle) => (
                  <article key={battle.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sequence {battle.sequence}</p>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{battle.enemyPokemon}</h3>
                        <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{battle.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CustomButton variant="ghost" onClick={() => handleStartBattleEdit(battle)} disabled={mutationsDisabled}>
                          編集
                        </CustomButton>
                        <CustomButton variant="ghost" onClick={() => void handleBattleDelete(battle.id)} disabled={mutationsDisabled}>
                          削除
                        </CustomButton>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {battleForm.id ? 'Battle を更新' : 'Battle を追加'}
              </h3>
              <FieldGroup label="敵ポケモン名">
                <TextInput
                  value={battleForm.enemyPokemon}
                  disabled={mutationsDisabled}
                  onChange={(event) => setBattleForm((current) => ({ ...current, enemyPokemon: event.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="Sequence">
                <TextInput
                  type="number"
                  min={1}
                  value={battleForm.sequence}
                  disabled={mutationsDisabled}
                  onChange={(event) => setBattleForm((current) => ({ ...current, sequence: event.target.value }))}
                />
              </FieldGroup>
              <div className="flex flex-wrap gap-3">
                <CustomButton variant="accent" onClick={() => void handleBattleSubmit()} disabled={mutationsDisabled}>
                  {battleForm.id ? 'Battle を更新' : 'Battle を追加'}
                </CustomButton>
                <CustomButton
                  variant="ghost"
                  onClick={() => setBattleForm({ id: '', enemyPokemon: '', sequence: String(Math.max(battles.length + 1, 1)) })}
                  disabled={mutationsDisabled}
                >
                  入力をクリア
                </CustomButton>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Party State" description="Party State は append-only とし、既存スナップショットは表示のみ提供します。">
          {partyFormErrors.length > 0 ? (
            <StatusMessage tone="error">
              <ul className="list-disc pl-5">
                {partyFormErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </StatusMessage>
          ) : null}
          {!isEditable ? (
            <StatusMessage tone="info">
              Party State の追加は所有者のみ実行できます。閲覧はそのまま可能です。
            </StatusMessage>
          ) : null}

          <div className="space-y-6">
            <div className="space-y-3">
              {partyState?.pokemon.length ? (
                partyState.pokemon.map((snapshot) => (
                  <article key={snapshot.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Species</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{snapshot.species}</p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Lv. {snapshot.level}</p>
                        <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">Battle: {snapshot.battleId}</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Base Stats / IVs</p>
                          <JsonPreview value={{ baseStats: safeParseJsonValue(snapshot.baseStats), iVs: safeParseJsonValue(snapshot.iVs) }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Stats / EVs</p>
                          <JsonPreview value={{ stats: safeParseJsonValue(snapshot.stats), eVs: safeParseJsonValue(snapshot.eVs) }} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState>Party State はまだ登録されていません。</EmptyState>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">進行イベントを追加</h3>
              {partyStatePrerequisiteMessage ? (
                <div className="mt-4">
                  <StatusMessage tone="info">{partyStatePrerequisiteMessage}</StatusMessage>
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FieldGroup label="Battle">
                  <SelectInput
                    value={progressionForm.battleId}
                    disabled={mutationsDisabled || latestBattleOptions.length === 0}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, battleId: event.target.value }))}
                  >
                    <option value="">Battle を選択</option>
                    {latestBattleOptions.map((battle) => (
                      <option key={battle.value} value={battle.value}>{battle.label}</option>
                    ))}
                  </SelectInput>
                </FieldGroup>
                <FieldGroup label="種族名">
                  <TextInput
                    value={progressionForm.species}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, species: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="レベル">
                  <TextInput
                    type="number"
                    min={1}
                    max={100}
                    value={progressionForm.level}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, level: event.target.value }))}
                  />
                </FieldGroup>
                <div />
                <FieldGroup label="Base Stats JSON" hint="省略可">
                  <TextAreaInput
                    rows={4}
                    value={progressionForm.baseStats}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, baseStats: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="IVs JSON" hint="省略可">
                  <TextAreaInput
                    rows={4}
                    value={progressionForm.iVs}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, iVs: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="Stats JSON">
                  <TextAreaInput
                    rows={4}
                    value={progressionForm.stats}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, stats: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="EVs JSON">
                  <TextAreaInput
                    rows={4}
                    value={progressionForm.eVs}
                    disabled={mutationsDisabled}
                    onChange={(event) => setProgressionForm((current) => ({ ...current, eVs: event.target.value }))}
                  />
                </FieldGroup>
              </div>
              <div className="mt-4">
                <CustomButton variant="accent" onClick={() => void handleProgressionSubmit()} disabled={mutationsDisabled || latestBattleOptions.length === 0}>
                  進行イベントを追加
                </CustomButton>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Damage Calculation" description="Battle を選択してダメージ計算を実行し、レスポンスをその場で表示します。">
        {calculationErrors.length > 0 ? (
          <StatusMessage tone="error">
            <ul className="list-disc pl-5">
              {calculationErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </StatusMessage>
        ) : null}
        {!isEditable ? (
          <StatusMessage tone="info">
            ダメージ計算の実行は所有者のみ可能です。結果の閲覧は継続できます。
          </StatusMessage>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <FieldGroup label="Battle">
              <SelectInput
                value={calculationForm.battleId}
                disabled={mutationsDisabled || latestBattleOptions.length === 0}
                onChange={(event) => setCalculationForm((current) => ({ ...current, battleId: event.target.value }))}
              >
                <option value="">Battle を選択</option>
                {latestBattleOptions.map((battle) => (
                  <option key={battle.value} value={battle.value}>{battle.label}</option>
                ))}
              </SelectInput>
            </FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup label="Attacker Level">
                  <TextInput
                    type="number"
                    value={calculationForm.attackerLevel}
                    disabled={mutationsDisabled}
                    onChange={(event) => setCalculationForm((current) => ({ ...current, attackerLevel: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="Attack Stat">
                  <TextInput
                    type="number"
                    value={calculationForm.attackStat}
                    disabled={mutationsDisabled}
                    onChange={(event) => setCalculationForm((current) => ({ ...current, attackStat: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="Move Power">
                  <TextInput
                    type="number"
                    value={calculationForm.movePower}
                    disabled={mutationsDisabled}
                    onChange={(event) => setCalculationForm((current) => ({ ...current, movePower: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="Defense Stat">
                  <TextInput
                    type="number"
                    value={calculationForm.defenseStat}
                    disabled={mutationsDisabled}
                    onChange={(event) => setCalculationForm((current) => ({ ...current, defenseStat: event.target.value }))}
                  />
                </FieldGroup>
                <FieldGroup label="Type Effectiveness">
                  <TextInput
                    type="number"
                    step="0.25"
                    value={calculationForm.typeEffectiveness}
                    disabled={mutationsDisabled}
                    onChange={(event) => setCalculationForm((current) => ({ ...current, typeEffectiveness: event.target.value }))}
                  />
                </FieldGroup>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={calculationForm.isSpecialMove}
                  disabled={mutationsDisabled}
                  onChange={(event) => setCalculationForm((current) => ({ ...current, isSpecialMove: event.target.checked }))}
                />
                特殊技
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={calculationForm.hasStab}
                  disabled={mutationsDisabled}
                  onChange={(event) => setCalculationForm((current) => ({ ...current, hasStab: event.target.checked }))}
                />
                STAB あり
              </label>
            </div>
            <CustomButton variant="accent" onClick={() => void handleCalculationSubmit()} disabled={mutationsDisabled || latestBattleOptions.length === 0}>
              ダメージ計算を実行
            </CustomButton>
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">最新結果</h3>
            {!latestCalculation ? (
              <EmptyState>計算を実行すると、Damage Rolls と送信パラメータをここに表示します。</EmptyState>
            ) : (
              <div className="space-y-4">
                <DataList
                  items={[
                    { label: 'Result ID', value: <span className="font-mono text-xs">{latestCalculation.id}</span> },
                    { label: 'Battle ID', value: <span className="font-mono text-xs">{latestCalculation.battleId}</span> },
                    { label: 'Damage Rolls', value: latestCalculation.damageRolls.join(', ') },
                  ]}
                />
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Attacker Params</p>
                  <JsonPreview value={latestCalculation.parsedAttackerParams ?? latestCalculation.attackerParams} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Defender Params</p>
                  <JsonPreview value={latestCalculation.parsedDefenderParams ?? latestCalculation.defenderParams} />
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}

