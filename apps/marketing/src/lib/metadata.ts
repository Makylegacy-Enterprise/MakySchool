import type { Metadata } from "next";
import { defaultRobots, seoKeywords } from "./seo";
import { siteConfig, siteUrl } from "./site";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
};

function pageTitle(title: string): string {
  return title.includes(siteConfig.name)
    ? title
    : `${title} | ${siteConfig.name}`;
}

export function createPageMetadata({
  title,
  description,
  path = "",
}: PageMetadataOptions): Metadata {
  const url = `${siteUrl}${path}`;
  const resolvedTitle = pageTitle(title);

  return {
    title,
    description,
    keywords: [...seoKeywords],
    alternates: {
      canonical: url,
    },
    robots: defaultRobots,
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: resolvedTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
    },
  };
}
