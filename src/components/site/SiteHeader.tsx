"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { nav, site } from "@/lib/site";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteHeader({ topics }: { topics: Topic[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const topicsOpen = pathname.startsWith("/topics");

  return (
    <header className="sticky top-0 z-40 print:hidden">
      <div className="border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[1720px] items-center gap-6 px-5 sm:px-8 lg:px-12 xl:px-16">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            <span className="font-serif text-[1.4rem] leading-none tracking-tight">
              {site.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) =>
              item.href === "/topics" ? (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors",
                      topicsOpen
                        ? "text-foreground underline decoration-brand/50 decoration-2 underline-offset-[10px]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Topics
                    <ChevronDown className="size-3.5 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-56">
                    <DropdownMenuLabel>Main</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/topics">All topics</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Subjects</DropdownMenuLabel>
                    {topics.map((topic) => (
                      <DropdownMenuItem key={topic.slug} asChild>
                        <Link href={`/topics/${topic.slug}`}>{topic.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isActive(item.href)
                      ? "text-foreground underline decoration-brand/50 decoration-2 underline-offset-[10px]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <form action="/search" className="hidden xl:block">
              <Input
                type="search"
                name="q"
                placeholder="Search articles"
                aria-label="Search articles"
                className="h-9 w-52 rounded-full bg-muted/60"
              />
            </form>
            <Button asChild variant="ghost" size="icon" className="xl:hidden">
              <Link href="/search" aria-label="Search">
                <Search />
              </Link>
            </Button>
            <Button asChild className="rounded-full px-5">
              <Link href="/subscribe">Subscribe</Link>
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Button asChild variant="ghost" size="icon">
              <Link href="/search" aria-label="Search">
                <Search />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {open ? (
        <nav className="border-b border-border bg-background px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {nav
              .filter((item) => item.href !== "/topics")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm",
                    isActive(item.href)
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            <p className="mt-3 px-3 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Topics
            </p>
            <Link
              href="/topics"
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium",
                pathname === "/topics"
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-muted",
              )}
            >
              All topics
            </Link>
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className={cn(
                  "rounded-lg py-2 pr-3 pl-6 text-sm",
                  pathname === `/topics/${topic.slug}`
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {topic.name}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="mt-3 rounded-full bg-foreground px-3 py-2.5 text-center text-sm text-background shadow-[0_0_24px_-6px_oklch(0.4_0.08_175/0.65)]"
            >
              Subscribe
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
