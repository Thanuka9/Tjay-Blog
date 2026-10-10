export type Citation = {
  id: number;
  title: string;
  detail: string;
  url: string;
};

export const CITATIONS_BY_SLUG: Record<string, Citation[]> = {
  "are-peptides-the-real-future-of-longevity": [
    {
      id: 1,
      title: "Ashraf AR et al. Multifactor quality and safety analysis of semaglutide products sold by online sellers without a prescription. J Med Internet Res, 2024.",
      detail: "",
      url: "https://doi.org/10.2196/65440",
    },
    {
      id: 2,
      title: "Taylor M, reviewed by Cohen P. Peptides: what they are, potential benefits, and safety concerns. Harvard Health Publishing, July 7, 2026.",
      detail: "",
      url: "",
    },
    {
      id: 3,
      title: "U.S. FDA. Bulk drug substances nominated for use in compounding under section 503A, categories update of May 14, 2026.",
      detail: "",
      url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-used-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
    },
    {
      id: 4,
      title: "Mavrych V, Shypilova I, Bolgova O. Therapeutic peptides in gerontology: mechanisms and applications for healthy aging. Front Aging, 2026.",
      detail: "",
      url: "https://doi.org/10.3389/fragi.2026.1790247",
    },
    {
      id: 5,
      title: "Pickart L, Margolina A. Regenerative and protective actions of the GHK-Cu peptide in the light of the new gene data. Int J Mol Sci, 2018.",
      detail: "",
      url: "https://doi.org/10.3390/ijms19071987",
    },
    {
      id: 6,
      title: "Latini L et al. Clinical evidence for low-molecular-weight collagen peptides in tendon and ligament tears: a systematic review. Front Med, 2026.",
      detail: "",
      url: "https://doi.org/10.3389/fmed.2026.1891011",
    },
    {
      id: 7,
      title: "Dakhovnik A et al. A collagen amino acid composition supplementation reduces biological age in humans and increases health and lifespan in vivo. npj Aging, 2025.",
      detail: "",
      url: "https://doi.org/10.1038/s41514-025-00280-7",
    },
    {
      id: 8,
      title: "Tepes M et al. Stable gastric pentadecapeptide BPC 157 therapy: effect on reperfusion following maintained intra-abdominal hypertension in rats. Pharmaceuticals, 2023.",
      detail: "",
      url: "https://doi.org/10.3390/ph16111554",
    },
    {
      id: 9,
      title: "Hsieh MJ et al. Modulatory effects of BPC 157 on vasomotor tone and the activation of Src-Caveolin-1-endothelial nitric oxide synthase pathway. Sci Rep 10:17078, 2020.",
      detail: "",
      url: "https://doi.org/10.1038/s41598-020-74022-y",
    },
    {
      id: 10,
      title: "Mayfield CK et al. Injectable peptide therapy: a primer for orthopaedic and sports medicine physicians. Am J Sports Med 54(1):223–229, 2026.",
      detail: "",
      url: "https://doi.org/10.1177/03635465251357593",
    },
  ],
};

export function linkCitations(markdown: string) {
  return markdown.replace(
    /\[(\d+)\](?!\()/g,
    (_match, id: string) => `[${id}](#ref-${id})`,
  );
}
