'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import {
  FieldGroup,
  SelectInput,
  StatusMessage,
  TextAreaInput,
  TextInput,
} from '@/components/organisms/PokemonDamageCalculator/shared';
import { AdminPageShell, AdminStateMessage, AdminSectionCard } from './shared';
import {
  createAdminRuleSet,
  deleteAdminRuleSet,
  fetchAdminRuleSet,
  getAdminApiErrorMessage,
  getAdminProblemDetailsMessage,
  isAdminApiForbidden,
  isAdminApiNotFound,
  isAdminApiUnauthorized,
  updateAdminRuleSet,
} from '@/lib/pokemon-damage-calculator/admin/api';
import { canManageRuleSets, probeAdminCapability } from '@/lib/pokemon-damage-calculator/admin/capability';
import { getAdminRuleSetPath, getAdminRuleSetsPath } from '@/lib/pokemon-damage-calculator/admin/routes';
import {
  ADMIN_RULE_SET_STATUSES,
  type AdminCapability,
} from '@/lib/pokemon-damage-calculator/admin/constants';
import type {
  AdminRuleSetDto,
  AdminRuleSetFormState,
  AdminRuleSetUpsertRequest,
} from '@/lib/pokemon-damage-calculator/admin/types';
import { validateAdminRuleSetForm } from '@/lib/pokemon-damage-calculator/admin/validation';

function createEmptyForm(): AdminRuleSetFormState {
  return {
    slug: '',
    generation: '1',
    title: '',
    version: '',
    status: 'Draft',
    summary: '',
  };
}

function formFromRuleSet(ruleSet: AdminRuleSetDto): AdminRuleSetFormState {
  return {
    slug: ruleSet.slug,
    generation: String(ruleSet.generation),
    title: ruleSet.title,
    version: ruleSet.version,
    status: ruleSet.status,
    summary: ruleSet.summary,
  };
}

function toRequest(form: AdminRuleSetFormState): AdminRuleSetUpsertRequest {
  return {
    slug: form.slug.trim(),
    generation: Number.parseInt(form.generation, 10),
    title: form.title.trim(),
    version: form.version.trim(),
    status: form.status,
    summary: form.summary.trim(),
  };
}

