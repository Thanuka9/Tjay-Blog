"use client";

import { useId, useState } from "react";
import { subscribeAction } from "@/app/(site)/subscribe/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubscribeForm({ compact = false, showLabel = false, buttonLabel = "Subscribe" }: { compact?: boolean; showLabel?: boolean; buttonLabel?: string }) {
  const emailId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const element = event.currentTarget;
        setPending(true);
        setMessage(null);
        setError(null);
        const form = new FormData(event.currentTarget);
        try {
          const result = await subscribeAction(form);
          if (result.ok) {
            setMessage(result.message);
            element.reset();
          } else setError(result.message);
        } catch {
          setError("Could not subscribe. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {showLabel && <label htmlFor={emailId} className="text-[13px] font-medium">Email address</label>}
      <div className={compact ? "flex flex-wrap gap-3" : "flex flex-col gap-3"}>
        <Input
          type="email"
          id={emailId}
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className={compact ? "h-10 min-w-0 flex-1" : "h-11"}
        />
        <Button
          type="submit"
          disabled={pending}
          className={compact ? "h-10 rounded-full px-4" : "h-11 rounded-full"}
        >
          {pending ? "Joining…" : buttonLabel}
        </Button>
      </div>
      {message ? <p role="status" className="text-sm text-foreground">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
