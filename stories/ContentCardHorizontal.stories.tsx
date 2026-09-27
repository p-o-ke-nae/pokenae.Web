import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContentCardHorizontal from '../components/molecules/ContentCardHorizontal';

const meta = {
  title: 'Molecules/ContentCardHorizontal',
  component: ContentCardHorizontal,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ContentCardHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'card-1',
    title: '収集補助ツール',
    description: '捕獲作業を自動認識でサポート',
    publishedAt: '2023-08-20T12:00:00Z',
    imageSrc: '/mock/thumb1.svg',
    imageAlt: '収集補助ツールのスクリーンショット',
    href: '#',
  },
};

export const LongTitle: Story = {
  args: {
    id: 'card-2',
    title: '個体値特定ツール ver3 – 自動認識機能付き完全版',
    description: '最新バージョンへのアップデートで認識精度がさらに向上しました',
    publishedAt: '2024-03-01',
    imageSrc: '/mock/thumb2.svg',
    imageAlt: '個体値特定ツールのスクリーンショット',
    href: '#',
  },
};

export const CompactMobile: Story = {
  args: {
    id: 'card-compact',
    title: '個体値特定ツール ver3',
    description: '最新バージョンへのアップデートで認識精度が向上',
    publishedAt: '2024-03-01',
    imageSrc: '/mock/thumb2.svg',
    imageAlt: '個体値特定ツールのスクリーンショット',
    href: '#',
    variant: 'compact',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const List: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
      <ContentCardHorizontal
        id="card-1"
        title="収集補助ツール"
        description="捕獲作業を自動認識でサポート"
        publishedAt="2023-08-20"
        imageSrc="/mock/thumb1.svg"
        imageAlt="収集補助ツールのスクリーンショット"
        href="#"
      />
      <ContentCardHorizontal
        id="card-2"
        title="個体値特定ツール ver3"
        description="最新バージョンへのアップデートで認識精度が向上"
        publishedAt="2024-03-01"
        imageSrc="/mock/thumb2.svg"
        imageAlt="個体値特定ツールのスクリーンショット"
        href="#"
      />
      <ContentCardHorizontal
        id="card-3"
        title="レイドバトル支援ツール"
        description="テラレイドバトルの結果を自動記録・分析"
        publishedAt="2024-01-15"
        imageSrc="/mock/thumb3.svg"
        imageAlt="レイドバトル支援ツールのスクリーンショット"
        href="#"
      />
    </div>
  ),
  args: {
    id: '',
    title: '',
    description: '',
    publishedAt: '2024-01-01',
    imageSrc: '',
    imageAlt: '',
    href: '',
  },
};
