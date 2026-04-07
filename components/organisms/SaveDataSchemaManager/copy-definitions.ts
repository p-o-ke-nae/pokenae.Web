import {
  SAVE_DATA_FIELD_TYPE_NAMES,
} from '../../../lib/game-management/save-data-fields';
import type {
  CreateSaveDataFieldDefinitionRequest,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
} from '../../../lib/game-management/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CopyPlanItem = {
  definition: SaveDataFieldDefinitionDto;
  action: 'copy' | 'skip';
  skipReason?: string;
};

export type CopyResultItem = {
  definition: SaveDataFieldDefinitionDto;
  outcome: 'created' | 'skipped' | 'failed';
  error?: string;
};

export type CopySummary = {
  created: number;
  skipped: number;
  failed: number;
  results: CopyResultItem[];
};

export function normalizeFieldKeyForComparison(fieldKey: string): string {
  return fieldKey.trim().toLocaleLowerCase();
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * 複写計画を作成する。
 * source definitions を displayOrder 昇順でソートし、target 側に同一 fieldKey が
 * あるものは skip にする。
 */
export function buildCopyPlan(
  sourceDefinitions: SaveDataFieldDefinitionDto[],
  targetDefinitions: SaveDataFieldDefinitionDto[],
): CopyPlanItem[] {
  const targetFieldKeys = new Set(targetDefinitions.map((d) => normalizeFieldKeyForComparison(d.fieldKey)));

  return [...sourceDefinitions]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((definition) => {
      if (targetFieldKeys.has(normalizeFieldKeyForComparison(definition.fieldKey))) {
        return {
          definition,
          action: 'skip' as const,
          skipReason: `fieldKey "${definition.fieldKey}" は複写先に既に存在します。`,
        };
      }
      return { definition, action: 'copy' as const };
    });
}

/**
 * 複写先 definitions の末尾に追加する際の開始 displayOrder を算出する。
 */
export function computeNextDisplayOrder(targetDefinitions: SaveDataFieldDefinitionDto[]): number {
  if (targetDefinitions.length === 0) return 1;
  return Math.max(...targetDefinitions.map((d) => d.displayOrder)) + 1;
}

/**
 * source definition → CreateSaveDataFieldDefinitionRequest を生成する。
 * fieldType は API が期待する文字列名 ("Text" 等) に変換する。
 */
export function buildCreateRequestFromSource(
  source: SaveDataFieldDefinitionDto,
  displayOrder: number,
): CreateSaveDataFieldDefinitionRequest {
  return {
    fieldKey: source.fieldKey,
    label: source.label,
    description: source.description,
    fieldType: SAVE_DATA_FIELD_TYPE_NAMES[source.fieldType],
    displayOrder,
    isRequired: source.isRequired,
    sharedChoiceSetId: source.sharedChoiceSetId,
  };
}

/**
 * この定義の個別候補値を複写すべきか判定する。
 * fieldType=6 (SingleSelect) かつ共有選択肢セットを使っていない場合のみ true。
 */
export function shouldCopyOptions(definition: SaveDataFieldDefinitionDto): boolean {
  return definition.fieldType === 6 && definition.sharedChoiceSetId == null;
}

/**
 * source の候補値を displayOrder 昇順で複写用ペイロードに変換する。
 */
export function buildOptionCreatePayloads(
  sourceOptions: SaveDataFieldOptionDto[],
): Array<{ optionKey: string; label: string; description: string | null }> {
  return [...sourceOptions]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((opt) => ({
      optionKey: opt.optionKey,
      label: opt.label,
      description: opt.description,
    }));
}

/**
 * CopyResultItem[] から集計を作成する。
 */
export function summarizeCopyResults(results: CopyResultItem[]): CopySummary {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of results) {
    if (r.outcome === 'created') created++;
    else if (r.outcome === 'skipped') skipped++;
    else failed++;
  }
  return { created, skipped, failed, results };
}

/**
 * CopySummary → ユーザー向けメッセージを生成する。
 */
export function buildCopySummaryMessage(summary: CopySummary): string {
  const parts: string[] = [];
  if (summary.created > 0) parts.push(`${summary.created} 件を複写しました`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} 件をスキップしました`);
  if (summary.failed > 0) parts.push(`${summary.failed} 件が失敗しました`);
  if (parts.length === 0) return '複写対象がありませんでした。';
  return parts.join('、') + '。';
}
