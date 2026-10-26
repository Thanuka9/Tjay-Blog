"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendEmailJsTestAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Tests send exclusively to the site's corrections inbox, never the subscriber list. */
export function EmailJsTestControls({ enabled }: { enabled: boolean }) {
  const [sending, setSending] = useState<"welcome" | "published" | null>(null);
  async function test(kind: "welcome" | "published") {
    setSending(kind);
    try {
      const result = await sendEmailJsTestAction(kind);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Could not contact the email service.");
    } finally {
      setSending(null);
    }
  }
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-sm font-semibold">Test delivery to the editorial inbox</p>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">These buttons send only to corrections.theabyss@gmail.com. They do not email or modify subscribers. Test links use a non-subscriber placeholder.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!enabled || sending !== null} onClick={() => test("welcome")}>{sending === "welcome" ? "Testing…" : "Test welcome"}</Button>
        <Button type="button" variant="outline" disabled={!enabled || sending !== null} onClick={() => test("published")}>{sending === "published" ? "Testing…" : "Test new article"}</Button>
      </div>
    </div>
  );
}
