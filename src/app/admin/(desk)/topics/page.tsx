import { TopicManager } from "@/components/admin/TopicManager";
import { listPostMeta, listTopics } from "@/lib/store";

export default async function AdminTopicsPage() {
  const [topics, posts] = await Promise.all([listTopics(), listPostMeta()]);
  const counts = Object.fromEntries(
    topics.map((topic) => [
      topic.slug,
      posts.filter((post) => post.topic === topic.slug).length,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Topics</h1>
        <p className="text-sm text-muted-foreground">
          These are the index subjects on the public site. Add as many as you need.
        </p>
      </div>
      <TopicManager topics={topics} counts={counts} />
    </div>
  );
}
