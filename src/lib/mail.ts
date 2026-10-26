import "server-only";

import { publicationUrl, site } from "@/lib/site";
import {
  listPublishedPosts,
  listSubscribers,
  recordOutboundMail,
} from "@/lib/store";
import type { OutboundMail, PostMeta, Subscriber } from "@/lib/types";

export function siteUrl() {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  // A sample localhost URL must never enter production unsubscribe links.
  if (process.env.NODE_ENV === "production" && (!configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured))) {
    return "https://theabyssos.com";
  }
  return (configured || (process.env.NODE_ENV === "production" ? publicationUrl() : "http://localhost:3000")).replace(/\/$/, "");
}

function mailFrom() {
  return (process.env.MAIL_FROM ?? "The Abyss <onboarding@resend.dev>").replace(
    /^The Assay(?=\s*<)/,
    site.name,
  );
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
    return `<p style="color:#4B5365;line-height:1.6">New pieces will land here as soon as they are published.</p>`;
  }
  return posts
    .map(
      (post) => `
        <p style="margin:0 0 18px">
          <a href="${articleUrl(post.slug)}" style="color:#2C797C;font-size:18px;text-decoration:none;font-family:Georgia,serif">
            ${escapeHtml(post.title)}
          </a><br />
          <span style="color:#4B5365;font-size:14px;line-height:1.6">${escapeHtml(post.excerpt)}</span>
        </p>`,
    )
    .join("");
}

function articleListText(posts: PostMeta[]) {
  if (posts.length === 0)
    return "New pieces will land here as soon as they are published.";
  return posts
    .map((post) => `${post.title}\n${articleUrl(post.slug)}\n${post.excerpt}`)
    .join("\n\n");
}

function wrapEmail(bodyHtml: string, token: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F5F0E6;font-family:system-ui,sans-serif;color:#14203A">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #D8D2C5">
    <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px">${escapeHtml(site.name)}</p>
    <p style="color:#4B5365;font-size:13px;margin:0 0 24px">${escapeHtml(site.tagline)}</p>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#4B5365">
      You are receiving this because you subscribed to ${escapeHtml(site.name)}.
      <a href="${unsubscribeUrl(token)}" style="color:#4B5365">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}


type EmailJsTemplate = "welcome" | "published";
type EmailJsConfig = {
  serviceId: string;
  publicKey: string;
  privateKey: string;
  welcomeTemplateId: string;
  articleTemplateId: string;
};

function emailJsConfig(): EmailJsConfig | null {
  const serviceId = process.env.EMAILJS_SERVICE_ID?.trim() || "service_59u3x2h";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim();
  const welcomeTemplateId = process.env.EMAILJS_WELCOME_TEMPLATE_ID?.trim() || "template_hx9pl8s";
  const articleTemplateId = process.env.EMAILJS_ARTICLE_TEMPLATE_ID?.trim() || "template_k04dawk";
  if (!serviceId || !publicKey || !privateKey || !welcomeTemplateId || !articleTemplateId) {
    return null;
  }
  return { serviceId, publicKey, privateKey, welcomeTemplateId, articleTemplateId };
}

export function emailJsConfigured() {
  return Boolean(emailJsConfig());
}

async function deliver(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: OutboundMail["kind"];
  emailJs?: { template: EmailJsTemplate; params: Record<string, string> };
}) {
  const emailJs = emailJsConfig();
  if (emailJs && input.emailJs) {
    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: emailJs.serviceId,
          template_id: input.emailJs.template === "welcome"
            ? emailJs.welcomeTemplateId
            : emailJs.articleTemplateId,
          user_id: emailJs.publicKey,
          accessToken: emailJs.privateKey,
          template_params: { ...input.emailJs.params, to_email: input.to },
        }),
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = await response.text();
        await recordOutboundMail({ to: input.to, subject: input.subject, kind: input.kind, status: "failed", error: `EmailJS ${response.status}: ${detail.slice(0, 350)}` });
        return { sent: false as const };
      }
      await recordOutboundMail({ to: input.to, subject: input.subject, kind: input.kind, status: "sent" });
      return { sent: true as const };
    } catch (error) {
      await recordOutboundMail({ to: input.to, subject: input.subject, kind: input.kind, status: "failed", error: error instanceof Error ? error.message : "EmailJS request failed" });
      return { sent: false as const };
    }
  }
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
  return emailJsConfigured() || Boolean(process.env.RESEND_API_KEY);
}

/** Admin-only diagnostics. Never return the public or private account keys. */
export function mailHealth() {
  const fields = {
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || "service_59u3x2h",
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    EMAILJS_WELCOME_TEMPLATE_ID: process.env.EMAILJS_WELCOME_TEMPLATE_ID || "template_hx9pl8s",
    EMAILJS_ARTICLE_TEMPLATE_ID: process.env.EMAILJS_ARTICLE_TEMPLATE_ID || "template_k04dawk",
  };
  const missing = Object.entries(fields)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  const provider = emailJsConfigured()
    ? "EmailJS"
    : process.env.RESEND_API_KEY
      ? "Resend (fallback)"
      : "Not configured";
  return {
    provider,
    configured: mailConfigured(),
    emailJsReady: emailJsConfigured(),
    missing,
    serviceId: process.env.EMAILJS_SERVICE_ID?.trim() || "service_59u3x2h",
    welcomeTemplateId: process.env.EMAILJS_WELCOME_TEMPLATE_ID?.trim() || "template_hx9pl8s",
    articleTemplateId: process.env.EMAILJS_ARTICLE_TEMPLATE_ID?.trim() || "template_k04dawk",
    emailJsRecipientLimit: 10,
  };
}

