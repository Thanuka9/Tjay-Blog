import type { MetadataRoute } from "next";
import { publicationUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The editor desk, internal endpoints, and pages with nothing to index.
      disallow: ["/admin", "/api/cron", "/api/upload", "/search", "/unsubscribe"],
    },
    sitemap: `${publicationUrl()}/sitemap.xml`,
  };
}
