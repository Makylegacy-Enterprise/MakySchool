export function AcademicEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-theme bg-input px-4 py-8 text-center">
      <p className="text-sm font-medium text-theme-primary">{title}</p>
      <p className="mt-1 text-sm text-theme-muted">{description}</p>
    </div>
  );
}
