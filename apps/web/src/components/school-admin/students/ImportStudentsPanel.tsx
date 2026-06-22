"use client";

import { useCallback, useState } from "react";
import Papa from "papaparse";
import { CheckCircle2, Download, Upload } from "lucide-react";
import { SlideOver } from "@makyschool/ui/components/ui/SlideOver";
import { CLIENT_APP_HEADER, TENANT_HEADERS } from "@makyschool/shared/constants";
import { resolveClientApiUrl } from "@/lib/api/base-url";
import { readStoredSchoolSlug } from "@/lib/auth/session";
import type { ImportErrorResponse, ImportRowError } from "@/lib/students/types";

const REQUIRED_HEADERS = ["name", "class", "parent_name"];

type PanelState = "idle" | "uploading" | "errors" | "success";

export function ImportStudentsPanel({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<PanelState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const reset = useCallback(() => {
    setState("idle");
    setFile(null);
    setRowCount(0);
    setHeaderError(null);
    setRowErrors([]);
    setSummary(null);
    setImportedCount(0);
  }, []);

  function requestClose() {
    if (state === "uploading") return;
    reset();
    onClose();
  }

  async function downloadTemplate() {
    const slug = readStoredSchoolSlug();
    const headers = new Headers();
    headers.set(CLIENT_APP_HEADER, "tenant");
    if (slug) headers.set(TENANT_HEADERS.SCHOOL_SLUG, slug);

    const response = await fetch(resolveClientApiUrl("/schools/students/import/template"), {
      credentials: "include",
      headers,
    });

    if (!response.ok) return;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function parseFile(selected: File) {
    setHeaderError(null);
    setFile(selected);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        setRowCount(rows.length);

        const headers = Object.keys(rows[0] ?? {}).map((header) => header.trim().toLowerCase());
        const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
        if (missing.length > 0) {
          setHeaderError(`CSV is missing required columns: ${missing.join(", ")}`);
        }
      },
    });
  }

  async function handleUpload() {
    if (!file || headerError) return;

    setState("uploading");

    const slug = readStoredSchoolSlug();
    const formData = new FormData();
    formData.append("file", file);

    const headers = new Headers();
    headers.set(CLIENT_APP_HEADER, "tenant");
    if (slug) headers.set(TENANT_HEADERS.SCHOOL_SLUG, slug);

    try {
      const response = await fetch(resolveClientApiUrl("/schools/students/import"), {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      const payload = (await response.json()) as
        | { data: { message: string; imported: number } }
        | ImportErrorResponse;

      if (!response.ok) {
        if ("row_errors" in payload) {
          setRowErrors(payload.row_errors);
          setSummary(payload.summary);
          setState("errors");
          return;
        }
        setHeaderError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Import failed.",
        );
        setState("idle");
        return;
      }

      setImportedCount("data" in payload ? payload.data.imported : 0);
      setState("success");
      onSaved();
    } catch {
      setHeaderError("Could not upload the file. Please try again.");
      setState("idle");
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={requestClose}
      title={state === "success" ? "Import complete" : "Import students from CSV"}
      description={
        state === "success"
          ? `${importedCount} students were registered successfully.`
          : "Upload a CSV file to register multiple students at once."
      }
    >
      <div className="max-w-xl space-y-6">
        {state === "success" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-theme-success" />
            <p className="mt-4 text-lg font-semibold text-theme-primary">{importedCount} students imported</p>
            <p className="mt-1 text-sm text-theme-muted">
              {importedCount} registered successfully · 0 skipped
            </p>
            <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
              <button type="button" className="ms-btn-primary flex-1" onClick={requestClose}>
                View students
              </button>
              <button type="button" className="ms-btn-secondary flex-1" onClick={reset}>
                Import another file
              </button>
            </div>
          </div>
        ) : null}

        {state === "errors" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">
              {rowErrors.length} rows have errors. Fix them and re-upload.
            </div>
            <div className="overflow-hidden rounded-xl border border-theme">
              <table className="ms-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Field</th>
                    <th>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {rowErrors.map((item) => (
                    <tr key={`${item.row}-${item.field}`}>
                      <td>{item.row}</td>
                      <td>{item.field}</td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary ? <p className="text-sm text-theme-muted">{summary}</p> : null}
            <p className="text-sm text-theme-muted">No students were imported.</p>
            <div className="flex gap-2">
              <button type="button" className="ms-btn-primary" onClick={reset}>
                Re-upload fixed file
              </button>
              <button type="button" className="ms-btn-secondary" onClick={requestClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {state === "uploading" ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-theme-raised">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-theme-accent" />
            </div>
            <p className="mt-4 text-sm text-theme-muted">
              Uploading and validating {rowCount} rows…
            </p>
          </div>
        ) : null}

        {state === "idle" ? (
          <>
            <button
              type="button"
              onClick={() => void downloadTemplate()}
              className="inline-flex items-center gap-2 text-sm text-theme-accent hover:underline"
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </button>

            <p className="text-sm text-theme-muted">
              Required columns: <span className="font-mono text-theme-primary">name</span>,{" "}
              <span className="font-mono text-theme-primary">dob</span>,{" "}
              <span className="font-mono text-theme-primary">gender</span>,{" "}
              <span className="font-mono text-theme-primary">class</span>,{" "}
              <span className="font-mono text-theme-primary">parent_name</span>,{" "}
              <span className="font-mono text-theme-primary">parent_phone</span>
            </p>

            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-theme p-10 text-center hover:bg-theme-raised">
              <Upload className="mx-auto h-10 w-10 text-theme-faint" />
              <p className="mt-3 text-sm text-theme-primary">
                Drop your CSV file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) parseFile(selected);
                }}
              />
            </label>

            {file ? (
              <div className="rounded-lg border border-theme bg-theme-raised px-3 py-2 text-sm">
                <p className="font-medium text-theme-primary">{file.name}</p>
                <p className="text-theme-muted">
                  {(file.size / 1024).toFixed(0)} KB · {rowCount} rows detected
                </p>
              </div>
            ) : null}

            {headerError ? (
              <p className="text-sm text-theme-danger">{headerError}</p>
            ) : null}

            <button
              type="button"
              className="ms-btn-primary w-full"
              disabled={!file || Boolean(headerError)}
              onClick={() => void handleUpload()}
            >
              Upload and import
            </button>
          </>
        ) : null}
      </div>
    </SlideOver>
  );
}
