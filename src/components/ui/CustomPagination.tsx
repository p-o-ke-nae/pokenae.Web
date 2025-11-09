'use client';

import React from 'react';
import styles from './CustomPagination.module.css';

const CustomPagination = ({ currentPage, totalPages, handleClick }) => {
  const renderPageNumbers = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, currentPage + 3);

    if (currentPage <= 4) {
      endPage = Math.min(totalPages, 7);
    } else if (currentPage > totalPages - 4) {
      startPage = Math.max(1, totalPages - 6);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handleClick(i)}
          className={currentPage === i ? styles.active : ''}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  return (
    <div className={styles.pagination}>
      <button onClick={() => handleClick(1)} disabled={currentPage === 1}>
        {'<<'}
      </button>
      <button onClick={() => handleClick(currentPage - 1)} disabled={currentPage === 1}>
        {'<'}
      </button>
      {renderPageNumbers()}
      <button onClick={() => handleClick(currentPage + 1)} disabled={currentPage === totalPages}>
        {'>'}
      </button>
      <button onClick={() => handleClick(totalPages)} disabled={currentPage === totalPages}>
        {'>>'}
      </button>
    </div>
  );
};

export default CustomPagination;
