import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/site";
import { getDashboardStats, listTopics, listIssueMeta } from "@/lib/store";

export default async function AdminHomePage() {
  const [stats, topics, issues] = await Promise.all([
    getDashboardStats(),
    listTopics(),
    listIssueMeta(),
  ]);
  const topicNames = Object.fromEntries(
    topics.map((topic) => [topic.slug, topic.name]),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft, publish, and keep the record clean.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Published" value={stats.published} />
        <Stat label="Drafts" value={stats.drafts} />
        <Stat label="Subscribers" value={stats.subscribers} />
        <Stat
          label="Published issues"
          value={issues.filter((issue) => issue.status === "published").length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-border xl:col-span-8">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-serif text-xl">Recent posts</h2>
            <Link
              href="/admin/posts"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              All posts
            </Link>
          </div>
          <ul>
            {stats.recent.length === 0 ? (
              <li className="px-5 py-8 text-sm text-muted-foreground">
                No posts yet.
              </li>
            ) : (
              stats.recent.map((post) => (
                <li
                  key={post.id}
                  className="grid grid-cols-12 items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
                >
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="col-span-6 truncate font-medium hover:text-brand sm:col-span-5"
                  >
                    {post.title || "Untitled"}
                  </Link>
                  <span className="col-span-3 hidden text-sm text-muted-foreground sm:block">
                    {topicNames[post.topic] ?? post.topic}
                  </span>
                  <span className="col-span-3 sm:col-span-2">
                    <Badge
                      variant={
                        post.status === "published" ? "default" : "secondary"
                      }
                    >
                      {post.status}
                    </Badge>
                  </span>
                  <span className="col-span-3 text-right text-sm text-muted-foreground sm:col-span-2">
                    {formatDate(post.updatedAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border p-5 xl:col-span-4">
          <h2 className="font-serif text-xl">Journal issues</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Arrange articles, add a cover and editor’s letter, and publish the
            next monthly issue. The latest published issue leads the homepage.
          </p>
          <Button asChild size="sm" className="mt-6">
            <Link href="/admin/issues">Manage issues</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
    </div>
  );
}
