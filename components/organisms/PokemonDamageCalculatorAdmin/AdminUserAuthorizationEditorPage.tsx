'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import {
  FieldGroup,
  SelectInput,
  StatusMessage,
  TextInput,
} from '@/components/organisms/PokemonDamageCalculator/shared';
import { AdminPageShell, AdminStateMessage, AdminSectionCard } from './shared';
import {
  createAdminUserAuthorization,
  deleteAdminUserAuthorization,
  fetchAdminUserAuthorization,
  getAdminApiErrorMessage,
  getAdminProblemDetailsMessage,
  isAdminApiForbidden,
  isAdminApiNotFound,
  isAdminApiUnauthorized,
  updateAdminUserAuthorization,
} from '@/lib/pokemon-damage-calculator/admin/api';
import { canManageUserAuthorizations, probeAdminCapability } from '@/lib/pokemon-damage-calculator/admin/capability';
import { getAdminUserAuthorizationsPath, getAdminUserAuthorizationPath } from '@/lib/pokemon-damage-calculator/admin/routes';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  type AdminCapability,
  type AdminPermission,
} from '@/lib/pokemon-damage-calculator/admin/constants';
import type {
  AdminUserAuthorizationDto,
  AdminUserAuthorizationFormState,
  AdminUserAuthorizationUpsertRequest,
} from '@/lib/pokemon-damage-calculator/admin/types';
import { toggleAdminPermission, validateAdminUserAuthorizationForm } from '@/lib/pokemon-damage-calculator/admin/validation';

function createEmptyForm(): AdminUserAuthorizationFormState {
  return {
    googleUserId: '',
    role: 'Member',
    permissions: ['masters.view'],
  };
}

function formFromDto(dto: AdminUserAuthorizationDto): AdminUserAuthorizationFormState {
  return {
    googleUserId: dto.googleUserId,
    role: dto.role,
    permissions: dto.permissions,
  };
}

function toRequest(form: AdminUserAuthorizationFormState): AdminUserAuthorizationUpsertRequest {
  return {
    googleUserId: form.googleUserId.trim(),
    role: form.role,
    permissions: form.permissions,
  };
}

