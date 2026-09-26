import type { Metadata } from "next";
import { ArticleCard } from "@/components/site/ArticleCard";
import { Container, Kicker } from "@/components/site/layout";
import { listPublishedPosts } from "@/lib/store";

export const metadata: Metadata = {
  title: "Articles",
  description: "Every published piece from The Assay, newest first.",
};

export default async function ArticlesPage() {
  const posts = await listPublishedPosts();
  const featured = posts.find((post) => post.featured);
  const rest = featured ? posts.filter((post) => post.id !== featured.id) : posts;

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid items-end gap-8 border-b border-border pb-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Kicker>The archive</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            Articles
          </h1>
        </div>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:col-span-5">
          Newest first. Each piece is a test of a claim, not a recap of a trend.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="mt-12 text-muted-foreground">No published pieces yet.</p>
      ) : (
        <>
          {featured ? (
            <div className="mt-12 border-b border-border pb-12">
              <ArticleCard post={featured} featured />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
