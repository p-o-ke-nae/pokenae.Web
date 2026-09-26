export type ContentStatus = "draft" | "published";

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
  showInPickup?: boolean;
  priority?: number;
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
  severity: "normal" | "highlight" | "urgent";
  startsAt?: string;
  endsAt?: string;
};

export type ContentUpdate = {
  id: string;
  publishedAt: string;
  target: "post" | "tool" | "home" | "site";
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
  tools: ToolDefinition[];
  banners: HomeBanner[];
  announcements: Announcement[];
  updates: ContentUpdate[];
};
