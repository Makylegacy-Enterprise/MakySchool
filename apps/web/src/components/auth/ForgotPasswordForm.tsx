"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthAlert, AuthInput, AuthSubmitButton } from "@/components/auth/AuthShell";
import { apiClient } from "@/lib/api/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-theme-muted">
          Check your email. A reset link has been sent to{" "}
          <span className="font-medium text-theme-primary">{email}</span> if an account exists.
        </p>
        <Link href="/login" className="text-xs font-medium text-theme-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <AuthInput
        id="email"
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        icon={Mail}
        autoComplete="email"
      />
      {error ? <AuthAlert message={error} /> : null}
      <AuthSubmitButton loading={loading}>Send reset link</AuthSubmitButton>
      <Link href="/login" className="block text-center text-xs font-medium text-theme-muted hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
