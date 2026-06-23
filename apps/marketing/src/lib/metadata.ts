import type { Metadata } from "next";
import { siteConfig, siteUrl } from "./site";
import { marketingImages } from "./images";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
};

export function createPageMetadata({
  title,
  description,
  path = "",
}: PageMetadataOptions): Metadata {
  const url = `${siteUrl}${path}`;
  const ogImage = `${siteUrl}${marketingImages.og.src}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [
        {
          url: ogImage,
          width: marketingImages.og.width,
          height: marketingImages.og.height,
          alt: marketingImages.og.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
    },
  };
}
