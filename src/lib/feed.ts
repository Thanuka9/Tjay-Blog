import { site } from "@/lib/site";
import type { PostMeta } from "@/lib/types";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** RSS 2.0 feed of the newest published articles. Drafts are left out. */
export function buildRssFeed(base: string, posts: PostMeta[]): string {
  const published = posts
    .filter((post) => post.status === "published" && post.publishedAt)
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))
    .slice(0, 50);

  const items = published
    .map((post) => {
      const url = `${base}/articles/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${new Date(post.publishedAt!).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.seoDescription || post.excerpt)}</description>`,
        post.articleType ? `      <category>${escapeXml(post.articleType)}</category>` : "",
        `      <dc:creator>${escapeXml(post.author)}</dc:creator>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const newest = published[0]?.publishedAt;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${escapeXml(site.name)}</title>`,
    `    <link>${base}</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    "    <language>en-us</language>",
    `    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />`,
    newest ? `    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>` : "",
    items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line, index, all) => line !== "" || index === all.length - 1)
    .join("\n");
}
