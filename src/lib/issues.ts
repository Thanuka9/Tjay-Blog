import { site } from "@/lib/site";
import type { Issue, Post, PostMeta } from "@/lib/types";

export type JournalArticle = Post & {
  articleCode: string;
  articleType: string;
  sequence: number;
};
export type JournalIssue = Issue & { label: string; posts: JournalArticle[] };
export const issueLabel = (issue: Pick<Issue, "year" | "month">) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(issue.year, issue.month - 1, 1)));
export const issuePath = (issue: Pick<Issue, "year" | "month">) =>
  `/issues/${issue.year}/${String(issue.month).padStart(2, "0")}`;
export const articleIssueId = (post: PostMeta) =>
  post.issueId === undefined ? post.publishedAt?.slice(0, 7) : post.issueId;
export const articleCode = (issue: Issue, sequence: number) =>
  `AB-${issue.volume > 1 ? `${issue.volume}-` : ""}${String(issue.number).padStart(2, "0")}${String(sequence).padStart(2, "0")}`;

/** Older published posts remain accessible until an editor assigns formal issues. */
export function legacyIssues(posts: PostMeta[]): Issue[] {
  const keys = [
    ...new Set(
      posts.map(articleIssueId).filter((id): id is string => Boolean(id)),
    ),
  ].sort();
  return keys.map((id) => {
    const [year, month] = id.split("-").map(Number);
    return {
      id,
      year,
      month,
      volume: year - Number(keys[0].slice(0, 4)) + 1,
      number: keys.filter((key) => key.startsWith(`${year}-`)).indexOf(id) + 1,
      coverImage: null,
      editorLetter: "",
      editorName: site.name,
      coverDescription:
        "Abstract rings on a deep navy field represent looking beneath the headlines, into the evidence. Cover illustration by The Abyss.",
      fullIssuePdf: null,
      status: "published",
    };
  });
}

export function journalIssues(
  posts: Post[],
  metadata: Issue[] = legacyIssues(posts),
): JournalIssue[] {
  return metadata
    .filter((issue) => issue.status === "published")
    .map((issue) => ({
      ...issue,
      label: issueLabel(issue),
      posts: posts
        .filter(
          (post) =>
            post.status === "published" &&
            post.publishedAt &&
            articleIssueId(post) === issue.id,
        )
        .sort(
          (a, b) =>
            (a.sequence ?? Number.MAX_SAFE_INTEGER) -
              (b.sequence ?? Number.MAX_SAFE_INTEGER) ||
            a.publishedAt!.localeCompare(b.publishedAt!) ||
            a.id.localeCompare(b.id),
        )
        .map((post, index) => ({
          ...post,
          sequence: post.sequence ?? index + 1,
          articleCode:
            post.articleCode || articleCode(issue, post.sequence ?? index + 1),
          articleType:
            post.articleType ??
            (post.topic === "peptides" ? "Evidence Check" : "Research Article"),
        })),
    }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

function authorName(name: string, style: "apa" | "vancouver") {
  if (name === site.name || !name.includes(" ")) return name;
  return name
    .split(/\s*,\s*/)
    .map((author) => {
      const parts = author.trim().split(/\s+/);
      const surname = parts.pop()!;
      const initials = parts
        .map((part) => (style === "apa" ? `${part[0]}.` : part[0]))
        .join(style === "apa" ? " " : "");
      return style === "apa"
        ? `${surname}, ${initials}`
        : `${surname} ${initials}`;
    })
    .join(style === "apa" ? ", " : "; ");
}
export function journalCitations(post: PostMeta, issue?: Issue | null) {
  const year =
    issue?.year ??
    Number(post.publishedAt?.slice(0, 4) ?? new Date().getFullYear());
  const code =
    post.articleCode ?? (issue ? articleCode(issue, post.sequence ?? 1) : "");
  const plain = `${post.author}. ${post.title}. ${site.name}. ${year}${issue ? `;${issue.volume}(${issue.number}):${code}` : ""}.`;
  return {
    plain: post.citation || plain,
    vancouver:
      post.citation ||
      `${authorName(post.author, "vancouver")}. ${post.title}. ${site.name}. ${year}${issue ? `;${issue.volume}(${issue.number}):${code}` : ""}.`,
    apa: `${authorName(post.author, "apa")} (${year}). ${post.title}. ${site.name}${issue ? `, ${issue.volume}(${issue.number}), ${code}` : ""}.`,
  };
}
