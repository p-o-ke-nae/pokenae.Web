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

// ---------------------------------------------------------------------------
// 3 ボタン footer（閉じる系 → 副操作 → 主操作）
// ---------------------------------------------------------------------------

const ThreeButtonDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CustomButton variant="accent" onClick={() => setOpen(true)}>
        3 ボタン footer
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="項目定義を編集"
        footer={
          <>
            <CustomButton onClick={() => setOpen(false)}>読み取り専用に戻す</CustomButton>
            <CustomButton onClick={() => setOpen(false)}>キャンセル</CustomButton>
            <CustomButton variant="accent" onClick={() => setOpen(false)}>
              保存
            </CustomButton>
          </>
        }
      >
        <p>3 ボタン構成。狭い幅ではボタンが折り返します。</p>
      </Dialog>
    </div>
  );
};

export const ThreeButtons: Story = {
  render: () => <ThreeButtonDemo />,
  args: { open: false },
};

// ---------------------------------------------------------------------------
// 長いラベルの footer
// ---------------------------------------------------------------------------

const LongLabelDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CustomButton variant="accent" onClick={() => setOpen(true)}>
        長いラベル footer
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="トライアルデータの反映"
        footer={
          <>
            <CustomButton onClick={() => setOpen(false)}>いいえ</CustomButton>
            <CustomButton variant="accent" onClick={() => setOpen(false)}>
              サーバへ反映する (128件)
            </CustomButton>
          </>
        }
      >
        <p>長いラベルのボタンが含まれる場合のレイアウトです。</p>
      </Dialog>
    </div>
  );
};

export const LongLabel: Story = {
  render: () => <LongLabelDemo />,
  args: { open: false },
};

// ---------------------------------------------------------------------------
// 左右分離 footer（EditorDialog パターン）
// ---------------------------------------------------------------------------

const SplitFooterDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CustomButton variant="accent" onClick={() => setOpen(true)}>
        左右分離 footer
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="セーブデータ編集"
        size="md"
        footer={
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CustomButton disabled>← 前へ</CustomButton>
              <CustomButton>次へ →</CustomButton>
              <span className="text-xs text-zinc-500">2 / 15</span>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <CustomButton variant="ghost" onClick={() => setOpen(false)}>削除</CustomButton>
              <CustomButton onClick={() => setOpen(false)}>キャンセル</CustomButton>
              <CustomButton variant="accent" onClick={() => setOpen(false)}>
                保存する
              </CustomButton>
            </div>
          </div>
        }
      >
        <p>ナビゲーション（左）と操作（右）が分離した footer です。狭い幅では 2 段に折り返します。</p>
      </Dialog>
    </div>
  );
};

export const SplitFooter: Story = {
  render: () => <SplitFooterDemo />,
  args: { open: false },
};
