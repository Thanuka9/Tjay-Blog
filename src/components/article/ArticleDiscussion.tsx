"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type DiscussionComment = {
  name: string;
  body: string;
  when: string;
};

function isDiscussionComment(item: unknown): item is DiscussionComment {
  if (!item || typeof item !== "object") return false;
  const value = item as Record<string, unknown>;
  return (
    typeof value.name === "string" &&
    typeof value.body === "string" &&
    typeof value.when === "string"
  );
}

export function ArticleDiscussion({ storageKey }: { storageKey: string }) {
  const key = useMemo(() => `abyss-comments-${storageKey}`, [storageKey]);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]") as unknown;
      if (Array.isArray(saved)) {
        setComments(saved.filter(isDiscussionComment));
      }
    } catch {
      // A malformed or unavailable local store should not block the article.
    }
  }, [key]);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    const body = draftBody.trim();
    if (!name || !body) return;

    const when = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const next = [...comments, { name, body, when }];
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Keep the comment visible for this session even if storage is blocked.
    }
    setComments(next);
    setDraftBody("");
    setNote("Posted. Thanks for joining the discussion.");
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
        <span className="text-sm text-[#4A5163]">{commentCountLabel}</span>
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
          <span className="text-[13px] text-[#4A5163]">
            {note || "No account or email needed."}
          </span>
          <button
            type="submit"
            className="min-h-11 border border-[#0E1C3B] bg-[#0E1C3B] px-5 text-sm font-medium text-white"
          >
            Post comment
          </button>
        </div>
      </form>

      {comments.length > 0 ? (
        <div className="mt-8 flex flex-col border-t border-[#D9D2C3]">
          {comments.map((comment, index) => (
            <article
              key={`${comment.when}-${comment.name}-${index}`}
              className="border-b border-[#D9D2C3] py-[22px]"
            >
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-[#0E1C3B]">{comment.name}</span>
                <span className="text-[#4A5163]">{comment.when}</span>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap font-serif text-lg leading-[1.6] text-[#141A2E]">
                {comment.body}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-8 border-t border-[#D9D2C3] pt-6 font-serif text-lg italic text-[#4A5163]">
          No comments yet. Be the first.
        </p>
      )}
    </section>
  );
}
