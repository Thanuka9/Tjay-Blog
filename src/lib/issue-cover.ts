import type { Issue } from "@/lib/types";

const isFirstIssue = (issue: Issue) => issue.volume === 1 && issue.number === 1;

export function issueCoverImage(issue: Issue) {
  // Issue 02 uses the photographed 2019 creatine crystals supplied with
  // the editorial cover, issue, home and archive HTML references.
  // Resolve the issue by identity so a stale CMS cover path cannot
  // override the correct artwork on one of the shared routes.
  if (issue.year === 2026 && issue.month === 11 &&
      issue.volume === 1 && issue.number === 2) {
    return "/covers/creatine-crystals-urine-2019.jpg";
  }
  if (issue.coverImage === "/covers/creatine-crystals-1853.jpg" ||
      issue.coverImage === "/covers/creatine-figures-1-2.jpg") {
    return "/covers/creatine-crystals-urine-2019.jpg";
  }
  return issue.coverImage || (isFirstIssue(issue) ? "/covers/insulin-crystals.webp" : null);
}

export function issueCoverDescription(issue: Issue) {
  if (issue.year === 2026 && issue.month === 11 &&
      issue.volume === 1 && issue.number === 2) {
    return "Creatine crystals in a urine sample, seen under the microscope. They came from a 39-year-old woman in Paris whose blood tests suggested kidney failure, although her kidneys were working normally. Her blood creatine was about 28 times the upper limit of normal, enough to throw off some lab tests for creatinine. Her doctors suspect the homemade milkshakes a friend gave her every day. It was the first report of creatine crystals in urine, and a very rare one: the authors write that creatine dissolves easily in the body and is unlikely to harm the kidneys this way.";
  }
  if (issue.coverImage) return issue.coverDescription || "This month’s research and articles.";
  if (isFirstIssue(issue)) {
    return "Crystals of insulin, the first peptide to become a medicine and the standard against which the peptides in this issue’s Evidence Check are measured. A new kind of insulin can modify its activity in response to glucose levels in the blood. Credit: Antonio Romero / Science Photo Library.";
  }
  return issue.coverDescription || "The issue cover introduces this month’s research and articles.";
}
