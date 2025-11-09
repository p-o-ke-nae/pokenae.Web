'use client';

import React from 'react';
import styles from './Footer.module.css';

const Footer = ({ pageList }) => {
  return (
    <footer className={styles.footer}>
      <div>ページ一覧</div>
      <ul>
        {pageList.map(page => (
          <li key={page.id}>{page.name}</li>
        ))}
      </ul>
      <div>© 2023 Your Company</div>
    </footer>
  );
};

export default Footer;
