import { get, list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATA_API = "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";

function privateToken() {
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Private Blob token is missing.");
  return token;
}
function publicToken() {
  const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Public Blob token is missing.");
  return token;
}
async function readText(pathname: string) {
  try {
    const result = await get(pathname, { access: "private", token: privateToken(), useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  } catch {
    return null;
  }
}
async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  const text = await readText(pathname);
  return text ? (JSON.parse(text) as T) : fallback;
}
async function listAll(token: string, prefix: string) {
  const rows: Awaited<ReturnType<typeof list>>["blobs"] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ token, prefix, cursor, limit: 1000 });
    rows.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return rows;
}
async function upsert(
  oidcToken: string,
  table: string,
  rows: Record<string, unknown>[],
  conflict: string,
) {
  if (!rows.length) return;
  const response = await fetch(`${DATA_API}/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${oidcToken}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${(await response.text()).slice(0, 300)}`);
}

export async function GET(request: Request) {
  const expected = process.env.MIGRATION_RUN_TOKEN;
  const supplied = new URL(request.url).searchParams.get("token");
  if (!expected || !supplied || supplied !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oidcToken =
    request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
  if (!oidcToken) {
    return NextResponse.json({ error: "Vercel OIDC token is unavailable." }, { status: 500 });
  }

  try {
    const [posts, issues, topics, home, subscribers, outbox, media] = await Promise.all([
      readJson<any[]>("tjay/state/posts.json", []),
      readJson<any[]>("tjay/state/issues.json", []),
      readJson<any[]>("tjay/state/topics.json", []),
      readJson<any>("tjay/state/home.json", { source: "latest", postIds: [] }),
      readJson<any[]>("tjay/state/subscribers.json", []),
      readJson<any[]>("tjay/state/outbox.json", []),
      listAll(publicToken(), "tjay/uploads/"),
    ]);

    const articleRows: Record<string, unknown>[] = [];
    for (const post of posts) {
      articleRows.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        body_markdown: (await readText(`tjay/content/${post.id}.md`)) ?? "",
        cover_image: post.coverImage ?? null,
        topic: post.topic ?? "",
        tags: post.tags ?? [],
        status: post.status,
        featured: Boolean(post.featured),
        author: post.author,
        published_at: post.publishedAt ?? null,
        updated_at: post.updatedAt,
        created_at: post.createdAt,
        reading_time: Number(post.readingTime ?? 1),
        seo_title: post.seoTitle ?? null,
        seo_description: post.seoDescription ?? null,
        issue_id: post.issueId ?? null,
        article_code: post.articleCode ?? null,
        article_type: post.articleType ?? null,
        sequence: post.sequence ?? null,
        article_pdf: post.articlePdf ?? null,
        citation: post.citation ?? null,
        at_a_glance: post.atAGlance ?? null,
        abstract: post.abstract ?? null,
        references_json: post.references ?? null,
        evidence_ladder: post.evidenceLadder ?? null,
      });
    }

    await upsert(oidcToken, "articles", articleRows, "id");
    await upsert(oidcToken, "issues", issues.map((x) => ({
      id: x.id, volume: x.volume, number: x.number, month: x.month, year: x.year,
      cover_image: x.coverImage ?? null, editor_letter: x.editorLetter ?? "", editor_name: x.editorName,
      cover_description: x.coverDescription ?? "", full_issue_pdf: x.fullIssuePdf ?? null,
      status: x.status, upcoming_articles: x.upcomingArticles ?? [],
    })), "id");
    await upsert(oidcToken, "topics", topics.map((x) => ({
      slug: x.slug, name: x.name, description: x.description ?? "", sort_order: x.order ?? null,
    })), "slug");
    await upsert(oidcToken, "home_settings", [{
      singleton: true,
      source: home?.source === "selected" ? "selected" : "latest",
      post_ids: Array.isArray(home?.postIds) ? home.postIds : [],
    }], "singleton");
    await upsert(oidcToken, "subscribers", subscribers.map((x) => ({
      id: x.id, email: String(x.email).trim().toLowerCase(), created_at: x.createdAt,
      unsubscribe_token: x.unsubscribeToken || crypto.randomUUID(), unsubscribed_at: x.unsubscribedAt ?? null,
    })), "id");
    await upsert(oidcToken, "email_outbox", outbox.map((x) => ({
      id: x.id, recipient: x.to, subject: x.subject, kind: x.kind, status: x.status,
      error: x.error ?? null, created_at: x.createdAt,
    })), "id");
    await upsert(oidcToken, "media_assets", media.map((x) => ({
      source_url: x.url,
      source_path: x.pathname,
      target_key: x.pathname.replace(/^tjay\/uploads\//, ""),
      target_url: null,
      size_bytes: x.size ?? null,
      uploaded_at: x.uploadedAt ?? null,
      migrated_at: null,
    })), "source_url");

    return NextResponse.json({ ok: true, migrated: {
      articles: articleRows.length,
      issues: issues.length,
      topics: topics.length,
      subscribers: subscribers.length,
      outbox: outbox.length,
      media: media.length,
      home: 1,
    }});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Migration failed" }, { status: 500 });
  }
}
