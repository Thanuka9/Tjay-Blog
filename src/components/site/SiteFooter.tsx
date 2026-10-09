import Link from "next/link";
import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";

export function SiteFooter() {
  const email = process.env.EDITORIAL_EMAIL || site.correctionsEmail;
  return (
    <footer className="journal-footer print:hidden">
      <Container className="journal-footer-inner">
        <div>
          <p>&copy; {new Date().getFullYear()} {site.name}</p>
          <p className="footer-license">Articles licensed under <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">CC BY-NC-ND 4.0</a>.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/editorial-standards">Editorial standards</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/search">Search</Link>
          <a href={`mailto:${email}`}>Contact</a>
        </nav>
      </Container>
    </footer>
  );
}
