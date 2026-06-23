import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Terms of service for ${siteConfig.name} school management platform.`,
  path: "/terms",
});

const sections = [
  {
    title: "Service",
    body: "MakySchool provides a cloud school management platform operated by MakyLegacy. Access is provisioned per school with role-based accounts.",
  },
  {
    title: "Acceptable use",
    body: "Schools are responsible for accurate records, lawful processing of learner data, and keeping staff credentials secure.",
  },
  {
    title: "Availability",
    body: "We aim for reliable uptime and communicate planned maintenance to platform operators. Specific service levels may be defined in commercial agreements.",
  },
  {
    title: "Contact",
    body: `For terms questions, email ${siteConfig.contactEmail}.`,
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description="These terms govern use of the MakySchool platform and related services."
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
