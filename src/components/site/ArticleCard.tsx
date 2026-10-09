import { CoverMedia } from "@/components/site/CoverMedia";
import { Kicker } from "@/components/site/layout";
import { formatDate } from "@/lib/site";
import { getTopic } from "@/lib/store";
import type { PostMeta } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

export async function ArticleCard({
  post,
  featured = false,
}: {
  post: PostMeta;
  featured?: boolean;
}) {
  const topic = await getTopic(post.topic);

  return (
    <article
      className={cn(
        featured && "grid items-center gap-8 lg:grid-cols-12 lg:gap-12",
      )}
    >
      {post.coverImage ? (
        <Link
          href={`/articles/${post.slug}`}
          className={cn(
            "relative block overflow-hidden bg-muted",
            featured
              ? "aspect-[16/10] lg:col-span-7"
              : "mb-4 aspect-[16/10]",
          )}
        >
          <CoverMedia
            src={post.coverImage}
            alt=""
            sizes={
              featured
                ? "(min-width: 1024px) 55vw, 100vw"
                : "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            }
            priority={featured}
          />
        </Link>
      ) : null}
      <div className={featured ? "lg:col-span-5" : ""}>
        <Kicker>
          <Link href={`/topics/${post.topic}`}>{topic?.name ?? post.topic}</Link>
        </Kicker>
        <h2
          className={cn(
            "mt-2 font-serif tracking-tight",
            featured
              ? "text-3xl leading-tight sm:text-4xl xl:text-[2.75rem]"
              : "text-2xl leading-snug",
          )}
        >
          <Link href={`/articles/${post.slug}`} className="hover:text-brand">
            {post.title}
          </Link>
        </h2>
        <p
          className={cn(
            "mt-3 text-muted-foreground",
            featured ? "text-lg leading-8" : "leading-7",
          )}
        >
          {post.excerpt}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {formatDate(post.publishedAt)} · {post.readingTime} min read
        </p>
      </div>
    </article>
  );
}
