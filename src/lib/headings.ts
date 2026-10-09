import { slugify } from "@/lib/site";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Nodes } from "mdast";
import { splitContent } from "@/lib/content";

export function extractHeadings(markdown: string) {
  const headings: { id: string; text: string }[] = [];
  const used = new Set<string>(["sources-heading", "cite-this-article", "main-content"]);
  function nodeText(node: Nodes): string {
    if ("value" in node) return node.value;
    return "children" in node ? node.children.map(nodeText).join("") : "";
  }
  function visit(node: Nodes) {
    if (node.type === "heading" && node.depth === 2) {
      const text = nodeText(node).trim();
      const base = slugify(text) || "section";
      let id = base;
      for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
      used.add(id);
      headings.push({ id, text });
    }
    if ("children" in node) node.children.forEach(visit);
  }
  for (const block of splitContent(markdown)) {
    if (block.type === "markdown") visit(unified().use(remarkParse).use(remarkGfm).parse(block.content));
  }
  return headings;
}
