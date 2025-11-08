'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Layout, 
  CustomHeader, 
  CustomButton,
  useAppContext 
} from '@webcomponent/components';
import styles from './page.module.css';

export default function HomePage() {
  const { showInfo } = useAppContext();

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1>Pokenae Web へようこそfrom main 6</h1>
          <p>コレクション管理システムです。</p>
        </div>
        
        <div className={styles.features}>
          <div className={styles.featureCard}>
            <h2>🎯 コレクション支援ツール</h2>
            <p>あなたのコレクションを効率的に管理できます。収集状況の確認、アイテムの追加・編集が簡単に行えます。</p>
            <Link href="/CollectionAssistanceTool" className={styles.button}>
              コレクション管理を開始
            </Link>
          </div>
          
          <div className={styles.featureCard}>
            <h2>📊 統計情報</h2>
            <p>コレクションの進捗状況や統計情報を確認できます。</p>
            <Link href="/stats" className={`${styles.button} ${styles.buttonSecondary}`}>
              統計を見る
            </Link>
          </div>
        </div>

        <div className={styles.demoSection}>
          <CustomHeader>デモセクション</CustomHeader>
          <CustomButton onClick={() => showInfo('WebComponentライブラリからのメッセージです')}>
            WebComponent テスト
          </CustomButton>
          <Link href="/subpage" className={styles.button}>
            サブページ（テスト用）
          </Link>
        </div>
      </div>
    </Layout>
  );
}
