'use client';

import React from 'react';
import styles from './SnsSection.module.css';

interface SnsLink {
  id: number;
  platform: string;
  icon: string;
  url: string;
  color: string;
}

interface SnsSectionProps {
  links: SnsLink[];
}

export default function SnsSection({ links }: SnsSectionProps) {
  if (links.length === 0) return null;

  return (
    <section className={styles.snsSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>FOLLOW US</h2>
        <div className={styles.snsLinks}>
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.snsLink}
              style={{ backgroundColor: link.color }}
              aria-label={link.platform}
            >
              <span className={styles.snsIcon}>{link.icon}</span>
              <span className={styles.snsPlatform}>{link.platform}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
