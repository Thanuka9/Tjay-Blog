"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCommentAction, setCommentStatusAction } from "@/app/admin/comment-actions";
import { Button } from "@/components/ui/button";

export function CommentModerationButtons({
  id,
  status,
}: {
  id: string;
  status: "published" | "hidden";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function changeStatus() {
    setError("");
    const form = new FormData();
    form.set("id", id);
    form.set("status", status === "published" ? "hidden" : "published");
    startTransition(async () => {
      try {
        await setCommentStatusAction(form);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not update comment.");
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete this comment permanently? This cannot be undone.")) return;
    setError("");
    const form = new FormData();
    form.set("id", id);
    startTransition(async () => {
      try {
        await deleteCommentAction(form);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete comment.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={changeStatus}>
          {status === "published" ? "Hide" : "Publish"}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
          Delete
        </Button>
      </div>
      {error ? <p className="max-w-48 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
