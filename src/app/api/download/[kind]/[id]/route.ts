import { journalIssues } from "@/lib/issues";
import { journalPdf } from "@/lib/journal-pdf";
import { getPostBySlug, listPublishedPosts } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!["article", "issue", "contents"].includes(kind)) return new Response("Not found", { status: 404 });
  let pdf: Buffer;
  if (kind === "article") {
    const post = await getPostBySlug(id);
    if (!post || post.status !== "published" || !post.publishedAt) return new Response("Not found", { status: 404 });
    pdf = await journalPdf([post]);
  } else {
    const issues = journalIssues(await listPublishedPosts());
    const issue = id === "current" ? issues[0] : issues.find(item => item.id === id);
    if (!issue) return new Response("Not found", { status: 404 });
    pdf = await journalPdf(issue.posts, issue, kind === "contents");
  }
  const filename = `the-abyss-${kind}-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
