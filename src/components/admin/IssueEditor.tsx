"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveIssueAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { articleIssueId } from "@/lib/issues";
import { ARTICLE_TYPES, type Issue, type PostMeta } from "@/lib/types";

export function IssueEditor({
  issue,
  posts,
  existing = false,
}: {
  issue: Issue;
  posts: PostMeta[];
  existing?: boolean;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(issue.month);
  const [year, setYear] = useState(issue.year);
  const [cover, setCover] = useState(issue.coverImage || "");
  const [upcoming, setUpcoming] = useState(issue.upcomingArticles || []);
  const [selected, setSelected] = useState(
    posts
      .filter((post) => articleIssueId(post) === issue.id)
      .sort(
        (a, b) =>
          (a.sequence ?? 999) - (b.sequence ?? 999) ||
          (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
      )
      .map((post) => post.id),
  );
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const id = `${year}-${String(month).padStart(2, "0")}`;
  function move(index: number, offset: number) {
    const next = [...selected];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  }
  return (
    <form
      className="max-w-4xl space-y-7"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage("");
        const data = new FormData(event.currentTarget);
        const intent = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        data.set("status", intent?.value || issue.status);
        try {
          const result = await saveIssueAction(data);
          if (!result.ok) setMessage(result.message);
          else {
            router.push(`/admin/issues/${result.id}`);
            router.refresh();
            setMessage("Issue saved.");
          }
        } catch {
          setMessage("Could not save. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="coverImage" value={cover} />
      <input type="hidden" name="upcomingArticles" value={JSON.stringify(upcoming)} />
      <details className="border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Upcoming articles ({upcoming.length})</summary>
        <div className="mt-4 space-y-4">
          {upcoming.map((item, index) => <fieldset key={index} className="space-y-2 border-b border-border pb-4">
            <legend className="text-sm">Upcoming article {index + 1}</legend>
            {([ ["title", "Title"], ["excerpt", "Excerpt"], ["articleCode", "Article number"] ] as const).map(([key, label]) => <div key={key}>
              <Label htmlFor={`upcoming-${index}-${key}`}>{label}</Label>
              <Input id={`upcoming-${index}-${key}`} value={item[key]} required={key !== "excerpt"} onChange={(event) => setUpcoming(upcoming.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry))} />
            </div>)}
            <Label htmlFor={`upcoming-${index}-type`}>Article type</Label>
            <select id={`upcoming-${index}-type`} value={item.articleType} onChange={(event) => setUpcoming(upcoming.map((entry, i) => i === index ? { ...entry, articleType: event.target.value as typeof item.articleType } : entry))}>{ARTICLE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <Button type="button" variant="outline" onClick={() => setUpcoming(upcoming.filter((_, i) => i !== index))}>Remove upcoming article</Button>
          </fieldset>)}
          <Button type="button" variant="outline" onClick={() => setUpcoming([...upcoming, { title: "", excerpt: "", articleCode: "", articleType: "Explainer" }])}>Add upcoming article</Button>
        </div>
      </details>
      {selected.map((postId) => (
        <input key={postId} type="hidden" name="postIds" value={postId} />
      ))}
      <div className="grid gap-5 sm:grid-cols-4">
        <div>
          <Label htmlFor="volume">Volume</Label>
          <Input
            id="volume"
            name="volume"
            type="number"
            min={1}
            defaultValue={issue.volume}
            required
          />
        </div>
        <div>
          <Label htmlFor="number">Issue number</Label>
          <Input
            id="number"
            name="number"
            type="number"
            min={1}
            max={99}
            defaultValue={issue.number}
            required
          />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            type="number"
            min={2000}
            max={2200}
            value={year}
            readOnly={existing}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="month">Month</Label>
          <Input
            id="month"
            name="month"
            type="number"
            min={1}
            max={12}
            value={month}
            readOnly={existing}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="editorName">Editor</Label>
        <Input
          id="editorName"
          name="editorName"
          defaultValue={issue.editorName}
          required
        />
      </div>
      <div>
        <Label htmlFor="editorLetter">From the Editor</Label>
        <Textarea
          id="editorLetter"
          name="editorLetter"
          defaultValue={issue.editorLetter}
          rows={7}
          placeholder="Introduce the issue and what connects its articles."
        />
      </div>
      <div>
        <Label htmlFor="coverUpload">Cover image</Label>
        <Input
          id="coverUpload"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const body = new FormData();
              body.set("file", file);
              body.set("folder", "covers");
              const r = await fetch("/api/upload", { method: "POST", body });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error || "Upload failed");
              setCover(data.url);
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Upload failed",
              );
            } finally {
              setUploading(false);
            }
          }}
        />
        {cover && (
          <div className="mt-3">
            <p className="break-all text-xs text-muted-foreground">{cover}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCover("")}
            >
              Use the journal illustration
            </Button>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="coverDescription">About the cover / image credit</Label>
        <Textarea
          id="coverDescription"
          name="coverDescription"
          defaultValue={issue.coverDescription}
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="fullIssuePdf">Full issue PDF URL (optional)</Label>
        <Input
          id="fullIssuePdf"
          name="fullIssuePdf"
          type="url"
          defaultValue={issue.fullIssuePdf || ""}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Leave blank to generate the full issue from the article content. An
          external PDF must be kept up to date by the editor.
        </p>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Articles in reading order</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select articles below. Only published articles appear publicly. Moving
          an article into this issue replaces its previous issue assignment.
        </p>
        <ol className="my-4 space-y-2">
          {selected.map((postId, index) => (
            <li
              key={postId}
              className="flex items-center justify-between gap-3 border border-border p-3"
            >
              <span>
                {index + 1}. {posts.find((post) => post.id === postId)?.title}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move article up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move article down"
                >
                  ↓
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <div className="space-y-3">
          {posts.map((post) => (
            <label key={post.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(post.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, post.id]
                      : selected.filter((id) => id !== post.id),
                  )
                }
              />
              <span>
                {post.title}{" "}
                <small className="text-muted-foreground">({post.status})</small>
              </span>
            </label>
          ))}
        </div>
      </section>
      <p role="status" className="text-sm">
        {message}
      </p>
      <div className="flex gap-3">
        <Button
          type="submit"
          value="draft"
          variant="outline"
          disabled={pending || uploading}
        >
          Save draft issue
        </Button>
        <Button type="submit" value="published" disabled={pending || uploading}>
          Save and publish issue
        </Button>
      </div>
    </form>
  );
}
