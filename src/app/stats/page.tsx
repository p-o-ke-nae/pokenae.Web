'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layout,
  CustomHeader, 
  CustomLoading 
} from '@/components/ui';
import styles from './stats.module.css';

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // ダミーデータの読み込みをシミュレート
    const loadStats = () => {
      setTimeout(() => {
        setStats({
          totalCollections: 3,
          totalItems: 1247,
          completedCollections: 1,
          recentActivity: [
            { date: '2025-07-10', action: 'ポケモン図鑑 #150 追加' },
            { date: '2025-07-09', action: 'レアカード #45 更新' },
            { date: '2025-07-08', action: 'プロモカード #12 追加' },
          ]
        });
        setIsLoading(false);
      }, 1000);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.container}>
          <CustomHeader>統計情報</CustomHeader>
          <CustomLoading isLoading={true} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <CustomHeader>統計情報</CustomHeader>
        
        <div className={styles.content}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>総コレクション数</h3>
              <div className={styles.statValue}>{stats.totalCollections}</div>
            </div>
            
            <div className={styles.statCard}>
              <h3>総アイテム数</h3>
              <div className={styles.statValue}>{stats.totalItems}</div>
            </div>
            
            <div className={styles.statCard}>
              <h3>完了したコレクション</h3>
              <div className={styles.statValue}>{stats.completedCollections}</div>
            </div>
            
            <div className={styles.statCard}>
              <h3>完成度</h3>
              <div className={styles.statValue}>
                {Math.round((stats.completedCollections / stats.totalCollections) * 100)}%
              </div>
            </div>
          </div>
          
          <div className={styles.recentActivity}>
            <h3>最近のアクティビティ</h3>
            <div className={styles.activityList}>
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <span className={styles.date}>{activity.date}</span>
                  <span className={styles.action}>{activity.action}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.navigation}>
            <Link href="/" className={styles.backButton}>
              トップページに戻る
            </Link>
            <Link href="/CollectionAssistanceTool" className={styles.manageButton}>
              コレクション管理
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
