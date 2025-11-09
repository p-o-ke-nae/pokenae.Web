'use client';

import React, { useState, useEffect } from 'react';
import styles from './CustomCheckBox.module.css';

const CustomCheckBox = ({ metaData, value, onChange, status, label, indeterminate }) => {
  const mystatus = status ?? (metaData ? metaData.status : 'normal');
  const mylabel = label ? label : metaData ? metaData.label : '';
  const [isChecked, setIsChecked] = useState(value);

  useEffect(() => {
    setIsChecked(value);
  }, [value]);

  const handleChange = (event) => {
    if (mystatus === 'readonly') return;
    const newChecked = event.target.checked;
    setIsChecked(newChecked);
    onChange(event);
  };

  
  return (
    <label className={`${styles['customcheckbox-container']}`}>
      <input
        type={'checkbox'}
        name={metaData ? metaData.name : ''}
        checked={isChecked}
        onChange={handleChange}
        readOnly={mystatus === 'readonly'}
        className={styles.checkboxInput}
        aria-checked={isChecked}
        aria-readonly={mystatus === 'readonly'}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
      />
      <span className={styles.customcheckbox}></span>
      {mylabel && <span className={styles.checkboxLabel}>{mylabel}</span>}
    </label>
  );
};

CustomCheckBox.defaultProps = {
  status: 'normal',
  indeterminate: false,
};

export default CustomCheckBox;