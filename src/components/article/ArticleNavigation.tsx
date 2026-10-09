import { Kicker } from "@/components/site/layout";

export function ArticleNavigation({ headings, hasSources, title }: {
  headings: { id: string; text: string }[];
  hasSources: boolean;
  title?: string;
}) {
  return <nav className="article-contents" aria-label="In this article">
    <Kicker>In this article</Kicker>
    {title && <p className="article-contents-title">{title}</p>}
    <ol>
      {headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}
      {hasSources && <li><a href="#sources-heading">References</a></li>}
      <li><a href="#cite-this-article">Cite this article</a></li>
    </ol>
  </nav>;
}
