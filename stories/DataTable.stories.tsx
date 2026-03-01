import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import DataTable, { type DataTableColumn, type DataTableProps } from '../components/molecules/DataTable';

type SampleRow = Record<string, unknown> & {
  id: string;
  name: string;
  category: string;
  active: boolean;
  score: string;
};

const sampleColumns: DataTableColumn<SampleRow>[] = [
  { key: 'id', header: 'ID', width: '5rem' },
  { key: 'name', header: '名前' },
  { key: 'category', header: 'カテゴリ' },
  { key: 'score', header: 'スコア', width: '6rem' },
  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
];

const sampleData: SampleRow[] = [
  { id: '001', name: 'ピカチュウ', category: '電気', active: true, score: '85' },
  { id: '002', name: 'ヒトカゲ', category: '炎', active: true, score: '72' },
  { id: '003', name: 'ゼニガメ', category: '水', active: false, score: '68' },
  { id: '004', name: 'フシギダネ', category: '草', active: true, score: '91' },
  { id: '005', name: 'イーブイ', category: 'ノーマル', active: false, score: '60' },
];

const baseArgs: DataTableProps<SampleRow> = {
  columns: sampleColumns,
  data: sampleData,
};

const meta = {
  title: 'Molecules/DataTable',
  component: DataTable<SampleRow>,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: baseArgs,
} satisfies Meta<typeof DataTable<SampleRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const WithRowClickDemo = () => {
  const [lastClicked, setLastClicked] = useState<string>('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DataTable<SampleRow>
        columns={sampleColumns}
        data={sampleData}
        rowKey="id"
        onRowClick={(row) => setLastClicked(`${row.id}: ${row.name}`)}
      />
      {lastClicked && (
        <p style={{ fontSize: '0.875rem' }}>
          クリックされた行: <strong>{lastClicked}</strong>
        </p>
      )}
    </div>
  );
};

export const WithRowClick: Story = {
  render: () => <WithRowClickDemo />,
};

const SelectableDemo = () => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DataTable<SampleRow>
        columns={sampleColumns}
        data={sampleData}
        rowKey="id"
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />
      <p style={{ fontSize: '0.875rem' }}>
        選択中: {selectedKeys.length > 0 ? selectedKeys.join(', ') : 'なし'}
      </p>
    </div>
  );
};

export const Selectable: Story = {
  render: () => <SelectableDemo />,
};

export const Empty: Story = {
  args: {
    data: [],
  },
};

export const CustomEmptyMessage: Story = {
  args: {
    data: [],
    emptyMessage: '該当するデータが見つかりませんでした',
  },
};

