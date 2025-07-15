import React from 'react';
import CustomModal from '@webcomponent/components/CustomModal';
import CustomImage from '@webcomponent/components/CustomImage';
import CustomCheckBox from '@webcomponent/components/CustomCheckBox';
import styles from './DexDetail.module.css';

const DexDetail = ({ modalData, closeModal, handlePrevRow, handleNextRow, columns }) => {
  if (!modalData || !modalData.row) return null;

  // 一番先頭の画像タイプのカラムを取得
  const firstImageColumn = columns.find(column => column.type === 'image');

  return (
    <CustomModal isOpen={!!modalData} onClose={closeModal} showCloseButton={true} className={styles.customModalRed}>
      <div className={styles.modalContainer}>
        {firstImageColumn && (
          <div className={styles.modalImageFrame}>
            <CustomImage 
              value={modalData.row[firstImageColumn.key || firstImageColumn.name]} 
              metaData={firstImageColumn.metaData}
              label={firstImageColumn.label}
            />
          </div>
        )}
        <div className={styles.modalText}>
          <div className={styles.modalInfoWrapper}>
            {columns.map((column) => {
              const columnKey = column.key || column.name;
              const columnValue = modalData.row[columnKey];
              
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
