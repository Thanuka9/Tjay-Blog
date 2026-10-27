import {
  getPost,
  listTopics,
  listIssueMeta,
  listPublishedIssues,
} from "@/lib/store";
import { articleIssueId } from "@/lib/issues";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";

export const maxDuration = 300;

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, topics, issues, publishedIssues] = await Promise.all([
    getPost(id),
    listTopics(),
    listIssueMeta(),
    listPublishedIssues(),
  ]);
  if (!post) notFound();
  const journalPost = publishedIssues
    .flatMap((issue) => issue.posts)
    .find((item) => item.id === post.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Edit post</h1>
        <p className="text-sm text-muted-foreground">{post.title}</p>
      </div>
      <PostEditor
        key={post.id}
        topics={topics}
        issues={issues}
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage,
          topic: post.topic,
          tags: post.tags,
          author: post.author,
          status: post.status,
          featured: post.featured,
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          issueId: articleIssueId(post),
          articleCode: post.articleCode || journalPost?.articleCode,
          articleType:
            post.articleType ||
            (journalPost?.articleType as typeof post.articleType),
          sequence: post.sequence || journalPost?.sequence,
          articlePdf: post.articlePdf,
          citation: post.citation,
          atAGlance: post.atAGlance,
          abstract: post.abstract,
          references: post.references,
          evidenceLadder: post.evidenceLadder,
        }}
      />
    </div>
  );
}
