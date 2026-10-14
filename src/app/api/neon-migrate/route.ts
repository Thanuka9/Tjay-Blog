import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATA_API = "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";

function privateToken() {
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_PRIVATE_READ_WRITE_TOKEN is missing.");
  return token;
}

async function readText(pathname: string) {
  const result = await get(pathname, {
    access: "private",
    token: privateToken(),
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).text();
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  const text = await readText(pathname);
  return text ? (JSON.parse(text) as T) : fallback;
}

async function upsert(table: string, rows: Record<string, unknown>[], conflict: string) {
  if (!rows.length) return;
  const response = await fetch(`${DATA_API}/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${table} migration failed (${response.status}): ${detail.slice(0, 400)}`);
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Migration route is preview-only." }, { status: 404 });
  }

  try {
    const [posts, issues, topics, home, subscribers, outbox] = await Promise.all([
      readJson<any[]>("tjay/state/posts.json", []),
      readJson<any[]>("tjay/state/issues.json", []),
      readJson<any[]>("tjay/state/topics.json", []),
      readJson<any>("tjay/state/home.json", { source: "latest", postIds: [] }),
      readJson<any[]>("tjay/state/subscribers.json", []),
      readJson<any[]>("tjay/state/outbox.json", []),
    ]);

    const articleRows: Record<string, unknown>[] = [];
    for (const post of posts) {
      const body = (await readText(`tjay/content/${post.id}.md`)) ?? "";
      articleRows.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        body_markdown: body,
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

    const issueRows = issues.map((issue) => ({
      id: issue.id,
      volume: issue.volume,
      number: issue.number,
      month: issue.month,
      year: issue.year,
      cover_image: issue.coverImage ?? null,
      editor_letter: issue.editorLetter ?? "",
      editor_name: issue.editorName,
      cover_description: issue.coverDescription ?? "",
      full_issue_pdf: issue.fullIssuePdf ?? null,
      status: issue.status,
      upcoming_articles: issue.upcomingArticles ?? [],
    }));

    const topicRows = topics.map((topic) => ({
      slug: topic.slug,
      name: topic.name,
      description: topic.description ?? "",
      sort_order: topic.order ?? null,
    }));

    const subscriberRows = subscribers.map((sub) => ({
      id: sub.id,
      email: String(sub.email).trim().toLowerCase(),
      created_at: sub.createdAt,
      unsubscribe_token: sub.unsubscribeToken || crypto.randomUUID(),
      unsubscribed_at: sub.unsubscribedAt ?? null,
    }));

    const outboxRows = outbox.map((entry) => ({
      id: entry.id,
      recipient: entry.to,
      subject: entry.subject,
      kind: entry.kind,
      status: entry.status,
      error: entry.error ?? null,
      created_at: entry.createdAt,
    }));

    await upsert("articles", articleRows, "id");
    await upsert("issues", issueRows, "id");
    await upsert("topics", topicRows, "slug");
    await upsert("home_settings", [{
      singleton: true,
      source: home?.source === "selected" ? "selected" : "latest",
      post_ids: Array.isArray(home?.postIds) ? home.postIds : [],
    }], "singleton");
    await upsert("subscribers", subscriberRows, "id");
    await upsert("email_outbox", outboxRows, "id");

    return NextResponse.json({
      ok: true,
      migrated: {
        articles: articleRows.length,
        issues: issueRows.length,
        topics: topicRows.length,
        subscribers: subscriberRows.length,
        outbox: outboxRows.length,
        home: 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed." },
      { status: 500 },
    );
  }
}
