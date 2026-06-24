import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd, localBusinessJsonLd, productJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { defaultRobots, seoKeywords, siteVerificationMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { MarketingProviders } from "@/providers/MarketingProviders";
import { MarketingScrollChrome } from "@/components/motion/MarketingScrollChrome";
import "@makyschool/ui/styles/globals.css";
import "@/styles/marketing.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rootMetadata = createPageMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://school.makylegacy.com"),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...seoKeywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.company, url: siteConfig.companyUrl }],
  creator: siteConfig.company,
  publisher: siteConfig.company,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/makyschool-logo.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/makyschool-logo.jpeg", type: "image/jpeg" }],
  },
  alternates: rootMetadata.alternates,
  openGraph: rootMetadata.openGraph,
  twitter: rootMetadata.twitter,
  robots: defaultRobots,
  ...siteVerificationMetadata(),
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('makyschool-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', stored || system);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="marketing-site" data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd(), webSiteJsonLd(), localBusinessJsonLd(), productJsonLd()]} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <MarketingProviders>
          <MarketingScrollChrome />
          <div className="flex min-h-dvh flex-col bg-theme-bg">
            <MarketingHeader />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
          </div>
        </MarketingProviders>
      </body>
    </html>
  );
}
