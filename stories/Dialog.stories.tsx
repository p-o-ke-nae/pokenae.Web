import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Dialog from '../components/molecules/Dialog';
import CustomButton from '../components/atoms/CustomButton';
import { useState } from 'react';

const meta = {
  title: 'Molecules/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const DialogDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CustomButton variant="accent" onClick={() => setOpen(true)}>
        ダイアログを開く
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="確認"
        footer={
          <>
            <CustomButton variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </CustomButton>
            <CustomButton variant="accent" onClick={() => setOpen(false)}>
              確認
            </CustomButton>
          </>
        }
      >
        <p>ダイアログのコンテンツがここに表示されます。</p>
      </Dialog>
    </div>
  );
};

export const Default: Story = {
  render: () => <DialogDemo />,
  args: {
    open: false,
  },
};

export const Open: Story = {
  args: {
    open: true,
    title: 'タイトル',
    children: <p>ダイアログのコンテンツです。</p>,
  },
};
