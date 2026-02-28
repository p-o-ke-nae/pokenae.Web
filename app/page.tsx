'use client';

import ImageSlideshow from '@/components/atoms/ImageSlideshow';
import TickerBanner from '@/components/atoms/TickerBanner';
import ContentCardHorizontal from '@/components/molecules/ContentCardHorizontal';
import ContentCardVertical from '@/components/molecules/ContentCardVertical';
import type { SlideItem } from '@/components/atoms/ImageSlideshow';
import type { TickerItem } from '@/components/atoms/TickerBanner';
import type { ContentCardHorizontalProps } from '@/components/molecules/ContentCardHorizontal';
import type { ContentCardVerticalProps } from '@/components/molecules/ContentCardVertical';

// モックデータ: スライドショー
const mockSlides: SlideItem[] = [
  { id: 'slide-1', src: '/mock/slide1.svg', alt: 'pokenae ポケモン攻略ツール集' },
  { id: 'slide-2', src: '/mock/slide2.svg', alt: '個体値特定ツール – 自動認識で瞬時に判定' },
  { id: 'slide-3', src: '/mock/slide3.svg', alt: '収集補助ツール – 捕獲作業を自動認識でサポート' },
];

// モックデータ: 電光掲示板
const mockTickerItems: TickerItem[] = [
  { id: 'ticker-1', text: 'キャラシールの交換してもらえると喜びます', href: '#' },
  { id: 'ticker-2', text: '個体値特定ツールver3シリーズ公開！', href: '#' },
  { id: 'ticker-3', text: '剣トラ，アルトラ，SVサントラありがとう，本当にありがとう' },
  { id: 'ticker-4', text: '【通知注意！】擬似学習強化期間', highlighted: true, href: '#' },
];

// モックデータ: 横型カード（新着情報）
const mockHorizontalCards: ContentCardHorizontalProps[] = [
  {
    id: 'h-1',
    title: '収集補助ツール',
    description: '捕獲作業を自動認識でサポート',
    date: '2023年08月20日',
    imageSrc: '/mock/thumb1.svg',
    imageAlt: '収集補助ツールのスクリーンショット',
    href: '#',
  },
  {
    id: 'h-2',
    title: '個体値特定ツール ver3',
    description: '最新バージョンへのアップデートで認識精度が向上',
    date: '2024年03月01日',
    imageSrc: '/mock/thumb2.svg',
    imageAlt: '個体値特定ツールのスクリーンショット',
    href: '#',
  },
  {
    id: 'h-3',
    title: 'レイドバトル支援ツール',
    description: 'テラレイドバトルの結果を自動記録・分析',
    date: '2024年01月15日',
    imageSrc: '/mock/thumb3.svg',
    imageAlt: 'レイドバトル支援ツールのスクリーンショット',
    href: '#',
  },
];

// モックデータ: 縦型カード（コンテンツ）
const mockVerticalCards: ContentCardVerticalProps[] = [
  {
    id: 'v-1',
    title: '自動認識対応個体値特定ツールでポケモンの個体値を判定する',
    date: '2024年03月23日',
    imageSrc: '/mock/card1.svg',
    imageAlt: 'pokenaeロゴ',
    href: '#',
    tag: 'ポケモン',
  },
  {
    id: 'v-2',
    title: 'SVサントラ発売記念！特別コンテンツを公開',
    date: '2023年12月01日',
    imageSrc: '/mock/card2.svg',
    imageAlt: 'SVサントラのサムネイル',
    href: '#',
    tag: 'お知らせ',
  },
  {
    id: 'v-3',
    title: '擬似学習アルゴリズムによる捕獲確率計算の解説',
    date: '2024年02月10日',
    imageSrc: '/mock/card3.svg',
    imageAlt: '擬似学習の解説サムネイル',
    href: '#',
    tag: 'テクノロジー',
  },
  {
    id: 'v-4',
    title: 'ver3シリーズ発表！新機能まとめ',
    date: '2024年03月01日',
    imageSrc: '/mock/card4.svg',
    imageAlt: 'ver3シリーズのサムネイル',
    href: '#',
    tag: 'アップデート',
  },
];

export default function Home() {
  return (
    <>
      <main className="top-page">
        {/* スライドショー */}
        <section className="top-page__slideshow-section">
          <div className="top-page__container">
            <ImageSlideshow slides={mockSlides} interval={4000} />
          </div>
        </section>

        {/* 電光掲示板 */}
        <TickerBanner items={mockTickerItems} />

        {/* 新着情報（横型カード） */}
        <section className="top-page__section">
          <div className="top-page__container">
            <h2 className="top-page__section-title">新着情報</h2>
            <div className="top-page__card-list">
              {mockHorizontalCards.map((card) => (
                <ContentCardHorizontal key={card.id} {...card} />
              ))}
            </div>
          </div>
        </section>

        {/* コンテンツ（縦型カード） */}
        <section className="top-page__section">
          <div className="top-page__container">
            <h2 className="top-page__section-title">コンテンツ</h2>
            <div className="top-page__card-grid">
              {mockVerticalCards.map((card) => (
                <ContentCardVertical key={card.id} {...card} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .top-page {
          min-height: 100vh;
        }

        .top-page__container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        @media (min-width: 640px) {
          .top-page__container {
            padding: 0 1.5rem;
          }
        }

        @media (min-width: 1024px) {
          .top-page__container {
            padding: 0 2rem;
          }
        }

        .top-page__slideshow-section {
          padding: 1.5rem 0;
        }

        .top-page__section {
          padding: 2.5rem 0;
        }

        .top-page__section-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-strong);
          margin-bottom: 1.25rem;
          padding-bottom: 0.625rem;
          border-bottom: 2px solid var(--color-accent-25);
        }

        .top-page__card-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .top-page__card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
        }
      `}</style>
    </>
  );
}
