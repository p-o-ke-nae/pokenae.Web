'use client';

import React from 'react';
import Login from './Login';
import CustomImage from '../ui/CustomImage'; // カスタムイメージコンポーネントをインポート
import styles from './Header.module.css';

const Header = ({ categories }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerLogoContainer}>
        <CustomImage value="https://ozaroom.com//images/pokenaeLogo.png" label="Logo" metaData={{}} /> {/* URLからロゴ画像を指定 */}
      </div>
      <nav className={styles.nav}>
        {categories.map(category => (
          <a key={category.id} href={category.url} className={styles.navLink}>{category.name}</a>
        ))}
      </nav>
      <div className={styles.login}>
        <Login />
      </div>
    </header>
  );
};

export default Header;
