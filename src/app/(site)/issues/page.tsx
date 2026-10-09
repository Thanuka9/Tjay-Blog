import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { issuePath } from "@/lib/issues";
import { listPublishedIssues } from "@/lib/store";
export const metadata = {
  title: "Archive",
  alternates: { canonical: "/issues" },
};
export default async function ArchivePage() {
  const issues = await listPublishedIssues();
  const years = [...new Set(issues.map((issue) => issue.year))];
  return (
    <Container className="py-14">
      <Kicker>The journal</Kicker>
      <h1 className="mt-4 mb-12 font-serif text-5xl">Archive</h1>
      {years.map((year) => (
        <section key={year} className="journal-archive">
          <h2 className="mb-8 font-serif text-4xl">{year}</h2>
          <div className="archive-grid">
            {issues
              .filter((issue) => issue.year === year)
              .map((issue) => (
                <div key={issue.id} className="archive-item">
                  <Link href={issuePath(issue)}>
                    <IssueCover issue={issue} variant="archive" current={issue.id === issues[0]?.id} />
                    <h3>{issue.label}</h3>
                  </Link>
                  <p>
                    Vol. {issue.volume} | No. {issue.number}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-semibold">
                    <Link href={issuePath(issue)}>View issue →</Link>
                    <a href={`${issuePath(issue)}/download`} download>
                      ↓ PDF
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
      {!issues.length && <p>No issues published yet.</p>}
    </Container>
  );
}
