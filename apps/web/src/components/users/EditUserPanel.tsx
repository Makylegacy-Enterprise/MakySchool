"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, User } from "lucide-react";
import type { MakySchoolRole } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";
import { formatClassLabel } from "@makyschool/shared/constants";
import { SlideOver } from "@makyschool/ui/components/ui/SlideOver";
import { useApiSWR } from "@/hooks/useApiSWR";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: MakySchoolRole;
  phone?: string | null;
  subject_specialization?: string | null;
  is_active: boolean;
  assigned_classes: Array<{
    class_id?: string;
    subject_id?: string | null;
    class_name?: string;
    level?: string;
    stream?: string | null;
  }>;
};

type ClassRow = {
  id: string;
  level: string;
  stream: string | null;
  subjects: Array<{ id: string; name: string }>;
};

export function EditUserPanel({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = Boolean(user);
  const { data: classes } = useApiSWR<ClassRow[]>(open ? "/schools/classes" : null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<MakySchoolRole>("teacher");
  const [phone, setPhone] = useState("");
  const [subjectSpecialization, setSubjectSpecialization] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [classSubjects, setClassSubjects] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setRole(user.role);
    setPhone(user.phone ?? "");
    setSubjectSpecialization(user.subject_specialization ?? "");
    const classIds = new Set<string>();
    const subjects: Record<string, Set<string>> = {};
    for (const item of user.assigned_classes) {
      if (!item.class_id) continue;
      classIds.add(item.class_id);
      if (item.subject_id) {
        subjects[item.class_id] = subjects[item.class_id] ?? new Set();
        subjects[item.class_id].add(item.subject_id);
      }
    }
    setSelectedClasses(classIds);
    setClassSubjects(subjects);
    setConfirmDeactivate(false);
    setDeactivateReason("");
    setError(null);
  }, [user]);

  const showAssignments = role === "teacher" || role === "head_teacher";

  const assignments = useMemo(() => {
    const rows: Array<{ class_id: string; subject_id?: string }> = [];
    for (const classId of selectedClasses) {
      const subjects = classSubjects[classId];
      if (!subjects?.size) {
        rows.push({ class_id: classId });
        continue;
      }
      for (const subjectId of subjects) {
        rows.push({ class_id: classId, subject_id: subjectId });
      }
    }
    return rows;
  }, [selectedClasses, classSubjects]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await apiClient(`/schools/users/${user.id}`, {
        method: "PATCH",
        body: {
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || null,
          subject_specialization: subjectSpecialization.trim() || null,
          assignments: showAssignments ? assignments : [],
        },
      });
      onSaved();
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (user.is_active) {
        await apiClient(`/schools/users/${user.id}/deactivate`, {
          method: "PATCH",
          body: { reason: deactivateReason.trim() || undefined },
        });
      } else {
        await apiClient(`/schools/users/${user.id}/reactivate`, { method: "PATCH" });
      }
      onSaved();
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleClass(classId: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  function toggleSubject(classId: string, subjectId: string) {
    setClassSubjects((prev) => {
      const current = new Set(prev[classId] ?? []);
      if (current.has(subjectId)) current.delete(subjectId);
      else current.add(subjectId);
      return { ...prev, [classId]: current };
    });
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.full_name}` : "Edit user"}
      description="Update profile details and class assignments."
      footer={
        <div className="flex flex-col gap-2">
          {confirmDeactivate ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleDeactivate()}
                className="ms-btn-danger w-full"
              >
                {loading ? "Saving…" : user?.is_active ? "Confirm deactivate" : "Confirm reactivate"}
              </button>
              <button type="button" className="ms-btn-secondary w-full" onClick={() => setConfirmDeactivate(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                form="edit-user-form"
                disabled={loading}
                className="ms-btn-primary w-full"
              >
                {loading ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="ms-btn-secondary w-full"
                onClick={() => setConfirmDeactivate(true)}
              >
                {user?.is_active ? "Deactivate user" : "Reactivate user"}
              </button>
            </>
          )}
        </div>
      }
    >
      {user ? (
        <form id="edit-user-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          {confirmDeactivate && user.is_active ? (
            <div className="rounded-xl border border-theme bg-theme-surface-raised p-4">
              <p className="text-sm text-theme-primary">
                Deactivate {user.full_name}? They will not be able to log in until reactivated.
              </p>
              <label className="mt-3 block">
                <span className="mb-2 block text-xs text-theme-muted">Reason (optional)</span>
                <input
                  value={deactivateReason}
                  onChange={(event) => setDeactivateReason(event.target.value)}
                  className="ms-input"
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Email (read-only)</span>
            <input value={user.email} readOnly className="ms-input bg-theme-surface-raised" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Full name</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="ms-input pl-10"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MakySchoolRole)}
              className="ms-input"
              disabled={user.role === "admin"}
            >
              <option value="head_teacher">Head Teacher</option>
              <option value="teacher">Teacher</option>
              <option value="learner">Learner</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Phone</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="ms-input pl-10"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Subject specialisation</span>
            <input
              value={subjectSpecialization}
              onChange={(event) => setSubjectSpecialization(event.target.value)}
              className="ms-input"
            />
          </label>

          {showAssignments ? (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium text-theme-muted">Assign classes</legend>
              {(classes ?? []).map((classRow) => (
                <div key={classRow.id} className="rounded-lg border border-theme p-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                    <input
                      type="checkbox"
                      checked={selectedClasses.has(classRow.id)}
                      onChange={() => toggleClass(classRow.id)}
                    />
                    {formatClassLabel(classRow.level, classRow.stream)}
                  </label>
                  {selectedClasses.has(classRow.id) && classRow.subjects?.length ? (
                    <div className="mt-3 space-y-2 pl-6">
                      {classRow.subjects.map((subject) => (
                        <label key={subject.id} className="flex items-center gap-2 text-sm text-theme-muted">
                          <input
                            type="checkbox"
                            checked={classSubjects[classRow.id]?.has(subject.id) ?? false}
                            onChange={() => toggleSubject(classRow.id, subject.id)}
                          />
                          {subject.name}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </fieldset>
          ) : null}

          {error ? <p className="text-sm text-theme-danger">{error}</p> : null}
        </form>
      ) : null}
    </SlideOver>
  );
}
