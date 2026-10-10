import type { Citation } from "@/lib/citations";

export function SourceList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <section
      id="refs"
      className="article-sources"
      aria-labelledby="sources-heading"
      style={{ marginTop: "56px", paddingTop: "24px" }}
    >
      <h2
        id="sources-heading"
        className="font-serif text-[26px] font-medium tracking-tight text-[#0E1C3B]"
      >
        References
      </h2>
      <ol
        className="mt-5 space-y-2.5 text-[15px] leading-[1.6]"
        style={{ listStyle: "decimal", paddingLeft: "22px" }}
      >
        {citations.map((citation) => (
          <li key={citation.id} id={`ref-${citation.id}`} className="scroll-mt-24 pl-1">
            {citation.url ? (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
              >
                {citation.title}
              </a>
            ) : (
              <span>{citation.title}</span>
            )}
            {citation.detail ? <>. {citation.detail}</> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
