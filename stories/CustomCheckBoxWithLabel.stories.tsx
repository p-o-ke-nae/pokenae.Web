import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomCheckBoxWithLabel from '../components/molecules/CustomCheckBox';

const meta = {
  title: 'Molecules/CustomCheckBoxWithLabel',
  component: CustomCheckBoxWithLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
  },
  args: {
    label: 'チェックボックスラベル',
  },
} satisfies Meta<typeof CustomCheckBoxWithLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
    label: '必須項目',
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
