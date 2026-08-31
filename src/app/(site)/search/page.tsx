import type { Metadata } from "next";
import { ArticleCard } from "@/components/site/ArticleCard";
import { Container, Kicker } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPosts } from "@/lib/store";

export const metadata: Metadata = {
  title: "Search",
  description: "Search The Assay for a compound, a study, or a claim.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchPosts(query) : [];

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid items-end gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Kicker>Find a piece</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            Search
          </h1>
        </div>
        <form action="/search" className="flex gap-2 lg:col-span-6">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Peptides, FDA, collagen…"
            aria-label="Search articles"
            className="h-11 rounded-full"
          />
          <Button type="submit" className="h-11 rounded-full px-6">
            Search
          </Button>
        </form>
      </div>

      {query ? (
        <p className="mt-10 text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? "result" : "results"} for “
          {query}”
        </p>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          Search titles, excerpts, and the full text of published pieces.
        </p>
      )}

      {results.length > 0 ? (
        <div className="mt-8 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {results.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}
    </Container>
  );
}
