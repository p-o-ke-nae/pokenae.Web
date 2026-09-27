import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostList from '../components/organisms/PostList';

const meta = {
  title: 'Organisms/PostList',
  component: PostList,
  parameters: {
    layout: 'padded',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {
    baseRevision: 'storybook-revision',
    posts: [
      {
        slug: 'published-post',
        title: '公開中の記事',
        summary: '公開中の記事の概要です。',
        publishedAt: '2026-09-26',
        status: 'published',
        category: 'news',
        tags: [],
        relatedTags: [],
        priority: 1,
        showInPickup: false,
        body: '本文',
      },
      {
        slug: 'draft-post',
        title: '下書きの記事',
        summary: '下書きの記事の概要です。',
        publishedAt: '2026-09-25',
        status: 'draft',
        category: 'news',
        tags: [],
        relatedTags: [],
        priority: 2,
        showInPickup: false,
        body: '本文',
      },
    ],
  },
} satisfies Meta<typeof PostList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {};
