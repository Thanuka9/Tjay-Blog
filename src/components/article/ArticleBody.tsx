"use client";

import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartBlock } from "@/components/article/ChartBlock";
import { splitContent } from "@/lib/content";
import { linkCitations } from "@/lib/citations";
import { slugify } from "@/lib/site";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return nodeText(
      (node as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

const components: Components = {
  h2: ({ children }) => (
    <h2
      id={slugify(nodeText(children))}
      className="mt-14 mb-4 scroll-mt-24 font-serif text-[1.85rem] leading-tight tracking-tight text-foreground"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 font-sans text-[0.72rem] font-semibold tracking-[0.16em] text-brand uppercase">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-5 text-[1.0625rem] leading-[1.8] text-foreground/90">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="font-serif italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-12 border-l-[3px] border-brand pl-6 font-serif text-[1.45rem] leading-snug text-foreground [&>p]:my-0 [&>p]:text-[1.45rem] [&>p]:leading-snug">
      {children}
    </blockquote>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      <figure className="my-10">
        <span className="block overflow-hidden rounded-xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            className="mx-auto block h-auto w-full object-contain"
          />
        </span>
        {alt ? (
          <figcaption className="mt-3 text-sm leading-6 text-muted-foreground">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    ) : null,
  ol: ({ children }) => (
    <ol className="my-6 list-decimal space-y-3 pl-6 text-[1.0625rem] leading-[1.8]">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="my-6 list-disc space-y-3 pl-6 text-[1.0625rem] leading-[1.8]">
      {children}
    </ul>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => {
    const isCitation = Boolean(href?.startsWith("#ref-"));
    if (isCitation) {
      return (
        <sup className="citation ml-0.5">
          <a
            href={href}
            className="font-sans text-[0.7em] font-semibold text-brand no-underline hover:underline"
          >
            [{children}]
          </a>
        </sup>
      );
    }
    return (
      <a
        href={href}
        className="underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="my-10 -mx-1 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-3 font-medium first:pl-0">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-3 py-3 align-top leading-6 first:pl-0">
      {children}
    </td>
  ),
};

export function ArticleBody({ content }: { content: string }) {
  const blocks = splitContent(linkCitations(content));

  return (
    <div className="article-prose">
      {blocks.map((block, index) =>
        block.type === "chart" ? (
          <ChartBlock key={`chart-${index}`} spec={block.spec} />
        ) : (
          <Markdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {block.content}
          </Markdown>
        ),
      )}
    </div>
  );
}
