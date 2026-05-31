import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://justflamsit.com",
      lastModified: new Date("2026-05-31"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
