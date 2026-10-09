"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ARTICLE_TYPES, EVIDENCE_STAGES } from "@/lib/types";
import {
  clearSessionCookie,
  isValidPassword,
  requireAdmin,
  setSessionCookie,
} from "@/lib/auth";
import { notifySubscribersOfNewArticle, sendLatestDigest } from "@/lib/mail";
import { slugify } from "@/lib/site";
import {
  deletePost,
  deleteTopic,
  getPost,
  listTopics,
  saveHomeSettings,
  savePost,
  saveTopic,
  saveIssue,
} from "@/lib/store";

const postSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3, "Title is too short"),
  slug: z.string().min(3),
  excerpt: z.string().min(20, "Give readers a real excerpt"),
  content: z.string().min(20, "Write the piece first"),
  coverImage: z.string().nullable(),
  topic: z.string(),
  tags: z.string(),
  author: z.string().min(2),
  status: z.enum(["draft", "published"]),
  featured: z.enum(["true", "false"]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  issueId: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .nullable()
    .optional(),
  articleCode: z
    .string()
    .regex(/^AB-[A-Z0-9-]+$/, "Use an article number such as AB-0101")
    .optional(),
  articleType: z.enum(ARTICLE_TYPES).optional(),
  sequence: z.coerce.number().int().min(1).max(999).optional(),
  articlePdf: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "PDF links must use HTTPS")
    .nullable()
    .optional(),
  citation: z.string().optional(),
  atAGlance: z.object({
    known: z.string().trim().min(1, "Complete What we know").max(1200),
    unknown: z.string().trim().min(1, "Complete What we don’t know").max(1200),
    watch: z.string().trim().min(1, "Complete What to watch").max(1200),
  }).nullable().optional(),
  evidenceLadder: z.object({
    subject: z.string().trim().min(1, "Give the evidence ladder a subject").max(160),
    stage: z.enum(EVIDENCE_STAGES),
    caption: z.string().trim().min(1, "Write an evidence caption").max(1600),
    afterHeading: z.string().max(300).optional(),
  }).nullable().optional(),
  abstract: z.array(z.object({ label: z.string().trim().min(1).max(160), text: z.string().trim().min(1).max(3000) })).max(6).nullable().optional(),
  references: z.array(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1), detail: z.string(), url: z.union([z.literal(""), z.string().url().regex(/^https?:\/\//)]) })).max(100).optional(),
});

function formJson(form: FormData, name: string): unknown {
  if (!form.has(name)) return undefined;
  try { return JSON.parse(String(form.get(name))); } catch { return "Invalid JSON"; }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (!isValidPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setSessionCookie();
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function savePostAction(formData: FormData) {
  await requireAdmin();
  const parsed = postSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug") || slugify(String(formData.get("title") ?? "")),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    coverImage: String(formData.get("coverImage") ?? "") || null,
    topic: formData.get("topic"),
    tags: formData.get("tags"),
    author: formData.get("author"),
    status: formData.get("status"),
    featured: formData.get("featured"),
    seoTitle: formData.get("seoTitle") || undefined,
    seoDescription: formData.get("seoDescription") || undefined,
    issueId: formData.has("issueId")
      ? String(formData.get("issueId") || "") || null
      : undefined,
    articleCode: formData.get("articleCode") || undefined,
    articleType: formData.get("articleType") || undefined,
    sequence: formData.get("sequence") || undefined,
    articlePdf: formData.get("articlePdf") || null,
    citation: formData.get("citation") || undefined,
    atAGlance: formJson(formData, "atAGlance"),
    abstract: formJson(formData, "abstract"),
    references: formJson(formData, "references"),
    evidenceLadder: formJson(formData, "evidenceLadder"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false as const, message: first?.message ?? "Invalid post" };
  }

  const topics = await listTopics();
  if (!topics.some((topic) => topic.slug === parsed.data.topic)) {
    return { ok: false as const, message: "Choose a valid topic" };
  }

  try {
    const existing = await getPost(parsed.data.id);
    const post = await savePost({
      ...parsed.data,
      tags: parsed.data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      featured: parsed.data.featured === "true",
    });

    if (post.status === "published" && existing?.status !== "published") {
      await notifySubscribersOfNewArticle(post).catch(() => {
        // Publishing still succeeds if mail is not configured.
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/articles");
    revalidatePath("/topics");
    revalidatePath(`/articles/${post.slug}`);
    revalidatePath(`/topics/${post.topic}`);
    revalidatePath("/admin");
    revalidatePath("/admin/posts");

    return { ok: true as const, id: post.id, slug: post.slug };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not save.",
    };
  }
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, message: "Missing post." };
  try {
    const existing = await getPost(id);
    await deletePost(id);
    revalidatePath("/", "layout");
    revalidatePath("/articles");
    revalidatePath("/topics");
    revalidatePath("/admin");
    revalidatePath("/admin/posts");
    revalidatePath("/admin/home");
    if (existing) {
      revalidatePath(`/articles/${existing.slug}`);
      revalidatePath(`/topics/${existing.topic}`);
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error ? error.message : "Could not delete post.",
    };
  }
}

export async function saveHomeAction(formData: FormData) {
  await requireAdmin();
  const source = formData.get("source") === "selected" ? "selected" : "latest";
  const postIds = formData
    .getAll("postIds")
    .map((value) => String(value))
    .filter(Boolean)
    .slice(0, 5);

  try {
    await saveHomeSettings({ source, postIds });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/home");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not save home.",
    };
  }
}

export async function saveTopicAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim() || undefined;
  try {
    await saveTopic({
      slug,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
    revalidatePath("/", "layout");
    revalidatePath("/topics");
    revalidatePath("/admin/topics");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not save topic.",
    };
  }
}

export async function deleteTopicAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { ok: false as const, message: "Missing topic." };
  try {
    await deleteTopic(slug);
    revalidatePath("/", "layout");
    revalidatePath("/topics");
    revalidatePath("/admin/topics");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error ? error.message : "Could not delete topic.",
    };
  }
}

