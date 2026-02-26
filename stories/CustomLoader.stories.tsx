import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomLoader from '../components/atoms/CustomLoader';

const meta = {
  title: 'Atoms/CustomLoader',
  component: CustomLoader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    size: 'md',
  },
} satisfies Meta<typeof CustomLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
