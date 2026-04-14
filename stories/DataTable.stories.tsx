import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import DataTable, { type DataTableColumn, type DataTableProps, type SortState } from '../components/molecules/DataTable';

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

type TreeRow = Record<string, unknown> & {
  id: string;
  name: string;
  category: string;
  active: boolean;
  children?: TreeRow[];
};

const treeData: TreeRow[] = [
  {
    id: 'cat-1', name: '草タイプ', category: '草系', active: true,
    children: [
      { id: 'cat-1-1', name: 'フシギダネ', category: '草/毒', active: true },
      { id: 'cat-1-2', name: 'フシギソウ', category: '草/毒', active: false },
    ],
  },
  {
    id: 'cat-2', name: '炎タイプ', category: '炎系', active: true,
    children: [
      { id: 'cat-2-1', name: 'ヒトカゲ', category: '炎', active: true },
      { id: 'cat-2-2', name: 'リザードン', category: '炎/飛行', active: true },
    ],
  },
  { id: 'cat-3', name: '電気タイプ', category: '電気系', active: false },
];

export const TreeData: Story = {
  args: {
    columns: [
      { key: 'name', header: 'カテゴリ / 名前' },
      { key: 'category', header: 'タイプ' },
      { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
    ],
    data: treeData as SampleRow[],
    rowKey: 'id',
    childrenKey: 'children',
  },
};

// ソート＋フィルタ
const sortableFilterableColumns: DataTableColumn<SampleRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true },
  { key: 'name', header: '名前', sortable: true, filterable: true },
  { key: 'category', header: 'カテゴリ', sortable: true, filterable: true },
  {
    key: 'score',
    header: 'スコア',
    width: '6rem',
    sortable: true,
    sortValue: (v) => Number(v),
  },
  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
];

export const WithSortAndFilter: Story = {
  args: {
    columns: sortableFilterableColumns,
    data: sampleData,
    rowKey: 'id',
  },
};

// フィルタ後データ取得コールバック
const FilteredDataCallbackDemo = () => {
  const [filteredData, setFilteredData] = useState<SampleRow[]>(sampleData);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DataTable<SampleRow>
        columns={sortableFilterableColumns}
        data={sampleData}
        rowKey="id"
        onFilteredDataChange={setFilteredData}
      />
      <div>
        <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>
          フィルタ後データ（onFilteredDataChange）:
        </p>
        <pre style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '0.25rem' }}>
          {JSON.stringify(filteredData.map(r => ({ id: r.id, name: r.name })), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export const WithFilteredDataCallback: Story = {
  render: () => <FilteredDataCallbackDemo />,
};

// 列の並べ替え＋列幅リサイズ
export const WithColumnManagement: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    rowKey: 'id',
    resizable: true,
  },
};

const longContentColumns: DataTableColumn<SampleRow>[] = [
  { key: 'id', header: 'ID', width: '5rem' },
  { key: 'name', header: '名前', width: '12rem' },
  { key: 'category', header: 'カテゴリ', width: '10rem', filterable: true, filterMode: 'select' },
  { key: 'score', header: 'メモ', width: '12rem' },
];

const longContentData: SampleRow[] = [
  {
    id: '101',
    name: 'とても長い表示名を持つサンプルデータその1',
    category: 'かなり長い分類名のサンプル',
    active: true,
    score: '横幅を超える値は省略記号付きで表示され、ダブルクリックで自動調整できます。',
  },
  {
    id: '102',
    name: '別の長文サンプルデータで列幅の追従を確認する',
    category: '分類候補の長文その2',
    active: false,
    score: 'フィルタ列とレコード列の位置が一致することを Storybook 上でも確認するためのデータです。',
  },
];

export const WithLongContent: Story = {
  args: {
    columns: longContentColumns,
    data: longContentData,
    rowKey: 'id',
    resizable: true,
  },
};

// 外部ソート管理
const ExternalSortDemo = () => {
  const [sortState, setSortState] = useState<SortState | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DataTable<SampleRow>
        columns={sortableFilterableColumns}
        data={sampleData}
        rowKey="id"
        sortState={sortState}
        onSortChange={setSortState}
      />
      <p style={{ fontSize: '0.875rem' }}>
        ソート状態:{' '}
        {sortState ? `${sortState.key} ${sortState.direction}` : 'なし'}
      </p>
    </div>
  );
};

export const WithExternalSort: Story = {
  render: () => <ExternalSortDemo />,
};

// 行追加・変更追跡（useTableData フック）
import { useTableData, omitTrackedFields } from '../lib/hooks/useTableData';

const WithAddRowDemo = () => {
  const tableData = useTableData<SampleRow>({
    data: sampleData,
    rowKey: 'id',
    newRowTemplate: { name: '', category: '', active: false, score: '0' },
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DataTable<SampleRow>
        columns={sampleColumns}
        data={tableData.rows as SampleRow[]}
        rowKey="id"
        onAddRow={tableData.addRow}
      />
      <p style={{ fontSize: '0.875rem' }}>
        追加行: {tableData.addedRows.length} 件　変更行: {tableData.modifiedRows.length} 件
      </p>
      {tableData.addedRows.length > 0 && (
        <details>
          <summary style={{ fontSize: '0.75rem', cursor: 'pointer' }}>追加行データ (JSON)</summary>
          <pre style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '0.25rem' }}>
            {JSON.stringify(tableData.addedRows.map(omitTrackedFields), null, 2)}
          </pre>
        </details>
      )}
      {(tableData.addedRows.length > 0) && (
        <button type="button" onClick={tableData.resetAll} style={{ fontSize: '0.75rem' }}>
          変更をリセット
        </button>
      )}
    </div>
  );
};

export const WithAddRow: Story = {
  render: () => <WithAddRowDemo />,
};
