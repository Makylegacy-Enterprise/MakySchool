import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";

function SettingsSectionSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-theme-card">
      <div className="space-y-2 border-b border-theme bg-theme-raised/30 px-6 py-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="space-y-5 p-6">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <SettingsSectionSkeleton fields={4} />
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  );
}
