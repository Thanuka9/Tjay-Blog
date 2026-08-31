import type { ChartSpec } from "@/lib/types";

export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "chart"; spec: ChartSpec };

export function splitContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const pattern = /:::chart\s*\n([\s\S]*?)\n:::/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "markdown",
        content: content.slice(lastIndex, match.index),
      });
    }
    try {
      blocks.push({
        type: "chart",
        spec: JSON.parse(match[1]) as ChartSpec,
      });
    } catch {
      blocks.push({ type: "markdown", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: "markdown", content: content.slice(lastIndex) });
  }

  return blocks.filter((block) =>
    block.type === "chart" ? true : block.content.trim().length > 0,
  );
}
