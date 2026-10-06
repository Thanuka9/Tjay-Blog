import Link from "next/link";
import { listIssueMeta } from "@/lib/store";
import { issueLabel, issuePath } from "@/lib/issues";
export default async function IssuesPage() {
  const issues = await listIssueMeta();
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Journal issues</h1>
        <Link className="underline" href="/admin/issues/new">
          New issue
        </Link>
      </div>
      <div className="space-y-4">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-wrap items-center justify-between gap-4 border border-border p-5"
          >
            <div>
              <Link
                className="font-serif text-2xl"
                href={`/admin/issues/${issue.id}`}
              >
                {issueLabel(issue)}
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                Vol. {issue.volume} | No. {issue.number} · {issue.status}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <Link href={`/admin/issues/${issue.id}`}>Edit issue</Link>
              {issue.status === "published" && (
                <Link href={issuePath(issue)}>View issue</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
