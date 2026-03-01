import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TickerBanner from '../components/atoms/TickerBanner';

const meta = {
  title: 'Atoms/TickerBanner',
  component: TickerBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    speed: { control: 'number' },
  },
} satisfies Meta<typeof TickerBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockItems = [
  { id: 'ticker-1', text: 'キャラシールの交換してもらえると喜びます', href: '#' },
  { id: 'ticker-2', text: '個体値特定ツールver3シリーズ公開！', href: '#' },
  { id: 'ticker-3', text: '剣トラ，アルトラ，SVサントラありがとう，本当にありがとう' },
  { id: 'ticker-4', text: '【通知注意！】擬似学習強化期間', highlighted: true, href: '#' },
];

export const Default: Story = {
  args: {
    items: mockItems,
    speed: 80,
  },
};

export const WithHighlight: Story = {
  args: {
    items: [
      { id: 'item-1', text: 'お知らせ：サービスメンテナンスのお知らせ', href: '#' },
      { id: 'item-2', text: '新機能をリリースしました', href: '#' },
      { id: 'item-3', text: '【重要】利用規約の改定について', highlighted: true, href: '#' },
    ],
    speed: 60,
  },
};

export const SlowSpeed: Story = {
  args: {
    items: mockItems,
    speed: 40,
  },
};