export async function sendWelcomeEmail(subscriber: Subscriber) {
  const latest = (await listPublishedPosts()).slice(0, 5);
  const subject = `Welcome to ${site.name} — You\'re on the list`;
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
    emailJs: {
      template: "welcome",
      params: {
        site_url: siteUrl(),
        latest_article_title: latest[0]?.title ?? "Explore the latest articles",
        latest_article_url: latest[0] ? articleUrl(latest[0].slug) : `${siteUrl()}/articles`,
        unsubscribe_url: unsubscribeUrl(subscriber.unsubscribeToken),
      },
    },
  });
}

export async function sendNewArticleEmail(
  subscriber: Subscriber,
  post: PostMeta,
) {
  const subject = `New from ${site.name}: ${post.title}`;
  const html = wrapEmail(
    `<p style="font-size:16px;line-height:1.7">A new piece just published.</p>
     ${articleListHtml([post])}
     <p><a href="${articleUrl(post.slug)}" style="color:#2C797C">Read it on the site</a></p>`,
    subscriber.unsubscribeToken,
  );
  const text = `${post.title}\n${articleUrl(post.slug)}\n\n${post.excerpt}\n\nUnsubscribe: ${unsubscribeUrl(subscriber.unsubscribeToken)}`;
  return deliver({
    to: subscriber.email,
    subject,
    html,
    text,
    kind: "published",
    emailJs: {
      template: "published",
      params: {
        site_url: siteUrl(),
        article_title: post.title,
        article_excerpt: post.excerpt,
        article_url: articleUrl(post.slug),
        article_code: post.articleCode ?? "",
        published_date: post.publishedAt
          ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(post.publishedAt))
          : "",
        unsubscribe_url: unsubscribeUrl(subscriber.unsubscribeToken),
      },
    },
  });
}

export async function notifySubscribersOfNewArticle(post: PostMeta) {
  const subscribers = (await listSubscribers()).filter(
    (sub) => !sub.unsubscribedAt,
  );
  // Do not claim a publication notification was sent when no provider is configured.
  if (subscribers.length && !mailConfigured()) {
    await recordOutboundMail({
      to: "MAILING_LIST",
      subject: `Publication notification not sent: ${post.title}`,
      kind: "published",
      status: "failed",
      error: "Email delivery unavailable. Configure EmailJS Public/Private Keys (or Resend) before publishing.",
    });
    return { attempted: 0, sent: 0, skipped: subscribers.length };
  }
  // EmailJS enforces one request per second. Personalize each message so
  // recipient addresses and unsubscribe tokens are never shared.
  if (emailJsConfigured()) {
    if (subscribers.length > 10) {
      await recordOutboundMail({
        to: "MAILING_LIST",
        subject: `New article queued for external campaign: ${post.title}`,
        kind: "published",
        status: "failed",
        error: "More than 10 subscribers: the synchronous EmailJS sender is intentionally disabled. Use a background queue/campaign provider before retrying.",
      });
      return { attempted: 0, sent: 0, skipped: subscribers.length };
    }
    let sent = 0;
    for (const [index, subscriber] of subscribers.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      const result = await sendNewArticleEmail(subscriber, post);
      if (result.sent) sent += 1;
    }
    return { attempted: subscribers.length, sent, skipped: 0 };
  }
  const results = await Promise.allSettled(
    subscribers.map((subscriber) => sendNewArticleEmail(subscriber, post)),
  );
  return {
    attempted: subscribers.length,
    sent: results.filter(
      (result) => result.status === "fulfilled" && result.value.sent,
    ).length,
    skipped: 0,
  };
}

/** Admin-only explicit test. Does not subscribe anyone or mail the reader list. */
export async function sendEmailJsTest(kind: "welcome" | "published") {
  if (!emailJsConfigured()) {
    throw new Error("EmailJS Public Key and Private Key must first be configured in the server environment.");
  }
  const latest = (await listPublishedPosts())[0];
  const testLink = latest ? articleUrl(latest.slug) : `${siteUrl()}/articles`;
  const common = {
    site_url: siteUrl(),
    // Test messages must not include a real subscriber's secret unsubscribe token.
    unsubscribe_url: `${siteUrl()}/newsletter`,
  };
  const emailJs = kind === "welcome"
    ? {
        template: "welcome" as const,
        params: {
          ...common,
          latest_article_title: latest?.title || "Read the journal",
          latest_article_url: testLink,
        },
      }
    : {
        template: "published" as const,
        params: {
          ...common,
          article_title: latest?.title || "EmailJS test article",
          article_excerpt: latest?.excerpt || "Testing the newsletter connection.",
          article_url: testLink,
          article_code: latest?.articleCode || "TEST",
          published_date: new Intl.DateTimeFormat("en-US", {
            month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
          }).format(new Date()),
        },
      };
  return deliver({
    to: site.correctionsEmail,
    subject: `[TEST] ${kind === "welcome" ? "Welcome" : "New article"} EmailJS template`,
    html: "",
    text: "",
    kind,
    emailJs,
  });
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
