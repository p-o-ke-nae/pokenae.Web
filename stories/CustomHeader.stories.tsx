import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomHeader from '../components/atoms/CustomHeader';

const meta = {
  title: 'Atoms/CustomHeader',
  component: CustomHeader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
    },
    variant: {
      control: 'select',
      options: ['title', 'home', 'section', 'subtle', 'plain'],
    },
  },
  args: {
    children: '見出しテキスト',
    level: 1,
  },
} satisfies Meta<typeof CustomHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const H1: Story = { args: { level: 1 } };
export const H2: Story = { args: { level: 2 } };
export const H3: Story = { args: { level: 3 } };
export const H4: Story = { args: { level: 4 } };
export const H5: Story = { args: { level: 5 } };
export const H6: Story = { args: { level: 6 } };

export const Home: Story = {
  args: { level: 2, variant: 'home', children: 'PICKUP' },
  decorators: [(Story) => <div style={{ width: '760px', padding: '10px', borderTop: '5px solid #a77ca5', background: '#e5e7f0' }}><Story /></div>],
};

export const ProseRhythm: Story = {
  render: () => <article style={{ width: '760px', lineHeight: 1.75 }}>
    <p>同じセクション内の最初の段落です。</p>
    <p style={{ marginTop: '1rem' }}>同じセクション内の次の段落です。</p>
    <CustomHeader level={2} context="prose">ツールの導入など</CustomHeader>
    <p>見出し直後の本文は、見出しと同じセクションとして近く表示します。</p>
    <p style={{ marginTop: '1rem' }}>次の段落との通常間隔です。</p>
    <CustomHeader level={3} context="prose">基礎ポイント表の作成</CustomHeader>
    <p>次のセクションの本文です。</p>
  </article>,
  args: { children: '見出し', level: 2 },
};
