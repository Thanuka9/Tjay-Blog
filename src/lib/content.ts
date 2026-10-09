import type { ChartSpec } from "@/lib/types";
import { isChartSpec } from "@/lib/charts";
import { unified } from "unified";
import remarkParse from "remark-parse";

export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "chart"; spec: ChartSpec };

export function splitContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const codeRanges = unified().use(remarkParse).parse(content).children
    .filter((node) => node.type === "code")
    .map((node) => ({ start: node.position?.start.offset ?? -1, end: node.position?.end.offset ?? -1 }));
  const pattern = /:::chart\s*\n([\s\S]*?)\n:::/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    if (codeRanges.some((range) => match!.index >= range.start && match!.index < range.end)) continue;
    if (match.index > lastIndex) {
      blocks.push({
        type: "markdown",
        content: content.slice(lastIndex, match.index),
      });
    }
    try {
      const spec: unknown = JSON.parse(match[1]);
      if (!isChartSpec(spec)) throw new Error("Invalid chart data");
      blocks.push({
        type: "chart",
        spec,
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
