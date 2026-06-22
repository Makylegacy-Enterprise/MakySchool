"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AuthAlert, AuthInput, AuthSubmitButton } from "@/components/auth/AuthShell";
import { apiClient } from "@/lib/api/client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validationError = useMemo(() => {
    if (!password) return null;
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/\d/.test(password)) return "Password must contain at least one number";
    if (confirm && password !== confirm) return "Passwords do not match";
    return null;
  }, [password, confirm]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (validationError || password !== confirm) {
      setError(validationError ?? "Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient("/auth/reset-password", {
        method: "POST",
        body: { email, token, new_password: password },
      });
      setSuccess(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "This link has expired or is invalid. Request a new one.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <p className="text-sm text-theme-muted">
        This link has expired or is invalid.{" "}
        <Link href="/auth/forgot-password" className="text-theme-accent hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-theme-muted">Password updated. You can now sign in.</p>
        <Link href="/login" className="text-xs font-medium text-theme-accent hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <AuthInput
        id="password"
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        icon={Lock}
        autoComplete="new-password"
      />
      <AuthInput
        id="confirm"
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        icon={Lock}
        autoComplete="new-password"
        error={validationError}
      />
      {error ? <AuthAlert message={error} /> : null}
      <AuthSubmitButton loading={loading}>Update password</AuthSubmitButton>
    </form>
  );
}
