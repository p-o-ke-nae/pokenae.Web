'use client';

import React from 'react';
import styles from './InfoSection.module.css';

interface InfoItem {
  id: number;
  date: string;
  category: string;
  title: string;
  link: string;
}

interface InfoSectionProps {
  items: InfoItem[];
}

export default function InfoSection({ items }: InfoSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={styles.infoSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>INFO</h2>
        <div className={styles.infoList}>
          {items.map((item) => (
            <a 
              href={item.link} 
              key={item.id} 
              className={styles.infoItem}
            >
              <div className={styles.infoDate}>{item.date}</div>
              <span className={styles.infoCategory}>{item.category}</span>
              <div className={styles.infoTitle}>{item.title}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
