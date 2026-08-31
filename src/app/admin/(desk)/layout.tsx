import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-full flex-1">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-3 md:hidden">
          <Link href="/admin" className="font-serif">
            Editor desk
          </Link>
          <Link href="/admin/posts/new" className="text-sm underline">
            New post
          </Link>
        </header>
        <div className="flex-1 px-5 py-6 sm:px-8 lg:px-10 xl:px-12">{children}</div>
      </div>
    </div>
  );
}