export function AdminUserAuthorizationEditorPage({ googleUserId }: { googleUserId?: string }) {
  const router = useRouter();
  const { status } = useSession();
  const isNew = !googleUserId;
  const [capability, setCapability] = useState<AdminCapability | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<unknown>(null);
  const [record, setRecord] = useState<AdminUserAuthorizationDto | null>(null);
  const [form, setForm] = useState<AdminUserAuthorizationFormState>(createEmptyForm());
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
    if (isNew || !capability || !canManageUserAuthorizations(capability)) {
      return;
    }

    if (!googleUserId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setRecordLoading(true);
        setRecordError(null);
        const nextRecord = await fetchAdminUserAuthorization(googleUserId);
        if (cancelled) {
          return;
        }

        setRecord(nextRecord);
        setForm(formFromDto(nextRecord));
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
  }, [capability, googleUserId, isNew]);

  const pageTitle = isNew ? 'UserAuthorization 新規作成' : 'UserAuthorization 詳細 / 更新';

  const localizedError = useMemo(() => {
    if (!recordError) {
      return null;
    }

    if (isAdminApiUnauthorized(recordError)) {
      return 'セッションの有効期限が切れています。ログインし直してください。';
    }

    if (isAdminApiForbidden(recordError)) {
      return 'UserAuthorization 管理の権限がありません。';
    }

    if (isAdminApiNotFound(recordError)) {
      return isNew ? null : getAdminProblemDetailsMessage((recordError as { details?: unknown }).details, '指定した UserAuthorization は見つかりません。');
    }

    return getAdminApiErrorMessage(recordError, 'UserAuthorization の読み込みに失敗しました。');
  }, [isNew, recordError]);

  const canEdit = capability ? canManageUserAuthorizations(capability) : false;

  const submit = useCallback(async () => {
    const errors = validateAdminUserAuthorizationForm(form);
    setValidationErrors(errors);
    setServerMessage(null);
    if (errors.length > 0 || !canEdit) {
      return;
    }

    try {
      setSubmitting(true);
      const request = toRequest(form);
      const nextRecord = isNew
        ? await createAdminUserAuthorization(request)
        : await updateAdminUserAuthorization(googleUserId as string, request);
      setRecord(nextRecord);
      setForm(formFromDto(nextRecord));
      setServerMessage('保存しました。');
      setDeleteOpen(false);
      if (isNew) {
        router.push(getAdminUserAuthorizationPath(nextRecord.googleUserId));
      }
    } catch (error) {
      setServerMessage(getAdminProblemDetailsMessage((error as { details?: unknown }).details, getAdminApiErrorMessage(error, '保存に失敗しました。')));
    } finally {
      setSubmitting(false);
    }
  }, [canEdit, form, isNew, router, googleUserId]);

  const handleDelete = useCallback(async () => {
    if (!record || !googleUserId) {
      return;
    }

    try {
      setSubmitting(true);
      setServerMessage(null);
      await deleteAdminUserAuthorization(googleUserId);
      router.push(getAdminUserAuthorizationsPath());
    } catch (error) {
      setServerMessage(getAdminProblemDetailsMessage((error as { details?: unknown }).details, getAdminApiErrorMessage(error, '削除に失敗しました。')));
    } finally {
      setSubmitting(false);
    }
  }, [googleUserId, record, router]);

  if (status === 'loading' || capabilityLoading) {
    return (
      <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
        <AdminStateMessage title="アクセス権限を確認しています..." />
      </AdminPageShell>
    );
  }

  if (!capability) {
    if (isAdminApiUnauthorized(recordError)) {
      return (
        <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
          <AdminStateMessage
            title="再ログインしてください。"
            detail="セッションの有効期限が切れています。ログインし直してください。"
            signInCallbackUrl={isNew ? getAdminUserAuthorizationsPath() : getAdminUserAuthorizationPath(googleUserId ?? '')}
          />
        </AdminPageShell>
      );
    }

    return (
      <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
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
      <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
        <AdminStateMessage
          title="ログインしてください。"
          detail="UserAuthorization 管理を利用するには Google ログインが必要です。"
          signInCallbackUrl={isNew ? getAdminUserAuthorizationsPath() : getAdminUserAuthorizationPath(googleUserId ?? '')}
        />
      </AdminPageShell>
    );
  }

  if (!canEdit) {
    return (
      <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
        <AdminStateMessage
          tone="warning"
          title="UserAuthorization 管理の権限がありません。"
          detail="Administrator でログインしてください。"
        />
      </AdminPageShell>
    );
  }

  if (!isNew && isAdminApiNotFound(recordError)) {
    return (
      <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
        <AdminStateMessage
          tone="warning"
          title="指定した UserAuthorization は見つかりません。"
          detail="一覧に戻って別のユーザーを選択してください。"
          signInCallbackUrl={getAdminUserAuthorizationsPath()}
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={pageTitle} description="Google ユーザーの role と permissions を管理します。">
      <div className="flex flex-wrap gap-3">
        <CustomButton variant="ghost" onClick={() => router.push(getAdminUserAuthorizationsPath())}>
          一覧へ戻る
        </CustomButton>
        {!isNew ? (
          <CustomButton variant="ghost" onClick={() => setDeleteOpen((current) => !current)} disabled={submitting}>
            {deleteOpen ? '削除を閉じる' : '削除'}
          </CustomButton>
        ) : null}
      </div>

      {recordLoading ? <AdminStateMessage title="UserAuthorization を読み込んでいます..." /> : null}
      {serverMessage ? <AdminStateMessage tone="success" title={serverMessage} /> : null}
      {localizedError ? <AdminStateMessage tone="error" title="読み込みに失敗しました。" detail={localizedError} /> : null}
      {validationErrors.length > 0 ? (
        <StatusMessage tone="error">
          <ul className="list-disc pl-5">
            {validationErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </StatusMessage>
      ) : null}

      <AdminSectionCard title="UserAuthorization フォーム" description="backend request DTO と 1 対 1 で対応します。">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="googleUserId">
            <TextInput value={form.googleUserId} disabled={submitting || !isNew} onChange={(event) => setForm((current) => ({ ...current, googleUserId: event.target.value }))} />
          </FieldGroup>
          <FieldGroup label="role">
            <SelectInput value={form.role} disabled={submitting} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AdminUserAuthorizationFormState['role'] }))}>
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </SelectInput>
          </FieldGroup>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">permissions</p>
          <div className="grid gap-2 md:grid-cols-3">
            {ADMIN_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  disabled={submitting}
                  onChange={() => setForm((current) => ({ ...current, permissions: toggleAdminPermission(current.permissions, permission as AdminPermission) }))}
                />
                <span>{permission}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <CustomButton variant="accent" onClick={() => void submit()} disabled={submitting}>
            {isNew ? '作成' : '更新'}
          </CustomButton>
        </div>
      </AdminSectionCard>

      {!isNew ? (
        <AdminSectionCard title="削除確認" description="最後の Administrator は backend が 409 Conflict で保護します。">
          {record?.isLastAdministrator ? (
            <AdminStateMessage
              tone="warning"
              title="このユーザーは最後の Administrator です。"
              detail="role 変更または削除は 409 Conflict になる可能性があります。"
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

