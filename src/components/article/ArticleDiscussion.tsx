"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type DiscussionComment = {
  id: string;
  articleId: string;
  name: string;
  body: string;
  createdAt: string;
};

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ArticleDiscussion({ articleId }: { articleId: string }) {
  const endpoint = useMemo(
    () => `/api/comments?articleId=${encodeURIComponent(articleId)}`,
    [articleId],
  );
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [website, setWebsite] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load comments.");
        return (await response.json()) as { comments?: DiscussionComment[] };
      })
      .then((payload) => {
        if (!cancelled) setComments(Array.isArray(payload.comments) ? payload.comments : []);
      })
      .catch(() => {
        if (!cancelled) setNote("Comments are temporarily unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    const body = draftBody.trim();
    if (!name || !body || posting) return;

    setPosting(true);
    setNote("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, name, body, website }),
      });
      const payload = (await response.json()) as {
        error?: string;
        comment?: DiscussionComment | null;
      };
      if (!response.ok) throw new Error(payload.error || "Could not post comment.");

      if (payload.comment) {
        setComments((current) => [...current, payload.comment as DiscussionComment]);
      }
      setDraftBody("");
      setWebsite("");
      setNote("Posted. Thanks for joining the discussion.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  const commentCountLabel =
    comments.length === 0
      ? ""
      : comments.length === 1
        ? "1 comment"
        : `${comments.length} comments`;

  return (
    <section
      id="comments"
      className="mt-14 border-t-2 border-[#0E1C3B] pt-6 font-sans"
      aria-labelledby="discussion-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="discussion-heading"
          className="font-serif text-[26px] font-medium text-[#0E1C3B]"
        >
          Discussion
        </h2>
        <span className="text-sm text-[#4A5163]">
          {loading ? "Loading…" : commentCountLabel}
        </span>
      </div>
      <p className="mt-2.5 text-sm leading-[1.6] text-[#4A5163]">
        Questions about the evidence, a study we missed, or something that wasn&apos;t clear.
        Please don&apos;t ask for or offer personal medical advice.
      </p>

      <form
        className="mt-6 flex flex-col gap-4 border border-[#D9D2C3] bg-white p-6"
        onSubmit={submitComment}
      >
        <div className="grid max-w-[420px] grid-cols-1 gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold tracking-[0.04em] text-[#0E1C3B]">
            Name
            <input
              type="text"
              required
              maxLength={80}
              placeholder="How you'd like to appear"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="h-[46px] border border-[#D9D2C3] bg-white px-3.5 text-[15px] font-normal tracking-normal text-[#141A2E]"
            />
          </label>
        </div>

        <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold tracking-[0.04em] text-[#0E1C3B]">
          Comment
          <textarea
            required
            rows={4}
            maxLength={4000}
            placeholder="Keep it on the evidence."
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            className="resize-y border border-[#D9D2C3] bg-white px-3.5 py-3 font-serif text-[15px] font-normal leading-[1.55] tracking-normal text-[#141A2E]"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-[#4A5163]" role="status" aria-live="polite">
            {note || "No account or email needed."}
          </span>
          <button
            type="submit"
            disabled={posting}
            className="min-h-11 border border-[#0E1C3B] bg-[#0E1C3B] px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>

      {comments.length > 0 ? (
        <div className="mt-8 flex flex-col border-t border-[#D9D2C3]">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="border-b border-[#D9D2C3] py-[22px]"
            >
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-[#0E1C3B]">{comment.name}</span>
                <time dateTime={comment.createdAt} className="text-[#4A5163]">
                  {displayDate(comment.createdAt)}
                </time>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap font-serif text-lg leading-[1.6] text-[#141A2E]">
                {comment.body}
              </p>
            </article>
          ))}
        </div>
      ) : loading ? null : (
        <p className="mt-8 border-t border-[#D9D2C3] pt-6 font-serif text-lg italic text-[#4A5163]">
          No comments yet. Be the first.
        </p>
      )}
    </section>
  );
}
