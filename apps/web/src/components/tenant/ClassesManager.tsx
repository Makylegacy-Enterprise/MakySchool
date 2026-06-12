"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ClassWithDetails, SchoolType, SubjectWithDetails } from "@makyschool/shared/types";
import { AssignmentsTab } from "@/components/tenant/academic/AssignmentsTab";
import { ClassesTab } from "@/components/tenant/academic/ClassesTab";
import { SubjectsTab } from "@/components/tenant/academic/SubjectsTab";
import { apiClient } from "@/lib/api/client";

type AcademicTab = "classes" | "subjects" | "assignments";

const tabs: Array<{ id: AcademicTab; label: string }> = [
  { id: "classes", label: "Classes" },
  { id: "subjects", label: "Subjects" },
  { id: "assignments", label: "Assignments" },
];

export function ClassesManager({
  schoolType,
  schoolSlug,
}: {
  schoolType: SchoolType | null;
  schoolSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<AcademicTab>("classes");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: classesData,
    error: classesError,
    isLoading: loadingClasses,
    mutate: mutateClasses,
  } = useSWR(
    ["/schools/classes", schoolSlug],
    ([path, slug]) => apiClient<ClassWithDetails[]>(path, { schoolSlug: slug }).then((r) => r.data),
  );

  const {
    data: subjectsData,
    error: subjectsError,
    isLoading: loadingSubjects,
    mutate: mutateSubjects,
  } = useSWR(
    ["/schools/subjects", schoolSlug],
    ([path, slug]) =>
      apiClient<SubjectWithDetails[]>(path, { schoolSlug: slug }).then((r) => r.data),
  );

  async function refreshAll() {
    await Promise.all([mutateClasses(), mutateSubjects()]);
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setActionError(null);
    try {
      await action();
      await refreshAll();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Something went wrong");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function createClass(values: {
    level: string;
    stream: string | null;
    capacity: number | null;
  }) {
    await runAction(async () => {
      await apiClient("/schools/classes", {
        method: "POST",
        body: values,
        schoolSlug,
      });
    });
  }

  async function updateClass(
    id: string,
    values: { level: string; stream: string | null; capacity: number | null },
  ) {
    await runAction(async () => {
      await apiClient(`/schools/classes/${id}`, {
        method: "PATCH",
        body: values,
        schoolSlug,
      });
    });
  }

  async function deleteClass(classRow: ClassWithDetails) {
    await runAction(async () => {
      await apiClient(`/schools/classes/${classRow.id}`, {
        method: "DELETE",
        schoolSlug,
      });
    });
  }

  async function createSubject(name: string) {
    await runAction(async () => {
      await apiClient("/schools/subjects", {
        method: "POST",
        body: { name },
        schoolSlug,
      });
    });
  }

  async function updateSubject(id: string, name: string) {
    await runAction(async () => {
      await apiClient(`/schools/subjects/${id}`, {
        method: "PATCH",
        body: { name },
        schoolSlug,
      });
    });
  }

  async function deleteSubject(subject: SubjectWithDetails) {
    await runAction(async () => {
      await apiClient(`/schools/subjects/${subject.id}`, {
        method: "DELETE",
        schoolSlug,
      });
    });
  }

  async function toggleClassSubject(classId: string, subjectId: string, linked: boolean) {
    await runAction(async () => {
      await apiClient(
        linked
          ? `/schools/classes/${classId}/subjects/${subjectId}`
          : `/schools/classes/${classId}/subjects`,
        {
          method: linked ? "DELETE" : "POST",
          body: linked ? undefined : { subjectId },
          schoolSlug,
        },
      );
    });
  }

  async function bulkLinkSubject(subjectId: string, classIds: string[]) {
    await runAction(async () => {
      await apiClient(`/schools/subjects/${subjectId}/classes`, {
        method: "PUT",
        body: { classIds },
        schoolSlug,
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto border-b border-theme pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-theme-accent-muted text-theme-primary"
                : "text-theme-muted hover:bg-nav-hover hover:text-theme-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError ? (
        <div className="alert-error rounded-lg px-4 py-3 text-sm">{actionError}</div>
      ) : null}

      {activeTab === "classes" ? (
        <ClassesTab
          schoolType={schoolType}
          classes={classesData}
          loading={loadingClasses}
          error={classesError}
          actionLoading={loading}
          onCreate={createClass}
          onUpdate={updateClass}
          onDelete={deleteClass}
        />
      ) : null}

      {activeTab === "subjects" ? (
        <SubjectsTab
          subjects={subjectsData}
          loading={loadingSubjects}
          error={subjectsError}
          actionLoading={loading}
          onCreate={createSubject}
          onUpdate={updateSubject}
          onDelete={deleteSubject}
        />
      ) : null}

      {activeTab === "assignments" ? (
        <AssignmentsTab
          schoolType={schoolType}
          classes={classesData}
          subjects={subjectsData}
          actionLoading={loading}
          onToggleClassSubject={toggleClassSubject}
          onBulkLinkSubject={bulkLinkSubject}
        />
      ) : null}
    </div>
  );
}
