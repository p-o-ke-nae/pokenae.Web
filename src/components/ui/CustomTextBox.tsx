'use client';

import React, { useMemo } from 'react';
import { usePageMode, PageModes } from '../../context/PageModeContext';
import styles from './CustomTextBox.module.css';

const CustomTextBox = ({ metaData, value, onChange, status, placeholder, rows }) => {
  const pageMode = usePageMode();
  const mystatus = status ?? (metaData ? metaData.status : 'normal');
  const inputType = rows ? 'textarea' : 'input';
  const inputProps = {
    name: metaData ? metaData.name : '',
    className: styles.customtextbox,
    value: value,
    onChange: onChange,
    placeholder: placeholder ?? (metaData ? (mystatus === 'readonly' ? '' : `${metaData.label}を入力してください`) : ''),
    required: mystatus === 'required',
    readOnly: mystatus === 'readonly',
    rows: rows,
    disabled: pageMode === PageModes.READ_ONLY,
  };

  return useMemo(() => (
    React.createElement(inputType, inputProps)
  ), [value, onChange, placeholder, rows, pageMode]);
};

CustomTextBox.defaultProps = {
  status: 'normal',
  rows: null,
};

export default CustomTextBox;