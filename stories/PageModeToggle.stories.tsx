import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import PageModeToggle from '../components/atoms/PageModeToggle';
import type { PageMode } from '../lib/game-management/resources';

const meta = {
  title: 'Atoms/PageModeToggle',
  component: PageModeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'radio',
      options: ['view', 'edit'],
    },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: {
    mode: 'view',
    disabled: false,
    onChange: () => undefined,
  },
} satisfies Meta<typeof PageModeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ViewMode: Story = {
  args: { mode: 'view' },
};

export const EditMode: Story = {
  args: { mode: 'edit' },
};

export const Disabled: Story = {
  args: { mode: 'view', disabled: true },
};

function InteractiveToggle() {
  const [mode, setMode] = useState<PageMode>('view');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <PageModeToggle mode={mode} onChange={setMode} />
      <span style={{ fontSize: '0.75rem', color: '#888' }}>
        current: {mode}
      </span>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveToggle />,
};
