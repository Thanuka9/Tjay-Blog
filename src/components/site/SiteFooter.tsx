import Link from "next/link";
import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="journal-footer print:hidden">
      <Container className="journal-footer-inner">
        <div>
          <p>&copy; {new Date().getFullYear()} {site.name}</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/editorial-standards">Editorial standards</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/search">Search</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </Container>
    </footer>
  );
}
