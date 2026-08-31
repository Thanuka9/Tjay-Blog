import { getHomeSlides, getPost, listTopics } from "@/lib/store";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, topics, slides] = await Promise.all([
    getPost(id),
    listTopics(),
    getHomeSlides(),
  ]);
  if (!post) notFound();
  const slideshowIndex = slides.findIndex((slide) => slide.id === post.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Edit post</h1>
        <p className="text-sm text-muted-foreground">{post.title}</p>
      </div>
      <PostEditor
        topics={topics}
        slideshowSlot={slideshowIndex >= 0 ? slideshowIndex + 1 : null}
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
        }}
      />
    </div>
  );
}
