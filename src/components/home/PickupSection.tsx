'use client';

import React from 'react';
import Link from 'next/link';
import styles from './PickupSection.module.css';

interface PickupItem {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface PickupSectionProps {
  items: PickupItem[];
}

export default function PickupSection({ items }: PickupSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={styles.pickupSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>PICKUP</h2>
        <div className={styles.pickupGrid}>
          {items.map((item) => (
            <Link 
              href={item.link} 
              key={item.id} 
              className={styles.pickupCard}
            >
              <div 
                className={styles.cardImage}
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDescription}>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
