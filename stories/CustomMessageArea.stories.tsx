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
    placeholder: 'メッセージを入力してください',
  },
} satisfies Meta<typeof CustomMessageArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: '入力済みメッセージ\n複数行のテキストです。',
  },
};

export const Error: Story = {
  args: {
    isError: true,
    placeholder: 'エラー状態',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: '無効状態',
  },
};
