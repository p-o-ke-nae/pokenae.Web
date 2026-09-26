export type ContentStatus = "draft" | "published";

export type TagDefinition = {
  id: string;
  label: string;
};

export type Post = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  status: ContentStatus;
  category: string;
  tags: string[];
  relatedTags: string[];
  priority: number;
  thumbnail?: string;
  legacyUrl?: string;
  changeNote?: string;
  showInPickup: boolean;
  embed?: { component: "CollectionDex"; data: string };
  body: string;
};

export type ToolKind = "windows-app" | "library";

export type ToolDefinition = {
  slug: string;
  name: string;
  summary: string;
  repository: string;
  kind: ToolKind;
  image?: string;
  supportedOs?: string[];
  packageUrl?: string;
  docsPath?: string;
  releaseChannel?: string;
  tags: string[];
  showInPickup?: boolean;
  priority?: number;
};

export type AppDefinition = {
  slug: string;
  name: string;
  summary: string;
  href: string;
  image?: string;
  imageAlt: string;
  metaLabel?: string;
  status: ContentStatus | "archived";
  order: number;
  tags: string[];
};

export type HomeBanner = {
  id: string;
  image: string;
  alt: string;
  href?: string;
  order: number;
  startsAt?: string;
  endsAt?: string;
};

export type Announcement = {
  id: string;
  text: string;
  href?: string;
  severity: "normal" | "emphasis" | "urgent";
  startsAt?: string;
  endsAt?: string;
};

export type ContentUpdate = {
  id: string;
  publishedAt: string;
  target: "post" | "tool" | "app" | "home" | "navigation";
  summary: string;
  href?: string;
  skipInfo?: boolean;
};

export type CollectionDexRecord = {
  number: number;
  name: string;
  region: string;
  status: string;
  color?: string;
  image?: string;
  location?: string;
};

export type ContentSnapshot = {
  posts: Post[];
  tagDefinitions: TagDefinition[];
  tools: ToolDefinition[];
  apps: AppDefinition[];
  banners: HomeBanner[];
  announcements: Announcement[];
  updates: ContentUpdate[];
};
