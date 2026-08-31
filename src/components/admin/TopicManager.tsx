"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTopicAction, saveTopicAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Topic } from "@/lib/types";

export function TopicManager({
  topics,
  counts,
}: {
  topics: Topic[];
  counts: Record<string, number>;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        {topics.map((topic) => (
          <form
            key={topic.slug}
            className="rounded-xl border border-border p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await saveTopicAction(new FormData(event.currentTarget));
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("Topic updated");
              router.refresh();
            }}
          >
            <input type="hidden" name="slug" value={topic.slug} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                /topics/{topic.slug}
              </p>
              <p className="text-xs text-muted-foreground">
                {counts[topic.slug] ?? 0}{" "}
                {(counts[topic.slug] ?? 0) === 1 ? "article" : "articles"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <Input name="name" defaultValue={topic.name} required />
              <Textarea
                name="description"
                defaultValue={topic.description}
                className="min-h-20"
                required
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  const body = new FormData();
                  body.set("slug", topic.slug);
                  const result = await deleteTopicAction(body);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Topic removed");
                  router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </form>
        ))}
      </div>

      <form
        className="h-fit space-y-4 rounded-xl border border-border p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const result = await saveTopicAction(new FormData(form));
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Topic added to the index");
          form.reset();
          router.refresh();
        }}
      >
        <h2 className="font-serif text-xl">Add a topic</h2>
        <p className="text-sm text-muted-foreground">
          New subjects show up in the header, footer, and home index.
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" name="name" placeholder="Sleep" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-description">Description</Label>
          <Textarea
            id="new-description"
            name="description"
            placeholder="What this subject is actually testing."
            className="min-h-24"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Add to the index
        </Button>
      </form>
    </div>
  );
}
