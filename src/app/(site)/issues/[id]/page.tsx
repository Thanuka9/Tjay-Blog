import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { journalIssues } from "@/lib/issues";
import { formatDate } from "@/lib/site";
import { listPublishedPosts } from "@/lib/store";
export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issues = journalIssues(await listPublishedPosts());
  const issue = id === "current" ? issues[0] : issues.find(item => item.id === id);
  if (!issue) notFound();
  return <Container className="py-12"><Link href="/archive" className="text-sm text-muted-foreground">Archive / {issue.id.slice(0, 4)} / Vol. {issue.volume}, No. {issue.number}</Link><h1 className="mt-6 font-serif text-5xl">{issue.label}</h1><p className="mt-3 text-sm">Vol. {issue.volume} | No. {issue.number}</p><div className="current-issue mt-10"><div><IssueCover issue={issue} /><a className="journal-download mt-6" href={`/api/download/issue/${issue.id}`} download>↓ Full issue (PDF)</a><a className="journal-download mt-3" href={`/api/download/contents/${issue.id}`} download>↓ Table of contents (PDF)</a></div><div><Kicker>From the journal</Kicker><p className="mt-4 mb-10 leading-8 text-muted-foreground">Below the headlines, into the evidence. Explore this issue’s published articles, follow the sources, and download the journal to read at your own pace.</p><h2 className="font-serif text-3xl">Table of contents</h2>{issue.posts.map(post => <article className="journal-entry" key={post.id}><Kicker>{post.topic.replace(/-/g, " ")}</Kicker><h3><Link href={`/articles/${post.slug}`}>{post.title}</Link></h3><p>{post.author} · {formatDate(post.publishedAt)}</p><a className="text-sm hover:underline" href={`/api/download/article/${post.slug}`} download>↓ Download article (PDF)</a></article>)}</div></div></Container>;
}
