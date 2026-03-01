import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LoadingOverlay from '../components/molecules/LoadingOverlay';
import CustomButton from '../components/atoms/CustomButton';
import { useState } from 'react';

const meta = {
  title: 'Molecules/LoadingOverlay',
  component: LoadingOverlay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

const OverlayDemo = () => {
  const [open, setOpen] = useState(false);
  const simulate = () => {
    setOpen(true);
    setTimeout(() => setOpen(false), 3000);
  };
  return (
    <div>
      <CustomButton variant="accent" onClick={simulate}>
        通信を開始（3秒後に完了）
      </CustomButton>
      <LoadingOverlay open={open} message="サーバと通信中..." />
    </div>
  );
};

export const Default: Story = {
  render: () => <OverlayDemo />,
  args: { open: false },
};

export const Open: Story = {
  args: {
    open: true,
    message: 'サーバと通信中...',
  },
};
