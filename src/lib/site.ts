export const site = {
  name: "The Abyss",
  tagline: "Below the headlines, into the evidence.",
  description:
    "A science journal for everyone. Monthly issues, evidence-led articles, and free journal downloads. Below the headlines, into the evidence.",
  supportingDescription: "A science journal for everyone",
};

export const nav = [
  { href: "/current-issue", label: "Current Issue" },
  { href: "/issues", label: "Archive" },
  { href: "/about", label: "About" },
  { href: "/newsletter", label: "Newsletter" },
];

export function publicationUrl() {
  return (process.env.SITE_URL || "https://theabyssos.com").replace(/\/$/, "");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(iso: string | null) {
  if (!iso) return "Unpublished";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function readingTimeFrom(content: string) {
  const text = content
    .replace(/:::chart[\s\S]*?:::/g, "")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}
