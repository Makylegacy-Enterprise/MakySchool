import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig, siteUrl } from "@/lib/site";

export const dynamic = "force-static";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function opengraphImage() {
  const logoData = await readFile(
    join(process.cwd(), "public", "makyschool-logo.jpeg"),
  );
  const logoSrc = `data:image/jpeg;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #111827 0%, #1e3a5f 45%, #4F6EF7 100%)",
          padding: 48,
        }}
      >
        <img
          src={logoSrc}
          width={148}
          height={148}
          alt=""
          style={{ borderRadius: 28, objectFit: "cover" }}
        />
        <div
          style={{
            marginTop: 36,
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 30,
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.35,
          }}
        >
          {siteConfig.tagline}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 20,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {new URL(siteUrl).host}
        </div>
      </div>
    ),
    { ...size },
  );
}
