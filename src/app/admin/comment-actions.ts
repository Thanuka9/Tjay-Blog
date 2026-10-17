"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/neon-db";

async function articleSlugForComment(id: string) {
  const sql = db();
  const rows = (await sql`
    SELECT a.slug
    FROM comments c
    JOIN articles a ON a.id = c.article_id
    WHERE c.id = ${id}
    LIMIT 1
  `) as Array<{ slug: string }>;
  return rows[0]?.slug || null;
}

function revalidateCommentViews(slug: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/comments");
  if (slug) revalidatePath(`/articles/${slug}`);
}

export async function setCommentStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "published" && status !== "hidden")) {
    throw new Error("Invalid comment moderation request.");
  }

  const slug = await articleSlugForComment(id);
  if (!slug) throw new Error("Comment not found.");
  const sql = db();
  await sql`UPDATE comments SET status = ${status} WHERE id = ${id}`;
  revalidateCommentViews(slug);
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing comment.");

  const slug = await articleSlugForComment(id);
  if (!slug) throw new Error("Comment not found.");
  const sql = db();
  await sql`DELETE FROM comments WHERE id = ${id}`;
  revalidateCommentViews(slug);
}
