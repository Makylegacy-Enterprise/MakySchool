import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { solutions } from "@/lib/site";

const staticRoutes = [
  "",
  "/features",
  "/solutions",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages = staticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const solutionPages = solutions.map((solution) => ({
    url: `${siteUrl}/solutions/${solution.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...pages, ...solutionPages];
}
