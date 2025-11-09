import React from 'react';
import styles from './RightSidebar.module.css';

const RightSidebar = ({ recommendedPages, pageRankings }) => {
  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.sectionTitle}>おすすめページ</div>
      <ul className={styles.pageList}>
        {recommendedPages.map(page => (
          <li key={page.id} className={styles.pageItem}>{page.name}</li>
        ))}
      </ul>
      <div className={styles.sectionTitle}>ページランキング</div>
      <ul className={styles.pageList}>
        {pageRankings.map(page => (
          <li key={page.id} className={styles.pageItem}>{page.name}</li>
        ))}
      </ul>
    </aside>
  );
};

export default RightSidebar;
