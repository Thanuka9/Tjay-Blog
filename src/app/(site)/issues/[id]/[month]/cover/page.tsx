import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/layout";
import { IssueCover } from "@/components/site/IssueCover";
import { getPublishedIssue } from "@/lib/store";
import { issuePath } from "@/lib/issues";

type Props = { params: Promise<{ id: string; month: string }> };
async function load({ params }: Props) {
  const { id, month } = await params;
  if (!/^\d{4}$/.test(id) || !/^(0[1-9]|1[0-2])$/.test(month)) return null;
  return getPublishedIssue(`${id}-${month}`);
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const issue = await load(props);
  return issue ? { title: `${issue.label} cover`, alternates: { canonical: `${issuePath(issue)}/cover` } } : {};
}
export default async function IssueCoverPage(props: Props) {
  const issue = await load(props);
  if (!issue) notFound();
  return <Container className="cover-page">
    <div className="cover-page-nav">
      <Link href={issuePath(issue)}>&larr; Back to {issue.label}</Link>
      <a href={`${issuePath(issue)}/download`} download>Download full issue (PDF) &darr;</a>
    </div>
    <h1 className="sr-only">{issue.label} cover</h1>
    <IssueCover issue={issue} variant="full" />
  </Container>;
}
