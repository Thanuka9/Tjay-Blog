"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, ImagePlus, Save } from "lucide-react";
import { savePostAction } from "@/app/admin/actions";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ChartBuilder } from "@/components/admin/ChartBuilder";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { parseBodyImages } from "@/lib/markdown-images";
import { slugify } from "@/lib/site";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type EditorPost = {
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
  slideshowSlot = null,
}: {
  post: EditorPost;
  topics: Topic[];
  slideshowSlot?: number | null;
}) {
  const router = useRouter();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [content, setContent] = useState(post.content);
  const [coverImage, setCoverImage] = useState(post.coverImage ?? "");
  const [topic, setTopic] = useState(post.topic);
  const [status, setStatus] = useState(post.status);
  const [caption, setCaption] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const bodyImages = parseBodyImages(content);

  async function uploadFile(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "Upload failed");
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
    const list = [...files].filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) return;
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

  return (
    <form
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const form = new FormData(event.currentTarget);
        form.set("featured", post.featured ? "true" : "false");
        const result = await savePostAction(form);
        setPending(false);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(status === "published" ? "Published" : "Draft saved");
        router.push(`/admin/posts/${result.id}`);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="coverImage" value={coverImage} />
      <input type="hidden" name="topic" value={topic} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="featured" value={post.featured ? "true" : "false"} />

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus />
                {uploading ? "Uploading…" : "Add images"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setChartOpen(true)}>
                <BarChart3 />
                Chart
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Put the cursor where the photo should appear, then click Add images
            or drop files onto the editor. You can select several at once. The
            caption field becomes the line under the photo; leave it blank to
            use the file name.
          </p>
          <TabsContent value="write">
            <Textarea
              ref={contentRef}
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
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
              required
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="rounded-xl border border-border bg-background p-6 sm:p-10">
              <ArticleBody content={content || "*Nothing to preview yet.*"} />
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
                </figure>
              ))}
            </div>
          </div>
        ) : null}
        <input
          ref={imageInputRef}
          id="inline-image"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            event.target.value = "";
            if (files) void insertImages(files);
          }}
        />
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as EditorPost["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border border-border px-3 py-3">
          <p className="text-sm font-medium">Home slideshow</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {slideshowSlot
              ? `This piece is slide ${slideshowSlot} of 5.`
              : "Not in the home slideshow yet."}{" "}
            Pick up to five articles, or use the latest five, on the{" "}
            <Link href="/admin/home" className="underline hover:text-foreground">
              Home slideshow
            </Link>{" "}
            page.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
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
          <Input id="tags" name="tags" defaultValue={post.tags.join(", ")} placeholder="peptides, FDA" />
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
              <img src={coverImage} alt="" className="h-32 w-full object-cover" />
            </div>
          ) : null}
          <Input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const url = await uploadFile(file);
                setCoverImage(url);
                toast.success("Cover updated");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Upload failed");
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            The cover is the large photo at the top of the article and in the
            home slideshow. Body photos are added with Add images above.
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
        <Button type="submit" className="w-full" disabled={pending}>
          <Save />
          {pending ? "Saving…" : "Save post"}
        </Button>
        {slug ? (
          <Button asChild variant="outline" className="w-full">
            <a href={`/articles/${slug}`} target="_blank" rel="noreferrer">
              View on site
            </a>
          </Button>
        ) : null}
      </aside>

      <ChartBuilder
        open={chartOpen}
        onOpenChange={setChartOpen}
        onInsert={insertAtCursor}
      />
    </form>
  );
}
