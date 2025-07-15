import React, { useMemo, useEffect } from 'react';
import CustomModal from '@webcomponent/components/CustomModal';
import CustomImage from '@webcomponent/components/CustomImage';
import CustomCheckBox from '@webcomponent/components/CustomCheckBox';
import styles from './DexDetail.module.css';

const DexDetail = ({ modalData, closeModal, handlePrevRow, handleNextRow, columns, tableData, currentRowIndex }) => {
  if (!modalData || !modalData.row) return null;

  // リアルタイムデータを取得（useMemoで最適化）
  const currentRow = useMemo(() => {
    if (tableData && currentRowIndex !== undefined && currentRowIndex >= 0 && currentRowIndex < tableData.length) {
      return tableData[currentRowIndex];
    }
    // フォールバック：元のmodalData.rowを使用
    return modalData.row;
  }, [tableData, currentRowIndex, modalData.row]);

  // 開発モードでのデバッグ情報（プロダクションでは実行されない）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.__POKENAE_DEXDETAIL_DEBUG = {
        currentRowIndex,
        currentRowData: currentRow,
        isUsingRealTimeData: !!(tableData && currentRowIndex !== undefined),
        timestamp: new Date().toISOString()
      };
    }
  }, [currentRow, currentRowIndex, tableData]);

  // 一番先頭の画像タイプのカラムを取得
  const firstImageColumn = columns.find(column => column.type === 'image');

  return (
    <CustomModal isOpen={!!modalData} onClose={closeModal} showCloseButton={true} className={styles.customModalRed}>
      <div className={styles.modalContainer}>
        {firstImageColumn && (
          <div className={styles.modalImageFrame}>
            <CustomImage 
              value={currentRow[firstImageColumn.key || firstImageColumn.name]} 
              metaData={firstImageColumn.metaData}
              label={firstImageColumn.label}
            />
          </div>
        )}
        <div className={styles.modalText}>
          <div className={styles.modalInfoWrapper}>
            {columns.map((column) => {
              const columnKey = column.key || column.name;
              const columnValue = currentRow[columnKey];
              
              return column.type !== 'image' && (
                <div key={columnKey} className={styles.modalTextItem}>
                  <div className={styles.modalTextItemHeader}>{column.header || column.label}</div>
                  <div className={styles.modalTextItemDetail}>
                    {column.type === 'boolean' ? (
                      <CustomCheckBox
                        value={columnValue}
                        status="readonly"
                        onChange={() => {}}
                      />
                    ) : (
                      <span>{columnValue !== undefined && columnValue !== null ? columnValue : '（データなし）'}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <button className={`${styles.prevRecord} ${styles.modalButtons}`} onClick={handlePrevRow} disabled={!modalData.prevRow}></button>
      <button className={`${styles.nextRecord} ${styles.modalButtons}`} onClick={handleNextRow} disabled={!modalData.nextRow}></button>
    </CustomModal>
  );
};

export default DexDetail;
