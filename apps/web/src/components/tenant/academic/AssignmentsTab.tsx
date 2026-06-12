"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatClassLabel,
  getLevelSectionsForSchoolType,
  groupClassesByLevel,
  sortClasses,
} from "@makyschool/shared/constants";
import type { ClassWithDetails, SchoolType, SubjectWithDetails } from "@makyschool/shared/types";
import { AcademicEmpty } from "@/components/tenant/academic/AcademicEmpty";

type AssignmentsTabProps = {
  schoolType: SchoolType | null;
  classes: ClassWithDetails[] | undefined;
  subjects: SubjectWithDetails[] | undefined;
  actionLoading: boolean;
  onToggleClassSubject: (classId: string, subjectId: string, linked: boolean) => Promise<void>;
  onBulkLinkSubject: (subjectId: string, classIds: string[]) => Promise<void>;
};

type AssignmentMode = "by-class" | "by-subject";

export function AssignmentsTab({
  schoolType,
  classes,
  subjects,
  actionLoading,
  onToggleClassSubject,
  onBulkLinkSubject,
}: AssignmentsTabProps) {
  const [mode, setMode] = useState<AssignmentMode>("by-subject");
  const sortedClasses = useMemo(
    () => (classes ? sortClasses(classes, schoolType) : []),
    [classes, schoolType],
  );
  const groupedClasses = useMemo(
    () => (classes ? groupClassesByLevel(classes, schoolType) : []),
    [classes, schoolType],
  );
  const levelSections = getLevelSectionsForSchoolType(schoolType);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [draftClassIds, setDraftClassIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const selectedClass = useMemo(
    () => sortedClasses.find((item) => item.id === selectedClassId) ?? sortedClasses[0] ?? null,
    [sortedClasses, selectedClassId],
  );

  const selectedSubject = useMemo(
    () => subjects?.find((item) => item.id === selectedSubjectId) ?? subjects?.[0] ?? null,
    [subjects, selectedSubjectId],
  );

  useEffect(() => {
    if (selectedSubject) {
      setDraftClassIds(selectedSubject.class_ids ?? []);
      setDirty(false);
    }
  }, [selectedSubject]);

  function toggleDraftClass(classId: string) {
    setDraftClassIds((current) =>
      current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId],
    );
    setDirty(true);
  }

  function toggleDraftLevel(level: string, classIds: string[]) {
    const allSelected = classIds.every((id) => draftClassIds.includes(id));
    setDraftClassIds((current) => {
      if (allSelected) {
        return current.filter((id) => !classIds.includes(id));
      }
      return [...new Set([...current, ...classIds])];
    });
    setDirty(true);
  }

  async function saveSubjectLinks() {
    if (!selectedSubject) return;
    await onBulkLinkSubject(selectedSubject.id, draftClassIds);
    setDirty(false);
  }

  if (!classes?.length || !subjects?.length) {
    return (
      <AcademicEmpty
        title="Assignments unavailable"
        description="Create at least one class and one subject before linking them."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-theme-muted">
          Link subjects to classes. Only levels for your school type are shown.
        </p>
        <div className="flex overflow-x-auto rounded-xl border border-theme bg-input p-1">
          <button
            type="button"
            onClick={() => setMode("by-subject")}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "by-subject"
                ? "bg-theme-accent-muted text-theme-primary"
                : "text-theme-muted hover:text-theme-primary"
            }`}
          >
            By subject
          </button>
          <button
            type="button"
            onClick={() => setMode("by-class")}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "by-class"
                ? "bg-theme-accent-muted text-theme-primary"
                : "text-theme-muted hover:text-theme-primary"
            }`}
          >
            By class
          </button>
        </div>
      </div>

      {mode === "by-class" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="ms-panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-theme-primary">Select class</h2>
            <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto">
              {groupedClasses.map(({ level, items }) => {
                const section = levelSections.find((entry) => entry.levels.includes(level));
                const showSectionHeader =
                  schoolType === "both" && (level === "P1" || level === "S1") && section?.label;

                return (
                  <div key={level} className="space-y-2">
                    {showSectionHeader ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                        {section.label}
                      </h3>
                    ) : null}
                    {items.map((classRow) => {
                      const label = formatClassLabel(classRow.level, classRow.stream);
                      const active = selectedClass?.id === classRow.id;
                      return (
                        <button
                          key={classRow.id}
                          type="button"
                          onClick={() => setSelectedClassId(classRow.id)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-accent-soft bg-theme-accent-muted"
                              : "border-theme bg-input hover:border-theme-strong"
                          }`}
                        >
                          <div className="font-medium text-theme-primary">{label}</div>
                          <div className="text-sm text-theme-muted">
                            {classRow.subjects.length} subject
                            {classRow.subjects.length === 1 ? "" : "s"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ms-panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-theme-primary">
              Subjects for{" "}
              {selectedClass
                ? formatClassLabel(selectedClass.level, selectedClass.stream)
                : "selected class"}
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {subjects.map((subject) => {
                const linked = Boolean(
                  selectedClass?.subjects.some((item) => item.id === subject.id),
                );
                return (
                  <label
                    key={subject.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                      linked
                        ? "border-accent-soft bg-theme-accent-muted text-theme-primary"
                        : "border-theme bg-input text-theme-muted hover:border-theme-strong"
                    }`}
                  >
                    <span>{subject.name}</span>
                    <input
                      type="checkbox"
                      checked={linked}
                      disabled={!selectedClass || actionLoading}
                      onChange={() => {
                        if (!selectedClass) return;
                        void onToggleClassSubject(selectedClass.id, subject.id, linked);
                      }}
                      className="accent-theme"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="ms-panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-theme-primary">Select subject</h2>
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {subjects.map((subject) => {
                const active = selectedSubject?.id === subject.id;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-accent-soft bg-theme-accent-muted"
                        : "border-theme bg-input hover:border-theme-strong"
                    }`}
                  >
                    <div className="font-medium text-theme-primary">{subject.name}</div>
                    <div className="text-sm text-theme-muted">
                      {subject.class_count} class{subject.class_count === 1 ? "" : "es"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ms-panel p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-theme-primary">
                  Classes for {selectedSubject?.name ?? "selected subject"}
                </h2>
                <p className="mt-1 text-sm text-theme-muted">
                  Tick classes or entire levels, then save.
                </p>
              </div>
              <button
                type="button"
                disabled={!dirty || actionLoading || !selectedSubject}
                onClick={() => void saveSubjectLinks()}
                className="ms-btn-primary shrink-0 disabled:opacity-50"
              >
                Save links
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {levelSections.map((section) => {
                const sectionGroups = groupedClasses.filter((group) =>
                  section.levels.includes(group.level),
                );

                if (sectionGroups.length === 0) {
                  return null;
                }

                return (
                  <div key={section.label ?? section.levels[0]} className="space-y-3">
                    {section.label ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                        {section.label}
                      </h3>
                    ) : null}
                    {sectionGroups.map(({ level, items }) => {
                      const classIds = items.map((item) => item.id);
                      const allSelected = classIds.every((id) => draftClassIds.includes(id));
                      const someSelected = classIds.some((id) => draftClassIds.includes(id));

                      return (
                        <div key={level} className="rounded-xl border border-theme bg-input/40 p-3">
                          <label className="flex cursor-pointer items-center justify-between gap-3 px-1 py-1">
                            <div>
                              <div className="font-medium text-theme-primary">{level}</div>
                              <div className="text-xs text-theme-muted">
                                Select all streams in {level}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(input) => {
                                if (input) {
                                  input.indeterminate = someSelected && !allSelected;
                                }
                              }}
                              disabled={actionLoading}
                              onChange={() => toggleDraftLevel(level, classIds)}
                              className="accent-theme"
                            />
                          </label>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {items.map((classRow) => {
                              const label = formatClassLabel(classRow.level, classRow.stream);
                              const checked = draftClassIds.includes(classRow.id);
                              return (
                                <label
                                  key={classRow.id}
                                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                                    checked
                                      ? "border-accent-soft bg-theme-accent-muted text-theme-primary"
                                      : "border-theme bg-input text-theme-muted"
                                  }`}
                                >
                                  <span>{label}</span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={actionLoading}
                                    onChange={() => toggleDraftClass(classRow.id)}
                                    className="accent-theme"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
