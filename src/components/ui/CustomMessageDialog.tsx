'use client';

import React from 'react';
import CustomModal from './CustomModal';
import CustomButton from './CustomButton';
import styles from './CustomMessageDialog.module.css';

const CustomMessageDialog = ({ isConfirmOpen, title, message, onConfirm, onCancel }) => {
    return (
        <CustomModal isOpen={isConfirmOpen} onClose={onCancel} showCloseButton={true} className="">
            <div>
                <div className={styles.header}>
                    <h5 className={ styles.title}>{title}</h5>
                </div>
                <div className={styles.body}>
                    <p>{message}</p>
                </div>
                <div className={styles.footer}>
                    <CustomButton onClick={onConfirm}>はい</CustomButton>
                    <CustomButton onClick={onCancel}>いいえ</CustomButton>
                </div>
            </div>
        </CustomModal>
    );
};

export default CustomMessageDialog;