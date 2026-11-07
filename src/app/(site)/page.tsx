import Link from "next/link";
import { Container } from "@/components/site/layout";
import { CoverMedia } from "@/components/site/CoverMedia";
import { JournalNewsletter } from "@/components/site/JournalNewsletter";
import { issueCoverDescription, issueCoverImage } from "@/lib/issue-cover";
import { issuePath } from "@/lib/issues";
import { formatDate, site } from "@/lib/site";
import { listPublishedIssues } from "@/lib/store";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const issues = await listPublishedIssues();
  const current = issues[0];
  const featured = current?.posts[0];
  const coverImage = current ? issueCoverImage(current) : null;

  return (
    <>
      <Container className="home-editorial">
        <section className="journal-masthead">
          <h1><i>The</i> Abyss</h1>
          <p>{site.tagline}</p>
        </section>

        {current && featured ? (
          <section className="py-9 sm:py-14" aria-labelledby="home-featured-title">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="issue-badge">Current issue</span>
              <span className="text-xs font-medium tracking-wide text-[var(--muted-foreground)] sm:text-sm">
                Vol. {current.volume} · No. {current.number} · {current.label}
              </span>
            </div>

            {/* One featured article is shown on the homepage. The issue page
                remains the single source of truth for all its articles. */}
            <Link
              href={issuePath(current)}
              aria-label={`Explore ${current.label}: ${featured.title} and the rest of the issue`}
              className="group block overflow-hidden border border-[var(--border)] bg-white text-[var(--foreground)] shadow-[0_10px_30px_#141a2e14] transition-[box-shadow,transform] duration-200 hover:!text-[var(--foreground)] hover:shadow-[0_20px_50px_#141a2e22] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
            >
              <article className="grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="relative min-h-[240px] overflow-hidden bg-[var(--deep-navy)] sm:min-h-[340px] md:min-h-[410px]">
                  {coverImage ? (
                    <CoverMedia
                      src={coverImage}
                      alt={issueCoverDescription(current)}
                      priority
                      sizes="(max-width: 767px) 100vw, 48vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[var(--deep-navy)]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b1630]/90 via-[#0b1630]/35 to-transparent px-5 pb-5 pt-20 text-white sm:px-7 sm:pb-7">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                      The Abyss · {current.label}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-12">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                    {featured.articleType || "Featured article"} · {featured.articleCode || "01"}
                  </p>
                  <h2
                    id="home-featured-title"
                    className="mt-4 font-serif text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.015em] text-[var(--navy)]"
                  >
                    {featured.title}
                  </h2>
                  <p className="mt-5 max-w-prose font-serif text-lg leading-[1.6] text-[var(--muted-foreground)] sm:text-xl">
                    {featured.excerpt}
                  </p>
                  <p className="mt-5 text-xs font-medium tracking-wide text-[var(--muted-foreground)] sm:text-sm">
                    {formatDate(featured.publishedAt)}
                  </p>
                  <span className="mt-8 inline-flex min-h-11 items-center gap-3 self-start border-b-2 border-[var(--navy)] pb-1 text-sm font-semibold tracking-[0.04em] text-[var(--navy)]">
                    Open this issue · Explore {current.posts.length} {current.posts.length === 1 ? "article" : "articles"}
                    <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </article>
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold">
              <Link href="/issues" className="inline-flex min-h-11 items-center">Browse the archive →</Link>
              <a href={`${issuePath(current)}/download`} className="inline-flex min-h-11 items-center" download>
                Download full issue PDF ↓
              </a>
            </div>
          </section>
        ) : (
          <section className="py-16">
            <p>The next issue is on its way. Subscribe to hear when it is published.</p>
            <Link href="/issues" className="mt-4 inline-flex min-h-11 items-center font-semibold">
              Browse the archive →
            </Link>
          </section>
        )}
      </Container>
      <JournalNewsletter />
    </>
  );
}
