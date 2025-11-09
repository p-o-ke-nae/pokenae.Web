'use client';

import React from 'react';
import styles from './CustomSpinBox.module.css';

const CustomSpinBox = ({ metaData, value, onChange, status, placeholder, min, max, step }) => {
  const mystatus = status ?? (metaData ? metaData.status : 'normal');
  const inputProps = {
    type: 'number',
    name: metaData ? metaData.name : '',
    className: styles.customspinbox,
    value: value,
    onChange: onChange,
    placeholder: placeholder ?? (metaData ? (mystatus === 'readonly' ? '' : `${metaData.label}を入力してください`) : ''),
    required: mystatus === 'required',
    readOnly: mystatus === 'readonly',
    min: min,
    max: max,
    step: step,
  };

  return (
    <input {...inputProps} />
  );
};

CustomSpinBox.defaultProps = {
  status: 'normal',
  min: undefined,
  max: undefined,
  step: 1,
};

export default CustomSpinBox;