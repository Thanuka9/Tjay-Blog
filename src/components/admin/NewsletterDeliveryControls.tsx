"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  processNewsletterQueueAction,
  retryFailedNewsletterAction,
} from "@/app/admin/actions";

export function NewsletterDeliveryControls({ enabled, retryable }: { enabled: boolean; retryable: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"send" | "retry" | null>(null);

  async function run(kind: "send" | "retry") {
    setPending(kind);
    try {
      const result = kind === "send"
        ? await processNewsletterQueueAction()
        : await retryFailedNewsletterAction();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      router.refresh();
    } catch {
      toast.error("Could not start the newsletter worker.");
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" disabled={!enabled || pending !== null} onClick={() => void run("send")}>
        {pending === "send" ? "Starting…" : "Send pending notifications"}
      </Button>
      <Button type="button" variant="outline" disabled={!enabled || !retryable || pending !== null} onClick={() => void run("retry")}>
        {pending === "retry" ? "Retrying…" : "Retry failed"}
      </Button>
    </div>
  );
}
