import Link from "next/link";
import { Container } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { IssueContents } from "@/components/site/IssueContents";
import { JournalNewsletter } from "@/components/site/JournalNewsletter";
import { issuePath } from "@/lib/issues";
import { site } from "@/lib/site";
import { listPublishedIssues } from "@/lib/store";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const issues = await listPublishedIssues();
  const current = issues[0];
  return (
    <Container>
      <section className="journal-masthead">
        <h1>
          <i>The</i> Abyss
        </h1>
        <p>{site.tagline}</p>
      </section>
      {current ? (
        <section className="current-issue">
          <div>
            <Link
              href={issuePath(current)}
              aria-label={`Read ${current.label}`}
            >
              <IssueCover issue={current} />
            </Link>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="issue-badge">Current issue</span>
              <span className="text-xs text-muted-foreground">
                Vol. {current.volume} | No. {current.number} · {current.label}
              </span>
            </div>
            <h2 className="mt-5 font-serif text-4xl">In this issue</h2>
            <IssueContents issue={current} compact />
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link href={issuePath(current)} className="text-sm font-semibold">
                View Current Issue →
              </Link>
              <a
                className="journal-download"
                href={`${issuePath(current)}/download`}
                download
              >
                ↓ Download Full Journal PDF
              </a>
            </div>
          </div>
        </section>
      ) : (
        <p className="py-16">
          The first issue is on its way. Subscribe to hear when it is published.
        </p>
      )}
      <section className="journal-archive">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-4xl">
            Archive
            {current && <span className="ml-5 text-3xl">{current.year}</span>}
          </h2>
          <Link href="/issues" className="text-sm">
            All issues →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {issues.slice(0, 4).map((issue) => (
            <Link
              key={issue.id}
              href={issuePath(issue)}
              className="archive-item"
            >
              <IssueCover issue={issue} />
              <h3>{issue.label}</h3>
              <p>
                Vol. {issue.volume} | No. {issue.number}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <JournalNewsletter />
    </Container>
  );
}
