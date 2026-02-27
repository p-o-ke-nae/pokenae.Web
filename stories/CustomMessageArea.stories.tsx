import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomMessageArea from '../components/atoms/CustomMessageArea';

const meta = {
  title: 'Atoms/CustomMessageArea',
  component: CustomMessageArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    children: 'メッセージの内容がここに表示されます。',
  },
} satisfies Meta<typeof CustomMessageArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    children: '情報: この操作は元に戻せます。',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: '保存が完了しました。',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: '警告: この操作は取り消しできない場合があります。',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'エラー: 入力内容に問題があります。',
  },
};
