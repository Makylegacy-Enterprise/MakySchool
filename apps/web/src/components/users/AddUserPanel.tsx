"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Phone, User } from "lucide-react";
import type { MakySchoolRole } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";
import { formatClassLabel } from "@makyschool/shared/constants";
import { SlideOver } from "@makyschool/ui/components/ui/SlideOver";
import { useApiSWR } from "@/hooks/useApiSWR";

type ClassRow = {
  id: string;
  level: string;
  stream: string | null;
  subjects: Array<{ id: string; name: string }>;
};

type CreateResponse = {
  user: { id: string; full_name: string; email: string; role: MakySchoolRole };
  temp_password: string;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-theme px-3 py-2 text-xs font-medium text-theme-accent"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AddUserPanel({
  open,
  onClose,
  onSaved,
  defaultRole = "teacher",
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultRole?: MakySchoolRole;
}) {
  const { data: classes } = useApiSWR<ClassRow[]>(open ? "/schools/classes" : null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MakySchoolRole>("teacher");
  const [phone, setPhone] = useState("");
  const [subjectSpecialization, setSubjectSpecialization] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [classSubjects, setClassSubjects] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateResponse | null>(null);

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setRole(defaultRole);
      setPhone("");
      setSubjectSpecialization("");
      setSelectedClasses(new Set());
      setClassSubjects({});
      setError(null);
      setSuccess(null);
    } else {
      setRole(defaultRole);
    }
  }, [open, defaultRole]);

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
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<CreateResponse>("/schools/users", {
        method: "POST",
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          phone: phone.trim() || undefined,
          subject_specialization: subjectSpecialization.trim() || undefined,
          assignments: showAssignments ? assignments : undefined,
        },
      });
      setSuccess(response.data);
      onSaved();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  function toggleClass(classId: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  }

  function toggleSubject(classId: string, subjectId: string) {
    setClassSubjects((prev) => {
      const current = new Set(prev[classId] ?? []);
      if (current.has(subjectId)) {
        current.delete(subjectId);
      } else {
        current.add(subjectId);
      }
      return { ...prev, [classId]: current };
    });
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={success ? "User created" : "Add user"}
      description={
        success
          ? "Share the temporary password securely."
          : "Create a staff account with a one-time temporary password."
      }
      footer={
        success ? (
          <button type="button" className="ms-btn-primary w-full" onClick={onClose}>
            Done
          </button>
        ) : (
          <button
            type="submit"
            form="add-user-form"
            disabled={loading}
            className="ms-btn-primary w-full"
          >
            {loading ? "Creating…" : "Create user"}
          </button>
        )
      }
    >
      {success ? (
        <div className="space-y-4">
          <p className="text-sm text-theme-muted">
            Account created for <strong className="text-theme-primary">{success.user.email}</strong>
          </p>
          <div className="rounded-xl border border-theme bg-theme-surface-raised p-4">
            <p className="mb-2 text-xs font-medium text-theme-muted">Temporary password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-theme-surface px-3 py-2 font-mono text-sm">
                {success.temp_password}
              </code>
              <CopyButton value={success.temp_password} />
            </div>
          </div>
          <p className="text-xs text-theme-danger">
            Share this with the user. It will not be shown again.
          </p>
        </div>
      ) : (
        <form id="add-user-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
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
            <span className="mb-2 block text-xs font-medium text-theme-muted">Email address</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
            >
              <option value="head_teacher">Head Teacher</option>
              <option value="teacher">Teacher</option>
              <option value="bursar">Bursar</option>
            </select>
          </label>

          {role === "bursar" ? (
            <p className="rounded-lg border border-theme bg-theme-surface-raised px-3 py-2 text-sm text-theme-muted">
              Bursars only have access to the fees module. No class assignments needed.
            </p>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-theme-muted">Phone number (optional)</span>
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
            <span className="mb-2 block text-xs font-medium text-theme-muted">
              Subject specialisation (optional)
            </span>
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
                      <p className="text-xs text-theme-muted">Subjects for this class</p>
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
      )}
    </SlideOver>
  );
}
