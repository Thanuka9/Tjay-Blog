import { buildRssFeed } from "@/lib/feed";
import { publicationUrl } from "@/lib/site";
import { listPostMeta } from "@/lib/store";
import type { PostMeta } from "@/lib/types";

// Built on request, so a newly published article appears without a redeploy.
export const dynamic = "force-dynamic";

export async function GET() {
  let posts: PostMeta[] = [];
  try {
    posts = await listPostMeta();
  } catch (error) {
    // Serve an empty, valid feed rather than an error if the database is unreachable.
    console.error("feed: could not load articles", error);
  }
  return new Response(buildRssFeed(publicationUrl(), posts), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    },
  });
}
