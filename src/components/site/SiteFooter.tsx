import Link from "next/link";
import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";
export function SiteFooter() {
  return <footer className="border-t border-border py-6 print:hidden"><Container className="flex flex-wrap items-center justify-between gap-5 text-xs text-muted-foreground"><p>© {new Date().getFullYear()} {site.name}. A science journal for everyone.</p><nav className="flex gap-5"><Link href="/about">About</Link><Link href="/articles">Articles</Link><Link href="/search">Search</Link><Link href="/admin/login">Editors</Link></nav></Container></footer>;
}
