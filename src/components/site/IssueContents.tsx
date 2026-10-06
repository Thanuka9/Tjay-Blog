import Link from "next/link";
import { Kicker } from "@/components/site/layout";
import { formatDate } from "@/lib/site";
import type { JournalIssue } from "@/lib/issues";
export function IssueContents({
  issue,
  compact = false,
}: {
  issue: JournalIssue;
  compact?: boolean;
}) {
  return (
    <div>
      {issue.posts.map((post) => (
        <article key={post.id} className="journal-entry">
          <Kicker>{post.articleType}</Kicker>
          <h3>
            <Link href={`/articles/${post.slug}`}>{post.title}</Link>
          </h3>
          {compact ? <p>{post.excerpt}</p> : <p>{post.author}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <small>
              {post.articleCode} · Published {formatDate(post.publishedAt)}
            </small>
            <div className="flex gap-4 text-xs font-semibold">
              <Link href={`/articles/${post.slug}`}>Read article →</Link>
              <a href={`/articles/${post.slug}/download`} download>
                ↓ PDF
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
