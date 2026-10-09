import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Image, Nodes } from "mdast";

function imageNodes(markdown: string) {
  const images: Image[] = [];
  function visit(node: Nodes) {
    if (node.type === "image") images.push(node);
    if ("children" in node) node.children.forEach(visit);
  }
  visit(unified().use(remarkParse).parse(markdown));
  return images;
}

export function parseBodyImages(markdown: string) {
  return imageNodes(markdown).map((node) => ({ alt: node.alt || "", src: node.url }));
}

export function removeBodyImage(markdown: string, index: number) {
  const position = imageNodes(markdown)[index]?.position;
  const start = position?.start.offset;
  const end = position?.end.offset;
  if (start === undefined || end === undefined) return markdown;
  return (markdown.slice(0, start) + markdown.slice(end)).replace(/\n{3,}/g, "\n\n");
}
