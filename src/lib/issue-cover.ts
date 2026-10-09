import type { Issue } from "@/lib/types";

const isFirstIssue = (issue: Issue) => issue.volume === 1 && issue.number === 1;

export function issueCoverImage(issue: Issue) {
  return issue.coverImage || (isFirstIssue(issue) ? "/covers/insulin-crystals.webp" : null);
}

export function issueCoverDescription(issue: Issue) {
  if (issue.coverImage) return issue.coverDescription || "This month’s research and articles.";
  if (isFirstIssue(issue)) {
    return "Crystals of insulin, the first peptide to become a medicine and the standard against which the peptides in this issue’s Evidence Check are measured. A new kind of insulin can modify its activity in response to glucose levels in the blood. Credit: Antonio Romero / Science Photo Library.";
  }
  return issue.coverDescription || "The issue cover introduces this month’s research and articles.";
}
