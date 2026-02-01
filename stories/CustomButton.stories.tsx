import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import CustomButton from '../components/atoms/CustomButton';

const meta = {
  title: 'Atoms/CustomButton',
  component: CustomButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['neutral', 'accent', 'ghost'],
    },
    iconPosition: {
      control: 'radio',
      options: ['left', 'right'],
    },
    icon: { control: false },
    onClick: { action: 'clicked' },
  },
  args: {
    children: 'ボタン',
  },
} satisfies Meta<typeof CustomButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const PlaceholderIcon = () => (
  <span aria-hidden style={{ fontSize: '0.85rem' }}>
    ★
  </span>
);

export const Neutral: Story = {
  args: {
    variant: 'neutral',
  },
};

export const Accent: Story = {
  args: {
    variant: 'accent',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'accent',
    icon: <PlaceholderIcon />,
    iconPosition: 'left',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    disabled: true,
  },
};
