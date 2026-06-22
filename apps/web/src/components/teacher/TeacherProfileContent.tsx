"use client";

import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { roleLabel } from "@/lib/users/display";

export function TeacherProfileContent() {
  const { state, refresh } = useAuth();
  const user = state.user;

  return (
    <DashboardPage
      eyebrow="Teacher portal"
      title="My profile"
      description="Your account details on file with the school."
      maxWidth="lg"
    >
      {state.loading ? (
        <Skeleton className="h-40 w-full" />
      ) : state.error ? (
        <div className="space-y-3">
          <p className="text-sm text-theme-danger">{state.error}</p>
          <button type="button" className="ms-btn-secondary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : !user ? (
        <p className="text-sm text-theme-muted">Unable to load profile.</p>
      ) : (
        <dl className="space-y-4 rounded-xl border border-theme bg-theme-surface p-6">
          <div>
            <dt className="text-xs text-theme-muted">Name</dt>
            <dd className="text-sm font-medium text-theme-primary">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-theme-muted">Email</dt>
            <dd className="text-sm text-theme-primary">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-theme-muted">Role</dt>
            <dd className="text-sm text-theme-primary">{roleLabel(user.role)}</dd>
          </div>
          <a
            href={`mailto:?subject=${encodeURIComponent("Profile change request")}&body=${encodeURIComponent(`Hello,\n\nI would like to request a change to my profile.\n\nName: ${user.name}\nEmail: ${user.email}\n`)}`}
            className="ms-btn-secondary inline-flex"
          >
            Request change
          </a>
        </dl>
      )}
    </DashboardPage>
  );
}
