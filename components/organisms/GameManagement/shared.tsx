'use client';

import { useId } from 'react';

import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import AdminContentNavigation from '@/components/molecules/AdminContentNavigation';
import type { LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import { buildMaintenanceSummaryText } from '@/lib/game-management/maintenance';
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
import { RESOURCE_DEFINITIONS, USER_RESOURCE_ORDER } from '@/lib/game-management/resources';

const GAME_LIBRARY_NAVIGATION_ITEMS = [
  { href: '/game-library/save-data-search', label: 'セーブデータ検索' },
  { href: '/game-library/maintenance', label: 'メンテナンス' },
  { href: '/game-library', label: 'ダッシュボード' },
  ...USER_RESOURCE_ORDER.map((key) => ({
    href: `/game-library/${key}`,
    label: RESOURCE_DEFINITIONS[key].shortLabel,
  })),
];

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
    <div className="notice select-none text-sm leading-6" role="note">
      <p className="m-0 font-semibold text-[var(--color-text-strong)]">トライアルモード</p>
      <p className="m-0">データはこのブラウザの localStorage に保存されます。ログインするとサーバーに保存できます。</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageSection
// ---------------------------------------------------------------------------

/**
 * ツール画面のセクション。カードで囲まず、見出し（h2）でセクションを区切る。
 */
export function PageSection({
  title,
  description,
  actions,
  headingLevel = 2,
  className = '',
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  children?: React.ReactNode;
}) {
  const headingId = useId();

  return (
    <section className={['tool-section', className].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <div className="tool-section__header">
        <CustomHeader level={headingLevel} id={headingId}>{title}</CustomHeader>
        {actions ? <div className="tool-toolbar">{actions}</div> : null}
      </div>
      {description ? <p className="tool-section__lead">{description}</p> : null}
      {children ? <div className="tool-section__body">{children}</div> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// PageFrame
// ---------------------------------------------------------------------------

/**
 * ツール画面の外枠。ブログ等と同じ page-container / page-header 構成で、
 * サイト共通の本文幅をそのまま使う（独自の余白や最大幅で狭めない）。
 */
export function PageFrame({
  eyebrowLabel = '',
  title,
  description,
  actions,
  stickyActions,
  layoutMode = 'desktop',
  navigationActiveHref,
  children,
}: {
  eyebrowLabel?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  stickyActions?: React.ReactNode;
  layoutMode?: LayoutMode;
  navigationActiveHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={['page-container tool-page', stickyActions ? 'tool-page--has-sticky-actions' : ''].filter(Boolean).join(' ')}>
      {navigationActiveHref ? (
        <AdminContentNavigation
          ariaLabel="ゲームライブラリメニュー"
          current={navigationActiveHref}
          homeLink={null}
          items={GAME_LIBRARY_NAVIGATION_ITEMS}
        />
      ) : null}
      <header className="page-header">
        {eyebrowLabel ? <p className="tool-page__eyebrow">{eyebrowLabel}</p> : null}
        <CustomHeader level={1}>{title}</CustomHeader>
        <p className="page-lead select-none">{description}</p>
        {actions ? (
          <div className="tool-page__actions" data-layout-mode={layoutMode}>
            {actions}
          </div>
        ) : null}
      </header>
      <div className="tool-page__body">{children}</div>
      {stickyActions ? (
        <div className="tool-sticky-actions" role="group" aria-label="ページ操作">
          {stickyActions}
        </div>
      ) : null}
      {stickyActions ? (
        <style jsx global>{`
          .tool-page--has-sticky-actions {
            padding-block-end: 7.5rem;
          }

          .tool-sticky-actions {
            position: fixed;
            z-index: 20;
            inset-inline-end: max(1rem, env(safe-area-inset-right, 0px));
            inset-block-end: max(1rem, env(safe-area-inset-bottom, 0px));
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border: 1px solid var(--color-base-70-dark);
            border-radius: 0.75rem;
            padding: 0.5rem;
            background: color-mix(in srgb, white 94%, var(--color-base-70));
            box-shadow: 0 0.5rem 1.5rem rgba(31, 31, 42, 0.18);
          }

          @media (max-width: 640px) {
            .tool-sticky-actions {
              inset-inline: max(0.75rem, env(safe-area-inset-left, 0px));
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              justify-content: stretch;
            }

            .tool-sticky-actions :global(.custom-button) {
              width: 100%;
              min-width: 0;
            }

            .tool-sticky-actions :global(.custom-button__label) {
              overflow-wrap: anywhere;
            }
          }
        `}</style>
      ) : null}
    </main>
  );
}

// ---------------------------------------------------------------------------
// actionLinkClasses
// ---------------------------------------------------------------------------

export function actionLinkClasses(variant: 'default' | 'accent' = 'default'): string {
  if (variant === 'accent') {
    return 'button-link';
  }

  return 'button-link button-link--secondary';
}

// ---------------------------------------------------------------------------
// ResourceSummary
// ---------------------------------------------------------------------------

export function ResourceSummary({ resourceKey, record, lookups, storyProgressLabel }: { resourceKey: ResourceKey; record: unknown; lookups: ManagementLookups; storyProgressLabel?: string | null }) {
  switch (resourceKey) {
    case 'account-type-masters': {
      const item = record as AccountTypeMasterDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">略称: {item.abbreviation} / カテゴリ: {item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups)).join(', ') || '未設定'}</p>;
    }
    case 'accounts': {
      const item = record as AccountDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">種類: {getAccountTypeMasterName(item.accountTypeMasterId, lookups)}</p>;
    }
    case 'game-console-categories': {
      const item = record as GameConsoleCategoryDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">略称: {item.abbreviation} / 保存方式: {formatSaveStorageType(item.saveStorageType)}</p>;
    }
    case 'game-console-masters': {
      const item = record as GameConsoleMasterDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-console-edition-masters': {
      const item = record as GameConsoleEditionMasterDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">略称: {item.abbreviation} / マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}</p>;
    }
    case 'game-consoles': {
      const item = record as GameConsoleDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">対応マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)} / {buildMaintenanceSummaryText(item.maintenance)}</p>;
    }
    case 'game-software-masters': {
      const item = record as GameSoftwareMasterDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-softwares': {
      const item = record as GameSoftwareDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">ソフトマスタ: {getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups)} / {buildMaintenanceSummaryText(item.maintenance)}</p>;
    }
    case 'memory-cards': {
      const item = record as MemoryCardDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">所有者: {item.ownerGoogleUserId} / {buildMaintenanceSummaryText(item.maintenance)}</p>;
    }
    case 'save-datas': {
      const item = record as SaveDataDto;
      return <p className="select-none text-sm text-[var(--color-text-muted)]">保存方式: {formatSaveStorageType(item.saveStorageType)}{storyProgressLabel ? ` / 進行度: ${storyProgressLabel}` : ''}</p>;
    }
    default:
      return null;
  }
}
