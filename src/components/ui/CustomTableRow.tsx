'use client';

import React from 'react';
import styles from './CustomTableRow.module.css';
import CustomTextBox from './CustomTextBox';
import CustomSpinBox from './CustomSpinBox';
import CustomCheckBox from './CustomCheckBox';
import CustomImage from './CustomImage';
import CustomLabel from './CustomLabel';

const CustomTableRow = ({ row, columns, handleInputChange, editedCells, handleRowClick, rowIndex, tableSettings }) => {
  const rowHeight = '40px'; // 行の高さを固定

  return (
    <tr
      key={row.id}
      className={`${styles.row} ${rowIndex % 2 === 0 ? styles['even-row'] : styles['odd-row']}`}
      onClick={() => handleRowClick(rowIndex)}
      style={{ height: rowHeight }} // 行の高さを設定
    >
      {columns.map((column, index) => (
        column.visible && (
          <td
            key={column.key || column.name}
            style={{ width: column.width, left: index < tableSettings.fixedColumns ? `${index * 100}px` : 'auto', height: rowHeight }} // 各セルの高さを設定
            className={`${editedCells.has(`${row.id}-${column.key || column.name}`) ? styles.edited : ''} ${['boolean', 'image'].includes(column.type) ? styles['center-align'] : ''} ${column.type === 'image' ? styles['no-padding'] : ''} ${index < tableSettings.fixedColumns ? styles['sticky-cell'] : ''}`}
          >
            {column.type === 'text' ? (
              column.editable ? (
                <CustomTextBox
                  metaData={column.metaData}
                  value={row[column.key || column.name]}
                  onChange={(e) => handleInputChange(row.id, column.key || column.name, e.target.value)}
                  placeholder=""
                />
              ) : (
                <CustomLabel metaData={column.metaData}>{row[column.key || column.name]}</CustomLabel>
              )
            ) : column.type === 'number' ? (
              column.editable ? (
                <CustomSpinBox
                  metaData={column.metaData}
                  value={row[column.key || column.name]}
                  onChange={(e) => handleInputChange(row.id, column.key || column.name, e.target.value)}
                  placeholder=""
                  min={column.settings?.min || 0}
                  max={column.settings?.max || 100}
                  step={column.settings?.step || 1}
                />
              ) : (
                <CustomLabel metaData={column.metaData}>{row[column.key || column.name]}</CustomLabel>
              )
            ) : column.type === 'boolean' ? (
              column.editable ? (
                <CustomCheckBox
                  metaData={column.metaData}
                  value={row[column.key || column.name]}
                  onChange={(e) => handleInputChange(row.id, column.key || column.name, e.target.checked)}
                  label=""
                />
              ) : (
                <CustomCheckBox
                  metaData={column.metaData}
                  value={row[column.key || column.name]}
                  status="readonly"
                  onChange={() => {}} // 読み込み専用なので空の関数
                  label=""
                />
              )
            ) : column.type === 'image' ? (
              <div style={{ height: rowHeight, display: 'flex', alignItems: 'center' }}> {/* 親要素を追加して高さを制御 */}
                <CustomImage
                  value={row[column.key || column.name]}
                  metaData={column.metaData}
                  label={column.label}
                />
              </div>
            ) : (
              <CustomLabel metaData={column.metaData}>{row[column.key || column.name]}</CustomLabel>
            )}
          </td>
        )
      ))}
    </tr>
  );
};

export default CustomTableRow;
