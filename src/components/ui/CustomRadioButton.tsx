import React from 'react';
import styles from './CustomRadioButton.module.css';

const CustomRadioButton = ({ metaData, value, onChange, status, options }) => {
    const mystatus = status ?? (metaData ? metaData.status : 'normal');
    const handleChange = (event) => {
    if (mystatus === 'readonly') return;
        onChange(event);
    };

  return (
    <div className={styles.radioGroup}>
      {options.map((option) => (
        <label key={option.value} className={styles.radioContainer}>
          <input
            type="radio"
            name={metaData ? metaData.name : ''}
            value={option.value}
            checked={value === option.value}
            onChange={handleChange}
            readOnly={mystatus === 'readonly'}
            className={styles.radioInput}
          />
          <span className={styles.radioCustom}></span>
          {option.label && <span className={styles.radioLabel}>{option.label}</span>}
        </label>
      ))}
    </div>
  );
};

CustomRadioButton.defaultProps = {
    status: 'normal',
};

export default CustomRadioButton;