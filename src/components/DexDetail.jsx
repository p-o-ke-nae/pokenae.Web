"use client";
import React, { useMemo, useEffect, useCallback } from 'react';
import CustomModal from '@webcomponent/components/CustomModal';
import CustomImage from '@webcomponent/components/CustomImage';
import CustomCheckBox from '@webcomponent/components/CustomCheckBox';
import styles from './DexDetail.module.css';

const DexDetail = React.memo(({ modalData, closeModal, handlePrevRow, handleNextRow, columns, tableData, currentRowIndex }) => {
  if (!modalData || !modalData.row) return null;

  // リアルタイムデータを取得（useMemoで最適化）
  const currentRow = useMemo(() => {
    try {
      if (tableData && currentRowIndex !== undefined && currentRowIndex >= 0 && currentRowIndex < tableData.length) {
        return tableData[currentRowIndex];
      }
      // フォールバック：元のmodalData.rowを使用
      return modalData.row;
    } catch (error) {
      console.warn('DexDetail: Error getting current row data', error);
      return modalData.row;
    }
  }, [tableData, currentRowIndex, modalData.row]);

  // 一番先頭の画像タイプのカラムを取得
  const firstImageColumn = useMemo(() => {
    try {
      return columns?.find(column => column.type === 'image') || null;
    } catch (error) {
      console.warn('DexDetail: Error finding image column', error);
      return null;
    }
  }, [columns]);

  return (
    <CustomModal isOpen={!!modalData} onClose={closeModal} showCloseButton={true} className={styles.customModalRed}>
      <div className={styles.modalContainer}>
        {firstImageColumn && (
          <div className={styles.modalImageFrame}>
            <CustomImage 
              value={currentRow?.[firstImageColumn.key || firstImageColumn.name]} 
              metaData={firstImageColumn.metaData}
              label={firstImageColumn.label}
            />
          </div>
        )}
        <div className={styles.modalText}>
          <div className={styles.modalInfoWrapper}>
            {columns?.map((column) => {
              try {
                const columnKey = column.key || column.name;
                const columnValue = currentRow?.[columnKey];
                
                if (column.type === 'image') {
                  return null;
                }
                
                return (
                  <div key={`modal-item-${columnKey}`} className={styles.modalTextItem}>
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
                );
              } catch (error) {
                console.warn('DexDetail: Error rendering column', column, error);
                return null;
              }
            })}
          </div>
        </div>
      </div>

      <button className={`${styles.prevRecord} ${styles.modalButtons}`} onClick={handlePrevRow} disabled={!modalData.prevRow}></button>
      <button className={`${styles.nextRecord} ${styles.modalButtons}`} onClick={handleNextRow} disabled={!modalData.nextRow}></button>
    </CustomModal>
  );
});

DexDetail.displayName = 'DexDetail';

export default DexDetail;
