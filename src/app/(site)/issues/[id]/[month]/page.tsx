import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { IssueContents } from "@/components/site/IssueContents";
import { getPublishedIssue } from "@/lib/store";
import { issuePath } from "@/lib/issues";
import { publicationUrl, site } from "@/lib/site";
type Props = { params: Promise<{ id: string; month: string }> };
async function load({ params }: Props) {
  const { id, month } = await params;
  if (!/^\d{4}$/.test(id) || !/^(0[1-9]|1[0-2])$/.test(month)) return null;
  return getPublishedIssue(`${id}-${month}`);
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const issue = await load(props);
  return issue
    ? {
        title: `${issue.label} — Vol. ${issue.volume}, No. ${issue.number}`,
        description: `${site.name}: ${issue.posts.length} articles in ${issue.label}. Read online or download the journal.`,
        alternates: { canonical: issuePath(issue) },
      }
    : {};
}
export default async function IssuePage(props: Props) {
  const issue = await load(props);
  if (!issue) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    name: `${site.name} — ${issue.label}`,
    issueNumber: issue.number,
    datePublished: `${issue.id}-01`,
    isPartOf: {
      "@type": "PublicationVolume",
      volumeNumber: issue.volume,
      isPartOf: {
        "@type": "Periodical",
        name: site.name,
        url: publicationUrl(),
      },
    },
    hasPart: issue.posts.map((post) => ({
      "@type": "Article",
      headline: post.title,
      identifier: post.articleCode,
      url: `${publicationUrl()}/articles/${post.slug}`,
    })),
  };
  return (
    <Container className="py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Link href="/issues" className="text-sm text-muted-foreground">
        Archive / {issue.year} / Vol. {issue.volume}, No. {issue.number}
      </Link>
      <h1 className="mt-6 font-serif text-5xl">{issue.label}</h1>
      <p className="mt-3 text-sm">
        Vol. {issue.volume} | No. {issue.number}
      </p>
      <div className="current-issue mt-10">
        <div>
          <IssueCover issue={issue} />
          <div className="mt-6 flex flex-col items-start gap-4 text-xs font-semibold">
            <a href="#about-the-cover">ABOUT THE COVER ↓</a>
            <a href={`/api/download/contents/${issue.id}`} download>
              ↓ TABLE OF CONTENTS (PDF)
            </a>
            <a
              className="journal-download"
              href={`${issuePath(issue)}/download`}
              download
            >
              ↓ DOWNLOAD FULL ISSUE (PDF)
            </a>
          </div>
        </div>
        <div>
          <Kicker>From the Editor</Kicker>
          {issue.editorLetter ? (
            <div className="editor-letter">
              {issue.editorLetter.split(/\n\s*\n/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 mb-5 leading-8 text-muted-foreground">
              Below the headlines, into the evidence. Read this issue’s
              articles, follow their sources, and download the journal to
              explore at your own pace.
            </p>
          )}
          <p className="mt-4 mb-10 text-sm italic">
            {issue.editorName}, Editor
          </p>
          <h2 className="font-serif text-3xl">Table of Contents</h2>
          <IssueContents issue={issue} />
        </div>
      </div>
      <section id="about-the-cover" className="border-t border-border py-8">
        <Kicker>About the cover</Kicker>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
          {issue.coverDescription ||
            "The issue cover introduces this month’s research and articles."}
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          How to cite: Author. Article title. {site.name}. {issue.year};
          {issue.volume}({issue.number}):article number.
        </p>
      </section>
    </Container>
  );
}
