'use client';

import React from 'react';
import { Layout } from '@/components/ui';
import ImageSlider from '@/components/home/ImageSlider';
import PickupSection from '@/components/home/PickupSection';
import InfoSection from '@/components/home/InfoSection';
import BlogSection from '@/components/home/BlogSection';
import SnsSection from '@/components/home/SnsSection';
import styles from './page.module.css';

export default function HomePage() {
  // スライドショーのデータ
  const slides = [
    {
      id: 1,
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"%3E%3Cdefs%3E%3ClinearGradient id="grad1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1200" height="500" fill="url(%23grad1)" /%3E%3C/svg%3E',
      title: 'Pokenae Web へようこそ',
      description: 'コレクション管理を簡単に、効率的に',
    },
    {
      id: 2,
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"%3E%3Cdefs%3E%3ClinearGradient id="grad2" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1200" height="500" fill="url(%23grad2)" /%3E%3C/svg%3E',
      title: 'コレクション管理システム',
      description: 'あなたのコレクションを一元管理',
    },
    {
      id: 3,
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"%3E%3Cdefs%3E%3ClinearGradient id="grad3" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%234facfe;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1200" height="500" fill="url(%23grad3)" /%3E%3C/svg%3E',
      title: '使いやすいインターフェース',
      description: '直感的な操作で誰でも簡単に',
    },
  ];

  // PICKUPセクションのデータ
  const pickupItems = [
    {
      id: 1,
      title: 'コレクション管理',
      description: 'あなたのコレクションを効率的に管理できます。収集状況の確認、アイテムの追加・編集が簡単に行えます。',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="pickup1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23pickup1)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E📚%3C/text%3E%3C/svg%3E',
      link: '/collections',
    },
    {
      id: 2,
      title: '統計情報',
      description: 'コレクションの進捗状況や統計情報を確認できます。視覚的なグラフで分かりやすく表示します。',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="pickup2" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23pickup2)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E📊%3C/text%3E%3C/svg%3E',
      link: '/stats',
    },
    {
      id: 3,
      title: '開発者ツール',
      description: 'APIテストやコンポーネントのテストができる開発者向けツールを提供しています。',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="pickup3" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%234facfe;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23pickup3)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🛠️%3C/text%3E%3C/svg%3E',
      link: '/dev/subpage',
    },
  ];

  // INFOセクションのデータ
  const infoItems = [
    {
      id: 1,
      date: '2025-11-09',
      category: 'お知らせ',
      title: 'トップページfrom develop221122をリニューアルしました',
      link: '#',
    },
    {
      id: 2,
      date: '2025-11-08',
      category: '機能追加',
      title: '新しいコレクション管理機能を追加しました',
      link: '#',
    },
    {
      id: 3,
      date: '2025-11-07',
      category: 'メンテナンス',
      title: 'システムメンテナンスのお知らせ',
      link: '#',
    },
  ];

  // BLOGセクションのデータ
  const blogPosts = [
    {
      id: 1,
      title: 'コレクション管理の始め方',
      excerpt: '初めてコレクション管理システムを使う方向けのガイドです。基本的な使い方から便利な機能まで詳しく解説します。',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="blog1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23blog1)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E✍️%3C/text%3E%3C/svg%3E',
      date: '2025-11-09',
      link: '#',
    },
    {
      id: 2,
      title: '効率的なデータ管理のコツ',
      excerpt: 'コレクションデータを効率的に管理するためのベストプラクティスをご紹介します。',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="blog2" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23blog2)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E💡%3C/text%3E%3C/svg%3E',
      date: '2025-11-08',
      link: '#',
    },
    {
      id: 3,
      title: '新機能のご紹介',
      excerpt: '最新バージョンで追加された新機能について詳しくご紹介します。より便利になったポイントをチェック！',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Cdefs%3E%3ClinearGradient id="blog3" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23f093fb;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%234facfe;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23blog3)" /%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🎉%3C/text%3E%3C/svg%3E',
      date: '2025-11-07',
      link: '#',
    },
  ];

  // SNSリンクのデータ
  const snsLinks = [
    {
      id: 1,
      platform: 'Twitter',
      icon: '𝕏',
      url: 'https://twitter.com',
      color: '#000000',
    },
    {
      id: 2,
      platform: 'Instagram',
      icon: '📷',
      url: 'https://instagram.com',
      color: '#E4405F',
    },
    {
      id: 3,
      platform: 'Facebook',
      icon: '📘',
      url: 'https://facebook.com',
      color: '#1877F2',
    },
    {
      id: 4,
      platform: 'GitHub',
      icon: '💻',
      url: 'https://github.com/p-o-ke-nae',
      color: '#333333',
    },
  ];

  return (
    <Layout>
      <div className={styles.homePage}>
        {/* 画像スライドショー */}
        <ImageSlider slides={slides} />

        {/* PICKUPセクション */}
        <PickupSection items={pickupItems} />

        {/* INFOセクション */}
        <InfoSection items={infoItems} />

        {/* BLOGセクション */}
        <BlogSection posts={blogPosts} />

        {/* SNSリンク */}
        <SnsSection links={snsLinks} />
      </div>
    </Layout>
  );
}
