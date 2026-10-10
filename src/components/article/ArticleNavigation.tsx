import { Kicker } from "@/components/site/layout";

function navigationLabel(text: string) {
  const withoutQualifier = text.includes(":") ? text.split(":", 1)[0] : text;
  const withoutLead = withoutQualifier.replace(/^So,\s*/i, "");
  return withoutLead.charAt(0).toUpperCase() + withoutLead.slice(1);
}

export function ArticleNavigation({ headings, hasSources, title }: {
  headings: { id: string; text: string }[];
  hasSources: boolean;
  title?: string;
}) {
  return (
    <nav aria-label="In this article">
      <Kicker>In this article</Kicker>
      {title && (
        <p className="mt-2.5 font-serif text-lg font-medium leading-[1.35] text-[#0E1C3B]">
          {title}
        </p>
      )}
      <ol className="mt-3.5 flex flex-col">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="block border-t border-[#E6E0D3] py-2.5 text-sm leading-[1.4] text-[#0E1C3B] no-underline"
            >
              {navigationLabel(heading.text)}
            </a>
          </li>
        ))}
        {hasSources && (
          <li>
            <a
              href="#refs"
              className="block border-t border-[#E6E0D3] py-2.5 text-sm leading-[1.4] text-[#0E1C3B] no-underline"
            >
              References
            </a>
          </li>
        )}
      </ol>
    </nav>
  );
}
