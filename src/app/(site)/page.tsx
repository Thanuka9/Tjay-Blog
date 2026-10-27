import Link from "next/link";
import { Container } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { IssueContents } from "@/components/site/IssueContents";
import { JournalNewsletter } from "@/components/site/JournalNewsletter";
import { issueLabel, issuePath } from "@/lib/issues";
import { site } from "@/lib/site";
import { listPublishedIssues } from "@/lib/store";

export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const issues = await listPublishedIssues();
  const current = issues[0];
  const today = new Date();
  const previewStart = current
    ? Math.max(Date.UTC(current.year, current.month - 1, 1), Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    : 0;
  const upcoming = current ? [1, 2, 3].map((offset) => {
    const date = new Date(previewStart);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  }) : [];
  return (
    <>
      <Container className="home-editorial">
        <section className="journal-masthead">
          <h1><i>The</i> Abyss</h1>
          <p>{site.tagline}</p>
        </section>
        {current ? (
          <section className="current-issue" aria-labelledby="home-current-issue-title">
            <div><Link href={issuePath(current)} aria-label={`Read ${current.label}`}><IssueCover issue={current} /></Link></div>
            <div>
              <div className="current-issue-meta">
                <span className="issue-badge">Current issue</span>
                <span>Vol. {current.volume} | No. {current.number} &middot; {current.label}</span>
              </div>
              <h2 id="home-current-issue-title" className="issue-contents-heading">In this issue</h2>
              <IssueContents issue={current} compact />
              <div className="issue-home-actions">
                <Link href={issuePath(current)}>View the full issue &rarr;</Link>
                <a className="journal-download" href={`${issuePath(current)}/download`} download>Download journal PDF &darr;</a>
              </div>
            </div>
          </section>
        ) : <p className="py-16">The first issue is on its way. Subscribe to hear when it is published.</p>}
        <section id="archive" className="journal-archive" aria-labelledby="home-archive-heading">
          <div className="archive-heading">
            <h2 id="home-archive-heading">{current ? `Volume ${current.volume} · ${current.year}–${String(current.year + 1).slice(-2)}` : "Archive"}</h2>
            <Link href="/issues">All issues &rarr;</Link>
          </div>
          <div className="archive-grid">
            {issues.slice(0, 4).map((issue) => (
              <Link key={issue.id} href={issuePath(issue)} className="archive-item">
                <IssueCover issue={issue} variant="archive" current={issue.id === current?.id} />
                <h3>{issue.label}</h3>
                <p>Vol. {issue.volume} | No. {issue.number}</p>
              </Link>
            ))}
            {issues.length === 1 && upcoming.map((month, index) => <div key={`${month.year}-${month.month}`} className="archive-item archive-upcoming">
              {index === 0 ? <div className="upcoming-cover archive-next-cover"><p className="cover-name"><i>The</i> Abyss</p><span className="archive-progress-label">In-progress issue</span></div> : <div className="upcoming-cover">Upcoming</div>}
              <h3>{issueLabel(month)}</h3>
              <p>Vol. {current!.volume} | No. {current!.number + index + 1}</p>
            </div>)}
          </div>
        </section>
      </Container>
      <JournalNewsletter />
    </>
  );
}
