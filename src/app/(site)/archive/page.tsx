import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { journalIssues } from "@/lib/issues";
import { listPublishedPosts } from "@/lib/store";
export const metadata = { title: "Archive" };
export default async function ArchivePage() {
  const issues = journalIssues(await listPublishedPosts());
  return <Container className="py-14"><Kicker>The journal</Kicker><h1 className="mt-4 mb-12 font-serif text-5xl">Archive</h1><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">{issues.map(issue => <div key={issue.id}><Link href={`/issues/${issue.id}`}><IssueCover issue={issue} /><h2 className="mt-6 font-serif text-2xl">{issue.label}</h2></Link><p className="mt-2 text-sm">Vol. {issue.volume} | No. {issue.number} · {issue.posts.length} articles</p><a className="journal-download mt-4" href={`/api/download/issue/${issue.id}`} download>↓ Full journal (PDF)</a></div>)}</div>{!issues.length && <p>No issues published yet.</p>}</Container>;
}
