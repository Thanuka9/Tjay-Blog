import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ARTICLE_CARD_SIZE, articleCard, type ArticleCardContent } from "@/lib/article-card";
import { getPostBySlug } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const font = (file: string) => readFile(join(process.cwd(), "public/fonts/pdf", file));

/** The link-preview image for one article, used as its og:image and twitter:image. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let content: ArticleCardContent | null = null;
  try {
    const post = await getPostBySlug(slug);
    if (post && post.status === "published" && post.publishedAt) {
      content = { title: post.title, kicker: post.articleType, code: post.articleCode };
    }
  } catch (error) {
    // Fall back to the journal's own card if the database is unreachable.
    console.error("article-card: could not load article", error);
  }

  const [serif, serifItalic, sans, sansBold] = await Promise.all([
    font("newsreader-500.ttf"),
    font("newsreader-italic-400.ttf"),
    font("ibm-plex-sans-400.ttf"),
    font("ibm-plex-sans-600.ttf"),
  ]);
  return new ImageResponse(articleCard(content), {
    ...ARTICLE_CARD_SIZE,
    fonts: [
      { name: "Newsreader", data: serif, weight: 500, style: "normal" },
      { name: "Newsreader", data: serifItalic, weight: 400, style: "italic" },
      { name: "IBM Plex Sans", data: sans, weight: 400, style: "normal" },
      { name: "IBM Plex Sans", data: sansBold, weight: 600, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
