'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Layout,
  CustomHeader, 
  CustomButton, 
  CustomLoading,
  useAppContext
} from '@webcomponent/components';
import { collectionApi } from '../../utils/collectionApi';
import styles from './CollectionAssistanceTool.module.css';

const CollectionAssistanceIndex = () => {
  const router = useRouter();
  const { showError, showInfo } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await collectionApi.getCollections();
        
        const collections = response;
        
        setCollections(response);
        
        if (response.length === 0) {
          showInfo('利用可能なコレクションがありません');
        }
      } catch (error) {
        console.error('Failed to fetch collections:', error);
        setError('データの取得に失敗しました');
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []); // 依存配列を空に変更してマウント時のみ実行

  const handleTableSelect = (collectionId) => {
    setIsLoading(true);
    router.push(`/CollectionAssistanceTool/${collectionId}`);
  };

  const handleCreateCollection = () => {
    showInfo('新しいコレクション作成機能は開発中です');
    // 将来的にはコレクション作成モーダルを表示
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.container}>
          <CustomHeader title="コレクション支援ツール" />
          <div className={styles.loadingContainer}>
            <CustomLoading />
            <p>コレクション一覧を読み込んでいます...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <CustomHeader title="コレクション支援ツール" />
          <div className={styles.headerActions}>
            <CustomButton
              label="更新"
              onClick={handleRefresh}
            />
            <CustomButton
              label="新規作成"
              onClick={handleCreateCollection}
            />
          </div>
        </div>
        
        <div className={styles.content}>
          {(error || isDemo) && (
            <div className={styles.errorBanner}>
              <p>{isDemo ? '⚠️ デモモード' : '⚠️ APIエラー'}: {error}</p>
              {isDemo && <p>APIサーバーに接続できないため、デモデータを表示しています</p>}
            </div>
          )}
          
          <div className={styles.description}>
            <p>管理したいコレクションテーブルを選択してください。</p>
            <p className={styles.subDescription}>
              現在 {collections.length} 個のコレクションが利用可能です
            </p>
          </div>
          
          <div className={styles.tableList}>
            {collections.map((collection) => (
              <div key={collection.id} className={styles.tableCard}>
                <h3>{collection.name}</h3>
                <p>{collection.description}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.collectionId}>ID: {collection.id}</span>
                  {collection.itemCount && (
                    <span className={styles.itemCount}>アイテム数: {collection.itemCount}</span>
                  )}
                  {collection.completionRate && (
                    <span className={styles.completionRate}>完成度: {collection.completionRate}%</span>
                  )}
                </div>
                <CustomButton
                  label="管理画面を開く"
                  onClick={() => handleTableSelect(collection.id)}
                />
              </div>
            ))}
          </div>
          
          {collections.length === 0 && !error && (
            <div className={styles.emptyState}>
              <h3>コレクションが見つかりません</h3>
              <p>新しいコレクションを作成してください</p>
              <CustomButton
                label="コレクションを作成"
                onClick={handleCreateCollection}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CollectionAssistanceIndex;
