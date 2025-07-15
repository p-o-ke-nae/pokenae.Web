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
import { collectionApi } from '../../../utils/collectionApi';
import { API_CONFIG, buildApiUrl } from '../../../utils/config';
import { 
  getRefreshConfig, 
  UserPreferences, 
  STORAGE_KEYS 
} from '../../../utils/refreshConfig';
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
  const [allColumns, setAllColumns] = useState([]); // DexDetail用の全カラム情報
  const [error, setError] = useState(null);
  
  // DexDetailモーダル関連
  const [modalData, setModalData] = useState(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(-1);

  // 定期更新用
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  
  // 設定ファイルから初期設定を取得
  const refreshConfig = getRefreshConfig('CollectionDetail');
  const [refreshIntervalMs] = useState(refreshConfig.defaultInterval); // 設定ファイルからのみ取得、変更不可
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(() => {
    // ユーザー設定を優先、なければ設定ファイルのデフォルト値
    return UserPreferences.load(STORAGE_KEYS.REFRESH_ENABLED, refreshConfig.defaultEnabled);
  });

  // コレクション初期読込（一度のみ）
  useEffect(() => {
    const loadCollectionData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('APIサーバーへの接続を確認しています...');

        // APIサーバーの接続テスト
        try {
          const healthCheck = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COLLECTION_TABLE), {
            method: 'HEAD',
            ...API_CONFIG.DEFAULT_OPTIONS,
          });
          console.log('API Server Health Check:', healthCheck.status);
        } catch (healthError) {
          console.warn('API Server Health Check failed:', healthError);
          throw new Error(`APIサーバー（${API_CONFIG.BASE_URL}）に接続できません`);
        }

        setLoadingMessage('コレクション情報を取得しています...');

        // コレクション詳細を取得
        const collectionResponse = await collectionApi.getCollectionById(params.tableId);
        console.log('Collection API Response:', collectionResponse);
        
        const collection = collectionResponse;
        setCollectionData(collection);

        setLoadingMessage('カラム情報を処理しています...');

        // カラム情報の処理（APIレスポンス形式: columnIds配列）
        let columnsData = [];
        let allColumnsData = [];
        if (collection.columnIds && collection.columnIds.length > 0) {
          // columnIdsから動的にカラム定義を作成
          console.log('Found columnIds:', collection.columnIds);
          const columnResult = createColumnsFromColumnIds(collection.columnIds);
          columnsData = columnResult.visibleColumns;
          allColumnsData = columnResult.allColumns;
        } else {
          // カラム情報がない場合は、別途取得を試みる
          try {
            setLoadingMessage('カラム情報を別途取得しています...');
            const columnsResponse = await collectionApi.getColumns(params.tableId);
            if (columnsResponse.data) {
              // 従来の形式でカラム情報を生成（表示・非表示の区別なし）
              const generatedColumns = columnsResponse.data.map(item => ({
                key: item.name?.toLowerCase().replace(/\s+/g, '_'),
                label: item.displayName || item.name,
                editable: !item.required || item.name !== 'id',
                type: item.type || 'string',
                visible: true // デフォルトで表示
              }));
              columnsData = generatedColumns;
              allColumnsData = generatedColumns;
            }
          } catch (columnError) {
            console.warn('Failed to fetch columns separately:', columnError);
            // APIからカラム情報を取得できない場合は空配列
            columnsData = [];
            allColumnsData = [];
          }
        }

        setColumns(columnsData);
        setAllColumns(allColumnsData);
        console.log('Visible columns set in state:', columnsData);
        console.log('All columns set in state:', allColumnsData);

        // 初回レコードデータ読込（カラム情報設定後）
        console.log('About to load records. columnsData.length:', columnsData.length);
        if (columnsData.length > 0) {
          console.log('Loading records with provided columns');
          await loadRecordsData(columnsData);
        } else {
          console.warn('No visible columns found, attempting to load records anyway');
          await loadRecordsData();
        }

        const collectionName = collection.name || 'コレクション';
        showSuccess(`${collectionName}のデータを読み込みました`);

      } catch (error) {
        console.error('Failed to load collection data:', error);
        const errorMessage = `データの読み込みに失敗しました: ${error.message}`;
        setError(errorMessage);
        setLoadingMessage('');
        
        // APIサーバーが起動していない場合の情報表示
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          showError(`APIサーバー（${API_CONFIG.BASE_URL}）に接続できません。サーバーが起動しているか確認してください。`);
        } else {
          showError(errorMessage);
        }
        
        // エラー時は空のデータを設定
        setCollectionData(null);
        setColumns([]);
        setTableData([]);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    loadCollectionData();
  }, [params.tableId]); // showError, showSuccessを依存配列から削除

  // レコードデータのみを取得する関数
  const loadRecordsData = async (providedColumns = null) => {
    try {
      setLoadingMessage('レコードデータを取得しています...');
      
      console.log('=== loadRecordsData START ===');
      console.log('providedColumns:', providedColumns);
      console.log('current columns state:', columns);
      console.log('collectionData:', collectionData);
      
      // 実際のAPIからレコードデータを取得
      console.log('Requesting records for tableId:', params.tableId);
      
      // tableIdの検証
      if (!params.tableId || typeof params.tableId !== 'string' || params.tableId.trim() === '') {
        throw new Error('Invalid tableId parameter');
      }
      
      const recordsResponse = await collectionApi.getRecords(params.tableId, {
        includeHidden: true,
        includeAllValues: true
      });
      console.log('Records API Response:', recordsResponse);
      console.log('Records response type:', typeof recordsResponse);
      console.log('Records is array:', Array.isArray(recordsResponse));
      
      if (recordsResponse && Array.isArray(recordsResponse)) {
        // カラム情報を引数から取得、なければ現在のstateから取得
        let currentColumns = providedColumns || columns;
        console.log('currentColumns after fallback:', currentColumns);          // 初回読み込み時でカラム情報がない場合は、レコードデータから直接生成
          if (currentColumns.length === 0) {
            console.log('No column information available, generating from record data...');
            console.log('recordsResponse sample:', recordsResponse[0]);
            
            // レコードデータから直接カラム定義を生成
            if (recordsResponse.length > 0 && recordsResponse[0].values) {
              const firstRecord = recordsResponse[0];
              // 全カラムIDを収集（レコードのvalues配列から）
              const allColumnIds = firstRecord.values.map(valueItem => valueItem.columnId);
              console.log('Extracted columnIds from record data:', allColumnIds);
              
              const columnResult = createColumnsFromColumnIds(allColumnIds, recordsResponse);
              currentColumns = columnResult.visibleColumns;
              const allColumnsFromRecord = columnResult.allColumns;
              
              console.log('Generated visible columns from record data:', currentColumns);
              console.log('Generated all columns from record data:', allColumnsFromRecord);
              
              setColumns(currentColumns);
              setAllColumns(allColumnsFromRecord);
            } else {
              console.warn('No record data available to generate columns');
            }
          }
        
        // カラム情報が存在する場合のみテーブルデータを変換
        if (currentColumns.length > 0) {
          console.log('Converting records to table data...');
          // APIレスポンス形式からテーブル用データに変換（全列情報も渡す）
          const tableRecords = convertRecordsToTableData(recordsResponse, currentColumns, allColumns);
          console.log('Converted table records:', tableRecords);
          setTableData(tableRecords);
          setLastUpdated(new Date());
          
          console.log('Records updated:', tableRecords.length, 'records');
          console.log('Visible columns:', currentColumns.length, 'columns');
          console.log('All columns:', allColumns.length, 'columns');
        } else {
          console.warn('No column information available for data conversion');
          console.warn('currentColumns.length:', currentColumns.length);
          console.warn('allColumns.length:', allColumns.length);
          setTableData([]);
        }
      } else {
        console.log('No records available from API or invalid response format');
        console.log('recordsResponse:', recordsResponse);
        setTableData([]);
      }
      
      console.log('=== loadRecordsData END ===');
    } catch (recordError) {
      console.error('Failed to fetch records from API:', recordError);
      console.error('Error details:', recordError.message);
      console.error('Error stack:', recordError.stack);
      
      // エラー詳細をユーザーに表示
      if (recordError.message.includes('400')) {
        showError('APIリクエストエラー: データ形式に問題があります。管理者に連絡してください。');
      } else if (recordError.message.includes('Empty type must have an empty value')) {
        showError('データ型エラー: 空の値フィールドに不正な値が設定されています。');
      } else {
        showError(`レコードデータの取得に失敗しました: ${recordError.message}`);
      }
      
      // エラー時は既存データを保持
    } finally {
      setLoadingMessage('');
    }
  };

  // 定期更新設定
  useEffect(() => {
    const startAutoRefresh = () => {
      // 既存のインターバルをクリア
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }

      // 自動更新が有効で、必要な条件が揃っている場合のみ開始
      if (isAutoRefreshEnabled && collectionData && !isLoading && !isSaving) {
        const interval = setInterval(() => {
          if (!isLoading && !isSaving && collectionData) {
            loadRecordsData();
          }
        }, refreshIntervalMs);

        setAutoRefreshInterval(interval);
        
        // ログ出力（設定で有効な場合のみ）
        if (refreshConfig.systemSettings.LOG_REFRESH_ACTIVITY) {
          console.log(`Auto refresh started with interval: ${refreshIntervalMs}ms (${refreshIntervalMs / 1000}秒) - configured in refreshConfig.js`);
        }
      }
    };

    startAutoRefresh();

    // クリーンアップ関数
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [isAutoRefreshEnabled, refreshIntervalMs, collectionData, isLoading, isSaving]);

  // 自動更新の開始/停止
  const toggleAutoRefresh = () => {
    const newEnabled = !isAutoRefreshEnabled;
    setIsAutoRefreshEnabled(newEnabled);
    
    // ユーザー設定を保存
    UserPreferences.save(STORAGE_KEYS.REFRESH_ENABLED, newEnabled);
    
    if (refreshConfig.systemSettings.LOG_REFRESH_ACTIVITY) {
      console.log(`Auto refresh ${newEnabled ? 'enabled' : 'disabled'}`);
    }
  };

  // コンポーネントのアンマウント時にintervalをクリア
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    };
  }, []);

  // 手動更新
  const handleManualRefresh = async () => {
    if (!isLoading && !isSaving) {
      await loadRecordsData();
      showInfo('レコードデータを更新しました');
    }
  };

  // APIレスポンスのcolumnIdsからカラム定義を作成（レコードデータからカラム情報を抽出）
  const createColumnsFromColumnIds = (columnIds, recordsData = null) => {
    console.log('=== createColumnsFromColumnIds START ===');
    console.log('columnIds:', columnIds);
    console.log('recordsData length:', recordsData?.length);
    
    if (!columnIds || !Array.isArray(columnIds)) {
      console.warn('Invalid columnIds provided:', columnIds);
      return { visibleColumns: [], allColumns: [] };
    }

    // レコードデータからカラム名と表示設定を抽出
    const columnInfoMap = {};
    if (recordsData && Array.isArray(recordsData) && recordsData.length > 0) {
      console.log('Extracting column info from record data...');
      // 最初のレコードからカラム情報を取得
      const firstRecord = recordsData[0];
      if (firstRecord.values && Array.isArray(firstRecord.values)) {
        firstRecord.values.forEach(valueItem => {
          console.log('Processing value item:', valueItem);
          columnInfoMap[valueItem.columnId] = {
            name: valueItem.columnName,
            isVisible: valueItem.isVisible,
            dataType: valueItem.dataType
          };
        });
      }
    }

    console.log('Column info map:', columnInfoMap);

    // フォールバック用カラムラベルマッピング
    const fallbackColumnLabelMap = {
      'cd2489c5-1450-4adf-8b87-5a3391698e20': '書籍名',
      '67658541-811b-43bb-ad04-6be9e4524743': '著者名',
      'c17b598a-7132-4c3d-9dec-2dbf8886bd94': '発行年',
      'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc': '所持',
      'b2a3c709-da83-4dea-8143-736f231de357': '評価'
    };

    const allColumns = columnIds.map((columnId, index) => {
      const columnInfo = columnInfoMap[columnId];
      const label = columnInfo?.name || fallbackColumnLabelMap[columnId] || `カラム${index + 1}`;
      const isVisible = columnInfo?.isVisible === true; // 厳密にtrueかチェック
      const dataType = columnInfo?.dataType || 'Text';

      console.log(`Column ${columnId}: label=${label}, isVisible=${isVisible}, dataType=${dataType}`);

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
        showHeader: isVisible, // 非表示列はヘッダーも非表示
        width: uiType === 'number' ? '100px' : uiType === 'boolean' ? '100px' : '150px'
      };
    });
    
    // 表示用：isVisible === true の列のみをフィルタリング
    const visibleColumns = allColumns.filter(column => column.visible === true);
    
    console.log('All columns generated:', allColumns);
    console.log('Visible columns after filtering:', visibleColumns);
    console.log('=== createColumnsFromColumnIds END ===');
    
    return { visibleColumns, allColumns };
  };

  // APIレスポンスのレコードデータをテーブル用データに変換
  const convertRecordsToTableData = (records, columns, allColumns = []) => {
    console.log('=== convertRecordsToTableData START ===');
    console.log('Input records count:', records?.length);
    console.log('Input visible columns count:', columns?.length);
    console.log('Input all columns count:', allColumns?.length);
    console.log('Sample record:', records?.[0]);
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      console.warn('No records to convert');
      return [];
    }
    
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      console.warn('No columns defined for conversion');
      return [];
    }
    
    // 処理対象の全カラム（DexDetail用に非表示列も含める）
    const processingColumns = allColumns.length > 0 ? allColumns : columns;
    console.log('Processing columns:', processingColumns.map(col => ({ key: col.key, label: col.label, visible: col.visible })));
    
    const result = records.map((record, index) => {
      console.log(`Processing record ${index}:`, record);
      
      const tableRow = {
        id: record.id || `record-${Date.now()}-${index}`, // より確実なユニークID
        recordId: record.id,
        tableId: record.tableId,
        backgroundColor: record.backgroundColor,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy
      };

      // values配列からcolumnIdに基づいてデータを展開（全列を処理、DexDetail用）
      if (record.values && Array.isArray(record.values)) {
        console.log(`Record ${index} values:`, record.values);
        
        record.values.forEach(valueItem => {
          const columnId = valueItem.columnId;
          console.log(`Processing value item for column ${columnId}:`, valueItem);
          
          if (columnId) {
            // すべての列を処理（APIレスポンスに含まれているすべての値を保存）
            let convertedValue;
            try {
              console.log(`Converting value for ${columnId}: value="${valueItem.value}", type="${valueItem.type || valueItem.dataType}"`);
              
              switch (valueItem.type || valueItem.dataType) {
                case 'Boolean':
                  // チェックボックス表示用にboolean値として保持
                  convertedValue = valueItem.value === 'True';
                  break;
                case 'Number':
                  // 数値型の場合、有効な数値かチェック
                  const numValue = parseFloat(valueItem.value);
                  convertedValue = isNaN(numValue) ? '' : valueItem.value;
                  break;
                case 'Empty':
                  // Emptyタイプは常に空文字列（値が設定されていてもクリア）
                  convertedValue = '';
                  break;
                default: // Text
                  convertedValue = valueItem.value || '';
              }
              console.log(`Setting tableRow[${columnId}] = "${convertedValue}" (type: ${typeof convertedValue}, originalType: ${valueItem.type})`);
              tableRow[columnId] = convertedValue;
            } catch (conversionError) {
              console.warn(`Value conversion error for column ${columnId}:`, conversionError);
              console.warn('Original value:', valueItem.value);
              console.warn('Value type:', valueItem.type);
              // エラー時は空文字列に設定
              tableRow[columnId] = '';
            }
          } else {
            console.warn('valueItem has no columnId:', valueItem);
          }
        });
      }

      // 処理対象のカラムIDに対してのみデフォルト値を設定（undefinedを防ぐ）
      processingColumns.forEach(column => {
        if (!(column.key in tableRow)) {
          console.log(`Setting default value for missing column ${column.key} (${column.label})`);
          
          // データタイプに応じたデフォルト値を設定
          let defaultValue = '';
          if (column.type === 'boolean') {
            defaultValue = false;
          } else if (column.type === 'number') {
            defaultValue = 0;
          } else {
            defaultValue = '（データなし）';
          }
          
          tableRow[column.key] = defaultValue;
        }
      });

      console.log(`Final tableRow for record ${index}:`, tableRow);
      console.log(`Final tableRow keys:`, Object.keys(tableRow));
      return tableRow;
    });
    
    console.log('=== convertRecordsToTableData END ===');
    console.log('Final result count:', result.length);
    console.log('Final result:', result);
    return result;
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
  const handleRowClick = (rowIndex, row, prevRow, nextRow) => {
    if (rowIndex >= 0 && rowIndex < tableData.length) {
      setCurrentRowIndex(rowIndex);
      setModalData({
        row: row,
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
      const newIndex = currentRowIndex - 1;
      const currentRow = tableData[newIndex];
      const prevRow = newIndex > 0 ? tableData[newIndex - 1] : null;
      const nextRow = newIndex < tableData.length - 1 ? tableData[newIndex + 1] : null;
      
      setCurrentRowIndex(newIndex);
      setModalData({
        row: currentRow,
        prevRow: prevRow,
        nextRow: nextRow
      });
    }
  };

  // 次のレコードに移動
  const handleNextRow = () => {
    if (currentRowIndex < tableData.length - 1) {
      const newIndex = currentRowIndex + 1;
      const currentRow = tableData[newIndex];
      const prevRow = newIndex > 0 ? tableData[newIndex - 1] : null;
      const nextRow = newIndex < tableData.length - 1 ? tableData[newIndex + 1] : null;
      
      setCurrentRowIndex(newIndex);
      setModalData({
        row: currentRow,
        prevRow: prevRow,
        nextRow: nextRow
      });
    }
  };

  const handleExport = () => {
    // CSV エクスポート機能（表示対象の列のみ）
    const visibleColumns = columns.filter(col => col.visible === true);
    const csvContent = [
      visibleColumns.map(col => col.label).join(','),
      ...tableData.map(row => 
        visibleColumns.map(col => row[col.key] || '').join(',')
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
        {error && (
          <div className={styles.errorBanner}>
            <p>⚠️ APIエラー: {error}</p>
          </div>
        )}
        
        <div className={styles.header}>
          <CustomHeader>{collectionData?.name || 'コレクション詳細'}</CustomHeader>
          <div className={styles.headerActions}>
            <CustomButton 
              onClick={handleManualRefresh}
              label="手動更新"
              disabled={isLoading || isSaving}
            />
            <CustomButton 
              onClick={toggleAutoRefresh}
              label={isAutoRefreshEnabled ? "自動更新停止" : "自動更新開始"}
              disabled={isLoading || isSaving}
            />
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
          <p>API Base URL: <code>{API_CONFIG.BASE_URL}</code></p>
          <p>コレクションID: <code>{params.tableId}</code></p>
          <p>総件数: {tableData.length} 件</p>
          {lastUpdated && (
            <p>最終更新: {lastUpdated.toLocaleString('ja-JP')}</p>
          )}
          <p>
            自動更新: {isAutoRefreshEnabled ? 
              <span style={{color: 'green'}}>
                有効 ({refreshIntervalMs / 1000}秒間隔) - 設定ファイルで制御
              </span> : 
              <span style={{color: 'red'}}>無効</span>
            }
          </p>
          {collectionData?.description && (
            <p>説明: {collectionData.description}</p>
          )}
          {collectionData?.ownerId && (
            <p>オーナーID: <code>{collectionData.ownerId}</code></p>
          )}
          {collectionData?.columnIds && (
            <p>カラム数: {collectionData.columnIds.length} 個 (表示: {columns.length} 個)</p>
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
            {/* デバッグ: CustomTableに渡されるデータ */}
            {console.log('About to render CustomTable with:')}
            {console.log('tableData:', tableData)}
            {console.log('columns:', columns)}
            {console.log('tableData.length:', tableData.length)}
            {console.log('columns.length:', columns.length)}
            <CustomTable 
              data={tableData}
              columns={columns}
              rowsPerPage={15}
              onDataChange={handleDataChange}
              onRowClick={handleRowClick}
              tableSettings={{
                sortableColumns: columns.filter(col => col.visible === true).map(col => col.key || col.name),
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
          columns={allColumns.length > 0 ? allColumns : columns} // 全列情報を渡す（非表示列も含む）
        />
      </div>
    </Layout>
  );
}
