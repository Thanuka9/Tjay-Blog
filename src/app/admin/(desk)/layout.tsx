import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const backend = process.env.DATA_BACKEND === "neon" ? "Neon" : "Blob";

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminNav backend={backend} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 px-5 py-6 sm:px-8 lg:px-10 xl:px-12">{children}</div>
      </div>
    </div>
  );
}
