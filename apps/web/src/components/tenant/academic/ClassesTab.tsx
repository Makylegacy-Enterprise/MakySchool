"use client";

import { useMemo, useState } from "react";
import {
  formatClassLabel,
  getLevelSectionsForSchoolType,
  groupClassesByLevel,
} from "@makyschool/shared/constants";
import type { ClassWithDetails, SchoolType } from "@makyschool/shared/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AcademicEmpty } from "@/components/tenant/academic/AcademicEmpty";
import { ClassFormSlideOver } from "@/components/tenant/academic/ClassFormSlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";

type ClassesTabProps = {
  schoolType: SchoolType | null;
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  error: unknown;
  actionLoading: boolean;
  onCreate: (values: { level: string; stream: string | null; capacity: number | null }) => Promise<void>;
  onUpdate: (
    id: string,
    values: { level: string; stream: string | null; capacity: number | null },
  ) => Promise<void>;
  onDelete: (classRow: ClassWithDetails) => Promise<void>;
};

export function ClassesTab({
  schoolType,
  classes,
  loading,
  error,
  actionLoading,
  onCreate,
  onUpdate,
  onDelete,
}: ClassesTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithDetails | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ClassWithDetails | null>(null);

  const groupedClasses = useMemo(
    () => (classes ? groupClassesByLevel(classes, schoolType) : []),
    [classes, schoolType],
  );

  const levelSections = getLevelSectionsForSchoolType(schoolType);
  const schoolTypeLabel =
    schoolType === "both"
      ? "Primary and secondary"
      : schoolType === "secondary"
        ? "Secondary"
        : "Primary";

  function openCreate() {
    setEditingClass(null);
    setFormOpen(true);
  }

  function openEdit(classRow: ClassWithDetails) {
    setEditingClass(classRow);
    setFormOpen(true);
  }

  async function handleSubmit(values: {
    level: string;
    stream: string | null;
    capacity: number | null;
  }) {
    try {
      if (editingClass) {
        await onUpdate(editingClass.id, values);
      } else {
        await onCreate(values);
      }
      setFormOpen(false);
      setEditingClass(null);
    } catch {
      // Keep the form open so the user can fix validation errors.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-theme-muted">
            Showing {schoolTypeLabel.toLowerCase()} levels configured during setup.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="ms-btn-primary inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add class
        </button>
      </div>

      <div className="ms-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-theme-primary">Classes</h2>
          <span className="badge-info rounded-full px-2.5 py-0.5 text-xs font-medium">
            {classes?.length ?? 0}
          </span>
        </div>

        {loading ? (
          <Skeleton className="mt-4 h-48 rounded-xl" />
        ) : error ? (
          <div className="mt-4">
            <AcademicEmpty
              title="Classes unavailable"
              description="Unable to load the class list right now."
            />
          </div>
        ) : classes?.length === 0 ? (
          <div className="mt-4">
            <AcademicEmpty
              title="No classes yet"
              description="Create your first class to start linking subjects."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {groupedClasses.map(({ level, items }) => {
              const section = levelSections.find((entry) => entry.levels.includes(level));
              const showSectionHeader =
                schoolType === "both" &&
                (level === "P1" || level === "S1") &&
                section?.label;

              return (
                <div key={level} className="space-y-2">
                  {showSectionHeader ? (
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                      {section.label}
                    </h3>
                  ) : null}
                  <div className="rounded-xl border border-theme bg-input/40 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-theme-muted">{level}</p>
                  </div>
                  <div className="space-y-2">
                    {items.map((classRow) => {
                      const label = formatClassLabel(classRow.level, classRow.stream);
                      const atCapacity =
                        classRow.capacity != null && classRow.student_count >= classRow.capacity;

                      return (
                        <div
                          key={classRow.id}
                          className="flex flex-col gap-3 rounded-xl border border-theme bg-input px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-theme-primary">{label}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-theme-muted">
                              <span>
                                {classRow.student_count}
                                {classRow.capacity != null ? ` / ${classRow.capacity}` : ""} students
                              </span>
                              {classRow.subjects.length > 0 ? (
                                <span className="text-theme-muted">
                                  · {classRow.subjects.length} subject
                                  {classRow.subjects.length === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {atCapacity ? (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                  At capacity
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(classRow)}
                              className="ms-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={classRow.student_count > 0}
                              onClick={() => setConfirmDelete(classRow)}
                              className="ms-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 disabled:opacity-40 dark:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ClassFormSlideOver
        open={formOpen}
        schoolType={schoolType}
        initial={editingClass}
        loading={actionLoading}
        onClose={() => {
          setFormOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete class"
        description={
          confirmDelete
            ? confirmDelete.student_count > 0
              ? `Cannot delete ${formatClassLabel(confirmDelete.level, confirmDelete.stream)}. ${confirmDelete.student_count} student${confirmDelete.student_count === 1 ? "" : "s"} are currently enrolled. Please move them first.`
              : `Delete ${formatClassLabel(confirmDelete.level, confirmDelete.stream)}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete class"
        onConfirm={() => {
          if (confirmDelete && confirmDelete.student_count === 0) {
            void onDelete(confirmDelete).finally(() => setConfirmDelete(null));
          } else {
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      >
        {confirmDelete && confirmDelete.student_count > 0 ? (
          <p className="alert-error rounded-lg px-3 py-2 text-sm">
            This class cannot be deleted until all students are moved out.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
