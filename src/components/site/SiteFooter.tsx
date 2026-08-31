import Link from "next/link";
import { Container } from "@/components/site/layout";
import { SubscribeForm } from "@/components/site/SubscribeForm";
import { site } from "@/lib/site";
import type { Topic } from "@/lib/types";

export function SiteFooter({ topics }: { topics: Topic[] }) {
  return (
    <footer className="mt-auto border-t border-border bg-background print:hidden">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-serif text-xl">{site.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {site.tagline} Independent reading of health claims, written so you
            can check the work.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Topics
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/topics/${topic.slug}`} className="hover:text-brand">
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            The publication
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
            </li>
            <li>
              <Link href="/articles" className="hover:text-brand">
                Articles
              </Link>
            </li>
            <li>
              <Link href="/topics" className="hover:text-brand">
                Topics
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-brand">
                About
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-brand">
                Search
              </Link>
            </li>
            <li>
              <Link href="/subscribe" className="hover:text-brand">
                Subscribe
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-brand">
                Editors
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Get the next piece
          </p>
          <p className="mt-3 mb-4 text-sm text-muted-foreground">
            No daily mail. One letter when a piece is actually finished.
          </p>
          <SubscribeForm compact />
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="py-5">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {site.name}. Not medical advice.
          </p>
        </Container>
      </div>
    </footer>
  );
}