export async function sendDigestAction() {
  await requireAdmin();
  try {
    const result = await sendLatestDigest();
    revalidatePath("/admin/subscribers");
    return {
      ok: true as const,
      message: process.env.RESEND_API_KEY
        ? `Digest sent to ${result.attempted} subscriber${result.attempted === 1 ? "" : "s"}.`
        : `Logged a digest for ${result.attempted} subscriber${result.attempted === 1 ? "" : "s"}. Add RESEND_API_KEY to send real mail.`,
    };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error ? error.message : "Could not send digest.",
    };
  }
}

const issueSchema = z.object({
  id: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  volume: z.coerce.number().int().min(1).max(999),
  number: z.coerce.number().int().min(1).max(99),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
  coverImage: z.string().nullable(),
  editorLetter: z.string().max(20000),
  editorName: z.string().min(2),
  coverDescription: z.string().max(5000),
  upcomingArticles: z.array(z.object({ title: z.string().trim().min(1), excerpt: z.string(), articleType: z.enum(ARTICLE_TYPES), articleCode: z.string().regex(/^AB-[A-Z0-9-]+$/) })).max(10).optional(),
  fullIssuePdf: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "PDF links must use HTTPS")
    .nullable(),
  status: z.enum(["draft", "published"]),
});

export async function saveIssueAction(formData: FormData) {
  await requireAdmin();
  const parsed = issueSchema.safeParse({
    id: formData.get("id"),
    volume: formData.get("volume"),
    number: formData.get("number"),
    month: formData.get("month"),
    year: formData.get("year"),
    coverImage: String(formData.get("coverImage") || "") || null,
    editorLetter: String(formData.get("editorLetter") || ""),
    editorName: formData.get("editorName"),
    coverDescription: String(formData.get("coverDescription") || ""),
    upcomingArticles: formJson(formData, "upcomingArticles"),
    fullIssuePdf: String(formData.get("fullIssuePdf") || "") || null,
    status: formData.get("status"),
  });
  if (!parsed.success)
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message || "Invalid issue",
    };
  if (
    parsed.data.id !==
    `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}`
  )
    return {
      ok: false as const,
      message: "The issue month and year must match its address.",
    };
  try {
    const postIds = formData.getAll("postIds").map(String);
    await saveIssue(parsed.data, postIds);
    revalidatePath("/", "layout");
    revalidatePath("/admin/issues");
    revalidatePath("/admin/posts");
    return { ok: true as const, id: parsed.data.id };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not save issue",
    };
  }
}
