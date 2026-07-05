"use client";

import { useCallback, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ImportPreviewResponse, ImportRowError } from "@makyschool/shared/types";
import { SlideOver } from "@makyschool/ui/components/ui/SlideOver";
import { apiClient } from "@/lib/api/client";
import { downloadStudentImportTemplate } from "@/lib/students/csv-template";
import { useToast } from "@/providers/ToastProvider";

type PanelState = "idle" | "uploading" | "preview" | "confirming" | "errors" | "success";

export function ImportStudentsPanel({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<PanelState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "import_all">("skip");
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const reset = useCallback(() => {
    setState("idle");
    setFile(null);
    setRowCount(0);
    setHeaderError(null);
    setRowErrors([]);
    setPreview(null);
    setDuplicateStrategy("skip");
    setImportedCount(0);
    setSkippedCount(0);
  }, []);

  function requestClose() {
    if (state === "uploading" || state === "confirming") return;
    reset();
    onClose();
  }

  async function downloadTemplate() {
    downloadStudentImportTemplate();
    toast.success("Template downloaded.");
  }

  function parseFile(selected: File) {
    setHeaderError(null);
    setFile(selected);
    setPreview(null);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        setRowCount(rows.length);
        if (rows.length === 0) {
          setHeaderError("The CSV file has headers but no student rows.");
        }
      },
      error: () => {
        setHeaderError("Could not read the CSV file.");
      },
    });
  }

  async function handlePreview() {
    if (!file || headerError) return;
    setState("uploading");

    const formData = new FormData();
    formData.append("file", file, file.name || "student_import.csv");

    try {
      const response = await apiClient<ImportPreviewResponse>("/schools/students/import/preview", {
        method: "POST",
        body: formData,
      });

      setPreview(response.data);
      setRowErrors(response.data.errors ?? []);
      setState("preview");

      if (!response.data.can_confirm) {
        toast.warning("Fix the issues below before importing.");
      } else if (response.data.error_count > 0) {
        toast.warning(`${response.data.error_count} rows have validation errors.`);
      } else if (response.data.duplicate_count > 0) {
        toast.info(`${response.data.duplicate_count} duplicate rows detected.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not validate the CSV file.";
      setHeaderError(message);
      toast.error(message);
      setState("idle");
    }
  }

  async function handleConfirm() {
    if (!preview?.job_id) return;
    setState("confirming");

    try {
      const response = await apiClient<{ imported: number; skipped: number; message: string }>(
        "/schools/students/import/confirm",
        {
          method: "POST",
          body: {
            job_id: preview.job_id,
            duplicate_strategy: duplicateStrategy,
          },
        },
      );

      setImportedCount(response.data.imported ?? 0);
      setSkippedCount(response.data.skipped ?? 0);
      setState("success");
      toast.success(response.data.message ?? `${response.data.imported} students imported.`);
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed. Please try again.";
      setHeaderError(message);
      toast.error(message);
      setState("preview");
    }
  }

  const importCount =
    preview && duplicateStrategy === "skip"
      ? preview.valid_count
      : preview
        ? preview.valid_count + preview.duplicate_count
        : 0;

  return (
    <SlideOver
      open={open}
      onClose={requestClose}
      title={
        state === "success"
          ? "Import complete"
          : state === "preview"
            ? "Review import"
            : "Import students from CSV"
      }
      description={
        state === "success"
          ? `${importedCount} students were registered successfully.`
          : "Upload a CSV, review validation results, then confirm the import."
      }
    >
      <div className="max-w-xl space-y-6">
        {state === "success" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-theme-success" />
            <p className="mt-4 text-lg font-semibold text-theme-primary">{importedCount} students imported</p>
            <p className="mt-1 text-sm text-theme-muted">
              {importedCount} registered · {skippedCount} skipped
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

        {state === "preview" && preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Total", preview.total_rows],
                ["Valid", preview.valid_count],
                ["Errors", preview.error_count],
                ["Duplicates", preview.duplicate_count],
              ].map(([label, count]) => (
                <div key={label} className="rounded-xl border border-theme bg-theme-raised px-3 py-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-theme-primary">{count}</p>
                </div>
              ))}
            </div>

            {preview.error_count > 0 ? (
              <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">
                {preview.error_count} rows have errors and will not be imported.
              </div>
            ) : null}

            {preview.duplicate_count > 0 ? (
              <div className="space-y-3 rounded-xl border border-theme bg-theme-surface p-4">
                <div className="flex items-start gap-2 text-sm text-theme-primary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-theme-warning" />
                  <p>{preview.duplicate_count} duplicate rows were detected.</p>
                </div>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-theme px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="duplicateStrategy"
                      checked={duplicateStrategy === "skip"}
                      onChange={() => setDuplicateStrategy("skip")}
                    />
                    Skip duplicates (recommended)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-theme px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="duplicateStrategy"
                      checked={duplicateStrategy === "import_all"}
                      onChange={() => setDuplicateStrategy("import_all")}
                    />
                    Import duplicates anyway
                  </label>
                </div>
              </div>
            ) : null}

            {(rowErrors.length > 0 || preview.duplicates.length > 0) && (
              <div className="max-h-52 overflow-auto rounded-xl border border-theme">
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
                      <tr key={`err-${item.row}-${item.field}`}>
                        <td>{item.row}</td>
                        <td>{item.field}</td>
                        <td>{item.message}</td>
                      </tr>
                    ))}
                    {preview.duplicates.map((item) => (
                      <tr key={`dup-${item.row}-${item.type}`}>
                        <td>{item.row}</td>
                        <td>{item.type === "in_file" ? "Duplicate" : "Existing"}</td>
                        <td>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {headerError ? <p className="text-sm text-theme-danger">{headerError}</p> : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="ms-btn-primary flex-1"
                disabled={!preview.can_confirm}
                onClick={() => void handleConfirm()}
              >
                Import {importCount} students
              </button>
              <button type="button" className="ms-btn-secondary" onClick={reset}>
                Re-upload
              </button>
            </div>
          </div>
        ) : null}

        {state === "confirming" ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-theme-raised">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-theme-accent" />
            </div>
            <p className="mt-4 text-sm text-theme-muted">Importing students…</p>
          </div>
        ) : null}

        {state === "errors" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">
              {rowErrors.length} rows have errors. Fix them and re-upload.
            </div>
            <button type="button" className="ms-btn-primary" onClick={reset}>
              Re-upload fixed file
            </button>
          </div>
        ) : null}

        {state === "uploading" ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-theme-raised">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-theme-accent" />
            </div>
            <p className="mt-4 text-sm text-theme-muted">Validating {rowCount} rows…</p>
          </div>
        ) : null}

        {state === "idle" ? (
          <>
            <button
              type="button"
              onClick={() => void downloadTemplate()}
              className="inline-flex items-center gap-2 rounded-lg border border-theme bg-theme-raised px-3 py-2 text-sm font-medium text-theme-primary transition hover:bg-theme-surface"
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </button>

            <div className="rounded-xl border border-theme bg-theme-raised/60 px-4 py-3 text-sm text-theme-muted">
              <p className="font-medium text-theme-primary">Required columns</p>
              <p className="mt-1 leading-relaxed">
                <span className="font-mono text-theme-primary">name</span>,{" "}
                <span className="font-mono text-theme-primary">class</span> (must match a class in your school), and{" "}
                <span className="font-mono text-theme-primary">parent_name</span>.
              </p>
              <p className="mt-2 text-xs">
                If you edit the file in Excel, keep column names as-is or use labels like &quot;Student Name&quot; and
                &quot;Parent Name&quot;.
              </p>
            </div>

            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-theme bg-theme-surface p-10 text-center transition hover:border-theme-strong hover:bg-theme-raised">
              <Upload className="mx-auto h-10 w-10 text-theme-faint" />
              <p className="mt-3 text-sm font-medium text-theme-primary">Drop your CSV here, or click to browse</p>
              <p className="mt-1 text-xs text-theme-muted">UTF-8 CSV · max 10 MB</p>
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
              <div className="flex items-center gap-3 rounded-xl border border-theme bg-theme-surface px-4 py-3">
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-theme-accent" />
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-theme-primary">{file.name}</p>
                  <p className="text-theme-muted">
                    {(file.size / 1024).toFixed(0)} KB · {rowCount} rows
                  </p>
                </div>
              </div>
            ) : null}

            {headerError ? (
              <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">{headerError}</div>
            ) : null}

            <button
              type="button"
              className="ms-btn-primary w-full"
              disabled={!file || Boolean(headerError)}
              onClick={() => void handlePreview()}
            >
              Upload and review
            </button>
          </>
        ) : null}
      </div>
    </SlideOver>
  );
}
