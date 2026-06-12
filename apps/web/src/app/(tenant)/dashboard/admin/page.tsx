export default function AdminSetupPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-[#8B90A7]">Configuration</p>
        <h1 className="mt-1 text-xl font-semibold text-[#F0F2FA]">School profile & setup</h1>
        <p className="mt-2 text-sm text-[#8B90A7]">
          Logo, stamp, academic year, terms, and grading scale are managed during the initial setup
          wizard. This page will host profile editing in a future release.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-[#252A3A] bg-[#181C27] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[#F0F2FA]">Coming soon</p>
          <p className="mt-1 text-sm text-[#8B90A7]">
            Return to the dashboard to manage classes and subjects.
          </p>
        </div>
      </div>
    </main>
  );
}
