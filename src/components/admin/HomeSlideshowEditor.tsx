"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { saveHomeAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { HomeSettings, PostMeta } from "@/lib/types";

export function HomeSlideshowEditor({
  settings,
  posts,
}: {
  settings: HomeSettings;
  posts: PostMeta[];
}) {
  const router = useRouter();
  const [source, setSource] = useState<HomeSettings["source"]>(settings.source);
  const [ids, setIds] = useState(settings.postIds);
  const [pending, setPending] = useState(false);

  const selected = ids
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is PostMeta => Boolean(post));
  const available = posts.filter((post) => !ids.includes(post.id));

  function add(id: string) {
    if (ids.length >= 5 || ids.includes(id)) return;
    setIds([...ids, id]);
  }

  function move(id: string, direction: -1 | 1) {
    const index = ids.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    const next = [...ids];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setIds(next);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const form = new FormData();
        form.set("source", source);
        for (const id of ids) form.append("postIds", id);
        const result = await saveHomeAction(form);
        setPending(false);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Home slideshow saved");
        router.refresh();
      }}
    >
      <div className="space-y-3">
        <Label>What appears on the home page</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 has-checked:border-foreground/40">
            <input
              type="radio"
              name="source"
              className="mt-1"
              checked={source === "latest"}
              onChange={() => setSource("latest")}
            />
            <span>
              <span className="block font-medium">Latest 5 articles</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                The five newest published pieces, in date order.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 has-checked:border-foreground/40">
            <input
              type="radio"
              name="source"
              className="mt-1"
              checked={source === "selected"}
              onChange={() => setSource("selected")}
            />
            <span>
              <span className="block font-medium">Hand-picked slides</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Choose up to five published pieces and set their order.
              </span>
            </span>
          </label>
        </div>
      </div>

      {source === "selected" ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium">
              Slideshow order ({selected.length}/5)
            </p>
            {selected.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Add published articles from the list on the right.
              </p>
            ) : (
              <ol className="space-y-2">
                {selected.map((post, index) => (
                  <li
                    key={post.id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="w-6 text-sm text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {post.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(post.id, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(post.id, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIds(ids.filter((id) => id !== post.id))}
                      aria-label="Remove from slideshow"
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Published articles</p>
            <ul className="space-y-2">
              {available.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  {posts.length === 0
                    ? "Publish a piece first."
                    : "All published pieces are already in the slideshow."}
                </li>
              ) : (
                available.map((post) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm">{post.title}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={ids.length >= 5}
                      onClick={() => add(post.id)}
                    >
                      <Plus />
                      Add
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : (
        <ol className="space-y-2">
          {posts.slice(0, 5).map((post, index) => (
            <li
              key={post.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span className="w-6 text-muted-foreground">{index + 1}</span>
              <span className="truncate">{post.title}</span>
            </li>
          ))}
        </ol>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save slideshow"}
      </Button>
    </form>
  );
}
