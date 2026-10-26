import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminCommentStats, listAdminComments } from "@/lib/admin-comments";
import { formatDate } from "@/lib/site";
import { getDashboardStats, listIssueMeta, listTopics, listOutboundMail } from "@/lib/store";
import { mailHealth } from "@/lib/mail";

export default async function AdminHomePage() {
  const [stats, topics, issues, commentStats, recentComments, outbox] = await Promise.all([
    getDashboardStats(),
    listTopics(),
    listIssueMeta(),
    getAdminCommentStats(),
    listAdminComments(5),
    listOutboundMail(),
  ]);
  const topicNames = Object.fromEntries(
    topics.map((topic) => [topic.slug, topic.name]),
  );
  const backend = process.env.DATA_BACKEND === "neon" ? "Neon PostgreSQL" : "Vercel Blob";
  const mail = mailHealth();
  const mailFailures = outbox.filter((item) => item.status === "failed").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl">Overview</h1>
            <Badge variant="outline">{backend}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft, publish, moderate discussion, and keep the journal record clean.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Published" value={stats.published} />
        <Stat label="Drafts" value={stats.drafts} />
        <Stat label="Subscribers" value={stats.subscribers} />
        <Stat
          label="Published issues"
          value={issues.filter((issue) => issue.status === "published").length}
        />
        <Stat label="Comments" value={commentStats.total} />
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
                      variant={post.status === "published" ? "default" : "secondary"}
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl">System</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Connected
            </span>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium">{backend}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Newsletter delivery</dt>
              <dd className="font-medium">{mail.provider}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">EmailJS templates</dt>
              <dd className="font-medium">{mail.emailJsReady ? "Ready" : "Not configured"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Mail failures (recent)</dt>
              <dd className="font-medium">{mailFailures}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Discussion</dt>
              <dd className="font-medium">Shared Neon comments</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Visible comments</dt>
              <dd className="font-medium">{commentStats.published}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Hidden comments</dt>
              <dd className="font-medium">{commentStats.hidden}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/admin/comments">Moderate comments</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/issues">Manage issues</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/subscribers">Newsletter health</Link>
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-xl">Recent discussion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest reader comments stored in Neon.
            </p>
          </div>
          <Link
            href="/admin/comments"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Moderate all
          </Link>
        </div>
        {recentComments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul>
            {recentComments.map((comment) => (
              <li
                key={comment.id}
                className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[140px_minmax(0,1fr)_180px_100px] md:items-start"
              >
                <span className="font-medium">{comment.name}</span>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {comment.body}
                </p>
                <Link
                  href={`/articles/${comment.articleSlug}#comments`}
                  className="truncate text-sm hover:text-brand hover:underline"
                >
                  {comment.articleTitle}
                </Link>
                <div className="flex items-center justify-between gap-2 md:block md:text-right">
                  <Badge variant={comment.status === "published" ? "default" : "secondary"}>
                    {comment.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
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
