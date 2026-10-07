import { notFound } from "next/navigation";
import { IssueEditor } from "@/components/admin/IssueEditor";
import { listPostMeta, listIssueMeta } from "@/lib/store";
import { issueLabel } from "@/lib/issues";
export default async function EditIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [posts, issues] = await Promise.all([listPostMeta(), listIssueMeta()]);
  const issue = issues.find((issue) => issue.id === id);
  if (!issue) notFound();
  return (
    <div>
      <h1 className="mb-8 font-serif text-3xl">Edit {issueLabel(issue)}</h1>
      <IssueEditor key={issue.id} issue={issue} posts={posts} existing />
    </div>
  );
}
