import Link from "next/link";
import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="journal-footer print:hidden">
      <Container className="journal-footer-inner">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
              Follow us
            </span>
            <a
              href="https://www.instagram.com/theabyss.os?obrf=dnhucjNlOWEyYnY%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-11 w-11 items-center justify-center text-foreground"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@theabyssos"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-11 w-11 items-center justify-center text-foreground"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} {site.name}</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/editorial-standards">Editorial standards</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </Container>
    </footer>
  );
}
