import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";

export default function NotFound() {
  return (
    <Container className="grid min-h-[60vh] items-center py-20 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Kicker>404</Kicker>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
          This page is not here
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          It may have been unpublished, renamed, or never written.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        >
          Back to the front page
        </Link>
      </div>
    </Container>
  );
}
