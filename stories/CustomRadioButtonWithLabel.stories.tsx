import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomRadioButtonWithLabel from '../components/molecules/CustomRadioButton';

const meta = {
  title: 'Molecules/CustomRadioButtonWithLabel',
  component: CustomRadioButtonWithLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
  },
  args: {
    label: 'ラジオボタン',
    name: 'radio-group',
    value: 'option1',
  },
} satisfies Meta<typeof CustomRadioButtonWithLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
    label: '必須選択肢',
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
    label: '無効ラジオボタン',
  },
};
