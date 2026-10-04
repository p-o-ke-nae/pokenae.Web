import { describe, expect, it } from 'vitest';
import { buildTableRows, getTableColumns } from './table-rows';
import type { ManagementLookups } from '@/lib/game-management/types';

describe('game-library user resource table columns', () => {
  it('shows game console maintenance and memo without relation or status', () => {
    const columns = getTableColumns('game-consoles');

    expect(columns.map(({ key, header }) => [key, header])).toEqual([
      ['primary', '名称'],
      ['maintenance', 'メンテナンス'],
      ['memo', 'メモ'],
      ['edit', '操作'],
    ]);
    expect(columns.find(({ key }) => key === 'memo')?.width).toBe('32rem');
  });

  it('shows software type, maintenance, and memo without relation or status', () => {
    const columns = getTableColumns('game-softwares');

    expect(columns.map(({ key, header }) => [key, header])).toEqual([
      ['primary', '名称'],
      ['maintenance', 'メンテナンス'],
      ['variant', '種類'],
      ['memo', 'メモ'],
      ['edit', '操作'],
    ]);
    expect(columns.find(({ key }) => key === 'memo')?.width).toBe('32rem');
  });

  it('labels account relation and note as account type and memo', () => {
    const columns = getTableColumns('accounts');

    expect(columns.find(({ key }) => key === 'relation')?.header).toBe('アカウント種類');
    expect(columns.find(({ key }) => key === 'relation')?.width).toBe('15rem');
    expect(columns.find(({ key }) => key === 'note')?.header).toBe('メモ');
    expect(columns.find(({ key }) => key === 'note')?.width).toBe('32rem');
    expect(columns.some(({ key }) => key === 'status')).toBe(false);
  });

  it('shows memory card type, maintenance, and memo without status', () => {
    const columns = getTableColumns('memory-cards');

    expect(columns.map(({ key, header }) => [key, header])).toEqual([
      ['primary', '名称'],
      ['relation', '種類'],
      ['maintenance', 'メンテナンス'],
      ['memo', 'メモ'],
      ['edit', '操作'],
    ]);
    expect(columns.find(({ key }) => key === 'memo')?.width).toBe('32rem');
  });

  it('shows save data memo after story progress with a wider column', () => {
    const columns = getTableColumns('save-datas');

    expect(columns.map(({ key, header }) => [key, header])).toEqual([
      ['title', 'タイトル'],
      ['save', '保存先'],
      ['storyProgress', 'ストーリー進行度'],
      ['memo', 'メモ'],
      ['operation', '操作'],
      ['edit', '編集'],
    ]);
    expect(columns.find(({ key }) => key === 'memo')?.width).toBe('32rem');
    expect(columns.some(({ key }) => key === 'hard')).toBe(false);
  });

  it('maps a save data record memo into the memo column', () => {
    const lookups = {
      gameSoftwareMasters: [{ id: 1, name: 'ソフト', abbreviation: 'S', contentGroupId: 1 }],
      gameSoftwares: [],
      gameConsoles: [],
      accounts: [],
      memoryCards: [],
      saveDatas: [{
        id: 1,
        ownerGoogleUserId: 'test',
        displayOrder: 1,
        memo: '保存データのメモ',
        replacedBySaveDataId: null,
        saveStorageType: 0,
        gameSoftwareMasterId: 1,
        gameSoftwareId: null,
        gameConsoleId: null,
        accountId: null,
        memoryCardId: null,
        storyProgressDefinitionId: null,
        extendedFields: [],
        isDeleted: false,
        deleteReason: null,
      }],
    } as unknown as ManagementLookups;

    expect(buildTableRows('save-datas', lookups, '/game-library').map((row) => row.memo)).toEqual(['保存データのメモ']);
  });
});
