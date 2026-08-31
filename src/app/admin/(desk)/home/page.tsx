import { HomeSlideshowEditor } from "@/components/admin/HomeSlideshowEditor";
import { getHomeSettings, listPublishedPosts } from "@/lib/store";

export default async function AdminHomeSlideshowPage() {
  const [settings, posts] = await Promise.all([
    getHomeSettings(),
    listPublishedPosts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Home slideshow</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The top of the public site rotates through up to five articles. Use
          the newest pieces automatically, or pick the five you want and set
          the order.
        </p>
      </div>
      <HomeSlideshowEditor settings={settings} posts={posts} />
    </div>
  );
}
