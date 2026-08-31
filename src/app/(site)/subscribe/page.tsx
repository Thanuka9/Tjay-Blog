import type { Metadata } from "next";
import { Container, Kicker } from "@/components/site/layout";
import { SubscribeForm } from "@/components/site/SubscribeForm";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Get The Assay when a new piece is ready. No daily mail, no caption-speed takes.",
};

export default function SubscribePage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <Kicker>Newsletter</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            Subscribe
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            We do not send a letter every morning. We send one when a piece is
            ready: reported, sourced, and scored against the actual literature.
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>One address. No ads.</li>
            <li>Kisspeptin, NAD+, and retatrutide are in the pipeline.</li>
            <li>You can ignore us the moment we get boring.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-6">
          <p className="font-serif text-2xl">Get the next assay</p>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            The next piece lands here first.
          </p>
          <SubscribeForm />
        </div>
      </div>
    </Container>
  );
}
