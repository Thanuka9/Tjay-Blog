import { slugify } from "@/lib/site";

export function extractHeadings(markdown: string) {
  const clean = markdown.replace(/:::chart[\s\S]*?:::/g, "");
  return [...clean.matchAll(/^##\s+(.+)$/gm)].map((match) => {
    const text = match[1].replace(/\*+/g, "").trim();
    return { id: slugify(text), text };
  });
}
