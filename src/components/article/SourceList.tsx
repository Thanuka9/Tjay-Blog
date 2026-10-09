import type { Citation } from "@/lib/citations";

export function SourceList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <section className="article-sources" aria-labelledby="sources-heading">
      <h2
        id="sources-heading"
        className="font-serif text-2xl tracking-tight"
      >
        References
      </h2>
      <ol className="mt-6 space-y-5">
        {citations.map((citation) => (
          <li
            key={citation.id}
            id={`ref-${citation.id}`}
            className="scroll-mt-24 text-sm leading-6"
          >
            <span className="font-medium text-foreground">[{citation.id}] </span>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
            >
              {citation.title}
            </a>
            <p className="mt-1 text-muted-foreground">{citation.detail}</p>
            <p className="mt-1 break-all text-xs text-muted-foreground print:block">
              {citation.url}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
