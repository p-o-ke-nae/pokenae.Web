'use client';

import React from 'react';
import styles from './CustomButton.module.css';

const CustomButton = ({ onClick, children }) => {
  return (
    <button className={styles.custombutton} onClick={onClick}>
      {children}
    </button>
  );
};

export default CustomButton;