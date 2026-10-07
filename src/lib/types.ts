export type PostStatus = "draft" | "published";
export const ARTICLE_TYPES = [
  "Evidence Check",
  "Explainer",
  "Deep Dive",
  "Regulatory Watch",
  "Research Article",
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];
export type Issue = {
  id: string;
  volume: number;
  number: number;
  month: number;
  year: number;
  coverImage: string | null;
  editorLetter: string;
  editorName: string;
  coverDescription: string;
  fullIssuePdf: string | null;
  status: PostStatus;
};

export type Topic = {
  slug: string;
  name: string;
  description: string;
  order?: number;
};

export type {
  ChartSpec,
  ChartType,
  ChartRow,
  ChartPalette,
} from "@/lib/charts";

export type PostMeta = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  topic: string;
  tags: string[];
  status: PostStatus;
  featured: boolean;
  author: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  issueId?: string | null;
  articleCode?: string;
  articleType?: ArticleType;
  sequence?: number;
  articlePdf?: string | null;
  citation?: string;
};

export type Post = PostMeta & {
  content: string;
};

export type Subscriber = {
  id: string;
  email: string;
  createdAt: string;
  unsubscribeToken: string;
  unsubscribedAt?: string | null;
};

export type HomeSettings = {
  source: "latest" | "selected";
  postIds: string[];
};

export type OutboundMail = {
  id: string;
  to: string;
  subject: string;
  kind: "welcome" | "published" | "digest";
  status: "sent" | "logged" | "failed";
  error?: string;
  createdAt: string;
};
