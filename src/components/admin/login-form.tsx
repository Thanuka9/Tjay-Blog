"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/admin/actions";

export function LoginForm({
  next,
  error,
}: {
  next: string;
  error?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
          onChange={() => setPending(false)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive">That password is not right.</p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}
