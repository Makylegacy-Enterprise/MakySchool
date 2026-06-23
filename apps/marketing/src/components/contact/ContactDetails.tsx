import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

const whatsAppUrl = `https://wa.me/${siteConfig.contactWhatsApp.replace(/\D/g, "")}`;

const contactItems = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contactEmail,
    href: `mailto:${siteConfig.contactEmail}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: siteConfig.contactPhone,
    href: `tel:${siteConfig.contactPhone.replace(/\s/g, "")}`,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with our team",
    href: whatsAppUrl,
  },
  {
    icon: MapPin,
    label: "Location",
    value: siteConfig.contactLocation,
  },
  {
    icon: Clock,
    label: "Office hours",
    value: siteConfig.officeHours,
  },
] as const;

export function ContactDetails() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-theme bg-theme-accent-muted p-6 shadow-theme-card sm:p-8">
        <h2 className="text-2xl font-semibold text-theme-primary">Contact details</h2>
        <p className="mt-2 text-sm leading-relaxed text-theme-muted">
          Reach the MakySchool team for demos, pricing, and onboarding. We typically respond within
          one business day.
        </p>
      </div>

      <ul className="space-y-4">
        {contactItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-theme bg-theme-surface text-theme-accent">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium uppercase tracking-wide text-theme-faint">
                  {item.label}
                </span>
                <span className="mt-1 block text-sm font-medium text-theme-primary">{item.value}</span>
              </span>
            </>
          );

          return (
            <li key={item.label}>
              {"href" in item && item.href ? (
                <a
                  href={item.href}
                  className="flex items-start gap-4 rounded-2xl border border-theme bg-theme-surface p-4 shadow-theme-card transition hover:border-theme-accent"
                  {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {content}
                </a>
              ) : (
                <div className="flex items-start gap-4 rounded-2xl border border-theme bg-theme-surface p-4 shadow-theme-card">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
