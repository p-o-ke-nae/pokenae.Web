import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomModal from '../components/atoms/CustomModal';
import CustomButton from '../components/atoms/CustomButton';
import { useState } from 'react';

const meta = {
  title: 'Atoms/CustomModal',
  component: CustomModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CustomModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const ModalDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CustomButton variant="accent" onClick={() => setOpen(true)}>
        モーダルを開く
      </CustomButton>
      <CustomModal
        open={open}
        onClose={() => setOpen(false)}
        style={{ width: 'min(90vw, 24rem)', padding: '1.5rem' }}
      >
        <p style={{ margin: 0 }}>これはCustomModalの原始粒度コンポーネントです。</p>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <CustomButton variant="accent" onClick={() => setOpen(false)}>
            閉じる
          </CustomButton>
        </div>
      </CustomModal>
    </div>
  );
};

export const Default: Story = {
  render: () => <ModalDemo />,
  args: {
    open: false,
  },
};
