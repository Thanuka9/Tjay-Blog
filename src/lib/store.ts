import "server-only";

import { promises as fs } from "fs";
import path from "path";
import type {
  HomeSettings,
  OutboundMail,
  Post,
  PostMeta,
  Subscriber,
  Topic,
} from "@/lib/types";
import { readingTimeFrom, slugify } from "@/lib/site";

const DATA_DIR = path.join(process.cwd(), "data");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const CONTENT_DIR = path.join(DATA_DIR, "content");
const SUBS_FILE = path.join(DATA_DIR, "subscribers.json");
const HOME_FILE = path.join(DATA_DIR, "home.json");
const TOPICS_FILE = path.join(DATA_DIR, "topics.json");
const OUTBOX_FILE = path.join(DATA_DIR, "outbox.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function contentPath(id: string) {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  return path.join(CONTENT_DIR, `${id}.md`);
}

export async function listPostMeta(): Promise<PostMeta[]> {
  const posts = await readJson<PostMeta[]>(POSTS_FILE, []);
  return posts.sort((a, b) => {
    const aDate = a.publishedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

export async function getPost(id: string): Promise<Post | null> {
  const posts = await listPostMeta();
  const meta = posts.find((post) => post.id === id);
  if (!meta) return null;
  let content = "";
  try {
    content = await fs.readFile(await contentPath(id), "utf8");
  } catch {
    content = "";
  }
  return { ...meta, content };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await listPostMeta();
  const meta = posts.find((post) => post.slug === slug);
  if (!meta) return null;
  return getPost(meta.id);
}

export async function listPublishedPosts(): Promise<Post[]> {
  const metas = (await listPostMeta()).filter(
    (post) => post.status === "published" && post.publishedAt,
  );
  const posts = await Promise.all(metas.map((meta) => getPost(meta.id)));
  return posts.filter((post): post is Post => post !== null);
}

export async function listPostsByTopic(topic: string): Promise<Post[]> {
  const posts = await listPublishedPosts();
  return posts.filter((post) => post.topic === topic);
}

export async function searchPosts(query: string): Promise<Post[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const posts = await listPublishedPosts();
  return posts.filter((post) => {
    const haystack = [
      post.title,
      post.excerpt,
      post.author,
      post.topic,
      ...post.tags,
      post.content,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export async function savePost(
  input: Omit<Post, "readingTime" | "updatedAt" | "createdAt" | "publishedAt"> & {
    createdAt?: string;
    publishedAt?: string | null;
  },
): Promise<Post> {
  const now = new Date().toISOString();
  const posts = await listPostMeta();
  const existing = posts.find((post) => post.id === input.id);
  const slugTaken = posts.some(
    (post) => post.slug === input.slug && post.id !== input.id,
  );
  if (slugTaken) {
    throw new Error("That slug is already in use.");
  }

  const meta: PostMeta = {
    id: input.id,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    coverImage: input.coverImage,
    topic: input.topic,
    tags: input.tags,
    status: input.status,
    featured: input.featured,
    author: input.author,
    publishedAt:
      input.status === "published"
        ? existing?.publishedAt ?? input.publishedAt ?? now
        : null,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    readingTime: readingTimeFrom(input.content),
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };

  const next = existing
    ? posts.map((post) => (post.id === meta.id ? meta : post))
    : [meta, ...posts];

  if (meta.featured) {
    for (const post of next) {
      if (post.id !== meta.id) post.featured = false;
    }
  }

  await writeJson(POSTS_FILE, next);
  await fs.writeFile(await contentPath(meta.id), input.content, "utf8");
  return { ...meta, content: input.content };
}

export async function deletePost(id: string) {
  const posts = await listPostMeta();
  await writeJson(
    POSTS_FILE,
    posts.filter((post) => post.id !== id),
  );
  try {
    await fs.unlink(await contentPath(id));
  } catch {
    // Content file may not exist for a brand-new draft.
  }
  const home = await getHomeSettings();
  if (home.postIds.includes(id)) {
    await writeJson(HOME_FILE, {
      ...home,
      postIds: home.postIds.filter((postId) => postId !== id),
    });
  }
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const subs = await readJson<Subscriber[]>(SUBS_FILE, []);
  let changed = false;
  const migrated = subs.map((sub) => {
    if (sub.unsubscribeToken) return sub;
    changed = true;
    return { ...sub, unsubscribeToken: crypto.randomUUID() };
  });
  if (changed) await writeJson(SUBS_FILE, migrated);
  return migrated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addSubscriber(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Please enter a valid email address.");
  }
  const subs = await listSubscribers();
  const existing = subs.find((sub) => sub.email === normalized);
  if (existing) {
    if (existing.unsubscribedAt) {
      const restored = {
        ...existing,
        unsubscribedAt: null,
        createdAt: new Date().toISOString(),
      };
      await writeJson(
        SUBS_FILE,
        subs.map((sub) => (sub.id === existing.id ? restored : sub)),
      );
      return { already: false as const, subscriber: restored };
    }
    return { already: true as const, subscriber: existing };
  }
  const next: Subscriber = {
    id: crypto.randomUUID(),
    email: normalized,
    createdAt: new Date().toISOString(),
    unsubscribeToken: crypto.randomUUID(),
  };
  await writeJson(SUBS_FILE, [next, ...subs]);
  return { already: false as const, subscriber: next };
}

export async function unsubscribeByToken(token: string) {
  const subs = await listSubscribers();
  const match = subs.find((sub) => sub.unsubscribeToken === token);
  if (!match) return false;
  await writeJson(
    SUBS_FILE,
    subs.map((sub) =>
      sub.id === match.id
        ? { ...sub, unsubscribedAt: new Date().toISOString() }
        : sub,
    ),
  );
  return true;
}

const DEFAULT_HOME: HomeSettings = { source: "latest", postIds: [] };

export async function getHomeSettings(): Promise<HomeSettings> {
  const stored = await readJson<Partial<HomeSettings>>(HOME_FILE, DEFAULT_HOME);
  const source = stored.source === "selected" ? "selected" : "latest";
  const postIds = Array.isArray(stored.postIds)
    ? stored.postIds.filter((id): id is string => typeof id === "string").slice(0, 5)
    : [];
  return { source, postIds };
}

export async function saveHomeSettings(input: HomeSettings): Promise<HomeSettings> {
  const published = await listPublishedPosts();
  const allowed = new Set(published.map((post) => post.id));
  const postIds = [...new Set(input.postIds)]
    .filter((id) => allowed.has(id))
    .slice(0, 5);
  const next: HomeSettings = {
    source: input.source === "selected" ? "selected" : "latest",
    postIds,
  };
  await writeJson(HOME_FILE, next);
  return next;
}

export async function getHomeSlides(): Promise<Post[]> {
  const [settings, published] = await Promise.all([
    getHomeSettings(),
    listPublishedPosts(),
  ]);
  if (settings.source === "latest" || settings.postIds.length === 0) {
    return published.slice(0, 5);
  }
  return settings.postIds
    .map((id) => published.find((post) => post.id === id))
    .filter((post): post is Post => Boolean(post))
    .slice(0, 5);
}

export async function listTopics(): Promise<Topic[]> {
  const topics = await readJson<Topic[]>(TOPICS_FILE, []);
  return [...topics].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name),
  );
}

export async function getTopic(slug: string) {
  const topics = await listTopics();
  return topics.find((topic) => topic.slug === slug);
}

export async function saveTopic(input: {
  slug?: string;
  name: string;
  description: string;
}) {
  const topics = await listTopics();
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2) throw new Error("Give the topic a name.");
  if (description.length < 12) {
    throw new Error("Give the topic a short description.");
  }

  const slug = input.slug || slugify(name);
  if (!slug) throw new Error("Could not make a slug from that name.");
  const existing = topics.find((topic) => topic.slug === slug);
  if (!input.slug && existing) {
    throw new Error("That topic already exists.");
  }

  const nextTopic: Topic = {
    slug,
    name,
    description,
    order: existing?.order ?? topics.length + 1,
  };
  const next = existing
    ? topics.map((topic) => (topic.slug === slug ? nextTopic : topic))
    : [...topics, nextTopic];
  await writeJson(TOPICS_FILE, next);
  return nextTopic;
}

export async function deleteTopic(slug: string) {
  const [topics, posts] = await Promise.all([listTopics(), listPostMeta()]);
  if (posts.some((post) => post.topic === slug)) {
    throw new Error("Move or delete the articles in this topic first.");
  }
  if (topics.length <= 1) {
    throw new Error("Keep at least one topic.");
  }
  await writeJson(
    TOPICS_FILE,
    topics.filter((topic) => topic.slug !== slug),
  );
}

export async function recordOutboundMail(
  entry: Omit<OutboundMail, "id" | "createdAt">,
) {
  const rows = await readJson<OutboundMail[]>(OUTBOX_FILE, []);
  const next: OutboundMail = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  await writeJson(OUTBOX_FILE, [next, ...rows].slice(0, 200));
  return next;
}

export async function listOutboundMail() {
  return readJson<OutboundMail[]>(OUTBOX_FILE, []);
}

export async function getDashboardStats() {
  const [posts, subscribers, home, topics] = await Promise.all([
    listPostMeta(),
    listSubscribers(),
    getHomeSettings(),
    listTopics(),
  ]);
  return {
    published: posts.filter((post) => post.status === "published").length,
    drafts: posts.filter((post) => post.status === "draft").length,
    subscribers: subscribers.filter((sub) => !sub.unsubscribedAt).length,
    featured: posts.find((post) => post.featured) ?? null,
    recent: posts.slice(0, 8),
    home,
    topics: topics.length,
  };
}
