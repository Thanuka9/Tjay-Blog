import "server-only";

import { site } from "@/lib/site";
import {
  listPublishedPosts,
  listSubscribers,
  recordOutboundMail,
} from "@/lib/store";
import type { OutboundMail, PostMeta, Subscriber } from "@/lib/types";

export function siteUrl() {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function mailFrom() {
  return process.env.MAIL_FROM ?? "The Assay <onboarding@resend.dev>";
}

function articleUrl(slug: string) {
  return `${siteUrl()}/articles/${slug}`;
}

function unsubscribeUrl(token: string) {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function articleListHtml(posts: PostMeta[]) {
  if (posts.length === 0) {
    return `<p style="color:#666;line-height:1.6">New pieces will land here as soon as they are published.</p>`;
  }
  return posts
    .map(
      (post) => `
        <p style="margin:0 0 18px">
          <a href="${articleUrl(post.slug)}" style="color:#1f5c4e;font-size:18px;text-decoration:none;font-family:Georgia,serif">
            ${escapeHtml(post.title)}
          </a><br />
          <span style="color:#666;font-size:14px;line-height:1.6">${escapeHtml(post.excerpt)}</span>
        </p>`,
    )
    .join("");
}

function articleListText(posts: PostMeta[]) {
  if (posts.length === 0) return "New pieces will land here as soon as they are published.";
  return posts
    .map((post) => `${post.title}\n${articleUrl(post.slug)}\n${post.excerpt}`)
    .join("\n\n");
}

function wrapEmail(bodyHtml: string, token: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f4f1;font-family:system-ui,sans-serif;color:#222">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e8e2d8">
    <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px">${escapeHtml(site.name)}</p>
    <p style="color:#666;font-size:13px;margin:0 0 24px">${escapeHtml(site.tagline)}</p>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#888">
      You are receiving this because you subscribed to ${escapeHtml(site.name)}.
      <a href="${unsubscribeUrl(token)}" style="color:#888">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}

async function deliver(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: OutboundMail["kind"];
}) {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: mailFrom(),
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        await recordOutboundMail({
          to: input.to,
          subject: input.subject,
          kind: input.kind,
          status: "failed",
          error: detail.slice(0, 500),
        });
        return { sent: false as const };
      }
      await recordOutboundMail({
        to: input.to,
        subject: input.subject,
        kind: input.kind,
        status: "sent",
      });
      return { sent: true as const };
    } catch (error) {
      await recordOutboundMail({
        to: input.to,
        subject: input.subject,
        kind: input.kind,
        status: "failed",
        error: error instanceof Error ? error.message : "Send failed",
      });
      return { sent: false as const };
    }
  }

  await recordOutboundMail({
    to: input.to,
    subject: input.subject,
    kind: input.kind,
    status: "logged",
  });
  return { sent: false as const };
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendWelcomeEmail(subscriber: Subscriber) {
  const latest = (await listPublishedPosts()).slice(0, 5);
  const subject = `You're in. Here's what ${site.name} is reading.`;
  const html = wrapEmail(
    `<p style="font-size:16px;line-height:1.7">Thanks for subscribing. We send a letter when a piece is finished, not every morning.</p>
     <p style="font-size:16px;line-height:1.7">The latest on the site:</p>
     ${articleListHtml(latest)}`,
    subscriber.unsubscribeToken,
  );
  const text = `Thanks for subscribing to ${site.name}.\n\nThe latest:\n\n${articleListText(latest)}\n\nUnsubscribe: ${unsubscribeUrl(subscriber.unsubscribeToken)}`;
  return deliver({
    to: subscriber.email,
    subject,
    html,
    text,
    kind: "welcome",
  });
}

export async function sendNewArticleEmail(subscriber: Subscriber, post: PostMeta) {
  const subject = `New from ${site.name}: ${post.title}`;
  const html = wrapEmail(
    `<p style="font-size:16px;line-height:1.7">A new piece just published.</p>
     ${articleListHtml([post])}
     <p><a href="${articleUrl(post.slug)}" style="color:#1f5c4e">Read it on the site</a></p>`,
    subscriber.unsubscribeToken,
  );
  const text = `${post.title}\n${articleUrl(post.slug)}\n\n${post.excerpt}\n\nUnsubscribe: ${unsubscribeUrl(subscriber.unsubscribeToken)}`;
  return deliver({
    to: subscriber.email,
    subject,
    html,
    text,
    kind: "published",
  });
}

export async function notifySubscribersOfNewArticle(post: PostMeta) {
  const subscribers = (await listSubscribers()).filter((sub) => !sub.unsubscribedAt);
  const results = await Promise.allSettled(
    subscribers.map((subscriber) => sendNewArticleEmail(subscriber, post)),
  );
  return {
    attempted: subscribers.length,
    sent: results.filter((result) => result.status === "fulfilled" && result.value.sent)
      .length,
  };
}

export async function sendLatestDigest() {
  const [subscribers, posts] = await Promise.all([
    listSubscribers(),
    listPublishedPosts(),
  ]);
  const latest = posts.slice(0, 5);
  const active = subscribers.filter((sub) => !sub.unsubscribedAt);
  let sent = 0;
  for (const subscriber of active) {
    const subject = `Latest from ${site.name}`;
    const html = wrapEmail(
      `<p style="font-size:16px;line-height:1.7">The latest pieces on ${escapeHtml(site.name)}:</p>
       ${articleListHtml(latest)}`,
      subscriber.unsubscribeToken,
    );
    const text = `Latest from ${site.name}\n\n${articleListText(latest)}\n\nUnsubscribe: ${unsubscribeUrl(subscriber.unsubscribeToken)}`;
    const result = await deliver({
      to: subscriber.email,
      subject,
      html,
      text,
      kind: "digest",
    });
    if (result.sent) sent += 1;
  }
  return { attempted: active.length, sent };
}
