"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Globe, ImagePlus, Save, X } from "lucide-react";
import { savePostAction } from "@/app/admin/actions";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleAtAGlance } from "@/components/article/ArticleFeatures";
import { articleFeatures } from "@/lib/article-features";
import { extractHeadings } from "@/lib/headings";
import { SourceList } from "@/components/article/SourceList";
import { CITATIONS_BY_SLUG } from "@/lib/citations";
import { ChartBuilder } from "@/components/admin/ChartBuilder";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isImageFile } from "@/lib/image-files";
import { parseBodyImages } from "@/lib/markdown-images";
import { slugify } from "@/lib/site";
import {
  ARTICLE_TYPES,
  EVIDENCE_STAGES,
  type EvidenceLadder,
  type Issue,
  type PostMeta,
  type Topic,
} from "@/lib/types";
import { issueLabel } from "@/lib/issues";
import { cn } from "@/lib/utils";
import Link from "next/link";

type EditorPost = Pick<
  PostMeta,
  | "issueId"
  | "articleCode"
  | "articleType"
  | "sequence"
  | "articlePdf"
  | "citation"
  | "atAGlance"
  | "evidenceLadder"
> & {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  topic: string;
  tags: string[];
  author: string;
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

export function PostEditor({
  post,
  topics,
  issues = [],
}: {
  post: EditorPost;
  topics: Topic[];
  issues?: Issue[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const initialFeatures = articleFeatures(post);
  const [summaryEnabled, setSummaryEnabled] = useState(Boolean(initialFeatures.atAGlance));
  const [summary, setSummary] = useState(initialFeatures.atAGlance || { known: "", unknown: "", watch: "" });
  const [ladderEnabled, setLadderEnabled] = useState(Boolean(initialFeatures.evidenceLadder));
  const [ladder, setLadder] = useState<EvidenceLadder>(initialFeatures.evidenceLadder || { subject: "", stage: "Cell and lab studies", caption: "", afterHeading: "" });
  const [articleType, setArticleType] = useState(post.articleType || "Research Article");
  const [content, setContent] = useState(post.content);
  const [coverImage, setCoverImage] = useState(post.coverImage ?? "");
  const [featured, setFeatured] = useState(post.featured);
  const [topic, setTopic] = useState(post.topic);
  const [status, setStatus] = useState(post.status);
  const [caption, setCaption] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [pending, setPending] = useState<"draft" | "published" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const bodyImages = parseBodyImages(content);
  const charts = parseCharts(content);
  const references = CITATIONS_BY_SLUG[slug] || [];

  async function uploadFile(
    file: File,
    folder: "covers" | "articles" = "articles",
  ) {
    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);
    const response = await fetch("/api/upload", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    const text = await response.text();
    let data: { url?: string; error?: string } = {};
    try {
      data = JSON.parse(text) as { url?: string; error?: string };
    } catch {
      data = {};
    }
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? `Upload failed (${response.status})`);
    }
    return data.url;
  }

  function insertAtCursor(snippet: string) {
    const field = contentRef.current;
    if (!field) {
      setContent((value) => `${value}${snippet}`);
      return;
    }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      field.focus();
      const cursor = start + snippet.length;
      field.setSelectionRange(cursor, cursor);
    });
  }

  async function insertImages(files: FileList | File[]) {
    const list = [...files].filter(isImageFile);
    if (list.length === 0) {
      toast.error("Choose a jpg, png, webp, gif, svg, or avif.");
      return;
    }
    setUploading(true);
    try {
      let source = content;
      const field = contentRef.current;
      let cursor = field?.selectionStart ?? source.length;
      for (const file of list) {
        const url = await uploadFile(file);
        const alt =
          caption.trim() ||
          file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        const snippet = `\n\n![${alt}](${url})\n\n`;
        source = source.slice(0, cursor) + snippet + source.slice(cursor);
        cursor += snippet.length;
      }
      setContent(source);
      setCaption("");
      requestAnimationFrame(() => {
        if (!contentRef.current) return;
        contentRef.current.focus();
        contentRef.current.setSelectionRange(cursor, cursor);
      });
      toast.success(
        list.length === 1
          ? "Image added to the article body"
          : `${list.length} images added to the article body`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function persist(nextStatus: EditorPost["status"]) {
    const formEl = formRef.current;
    if (!formEl) return;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      toast.error("Complete the required article fields before saving.");
      return;
    }
    const liveContent = contentRef.current?.value || content;
    setPending(nextStatus);
    const form = new FormData(formEl);
    form.set("title", (title || String(form.get("title") ?? "")).trim());
    form.set("slug", slug || slugify(title || String(form.get("title") ?? "")));
    form.set("excerpt", (excerpt || String(form.get("excerpt") ?? "")).trim());
    form.set("content", liveContent);
    form.set("coverImage", coverImage);
    form.set("topic", topic);
    form.set("status", nextStatus);
    form.set("featured", featured ? "true" : "false");
    const result = await savePostAction(form);
    setPending(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setStatus(nextStatus);
    toast.success(
      nextStatus === "published"
        ? "Published — it is live on the site"
        : "Draft saved",
    );
    router.push(`/admin/posts/${result.id}`);
    router.refresh();
  }

  return (
    <>
      <form
        ref={formRef}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
        onSubmit={(event) => {
          event.preventDefault();
          void persist(status);
        }}
      >
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="coverImage" value={coverImage} />
        <input type="hidden" name="topic" value={topic} />
        <input type="hidden" name="status" value={status} />
        <input
          type="hidden"
          name="featured"
          value={featured ? "true" : "false"}
        />
        <input type="hidden" name="content" value={content} />
        <input type="hidden" name="atAGlance" value={JSON.stringify(summaryEnabled ? summary : null)} />
        <input type="hidden" name="evidenceLadder" value={JSON.stringify(ladderEnabled ? ladder : null)} />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Headline</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!post.slug) setSlug(slugify(event.target.value));
              }}
              placeholder="Are peptides the real future of longevity?"
              className="h-11 font-serif text-lg"
              required
            />
          </div>
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">Article summary and evidence ladder</summary>
            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">At a glance</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={summaryEnabled} onChange={(event) => setSummaryEnabled(event.target.checked)} />Show At a glance</label>
              {summaryEnabled && ([ ["known", "What we know"], ["unknown", "What we don’t know"], ["watch", "What to watch"] ] as const).map(([key, label]) => <div key={key} className="space-y-2">
                <Label htmlFor={`summary-${key}`}>{label}</Label>
                <Textarea id={`summary-${key}`} value={summary[key]} maxLength={1200} required onChange={(event) => setSummary({ ...summary, [key]: event.target.value })} />
              </div>)}
            </fieldset>
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Evidence ladder</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ladderEnabled} onChange={(event) => setLadderEnabled(event.target.checked)} />Show evidence ladder</label>
              {ladderEnabled && <>
                <Label htmlFor="evidence-subject">Subject</Label>
                <Input id="evidence-subject" value={ladder.subject} maxLength={160} required onChange={(event) => setLadder({ ...ladder, subject: event.target.value })} />
                <Label htmlFor="evidence-stage">Main body of evidence</Label>
                <select id="evidence-stage" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={ladder.stage} onChange={(event) => setLadder({ ...ladder, stage: event.target.value as EvidenceLadder["stage"] })}>
                  {EVIDENCE_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
                <Label htmlFor="evidence-position">Place after section</Label>
                <select id="evidence-position" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={ladder.afterHeading || ""} onChange={(event) => setLadder({ ...ladder, afterHeading: event.target.value })}>
                  <option value="">Before article body</option>
                  {extractHeadings(content).map((heading) => <option key={heading.id} value={heading.id}>{heading.text}</option>)}
                </select>
                <Label htmlFor="evidence-caption">Figure caption</Label>
                <Textarea id="evidence-caption" value={ladder.caption} maxLength={1600} required onChange={(event) => setLadder({ ...ladder, caption: event.target.value })} />
                <p className="text-xs text-muted-foreground">Describe the evidence for this subject and its limitations. The ladder represents study stages, not a numerical score.</p>
              </>}
            </fieldset>
          </details>
          <Tabs defaultValue="write">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Caption for next image"
                  className="h-8 w-48 text-sm"
                />
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "relative cursor-pointer",
                    uploading && "pointer-events-none opacity-50",
                  )}
                >
                  <ImagePlus />
                  {uploading ? "Uploading…" : "Add images"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,.jpg,.jpeg,.png,.webp,.gif,.svg,.avif"
                    multiple
                    disabled={uploading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => {
                      const files = [...(event.target.files ?? [])];
                      event.target.value = "";
                      if (files.length) void insertImages(files);
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setChartOpen(true)}
                >
                  <BarChart3 />
                  Chart
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Put the cursor where the photo should appear, then click Add
              images, paste, or drop files onto the editor. You can select
              several at once. The caption field becomes the line under the
              photo; leave it blank to use the file name.
            </p>
            <TabsContent
              value="write"
              forceMount
              className="data-inactive:hidden data-[state=inactive]:hidden"
            >
              <Textarea
                ref={contentRef}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onPaste={(event) => {
                  const files = [...event.clipboardData.files].filter(
                    isImageFile,
                  );
                  if (files.length === 0) return;
                  event.preventDefault();
                  void insertImages(files);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void insertImages(event.dataTransfer.files);
                }}
                className={cn(
                  "min-h-[min(70vh,44rem)] font-mono text-sm leading-6",
                  dragging && "ring-2 ring-brand/40",
                )}
                placeholder="Write in Markdown. Add images from the toolbar or drop them here."
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="journal-theme article-editor-preview border border-border bg-background p-6 sm:p-10">
                <header className="journal-article-heading">
                  <p className="journal-kicker uppercase">{articleType}</p>
                  <h1>{title || "Untitled article"}</h1>
                  {excerpt && <p className="article-deck">{excerpt}</p>}
                </header>
                <ArticleAtAGlance summary={summaryEnabled ? summary : null} />
                <ArticleBody content={content || "*Nothing to preview yet.*"} citationIds={references.map((reference) => reference.id)} evidenceLadder={ladderEnabled ? ladder : null} />
                <SourceList citations={references} />
              </div>
            </TabsContent>
          </Tabs>
          {bodyImages.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                Images in this article ({bodyImages.length})
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {bodyImages.map((image, index) => (
                  <figure
                    key={`${image.src}-${index}`}
                    className="overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-20 w-full object-cover"
                    />
                    {image.alt ? (
                      <figcaption className="truncate px-1.5 py-1 text-[11px] text-muted-foreground">
                        {image.alt}
                      </figcaption>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full rounded-none text-destructive"
                      onClick={() => {
                        setContent((value) =>
                          removeNthMatch(value, imagePattern(), index),
                        );
                        toast.success(
                          "Image removed. Save the post to keep this.",
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
          {charts.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                Charts in this article ({charts.length})
              </p>
              <ul className="space-y-2">
                {charts.map((chart, index) => (
                  <li
                    key={`${chart}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm">{chart}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setContent((value) =>
                          removeNthMatch(value, chartPattern(), index),
                        );
                        toast.success(
                          "Chart removed. Save the post to keep this.",
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="space-y-2">
            <Label>On the site</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={status === "draft" ? "default" : "outline"}
                className="w-full"
                onClick={() => setStatus("draft")}
              >
                Draft
              </Button>
              <Button
                type="button"
                variant={status === "published" ? "default" : "outline"}
                className="w-full"
                onClick={() => setStatus("published")}
              >
                Published
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {status === "published"
                ? "This article will appear on the site and in its issue when that issue is published."
                : "Drafts stay in the editor desk until you publish."}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium">Featured</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Leads the articles page. Only one piece stays featured.
              </p>
            </div>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">
              Journal metadata
            </legend>
            <Label htmlFor="issueId">Issue</Label>
            <select
              id="issueId"
              name="issueId"
              defaultValue={
                post.issueId === null
                  ? ""
                  : post.issueId ||
                    ("publishedAt" in post &&
                    typeof post.publishedAt === "string"
                      ? post.publishedAt.slice(0, 7)
                      : "")
              }
              className="w-full rounded border border-border bg-background p-2 text-sm"
            >
              <option value="">Unassigned</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issueLabel(issue)} · {issue.status}
                </option>
              ))}
            </select>
            <Label htmlFor="articleType">Article type</Label>
            <select
              id="articleType"
              name="articleType"
              value={articleType}
              onChange={(event) => setArticleType(event.target.value as typeof articleType)}
              className="w-full rounded border border-border bg-background p-2 text-sm"
            >
              {ARTICLE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <Label htmlFor="articleCode">Article number</Label>
            <Input
              id="articleCode"
              name="articleCode"
              defaultValue={post.articleCode || ""}
              placeholder="AB-0101 (automatic if blank)"
            />
            <Label htmlFor="sequence">Reading order</Label>
            <Input
              id="sequence"
              name="sequence"
              type="number"
              min={1}
              max={999}
              defaultValue={post.sequence}
            />
            <Label htmlFor="articlePdf">Article PDF URL (optional)</Label>
            <Input
              id="articlePdf"
              name="articlePdf"
              type="url"
              defaultValue={post.articlePdf || ""}
            />
            <Label htmlFor="citation">Custom citation (optional)</Label>
            <Textarea
              id="citation"
              name="citation"
              defaultValue={post.citation || ""}
            />
            <Link href="/admin/issues" className="block text-xs underline">
              Manage journal issues
            </Link>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topics.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={post.tags.join(", ")}
              placeholder="peptides, FDA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input id="author" name="author" defaultValue={post.author} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="min-h-24"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Cover image</Label>
            {coverImage ? (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt=""
                  className="h-32 w-full object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => {
                    setCoverImage("");
                    toast.success("Cover removed. Save the post to keep this.");
                  }}
                >
                  <X />
                  Remove cover
                </Button>
              </div>
            ) : null}
            <Input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (!isImageFile(file)) {
                  toast.error("Choose a jpg, png, webp, gif, svg, or avif.");
                  return;
                }
                try {
                  const url = await uploadFile(file, "covers");
                  setCoverImage(url);
                  toast.success("Cover updated");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Upload failed",
                  );
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              The cover appears in the article and its PDF. Body photos are
              added with Add images above. Set the journal cover on the issue
              page.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input id="seoTitle" name="seoTitle" defaultValue={post.seoTitle} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">SEO description</Label>
            <Textarea
              id="seoDescription"
              name="seoDescription"
              defaultValue={post.seoDescription}
              className="min-h-20"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={() => void persist("draft")}
          >
            <Save />
            {pending === "draft" ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={pending !== null}
            onClick={() => void persist("published")}
          >
            <Globe />
            {pending === "published"
              ? "Publishing…"
              : status === "published"
                ? "Save and keep live"
                : "Publish to site"}
          </Button>
          {slug && status === "published" ? (
            <Button asChild variant="outline" className="w-full">
              <a href={`/articles/${slug}`} target="_blank" rel="noreferrer">
                View on site
              </a>
            </Button>
          ) : null}
        </aside>
      </form>
      <ChartBuilder
        open={chartOpen}
        onOpenChange={setChartOpen}
        onInsert={insertAtCursor}
      />
    </>
  );
}

const imagePattern = () => /!\[[^\]]*\]\([^)]+\)/g;
const chartPattern = () => /:::chart\s*\n([\s\S]*?)\n:::/g;

function parseCharts(markdown: string) {
  return [...markdown.matchAll(chartPattern())].map((match) => {
    try {
      const spec = JSON.parse(match[1] ?? "") as { title?: string };
      return spec.title?.trim() || "Chart";
    } catch {
      return "Chart";
    }
  });
}

function removeNthMatch(source: string, pattern: RegExp, index: number) {
  let seen = 0;
  return source
    .replace(pattern, (match) => {
      const current = seen;
      seen += 1;
      return current === index ? "" : match;
    })
    .replace(/\n{3,}/g, "\n\n");
}
