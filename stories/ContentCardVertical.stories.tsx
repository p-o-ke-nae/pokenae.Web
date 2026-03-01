import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContentCardVertical from '../components/molecules/ContentCardVertical';

const meta = {
  title: 'Molecules/ContentCardVertical',
  component: ContentCardVertical,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ContentCardVertical>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'card-1',
    title: '自動認識対応個体値特定ツールでポケモンの個体値を判定する',
    date: '2024年03月23日',
    imageSrc: '/mock/card1.svg',
    imageAlt: 'pokenaeロゴ',
    href: '#',
    tag: 'ポケモン',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '280px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithoutTag: Story = {
  args: {
    id: 'card-2',
    title: 'SVサントラ発売記念！特別コンテンツを公開',
    date: '2023年12月01日',
    imageSrc: '/mock/card2.svg',
    imageAlt: 'SVサントラのサムネイル',
    href: '#',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '280px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Grid: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        width: '1100px',
      }}
    >
      <ContentCardVertical
        id="card-1"
        title="自動認識対応個体値特定ツールでポケモンの個体値を判定する"
        date="2024年03月23日"
        imageSrc="/mock/card1.svg"
        imageAlt="pokenaeロゴ"
        href="#"
        tag="ポケモン"
      />
      <ContentCardVertical
        id="card-2"
        title="SVサントラ発売記念！特別コンテンツを公開"
        date="2023年12月01日"
        imageSrc="/mock/card2.svg"
        imageAlt="SVサントラのサムネイル"
        href="#"
        tag="お知らせ"
      />
      <ContentCardVertical
        id="card-3"
        title="擬似学習アルゴリズムによる捕獲確率計算の解説"
        date="2024年02月10日"
        imageSrc="/mock/card3.svg"
        imageAlt="擬似学習の解説サムネイル"
        href="#"
        tag="テクノロジー"
      />
      <ContentCardVertical
        id="card-4"
        title="ver3シリーズ発表！新機能まとめ"
        date="2024年03月01日"
        imageSrc="/mock/card4.svg"
        imageAlt="ver3シリーズのサムネイル"
        href="#"
        tag="アップデート"
      />
    </div>
  ),
  args: {
    id: '',
    title: '',
    date: '',
    imageSrc: '',
    imageAlt: '',
    href: '',
  },
};
