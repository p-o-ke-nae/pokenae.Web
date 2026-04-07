/**
 * 表示順一括更新ユーティリティ
 *
 * リソース種別ごとの DTO から更新ペイロードを構築し、
 * サーバー側 /api/batch-display-order にまとめて送信する。
 * Trial モード (localStorage) ではアトミックに一括書き込みする。
 */

import type {
  AccountDto,
  AccountTypeMasterDto,
  GameConsoleCategoryDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameConsoleDto,
  GameSoftwareContentGroupDto,
  GameSoftwareMasterDto,
  GameSoftwareDto,
  MemoryCardDto,
  MemoryCardEditionMasterDto,
  ResourceKey,
  SaveDataDto,
  SaveDataFieldInputDto,
} from '@/lib/game-management/types';
import { getResourceDefinition } from '@/lib/game-management/resources';
import { getSession } from 'next-auth/react';

// ---------------------------------------------------------------------------
// DTO → Update Payload 変換 (displayOrder だけ差し替え)
// ---------------------------------------------------------------------------

/**
 * DTO と新しい displayOrder からバックエンド PUT 用のペイロードを構築する。
 * フィールドは各リソースの UpdateXxxRequest に合わせている。
 */
export function buildUpdatePayloadFromDto(
  resourceKey: ResourceKey,
  dto: unknown,
  displayOrder: number,
): Record<string, unknown> {
  switch (resourceKey) {
    case 'account-type-masters': {
      const item = dto as AccountTypeMasterDto;
      return {
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryIds: item.gameConsoleCategoryIds.length > 0 ? item.gameConsoleCategoryIds : null,
        displayOrder,
      };
    }
    case 'accounts': {
      const item = dto as AccountDto;
      return {
        displayOrder,
        label: item.label,
        memo: item.memo,
        linkedGameConsoleIds: item.linkedGameConsoleIds.length > 0 ? item.linkedGameConsoleIds : null,
      };
    }
    case 'game-console-categories': {
      const item = dto as GameConsoleCategoryDto;
      return {
        name: item.name,
        abbreviation: item.abbreviation,
        manufacturer: item.manufacturer,
        saveStorageType: item.saveStorageType,
        displayOrder,
      };
    }
    case 'game-console-masters': {
      const item = dto as GameConsoleMasterDto;
      return {
        gameConsoleCategoryId: item.gameConsoleCategoryId,
        name: item.name,
        abbreviation: item.abbreviation,
        displayOrder,
      };
    }
    case 'game-console-edition-masters': {
      const item = dto as GameConsoleEditionMasterDto;
      return {
        gameConsoleMasterId: item.gameConsoleMasterId,
        name: item.name,
        abbreviation: item.abbreviation,
        displayOrder,
      };
    }
    case 'game-consoles': {
      const item = dto as GameConsoleDto;
      return {
        displayOrder,
        label: item.label,
        memo: item.memo,
      };
    }
    case 'game-software-content-groups': {
      const item = dto as GameSoftwareContentGroupDto;
      return {
        name: item.name,
        displayOrder,
      };
    }
    case 'game-software-masters': {
      const item = dto as GameSoftwareMasterDto;
      return {
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryId: item.gameConsoleCategoryId,
        contentGroupId: item.contentGroupId,
        displayOrder,
      };
    }
    case 'game-softwares': {
      const item = dto as GameSoftwareDto;
      return {
        variant: item.variant,
        displayOrder,
        label: item.label,
        memo: item.memo,
      };
    }
    case 'memory-cards': {
      const item = dto as MemoryCardDto;
      return {
        memoryCardEditionMasterId: item.memoryCardEditionMasterId,
        displayOrder,
        label: item.label,
        memo: item.memo,
      };
    }
    case 'memory-card-edition-masters': {
      const item = dto as MemoryCardEditionMasterDto;
      return {
        name: item.name,
        blockCount: item.blockCount,
        displayOrder,
      };
    }
    case 'save-datas': {
      const item = dto as SaveDataDto;
      const extendedFields: SaveDataFieldInputDto[] | null =
        item.extendedFields.length > 0
          ? item.extendedFields.map((field) => ({
              fieldKey: field.fieldKey,
              stringValue: field.stringValue,
              intValue: field.intValue,
              decimalValue: field.decimalValue,
              boolValue: field.boolValue,
              dateValue: field.dateValue,
              optionKey: field.selectedOptionKey,
            }))
          : null;
      return {
        gameSoftwareMasterId: item.gameSoftwareMasterId,
        gameSoftwareId: item.gameSoftwareId,
        gameConsoleId: item.gameConsoleId,
        accountId: item.accountId,
        memoryCardId: item.memoryCardId,
        storyProgressDefinitionId: item.storyProgressDefinitionId,
        replacedBySaveDataId: item.replacedBySaveDataId,
        displayOrder,
        extendedFields,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// バッチ更新APIレスポンス型
// ---------------------------------------------------------------------------

export type BatchDisplayOrderResult = {
  success: boolean;
  updatedCount?: number;
  error?: string;
  rollbackSuccess?: boolean;
  rollbackFailures?: { id: number; error: string }[];
};

// ---------------------------------------------------------------------------
// API モード: バッチ更新クライアント
// ---------------------------------------------------------------------------

/**
 * 表示順を一括更新する。
 * 全行の更新を 1 リクエストとしてサーバーに送信し、途中失敗時はサーバー側でロールバックする。
 *
 * @param resourceKey リソース種別
 * @param orderedDtos 表示したい順序で並んだ DTO 配列。1..N で再採番される。
 */
export async function batchUpdateDisplayOrder(
  resourceKey: ResourceKey,
  orderedDtos: Array<{ id: number } & Record<string, unknown>>,
): Promise<BatchDisplayOrderResult> {
  if (orderedDtos.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const definition = getResourceDefinition(resourceKey);

  const items = orderedDtos.map((dto, index) => {
    const newDisplayOrder = index + 1;
    const originalDisplayOrder = (dto as { displayOrder?: number }).displayOrder ?? newDisplayOrder;
    return {
      id: dto.id,
      updatePayload: buildUpdatePayloadFromDto(resourceKey, dto, newDisplayOrder),
      rollbackPayload: buildUpdatePayloadFromDto(resourceKey, dto, originalDisplayOrder),
    };
  });

  // 認証ヘッダーを組み立て
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const session = await getSession();
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
      headers['X-Google-Access-Token'] = session.accessToken;
    }
  } catch {
    // セッション取得失敗時はヘッダーなしで続行（サーバー側で 401 になる）
  }

  const response = await fetch('/api/batch-display-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      apiPath: definition.apiPath,
      items,
    }),
  });

  let data: { success?: boolean; data?: { updatedCount?: number }; error?: { message?: string; details?: unknown } };
  try {
    data = await response.json();
  } catch {
    return { success: false, error: 'サーバーからの応答を解析できませんでした。' };
  }

  if (!data || typeof data !== 'object') {
    return { success: false, error: '不正な応答形式です。' };
  }

  if (data.success) {
    return { success: true, updatedCount: data.data?.updatedCount ?? items.length };
  }

  const details = data.error?.details as {
    failedItemId?: number;
    error?: string;
    rollbackSuccess?: boolean;
    rollbackFailures?: { id: number; error: string }[];
  } | undefined;

  return {
    success: false,
    error: data.error?.message ?? '表示順の更新に失敗しました。',
    rollbackSuccess: details?.rollbackSuccess,
    rollbackFailures: details?.rollbackFailures,
  };
}
