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
import { formatDate } from "@/lib/site";
import { getPostBySlug, getTopic, listPublishedPosts } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") return {};
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();
  const topic = await getTopic(post.topic);
  const citations = CITATIONS_BY_SLUG[post.slug] ?? [];
  const headings = extractHeadings(post.content);
  const related = (await listPublishedPosts())
    .filter((item) => item.id !== post.id && item.topic === post.topic)
    .slice(0, 4);

  return (
    <article>
      <Container className="pt-10 pb-8 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-8">
            {topic ? (
              <Kicker>
                <Link href={`/topics/${topic.slug}`}>{topic.name}</Link>
              </Kicker>
            ) : null}
            <h1 className="mt-3 font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.15rem]">
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {post.excerpt}
            </p>
          </div>
          <div className="flex flex-col justify-end gap-4 lg:col-span-4 lg:items-end">
            <p className="text-sm text-muted-foreground lg:text-right">
              {post.author}
              <br />
              {formatDate(post.publishedAt)} · {post.readingTime} min read
            </p>
            <ShareActions />
            <a href={`/api/download/article/${post.slug}`} download className="journal-download print:hidden">↓ Download article (PDF)</a>
            <Link href="/issues/current" className="text-sm print:hidden">Explore the current issue →</Link>
          </div>
        </div>

        {post.coverImage ? (
          <figure className="mt-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <CoverMedia
                src={post.coverImage}
                alt={post.title}
                className="object-cover object-center"
                sizes="(min-width: 1720px) 1720px, 100vw"
                priority
              />
            </div>
          </figure>
        ) : null}

        <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16 xl:gap-24">
          <div className="min-w-0 w-full max-w-[46rem]">
            <ArticleBody content={post.content} />
            <SourceList citations={citations} />
            {post.tags.length > 0 ? (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="hidden w-full shrink-0 print:hidden lg:block lg:w-[22rem] xl:w-[24rem]">
            <div className="sticky top-28 space-y-8">
              {headings.length > 0 ? (
                <section>
                  <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    In this piece
                  </p>
                  <ol className="mt-4 space-y-2.5 border-l border-border">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="block py-0.5 pl-4 text-sm leading-6 text-muted-foreground hover:text-foreground"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {related.length > 0 ? (
                <section className="print:hidden">
                  <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                    More in {topic?.name}
                  </p>
                  <ul className="mt-4 space-y-3">
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
              ) : null}

              <section className="rounded-xl border border-border bg-muted/40 p-5 print:hidden">
                <p className="font-serif text-xl">Stay with the evidence</p>
                <p className="mt-2 mb-4 text-sm text-muted-foreground">
                  The next pieces land here first.
                </p>
                <SubscribeForm compact />
              </section>
            </div>
          </aside>
        </div>
      </Container>

      <section className="mt-16 border-t border-border bg-muted/35 print:hidden lg:hidden">
        <Container className="py-12">
          <h2 className="font-serif text-3xl tracking-tight">
            Stay with the evidence
          </h2>
          <p className="mt-2 mb-6 max-w-xl text-muted-foreground">
            The next pieces on Kisspeptin, NAD+, and retatrutide will land here
            first.
          </p>
          <SubscribeForm />
        </Container>
      </section>
    </article>
  );
}
