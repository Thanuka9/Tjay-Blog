import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { SubscribeForm } from "@/components/site/SubscribeForm";
import { journalIssues } from "@/lib/issues";
import { formatDate, site } from "@/lib/site";
import { listPublishedPosts } from "@/lib/store";
export default async function HomePage() {
  const issues = journalIssues(await listPublishedPosts());
  const current = issues[0];
  return <Container><section className="journal-masthead"><h1><i>The</i> Abyss</h1><p>{site.tagline}</p></section>
    {current ? <section className="current-issue"><div><Link href={`/issues/${current.id}`} aria-label={`Read ${current.label}`}><IssueCover issue={current} /></Link><a className="journal-download mt-6" href={`/api/download/issue/${current.id}`} download>↓ Download full journal (PDF)</a></div><div><div className="flex flex-wrap items-center gap-3"><span className="issue-badge">Current issue</span><span className="text-xs text-muted-foreground">Vol. {current.volume} | No. {current.number} · {current.label}</span></div><h2 className="mt-5 font-serif text-4xl">In this issue</h2>{current.posts.map(post => <article key={post.id} className="journal-entry"><Kicker>{post.topic.replace(/-/g, " ")}</Kicker><h3><Link href={`/articles/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><div className="flex flex-wrap items-center justify-between gap-3"><small>{formatDate(post.publishedAt)} · {post.readingTime} min read</small><a href={`/api/download/article/${post.slug}`} download className="text-xs font-medium hover:underline">↓ Article PDF</a></div></article>)}<Link href={`/issues/${current.id}`} className="mt-6 inline-block text-sm font-semibold">View the full issue →</Link></div></section> : <p className="py-16">The first issue is on its way. Subscribe to hear when it is published.</p>}
    <section className="journal-archive"><div className="mb-8 flex items-center justify-between"><h2 className="font-serif text-4xl">The archive</h2><Link href="/archive" className="text-sm">All issues →</Link></div><div className="grid grid-cols-2 gap-6 md:grid-cols-4">{issues.map(issue => <Link key={issue.id} href={`/issues/${issue.id}`} className="archive-item"><IssueCover issue={issue} /><h3>{issue.label}</h3><p>Vol. {issue.volume} | No. {issue.number}</p></Link>)}</div></section><section className="journal-newsletter"><div><h2 className="font-serif text-4xl">Science for everyone.<br />Free to read.</h2><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Get each article in your inbox when it is published. No paywall. Unsubscribe anytime.</p></div><SubscribeForm /></section></Container>;
}
