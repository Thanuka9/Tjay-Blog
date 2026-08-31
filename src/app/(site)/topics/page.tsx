import type { Metadata } from "next";
import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { listPublishedPosts, listTopics } from "@/lib/store";

export const metadata: Metadata = {
  title: "Topics",
  description:
    "Browse The Assay by subject: longevity, peptides, regulation, nutrition, and metabolism.",
};

export default async function TopicsPage() {
  const [posts, topics] = await Promise.all([
    listPublishedPosts(),
    listTopics(),
  ]);
  const counts = Object.fromEntries(
    topics.map((topic) => [
      topic.slug,
      posts.filter((post) => post.topic === topic.slug).length,
    ]),
  );

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid items-end gap-8 border-b border-border pb-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Kicker>Main topics</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            Topics
          </h1>
        </div>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:col-span-5">
          Five subjects to start. Editors can add more. Every article is filed
          under one of them. The latest piece in each subject is listed to the
          right.
        </p>
      </div>
      <div className="divide-y border-border">
        {topics.map((topic) => {
          const latest = posts.find((post) => post.topic === topic.slug);
          return (
            <div
              key={topic.slug}
              className="grid items-start gap-6 py-8 lg:grid-cols-12 lg:gap-10"
            >
              <div className="lg:col-span-4">
                <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Topic
                </p>
                <Link href={`/topics/${topic.slug}`}>
                  <h2 className="mt-1 font-serif text-3xl tracking-tight hover:text-brand">
                    {topic.name}
                  </h2>
                </Link>
                <p className="mt-2 text-sm text-muted-foreground">
                  {counts[topic.slug]} {counts[topic.slug] === 1 ? "article" : "articles"}
                </p>
              </div>
              <p className="leading-7 text-muted-foreground lg:col-span-5">
                {topic.description}
              </p>
              <div className="lg:col-span-3 lg:text-right">
                <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Latest article
                </p>
                {latest ? (
                  <Link
                    href={`/articles/${latest.slug}`}
                    className="mt-1 inline-block text-sm leading-6 hover:text-brand"
                  >
                    {latest.title}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">None yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
