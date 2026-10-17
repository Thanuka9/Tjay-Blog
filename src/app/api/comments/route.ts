import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

const createCommentSchema = z.object({
  articleId: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(4000),
  website: z.string().max(300).optional().default(""),
});

type CommentRow = {
  id: string;
  article_id: string;
  name: string;
  body: string;
  created_at: string;
};

function toComment(row: CommentRow) {
  return {
    id: row.id,
    articleId: row.article_id,
    name: row.name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const articleId = new URL(request.url).searchParams.get("articleId")?.trim() || "";
  if (!articleId || articleId.length > 200) {
    return NextResponse.json({ error: "Missing article." }, { status: 400 });
  }

  const sql = db();
  const rows = (await sql`
    SELECT id, article_id, name, body, created_at
    FROM comments
    WHERE article_id = ${articleId} AND status = 'published'
    ORDER BY created_at ASC, id ASC
  `) as CommentRow[];

  return NextResponse.json(
    { comments: rows.map(toComment) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid comment." },
      { status: 400 },
    );
  }

  // Honeypot for basic bot submissions. Return success without storing anything.
  if (parsed.data.website.trim()) {
    return NextResponse.json({ ok: true, comment: null });
  }

  const sql = db();
  const article = await sql`
    SELECT id
    FROM articles
    WHERE id = ${parsed.data.articleId}
      AND status = 'published'
      AND published_at IS NOT NULL
    LIMIT 1
  `;
  if (!article[0]) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const id = `c_${nanoid(18)}`;
  const rows = (await sql`
    INSERT INTO comments (id, article_id, name, body, status)
    VALUES (
      ${id},
      ${parsed.data.articleId},
      ${parsed.data.name},
      ${parsed.data.body},
      'published'
    )
    RETURNING id, article_id, name, body, created_at
  `) as CommentRow[];

  return NextResponse.json(
    { ok: true, comment: rows[0] ? toComment(rows[0]) : null },
    { status: 201 },
  );
}
