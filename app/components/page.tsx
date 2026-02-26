'use client';

import { useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import CustomRadioButton from '@/components/atoms/CustomRadioButton';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomDialog from '@/components/atoms/CustomDialog';
import CustomLoader from '@/components/atoms/CustomLoader';
import PokenaeLogo, { type PokenaeLogo as PokenaeLogoRef } from '@/components/atoms/PokenaeLogo';
import CustomCheckBoxWithLabel from '@/components/molecules/CustomCheckBox';

export default function ComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const logoRef = useRef<PokenaeLogoRef>(null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <CustomHeader level={1}>コンポーネントギャラリー</CustomHeader>
        <p className="text-zinc-600 dark:text-zinc-400">
          開発・デバッグ環境向けコンポーネント一覧
        </p>

        {/* PokenaeLogo */}
        <section className="space-y-4">
          <CustomHeader level={2}>PokenaeLogo</CustomHeader>
          <div className="flex flex-col items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <PokenaeLogo ref={logoRef} width={240} height={70} />
            <CustomButton variant="accent" onClick={() => logoRef.current?.replay()}>
              アニメーション再生
            </CustomButton>
            <PokenaeLogo width={160} height={48} autoPlay={false} />
            <span className="text-xs text-zinc-500">autoPlay=false（アニメーションなし）</span>
          </div>
        </section>

        {/* CustomHeader */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomHeader</CustomHeader>
          <div className="space-y-2 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomHeader level={1}>見出し H1</CustomHeader>
            <CustomHeader level={2}>見出し H2</CustomHeader>
            <CustomHeader level={3}>見出し H3</CustomHeader>
            <CustomHeader level={4}>見出し H4</CustomHeader>
            <CustomHeader level={5}>見出し H5</CustomHeader>
            <CustomHeader level={6}>見出し H6</CustomHeader>
          </div>
        </section>

        {/* CustomLabel */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomLabel</CustomHeader>
          <div className="flex flex-wrap gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomLabel>通常ラベル</CustomLabel>
            <CustomLabel required>必須ラベル</CustomLabel>
          </div>
        </section>

        {/* CustomButton */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomButton</CustomHeader>
          <div className="flex flex-wrap gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="neutral">Neutral</CustomButton>
            <CustomButton variant="accent">Accent</CustomButton>
            <CustomButton variant="ghost">Ghost</CustomButton>
            <CustomButton variant="accent" isLoading>Loading</CustomButton>
            <CustomButton variant="neutral" disabled>Disabled</CustomButton>
          </div>
        </section>

        {/* CustomCheckBox (Atom) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomCheckBox（原始粒度・Atom）</CustomHeader>
          <div className="flex flex-wrap gap-4 items-center p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomCheckBox aria-label="デフォルト" />
            <CustomCheckBox defaultChecked aria-label="チェック済み" />
            <CustomCheckBox disabled aria-label="無効" />
            <CustomCheckBox disabled defaultChecked aria-label="無効チェック済み" />
          </div>
        </section>

        {/* CustomCheckBoxWithLabel (Molecule) */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomCheckBoxWithLabel（分子粒度・Molecule）</CustomHeader>
          <div className="flex flex-col gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomCheckBoxWithLabel label="通常チェックボックス" />
            <CustomCheckBoxWithLabel label="デフォルトチェック済み" defaultChecked />
            <CustomCheckBoxWithLabel label="必須項目" required />
            <CustomCheckBoxWithLabel label="無効チェックボックス" disabled />
          </div>
        </section>

        {/* CustomRadioButton */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomRadioButton</CustomHeader>
          <div className="flex flex-col gap-3 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <CustomRadioButton id="r1" name="demo" value="a" defaultChecked />
              <CustomLabel htmlFor="r1">選択肢 A</CustomLabel>
            </div>
            <div className="flex items-center gap-2">
              <CustomRadioButton id="r2" name="demo" value="b" />
              <CustomLabel htmlFor="r2">選択肢 B</CustomLabel>
            </div>
            <div className="flex items-center gap-2">
              <CustomRadioButton id="r3" name="demo" value="c" disabled />
              <CustomLabel htmlFor="r3">選択肢 C（無効）</CustomLabel>
            </div>
          </div>
        </section>

        {/* CustomTextBox */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomTextBox</CustomHeader>
          <div className="flex flex-col gap-3 max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div>
              <CustomLabel htmlFor="text1">通常テキストボックス</CustomLabel>
              <CustomTextBox id="text1" placeholder="テキストを入力" className="mt-1" />
            </div>
            <div>
              <CustomLabel htmlFor="text2" required>エラー状態</CustomLabel>
              <CustomTextBox id="text2" isError placeholder="エラーがあります" className="mt-1" />
            </div>
            <div>
              <CustomLabel htmlFor="text3">無効状態</CustomLabel>
              <CustomTextBox id="text3" disabled placeholder="無効です" className="mt-1" />
            </div>
          </div>
        </section>

        {/* CustomMessageArea */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomMessageArea</CustomHeader>
          <div className="flex flex-col gap-3 max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div>
              <CustomLabel htmlFor="msg1">メッセージエリア</CustomLabel>
              <CustomMessageArea id="msg1" placeholder="メッセージを入力してください" className="mt-1" rows={4} />
            </div>
            <div>
              <CustomLabel htmlFor="msg2" required>エラー状態</CustomLabel>
              <CustomMessageArea id="msg2" isError placeholder="エラーがあります" className="mt-1" rows={3} />
            </div>
          </div>
        </section>

        {/* CustomLoader */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomLoader</CustomHeader>
          <div className="flex flex-wrap gap-6 items-center p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="sm" />
              <span className="text-xs text-zinc-500">Small</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="md" />
              <span className="text-xs text-zinc-500">Medium</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CustomLoader size="lg" />
              <span className="text-xs text-zinc-500">Large</span>
            </div>
          </div>
        </section>

        {/* CustomDialog */}
        <section className="space-y-4">
          <CustomHeader level={2}>CustomDialog</CustomHeader>
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
            <CustomButton variant="accent" onClick={() => setDialogOpen(true)}>
              ダイアログを開く
            </CustomButton>
            <CustomDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="確認ダイアログ"
              footer={
                <>
                  <CustomButton variant="ghost" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </CustomButton>
                  <CustomButton variant="accent" onClick={() => setDialogOpen(false)}>
                    確認
                  </CustomButton>
                </>
              }
            >
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                ダイアログのコンテンツがここに表示されます。<br />
                任意の内容を含めることができます。
              </p>
            </CustomDialog>
          </div>
        </section>
      </div>
    </div>
  );
}
