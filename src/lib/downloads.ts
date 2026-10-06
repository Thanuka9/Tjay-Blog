import {
  getPostBySlug,
  getPublishedIssue,
  listPublishedIssues,
} from "@/lib/store";
import { journalPdf } from "@/lib/journal-pdf";
import { slugify } from "@/lib/site";
function externalPdf(url: string) {
  try {
    if (new URL(url).protocol === "https:") return Response.redirect(url, 307);
  } catch {}
  return new Response("Invalid PDF address", { status: 400 });
}
export async function downloadResponse(kind: string, id: string) {
  if (!["article", "issue", "contents"].includes(kind))
    return new Response("Not found", { status: 404 });
  let pdf: Buffer, filename: string;
  if (kind === "article") {
    const original = await getPostBySlug(id);
    if (!original || original.status !== "published" || !original.publishedAt)
      return new Response("Not found", { status: 404 });
    if (original.articlePdf) return externalPdf(original.articlePdf);
    const issues = await listPublishedIssues();
    const issue = issues.find((issue) =>
      issue.posts.some((post) => post.id === original.id),
    );
    const post =
      issue?.posts.find((post) => post.id === original.id) || original;
    pdf = await journalPdf([post], issue || undefined, false, true);
    // An individual article has its issue context, without the issue front matter.
    filename = `${post.articleCode || "The-Abyss"}-${slugify(post.title)}.pdf`;
  } else {
    const issue = await getPublishedIssue(id);
    if (!issue) return new Response("Not found", { status: 404 });
    if (kind === "issue" && issue.fullIssuePdf)
      return externalPdf(issue.fullIssuePdf);
    pdf = await journalPdf(issue.posts, issue, kind === "contents");
    filename = `The-Abyss-Vol-${issue.volume}-No-${issue.number}-${issue.label.replace(/ /g, "-")}${kind === "contents" ? "-Contents" : ""}.pdf`;
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g, "-")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
