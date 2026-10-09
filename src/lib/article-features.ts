import type { AtAGlance, EvidenceLadder, PostMeta } from "@/lib/types";
import { extractHeadings } from "@/lib/headings";

// Editorial summaries of the existing peptide article, shared by web, editor and PDF.
const peptideSummary: AtAGlance = {
  known: "The studies discussed here range from cell and animal experiments to human trials. Collagen has human trial evidence for skin elasticity; results for one peptide do not establish benefits for another.",
  unknown: "The evidence reviewed does not establish long-term safety or a dosing standard for the unapproved injections discussed. Changes in cells or hormone levels do not establish longevity benefits.",
  watch: "Larger, independently run human trials with comparison groups, measured clinical outcomes and long-term follow-up. Check regulatory decisions separately from advisory recommendations.",
};
const peptideLadder: EvidenceLadder = {
  subject: "BPC-157",
  stage: "Animal studies",
  caption: "Most of the BPC-157 evidence described in this article comes from cell and animal research. The small human studies discussed lack placebo controls. This highlights the main body of evidence, rather than the highest study reported.",
  afterHeading: "bpc-157",
};

export function articleFeatures(post: Pick<PostMeta, "slug" | "atAGlance" | "evidenceLadder">) {
  const legacy = post.slug === "are-peptides-the-real-future-of-longevity";
  return {
    atAGlance: post.atAGlance === undefined ? (legacy ? peptideSummary : null) : post.atAGlance,
    evidenceLadder: post.evidenceLadder === undefined ? (legacy ? peptideLadder : null) : post.evidenceLadder,
  };
}

// Place a ladder after its chosen section. An absent/deleted section falls back to the start.
export function evidencePlacement(content: string, ladder?: EvidenceLadder | null) {
  const headings = extractHeadings(content);
  const index = headings.findIndex((heading) => heading.id === ladder?.afterHeading);
  return index < 0 ? { start: true, before: null, end: false } : {
    start: false, before: headings[index + 1]?.id ?? null, end: index === headings.length - 1,
  };
}
