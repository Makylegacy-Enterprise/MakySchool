"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Badge } from "@makyschool/ui/components/ui/Badge";
import { ConfirmDialog } from "@makyschool/ui/components/ui/ConfirmDialog";
import { LoadingButton } from "@makyschool/ui/components/ui/LoadingButton";
import { StatusBanner } from "@makyschool/ui/components/ui/StatusBanner";

const labelClass = "mb-2 block text-xs font-medium text-theme-muted";

type SchoolAdmin = {
  id: string;
  email: string;
  name: string;
};

export function SchoolDetail({
  school,
  admin,
  subscriptionHistory,
  counts,
  setupStatus,
}: {
  school: {
    id: string;
    slug: string;
    name: string | null;
    status: string;
    subscription_status: string;
    subscription_term: string | null;
    subscription_year: number | null;
    school_type: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    stamp_url: string | null;
    schoolpay_code: string | null;
  };
  admin: SchoolAdmin | null;
  subscriptionHistory: Array<{
    id: string;
    amount: number;
    term: string;
    year: number;
    schoolpay_ref: string | null;
    paid_at: string | null;
  }>;
  counts: { classes: number; teachers: number; students: number };
  setupStatus?: {
    profileComplete: boolean;
    academicYearComplete: boolean;
    gradingScaleComplete: boolean;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "subscription" | "settings">("overview");
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function toggleSuspend() {
    setLoading(true);
    try {
      const status = school.status === "active" ? "suspended" : "active";
      await apiClient(`/superadmin/schools/${school.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function recordManualPayment(formData: FormData) {
    setLoading(true);
    setPaymentError(null);
    try {
      const amount = Number(formData.get("amount"));
      const term = String(formData.get("term") ?? "").trim();
      const year = Number(formData.get("year"));

      if (!amount || !term || !year) {
        throw new Error("Amount, term, and year are required");
      }

      await apiClient(`/superadmin/schools/${school.id}/subscription`, {
        method: "POST",
        body: {
          amount,
          term,
          year,
          schoolpayRef: String(formData.get("schoolpayRef") ?? ""),
        },
      });
      router.refresh();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  async function saveSchoolSettings(formData: FormData) {
    setLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const subscriptionYearRaw = String(formData.get("subscriptionYear") ?? "").trim();
      const subscriptionYear = subscriptionYearRaw ? Number(subscriptionYearRaw) : undefined;

      await apiClient(`/superadmin/schools/${school.id}`, {
        method: "PATCH",
        body: {
          name: String(formData.get("name") ?? "").trim(),
          slug: String(formData.get("slug") ?? "").trim(),
          schoolType: String(formData.get("schoolType") ?? "").trim() || null,
          email: String(formData.get("email") ?? "").trim() || null,
          phone: String(formData.get("phone") ?? "").trim() || null,
          address: String(formData.get("address") ?? "").trim() || null,
          subscriptionStatus: String(formData.get("subscriptionStatus") ?? "").trim() || undefined,
          subscriptionTerm: String(formData.get("subscriptionTerm") ?? "").trim() || null,
          subscriptionYear,
          schoolpayCode: String(formData.get("schoolpayCode") ?? "").trim() || null,
          adminName: String(formData.get("adminName") ?? "").trim() || undefined,
          adminEmail: String(formData.get("adminEmail") ?? "").trim() || undefined,
        },
      });
      setSettingsSuccess("School details saved.");
      router.refresh();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Failed to save school");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSchool() {
    setLoading(true);
    setDeleteError(null);
    try {
      await apiClient(`/superadmin/schools/${school.id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete school");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="ms-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={school.status === "active" ? "success" : school.status === "setup" ? "warning" : "danger"}>
              {school.status}
            </Badge>
            <Badge
              tone={
                school.subscription_status === "active"
                  ? "success"
                  : school.subscription_status === "expired"
                    ? "danger"
                    : "warning"
              }
            >
              {school.subscription_status}
            </Badge>
          </div>
          {school.status === "active" || school.status === "suspended" ? (
            <button
              onClick={() => void toggleSuspend()}
              disabled={loading}
              className={school.status === "active" ? "ms-btn-ghost" : "ms-btn-primary"}
            >
              {school.status === "active" ? "Suspend" : "Reactivate"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ms-panel flex gap-2 p-2">
        {(["overview", "subscription", "settings"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === item ? "bg-theme-accent text-on-accent" : "text-theme-muted hover:bg-nav-hover"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="ms-panel p-5 sm:p-6">
            <p className="text-sm text-theme-muted">Classes</p>
            <p className="mt-2 text-3xl font-semibold text-theme-primary">{counts.classes}</p>
          </div>
          <div className="ms-panel p-5 sm:p-6">
            <p className="text-sm text-theme-muted">Teachers</p>
            <p className="mt-2 text-3xl font-semibold text-theme-primary">{counts.teachers}</p>
          </div>
          <div className="ms-panel p-5 sm:p-6">
            <p className="text-sm text-theme-muted">Students</p>
            <p className="mt-2 text-3xl font-semibold text-theme-primary">{counts.students}</p>
          </div>
          <div className="ms-panel p-5 sm:p-6 md:col-span-3">
            <p className="text-sm font-semibold text-theme-primary">School admin</p>
            <p className="mt-2 text-sm text-theme-muted">
              {admin ? (
                <>
                  <span className="font-medium text-theme-primary">{admin.name}</span>
                  <span className="mx-2 text-theme-faint">·</span>
                  {admin.email}
                </>
              ) : (
                "No admin account found"
              )}
            </p>
          </div>
          <div className="ms-panel p-5 sm:p-6 md:col-span-3">
            <p className="text-sm font-semibold text-theme-primary">Setup</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-theme p-4 text-theme-muted">
                Profile {setupStatus?.profileComplete ? "✓" : "—"}
              </div>
              <div className="rounded-lg border border-theme p-4 text-theme-muted">
                Academic year {setupStatus?.academicYearComplete ? "✓" : "—"}
              </div>
              <div className="rounded-lg border border-theme p-4 text-theme-muted">
                Grading {setupStatus?.gradingScaleComplete ? "✓" : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "subscription" ? (
        <div className="space-y-4 ms-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-theme-muted">Current term</p>
              <p className="mt-1 text-lg font-semibold text-theme-primary">
                {school.subscription_term ?? "—"} {school.subscription_year ?? ""}
              </p>
            </div>
            <form
              action={(formData) => {
                void recordManualPayment(formData);
              }}
              className="flex flex-wrap gap-2"
            >
              <input name="amount" type="number" required placeholder="Amount" className="w-28 ms-input" />
              <input name="term" required placeholder="Term" className="w-32 ms-input" />
              <input name="year" type="number" required placeholder="Year" className="w-24 ms-input" />
              <input name="schoolpayRef" placeholder="Reference" className="w-40 ms-input" />
              <button disabled={loading} type="submit" className="ms-btn-primary">
                Record payment
              </button>
            </form>
          </div>
          {paymentError ? <StatusBanner tone="error" message={paymentError} /> : null}
          <div className="overflow-hidden rounded-lg border border-theme">
            <table className="min-w-full divide-y divide-theme">
              <thead className="bg-table-header text-left text-xs font-medium text-theme-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {subscriptionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-theme-muted">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  subscriptionHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-sm text-theme-muted">
                        {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">
                        {entry.term} {entry.year}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">
                        UGX {entry.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">{entry.schoolpay_ref ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-6">
          <form
            action={(formData) => {
              void saveSchoolSettings(formData);
            }}
            className="ms-panel space-y-6 p-5 sm:p-6"
          >
            <div>
              <h3 className="text-base font-semibold text-theme-primary">School profile</h3>
              <p className="mt-1 text-sm text-theme-muted">Update school details shown in the tenant app.</p>
            </div>

            {settingsError ? <StatusBanner tone="error" message={settingsError} onDismiss={() => setSettingsError(null)} /> : null}
            {settingsSuccess ? <StatusBanner tone="success" message={settingsSuccess} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelClass}>School name</span>
                <input name="name" defaultValue={school.name ?? ""} required className="ms-input" />
              </label>
              <label className="block">
                <span className={labelClass}>Slug</span>
                <input name="slug" defaultValue={school.slug} required className="ms-input" />
              </label>
              <label className="block">
                <span className={labelClass}>School type</span>
                <select name="schoolType" defaultValue={school.school_type ?? ""} className="ms-select w-full">
                  <option value="">Not set</option>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Official email</span>
                <input name="email" type="email" defaultValue={school.email ?? ""} className="ms-input" />
              </label>
              <label className="block">
                <span className={labelClass}>Phone</span>
                <input name="phone" defaultValue={school.phone ?? ""} className="ms-input" />
              </label>
              <label className="block md:col-span-2">
                <span className={labelClass}>Address</span>
                <textarea name="address" rows={2} defaultValue={school.address ?? ""} className="ms-input" />
              </label>
            </div>

            <div className="border-t border-theme pt-6">
              <h4 className="text-sm font-semibold text-theme-primary">Primary admin</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Admin name</span>
                  <input name="adminName" defaultValue={admin?.name ?? ""} className="ms-input" />
                </label>
                <label className="block">
                  <span className={labelClass}>Admin email</span>
                  <input name="adminEmail" type="email" defaultValue={admin?.email ?? ""} className="ms-input" />
                </label>
              </div>
            </div>

            <div className="border-t border-theme pt-6">
              <h4 className="text-sm font-semibold text-theme-primary">Subscription</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className={labelClass}>Status</span>
                  <select
                    name="subscriptionStatus"
                    defaultValue={school.subscription_status}
                    className="ms-select w-full"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Term</span>
                  <input name="subscriptionTerm" defaultValue={school.subscription_term ?? ""} className="ms-input" />
                </label>
                <label className="block">
                  <span className={labelClass}>Year</span>
                  <input
                    name="subscriptionYear"
                    type="number"
                    defaultValue={school.subscription_year ?? ""}
                    className="ms-input"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-theme pt-6">
              <label className="block max-w-md">
                <span className={labelClass}>Legacy SchoolPay code (optional)</span>
                <input
                  name="schoolpayCode"
                  defaultValue={school.schoolpay_code ?? ""}
                  placeholder="Merchant code"
                  className="ms-input"
                />
              </label>
            </div>

            <LoadingButton type="submit" loading={loading} loadingLabel="Saving…">
              Save changes
            </LoadingButton>
          </form>

          <div className="ms-panel border-danger-border p-5 sm:p-6">
            <h3 className="text-base font-semibold text-theme-primary">Delete school</h3>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              Permanently remove this school, its users, classes, and payment history. This cannot be undone.
            </p>
            {deleteError ? (
              <div className="mt-4">
                <StatusBanner tone="error" message={deleteError} onDismiss={() => setDeleteError(null)} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-4 inline-flex items-center gap-2 ms-btn-danger"
            >
              <Trash2 className="h-4 w-4" />
              Delete school
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this school?"
        description={`This will permanently delete ${school.name ?? "this school"} and all related data.`}
        confirmLabel="Delete school"
        variant="danger"
        loading={loading}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteSchool()}
      />
    </div>
  );
}
