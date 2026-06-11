import { AuthCard, AuthLayout } from "@/components/auth/AuthLayout";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Set your password"
        subtitle="You're signing in for the first time. Set a permanent password to continue."
      >
        <ChangePasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
