import { NextResponse } from "next/server";
import { GET as getComments, POST as postComment } from "@/app/api/comments/route";
import { db } from "@/lib/neon-db";
import { deletePost, deleteTopic, getPost, getTopic, savePost, saveTopic } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const qaTopic = "qa-crud-smoke";
  const qaPostId = "qa_crud_smoke";
  let qaCommentId = "";

  try {
    if (process.env.DATA_BACKEND !== "neon") {
      throw new Error("Production DATA_BACKEND is not neon");
    }

    await saveTopic({
      slug: qaTopic,
      name: "QA CRUD Smoke",
      description: "Temporary Neon CRUD verification topic.",
    });
    if (!(await getTopic(qaTopic))) throw new Error("Topic create/read failed");

    await savePost({
      id: qaPostId,
      slug: "qa-crud-smoke",
      title: "QA CRUD Smoke Article",
      excerpt: "Temporary article used only to verify Neon CRUD operations safely.",
      content: "Temporary QA content used to verify create, read, update and delete operations against Neon.",
      coverImage: null,
      topic: qaTopic,
      tags: ["qa"],
      status: "draft",
      featured: false,
      author: "The Abyss QA",
      seoTitle: "QA CRUD Smoke Article",
      seoDescription: "Temporary QA article.",
      issueId: null,
      articlePdf: null,
    });

    let post = await getPost(qaPostId);
    if (!post || post.title !== "QA CRUD Smoke Article") {
      throw new Error("Post create/read failed");
    }

    await savePost({ ...post, title: "QA CRUD Smoke Article Updated" });
    post = await getPost(qaPostId);
    if (!post || post.title !== "QA CRUD Smoke Article Updated") {
      throw new Error("Post update failed");
    }

    const sql = db();
    const published = (await sql`
      SELECT id FROM articles
      WHERE status = 'published' AND published_at IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 1
    `) as Array<{ id: string }>;
    const articleId = published[0]?.id;
    if (!articleId) throw new Error("No published article available for comment test");

    const createResponse = await postComment(
      new Request("https://theabyssos.com/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          articleId,
          name: "The Abyss QA",
          body: "Temporary shared-comment smoke test. Removed immediately.",
          website: "",
        }),
      }),
    );
    const created = (await createResponse.json()) as {
      ok?: boolean;
      comment?: { id?: string } | null;
      error?: string;
    };
    qaCommentId = created.comment?.id || "";
    if (!createResponse.ok || !created.ok || !qaCommentId) {
      throw new Error(`Comment create failed: ${created.error || createResponse.status}`);
    }

    const listResponse = await getComments(
      new Request(`https://theabyssos.com/api/comments?articleId=${encodeURIComponent(articleId)}`),
    );
    const listed = (await listResponse.json()) as { comments?: Array<{ id: string }> };
    if (!listResponse.ok || !listed.comments?.some((comment) => comment.id === qaCommentId)) {
      throw new Error("Comment shared read failed");
    }

    await sql`DELETE FROM comments WHERE id = ${qaCommentId}`;
    qaCommentId = "";

    await deletePost(qaPostId);
    if (await getPost(qaPostId)) throw new Error("Post delete failed");
    await deleteTopic(qaTopic);
    if (await getTopic(qaTopic)) throw new Error("Topic delete failed");

    return NextResponse.json({
      ok: true,
      backend: "neon",
      adminCrud: {
        topicCreateReadDelete: "PASS",
        postCreateReadUpdateDelete: "PASS",
      },
      comments: {
        create: "PASS",
        sharedRead: "PASS",
        cleanup: "PASS",
      },
    });
  } catch (error) {
    try {
      const sql = db();
      if (qaCommentId) await sql`DELETE FROM comments WHERE id = ${qaCommentId}`;
      await deletePost(qaPostId).catch(() => undefined);
      await deleteTopic(qaTopic).catch(() => undefined);
    } catch {
      // Best-effort cleanup only.
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "QA smoke failed" },
      { status: 500 },
    );
  }
}
