import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarketingImage } from "@/components/ui/MarketingImage";
import { CtaSection } from "@/components/sections/CtaSection";
import { createPageMetadata } from "@/lib/metadata";
import { marketingContainer, sectionY } from "@/lib/layout";
import { bookDemoUrl, getSolution, solutions } from "@/lib/site";

type SolutionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return solutions.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({ params }: SolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolution(slug);

  if (!solution) {
    return {};
  }

  return createPageMetadata({
    title: solution.title,
    description: solution.description,
    path: `/solutions/${solution.slug}`,
  });
}

export default async function SolutionDetailPage({ params }: SolutionPageProps) {
  const { slug } = await params;
  const solution = getSolution(slug);

  if (!solution) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Solution"
        title={solution.title}
        description={solution.description}
      />
      <section>
        <div className={`${marketingContainer} ${sectionY}`}>
          <div className="overflow-hidden rounded-2xl border border-theme bg-theme-surface p-2 shadow-theme-soft sm:p-3">
            <MarketingImage imageKey={solution.imageKey} variant="banner" />
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold text-theme-primary">What you get</h2>
              <ul className="mt-4 space-y-3">
                {solution.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-xl border border-theme bg-theme-bg px-4 py-3 text-sm text-theme-muted"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-2xl border border-theme bg-theme-accent-muted p-6">
              <h2 className="text-lg font-semibold text-theme-primary">Explore more</h2>
              <ul className="mt-4 space-y-3">
                {solutions
                  .filter((item) => item.slug !== solution.slug)
                  .map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/solutions/${item.slug}`}
                        className="text-sm font-medium text-theme-accent hover:underline"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
              </ul>
              <Link
                href={bookDemoUrl}
                className="mt-6 inline-flex rounded-full bg-theme-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-theme-accent transition hover:bg-theme-accent-hover"
              >
                Book a demo
              </Link>
            </aside>
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  );
}
