import type { MetadataRoute } from "next";

const SITE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, per-user or token-addressed routes — nothing to index there.
      disallow: ["/api/", "/spaces/", "/join/", "/account"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
