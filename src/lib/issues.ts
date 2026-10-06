import type { Post } from "@/lib/types";
export function journalIssues(posts: Post[]) {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const key = post.publishedAt?.slice(0, 7);
    if (key) groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  const keys = [...groups.keys()].sort();
  return keys.map(id => ({ id,
    volume: Number(id.slice(0, 4)) - Number(keys[0].slice(0, 4)) + 1,
    number: keys.filter(key => key.slice(0, 4) === id.slice(0, 4)).indexOf(id) + 1,
    label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${id}-01T00:00:00Z`)),
    posts: groups.get(id)!.sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!)),
  })).reverse();
}
export type JournalIssue = ReturnType<typeof journalIssues>[number];
