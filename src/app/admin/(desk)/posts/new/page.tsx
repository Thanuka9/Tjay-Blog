import { PostEditor } from "@/components/admin/PostEditor";
import { listTopics, listIssueMeta } from "@/lib/store";

export default async function NewPostPage() {
  const [topics, issues] = await Promise.all([listTopics(), listIssueMeta()]);
  const defaultTopic = topics[0]?.slug ?? "longevity";
  const id = crypto.randomUUID();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">New post</h1>
        <p className="text-sm text-muted-foreground">
          Write in Markdown. Add as many body images as you need from the
          toolbar, or drop them into the editor.
        </p>
      </div>
      <PostEditor
        key={id}
        topics={topics}
        issues={issues}
        post={{
          id,
          title: "",
          slug: "",
          excerpt: "",
          content: "",
          coverImage: null,
          topic: defaultTopic,
          tags: [],
          author: "The Abyss",
          status: "draft",
          featured: false,
          seoTitle: "",
          seoDescription: "",
        }}
      />
    </div>
  );
}
