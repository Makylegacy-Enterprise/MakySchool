import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactDetails } from "@/components/contact/ContactDetails";
import { ContactForm } from "@/components/contact/ContactForm";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact the MakySchool team to book a demo, request pricing, or plan your school rollout.",
  path: "/contact",
});

import { marketingContainer, sectionY } from "@/lib/layout";

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's talk about your school"
        description="Book a demo, ask about pricing, or tell us how you run academics and fees today. Our team will respond within one business day."
      />
      <section>
        <div className={`${marketingContainer} grid gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12`}>
          <ContactDetails />
          <ContactForm />
        </div>
      </section>
    </>
  );
}
