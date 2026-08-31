import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/site/ArticleCard";
import { Container, Kicker } from "@/components/site/layout";
import { listPostsByTopic, getTopic, listTopics } from "@/lib/store";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) return {};
  return {
    title: topic.name,
    description: topic.description,
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) notFound();
  const posts = await listPostsByTopic(slug);
  const others = (await listTopics()).filter((item) => item.slug !== topic.slug);

  return (
    <Container className="py-12 sm:py-16">
      <nav className="text-sm text-muted-foreground">
        <Link href="/topics" className="hover:text-foreground">
          Topics
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{topic.name}</span>
      </nav>

      <div className="mt-8 grid items-end gap-8 border-b border-border pb-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Kicker>Topic</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            {topic.name}
          </h1>
        </div>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:col-span-5">
          {topic.description}
        </p>
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Other topics
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {others.map((item) => (
            <Link
              key={item.slug}
              href={`/topics/${item.slug}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="mt-12 text-muted-foreground">
          No published articles in this topic yet.
        </p>
      ) : (
        <div className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </Container>
  );
}
