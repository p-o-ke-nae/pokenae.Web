'use client';

import { useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomRadioButton from '@/components/atoms/CustomRadioButton';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomModal from '@/components/atoms/CustomModal';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLoader from '@/components/atoms/CustomLoader';
import PokenaeLogo, { type PokenaeLogo as PokenaeLogoRef } from '@/components/atoms/PokenaeLogo';
import CheckboxField from '@/components/molecules/CheckboxField';
import Dialog from '@/components/molecules/Dialog';
import RadioField from '@/components/molecules/RadioField';
import SearchField, { type SearchOption, type SearchFieldColumn } from '@/components/molecules/SearchField';
import DataTable, { type DataTableColumn, type SortState } from '@/components/molecules/DataTable';
import { useTableData, omitTrackedFields } from '@/lib/hooks/useTableData';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';

type AddRowPokemon = { id: string; name: string; type: string; active: boolean; score: string };

const ADD_ROW_INITIAL_DATA: AddRowPokemon[] = [
  { id: '001', name: 'フシギダネ', type: '草/毒', active: true, score: '91' },
  { id: '004', name: 'ヒトカゲ', type: '炎', active: true, score: '85' },
  { id: '007', name: 'ゼニガメ', type: '水', active: false, score: '68' },
];

const ADD_ROW_NEW_TEMPLATE: Partial<AddRowPokemon> = {
  name: '', type: '', active: false, score: '0',
};

const ADD_ROW_COLUMNS: DataTableColumn<AddRowPokemon>[] = [
  { key: 'id', header: 'No.', width: '4rem' },
  { key: 'name', header: '名前' },
  { key: 'type', header: 'タイプ', width: '8rem' },
  { key: 'score', header: 'スコア', width: '6rem' },
  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
];

function AddRowDemo() {
  const tableData = useTableData<AddRowPokemon>({
    data: ADD_ROW_INITIAL_DATA,
    rowKey: 'id',
    newRowTemplate: ADD_ROW_NEW_TEMPLATE,
  });
  return (
    <div className="space-y-2">
      <DataTable<AddRowPokemon>
        columns={ADD_ROW_COLUMNS}
        data={tableData.rows as AddRowPokemon[]}
        rowKey="id"
        onAddRow={tableData.addRow}
      />
      <div className="flex gap-2 flex-wrap items-center">
        <p className="text-xs text-zinc-500">
          追加行: {tableData.addedRows.length} 件　変更行: {tableData.modifiedRows.length} 件
        </p>
        {(tableData.addedRows.length > 0 || tableData.modifiedRows.length > 0) && (
          <button
            type="button"
            className="text-xs text-red-500 underline"
            onClick={tableData.resetAll}
          >
            変更を全て取り消す
          </button>
        )}
      </div>
      {tableData.addedRows.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500">追加行データ (JSON)</summary>
          <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-auto">
            {JSON.stringify(tableData.addedRows.map(omitTrackedFields), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function ComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dataTableSelectedKeys, setDataTableSelectedKeys] = useState<string[]>([]);
  const [dataTableSortState, setDataTableSortState] = useState<SortState | null>(null);
  const [dataTableFilteredCount, setDataTableFilteredCount] = useState<number>(5);

  const logoRef = useRef<PokenaeLogoRef>(null);
  const { startLoading } = useLoadingOverlay();

  const simulateLoading = () => {
    startLoading(() => new Promise((resolve) => setTimeout(resolve, 3000)));
  };

  const searchOptions: SearchOption[] = [
    { value: '001', label: 'フシギダネ', type: '草/毒' },
    { value: '002', label: 'フシギソウ', type: '草/毒' },
    { value: '003', label: 'フシギバナ', type: '草/毒' },
    { value: '004', label: 'ヒトカゲ', type: '炎' },
    { value: '005', label: 'リザード', type: '炎' },
    { value: '006', label: 'リザードン', type: '炎/飛行' },
    { value: '007', label: 'ゼニガメ', type: '水' },
    { value: '008', label: 'カメール', type: '水' },
    { value: '009', label: 'カメックス', type: '水' },
    { value: '025', label: 'ピカチュウ', type: '電気' },
    { value: '133', label: 'イーブイ', type: 'ノーマル' },
    { value: '152', label: 'チコリータ', type: '草' },
    { value: '155', label: 'ヒノアラシ', type: '炎' },
    { value: '158', label: 'ワニノコ', type: '水' },
  ];

  // columns で検索対象列・表示列・ヘッダーをカスタマイズ
  const searchColumns: SearchFieldColumn[] = [
    { key: 'value', header: 'No.', width: '4rem', searchable: true },
    { key: 'label', header: '名前', searchable: true },
    { key: 'type', header: 'タイプ', width: '6rem', searchable: true },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <CustomHeader level={1}>コンポーネントギャラリー</CustomHeader>
        <p className="text-zinc-600 dark:text-zinc-400">
          開発・デバッグ環境向けコンポーネント一覧
        </p>

        {/* PokenaeLogo */}
        <section className="space-y-4">
          <CustomHeader level={2}>PokenaeLogo</CustomHeader>
          <div className="flex flex-col items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <PokenaeLogo ref={logoRef} width={240} height={70} />
            <CustomButton variant="accent" onClick={() => logoRef.current?.replay()}>
              アニメーション再生
            </CustomButton>
            <PokenaeLogo width={160} height={48} autoPlay={false} />
            <span className="text-xs text-zinc-500">autoPlay=false（アニメーションなし）</span>
          </div>
        </section>

        {/* CustomHeader */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomHeader</CustomHeader>
          <div className="space-y-2 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomHeader level={1}>見出し H1</CustomHeader>
            <CustomHeader level={2}>見出し H2</CustomHeader>
            <CustomHeader level={3}>見出し H3</CustomHeader>
            <CustomHeader level={4}>見出し H4</CustomHeader>
            <CustomHeader level={5}>見出し H5</CustomHeader>
            <CustomHeader level={6}>見出し H6</CustomHeader>
          </div>
        </section>

        {/* CustomLabel */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomLabel</CustomHeader>
          <div className="flex flex-wrap gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomLabel>通常ラベル</CustomLabel>
            <CustomLabel required>必須ラベル</CustomLabel>
          </div>
        </section>

        {/* CustomButton */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomButton</CustomHeader>
          <div className="flex flex-wrap gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="neutral">Neutral</CustomButton>
            <CustomButton variant="accent">Accent</CustomButton>
            <CustomButton variant="ghost">Ghost</CustomButton>
            <CustomButton variant="accent" isLoading>Loading</CustomButton>
            <CustomButton variant="neutral" disabled>Disabled</CustomButton>
          </div>
        </section>

        {/* CustomCheckBox (Atom) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomCheckBox（原始粒度・Atom）</CustomHeader>
          <div className="flex flex-wrap gap-4 items-center p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomCheckBox aria-label="デフォルト" />
            <CustomCheckBox defaultChecked aria-label="チェック済み" />
            <CustomCheckBox disabled aria-label="無効" />
            <CustomCheckBox disabled defaultChecked aria-label="無効チェック済み" />
          </div>
        </section>

        {/* CheckboxField (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CheckboxField（分子粒度・Molecule）</CustomHeader>
          <div className="flex flex-col gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CheckboxField label="通常チェックボックス" />
            <CheckboxField label="デフォルトチェック済み" defaultChecked />
            <CheckboxField label="必須項目" required />
            <CheckboxField label="無効チェックボックス" disabled />
          </div>
        </section>

        {/* CustomRadioButton (Atom) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomRadioButton（原始粒度・Atom）</CustomHeader>
          <div className="flex flex-wrap gap-4 items-center p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomRadioButton name="radio-atom" value="a" defaultChecked aria-label="選択肢A" />
            <CustomRadioButton name="radio-atom" value="b" aria-label="選択肢B" />
            <CustomRadioButton name="radio-atom" value="c" disabled aria-label="無効" />
          </div>
        </section>

        {/* RadioField (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>RadioField（分子粒度・Molecule）</CustomHeader>
          <div className="flex flex-col gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <RadioField name="radio-mol" value="a" label="選択肢 A" defaultChecked />
            <RadioField name="radio-mol" value="b" label="選択肢 B" />
            <RadioField name="radio-mol" value="c" label="選択肢 C（無効）" disabled />
          </div>
        </section>

        {/* CustomTextBox */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomTextBox</CustomHeader>
          <div className="flex flex-col gap-3 max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div>
              <CustomLabel htmlFor="text1">通常テキストボックス</CustomLabel>
              <CustomTextBox id="text1" placeholder="テキストを入力" className="mt-1" />
            </div>
            <div>
              <CustomLabel htmlFor="text2" required>エラー状態</CustomLabel>
              <CustomTextBox id="text2" isError placeholder="エラーがあります" className="mt-1" />
            </div>
            <div>
              <CustomLabel htmlFor="text3">無効状態</CustomLabel>
              <CustomTextBox id="text3" disabled placeholder="無効です" className="mt-1" />
            </div>
          </div>
        </section>

        {/* CustomTextArea */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomTextArea</CustomHeader>
          <div className="flex flex-col gap-3 max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div>
              <CustomLabel htmlFor="textarea1">テキストエリア</CustomLabel>
              <CustomTextArea id="textarea1" placeholder="複数行のテキストを入力" className="mt-1" rows={4} />
            </div>
            <div>
              <CustomLabel htmlFor="textarea2" required>エラー状態</CustomLabel>
              <CustomTextArea id="textarea2" isError placeholder="エラーがあります" className="mt-1" rows={3} />
            </div>
          </div>
        </section>

        {/* CustomComboBox */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomComboBox</CustomHeader>
          <div className="flex flex-col gap-3 max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div>
              <CustomLabel htmlFor="combo1">通常コンボボックス</CustomLabel>
              <CustomComboBox id="combo1" placeholder="選択してください" className="mt-1">
                <option value="1">選択肢 1</option>
                <option value="2">選択肢 2</option>
                <option value="3">選択肢 3</option>
              </CustomComboBox>
            </div>
            <div>
              <CustomLabel htmlFor="combo2" required>エラー状態</CustomLabel>
              <CustomComboBox id="combo2" isError placeholder="選択してください" className="mt-1">
                <option value="1">選択肢 1</option>
                <option value="2">選択肢 2</option>
              </CustomComboBox>
            </div>
            <div>
              <CustomLabel htmlFor="combo3">無効状態</CustomLabel>
              <CustomComboBox id="combo3" disabled defaultValue="1" className="mt-1">
                <option value="1">選択肢 1</option>
                <option value="2">選択肢 2</option>
              </CustomComboBox>
            </div>
          </div>
        </section>

        {/* CustomMessageArea */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomMessageArea</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            <p className="text-xs text-zinc-500 mb-3">banner=true: 上部に固定表示</p>
            <div className="relative overflow-hidden rounded border border-zinc-200 dark:border-zinc-700" style={{ height: '8rem' }}>
              <CustomMessageArea variant="error" banner>エラー: バナー表示（上部スティッキー）</CustomMessageArea>
              <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">コンテンツ領域</div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 mb-3">inline（デフォルト）</p>
            <div className="flex flex-col gap-3 max-w-lg">
              <CustomMessageArea variant="info">情報: この操作は元に戻せます。</CustomMessageArea>
              <CustomMessageArea variant="success">保存が完了しました。</CustomMessageArea>
              <CustomMessageArea variant="warning">
                警告: この操作は取り消しできない場合があります。
              </CustomMessageArea>
              <CustomMessageArea variant="error">
                エラー: 入力内容に問題があります。必須項目を確認してください。
              </CustomMessageArea>
            </div>
          </div>
        </section>

        {/* CustomLoader */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomLoader（原始粒度・Atom）</CustomHeader>
          <div className="flex flex-wrap gap-6 items-center p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="sm" />
              <span className="text-xs text-zinc-500">Small</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="md" />
              <span className="text-xs text-zinc-500">Medium</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="lg" />
              <span className="text-xs text-zinc-500">Large</span>
            </div>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="sm" variant="bold" />
              <span className="text-xs text-zinc-500">Small Bold</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="md" variant="bold" />
              <span className="text-xs text-zinc-500">Medium Bold</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="lg" variant="bold" />
              <span className="text-xs text-zinc-500">Large Bold</span>
            </div>
          </div>
        </section>

        {/* LoadingOverlay (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>LoadingOverlay（分子粒度・Molecule）</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="accent" onClick={simulateLoading}>
              通信を開始（3秒後に完了）
            </CustomButton>
          </div>
        </section>

        {/* CustomModal (Atom) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomModal（原始粒度・Atom）</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="neutral" onClick={() => setModalOpen(true)}>
              モーダルを開く
            </CustomButton>
            <CustomModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              style={{ width: 'min(90vw, 24rem)', padding: '1.5rem' }}
            >
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                これはCustomModalの原始粒度コンポーネントです。<br />
                header/footerなどの構造を持たないベースのモーダルです。
              </p>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <CustomButton variant="accent" onClick={() => setModalOpen(false)}>
                  閉じる
                </CustomButton>
              </div>
            </CustomModal>
          </div>
        </section>

        {/* Dialog (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>Dialog（分子粒度・Molecule）</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="accent" onClick={() => setDialogOpen(true)}>
              ダイアログを開く
            </CustomButton>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="確認ダイアログ"
              footer={
                <>
                  <CustomButton variant="ghost" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </CustomButton>
                  <CustomButton variant="accent" onClick={() => setDialogOpen(false)}>
                    確認
                  </CustomButton>
                </>
              }
            >
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                ダイアログのコンテンツがここに表示されます。<br />
                任意の内容を含めることができます。
              </p>
            </Dialog>
          </div>
        </section>

        {/* SearchField (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>SearchField（分子粒度・Molecule）</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm space-y-4">
            <div className="max-w-sm">
              <CustomLabel htmlFor="search-demo" required>ポケモン選択</CustomLabel>
              <SearchField
                options={searchOptions}
                value={searchValue}
                onChange={setSearchValue}
                columns={searchColumns}
                placeholder="ポケモンを選択..."
                dialogTitle="ポケモン検索"
              />
            </div>

          </div>
        </section>

        {/* DataTable (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>DataTable（分子粒度・Molecule）</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm space-y-6">

            {/* 1. 行選択チェックボックス */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">① 行選択チェックボックス付きテーブル</p>
              <DataTable<{ id: string; name: string; type: string; active: boolean; score: string }>
                columns={[
                  { key: 'id', header: 'No.', width: '4rem' },
                  { key: 'name', header: '名前' },
                  { key: 'type', header: 'タイプ', width: '8rem' },
                  { key: 'score', header: 'スコア', width: '6rem' },
                  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
                ] as DataTableColumn<{ id: string; name: string; type: string; active: boolean; score: string }>[]}
                data={[
                  { id: '001', name: 'フシギダネ', type: '草/毒', active: true, score: '91' },
                  { id: '004', name: 'ヒトカゲ', type: '炎', active: true, score: '85' },
                  { id: '007', name: 'ゼニガメ', type: '水', active: false, score: '68' },
                  { id: '025', name: 'ピカチュウ', type: '電気', active: true, score: '78' },
                  { id: '133', name: 'イーブイ', type: 'ノーマル', active: false, score: '60' },
                ]}
                rowKey="id"
                selectable
                selectedKeys={dataTableSelectedKeys}
                onSelectionChange={setDataTableSelectedKeys}
              />
              <p className="text-xs text-zinc-500">
                選択中: {dataTableSelectedKeys.length > 0 ? dataTableSelectedKeys.join(', ') : 'なし'}
              </p>
            </div>

            {/* 2. ソート＋フィルタ＋列順変更＋列幅リサイズ */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">
                ② ソート（ヘッダークリック）・フィルタ（入力欄）・列順変更（ヘッダードラッグ）・列幅リサイズ（右端ドラッグ）
              </p>
              <DataTable<{ id: string; name: string; type: string; score: string; active: boolean }>
                columns={[
                  { key: 'id', header: 'No.', width: '4rem', sortable: true },
                  { key: 'name', header: '名前', sortable: true, filterable: true },
                  { key: 'type', header: 'タイプ', width: '8rem', sortable: true, filterable: true },
                  {
                    key: 'score',
                    header: 'スコア',
                    width: '6rem',
                    sortable: true,
                    sortValue: (v) => Number(v),
                  },
                  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
                ] as DataTableColumn<{ id: string; name: string; type: string; score: string; active: boolean }>[]}
                data={[
                  { id: '001', name: 'フシギダネ', type: '草/毒', active: true, score: '91' },
                  { id: '004', name: 'ヒトカゲ', type: '炎', active: true, score: '85' },
                  { id: '007', name: 'ゼニガメ', type: '水', active: false, score: '68' },
                  { id: '025', name: 'ピカチュウ', type: '電気', active: true, score: '78' },
                  { id: '133', name: 'イーブイ', type: 'ノーマル', active: false, score: '60' },
                ]}
                rowKey="id"
                resizable
                sortState={dataTableSortState}
                onSortChange={setDataTableSortState}
                onFilteredDataChange={(d) => setDataTableFilteredCount(d.length)}
              />
              <p className="text-xs text-zinc-500">
                ソート: {dataTableSortState ? `${dataTableSortState.key} ${dataTableSortState.direction}` : 'なし'}
                　表示件数: {dataTableFilteredCount} 件
              </p>
            </div>

            {/* 3. 親子階層データ */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">③ 親子階層データ（childrenKey=&quot;children&quot;）</p>
              <DataTable<Record<string, unknown>>
                columns={[
                  { key: 'name', header: 'カテゴリ / ポケモン' },
                  { key: 'type', header: 'タイプ', width: '8rem' },
                  { key: 'active', header: '有効', type: 'checkbox', width: '4rem' },
                ]}
                data={[
                  {
                    id: 'cat-grass', name: '草タイプ', type: '草系', active: true,
                    children: [
                      { id: 'cat-grass-1', name: 'フシギダネ', type: '草/毒', active: true },
                      { id: 'cat-grass-2', name: 'フシギソウ', type: '草/毒', active: false },
                    ],
                  },
                  {
                    id: 'cat-fire', name: '炎タイプ', type: '炎系', active: true,
                    children: [
                      { id: 'cat-fire-1', name: 'ヒトカゲ', type: '炎', active: true },
                      { id: 'cat-fire-2', name: 'リザードン', type: '炎/飛行', active: true },
                    ],
                  },
                  { id: 'cat-electric', name: '電気タイプ（子なし）', type: '電気系', active: false },
                ]}
                rowKey="id"
                childrenKey="children"
              />
            </div>

            {/* 4. useTableData による行追加・変更追跡 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">
                ④ 行追加・変更追跡（useTableData フック）
              </p>
              <AddRowDemo />
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
