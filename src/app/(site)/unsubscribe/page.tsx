import type { Metadata } from "next";
import { Container, Kicker } from "@/components/site/layout";
import { unsubscribeByToken } from "@/lib/store";

export const metadata: Metadata = {
  title: "Unsubscribe",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const ok = token ? await unsubscribeByToken(token) : false;

  return (
    <Container className="py-16 sm:py-20">
      <Kicker>Mail</Kicker>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">
        {ok ? "You are off the list" : "We could not find that link"}
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        {ok
          ? "You will not get further letters from The Abyss. You can subscribe again any time."
          : "The unsubscribe link may be old or incomplete."}
      </p>
    </Container>
  );
}
