import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Privacy policy for ${siteConfig.name} marketing site and school management platform.`,
  path: "/privacy",
});

const sections = [
  {
    title: "Information we collect",
    body: "Schools using MakySchool provide operational data such as staff and learner records, academic information, and fee transactions. This marketing site may collect basic analytics and contact details when you reach out to our team.",
  },
  {
    title: "How we use information",
    body: "Data is used to operate the school management platform, provide support, improve product features, and respond to sales or onboarding enquiries.",
  },
  {
    title: "Data security",
    body: "We apply access controls, encryption in transit, and role-based permissions within the product. Schools should only grant accounts to authorised staff.",
  },
  {
    title: "Contact",
    body: `For privacy questions, email ${siteConfig.contactEmail}.`,
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="This page describes how MakySchool handles information on our marketing site and within the school management platform."
      />
      <section>
        <div className="mx-auto max-w-3xl space-y-8 px-6 py-16">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-xl font-semibold text-theme-primary">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-theme-muted">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
