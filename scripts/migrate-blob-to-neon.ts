import { get, list } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { AwsClient } from "aws4fetch";
import { promises as fs } from "fs";
import path from "path";

type Json = Record<string, unknown>;

const ROOT = process.cwd();
const STATE = {
  posts: "tjay/state/posts.json",
  issues: "tjay/state/issues.json",
  topics: "tjay/state/topics.json",
  home: "tjay/state/home.json",
  subscribers: "tjay/state/subscribers.json",
  outbox: "tjay/state/outbox.json",
} as const;

async function loadEnvFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Optional local env file.
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function privateText(pathname: string) {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
      token: required("BLOB_PRIVATE_READ_WRITE_TOKEN"),
    });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  } catch {
    return null;
  }
}

async function privateJson<T>(pathname: string, fallback: T): Promise<T> {
  const text = await privateText(pathname);
  if (!text) return fallback;
  return JSON.parse(text) as T;
}

function storageConfig() {
  return {
    endpoint: required("AWS_ENDPOINT_URL_S3").replace(/\/$/, ""),
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    region: process.env.AWS_REGION?.trim() || "us-east-1",
    bucket: process.env.NEON_STORAGE_BUCKET?.trim() || "the-abyss-media",
  };
}

function encodedKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function migrateMedia() {
  const publicToken = required("BLOB_PUBLIC_READ_WRITE_TOKEN");
  const cfg = storageConfig();
  const signer = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: cfg.region,
  });
  const mapping = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const page = await list({
      token: publicToken,
      prefix: "tjay/uploads/",
      cursor,
      limit: 1000,
    });
    for (const blob of page.blobs) {
      const key = blob.pathname.replace(/^tjay\/uploads\//, "");
      if (!key) continue;
      const source = await fetch(blob.downloadUrl || blob.url);
      if (!source.ok) {
        throw new Error(`Could not download ${blob.pathname}: ${source.status}`);
      }
      const bytes = new Uint8Array(await source.arrayBuffer());
      const destination = `${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${encodedKey(key)}`;
      const contentType = source.headers.get("content-type") || "application/octet-stream";
      const uploaded = await signer.fetch(destination, {
        method: "PUT",
        body: bytes,
        headers: { "content-type": contentType },
      });
      if (!uploaded.ok) {
        throw new Error(`Could not upload ${key} to Neon Storage: ${uploaded.status}`);
      }
      mapping.set(blob.url, destination);
      if (blob.downloadUrl) mapping.set(blob.downloadUrl, destination);
      console.log(`[MEDIA] ${blob.pathname} -> ${key}`);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return mapping;
}

function rewriteMedia(value: string | null | undefined, mapping: Map<string, string>) {
  if (!value) return value ?? null;
  let next = value;
  for (const [from, to] of mapping) next = next.replaceAll(from, to);
  return next;
}

async function main() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));

  const sql = neon(required("DATABASE_URL"));
  required("BLOB_PRIVATE_READ_WRITE_TOKEN");
  required("BLOB_PUBLIC_READ_WRITE_TOKEN");

  const migrateMediaNow = process.env.MIGRATE_MEDIA_TO_NEON === "1";
  let media = new Map<string, string>();
  if (migrateMediaNow) {
    storageConfig();
    console.log("Migrating Vercel Blob media to Neon Object Storage...");
    media = await migrateMedia();
  } else {
    console.log(
      "Media migration skipped; existing Vercel Blob image URLs will be preserved for the safe database cutover.",
    );
  }

  console.log("Reading private Vercel Blob state...");
  const posts = await privateJson<Json[]>(STATE.posts, []);
  const issues = await privateJson<Json[]>(STATE.issues, []);
  const topics = await privateJson<Json[]>(STATE.topics, []);
  const home = await privateJson<Json>(STATE.home, { source: "latest", postIds: [] });
  const subscribers = await privateJson<Json[]>(STATE.subscribers, []);
  const outbox = await privateJson<Json[]>(STATE.outbox, []);

  console.log(
    `Found ${posts.length} posts, ${issues.length} issues, ${topics.length} topics, ${subscribers.length} subscribers, ${outbox.length} outbox rows.`,
  );

  for (const topic of topics) {
    await sql`INSERT INTO topics (slug, name, description, sort_order)
      VALUES (
        ${String(topic.slug ?? "")},
        ${String(topic.name ?? "")},
        ${String(topic.description ?? "")},
        ${topic.order === undefined || topic.order === null ? null : Number(topic.order)}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order`;
  }

  await sql`INSERT INTO home_settings (singleton, source, post_ids)
    VALUES (
      true,
      ${home.source === "selected" ? "selected" : "latest"},
      ${JSON.stringify(Array.isArray(home.postIds) ? home.postIds : [])}::jsonb
    )
    ON CONFLICT (singleton) DO UPDATE SET
      source = EXCLUDED.source,
      post_ids = EXCLUDED.post_ids`;

  for (const subscriber of subscribers) {
    const token = subscriber.unsubscribeToken
      ? String(subscriber.unsubscribeToken)
      : crypto.randomUUID();
    await sql`INSERT INTO subscribers (id, email, created_at, unsubscribe_token, unsubscribed_at)
      VALUES (
        ${String(subscriber.id ?? crypto.randomUUID())},
        ${String(subscriber.email ?? "").trim().toLowerCase()},
        ${String(subscriber.createdAt ?? new Date().toISOString())},
        ${token},
        ${subscriber.unsubscribedAt ? String(subscriber.unsubscribedAt) : null}
      )
      ON CONFLICT (email) DO UPDATE SET
        created_at = EXCLUDED.created_at,
        unsubscribe_token = EXCLUDED.unsubscribe_token,
        unsubscribed_at = EXCLUDED.unsubscribed_at`;
  }

  for (const entry of outbox) {
    await sql`INSERT INTO email_outbox (id, recipient, subject, kind, status, error, created_at)
      VALUES (
        ${String(entry.id ?? crypto.randomUUID())},
        ${String(entry.to ?? "")},
        ${String(entry.subject ?? "")},
        ${String(entry.kind ?? "digest")},
        ${String(entry.status ?? "logged")},
        ${entry.error ? String(entry.error) : null},
        ${String(entry.createdAt ?? new Date().toISOString())}
      )
      ON CONFLICT (id) DO UPDATE SET
        recipient = EXCLUDED.recipient,
        subject = EXCLUDED.subject,
        kind = EXCLUDED.kind,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        created_at = EXCLUDED.created_at`;
  }

  for (const issue of issues) {
    await sql`INSERT INTO issues (
        id, volume, number, month, year, cover_image, editor_letter, editor_name,
        cover_description, full_issue_pdf, status, upcoming_articles
      ) VALUES (
        ${String(issue.id)},
        ${Number(issue.volume)},
        ${Number(issue.number)},
        ${Number(issue.month)},
        ${Number(issue.year)},
        ${rewriteMedia(issue.coverImage ? String(issue.coverImage) : null, media)},
        ${String(issue.editorLetter ?? "")},
        ${String(issue.editorName ?? "The Abyss")},
        ${String(issue.coverDescription ?? "")},
        ${rewriteMedia(issue.fullIssuePdf ? String(issue.fullIssuePdf) : null, media)},
        ${String(issue.status ?? "draft")},
        ${JSON.stringify(Array.isArray(issue.upcomingArticles) ? issue.upcomingArticles : [])}::jsonb
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
  }

  for (const post of posts) {
    const id = String(post.id);
    const body = rewriteMedia((await privateText(`tjay/content/${id}.md`)) ?? "", media) ?? "";
    const publishedAt = post.publishedAt ? String(post.publishedAt) : null;
    const createdAt = String(post.createdAt ?? publishedAt ?? new Date().toISOString());
    const updatedAt = String(post.updatedAt ?? createdAt);

    await sql`INSERT INTO articles (
        id, slug, title, excerpt, body_markdown, cover_image, topic, tags, status, featured,
        author, published_at, updated_at, created_at, reading_time, seo_title, seo_description,
        issue_id, article_code, article_type, sequence, article_pdf, citation, at_a_glance,
        abstract, references_json, evidence_ladder
      ) VALUES (
        ${id},
        ${String(post.slug ?? "")},
        ${String(post.title ?? "")},
        ${String(post.excerpt ?? "")},
        ${body},
        ${rewriteMedia(post.coverImage ? String(post.coverImage) : null, media)},
        ${String(post.topic ?? "")},
        ${JSON.stringify(Array.isArray(post.tags) ? post.tags : [])}::jsonb,
        ${String(post.status ?? "draft")},
        ${Boolean(post.featured)},
        ${String(post.author ?? "The Abyss")},
        ${publishedAt},
        ${updatedAt},
        ${createdAt},
        ${Number(post.readingTime ?? 1)},
        ${post.seoTitle ? String(post.seoTitle) : null},
        ${post.seoDescription ? String(post.seoDescription) : null},
        ${post.issueId === undefined || post.issueId === null ? null : String(post.issueId)},
        ${post.articleCode ? String(post.articleCode) : null},
        ${post.articleType ? String(post.articleType) : null},
        ${post.sequence === undefined || post.sequence === null ? null : Number(post.sequence)},
        ${rewriteMedia(post.articlePdf ? String(post.articlePdf) : null, media)},
        ${post.citation ? String(post.citation) : null},
        ${JSON.stringify(post.atAGlance ?? null)}::jsonb,
        ${JSON.stringify(post.abstract ?? null)}::jsonb,
        ${JSON.stringify(post.references ?? null)}::jsonb,
        ${JSON.stringify(post.evidenceLadder ?? null)}::jsonb
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
        created_at = EXCLUDED.created_at,
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
    console.log(`[ARTICLE] ${post.slug}`);
  }

  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM articles) AS articles,
      (SELECT count(*)::int FROM issues) AS issues,
      (SELECT count(*)::int FROM topics) AS topics,
      (SELECT count(*)::int FROM subscribers) AS subscribers,
      (SELECT count(*)::int FROM email_outbox) AS outbox`;
  console.log("Neon counts:", counts[0]);
  console.log("Migration complete. Keep DATA_BACKEND=blob until the counts and live preview are verified.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
