import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomLabel from '../components/atoms/CustomLabel';

const meta = {
  title: 'Atoms/CustomLabel',
  component: CustomLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    children: 'ラベルテキスト',
  },
} satisfies Meta<typeof CustomLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const WithHtmlFor: Story = {
  args: {
    htmlFor: 'some-input',
    children: '入力項目',
  },
};
