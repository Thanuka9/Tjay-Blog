"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  return (
    <header className="journal-header print:hidden">
      <div>
        <Link href="/" className={`journal-brand ${home ? "journal-brand-home" : ""}`} aria-label="The Abyss home">
          <Image src="/brand/abyss-logo.png" alt="" width={40} height={40} />
          {home ? <span className="brand-mission">A science journal<br />for everyone</span> : <span><i>The</i> Abyss</span>}
        </Link>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <Link key={item.href} href={home && item.href === "/issues" ? "#archive" : home && item.href === "/newsletter" ? "#newsletter" : item.href}
              aria-current={pathname === item.href || (item.href === "/issues" && pathname.startsWith("/issues/")) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
