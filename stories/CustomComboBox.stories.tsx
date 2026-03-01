import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomComboBox from '../components/atoms/CustomComboBox';

const meta = {
  title: 'Atoms/CustomComboBox',
  component: CustomComboBox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CustomComboBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CustomComboBox placeholder="選択してください" style={{ width: '16rem' }}>
      <option value="1">選択肢 1</option>
      <option value="2">選択肢 2</option>
      <option value="3">選択肢 3</option>
    </CustomComboBox>
  ),
};

export const WithValue: Story = {
  render: () => (
    <CustomComboBox defaultValue="2" style={{ width: '16rem' }}>
      <option value="1">選択肢 1</option>
      <option value="2">選択肢 2</option>
      <option value="3">選択肢 3</option>
    </CustomComboBox>
  ),
};

export const Error: Story = {
  render: () => (
    <CustomComboBox isError placeholder="エラー状態" style={{ width: '16rem' }}>
      <option value="1">選択肢 1</option>
      <option value="2">選択肢 2</option>
    </CustomComboBox>
  ),
};

export const Disabled: Story = {
  render: () => (
    <CustomComboBox disabled defaultValue="1" style={{ width: '16rem' }}>
      <option value="1">無効状態</option>
      <option value="2">選択肢 2</option>
    </CustomComboBox>
  ),
};
