import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomRadioButton from '../components/atoms/CustomRadioButton';

const meta = {
  title: 'Atoms/CustomRadioButton',
  component: CustomRadioButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
  },
} satisfies Meta<typeof CustomRadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'radio-group',
    value: 'option1',
  },
};

export const Checked: Story = {
  args: {
    name: 'radio-group',
    value: 'option1',
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    name: 'radio-group',
    value: 'option1',
    disabled: true,
  },
};
