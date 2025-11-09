'use client';

import React from 'react';
import styles from './CustomRecordsPerPageSelector.module.css';

const CustomRecordsPerPageSelector = ({ recordsPerPage, setRecordsPerPage, options }) => {
  return (
    <div className={styles['records-per-page']}>
      <label htmlFor="recordsPerPage">表示レコード数: </label>
      <select
        id="recordsPerPage"
        value={recordsPerPage}
        onChange={(e) => setRecordsPerPage(parseInt(e.target.value, 10))}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
};

export default CustomRecordsPerPageSelector;
