"use client";

import { useState } from "react";
import type { SubjectWithDetails } from "@makyschool/shared/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AcademicEmpty } from "@/components/tenant/academic/AcademicEmpty";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SlideOver } from "@/components/ui/SlideOver";
import { Skeleton } from "@/components/ui/Skeleton";

type SubjectsTabProps = {
  subjects: SubjectWithDetails[] | undefined;
  loading: boolean;
  error: unknown;
  actionLoading: boolean;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (subject: SubjectWithDetails) => Promise<void>;
};

export function SubjectsTab({
  subjects,
  loading,
  error,
  actionLoading,
  onCreate,
  onUpdate,
  onDelete,
}: SubjectsTabProps) {
  const [newName, setNewName] = useState("");
  const [editingSubject, setEditingSubject] = useState<SubjectWithDetails | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<SubjectWithDetails | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      await onCreate(newName.trim());
      setNewName("");
    } catch {
      // Error banner is shown by the parent.
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSubject || !editName.trim()) return;
    try {
      await onUpdate(editingSubject.id, editName.trim());
      setEditingSubject(null);
      setEditName("");
    } catch {
      // Keep the edit panel open on failure.
    }
  }

  return (
    <div className="space-y-4">
      <div className="ms-panel p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-theme-primary">Add subject</h2>
        <form onSubmit={(event) => void handleCreate(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            placeholder="e.g. Mathematics, English"
            className="ms-input flex-1"
          />
          <button
            disabled={actionLoading}
            type="submit"
            className="ms-btn-primary inline-flex shrink-0 items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add subject
          </button>
        </form>
      </div>

      <div className="ms-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-theme-primary">Subjects</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Manage the subjects taught at your school.
            </p>
          </div>
          <span className="badge-info rounded-full px-2.5 py-0.5 text-xs font-medium">
            {subjects?.length ?? 0}
          </span>
        </div>

        {loading ? (
          <Skeleton className="mt-4 h-40 rounded-xl" />
        ) : error ? (
          <div className="mt-4">
            <AcademicEmpty
              title="Subjects unavailable"
              description="Unable to load subjects right now."
            />
          </div>
        ) : subjects?.length === 0 ? (
          <div className="mt-4">
            <AcademicEmpty
              title="No subjects yet"
              description="Add subjects before linking them to classes."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {subjects?.map((subject) => (
              <div
                key={subject.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-theme bg-input px-4 py-3"
              >
                <div>
                  <div className="font-medium text-theme-primary">{subject.name}</div>
                  <div className="mt-1 text-sm text-theme-muted">
                    Linked to {subject.class_count} class{subject.class_count === 1 ? "" : "es"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubject(subject);
                      setEditName(subject.name);
                    }}
                    className="ms-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(subject)}
                    className="ms-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideOver
        open={Boolean(editingSubject)}
        onClose={() => {
          setEditingSubject(null);
          setEditName("");
        }}
        title="Edit subject"
        description="Update the subject name."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingSubject(null);
                setEditName("");
              }}
              className="ms-btn-ghost rounded-xl px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-subject-form"
              disabled={actionLoading}
              className="ms-btn-primary rounded-xl px-4 py-2"
            >
              Save changes
            </button>
          </div>
        }
      >
        <form id="edit-subject-form" onSubmit={(event) => void handleUpdate(event)}>
          <label htmlFor="edit-subject-name" className="mb-1.5 block text-sm font-medium text-theme-primary">
            Subject name
          </label>
          <input
            id="edit-subject-name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
            className="ms-input w-full"
          />
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={
          confirmDelete && confirmDelete.class_count > 0
            ? "Cannot delete subject"
            : "Delete subject"
        }
        description={
          confirmDelete
            ? confirmDelete.class_count > 0
              ? `Cannot delete ${confirmDelete.name}. It is linked to ${confirmDelete.class_count} class${confirmDelete.class_count === 1 ? "" : "es"}. Unlink it first.`
              : `Delete ${confirmDelete.name}? This cannot be undone.`
            : ""
        }
        variant={confirmDelete && confirmDelete.class_count > 0 ? "blocked" : "danger"}
        confirmLabel="Delete subject"
        loading={confirmLoading}
        onConfirm={() => {
          if (!confirmDelete || confirmDelete.class_count > 0) {
            return;
          }

          setConfirmLoading(true);
          void onDelete(confirmDelete)
            .then(() => setConfirmDelete(null))
            .catch(() => {
              // Error feedback is shown by the parent.
            })
            .finally(() => setConfirmLoading(false));
        }}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmDelete(null);
          }
        }}
      >
        {confirmDelete && confirmDelete.class_count > 0 ? (
          <p className="alert-error rounded-lg px-3 py-2 text-sm">
            Remove this subject from all classes before deleting it.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
