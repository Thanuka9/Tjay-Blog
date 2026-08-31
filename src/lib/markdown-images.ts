export function parseBodyImages(markdown: string) {
  return [...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map((match) => ({
    alt: match[1],
    src: match[2],
  }));
}
