import { notFound, redirect } from "next/navigation";
import { getPublishedIssue } from "@/lib/store";
import { issuePath } from "@/lib/issues";
export default async function OldIssueAddress({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getPublishedIssue(id);
  if (!issue) notFound();
  redirect(issuePath(issue));
}
