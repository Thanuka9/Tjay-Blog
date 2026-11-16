import "server-only";

import { db } from "@/lib/neon-db";
import { getPost, getPublishedIssue, listSubscribers } from "@/lib/store";
import { mailConfigured, sendNewArticleEmail, sendNewIssueEmail } from "@/lib/mail";
import type { PostMeta, Subscriber } from "@/lib/types";
import type { JournalIssue } from "@/lib/issues";

type QueueStatus = "pending" | "sending" | "sent" | "failed" | "skipped";
type QueueRow = {
  id: string;
  post_id: string;
  subscriber_id: string;
  recipient: string;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  claimed_at: string | null;
  sent_at: string | null;
};

function requireNeon() {
  if (process.env.DATA_BACKEND !== "neon")
    throw new Error("Reliable newsletter fan-out requires DATA_BACKEND=neon.");
}

/** Store one delivery per active subscriber and published article. */
export async function enqueueNewArticle(post: PostMeta) {
  requireNeon();
  const sql = db();
  const created = await sql`
    INSERT INTO newsletter_delivery_queue
      (id, post_id, subscriber_id, recipient, status, created_at)
    SELECT gen_random_uuid()::text, ${post.id}, id, email, 'pending', NOW()
    FROM subscribers WHERE unsubscribed_at IS NULL
    ON CONFLICT (post_id, subscriber_id) DO NOTHING RETURNING id
  `;
  return { newlyQueued: created.length, configured: mailConfigured() };
}

/** Issue fan-out uses the same durable, idempotent queue.
 * The issue: prefix distinguishes issue notifications from article sends.
 */
export async function enqueueNewIssue(issue: JournalIssue) {
  requireNeon();
  if (issue.status !== "published") throw new Error("Cannot email unpublished issue.");
  const sql = db();
  const created = await sql`
    INSERT INTO newsletter_delivery_queue
      (id, post_id, subscriber_id, recipient, status, created_at)
    SELECT gen_random_uuid()::text, ${`issue:${issue.id}`}, id, email, 'pending', NOW()
    FROM subscribers WHERE unsubscribed_at IS NULL
    ON CONFLICT (post_id, subscriber_id) DO NOTHING RETURNING id
  `;
  return { newlyQueued: created.length, configured: mailConfigured() };
}

/** Atomic claim prevents two dispatchers selecting the same delivery. */
async function claimNext(): Promise<QueueRow | null> {
  const sql = db();
  // Begin with UPDATE so Neon's app_sql RPC classifies this as a
  // write-with-RETURNING, not a read-only WITH query. The SELECT retains
  // the row lock and SKIP LOCKED for safe concurrent dispatch.
  const rows = await sql`
    UPDATE newsletter_delivery_queue AS q
    SET status='sending', claimed_at=NOW(), attempts=q.attempts+1
    WHERE q.id = (
      SELECT id FROM newsletter_delivery_queue
      WHERE status = 'pending' AND attempts < 3
      ORDER BY created_at ASC, id ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING q.*
  `;
  return (rows[0] as QueueRow | undefined) ?? null;
}

async function complete(id: string, status: QueueStatus, error: string | null = null) {
  const sql = db();
  await sql`
    UPDATE newsletter_delivery_queue SET status=${status}, last_error=${error},
    sent_at=CASE WHEN ${status}='sent' THEN NOW() ELSE NULL END WHERE id=${id}
  `;
}

async function acquireWorker(): Promise<string | null> {
  const sql = db();
  const rows = await sql`
    UPDATE newsletter_worker_lock SET lease_until=NOW()+INTERVAL '4 minutes'
    WHERE singleton=TRUE AND lease_until<NOW()
    RETURNING lease_until::text AS lease
  `;
  return rows[0] ? String(rows[0].lease) : null;
}

async function releaseWorker(lease: string) {
  const sql = db();
  await sql`
    UPDATE newsletter_worker_lock SET lease_until='epoch'::timestamptz
    WHERE singleton=TRUE AND lease_until=${lease}::timestamptz
  `;
}

