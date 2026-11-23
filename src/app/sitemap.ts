import type { MetadataRoute } from "next";
import { publicationUrl } from "@/lib/site";
import { contentSitemapEntries, staticSitemapEntries } from "@/lib/sitemap-entries";
import { listIssueMeta, listPostMeta, listTopics } from "@/lib/store";

// Articles and issues live in the database, so build the sitemap on request:
// a newly published article appears without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicationUrl();
  const entries = staticSitemapEntries(base);

  try {
    const [posts, issues, topics] = await Promise.all([
      listPostMeta(),
      listIssueMeta(),
      listTopics(),
    ]);
    entries.push(...contentSitemapEntries(base, posts, issues, topics));
  } catch (error) {
    // If the database cannot be reached, still serve the fixed pages
    // instead of an error, so crawlers are never turned away.
    console.error("sitemap: could not load articles", error);
  }

  return entries;
}
