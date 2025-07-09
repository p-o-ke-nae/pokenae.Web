'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Layout,
  CustomHeader, 
  CustomLoading 
} from '@webcomponent/components';
import styles from './callback.module.css';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // 認証コールバック処理のシミュレーション
    const handleCallback = () => {
      setTimeout(() => {
        // 実際の実装では認証トークンの処理などを行う
        console.log('認証コールバック処理完了');
        router.push('/');
      }, 2000);
    };

    handleCallback();
  }, [router]);

  return (
    <Layout>
      <div className={styles.container}>
        <CustomHeader>認証処理中</CustomHeader>
        
        <div className={styles.content}>
          <div className={styles.loadingSection}>
            <CustomLoading />
            <p>認証情報を処理しています...</p>
            <p className={styles.subText}>しばらくお待ちください</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
