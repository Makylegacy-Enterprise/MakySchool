"use client";

import { useState } from "react";
import Link from "next/link";
import type { MakySchoolRole } from "@makyschool/shared/types";
import { CanDo } from "@/components/ui/CanDo";
import { EditUserPanel } from "@/components/users/EditUserPanel";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { EmptyState } from "@makyschool/ui/components/ui/EmptyState";
import { QueryState } from "@makyschool/ui/components/ui/QueryState";
import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";
import { useApiSWR } from "@/hooks/useApiSWR";
import { formatClassAssignmentLabel, roleBadgeClass, roleLabel } from "@/lib/users/display";

type UserDetail = {
  id: string;
  full_name: string;
  email: string;
  role: MakySchoolRole;
  phone?: string | null;
  subject_specialization?: string | null;
  is_active: boolean;
  assigned_classes: Array<{
    class_id: string;
    class_name?: string;
    level?: string;
    stream?: string | null;
    subject_name?: string | null;
  }>;
};

type Tab = "profile" | "classes" | "activity";

export function UserDetailContent({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [editOpen, setEditOpen] = useState<UserDetail | null>(null);
  const { data, error, isLoading, mutate } = useApiSWR<UserDetail>(`/schools/users/${userId}`);

  return (
    <DashboardPage maxWidth="7xl">
      <QueryState
        error={error}
        isLoading={isLoading}
        data={data}
        onRetry={() => void mutate()}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
        empty={<EmptyState title="User not found" description="This user may have been removed." />}
        isEmpty={() => false}
      >
        {(user) => (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link href="/dashboard/users" className="text-xs text-theme-muted hover:text-theme-accent">
                  ← Back to users
                </Link>
                <h1 className="mt-2 text-xl font-semibold text-theme-primary">{user.full_name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.is_active ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditOpen(user)} className="ms-btn-secondary">
                  Edit
                </button>
                <CanDo action="manageUsers">
                  <button type="button" onClick={() => setEditOpen(user)} className="ms-btn-secondary">
                    {user.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </CanDo>
              </div>
            </div>

            <div className="mb-6 flex gap-2 border-b border-theme pb-3">
              {(
                [
                  ["profile", "Profile"],
                  ["classes", "Assigned Classes"],
                  ["activity", "Activity"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === key ? "bg-theme-accent text-on-accent" : "text-theme-muted hover:bg-nav-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "profile" ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-theme-muted">Email</dt>
                  <dd className="text-sm text-theme-primary">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-theme-muted">Phone</dt>
                  <dd className="text-sm text-theme-primary">{user.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-theme-muted">Subject specialisation</dt>
                  <dd className="text-sm text-theme-primary">{user.subject_specialization || "—"}</dd>
                </div>
              </dl>
            ) : null}

            {tab === "classes" ? (
              <div className="overflow-hidden rounded-xl border border-theme">
                <table className="ms-table w-full">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Stream</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.assigned_classes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-sm text-theme-muted">
                          No class assignments yet.
                        </td>
                      </tr>
                    ) : (
                      user.assigned_classes.map((row, index) => (
                        <tr key={`${row.class_id}-${index}`}>
                          <td>{row.class_name ?? row.level}</td>
                          <td>{row.stream || "—"}</td>
                          <td>{row.subject_name || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="border-t border-theme p-4">
                  <button type="button" className="ms-btn-secondary" onClick={() => setEditOpen(user)}>
                    Edit assignments
                  </button>
                </div>
              </div>
            ) : null}

            {tab === "activity" ? (
              <div className="rounded-xl border border-dashed border-theme bg-theme-surface px-5 py-8 text-center">
                <p className="text-sm text-theme-muted">Activity log coming in Week 2.</p>
              </div>
            ) : null}
          </>
        )}
      </QueryState>

      <EditUserPanel user={editOpen} onClose={() => setEditOpen(null)} onSaved={() => void mutate()} />
    </DashboardPage>
  );
}
