'use client';

import React, { useEffect } from 'react';
import styles from './CustomModal.module.css';

const CustomModal = ({ isOpen, onClose, showCloseButton = false, className, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.customoverlay}>
      <div className={`${styles.customdialog} ${className ? className : ''}`}>
        {showCloseButton && (
          <button className={styles.closeButton} onClick={onClose}>×</button>
        )}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;