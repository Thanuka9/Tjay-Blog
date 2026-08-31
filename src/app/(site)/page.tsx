import Link from "next/link";
import { ArticleCard } from "@/components/site/ArticleCard";
import { HomeSlideshow } from "@/components/site/HomeSlideshow";
import { Container, Kicker } from "@/components/site/layout";
import { SubscribeForm } from "@/components/site/SubscribeForm";
import { site } from "@/lib/site";
import { getHomeSlides, listPublishedPosts, listTopics } from "@/lib/store";

export default async function HomePage() {
  const [posts, topics, slides] = await Promise.all([
    listPublishedPosts(),
    listTopics(),
    getHomeSlides(),
  ]);
  const slideIds = new Set(slides.map((slide) => slide.id));
  const rest = posts.filter((post) => !slideIds.has(post.id));
  const counts = Object.fromEntries(
    topics.map((topic) => [
      topic.slug,
      posts.filter((post) => post.topic === topic.slug).length,
    ]),
  );

  return (
    <div>
      <HomeSlideshow slides={slides} topics={topics} />

      <section className="border-b border-border">
        <Container className="grid items-end gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <Kicker>A science publication</Kicker>
            <h1 className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {site.tagline}
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:col-span-4 lg:pb-1">
            Health claims move at the speed of a caption. We read the studies,
            the conflicts of interest, and the regulatory record, then write it
            in plain language.
          </p>
        </Container>
      </section>

      {rest.length > 0 ? (
        <section className="border-t border-border">
          <Container className="py-12 sm:py-16">
            <Kicker className="mb-8 text-muted-foreground">Latest</Kicker>
            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section className="border-t border-border bg-muted/35">
        <Container className="py-12 sm:py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <Kicker className="text-muted-foreground">The index</Kicker>
            <Link href="/topics" className="text-sm text-muted-foreground hover:text-foreground">
              All topics →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="flex flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:border-foreground/20"
              >
                <h2 className="font-serif text-2xl tracking-tight">{topic.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {topic.description}
                </p>
                <p className="mt-5 text-xs tracking-wide text-muted-foreground uppercase">
                  {counts[topic.slug]} {counts[topic.slug] === 1 ? "piece" : "pieces"}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
              In the pipeline
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
              Kisspeptin, NAD+, and retatrutide each deserve a full piece of
              their own. Subscribe and we will send the next one when it is
              actually done, not when it is trending.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-6">
            <p className="font-serif text-xl">Get the next assay</p>
            <p className="mt-2 mb-5 text-sm text-muted-foreground">
              No daily newsletter. Just the pieces.
            </p>
            <SubscribeForm />
          </div>
        </Container>
      </section>
    </div>
  );
}
