'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Layout,
  CustomHeader, 
  CustomButton,
  CustomTable,
  CustomLoading,
  CustomModal,
  CustomLabel,
  useAppContext
} from '@webcomponent/components';
import DexDetail from '../../../components/DexDetail';
import { collectionApiWithFallback } from '../../../utils/demoData';
import styles from './CollectionDetail.module.css';

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showInfo, showSuccess, showError } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('データを読み込んでいます...');
  const [isSaving, setIsSaving] = useState(false);
  const [collectionData, setCollectionData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);

  const [isDemo, setIsDemo] = useState(false);
  
  // DexDetailモーダル関連
  const [modalData, setModalData] = useState(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(-1);

  useEffect(() => {
    const loadCollectionData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('コレクション情報を取得しています...');

        // コレクション詳細を取得（フォールバック付き）
        const collectionResponse = await collectionApiWithFallback.getCollectionById(params.tableId);
        
        if (collectionResponse.isDemo) {
          setIsDemo(true);
          setError(collectionResponse.message);
        }
        
        const collection = collectionResponse.data || collectionResponse;
        setCollectionData(collection);

        setLoadingMessage('カラム情報を処理しています...');

        // カラム情報の処理（APIレスポンス形式: columnIds配列）
        let columnsData = [];
        if (collection.columnIds && collection.columnIds.length > 0) {
          // columnIdsから動的にカラム定義を作成
          console.log('Found columnIds:', collection.columnIds);
          columnsData = createColumnsFromColumnIds(collection.columnIds);
        } else {
          // カラム情報がない場合は、別途取得を試みる
          try {
            setLoadingMessage('カラム情報を別途取得しています...');
            const columnsResponse = await collectionApiWithFallback.getColumns(params.tableId);
            if (columnsResponse.data) {
              columnsData = columnsResponse.data.map(item => ({
                key: item.name?.toLowerCase().replace(/\s+/g, '_'),
                label: item.displayName || item.name,
                editable: !item.required || item.name !== 'id',
                type: item.type || 'string'
              }));
            }
          } catch (columnError) {
            console.warn('Failed to fetch columns separately:', columnError);
            // フォールバック用デフォルトカラム
            columnsData = getDefaultColumns(params.tableId);
          }
        }

        setColumns(columnsData);

        setLoadingMessage('データを整理しています...');

        // レコードデータを取得してテーブル用に変換
        let tableRecords = [];
        let recordsResponse = null;
        try {
          setLoadingMessage('レコードデータを取得しています...');
          // 実際のAPIからレコードデータを取得
          const { collectionApi } = await import('../../../utils/collectionApi');
          recordsResponse = await collectionApi.getRecords(params.tableId);
          
          if (recordsResponse && Array.isArray(recordsResponse)) {
            // レコードデータからカラム情報を更新（カラム名や表示設定を含む）
            if (collection.columnIds && collection.columnIds.length > 0 && recordsResponse.length > 0) {
              console.log('Updating column definitions from record data...');
              columnsData = createColumnsFromColumnIds(collection.columnIds, recordsResponse);
              setColumns(columnsData);
            }
            
            // APIレスポンス形式からテーブル用データに変換
            tableRecords = convertRecordsToTableData(recordsResponse, columnsData);
          }
        } catch (recordError) {
          console.warn('Failed to fetch records from API:', recordError);
          // APIエラーの場合はフォールバック処理
        }

        // データを設定
        if (tableRecords.length > 0) {
          console.log('Using API records:', tableRecords.length, 'records');
          setTableData(tableRecords);
        } else if (collection.items && collection.items.length > 0) {
          console.log('Using collection items:', collection.items.length, 'items');
          setTableData(collection.items);
        } else {
          // デモデータを生成
          console.log('Generating demo data for tableId:', params.tableId);
          const demoData = generateDemoData(params.tableId, 25);
          console.log('Generated demo data:', demoData.length, 'items');
          setTableData(demoData);
        }

        const collectionName = collection.name || 'コレクション';
        showSuccess(`${collectionName}のデータを読み込みました${collectionResponse.isDemo ? '（デモモード）' : ''}`);

      } catch (error) {
        console.error('Failed to load collection data:', error);
        setError('データの読み込みに失敗しました');
        setLoadingMessage('エラーが発生しました。デモデータを準備しています...');
        
        // エラー時はデモデータを表示
        const fallbackCollection = getFallbackCollection(params.tableId);
        setCollectionData(fallbackCollection);
        setColumns(getDefaultColumns(params.tableId));
        const fallbackData = generateDemoData(params.tableId, 25);
        console.log('Using fallback demo data:', fallbackData.length, 'items');
        setTableData(fallbackData);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    loadCollectionData();
  }, [params.tableId]); // showError, showSuccessを依存配列から削除

  // APIレスポンスのcolumnIdsからカラム定義を作成（レコードデータからカラム情報を抽出）
  const createColumnsFromColumnIds = (columnIds, recordsData = null) => {
    if (!columnIds || !Array.isArray(columnIds)) {
      return [];
    }

    // レコードデータからカラム名と表示設定を抽出
    const columnInfoMap = {};
    if (recordsData && Array.isArray(recordsData) && recordsData.length > 0) {
      // 最初のレコードからカラム情報を取得
      const firstRecord = recordsData[0];
      if (firstRecord.values && Array.isArray(firstRecord.values)) {
        firstRecord.values.forEach(valueItem => {
          columnInfoMap[valueItem.columnId] = {
            name: valueItem.columnName,
            isVisible: valueItem.isVisible,
            dataType: valueItem.dataType
          };
        });
      }
    }

    // フォールバック用カラムラベルマッピング
    const fallbackColumnLabelMap = {
      'cd2489c5-1450-4adf-8b87-5a3391698e20': '書籍名',
      '67658541-811b-43bb-ad04-6be9e4524743': '著者名',
      'c17b598a-7132-4c3d-9dec-2dbf8886bd94': '発行年',
      'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc': '所持',
      'b2a3c709-da83-4dea-8143-736f231de357': '評価'
    };

    return columnIds.map((columnId, index) => {
      const columnInfo = columnInfoMap[columnId];
      const label = columnInfo?.name || fallbackColumnLabelMap[columnId] || `カラム${index + 1}`;
      const isVisible = columnInfo?.isVisible !== undefined ? columnInfo.isVisible : true;
      const dataType = columnInfo?.dataType || 'Text';

      // データタイプからUIタイプを決定
      let uiType = 'text';
      if (dataType === 'Number') {
        uiType = 'number';
      } else if (dataType === 'Boolean') {
        uiType = 'boolean';
      }

      return {
        key: columnId, // columnIdを直接キーとして使用
        name: columnId, // DexDetailで使用するnameプロパティ
        label: label,
        header: label, // DexDetailで表示されるヘッダー
        editable: false,
        type: uiType,
        visible: isVisible,
        showHeader: true,
        width: uiType === 'number' ? '100px' : uiType === 'boolean' ? '100px' : '150px'
      };
    });
  };

  // APIレスポンスのレコードデータをテーブル用データに変換
  const convertRecordsToTableData = (records, columns) => {
    return records.map((record, index) => {
      const tableRow = {
        id: record.id || `record-${Date.now()}-${index}`, // より確実なユニークID
        recordId: record.id,
        tableId: record.tableId,
        backgroundColor: record.backgroundColor,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy
      };

      // values配列からcolumnIdに基づいてデータを展開
      if (record.values && Array.isArray(record.values)) {
        record.values.forEach(valueItem => {
          const columnId = valueItem.columnId;
          
          if (columnId) {
            // isVisibleがfalseの場合はスキップ（将来の機能拡張用）
            // 現在はすべてtrueなので処理を続行
            
            // タイプに応じて値を変換
            switch (valueItem.type || valueItem.dataType) {
              case 'Boolean':
                tableRow[columnId] = valueItem.value === 'True' ? '読了' : '未読';
                break;
              case 'Number':
                tableRow[columnId] = valueItem.value;
                break;
              case 'Empty':
                tableRow[columnId] = '';
                break;
              default: // Text
                tableRow[columnId] = valueItem.value || '';
            }
          }
        });
      }

      // 全てのカラムIDに対してデフォルト値を設定（undefinedを防ぐ）
      columns.forEach(column => {
        if (!(column.key in tableRow)) {
          tableRow[column.key] = '';
        }
      });

      return tableRow;
    });
  };


  // デフォルトカラム定義（UUIDとデモ用ID両方に対応）
  const getDefaultColumns = (tableId) => {
    const columnMap = {
      // UUIDベース（実際のAPIレスポンス）
      'f1dbf3a5-3b86-4939-99e8-d564a11b4326': [
        { key: 'cd2489c5-1450-4adf-8b87-5a3391698e20', name: 'cd2489c5-1450-4adf-8b87-5a3391698e20', label: '書籍名', header: '書籍名', editable: true, type: 'text', visible: true, showHeader: true, width: '200px' },
        { key: '67658541-811b-43bb-ad04-6be9e4524743', name: '67658541-811b-43bb-ad04-6be9e4524743', label: '著者名', header: '著者名', editable: true, type: 'text', visible: true, showHeader: true, width: '150px' },
        { key: 'c17b598a-7132-4c3d-9dec-2dbf8886bd94', name: 'c17b598a-7132-4c3d-9dec-2dbf8886bd94', label: '発行年', header: '発行年', editable: true, type: 'number', visible: true, showHeader: true, width: '100px' },
        { key: 'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc', name: 'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc', label: '所持', header: '所持', editable: true, type: 'boolean', visible: true, showHeader: true, width: '100px' },
        { key: 'b2a3c709-da83-4dea-8143-736f231de357', name: 'b2a3c709-da83-4dea-8143-736f231de357', label: '評価', header: '評価', editable: true, type: 'text', visible: true, showHeader: true, width: '200px' }
      ],
      // デモ用ID（従来の互換性）
      'demo1': [
        { key: 'number', name: 'number', label: '図鑑番号', header: '図鑑番号', editable: false, visible: true, showHeader: true, width: '100px' },
        { key: 'name', name: 'name', label: 'ポケモン名', header: 'ポケモン名', editable: false, visible: true, showHeader: true, width: '150px' },
        { key: 'type', name: 'type', label: 'タイプ', header: 'タイプ', editable: false, visible: true, showHeader: true, width: '100px' },
        { key: 'status', name: 'status', label: 'ステータス', header: 'ステータス', editable: true, visible: true, showHeader: true, width: '100px' },
        { key: 'condition', name: 'condition', label: 'コンディション', header: 'コンディション', editable: true, visible: true, showHeader: true, width: '120px' }
      ],
      'demo2': [
        { key: 'cardId', name: 'cardId', label: 'カードID', header: 'カードID', editable: false, visible: true, showHeader: true, width: '100px' },
        { key: 'name', name: 'name', label: 'カード名', header: 'カード名', editable: false, visible: true, showHeader: true, width: '150px' },
        { key: 'rarity', name: 'rarity', label: 'レア度', header: 'レア度', editable: false, visible: true, showHeader: true, width: '100px' },
        { key: 'status', name: 'status', label: 'ステータス', header: 'ステータス', editable: true, visible: true, showHeader: true, width: '100px' },
        { key: 'price', name: 'price', label: '価格', header: '価格', editable: true, visible: true, showHeader: true, width: '100px' }
      ],
      'demo3': [
        { key: 'promoId', name: 'promoId', label: 'プロモID', header: 'プロモID', editable: false, visible: true, showHeader: true, width: '100px' },
        { key: 'name', name: 'name', label: 'カード名', header: 'カード名', editable: false, visible: true, showHeader: true, width: '150px' },
        { key: 'event', name: 'event', label: 'イベント', header: 'イベント', editable: false, visible: true, showHeader: true, width: '120px' },
        { key: 'status', name: 'status', label: 'ステータス', header: 'ステータス', editable: true, visible: true, showHeader: true, width: '100px' },
        { key: 'date', name: 'date', label: '入手日', header: '入手日', editable: true, visible: true, showHeader: true, width: '120px' }
      ]
    };

    return columnMap[tableId] || [
      { key: 'id', name: 'id', label: 'ID', header: 'ID', editable: false, visible: true, showHeader: true, width: '100px' },
      { key: 'name', name: 'name', label: '名前', header: '名前', editable: true, visible: true, showHeader: true, width: '150px' },
      { key: 'status', name: 'status', label: 'ステータス', header: 'ステータス', editable: true, visible: true, showHeader: true, width: '100px' }
    ];
  };

  // フォールバックコレクション情報（UUIDとデモ用ID両方に対応）
  const getFallbackCollection = (tableId) => {
    const fallbackMap = {
      // UUIDベース（実際のAPIレスポンス）
      'f1dbf3a5-3b86-4939-99e8-d564a11b4326': { 
        id: 'f1dbf3a5-3b86-4939-99e8-d564a11b4326', 
        name: '読書記録（デモ）',
        description: '読んだ本や読みたい本を管理するコレクション（デモモード）',
        ownerId: '11111111-1111-1111-1111-111111111111'
      },
      // デモ用ID（従来の互換性）
      'demo1': { id: 'demo1', name: 'ポケモン図鑑コレクション（デモ）' },
      'demo2': { id: 'demo2', name: 'レアカードコレクション（デモ）' },
      'demo3': { id: 'demo3', name: 'プロモカードコレクション（デモ）' }
    };

    return fallbackMap[tableId] || { id: tableId, name: `コレクション ${tableId}` };
  };

  // デモデータ生成（UUIDとデモ用ID両方に対応）
  const generateDemoData = (tableId, count) => {
    return Array.from({ length: count }, (_, index) => {
      const baseData = { 
        id: `demo-${tableId}-${index + 1}`, // ユニークID確保
        index: index + 1 
      };

      if (tableId === 'f1dbf3a5-3b86-4939-99e8-d564a11b4326') {
        // 読書記録のデモデータ（実際のAPIレスポンス形式に合わせて）
        const books = [
          { title: 'Book Title', author: 'Author Name' },
          { title: 'BLACK・CAT', author: '新井素子' },
          { title: 'ポケットモンスター', author: 'ゲームフリーク' },
          { title: 'ハリー・ポッターと賢者の石', author: 'J.K.ローリング' },
          { title: '1984年', author: 'ジョージ・オーウェル' },
        ];
        const book = books[index % books.length];
        const years = [1905, 1996, 2020, 1997, 1949];
        const completed = [true, true, false, true, false];
        const notes = ['ok', 'GOD', '', 'とても面白い', '重要な作品'];
        
        return {
          ...baseData,
          // 新しいAPIのcolumnIDを使用
          'cd2489c5-1450-4adf-8b87-5a3391698e20': book.title || '', // 書籍名
          '67658541-811b-43bb-ad04-6be9e4524743': book.author || '', // 著者名
          'c17b598a-7132-4c3d-9dec-2dbf8886bd94': years[index % years.length] || '', // 発行年
          'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc': completed[index % completed.length] ? '読了' : '未読', // 所持
          'b2a3c709-da83-4dea-8143-736f231de357': notes[index % notes.length] || '' // 評価
        };
      } else if (tableId === 'demo1') {
        return {
          ...baseData,
          number: `#${(index + 1).toString().padStart(3, '0')}`,
          name: `ポケモン${index + 1}`,
          type: ['ノーマル', 'みず', 'ほのお', 'くさ', 'でんき'][index % 5],
          status: ['所有', '未所有', '探索中'][index % 3],
          condition: ['良好', '普通', '要注意'][index % 3]
        };
      } else if (tableId === 'demo2') {
        return {
          ...baseData,
          cardId: `R${(index + 1).toString().padStart(3, '0')}`,
          name: `レアカード${index + 1}`,
          rarity: ['★', '★★', '★★★', '★★★★', '★★★★★'][index % 5],
          status: ['所有', '未所有'][index % 2],
          price: `${(index + 1) * 100}円`
        };
      } else if (tableId === 'demo3') {
        return {
          ...baseData,
          promoId: `P${(index + 1).toString().padStart(3, '0')}`,
          name: `プロモカード${index + 1}`,
          event: ['コミケ', 'ポケセン', 'イベント', 'キャンペーン'][index % 4],
          status: ['所有', '未所有'][index % 2],
          date: '2025-07-10'
        };
      } else {
        return {
          ...baseData,
          name: `アイテム${index + 1}`,
          status: ['所有', '未所有'][index % 2]
        };
      }
    });
  };

  const handleDataChange = async (newData) => {
    try {
      setIsSaving(true);
      setTableData(newData);
      
      // 実際のAPIに保存する場合はここで実装
      // await collectionApi.updateCollection(params.tableId, newData);
      
      showSuccess('データが更新されました');
    } catch (error) {
      console.error('Failed to save data:', error);
      showError('データの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 行クリック時の処理（DexDetailモーダルを開く）
  const handleRowClick = (rowIndex) => {
    if (rowIndex >= 0 && rowIndex < tableData.length) {
      const currentRow = tableData[rowIndex];
      const prevRow = rowIndex > 0 ? tableData[rowIndex - 1] : null;
      const nextRow = rowIndex < tableData.length - 1 ? tableData[rowIndex + 1] : null;
      
      setCurrentRowIndex(rowIndex);
      setModalData({
        row: currentRow,
        prevRow: prevRow,
        nextRow: nextRow
      });
    }
  };

  // DexDetailモーダルを閉じる
  const closeModal = () => {
    setModalData(null);
    setCurrentRowIndex(-1);
  };

  // 前のレコードに移動
  const handlePrevRow = () => {
    if (currentRowIndex > 0) {
      handleRowClick(currentRowIndex - 1);
    }
  };

  // 次のレコードに移動
  const handleNextRow = () => {
    if (currentRowIndex < tableData.length - 1) {
      handleRowClick(currentRowIndex + 1);
    }
  };

  const handleExport = () => {
    // CSV エクスポート機能
    const csvContent = [
      columns.map(col => col.label).join(','),
      ...tableData.map(row => 
        columns.map(col => row[col.key] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${collectionData?.name || 'collection'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('データをエクスポートしました');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <CustomLoading />
            <CustomHeader>読み込み中...</CustomHeader>
            <p>{loadingMessage}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        {(error || isDemo) && (
          <div className={styles.errorBanner}>
            <p>{isDemo ? '⚠️ デモモード' : '⚠️ APIエラー'}: {error}</p>
            {isDemo && <p>APIサーバーに接続できないため、デモデータを表示しています</p>}
          </div>
        )}
        
        <div className={styles.header}>
          <CustomHeader>{collectionData?.name || 'コレクション詳細'}</CustomHeader>
          <div className={styles.headerActions}>
            <CustomButton 
              onClick={() => router.push('/CollectionAssistanceTool')}
              label="一覧に戻る"
            />
            <CustomButton 
              onClick={handleExport}
              label="CSVエクスポート"
            />
          </div>
        </div>
        
        <div className={styles.metaInfo}>
          <p>コレクションID: <code>{params.tableId}</code></p>
          <p>総件数: {tableData.length} 件</p>
          {collectionData?.description && (
            <p>説明: {collectionData.description}</p>
          )}
          {collectionData?.ownerId && (
            <p>オーナーID: <code>{collectionData.ownerId}</code></p>
          )}
          {collectionData?.columnIds && (
            <p>カラム数: {collectionData.columnIds.length} 個</p>
          )}
          {collectionData?.createdAt && (
            <p>作成日時: {new Date(collectionData.createdAt).toLocaleString('ja-JP')}</p>
          )}
          {collectionData?.sheetId && (
            <p>SheetID: <code>{collectionData.sheetId}</code></p>
          )}
        </div>
        
        <div className={styles.content}>
          <div className={styles.tableSection}>
            {isSaving && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <CustomLoading />
                <p>データを保存しています...</p>
              </div>
            )}
            <CustomTable 
              data={tableData}
              columns={columns}
              rowsPerPage={15}
              onDataChange={handleDataChange}
              onRowClick={handleRowClick}
              tableSettings={{
                sortableColumns: columns.map(col => col.key || col.name),
                fixedColumns: 0,
                allowRowAddition: false,
                allowRowDeletion: false,
                recordsPerPageOptions: [10, 15, 25, 50]
              }}
            />
          </div>
        </div>

        {/* DexDetailモーダル */}
        <DexDetail
          modalData={modalData}
          closeModal={closeModal}
          handlePrevRow={handlePrevRow}
          handleNextRow={handleNextRow}
          columns={columns}
        />
      </div>
    </Layout>
  );
}
