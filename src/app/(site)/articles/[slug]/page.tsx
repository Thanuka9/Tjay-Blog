import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
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
  if (!post || post.status !== "published") return {};
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
  if (!original || original.status !== "published") notFound();
  const issues = await listPublishedIssues();
  const issue = issues.find((issue) =>
    issue.posts.some((post) => post.id === original.id),
  );
  const post = issue?.posts.find((post) => post.id === original.id) || original;
  const references = CITATIONS_BY_SLUG[slug] || [];
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
    citation: references.map((ref) => ref.url),
  };
  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Container className="py-10 sm:py-14">
        {issue && (
          <Link
            href={issuePath(issue)}
            className="mb-6 inline-block text-sm text-muted-foreground"
          >
            Vol. {issue.volume} | No. {issue.number} · {issue.label}
          </Link>
        )}
        <div className="journal-article-grid">
          <div>
            <header className="journal-article-heading">
              <Kicker>{post.articleType || "Research Article"}</Kicker>
              <h1>{post.title}</h1>
              <p className="article-deck">{post.excerpt}</p>
              <p className="article-byline">
                {post.author}
                <br />
                Published {formatDate(post.publishedAt)}
                {post.articleCode ? ` · ${post.articleCode}` : ""} ·{" "}
                {post.readingTime} min read
              </p>
              <ShareActions slug={post.slug} citations={citations} />
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
            <ArticleBody content={post.content} />
            <SourceList citations={references} />
            <section
              id="cite-this-article"
              className="mt-12 border-t border-border pt-6"
            >
              <Kicker>Cite this article</Kicker>
              <p className="mt-4 text-sm leading-7">{citations.vancouver}</p>
              <p className="mt-5 text-xs leading-6 text-muted-foreground">
                This article explains published research for a general audience.
                It is not medical advice. Articles licensed under CC BY-NC-ND
                4.0.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated {formatDate(post.updatedAt)}.
              </p>
            </section>
            {post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
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
            <div className="space-y-8 lg:sticky lg:top-8">
              {headings.length > 0 && (
                <section>
                  <Kicker>In this article</Kicker>
                  <ol className="mt-4 space-y-3 border-l border-border">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="block pl-4 text-sm leading-6 text-muted-foreground hover:text-foreground"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                    <li>
                      <a
                        href="#cite-this-article"
                        className="block pl-4 text-sm"
                      >
                        Cite this article
                      </a>
                    </li>
                  </ol>
                </section>
              )}
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
              <section className="border-t border-border pt-6">
                <p className="mb-5 font-serif text-xl">
                  Get each article the day it’s published.
                </p>
                <SubscribeForm />
              </section>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}
