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
    return { ok: false as const, message: "Invalid comment moderation request." };
  }

  try {
    const slug = await articleSlugForComment(id);
    if (!slug) return { ok: false as const, message: "Comment not found." };
    const sql = db();
    await sql`UPDATE comments SET status = ${status} WHERE id = ${id}`;
    revalidateCommentViews(slug);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not update comment.",
    };
  }
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false as const, message: "Missing comment." };

  try {
    const slug = await articleSlugForComment(id);
    if (!slug) return { ok: false as const, message: "Comment not found." };
    const sql = db();
    await sql`DELETE FROM comments WHERE id = ${id}`;
    revalidateCommentViews(slug);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not delete comment.",
    };
  }
}
