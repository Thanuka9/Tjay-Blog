import type { Metadata } from "next";
import { Container, Kicker } from "@/components/site/layout";
import { confirmUnsubscribeAction } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe" };

/** A GET request must never unsubscribe anyone: mail scanners prefetch links. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; invalid?: string }>;
}) {
  const { token = "", done, invalid } = await searchParams;
  const complete = done === "1";
  const canConfirm = Boolean(token) && !complete;

  return (
    <Container className="py-16 sm:py-20">
      <Kicker>Mail</Kicker>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">
        {complete ? "You are off the list" : canConfirm ? "Unsubscribe from The Abyss?" : "This unsubscribe link is invalid"}
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        {complete
          ? "You will not receive further letters from The Abyss. You can subscribe again whenever you like."
          : canConfirm
            ? "Confirm below to stop receiving welcome and new-article emails. Your subscription will not change until you confirm."
            : invalid === "1"
              ? "This link could not be verified. Please use the unsubscribe link in your most recent email."
              : "Use the unsubscribe link supplied in a The Abyss email."}
      </p>
      {canConfirm && (
        <form action={confirmUnsubscribeAction} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="rounded-md bg-foreground px-5 py-3 font-medium text-background hover:opacity-90">
            Confirm unsubscribe
          </button>
        </form>
      )}
    </Container>
  );
}
