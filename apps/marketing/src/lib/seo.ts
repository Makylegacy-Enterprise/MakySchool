import type { Metadata } from "next";
import { siteConfig, siteUrl } from "./site";

/** Primary SEO keywords — Uganda school management focus */
export const seoKeywords = [
  "school management system Uganda",
  "school management software Uganda",
  "best school management system Uganda",
  "school ERP Uganda",
  "student information system Uganda",
  "school fees management Uganda",
  "UGX school fees software",
  "CBC competency based curriculum Uganda",
  "primary school management Uganda",
  "secondary school management Uganda",
  "PLE UCE UACE school software",
  "bursar portal Uganda",
  "theology school management",
  "international school software Uganda",
  "MakySchool",
  "MakyLegacy",
  "Kampala school software",
] as const;

/** Set in Vercel / .env — meta tag content from Google Search Console */
export const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "";

/** Bing Webmaster Tools (optional) */
export const bingSiteVerification =
  process.env.BING_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() ||
  "";

/** Generated at build by app/opengraph-image.tsx (static export → /opengraph-image) */
export const defaultOgImagePath = "/opengraph-image";

export const defaultOgImage = {
  url: `${siteUrl}${defaultOgImagePath}`,
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — ${siteConfig.tagline}`,
} as const;

export const defaultRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} as const;

export function siteVerificationMetadata(): Pick<Metadata, "verification"> {
  const verification: NonNullable<Metadata["verification"]> = {};
  if (googleSiteVerification) verification.google = googleSiteVerification;
  if (bingSiteVerification) {
    verification.other = {
      "msvalidate.01": bingSiteVerification,
    };
  }
  return Object.keys(verification).length > 0 ? { verification } : {};
}
