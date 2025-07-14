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
  
  // DexDetailモーダル関連
  const [modalData, setModalData] = useState(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(-1);

  useEffect(() => {
    const loadCollectionData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('APIサーバーへの接続を確認しています...');

        // APIサーバーの接続テスト
        try {
          const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7077'}/api/CollectionTable`, {
            method: 'HEAD',
            mode: 'cors',
            credentials: 'omit',
          });
          console.log('API Server Health Check:', healthCheck.status);
        } catch (healthError) {
          console.warn('API Server Health Check failed:', healthError);
          throw new Error(`APIサーバー（${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7077'}）に接続できません`);
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
        if (collection.columnIds && collection.columnIds.length > 0) {
          // columnIdsから動的にカラム定義を作成
          console.log('Found columnIds:', collection.columnIds);
          columnsData = createColumnsFromColumnIds(collection.columnIds);
        } else {
          // カラム情報がない場合は、別途取得を試みる
          try {
            setLoadingMessage('カラム情報を別途取得しています...');
            const columnsResponse = await collectionApi.getColumns(params.tableId);
            if (columnsResponse.data) {
              columnsData = columnsResponse.data.map(item => ({
                key: item.name?.toLowerCase().replace(/\s+/g, '_'),
                label: item.displayName || item.name,
                editable: !item.required || item.name !== 'id',
                type: item.type || 'string'
              }));
            }            } catch (columnError) {
            console.warn('Failed to fetch columns separately:', columnError);
            // APIからカラム情報を取得できない場合は空配列
            columnsData = [];
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
          recordsResponse = await collectionApi.getRecords(params.tableId);
          console.log('Records API Response:', recordsResponse);
          
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
          console.log('No data available from API');
          setTableData([]);
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
          showError('APIサーバー（localhost:7077）に接続できません。サーバーが起動しているか確認してください。');
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
        {error && (
          <div className={styles.errorBanner}>
            <p>⚠️ APIエラー: {error}</p>
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
          <p>API Base URL: <code>{process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7077'}</code></p>
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
