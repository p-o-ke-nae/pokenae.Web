import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ImageSlideshow from '../components/atoms/ImageSlideshow';

const meta = {
  title: 'Atoms/ImageSlideshow',
  component: ImageSlideshow,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    interval: { control: 'number' },
  },
} satisfies Meta<typeof ImageSlideshow>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSlides = [
  { id: 'slide-1', src: '/mock/slide1.svg', alt: 'pokenae ポケモン攻略ツール集' },
  { id: 'slide-2', src: '/mock/slide2.svg', alt: '個体値特定ツール' },
  { id: 'slide-3', src: '/mock/slide3.svg', alt: '収集補助ツール' },
];

export const Default: Story = {
  args: {
    slides: mockSlides,
    interval: 4000,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const SingleSlide: Story = {
  args: {
    slides: [mockSlides[0]],
    interval: 4000,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const FastInterval: Story = {
  args: {
    slides: mockSlides,
    interval: 1500,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    ),
  ],
};
