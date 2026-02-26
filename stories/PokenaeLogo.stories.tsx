import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PokenaeLogo, { type PokenaeLogo as PokenaeLogoRef } from '../components/atoms/PokenaeLogo';
import CustomButton from '../components/atoms/CustomButton';
import { useRef } from 'react';

const meta = {
  title: 'Atoms/PokenaeLogo',
  component: PokenaeLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    autoPlay: { control: 'boolean' },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: {
    autoPlay: true,
    width: 200,
    height: 60,
  },
} satisfies Meta<typeof PokenaeLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const WithReplayDemo = (args: typeof meta['args']) => {
  const logoRef = useRef<PokenaeLogoRef>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <PokenaeLogo ref={logoRef} {...args} />
      <CustomButton variant="accent" onClick={() => logoRef.current?.replay()}>
        再生
      </CustomButton>
    </div>
  );
};

export const WithReplay: Story = {
  render: (args) => <WithReplayDemo {...args} />,
};

export const Large: Story = {
  args: {
    width: 360,
    height: 100,
  },
};
