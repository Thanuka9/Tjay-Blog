"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav, site } from "@/lib/site";
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="journal-header print:hidden">
      <div>
        <Link
          href="/"
          className={pathname === "/" ? "text-xs" : "font-serif text-2xl"}
        >
          {pathname === "/"
            ? "A science journal for everyone · Free to read"
            : site.name}
        </Link>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
