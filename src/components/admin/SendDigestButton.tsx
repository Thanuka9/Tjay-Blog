"use client";

import { toast } from "sonner";
import { sendDigestAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SendDigestButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await sendDigestAction();
        setPending(false);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }}
    >
      {pending ? "Sending…" : "Email latest articles"}
    </Button>
  );
}
