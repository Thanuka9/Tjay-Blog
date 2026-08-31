import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listTopics } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const topics = await listTopics();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader topics={topics} />
      <main className="flex-1">{children}</main>
      <SiteFooter topics={topics} />
    </div>
  );
}
