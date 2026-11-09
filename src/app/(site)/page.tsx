import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { JournalNewsletter } from "@/components/site/JournalNewsletter";
import { issuePath } from "@/lib/issues";
import { formatDate, site } from "@/lib/site";
import { listPublishedIssues } from "@/lib/store";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const issues = await listPublishedIssues();
  const latestIssue = issues[0];

  // The original Article 01 remains the lead story, even after new issues appear.
  const featuredIssue = issues.find((issue) =>
    issue.posts.some((post) => post.articleCode === "AB-0101"),
  ) ?? latestIssue;
  const featuredArticle = featuredIssue?.posts.find((post) => post.articleCode === "AB-0101")
    ?? featuredIssue?.posts[0];

  // Match the reference's two-story editorial list, without falsely moving
  // articles between their independently published issues.
  const articles = featuredArticle && featuredIssue
    ? [
        { issue: featuredIssue, post: featuredArticle },
        ...issues
          .flatMap((issue) => issue.posts.map((post) => ({ issue, post })))
          .filter(({ post }) => post.id !== featuredArticle.id)
          .slice(0, 1),
      ]
    : [];

  const archiveIssues = [...issues].reverse();
  const nextIssues = latestIssue
    ? [1, 2].map((offset) => {
        const date = new Date(Date.UTC(latestIssue.year, latestIssue.month - 1 + offset, 1));
        return {
          label: new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(date),
          volume: latestIssue.volume,
          number: latestIssue.number + offset,
        };
      })
    : [];

  return (
    <>
      <Container className="home-editorial">
        <section className="journal-masthead">
          <h1><i>The</i> Abyss</h1>
          <p>{site.tagline}</p>
        </section>

        {featuredIssue && featuredArticle ? (
          <section className="current-issue" aria-labelledby="home-articles-heading">
            <div>
              <Link
                href={issuePath(featuredIssue)}
                aria-label={`View Volume ${featuredIssue.volume}, Number ${featuredIssue.number}, ${featuredIssue.label}`}
                className="block text-[var(--foreground)] hover:!text-[var(--foreground)]"
              >
                <IssueCover issue={featuredIssue} />
              </Link>
            </div>

            <div>
              <div className="current-issue-meta">
                <span className="issue-badge">Featured issue</span>
                <span>Vol. {featuredIssue.volume} | No. {featuredIssue.number} · {featuredIssue.label}</span>
                <span className="font-semibold text-[var(--brand)]">
                  {issues.length} published {issues.length === 1 ? "issue" : "issues"}
                </span>
              </div>

              <h2 id="home-articles-heading" className="issue-contents-heading">In the journal</h2>
              <div className="issue-contents-compact">
                {articles.map(({ issue, post }) => (
                  <article key={post.id} className="journal-entry">
                    <Kicker>{post.articleType || "Research article"}</Kicker>
                    <h3>
                      <Link href={`/articles/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <p className="journal-entry-excerpt">{post.excerpt}</p>
                    <p className="journal-entry-meta">
                      {post.articleCode} · Vol. {issue.volume}, No. {issue.number} · Published {formatDate(post.publishedAt)}
                    </p>
                  </article>
                ))}
              </div>

              <div className="issue-home-actions">
                <Link href={`/articles/${featuredArticle.slug}`}>Read Article 01 →</Link>
                <Link href={issuePath(featuredIssue)}>View the featured issue →</Link>
                <Link href="#archive">Explore all {issues.length} issues ↓</Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="py-16">
            <p>The next issue is on its way. Subscribe to hear when it is published.</p>
          </section>
        )}

        <section id="archive" className="journal-archive" aria-labelledby="home-archive-heading">
          <div className="archive-heading">
            <h2 id="home-archive-heading">
              {latestIssue ? `Volume ${latestIssue.volume} · ${archiveIssues[0]?.year}–${String(latestIssue.year + 1).slice(-2)}` : "The journal archive"}
            </h2>
            <Link href="/issues">Browse archive →</Link>
          </div>

          <div className="archive-grid">
            {archiveIssues.map((issue) => (
              <div key={issue.id} className="archive-item">
                <Link
                  href={issuePath(issue)}
                  className="block text-[var(--foreground)] hover:!text-[var(--foreground)]"
                  aria-label={`Read ${issue.label}, Volume ${issue.volume}, Number ${issue.number}`}
                >
                  <IssueCover issue={issue} variant="archive" current={issue.id === latestIssue?.id} />
                  <h3>{issue.label}</h3>
                </Link>
                <p>Vol. {issue.volume} | No. {issue.number}</p>
              </div>
            ))}

            {nextIssues.map((issue) => (
              <div key={issue.label} className="archive-item archive-upcoming">
                <div className="upcoming-cover" aria-label={`${issue.label} upcoming`}>Upcoming</div>
                <h3>{issue.label}</h3>
                <p>Vol. {issue.volume} | No. {issue.number}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>
      <JournalNewsletter />
    </>
  );
}
