'use client';

import { ReactNode } from 'react';
import styles from './CustomHeader.module.css';

interface CustomHeaderProps {
  metaData?: any;
  status?: string;
  children?: ReactNode;
}

const CustomHeader = ({ metaData, status, children }: CustomHeaderProps) => {
  const mystatus = status ?? (metaData ? metaData.status : 'normal');
  return (
    <div className={`${styles[`customheader-container`]} ${styles[`header-` + mystatus ]}` }>
      <h3>
        <label className={styles.customheader} >
          {children ?? (metaData ? metaData.label : '')} 
          {mystatus === 'required' ? <span className={ styles.requiredmark}>※</span> : ''}
        </label>
      
      </h3>
    </div>
  );
};

export default CustomHeader;