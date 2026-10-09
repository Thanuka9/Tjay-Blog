import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleAtAGlance } from "@/components/article/ArticleFeatures";
import { articleFeatures } from "@/lib/article-features";
import { ArticleNavigation } from "@/components/article/ArticleNavigation";
import { SourceList } from "@/components/article/SourceList";
import { CoverMedia } from "@/components/site/CoverMedia";
import { Container, Kicker } from "@/components/site/layout";
import { ShareActions } from "@/components/site/ShareActions";
import { SubscribeForm } from "@/components/site/SubscribeForm";
import { CITATIONS_BY_SLUG } from "@/lib/citations";
import { extractHeadings } from "@/lib/headings";
import { formatDate, publicationUrl, site } from "@/lib/site";
import {
  getPostBySlug,
  listPublishedIssues,
  listPublishedPosts,
} from "@/lib/store";
import { issuePath, journalCitations } from "@/lib/issues";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published" || !post.publishedAt) return {};
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    authors: [{ name: post.author }],
    alternates: { canonical: `/articles/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: site.name,
      title,
      description,
      url: `/articles/${post.slug}`,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const original = await getPostBySlug(slug);
  if (!original || original.status !== "published" || !original.publishedAt) notFound();
  const issues = await listPublishedIssues();
  const issue = issues.find((issue) =>
    issue.posts.some((post) => post.id === original.id),
  );
  const post = issue?.posts.find((post) => post.id === original.id) || original;
  const references = post.references ?? CITATIONS_BY_SLUG[slug] ?? [];
  const features = articleFeatures(post);
  const headings = extractHeadings(post.content);
  const citations = journalCitations(post, issue);
  const related = issue
    ? issue.posts.filter((item) => item.id !== post.id)
    : (await listPublishedPosts())
        .filter((item) => item.id !== post.id && item.topic === post.topic)
        .slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    identifier: post.articleCode,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": post.author === site.name ? "Organization" : "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: publicationUrl(),
    },
    mainEntityOfPage: `${publicationUrl()}/articles/${slug}`,
    isPartOf: issue
      ? {
          "@type": "PublicationIssue",
          issueNumber: issue.number,
          isPartOf: {
            "@type": "PublicationVolume",
            volumeNumber: issue.volume,
          },
        }
      : undefined,
    citation: references.map((ref) => ref.url).filter(Boolean),
  };
  return (
    <article className="journal-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Container className="article-container">
        <nav className="article-breadcrumb" aria-label="Breadcrumb">
          <Link href="/issues">Archive</Link>
          {issue && <><span aria-hidden="true">/</span><Link href={issuePath(issue)}>Vol. {issue.volume}, No. {issue.number} · {issue.label}</Link></>}
          <span aria-hidden="true">/</span><span aria-current="page">{post.articleCode || "Article"}</span>
        </nav>
        <header className="journal-article-heading">
          <Kicker>{post.articleType || "Research Article"}</Kicker>
          <h1>{post.title}</h1>
          <p className="article-deck">{post.excerpt}</p>
          <div className="article-meta-row">
            <div className="article-byline">
              <p className="article-author">By {post.author}</p>
              <p>Published <time dateTime={post.publishedAt || undefined}>{formatDate(post.publishedAt)}</time>{post.articleCode ? ` · ${post.articleCode}` : ""} · {post.readingTime} min read</p>
            </div>
            <ShareActions slug={post.slug} />
          </div>
          {issue && (
            <a
              className="mt-4 inline-block text-xs underline print:hidden"
              href={`${issuePath(issue)}/download`}
              download
            >
              Download entire issue (PDF)
            </a>
          )}
        </header>
        <div className="journal-article-grid">
          <div className="article-reading-column">
            <ArticleAtAGlance summary={features.atAGlance} abstract={post.abstract} />
            <details className="article-mobile-contents print:hidden">
              <summary>In this article</summary>
              <ArticleNavigation headings={headings} hasSources={references.length > 0} />
            </details>
            {post.coverImage && (
              <figure className="mb-10">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <CoverMedia
                    src={post.coverImage}
                    alt={post.title}
                    className="object-cover"
                    sizes="(min-width: 1024px) 700px, 100vw"
                    priority
                  />
                </div>
              </figure>
            )}
            <ArticleBody content={post.content} citationIds={references.map((reference) => reference.id)} evidenceLadder={features.evidenceLadder} />
            <SourceList citations={references} />
            <section
              id="cite-this-article"
              className="article-citation"
            >
              <h2 className="font-serif text-2xl">Cite this article</h2>
              <p className="mt-4 text-sm leading-7">{citations.vancouver}</p>
              <p className="mt-5 text-xs leading-6 text-muted-foreground">
                This article explains published research for a general audience.
                It is not medical advice.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>.{" "}
                <Link href="/corrections" className="underline">Report a correction</Link>.
              </p>
            </section>
            {post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 print:hidden" aria-label="Article topics">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <aside className="journal-article-aside print:hidden">
            <div className="article-aside-inner">
              <div className="article-desktop-contents"><ArticleNavigation headings={headings} hasSources={references.length > 0} title={post.title} /></div>
              {related.length > 0 && (
                <section>
                  <Kicker>
                    {issue ? "Also in this issue" : "Related articles"}
                  </Kicker>
                  <ul className="mt-4 space-y-4">
                    {related.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/articles/${item.slug}`}
                          className="font-serif text-lg leading-snug hover:text-brand"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {!!issue?.upcomingArticles?.length && <section className="article-coming-up">
                <Kicker>Coming up</Kicker>
                <ul>{issue.upcomingArticles.map((item) => <li key={item.articleCode}>{item.title}</li>)}</ul>
              </section>}
              <section className="article-newsletter">
                <p className="mb-5 font-serif text-xl">
                  Get each article the day it’s published.
                </p>
                <SubscribeForm showLabel buttonLabel="Subscribe free" />
              </section>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}
