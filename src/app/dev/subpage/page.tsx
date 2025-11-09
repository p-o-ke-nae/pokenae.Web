'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Layout,
  CustomButton, 
  CustomHeader,
  useAppContext 
} from '@/components/ui';
import styles from './subpage.module.css';

export default function SubPage() {
  const { showInfo, showWarning, showConfirm } = useAppContext();

  return (
    <Layout>
      <div className={styles.container}>
        <CustomHeader>サブページ（テスト用）</CustomHeader>
        
        <div className={styles.content}>
          <p>これはテスト用のサブページです。pokenae.WebComponentライブラリのコンポーネントを使用しています。</p>
          
          <div className={styles.buttonGroup}>
            <CustomButton onClick={() => showInfo('インフォメーションメッセージです')}>情報表示</CustomButton>
            <CustomButton onClick={() => showWarning('警告メッセージです', 2)}>警告表示</CustomButton>
            <CustomButton onClick={() => showConfirm('確認', '確認メッセージです')}>確認表示</CustomButton>
          </div>
          
          <div className={styles.navigation}>
            <Link href="/" className={styles.backButton}>
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
