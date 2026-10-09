import Link from "next/link";
import { Kicker } from "@/components/site/layout";
import { formatDate } from "@/lib/site";
import type { JournalIssue } from "@/lib/issues";

export function IssueContents({ issue, compact = false }: { issue: JournalIssue; compact?: boolean }) {
  return (
    <div className={compact ? "issue-contents-compact" : "issue-contents-table"}>
      {issue.posts.map((post) => (
        <article key={post.id} className="journal-entry">
          <div className="journal-entry-body">
            <Kicker>{post.articleType}</Kicker>
            <h3><Link href={`/articles/${post.slug}`}>{post.title}</Link></h3>
            {compact && <p className="journal-entry-excerpt">{post.excerpt}</p>}
            {!compact && <div className="journal-entry-actions">
              <Link href={`/articles/${post.slug}`}>Read article &rarr;</Link>
              <a href={`/articles/${post.slug}/download`} download>PDF &darr;</a>
            </div>}
          </div>
          <p className="journal-entry-meta">{post.articleCode}{compact ? " · Published " : <br />}{formatDate(post.publishedAt)}</p>
        </article>
      ))}
    </div>
  );
}
