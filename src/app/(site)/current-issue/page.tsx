import { redirect } from "next/navigation";
import { Container } from "@/components/site/layout";
import { issuePath } from "@/lib/issues";
import { getPublishedIssue } from "@/lib/store";
export default async function CurrentIssue() {
  const issue = await getPublishedIssue("current");
  if (issue) redirect(issuePath(issue));
  return (
    <Container className="py-16">The first issue is on its way.</Container>
  );
}
