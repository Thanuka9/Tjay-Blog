import "server-only";

import type {
  HomeSettings,
  Issue,
  OutboundMail,
  Post,
  PostMeta,
  Subscriber,
  Topic,
} from "@/lib/types";
import { readingTimeFrom, slugify, site } from "@/lib/site";
import {
  articleCode,
  articleIssueId,
  journalIssues,
  legacyIssues,
} from "@/lib/issues";
import { db } from "@/lib/neon-db";

type Row = Record<string, unknown>;

const DEFAULT_HOME: HomeSettings = { source: "latest", postIds: [] };

function asIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function articleMetaFromRow(row: Row): PostMeta {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    coverImage: row.cover_image ? String(row.cover_image) : null,
    topic: String(row.topic ?? ""),
    tags: asJson<string[]>(row.tags, []),
    status: String(row.status) as PostMeta["status"],
    featured: Boolean(row.featured),
    author: String(row.author) === "The Assay" ? site.name : String(row.author),
    publishedAt: asIso(row.published_at),
    updatedAt: asIso(row.updated_at) ?? new Date().toISOString(),
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
    readingTime: Number(row.reading_time ?? 1),
    seoTitle: row.seo_title ? String(row.seo_title).replaceAll("The Assay", site.name) : undefined,
    seoDescription: row.seo_description
      ? String(row.seo_description).replaceAll("The Assay", site.name)
      : undefined,
    issueId: row.issue_id === null || row.issue_id === undefined ? null : String(row.issue_id),
    articleCode: row.article_code ? String(row.article_code) : undefined,
    articleType: row.article_type ? (String(row.article_type) as PostMeta["articleType"]) : undefined,
    sequence: row.sequence === null || row.sequence === undefined ? undefined : Number(row.sequence),
    articlePdf: row.article_pdf === null || row.article_pdf === undefined ? null : String(row.article_pdf),
    citation: row.citation ? String(row.citation) : undefined,
    atAGlance: asJson<PostMeta["atAGlance"]>(row.at_a_glance, null),
    abstract: asJson<PostMeta["abstract"]>(row.abstract, null),
    references: asJson<PostMeta["references"]>(row.references_json, undefined),
    evidenceLadder: asJson<PostMeta["evidenceLadder"]>(row.evidence_ladder, null),
  };
}

function articleFromRow(row: Row): Post {
  return {
    ...articleMetaFromRow(row),
    content: String(row.body_markdown ?? "").replaceAll("The Assay", site.name),
  };
}

function issueFromRow(row: Row): Issue {
  return {
    id: String(row.id),
    volume: Number(row.volume),
    number: Number(row.number),
    month: Number(row.month),
    year: Number(row.year),
    coverImage: row.cover_image ? String(row.cover_image) : null,
    editorLetter: String(row.editor_letter ?? ""),
    editorName: String(row.editor_name ?? site.name),
    coverDescription: String(row.cover_description ?? ""),
    fullIssuePdf: row.full_issue_pdf ? String(row.full_issue_pdf) : null,
    status: String(row.status) as Issue["status"],
    upcomingArticles: asJson<Issue["upcomingArticles"]>(row.upcoming_articles, []),
  };
}

function subscriberFromRow(row: Row): Subscriber {
  return {
    id: String(row.id),
    email: String(row.email),
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
    unsubscribeToken: String(row.unsubscribe_token),
    unsubscribedAt: asIso(row.unsubscribed_at),
  };
}

function outboundFromRow(row: Row): OutboundMail {
  return {
    id: String(row.id),
    to: String(row.recipient),
    subject: String(row.subject),
    kind: String(row.kind) as OutboundMail["kind"],
    status: String(row.status) as OutboundMail["status"],
    error: row.error ? String(row.error) : undefined,
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
  };
}

async function rawIssueRows() {
  const sql = db();
  return (await sql`SELECT * FROM issues ORDER BY id DESC`) as Row[];
}

