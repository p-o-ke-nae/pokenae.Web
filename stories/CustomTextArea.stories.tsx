import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomTextArea from '../components/atoms/CustomTextArea';

const meta = {
  title: 'Atoms/CustomTextArea',
  component: CustomTextArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    placeholder: 'テキストを入力してください',
  },
} satisfies Meta<typeof CustomTextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: '入力済みテキスト\n複数行のテキストです。',
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
