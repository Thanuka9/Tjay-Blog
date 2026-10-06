"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  House,
  LayoutDashboard,
  LogOut,
  PenLine,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/issues", label: "Journal issues", icon: House },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/posts/new", label: "New post", icon: PenLine },
  { href: "/admin/topics", label: "Topics", icon: FolderOpen },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/posts") {
      return (
        pathname === "/admin/posts" ||
        Boolean(pathname.match(/^\/admin\/posts\/(?!new$).+/))
      );
    }
    return pathname === href;
  }

  return (
    <>
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm",
              isActive(link.href)
                ? "bg-muted text-foreground"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </nav>
      <aside className="hidden w-60 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="px-5 py-6">
          <Link href="/admin" className="font-serif text-xl">
            The Abyss
          </Link>
          <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
            Editor desk
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(link.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut />
              Sign out
            </Button>
          </form>
          <Link
            href="/"
            className="block px-3 pb-2 text-xs text-muted-foreground hover:text-foreground"
          >
            View site
          </Link>
        </div>
      </aside>
    </>
  );
}
