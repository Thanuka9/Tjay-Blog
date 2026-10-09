import type { Nodes, Parent, Root, RootContent } from "mdast";

/** Apply IDs already shared with the contents list, and link citations only in prose. */
export function remarkArticle({ headingIds, citationIds = [] }: { headingIds: string[]; citationIds?: number[] }) {
  return (tree: Root) => {
    let headingIndex = 0;
    const references = new Set(citationIds);
    function visit(node: Nodes, insideLink = false) {
      if (node.type === "heading" && node.depth === 2) {
        const id = headingIds[headingIndex++];
        if (id) node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      }
      if (!("children" in node)) return;
      const parent = node as Parent;
      const linked = insideLink || node.type === "link" || node.type === "linkReference";
      parent.children = parent.children.flatMap((child): RootContent[] => {
        if (linked || child.type !== "text") return [child];
        const parts: RootContent[] = [];
        let offset = 0;
        for (const match of child.value.matchAll(/\[(\d+)\]/g)) {
          if (!references.has(Number(match[1]))) continue;
          if (match.index! > offset) parts.push({ type: "text", value: child.value.slice(offset, match.index) });
          parts.push({ type: "link", url: `#ref-${match[1]}`, children: [{ type: "text", value: match[1] }] });
          offset = match.index! + match[0].length;
        }
        if (offset === 0) return [child];
        if (offset < child.value.length) parts.push({ type: "text", value: child.value.slice(offset) });
        return parts;
      });
      for (const child of parent.children) visit(child, linked);
    }
    visit(tree);
  };
}
