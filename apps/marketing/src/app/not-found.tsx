import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start px-6 py-24">
      <p className="text-sm font-medium text-theme-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-theme-primary">Page not found</h1>
      <p className="mt-3 max-w-lg text-sm text-theme-muted">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-theme-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-theme-accent transition hover:bg-theme-accent-hover"
      >
        Back to home
      </Link>
    </section>
  );
}
