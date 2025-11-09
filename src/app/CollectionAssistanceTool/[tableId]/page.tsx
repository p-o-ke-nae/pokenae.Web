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
} from '@/components/ui';
import DexDetail from '../../../components/DexDetail';
import { collectionApi } from '../../../utils/collectionApi';
import { API_CONFIG, buildApiUrl } from '../../../utils/config';
import { 
  getRefreshConfig, 
  UserPreferences, 
  STORAGE_KEYS 
} from '../../../utils/refreshConfig';
import styles from './CollectionDetail.module.css';

// HTMLサニタイゼーション関数
const sanitizeHtml = (htmlString: string): string => {
  if (typeof window !== 'undefined' && (window as any).DOMPurify) {
    return (window as any).DOMPurify.sanitize(htmlString);
  }
  
  // フォールバック: 基本的なHTMLタグのみ許可
  const allowedTags = ['p', 'span', 'div', 'strong', 'em', 'b', 'i', 'u', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const allowedAttributes = ['style', 'class'];
  
  // 簡易サニタイゼーション（本格的な実装ではDOMPurifyの使用を推奨）
  let sanitized = htmlString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
};

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showInfo, showSuccess, showError } = useAppContext();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('データを読み込んでいます...');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [collectionData, setCollectionData] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [allColumns, setAllColumns] = useState<any[]>([]); // DexDetail用の全カラム情報
  const [error, setError] = useState<string | null>(null);
  
  // DexDetailモーダル関連
  const [modalData, setModalData] = useState<any>(null);
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(-1);

  // 定期更新用
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 設定ファイルから初期設定を取得
  const refreshConfig = getRefreshConfig('CollectionDetail');
  const [refreshIntervalMs] = useState(refreshConfig.defaultInterval); // 設定ファイルからのみ取得、変更不可
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(() => {
    // ユーザー設定を優先、なければ設定ファイルのデフォルト値
    return UserPreferences.load(STORAGE_KEYS.REFRESH_ENABLED, refreshConfig.defaultEnabled);
  });

  // DOMPurifyライブラリの動的読み込み
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).DOMPurify) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

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
        } catch (healthError) {
          throw new Error(`APIサーバー（${API_CONFIG.BASE_URL}）に接続できません`);
        }

        setLoadingMessage('コレクション情報を取得しています...');

        // コレクション詳細を取得
        const collectionResponse = await collectionApi.getCollectionById(params.tableId);
        const collection = collectionResponse;
        setCollectionData(collection);

        setLoadingMessage('カラム情報を処理しています...');

        // カラム情報の処理（APIレスポンス形式: columnIds配列）
        let columnsData = [];
        let allColumnsData = [];
        if (collection.columnIds && collection.columnIds.length > 0) {
          // columnIdsから動的にカラム定義を作成
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
              const generatedColumns = columnsResponse.data.map((item: any) => ({
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

        // 初回レコードデータ読込（カラム情報設定後）
        if (columnsData.length > 0) {
          await loadRecordsData(columnsData);
        } else {
          await loadRecordsData();
        }

        const collectionName = collection.name || 'コレクション';
        // showSuccess(`${collectionName}のデータを読み込みました`);

      } catch (error) {
        console.error('Failed to load collection data:', error);
        const errorMessage = `データの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`;
        setError(errorMessage);
        setLoadingMessage('');
        
        // APIサーバーが起動していない場合の情報表示
        if ((error instanceof Error && error.message.includes('Failed to fetch')) || (error instanceof Error && error.message.includes('ERR_CONNECTION_REFUSED'))) {
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
      
      // tableIdの検証
      if (!params.tableId || typeof params.tableId !== 'string' || params.tableId.trim() === '') {
        throw new Error('Invalid tableId parameter');
      }
      
      const recordsResponse = await collectionApi.getRecords(params.tableId);
      
      if (recordsResponse && Array.isArray(recordsResponse)) {
        // カラム情報を引数から取得、なければ現在のstateから取得
        let currentColumns = providedColumns || columns;
        
        // 初回読み込み時でカラム情報がない場合は、レコードデータから直接生成
        if (currentColumns.length === 0) {
          if (recordsResponse.length > 0 && recordsResponse[0].values) {
            const firstRecord = recordsResponse[0];
            // 全カラムIDを収集（レコードのvalues配列から）
            const allColumnIds = firstRecord.values.map((valueItem: any) => valueItem.columnId);
            
            const columnResult = createColumnsFromColumnIds(allColumnIds, recordsResponse);
            currentColumns = columnResult.visibleColumns;
            const allColumnsFromRecord = columnResult.allColumns;
            
            setColumns(currentColumns);
            setAllColumns(allColumnsFromRecord);
          }
        }
        
        // カラム情報が存在する場合のみテーブルデータを変換
        if (currentColumns.length > 0) {
          const tableRecords = convertRecordsToTableData(recordsResponse, currentColumns, allColumns);
          setTableData([...tableRecords]); // 新しい配列参照で確実に更新
          setLastUpdated(new Date());
        } else {
          setTableData([]);
        }
      } else {
        setTableData([]);
      }
      
    } catch (recordError) {
      console.error('Failed to fetch records:', recordError);
      
      // エラー詳細をユーザーに表示
      const errorMsg = recordError instanceof Error ? recordError.message : String(recordError);
      if (errorMsg.includes('400')) {
        showError('APIリクエストエラー: データ形式に問題があります。管理者に連絡してください。');
      } else if (errorMsg.includes('Empty type must have an empty value')) {
        showError('データ型エラー: 空の値フィールドに不正な値が設定されています。');
      } else {
        showError(`レコードデータの取得に失敗しました: ${errorMsg}`);
      }
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
          console.log(`Auto refresh started with interval: ${refreshIntervalMs}ms (${refreshIntervalMs / 1000}秒)`);
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

  // tableDataの更新を確認（開発モードでのみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && tableData.length > 0) {
      // 開発者ツールでのみ確認可能
      (window as any).__POKENAE_DEBUG = {
        tableDataCount: tableData.length,
        lastUpdated: lastUpdated,
        firstRecord: tableData[0]
      };
    }
  }, [tableData, lastUpdated]);

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

  // APIレスポンスのcolumnIdsからカラム定義を作成
  const createColumnsFromColumnIds = (columnIds: string[], recordsData: any[] | null = null) => {
    if (!columnIds || !Array.isArray(columnIds)) {
      return { visibleColumns: [], allColumns: [] };
    }

    // レコードデータからカラム名と表示設定を抽出
    const columnInfoMap = {};
    if (recordsData && Array.isArray(recordsData) && recordsData.length > 0) {
      const firstRecord = recordsData[0];
      if (firstRecord.values && Array.isArray(firstRecord.values)) {
        firstRecord.values.forEach(valueItem => {
          columnInfoMap[valueItem.columnId] = {
            name: valueItem.columnName,
            isVisible: valueItem.isVisible,
            dataType: valueItem.dataType,
            width: valueItem.width
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

    const allColumns = columnIds.map((columnId, index) => {
      const columnInfo = columnInfoMap[columnId];
      const label = columnInfo?.name || fallbackColumnLabelMap[columnId] || `カラム${index + 1}`;
      const isVisible = columnInfo?.isVisible === true;
      const dataType = columnInfo?.dataType || 'Text';
      const width = columnInfo?.width;

      // データタイプからUIタイプを決定
      let uiType = 'text';
      if (dataType === 'Number') {
        uiType = 'number';
      } else if (dataType === 'Boolean') {
        uiType = 'boolean';
      }

      // 幅の設定：APIから取得した値を優先、フォールバックはデータタイプに基づく
      let columnWidth;
      if (width && typeof width === 'number') {
        columnWidth = `${width}px`;
      } else {
        // フォールバック：データタイプに基づく幅設定
        columnWidth = uiType === 'number' ? '100px' : uiType === 'boolean' ? '100px' : '150px';
      }

      return {
        key: columnId,
        name: columnId,
        label: label,
        header: label,
        editable: false,
        type: uiType,
        visible: isVisible,
        showHeader: isVisible,
        width: columnWidth
      };
    });
    
    // 表示用：isVisible === true の列のみをフィルタリング
    const visibleColumns = allColumns.filter(column => column.visible === true);
    
    return { visibleColumns, allColumns };
  };

  // APIレスポンスのレコードデータをテーブル用データに変換
  const convertRecordsToTableData = (records: any[], columns: any[], allColumns: any[] = []) => {
    if (!records || !Array.isArray(records) || records.length === 0) {
      return [];
    }
    
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return [];
    }
    
    // 処理対象の全カラム（DexDetail用に非表示列も含める）
    const processingColumns = allColumns.length > 0 ? allColumns : columns;
    
    const result = records.map((record, index) => {
      const tableRow = {
        id: record.id || `record-${Date.now()}-${index}`,
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
            let convertedValue;
            try {
              switch (valueItem.type || valueItem.dataType) {
                case 'Boolean':
                  convertedValue = valueItem.value === 'True';
                  break;
                case 'Number':
                  const numValue = parseFloat(valueItem.value);
                  convertedValue = isNaN(numValue) ? '' : valueItem.value;
                  break;
                case 'Empty':
                  convertedValue = '';
                  break;
                default: // Text
                  convertedValue = valueItem.value || '';
              }
              tableRow[columnId] = convertedValue;
            } catch (conversionError) {
              console.warn(`Value conversion error for column ${columnId}:`, conversionError);
              tableRow[columnId] = '';
            }
          }
        });
      }

      // 処理対象のカラムIDに対してのみデフォルト値を設定
      processingColumns.forEach(column => {
        if (!(column.key in tableRow)) {
          let defaultValue: any = '';
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

      return tableRow;
    });
    
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
  const handleRowClick = (globalRowIndex, row, prevRow, nextRow) => {
    // CustomTableから既にグローバルインデックスが渡されるため、そのまま使用
    if (globalRowIndex >= 0 && globalRowIndex < tableData.length) {
      // 全体のテーブルデータから正しい前後のレコードを取得
      const globalPrevRow = globalRowIndex > 0 ? tableData[globalRowIndex - 1] : null;
      const globalNextRow = globalRowIndex < tableData.length - 1 ? tableData[globalRowIndex + 1] : null;
      
      setCurrentRowIndex(globalRowIndex);
      setModalData({
        row: row,
        prevRow: globalPrevRow,
        nextRow: globalNextRow
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
            <CustomLoading isLoading={true} />
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
            {/* <CustomButton 
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
            /> */}
            {/* 認証機能を使用する場合は以下のコメントを外してください
            <AuthStartButton
              label="認証"
              authProvider="oauth"
              preserveCurrentPage={true}
              onSuccess={() => showInfo('認証を開始しました')}
              onError={(error: Error) => showError(`認証エラー: ${error.message}`)}
            />
            */}
          </div>
        </div>
        
        <div className={styles.metaInfo}>
          {/* <p>API Base URL: <code>{API_CONFIG.BASE_URL}</code></p> */}
          {/* <p>コレクションID: <code>{params.tableId}</code></p> */}
          {/* <p>総件数: {tableData.length} 件</p> */}
          {lastUpdated && (
            <p>最終更新: {lastUpdated.toLocaleString('ja-JP')}</p>
          )}
          <p>
            自動更新: {isAutoRefreshEnabled ? 
              <span style={{color: 'green'}}>
                有効 ({refreshIntervalMs / 1000}秒間隔)
              </span> : 
              <span style={{color: 'red'}}>無効</span>
            }
          </p>
          {collectionData?.description && (
            <div>
              説明: <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(collectionData.description) }} />
            </div>
          )}
          {/* {collectionData?.ownerId && (
            <p>オーナーID: <code>{collectionData.ownerId}</code></p>
          )} */}
          {/* {collectionData?.columnIds && (
            <p>カラム数: {collectionData.columnIds.length} 個 (表示: {columns.length} 個)</p>
          )}
          {collectionData?.createdAt && (
            <p>作成日時: {new Date(collectionData.createdAt).toLocaleString('ja-JP')}</p>
          )} */}
          {/* {collectionData?.sheetId && (
            <p>SheetID: <code>{collectionData.sheetId}</code></p>
          )} */}
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
                <CustomLoading isLoading={true} />
                <p>データを保存しています...</p>
              </div>
            )}
            <CustomTable 
              data={tableData}
              columns={columns}
              rowsPerPage={50}
              onDataChange={handleDataChange}
              onRowClick={handleRowClick}
              tableSettings={{
                sortableColumns: [], // ソート機能を全て無効化にゃん
                fixedColumns: 0,
                allowRowAddition: false,
                allowRowDeletion: false,
                recordsPerPageOptions: [10, 50, 100, 1000, 1500]
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
          tableData={tableData} // リアルタイム更新用
          currentRowIndex={currentRowIndex} // 現在の行インデックス
        />
      </div>
    </Layout>
  );
}
