import { get, list } from "@vercel/blob";

const DATA_API = "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";
const privateToken = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim();
const publicToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN?.trim();

if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_GIT_COMMIT_REF !== "neon-migration") {
  console.log("[NEON MIGRATION] skipped outside neon-migration preview");
  process.exit(0);
}
if (!privateToken || !publicToken) throw new Error("Blob migration credentials are missing.");

async function readText(pathname) {
  try {
    const result = await get(pathname, { access: "private", token: privateToken, useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  } catch {
    return null;
  }
}
async function readJson(pathname, fallback) {
  const text = await readText(pathname);
  return text ? JSON.parse(text) : fallback;
}
async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  const response = await fetch(`${DATA_API}/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${(await response.text()).slice(0, 500)}`);
}
async function listAll(token, prefix) {
  const rows = [];
  let cursor;
  do {
    const page = await list({ token, prefix, cursor, limit: 1000 });
    rows.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return rows;
}

console.log("[NEON MIGRATION] reading live Vercel Blob state");
const [posts, issues, topics, home, subscribers, outbox, media] = await Promise.all([
  readJson("tjay/state/posts.json", []),
  readJson("tjay/state/issues.json", []),
  readJson("tjay/state/topics.json", []),
  readJson("tjay/state/home.json", { source: "latest", postIds: [] }),
  readJson("tjay/state/subscribers.json", []),
  readJson("tjay/state/outbox.json", []),
  listAll(publicToken, "tjay/uploads/"),
]);

const articles = [];
for (const post of posts) {
  const body = (await readText(`tjay/content/${post.id}.md`)) ?? "";
  articles.push({
    id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt ?? "",
    body_markdown: body, cover_image: post.coverImage ?? null, topic: post.topic ?? "",
    tags: post.tags ?? [], status: post.status, featured: Boolean(post.featured), author: post.author,
    published_at: post.publishedAt ?? null, updated_at: post.updatedAt, created_at: post.createdAt,
    reading_time: Number(post.readingTime ?? 1), seo_title: post.seoTitle ?? null,
    seo_description: post.seoDescription ?? null, issue_id: post.issueId ?? null,
    article_code: post.articleCode ?? null, article_type: post.articleType ?? null,
    sequence: post.sequence ?? null, article_pdf: post.articlePdf ?? null, citation: post.citation ?? null,
    at_a_glance: post.atAGlance ?? null, abstract: post.abstract ?? null,
    references_json: post.references ?? null, evidence_ladder: post.evidenceLadder ?? null,
  });
}
const issueRows = issues.map((x) => ({
  id: x.id, volume: x.volume, number: x.number, month: x.month, year: x.year,
  cover_image: x.coverImage ?? null, editor_letter: x.editorLetter ?? "", editor_name: x.editorName,
  cover_description: x.coverDescription ?? "", full_issue_pdf: x.fullIssuePdf ?? null,
  status: x.status, upcoming_articles: x.upcomingArticles ?? [],
}));
const topicRows = topics.map((x) => ({ slug: x.slug, name: x.name, description: x.description ?? "", sort_order: x.order ?? null }));
const subscriberRows = subscribers.map((x) => ({
  id: x.id, email: String(x.email).trim().toLowerCase(), created_at: x.createdAt,
  unsubscribe_token: x.unsubscribeToken || crypto.randomUUID(), unsubscribed_at: x.unsubscribedAt ?? null,
}));
const outboxRows = outbox.map((x) => ({
  id: x.id, recipient: x.to, subject: x.subject, kind: x.kind, status: x.status,
  error: x.error ?? null, created_at: x.createdAt,
}));
const mediaRows = media.map((x) => ({
  source_url: x.url,
  source_path: x.pathname,
  target_key: x.pathname.replace(/^tjay\/uploads\//, ""),
  target_url: null,
  size_bytes: x.size ?? null,
  uploaded_at: x.uploadedAt ?? null,
  migrated_at: null,
}));

await upsert("articles", articles, "id");
await upsert("issues", issueRows, "id");
await upsert("topics", topicRows, "slug");
await upsert("home_settings", [{ singleton: true, source: home?.source === "selected" ? "selected" : "latest", post_ids: Array.isArray(home?.postIds) ? home.postIds : [] }], "singleton");
await upsert("subscribers", subscriberRows, "id");
await upsert("email_outbox", outboxRows, "id");
await upsert("media_assets", mediaRows, "source_url");

console.log(`[NEON MIGRATION] COMPLETE articles=${articles.length} issues=${issueRows.length} topics=${topicRows.length} subscribers=${subscriberRows.length} outbox=${outboxRows.length} media=${mediaRows.length}`);
