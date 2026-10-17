import "server-only";

import { db } from "@/lib/neon-db";

export type AdminComment = {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  name: string;
  body: string;
  status: "published" | "hidden";
  createdAt: string;
};

export type AdminCommentStats = {
  total: number;
  published: number;
  hidden: number;
};

type CommentRow = {
  id: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  name: string;
  body: string;
  status: "published" | "hidden";
  created_at: string;
};

function fromRow(row: CommentRow): AdminComment {
  return {
    id: row.id,
    articleId: row.article_id,
    articleTitle: row.article_title,
    articleSlug: row.article_slug,
    name: row.name,
    body: row.body,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listAdminComments(limit = 100): Promise<AdminComment[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const sql = db();
  const rows = (await sql`
    SELECT
      c.id,
      c.article_id,
      a.title AS article_title,
      a.slug AS article_slug,
      c.name,
      c.body,
      c.status,
      c.created_at
    FROM comments c
    JOIN articles a ON a.id = c.article_id
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ${safeLimit}
  `) as CommentRow[];
  return rows.map(fromRow);
}

export async function getAdminCommentStats(): Promise<AdminCommentStats> {
  const sql = db();
  const rows = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'published')::int AS published,
      COUNT(*) FILTER (WHERE status = 'hidden')::int AS hidden
    FROM comments
  `) as Array<{ total: number | string; published: number | string; hidden: number | string }>;
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    hidden: Number(row?.hidden ?? 0),
  };
}
