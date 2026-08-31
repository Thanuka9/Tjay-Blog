export const site = {
  name: "The Assay",
  tagline: "What the research actually says.",
  description:
    "A science journal for claims that move faster than the evidence. We read the studies so you can decide with more than a caption.",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Articles" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "About" },
];

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
