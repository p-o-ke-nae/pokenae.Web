'use client';

import React from 'react';
import styles from './CustomLabel.module.css';

const CustomLabel = ({ metaData, children }) => {
  return <span className={styles.customlabel}>{children || (metaData ? metaData.label : '')}</span>;
};

export default CustomLabel;
