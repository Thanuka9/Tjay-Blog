"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
});

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
      message: error instanceof Error ? error.message : "Could not delete post.",
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
      message: error instanceof Error ? error.message : "Could not delete topic.",
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
      message: error instanceof Error ? error.message : "Could not send digest.",
    };
  }
}
