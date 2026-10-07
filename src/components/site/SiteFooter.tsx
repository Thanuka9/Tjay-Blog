import Link from "next/link";
import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";
export function SiteFooter() {
  return (
    <footer className="border-t border-border py-6 print:hidden">
      <Container className="flex flex-wrap items-center justify-between gap-5 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {site.name}. Articles licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
            className="underline"
          >
            CC BY-NC-ND 4.0
          </a>
          .
        </p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/about">About</Link>
          <Link href="/editorial-standards">Editorial standards</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/search">Search</Link>
          <Link href="/admin/login">Editors</Link>
        </nav>
      </Container>
    </footer>
  );
}
