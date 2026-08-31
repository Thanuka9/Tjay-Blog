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
      title:
        "Multifactor quality and safety analysis of semaglutide products sold by online sellers without a prescription",
      detail:
        "Journal of Medical Internet Research, 2024. Purity 7.7–14.37% vs a 99% label claim; endotoxin in every sample.",
      url: "https://www.jmir.org/2024/1/e65440/",
    },
    {
      id: 2,
      title: "BPC 157 and blood vessels",
      detail:
        "Current Pharmaceutical Design. Nitric oxide release in rat vessels and human endothelial cells — not a human gut trial.",
      url: "https://pubmed.ncbi.nlm.nih.gov/24914725/",
    },
    {
      id: 3,
      title: "Stable gastric pentadecapeptide BPC 157: novel therapy in gastrointestinal tract",
      detail:
        "Current Pharmaceutical Design. The animal-study record, mostly from one research group, plus the thin human case series.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22967278/",
    },
    {
      id: 4,
      title:
        "Oral supplementation of specific collagen peptides has beneficial effects on human skin physiology",
      detail:
        "Skin Pharmacology and Physiology, 2014. Double-blind, placebo-controlled trial in 69 women, 2.5–5 g/day for 8 weeks.",
      url: "https://doi.org/10.1159/000351376",
    },
    {
      id: 5,
      title: "The human skin collagenome and GHK-Cu as a gene modulator",
      detail:
        "BioMed Research International / Pickart et al. Gene-expression work suggesting GHK-Cu can affect a large share of human genes in cell systems.",
      url: "https://doi.org/10.1155/2015/648108",
    },
    {
      id: 6,
      title:
        "Prolonged stimulation of GH and IGF-I secretion by CJC-1295 in healthy adults",
      detail:
        "Journal of Clinical Endocrinology & Metabolism, 2006. Teichman et al. Hormone levels, not muscle or fat outcomes. Ages 21–61, 28–49 days.",
      url: "https://doi.org/10.1210/jc.2005-1536",
    },
    {
      id: 7,
      title: "Ipamorelin, a new growth-hormone-releasing peptide",
      detail:
        "European Journal of Endocrinology, 1998. Raun et al. Rat pituitary cells and pigs. No published human efficacy data.",
      url: "https://pubmed.ncbi.nlm.nih.gov/9867108/",
    },
    {
      id: 8,
      title: "Bulk drug substances used in compounding under section 503A",
      detail:
        "U.S. FDA. Category 2 covers substances that raise significant safety concerns, including BPC-157, injectable GHK-Cu, CJC-1295, and ipamorelin (September 2023 update).",
      url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-used-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
    },
    {
      id: 9,
      title: "WADA Prohibited List",
      detail:
        "World Anti-Doping Agency. BPC-157 is banned in competitive sport.",
      url: "https://www.wada-ama.org/en/prohibited-list",
    },
    {
      id: 10,
      title: "FDA advisory committee votes on peptides: what it does and doesn’t do",
      detail:
        "Mintz, July 2026. PCAC recommended BPC-157 for the 503A bulks list, against FDA staff’s recommendation. The vote is not an approval.",
      url: "https://www.mintz.com/insights-center/viewpoints/2146/2026-07-29-fdas-advisory-committee-votes-peptides-what-it-does-and",
    },
  ],
};

export function linkCitations(markdown: string) {
  return markdown.replace(
    /\[(\d+)\](?!\()/g,
    (_match, id: string) => `[${id}](#ref-${id})`,
  );
}
