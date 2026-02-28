import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CheckboxField from '../components/molecules/CheckboxField';

const meta = {
  title: 'Molecules/CheckboxField',
  component: CheckboxField,
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
} satisfies Meta<typeof CheckboxField>;

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
