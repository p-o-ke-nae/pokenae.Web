import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomTextBox from '../components/atoms/CustomTextBox';

const meta = {
  title: 'Atoms/CustomTextBox',
  component: CustomTextBox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    placeholder: 'テキストを入力してください',
  },
} satisfies Meta<typeof CustomTextBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: '入力済みテキスト',
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