export function AdminRuleSetEditorPage({ ruleSetId }: { ruleSetId?: string }) {
  const router = useRouter();
  const { status } = useSession();
  const isNew = !ruleSetId;
  const [capability, setCapability] = useState<AdminCapability | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<unknown>(null);
  const [record, setRecord] = useState<AdminRuleSetDto | null>(null);
  const [form, setForm] = useState<AdminRuleSetFormState>(createEmptyForm());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCapability = async () => {
      if (status === 'loading') {
        return;
      }

      try {
        setCapabilityLoading(true);
        const nextCapability = await probeAdminCapability(status === 'authenticated');
        if (!cancelled) {
          setCapability(nextCapability);
        }
      } catch (error) {
        if (!cancelled) {
          setRecordError(error);
        }
      } finally {
        if (!cancelled) {
          setCapabilityLoading(false);
        }
      }
    };

    void loadCapability();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (isNew || !capability || !canManageRuleSets(capability)) {
      return;
    }

    if (!ruleSetId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setRecordLoading(true);
        setRecordError(null);
        const nextRecord = await fetchAdminRuleSet(ruleSetId);
        if (cancelled) {
          return;
        }

        setRecord(nextRecord);
        setForm(formFromRuleSet(nextRecord));
      } catch (error) {
        if (!cancelled) {
          setRecordError(error);
        }
      } finally {
        if (!cancelled) {
          setRecordLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [capability, isNew, ruleSetId]);

  const pageTitle = isNew ? 'RuleSet 新規作成' : 'RuleSet 詳細 / 更新';

  const localizedError = useMemo(() => {
    if (!recordError) {
      return null;
    }

    if (isAdminApiUnauthorized(recordError)) {
      return 'セッションの有効期限が切れています。ログインし直してください。';
    }

    if (isAdminApiForbidden(recordError)) {
      return 'RuleSet 管理の権限がありません。';
    }

    if (isAdminApiNotFound(recordError)) {
      return isNew ? null : getAdminProblemDetailsMessage((recordError as { details?: unknown }).details, '指定した RuleSet は見つかりません。');
    }

    return getAdminApiErrorMessage(recordError, 'RuleSet の読み込みに失敗しました。');
  }, [isNew, recordError]);

  const canEdit = capability ? canManageRuleSets(capability) : false;

  const submit = useCallback(async () => {
    const errors = validateAdminRuleSetForm(form);
    setValidationErrors(errors);
    setServerMessage(null);
    if (errors.length > 0 || !canEdit) {
      return;
    }

    try {
      setSubmitting(true);
      const request = toRequest(form);
      const nextRecord = isNew
        ? await createAdminRuleSet(request)
        : await updateAdminRuleSet(ruleSetId as string, request);
      setRecord(nextRecord);
      setForm(formFromRuleSet(nextRecord));
      setServerMessage('保存しました。');
      setDeleteOpen(false);
      if (isNew) {
        router.push(getAdminRuleSetPath(nextRecord.id));
      }
    } catch (error) {
      setServerMessage(getAdminProblemDetailsMessage((error as { details?: unknown }).details, getAdminApiErrorMessage(error, '保存に失敗しました。')));
    } finally {
      setSubmitting(false);
    }
  }, [canEdit, form, isNew, router, ruleSetId]);

  const handleDelete = useCallback(async () => {
    if (!record || !ruleSetId) {
      return;
    }

    try {
      setSubmitting(true);
      setServerMessage(null);
      await deleteAdminRuleSet(ruleSetId);
      router.push(getAdminRuleSetsPath());
    } catch (error) {
      setServerMessage(getAdminProblemDetailsMessage((error as { details?: unknown }).details, getAdminApiErrorMessage(error, '削除に失敗しました。')));
    } finally {
      setSubmitting(false);
    }
  }, [record, router, ruleSetId]);

  if (status === 'loading' || capabilityLoading) {
    return (
      <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
        <AdminStateMessage title="アクセス権限を確認しています..." />
      </AdminPageShell>
    );
  }

  if (!capability) {
    if (isAdminApiUnauthorized(recordError)) {
      return (
        <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
          <AdminStateMessage
            title="再ログインしてください。"
            detail="セッションの有効期限が切れています。ログインし直してください。"
            signInCallbackUrl={isNew ? getAdminRuleSetsPath() : getAdminRuleSetPath(ruleSetId ?? '')}
          />
        </AdminPageShell>
      );
    }

    return (
      <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
        <AdminStateMessage
          tone="error"
          title="アクセス権限の確認に失敗しました。"
          detail={localizedError ?? '権限情報を取得できませんでした。'}
        />
      </AdminPageShell>
    );
  }

  if (status !== 'authenticated') {
    return (
      <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
        <AdminStateMessage
          title="ログインしてください。"
          detail="RuleSet 管理を利用するには Google ログインが必要です。"
          signInCallbackUrl={isNew ? getAdminRuleSetsPath() : getAdminRuleSetPath(ruleSetId ?? '')}
        />
      </AdminPageShell>
    );
  }

  if (!canEdit) {
    return (
      <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
        <AdminStateMessage
          tone="warning"
          title="RuleSet 管理の権限がありません。"
          detail="MasterEditor 以上のアカウントでログインしてください。"
        />
      </AdminPageShell>
    );
  }

  if (!isNew && isAdminApiNotFound(recordError)) {
    return (
      <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
        <AdminStateMessage
          tone="warning"
          title="指定した RuleSet は見つかりません。"
          detail="一覧に戻って別の RuleSet を選択してください。"
          signInCallbackUrl={getAdminRuleSetsPath()}
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={pageTitle} description="管理用 RuleSet を作成・更新します。">
      <div className="flex flex-wrap gap-3">
        <CustomButton variant="ghost" onClick={() => router.push(getAdminRuleSetsPath())}>
          一覧へ戻る
        </CustomButton>
        {!isNew ? (
          <CustomButton variant="ghost" onClick={() => setDeleteOpen((current) => !current)} disabled={submitting}>
            {deleteOpen ? '削除を閉じる' : '削除'}
          </CustomButton>
        ) : null}
      </div>

      {recordLoading ? <AdminStateMessage title="RuleSet を読み込んでいます..." /> : null}
      {serverMessage ? <AdminStateMessage tone="success" title={serverMessage} /> : null}
      {localizedError ? <AdminStateMessage tone="error" title="読み込みに失敗しました。" detail={localizedError} /> : null}
      {validationErrors.length > 0 ? (
        <StatusMessage tone="error">
          <ul className="list-disc pl-5">
            {validationErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </StatusMessage>
      ) : null}

      <AdminSectionCard title="RuleSet フォーム" description="backend request DTO と 1 対 1 で対応します。">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="slug">
            <TextInput value={form.slug} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
          </FieldGroup>
          <FieldGroup label="generation">
            <TextInput type="number" min={1} value={form.generation} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, generation: event.target.value }))} />
          </FieldGroup>
          <FieldGroup label="title">
            <TextInput value={form.title} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </FieldGroup>
          <FieldGroup label="version">
            <TextInput value={form.version} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} />
          </FieldGroup>
          <FieldGroup label="status">
            <SelectInput value={form.status} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminRuleSetFormState['status'] }))}>
              {ADMIN_RULE_SET_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </SelectInput>
          </FieldGroup>
        </div>
        <FieldGroup label="summary" hint="backend の summary にそのまま保存します。">
          <TextAreaInput
            rows={6}
            value={form.summary}
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
          />
        </FieldGroup>

        <div className="mt-4 flex flex-wrap gap-3">
          <CustomButton variant="accent" onClick={() => void submit()} disabled={submitting}>
            {isNew ? '作成' : '更新'}
          </CustomButton>
        </div>
      </AdminSectionCard>

      {!isNew ? (
        <AdminSectionCard title="削除確認" description="参照中の RuleSet は backend が 409 Conflict で拒否します。">
          {record?.isReferencedByRuns ? (
            <AdminStateMessage
              tone="warning"
              title="この RuleSet は Run から参照されています。"
              detail="削除すると 409 Conflict になる可能性があります。参照を外してから削除してください。"
            />
          ) : null}
          {deleteOpen ? (
            <div className="flex flex-wrap gap-3">
              <CustomButton variant="accent" onClick={() => void handleDelete()} disabled={submitting}>
                削除を実行
              </CustomButton>
              <CustomButton variant="ghost" onClick={() => setDeleteOpen(false)} disabled={submitting}>
                キャンセル
              </CustomButton>
            </div>
          ) : null}
        </AdminSectionCard>
      ) : null}
    </AdminPageShell>
  );
}

