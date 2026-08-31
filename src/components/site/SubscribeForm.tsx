"use client";

import { useState } from "react";
import { subscribeAction } from "@/app/(site)/subscribe/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage(null);
        setError(null);
        const form = new FormData(event.currentTarget);
        const result = await subscribeAction(form);
        setPending(false);
        if (result.ok) {
          setMessage(result.message);
          event.currentTarget.reset();
        } else {
          setError(result.message);
        }
      }}
    >
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
        <Input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className={compact ? "h-10 min-w-0 flex-1" : "h-11"}
        />
        <Button type="submit" disabled={pending} className={compact ? "h-10 rounded-full px-4" : "h-11 rounded-full"}>
          {pending ? "Joining…" : "Subscribe"}
        </Button>
      </div>
      {message ? <p className="text-sm text-foreground">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
