import { describe, expect, it } from 'vitest';
import { getTableColumns } from './table-rows';

describe('game-library user resource table columns', () => {
  it('shows game console maintenance and memo without relation or status', () => {
    const columns = getTableColumns('game-consoles');

    expect(columns.map(({ key, header }) => [key, header])).toEqual([
      ['primary', '名称'],
      ['maintenance', 'メンテナンス'],
      ['memo', 'メモ'],
      ['edit', '操作'],
    ]);
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
  });

  it('labels account relation and note as account type and memo', () => {
    const columns = getTableColumns('accounts');

    expect(columns.find(({ key }) => key === 'relation')?.header).toBe('アカウント種類');
    expect(columns.find(({ key }) => key === 'relation')?.width).toBe('15rem');
    expect(columns.find(({ key }) => key === 'note')?.header).toBe('メモ');
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
  });

  it('uses title and storage destination without a hardware column for save data', () => {
    const columns = getTableColumns('save-datas');

    expect(columns.some(({ key, header }) => key === 'title' && header === 'タイトル')).toBe(true);
    expect(columns.some(({ key, header }) => key === 'save' && header === '保存先')).toBe(true);
    expect(columns.some(({ key }) => key === 'hard')).toBe(false);
  });
});
