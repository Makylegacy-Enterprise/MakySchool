import type { MetadataRoute } from "next";
import { siteConfig, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#4F6EF7",
    lang: "en-UG",
    orientation: "portrait-primary",
    categories: ["education", "business"],
    icons: [
      {
        src: "/makyschool-logo.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/makyschool-logo.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
    id: siteUrl,
  };
}
