import React from 'react';
import CustomModal from '../../../pokenae.WebComponent/src/components/CustomModal';
import CustomImage from '../../../pokenae.WebComponent/src/components/CustomImage';
import styles from './DexDetail.module.css';

const DexDetail = ({ modalData, closeModal, handlePrevRow, handleNextRow, columns }) => {
  if (!modalData) return null;

  return (
    <CustomModal isOpen={!!modalData} onClose={closeModal} showCloseButton={true} className={styles.customModalRed}>
      <div className={styles.modalContainer}>
        {columns.map((column) => (
          column.name === 'profilePicture' && (
            <div key={column.name} className={styles.modalImageFrame}>
              <CustomImage value={modalData.row[column.name]} metaData={column.metaData} />
            </div>
          )
        ))}
        <div className={styles.modalText}>
          <div className={styles.modalInfoWrapper}>
            {columns.map((column) => (
              column.name !== 'profilePicture' && (
                <div key={column.name} className={styles.modalTextItem}>
                  <div className={styles.modalTextItemHeader}>{column.header}</div>
                  <div className={styles.modalTextItemDetail}>{modalData.row[column.name]}</div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      <button className={`${styles.prevRecord} ${styles.modalButtons}`} onClick={handlePrevRow} disabled={!modalData.prevRow}></button>
      <button className={`${styles.nextRecord} ${styles.modalButtons}`} onClick={handleNextRow} disabled={!modalData.nextRow}></button>
    </CustomModal>
  );
};

export default DexDetail;
