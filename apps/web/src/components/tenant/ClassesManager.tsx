"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { formatClassLabel } from "@makyschool/shared/constants";
import type { ClassWithDetails, SchoolType, SubjectWithDetails } from "@makyschool/shared/types";
import { AssignmentsTab } from "@/components/tenant/academic/AssignmentsTab";
import { ClassesTab } from "@/components/tenant/academic/ClassesTab";
import { SubjectsTab } from "@/components/tenant/academic/SubjectsTab";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { apiClient } from "@/lib/api/client";
import { parseAcademicError, type FeedbackState } from "@/lib/academic/feedback";

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
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

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

  async function runAction(action: () => Promise<void>, successMessage?: string) {
    setLoading(true);
    setFeedback(null);
    try {
      await action();
      await refreshAll();
      if (successMessage) {
        setFeedback({ tone: "success", message: successMessage });
      }
    } catch (error) {
      setFeedback({ tone: "error", message: parseAcademicError(error) });
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
    const label = formatClassLabel(values.level, values.stream);
    await runAction(async () => {
      await apiClient("/schools/classes", {
        method: "POST",
        body: values,
        schoolSlug,
      });
    }, `${label} created successfully.`);
  }

  async function updateClass(
    id: string,
    values: { level: string; stream: string | null; capacity: number | null },
  ) {
    const label = formatClassLabel(values.level, values.stream);
    await runAction(async () => {
      await apiClient(`/schools/classes/${id}`, {
        method: "PATCH",
        body: values,
        schoolSlug,
      });
    }, `${label} updated successfully.`);
  }

  async function deleteClass(classRow: ClassWithDetails) {
    const label = formatClassLabel(classRow.level, classRow.stream);
    await runAction(async () => {
      await apiClient(`/schools/classes/${classRow.id}`, {
        method: "DELETE",
        schoolSlug,
      });
    }, `${label} deleted successfully.`);
  }

  async function createSubject(name: string) {
    await runAction(async () => {
      await apiClient("/schools/subjects", {
        method: "POST",
        body: { name },
        schoolSlug,
      });
    }, `${name} added successfully.`);
  }

  async function updateSubject(id: string, name: string) {
    await runAction(async () => {
      await apiClient(`/schools/subjects/${id}`, {
        method: "PATCH",
        body: { name },
        schoolSlug,
      });
    }, `${name} updated successfully.`);
  }

  async function deleteSubject(subject: SubjectWithDetails) {
    await runAction(async () => {
      await apiClient(`/schools/subjects/${subject.id}`, {
        method: "DELETE",
        schoolSlug,
      });
    }, `${subject.name} deleted successfully.`);
  }

  async function toggleClassSubject(classId: string, subjectId: string, linked: boolean) {
    const classRow = classesData?.find((row) => row.id === classId);
    const subject = subjectsData?.find((row) => row.id === subjectId);
    const classLabel = classRow
      ? formatClassLabel(classRow.level, classRow.stream)
      : "class";
    const subjectName = subject?.name ?? "Subject";

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
    }, linked
      ? `${subjectName} removed from ${classLabel}.`
      : `${subjectName} linked to ${classLabel}.`);
  }

  async function bulkLinkSubject(subjectId: string, classIds: string[]) {
    const subject = subjectsData?.find((row) => row.id === subjectId);
    const subjectName = subject?.name ?? "Subject";

    await runAction(async () => {
      await apiClient(`/schools/subjects/${subjectId}/classes`, {
        method: "PUT",
        body: { classIds },
        schoolSlug,
      });
    }, `${subjectName} linked to ${classIds.length} class${classIds.length === 1 ? "" : "es"}.`);
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

      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={dismissFeedback}
          autoDismissMs={feedback.tone === "success" ? 5000 : undefined}
        />
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
