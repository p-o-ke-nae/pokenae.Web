'use client';

import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import type { LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import type {
  AccountDto,
  AccountTypeMasterDto,
  GameConsoleCategoryDto,
  GameConsoleDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameSoftwareDto,
  GameSoftwareMasterDto,
  ManagementLookups,
  MemoryCardDto,
  ResourceKey,
  SaveDataDto,
  SelectOption,
} from '@/lib/game-management/types';
import {
  getAccountTypeMasterName,
  getGameConsoleCategoryName,
  getGameConsoleMasterName,
  getGameSoftwareMasterName,
} from './helpers';
import { shouldRenderSelectPlaceholder } from './select-utils';

// ---------------------------------------------------------------------------
// SelectField
// ---------------------------------------------------------------------------

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  displayOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  displayOnly?: boolean;
}) {
  const renderPlaceholder = shouldRenderSelectPlaceholder(options, placeholder);

  return (
    <div className="space-y-2">
      <CustomLabel htmlFor={id}>{label}</CustomLabel>
      <CustomComboBox id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} displayOnly={displayOnly}>
        {renderPlaceholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </CustomComboBox>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrialBanner
// ---------------------------------------------------------------------------

export function TrialBanner() {
  return (
    <div className="select-none rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <p className="font-semibold">トライアルモード</p>
      <p>データはこのブラウザの localStorage に保存されます。ログインするとサーバーに保存できます。</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageCard
// ---------------------------------------------------------------------------

export function PageCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">{children}</div>;
}

// ---------------------------------------------------------------------------
// PageFrame
// ---------------------------------------------------------------------------

export function PageFrame({
  eyebrowLabel = 'Game Management',
  title,
  description,
  actions,
  layoutMode = 'desktop',
  children,
}: {
  eyebrowLabel?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  layoutMode?: LayoutMode;
  children: React.ReactNode;
}) {
  const headerLayoutClasses = 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between';

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className={headerLayoutClasses}>
            <div className="space-y-3">
              <p className="select-none text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrowLabel}</p>
              <CustomHeader level={1}>{title}</CustomHeader>
              <p className="select-none max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
            </div>
            {actions ? (
              <ResponsiveActionGroup
                layoutMode={layoutMode}
                mobileColumns={1}
                align="end"
                className="w-full sm:w-auto"
              >
                {actions}
              </ResponsiveActionGroup>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// actionLinkClasses
// ---------------------------------------------------------------------------

export function actionLinkClasses(variant: 'default' | 'accent' = 'default'): string {
  if (variant === 'accent') {
    return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-25-strong)] bg-[var(--color-accent-25)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] shadow-sm transition hover:opacity-90';
  }

  return 'text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300';
}

// ---------------------------------------------------------------------------
// ResourceSummary
// ---------------------------------------------------------------------------

export function ResourceSummary({ resourceKey, record, lookups, storyProgressLabel }: { resourceKey: ResourceKey; record: unknown; lookups: ManagementLookups; storyProgressLabel?: string | null }) {
  switch (resourceKey) {
    case 'account-type-masters': {
      const item = record as AccountTypeMasterDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / カテゴリ: {item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups)).join(', ') || '未設定'}</p>;
    }
    case 'accounts': {
      const item = record as AccountDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">種類: {getAccountTypeMasterName(item.accountTypeMasterId, lookups)}</p>;
    }
    case 'game-console-categories': {
      const item = record as GameConsoleCategoryDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / 保存方式: {formatSaveStorageType(item.saveStorageType)}</p>;
    }
    case 'game-console-masters': {
      const item = record as GameConsoleMasterDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-console-edition-masters': {
      const item = record as GameConsoleEditionMasterDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}</p>;
    }
    case 'game-consoles': {
      const item = record as GameConsoleDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">対応マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}</p>;
    }
    case 'game-software-masters': {
      const item = record as GameSoftwareMasterDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-softwares': {
      const item = record as GameSoftwareDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">ソフトマスタ: {getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups)}</p>;
    }
    case 'memory-cards': {
      const item = record as MemoryCardDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">所有者: {item.ownerGoogleUserId}</p>;
    }
    case 'save-datas': {
      const item = record as SaveDataDto;
      return <p className="select-none text-sm text-zinc-600 dark:text-zinc-300">保存方式: {formatSaveStorageType(item.saveStorageType)}{storyProgressLabel ? ` / 進行度: ${storyProgressLabel}` : ''}</p>;
    }
    default:
      return null;
  }
}
