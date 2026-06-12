"use client";

import { ClassesManager } from "@/components/tenant/ClassesManager";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

export function ClassesPageContent() {
  const { school, schoolSlug } = useTenantSchool();

  if (!school) {
    return (
      <main className="px-4 py-12 text-center text-sm text-[#8B90A7]">
        Loading school context…
      </main>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8B90A7]">
            Academic structure
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[#F0F2FA]">Classes & subjects</h1>
          <p className="mt-0.5 text-sm text-[#8B90A7]">
            Organise levels, streams, and subject assignments for {school.name ?? "your school"}.
          </p>
        </div>
        <ClassesManager schoolType={school.school_type} schoolSlug={schoolSlug} />
      </div>
    </main>
  );
}
