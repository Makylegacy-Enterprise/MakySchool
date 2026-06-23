const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const siteConfig = {
  name: "MakySchool",
  tagline: "School management built for clarity",
  description:
    "MakySchool is a modern school management platform for Ugandan primary and secondary schools — classes, academics, teachers, learners, fees, and bursar workflows in one place.",
  company: "MakyLegacy",
  companyUrl: "https://makylegacy.com",
  contactEmail: "support@makylegacy.com",
  contactPhone: "+256 708 826 558",
  contactWhatsApp: "+256708826558",
  contactLocation: "Kampala, Uganda",
  officeHours: "Mon – Fri, 8:00 AM – 6:00 PM EAT",
  locale: "en_UG",
} as const;

export const siteUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://makyschool.com",
);

export const contactPageUrl = "/contact";
export const bookDemoUrl = "/contact#contact-form";

export const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export const stats = [
  { value: "5+", label: "Portals in one platform" },
  { value: "3", label: "Academic terms supported" },
  { value: "UGX", label: "Native fees & receipts" },
  { value: "24/7", label: "Cloud access" },
] as const;

export const howItWorks = [
  {
    step: "01",
    title: "Book a demo",
    description:
      "Tell us about your school. Our team walks you through MakySchool and answers your questions.",
  },
  {
    step: "02",
    title: "Plan your rollout",
    description:
      "We help you map classes, terms, staff roles, and fees workflows before go-live.",
  },
  {
    step: "03",
    title: "Onboard your team",
    description:
      "Add head teachers, teachers, bursars, and learners — each role gets a focused portal.",
  },
  {
    step: "04",
    title: "Run daily operations",
    description:
      "Manage academics, attendance, marks, fees, and reports from dashboards built for school staff.",
  },
] as const;

export const featureHighlights = [
  {
    title: "Classes & streams",
    description:
      "Organise primary and secondary levels with streams, subjects, and term-based academic structure.",
    imageKey: "classes" as const,
  },
  {
    title: "Teacher & learner portals",
    description:
      "Dedicated workspaces for teachers and learners — not a one-size-fits-all admin screen.",
    imageKey: "portals" as const,
  },
  {
    title: "Fees & bursar module",
    description:
      "Fee structures, student accounts, payments, receipts, and outstanding balances with bursar access.",
    imageKey: "fees" as const,
  },
  {
    title: "Role-based access",
    description:
      "Admin, head teacher, teacher, bursar, and learner permissions enforced across every route.",
    imageKey: "roles" as const,
  },
  {
    title: "Academic terms & grading",
    description:
      "Uganda-style three-term years, grading scales, and marks workflows aligned to how schools run.",
    imageKey: "academics" as const,
  },
  {
    title: "School branding",
    description:
      "Each school gets a branded workspace with its own identity across portals and communications.",
    imageKey: "branding" as const,
  },
] as const;

export const pricingTiers = [
  {
    name: "School",
    price: "Contact us",
    description: "For a single primary or secondary school getting started on MakySchool.",
    features: [
      "Unlimited staff & learner accounts",
      "Classes, subjects & academic terms",
      "Teacher & learner portals",
      "Fees management & bursar portal",
      "Guided onboarding support",
    ],
    cta: "Book a demo",
    highlighted: false,
  },
  {
    name: "Campus",
    price: "Custom",
    description: "For schools with multiple sections, streams, or growing administrative teams.",
    features: [
      "Everything in School",
      "Advanced fees reporting",
      "Priority onboarding",
      "Dedicated success contact",
      "Custom training sessions",
    ],
    cta: "Book a demo",
    highlighted: true,
  },
  {
    name: "Group",
    price: "Custom",
    description: "For education groups, dioceses, or operators managing several institutions.",
    features: [
      "Everything in Campus",
      "Multi-school provisioning",
      "Central platform administration",
      "Volume pricing",
      "Custom rollout planning",
    ],
    cta: "Book a demo",
    highlighted: false,
  },
] as const;

export const testimonials = [
  {
    quote:
      "We finally have one place for classes, teachers, and fees instead of spreadsheets and paper receipts.",
    name: "Grace Apio",
    role: "School Administrator",
    location: "Gulu, Uganda",
  },
  {
    quote:
      "Teachers see only their classes and learners. That alone cut confusion across the staff.",
    name: "David Okello",
    role: "Head Teacher",
    location: "Kampala, Uganda",
  },
  {
    quote:
      "The bursar portal made fee collection visible — balances, payments, and receipts in one workflow.",
    name: "Sarah Nakato",
    role: "Bursar",
    location: "Mbarara, Uganda",
  },
] as const;

export const faqItems = [
  {
    question: "What is MakySchool?",
    answer:
      "MakySchool is a cloud school management platform for Ugandan primary and secondary schools. It covers academic structure, staff and learner portals, and fees management with role-based access.",
  },
  {
    question: "Who uses MakySchool?",
    answer:
      "School administrators, head teachers, teachers, bursars, and learners each get a dedicated portal tailored to their daily work.",
  },
  {
    question: "Does MakySchool support school fees?",
    answer:
      "Yes. Schools can define fee structures, assign accounts to learners, record payments, generate receipts, and track outstanding balances. Bursars have a dedicated portal for this work.",
  },
  {
    question: "How do schools get started?",
    answer:
      "Book a demo with our team. We walk you through the platform, plan your rollout, and support onboarding for your staff.",
  },
  {
    question: "Is MakySchool only for Uganda?",
    answer:
      "MakySchool is built with Ugandan school operations in mind — three-term years, local currency, and workflows common in East African schools — and can serve similar institutions in the region.",
  },
] as const;

export type SolutionSlug = "primary-schools" | "secondary-schools" | "fees-bursar";

export const solutions: Array<{
  slug: SolutionSlug;
  title: string;
  summary: string;
  description: string;
  bullets: string[];
  imageKey: "primary" | "secondary" | "fees";
}> = [
  {
    slug: "primary-schools",
    title: "Primary schools",
    summary: "Structure, staff, and learner management for primary campuses.",
    description:
      "Run primary levels, streams, and subjects with portals tuned for younger learners and their teachers.",
    bullets: [
      "Primary class levels and streams",
      "Teacher class assignments",
      "Learner profiles and guardians",
      "Term-based academic calendar",
    ],
    imageKey: "primary",
  },
  {
    slug: "secondary-schools",
    title: "Secondary schools",
    summary: "O-Level and A-Level academic operations in one workspace.",
    description:
      "Manage secondary levels, subject linking, marks workflows, and staff roles without juggling disconnected tools.",
    bullets: [
      "Secondary class levels",
      "Subject and teacher linking",
      "Marks and academic terms",
      "Head teacher oversight",
    ],
    imageKey: "secondary",
  },
  {
    slug: "fees-bursar",
    title: "Fees & bursar",
    summary: "Fee structures, payments, receipts, and outstanding tracking.",
    description:
      "Give your bursar a focused portal for collections while admins retain full visibility and control.",
    bullets: [
      "Fee structures per term",
      "Student fee accounts",
      "Payment recording & voiding",
      "PDF receipts and outstanding reports",
    ],
    imageKey: "fees",
  },
];

export function getSolution(slug: string) {
  return solutions.find((item) => item.slug === slug);
}
