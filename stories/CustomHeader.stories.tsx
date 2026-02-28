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