/** Send a bounded batch; unprocessed recipients remain safely queued. */
export async function processNewsletterQueue(maxRecipients = 95) {
  requireNeon();
  if (!mailConfigured())
    return { processed: 0, sent: 0, failed: 0, skipped: 0, unavailable: true };
  const lease = await acquireWorker();
  if (!lease) return { processed: 0, sent: 0, failed: 0, skipped: 0, busy: true };
  let processed=0, sent=0, failed=0, skipped=0;
  const capped = Math.max(1, Math.min(110, Math.floor(maxRecipients)));
  const subscriberMap = new Map<string, Subscriber>(
    (await listSubscribers()).map(s => [s.id, s])
  );
  const articleCache = new Map<string, Awaited<ReturnType<typeof getPost>>>();
  const issueCache = new Map<string, JournalIssue | null>();
  try {
    for (let i=0; i<capped; i++) {
      const job = await claimNext();
      if (!job) break;
      processed++;
      const sub = subscriberMap.get(job.subscriber_id);
      // Re-read consent immediately before delivery: a subscriber may opt out
      // while an earlier address in the same large campaign is processing.
      const latest = await db()`
        SELECT email, unsubscribed_at FROM subscribers WHERE id=${job.subscriber_id}
      `;
      if (!sub || !latest[0] || latest[0].unsubscribed_at ||
          String(latest[0].email) !== job.recipient) {
        await complete(job.id, "skipped", "Recipient unsubscribed or changed.");
        skipped++;
        continue;
      }
      const isIssue = job.post_id.startsWith("issue:");
      let post: Awaited<ReturnType<typeof getPost>> = null;
      let issue: JournalIssue | null = null;
      if (isIssue) {
        const id = job.post_id.slice("issue:".length);
        if (!issueCache.has(id)) issueCache.set(id, await getPublishedIssue(id));
        issue = issueCache.get(id) ?? null;
      } else {
        if (!articleCache.has(job.post_id)) articleCache.set(job.post_id, await getPost(job.post_id));
        post = articleCache.get(job.post_id) ?? null;
      }
      if (isIssue ? !issue || issue.status !== "published" : !post || post.status !== "published") {
        await complete(job.id, "skipped", isIssue ? "Issue is not published." : "Article is not published.");
        skipped++;
        continue;
      }
      try {
        const result = isIssue ? await sendNewIssueEmail(sub, issue!) : await sendNewArticleEmail(sub, post!);
        if (result.sent) {
          await complete(job.id, "sent");
          sent++;
        } else {
          await complete(job.id, "failed", "Email service rejected request; see Outbox.");
          failed++;
        }
      } catch (error) {
        await complete(job.id, "failed", error instanceof Error ? error.message.slice(0,300) : "Delivery failed");
        failed++;
      }
      // Account-wide EmailJS limit: one request/second.
      await new Promise(resolve => setTimeout(resolve, 1150));
    }
  } finally {
    await releaseWorker(lease);
  }
  return { processed, sent, failed, skipped, busy: false };
}

export async function newsletterQueueStats() {
  requireNeon();
  const sql = db();
  const rows = await sql`
    SELECT status, COUNT(*)::int AS amount FROM newsletter_delivery_queue GROUP BY status
  `;
  const counts: Record<QueueStatus, number> = { pending: 0, sending: 0, sent: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    const status = String(row.status) as QueueStatus;
    if (status in counts) counts[status] = Number(row.amount);
  }
  return counts;
}

export async function newsletterQueueRecent() {
  requireNeon();
  const sql = db();
  return (await sql`
    SELECT recipient, post_id, status, attempts, last_error, created_at, sent_at
    FROM newsletter_delivery_queue ORDER BY created_at DESC LIMIT 40
  `) as Array<Pick<QueueRow, "recipient" | "post_id" | "status" | "attempts" | "last_error" | "created_at" | "sent_at">>;
}

/** Admin may retry explicit failures. Uncertain 'sending' jobs need manual review. */
export async function retryFailedNewsletter() {
  requireNeon();
  const sql = db();
  const rows = await sql`
    UPDATE newsletter_delivery_queue SET status='pending', last_error=NULL, claimed_at=NULL
    WHERE status='failed' AND attempts<3 RETURNING id
  `;
  return rows.length;
}