export async function listPostMeta(): Promise<PostMeta[]> {
  const sql = db();
  const [articleRows, issueRows] = await Promise.all([
    sql`SELECT id, slug, title, excerpt, cover_image, topic, tags, status, featured,
               author, published_at, updated_at, created_at, reading_time, seo_title,
               seo_description, issue_id, article_code, article_type, sequence,
               article_pdf, citation, at_a_glance, abstract, references_json, evidence_ladder
        FROM articles
        ORDER BY COALESCE(published_at, created_at) DESC, id`,
    rawIssueRows(),
  ]);

  const stored = (articleRows as Row[]).map(articleMetaFromRow);
  const registeredIssues = issueRows.map(issueFromRow);
  const defaults = legacyIssues(stored);

  const posts = stored.map((post) => {
    const issue =
      registeredIssues.find((item) => item.id === articleIssueId(post)) ??
      defaults.find((item) => item.id === articleIssueId(post));
    if (!issue) return post;
    const members = stored
      .filter((item) => articleIssueId(item) === issue.id)
      .sort(
        (a, b) =>
          (a.sequence ?? Number.MAX_SAFE_INTEGER) -
            (b.sequence ?? Number.MAX_SAFE_INTEGER) ||
          (a.publishedAt ?? a.createdAt).localeCompare(b.publishedAt ?? b.createdAt) ||
          a.id.localeCompare(b.id),
      );
    const sequence = post.sequence ?? members.findIndex((item) => item.id === post.id) + 1;
    return {
      ...post,
      sequence,
      articleCode: post.articleCode || articleCode(issue, sequence),
    };
  });

  return posts.sort((a, b) => {
    const aDate = a.publishedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

export async function getPost(id: string): Promise<Post | null> {
  const sql = db();
  const rows = (await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1`) as Row[];
  return rows[0] ? articleFromRow(rows[0]) : null;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const sql = db();
  const rows = (await sql`SELECT * FROM articles WHERE slug = ${slug} LIMIT 1`) as Row[];
  return rows[0] ? articleFromRow(rows[0]) : null;
}

export async function listPublishedPosts(): Promise<Post[]> {
  const sql = db();
  const rows = (await sql`SELECT * FROM articles
    WHERE status = 'published' AND published_at IS NOT NULL
    ORDER BY published_at DESC, id`) as Row[];
  return rows.map(articleFromRow);
}

export async function listPostsByTopic(topic: string): Promise<Post[]> {
  const sql = db();
  const rows = (await sql`SELECT * FROM articles
    WHERE status = 'published' AND published_at IS NOT NULL AND topic = ${topic}
    ORDER BY published_at DESC, id`) as Row[];
  return rows.map(articleFromRow);
}

export async function listIssueMeta(): Promise<Issue[]> {
  const [rows, posts] = await Promise.all([rawIssueRows(), listPostMeta()]);
  const stored = rows.map(issueFromRow);
  const ids = new Set(stored.map((issue) => issue.id));
  return [
    ...stored,
    ...legacyIssues(posts.filter((post) => post.status === "published" && post.publishedAt)).filter(
      (issue) => !ids.has(issue.id),
    ),
  ].sort((a, b) => b.id.localeCompare(a.id));
}

export async function listPublishedIssues() {
  const [posts, issues] = await Promise.all([listPublishedPosts(), listIssueMeta()]);
  return journalIssues(posts, issues);
}

export async function getPublishedIssue(id: string) {
  const issues = await listPublishedIssues();
  return id === "current" ? (issues[0] ?? null) : (issues.find((issue) => issue.id === id) ?? null);
}

export async function saveIssue(input: Issue, postIds: string[]) {
  const sql = db();
  const [posts, issues] = await Promise.all([listPostMeta(), listIssueMeta()]);
  if (
    issues.some(
      (issue) => issue.id !== input.id && issue.volume === input.volume && issue.number === input.number,
    )
  ) {
    throw new Error("That volume and issue number already exist.");
  }

  const selected = [...new Set(postIds)];
  if (selected.some((id) => !posts.some((post) => post.id === id))) {
    throw new Error("One of the selected articles no longer exists.");
  }
  if (
    input.status === "published" &&
    !selected.some((id) => posts.some((post) => post.id === id && post.status === "published"))
  ) {
    throw new Error("Publish at least one article before publishing the issue.");
  }

  const nextPosts = posts.map((post) => {
    const index = selected.indexOf(post.id);
    if (index >= 0) {
      return {
        ...post,
        issueId: input.id,
        sequence: index + 1,
        articleCode:
          articleIssueId(post) === input.id && post.articleCode
            ? post.articleCode
            : articleCode(input, index + 1),
      };
    }
    return articleIssueId(post) === input.id
      ? { ...post, issueId: null, articleCode: undefined, sequence: undefined }
      : post;
  });

  const codes = nextPosts.map((post) => post.articleCode).filter(Boolean);
  if (new Set(codes).size !== codes.length) {
    throw new Error("Article numbers must be unique. Check the assigned articles before saving.");
  }

  await sql`INSERT INTO issues (
      id, volume, number, month, year, cover_image, editor_letter, editor_name,
      cover_description, full_issue_pdf, status, upcoming_articles
    ) VALUES (
      ${input.id}, ${input.volume}, ${input.number}, ${input.month}, ${input.year},
      ${input.coverImage}, ${input.editorLetter}, ${input.editorName}, ${input.coverDescription},
      ${input.fullIssuePdf}, ${input.status}, ${JSON.stringify(input.upcomingArticles ?? [])}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      volume = EXCLUDED.volume,
      number = EXCLUDED.number,
      month = EXCLUDED.month,
      year = EXCLUDED.year,
      cover_image = EXCLUDED.cover_image,
      editor_letter = EXCLUDED.editor_letter,
      editor_name = EXCLUDED.editor_name,
      cover_description = EXCLUDED.cover_description,
      full_issue_pdf = EXCLUDED.full_issue_pdf,
      status = EXCLUDED.status,
      upcoming_articles = EXCLUDED.upcoming_articles`;

  for (const post of nextPosts) {
    await sql`UPDATE articles
      SET issue_id = ${post.issueId ?? null},
          sequence = ${post.sequence ?? null},
          article_code = ${post.articleCode ?? null}
      WHERE id = ${post.id}`;
  }

  return input;
}

export async function searchPosts(query: string): Promise<Post[]> {
  const needle = query.trim();
  if (!needle) return [];
  const pattern = `%${needle}%`;
  const sql = db();
  const rows = (await sql`SELECT * FROM articles
    WHERE status = 'published' AND published_at IS NOT NULL
      AND (
        title ILIKE ${pattern}
        OR excerpt ILIKE ${pattern}
        OR author ILIKE ${pattern}
        OR topic ILIKE ${pattern}
        OR body_markdown ILIKE ${pattern}
        OR tags::text ILIKE ${pattern}
      )
    ORDER BY published_at DESC, id`) as Row[];
  return rows.map(articleFromRow);
}

export async function savePost(
  input: Omit<Post, "readingTime" | "updatedAt" | "createdAt" | "publishedAt"> & {
    createdAt?: string;
    publishedAt?: string | null;
  },
): Promise<Post> {
  const sql = db();
  const now = new Date().toISOString();
  const posts = await listPostMeta();
  const existing = posts.find((post) => post.id === input.id);

  if (input.issueId) {
    const issue = (await listIssueMeta()).find((item) => item.id === input.issueId);
    if (!issue) throw new Error("Choose an existing issue.");
    input.sequence ??=
      Math.max(
        0,
        ...posts
          .filter((post) => post.id !== input.id && articleIssueId(post) === issue.id)
          .map((post) => post.sequence ?? 0),
      ) + 1;
    input.articleCode ||= articleCode(issue, input.sequence);
    if (
      posts.some(
        (post) =>
          post.id !== input.id &&
          articleIssueId(post) === input.issueId &&
          post.sequence === input.sequence,
      )
    ) {
      throw new Error("That reading order is already used in this issue. Reorder articles on the issue page.");
    }
  }

  if (
    input.articleCode &&
    posts.some((post) => post.id !== input.id && post.articleCode === input.articleCode)
  ) {
    throw new Error("That article number is already in use.");
  }
  if (posts.some((post) => post.slug === input.slug && post.id !== input.id)) {
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
      input.status === "published" ? (existing?.publishedAt ?? input.publishedAt ?? now) : null,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    issueId: input.issueId,
    articleCode: input.articleCode,
    articleType: input.articleType,
    sequence: input.sequence,
    articlePdf: input.articlePdf,
    citation: input.citation,
    atAGlance: input.atAGlance === undefined ? existing?.atAGlance : input.atAGlance,
    abstract: input.abstract === undefined ? existing?.abstract : input.abstract,
    references: input.references === undefined ? existing?.references : input.references,
    evidenceLadder:
      input.evidenceLadder === undefined ? existing?.evidenceLadder : input.evidenceLadder,
    readingTime: readingTimeFrom(input.content),
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };

  if (meta.featured) {
    await sql`UPDATE articles SET featured = false WHERE id <> ${meta.id}`;
  }

  await sql`INSERT INTO articles (
      id, slug, title, excerpt, body_markdown, cover_image, topic, tags, status, featured,
      author, published_at, updated_at, created_at, reading_time, seo_title, seo_description,
      issue_id, article_code, article_type, sequence, article_pdf, citation, at_a_glance,
      abstract, references_json, evidence_ladder
    ) VALUES (
      ${meta.id}, ${meta.slug}, ${meta.title}, ${meta.excerpt}, ${input.content}, ${meta.coverImage},
      ${meta.topic}, ${JSON.stringify(meta.tags)}::jsonb, ${meta.status}, ${meta.featured},
      ${meta.author}, ${meta.publishedAt}, ${meta.updatedAt}, ${meta.createdAt}, ${meta.readingTime},
      ${meta.seoTitle ?? null}, ${meta.seoDescription ?? null}, ${meta.issueId ?? null},
      ${meta.articleCode ?? null}, ${meta.articleType ?? null}, ${meta.sequence ?? null},
      ${meta.articlePdf ?? null}, ${meta.citation ?? null},
      ${JSON.stringify(meta.atAGlance ?? null)}::jsonb,
      ${JSON.stringify(meta.abstract ?? null)}::jsonb,
      ${JSON.stringify(meta.references ?? null)}::jsonb,
      ${JSON.stringify(meta.evidenceLadder ?? null)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      excerpt = EXCLUDED.excerpt,
      body_markdown = EXCLUDED.body_markdown,
      cover_image = EXCLUDED.cover_image,
      topic = EXCLUDED.topic,
      tags = EXCLUDED.tags,
      status = EXCLUDED.status,
      featured = EXCLUDED.featured,
      author = EXCLUDED.author,
      published_at = EXCLUDED.published_at,
      updated_at = EXCLUDED.updated_at,
      reading_time = EXCLUDED.reading_time,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      issue_id = EXCLUDED.issue_id,
      article_code = EXCLUDED.article_code,
      article_type = EXCLUDED.article_type,
      sequence = EXCLUDED.sequence,
      article_pdf = EXCLUDED.article_pdf,
      citation = EXCLUDED.citation,
      at_a_glance = EXCLUDED.at_a_glance,
      abstract = EXCLUDED.abstract,
      references_json = EXCLUDED.references_json,
      evidence_ladder = EXCLUDED.evidence_ladder`;

  return { ...meta, content: input.content };
}

export async function deletePost(id: string) {
  const sql = db();
  await sql`DELETE FROM articles WHERE id = ${id}`;
  const home = await getHomeSettings();
  if (home.postIds.includes(id)) {
    await saveHomeSettings({ ...home, postIds: home.postIds.filter((postId) => postId !== id) });
  }
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const sql = db();
  const rows = (await sql`SELECT * FROM subscribers ORDER BY created_at DESC`) as Row[];
  return rows.map(subscriberFromRow);
}

export async function addSubscriber(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Please enter a valid email address.");
  }

  const sql = db();
  const rows = (await sql`SELECT * FROM subscribers WHERE email = ${normalized} LIMIT 1`) as Row[];
  if (rows[0]) {
    const existing = subscriberFromRow(rows[0]);
    if (existing.unsubscribedAt) {
      const createdAt = new Date().toISOString();
      const restoredRows = (await sql`UPDATE subscribers
        SET unsubscribed_at = NULL, created_at = ${createdAt}
        WHERE id = ${existing.id}
        RETURNING *`) as Row[];
      return { already: false as const, subscriber: subscriberFromRow(restoredRows[0]) };
    }
    return { already: true as const, subscriber: existing };
  }

  const next: Subscriber = {
    id: crypto.randomUUID(),
    email: normalized,
    createdAt: new Date().toISOString(),
    unsubscribeToken: crypto.randomUUID(),
  };
  await sql`INSERT INTO subscribers (id, email, created_at, unsubscribe_token, unsubscribed_at)
    VALUES (${next.id}, ${next.email}, ${next.createdAt}, ${next.unsubscribeToken}, NULL)`;
  return { already: false as const, subscriber: next };
}

export async function unsubscribeByToken(token: string) {
  const sql = db();
  const rows = (await sql`UPDATE subscribers
    SET unsubscribed_at = ${new Date().toISOString()}
    WHERE unsubscribe_token = ${token}
    RETURNING id`) as Row[];
  return rows.length > 0;
}

export async function getHomeSettings(): Promise<HomeSettings> {
  const sql = db();
  const rows = (await sql`SELECT source, post_ids FROM home_settings WHERE singleton = true LIMIT 1`) as Row[];
  if (!rows[0]) return DEFAULT_HOME;
  return {
    source: rows[0].source === "selected" ? "selected" : "latest",
    postIds: asJson<string[]>(rows[0].post_ids, []).filter((id) => typeof id === "string").slice(0, 5),
  };
}

export async function saveHomeSettings(input: HomeSettings): Promise<HomeSettings> {
  const published = await listPublishedPosts();
  const allowed = new Set(published.map((post) => post.id));
  const postIds = [...new Set(input.postIds)].filter((id) => allowed.has(id)).slice(0, 5);
  const next: HomeSettings = {
    source: input.source === "selected" ? "selected" : "latest",
    postIds,
  };
  const sql = db();
  await sql`INSERT INTO home_settings (singleton, source, post_ids)
    VALUES (true, ${next.source}, ${JSON.stringify(next.postIds)}::jsonb)
    ON CONFLICT (singleton) DO UPDATE SET source = EXCLUDED.source, post_ids = EXCLUDED.post_ids`;
  return next;
}

export async function getHomeSlides(): Promise<Post[]> {
  const [settings, published] = await Promise.all([getHomeSettings(), listPublishedPosts()]);
  if (settings.source === "latest" || settings.postIds.length === 0) {
    return published.slice(0, 5);
  }
  return settings.postIds
    .map((id) => published.find((post) => post.id === id))
    .filter((post): post is Post => Boolean(post))
    .slice(0, 5);
}

export async function listTopics(): Promise<Topic[]> {
  const sql = db();
  const rows = (await sql`SELECT slug, name, description, sort_order
    FROM topics ORDER BY COALESCE(sort_order, 0), name`) as Row[];
  return rows.map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ""),
    order: row.sort_order === null || row.sort_order === undefined ? undefined : Number(row.sort_order),
  }));
}

export async function getTopic(slug: string) {
  const topics = await listTopics();
  return topics.find((topic) => topic.slug === slug);
}

export async function saveTopic(input: { slug?: string; name: string; description: string }) {
  const topics = await listTopics();
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2) throw new Error("Give the topic a name.");
  if (description.length < 12) throw new Error("Give the topic a short description.");

  const slug = input.slug || slugify(name);
  if (!slug) throw new Error("Could not make a slug from that name.");
  const existing = topics.find((topic) => topic.slug === slug);
  if (!input.slug && existing) throw new Error("That topic already exists.");

  const nextTopic: Topic = {
    slug,
    name,
    description,
    order: existing?.order ?? topics.length + 1,
  };
  const sql = db();
  await sql`INSERT INTO topics (slug, name, description, sort_order)
    VALUES (${nextTopic.slug}, ${nextTopic.name}, ${nextTopic.description}, ${nextTopic.order ?? null})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order`;
  return nextTopic;
}

export async function deleteTopic(slug: string) {
  const [topics, posts] = await Promise.all([listTopics(), listPostMeta()]);
  if (posts.some((post) => post.topic === slug)) {
    throw new Error("Move or delete the articles in this topic first.");
  }
  if (topics.length <= 1) throw new Error("Keep at least one topic.");
  const sql = db();
  await sql`DELETE FROM topics WHERE slug = ${slug}`;
}

export async function recordOutboundMail(entry: Omit<OutboundMail, "id" | "createdAt">) {
  const next: OutboundMail = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  const sql = db();
  await sql`INSERT INTO email_outbox (id, recipient, subject, kind, status, error, created_at)
    VALUES (${next.id}, ${next.to}, ${next.subject}, ${next.kind}, ${next.status}, ${next.error ?? null}, ${next.createdAt})`;
  await sql`DELETE FROM email_outbox
    WHERE id IN (
      SELECT id FROM email_outbox ORDER BY created_at DESC OFFSET 200
    )`;
  return next;
}

export async function listOutboundMail() {
  const sql = db();
  const rows = (await sql`SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 200`) as Row[];
  return rows.map(outboundFromRow);
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
