import type { JournalIssue } from "@/lib/issues";
export function IssueCover({ issue }: { issue: JournalIssue }) {
  return <div className="issue-cover"><p className="cover-date">Volume {issue.volume}, Number {issue.number}, {issue.label}</p><p className="cover-name"><i>The</i> Abyss</p><p className="cover-subtitle">A science journal for everyone</p><div className="cover-art" aria-hidden="true"><span /><span /><span /><span /><span /></div><div className="cover-contents"><span className="cover-number">{String(issue.number).padStart(2, "0")}</span><div>{issue.posts.map(post => <p key={post.id}>{post.title}</p>)}</div></div><p className="cover-footer">Sourced to research. Free to read.</p></div>;
}
