import type { MetadataRoute } from "next";
import { articleIssueId, issuePath } from "@/lib/issues";
import type { Issue, PostMeta, Topic } from "@/lib/types";

/** Fixed public pages. Redirects, forms and the editor desk are left out. */
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/issues",
  "/articles",
  "/topics",
  "/about",
  "/newsletter",
  "/editorial-standards",
  "/corrections",
  "/contact",
];

export function staticSitemapEntries(base: string): MetadataRoute.Sitemap {
  return STATIC_SITEMAP_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
  }));
}

/** Published articles, published issues, and topics that have an article. */
export function contentSitemapEntries(
  base: string,
  posts: PostMeta[],
  issues: Issue[],
  topics: Topic[],
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const published = posts.filter(
    (post) => post.status === "published" && post.publishedAt,
  );

  for (const post of published) {
    entries.push({
      url: `${base}/articles/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt!),
    });
  }

  for (const issue of issues.filter((item) => item.status === "published")) {
    const updated = published
      .filter((post) => articleIssueId(post) === issue.id)
      .map((post) => post.updatedAt)
      .sort()
      .at(-1);
    entries.push({
      url: `${base}${issuePath(issue)}`,
      ...(updated ? { lastModified: new Date(updated) } : {}),
    });
  }

  const usedTopics = new Set(published.map((post) => post.topic));
  for (const topic of topics.filter((item) => usedTopics.has(item.slug))) {
    entries.push({ url: `${base}/topics/${topic.slug}` });
  }

  return entries;
}
