"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CreditCard, LayoutDashboard, LogOut } from "lucide-react";
import { subscriptionsEnabled } from "@makyschool/shared/constants";
import { apiClient } from "@/lib/api/client";
import { clearSchoolSlug } from "@/lib/auth/session";

const baseLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/classes", label: "Classes", icon: BookOpen, exact: false },
] as const;

export function TenantMobileNav({
  schoolName,
  schoolStatus,
}: {
  schoolName?: string | null;
  schoolStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const billingEnabled = subscriptionsEnabled();

  const navLinks =
    schoolStatus === "setup"
      ? [{ href: "/dashboard/setup", label: "Setup", icon: LayoutDashboard, exact: false }]
      : [
          ...baseLinks,
          ...(billingEnabled
            ? [{ href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false } as const]
            : []),
        ];

  async function handleLogout() {
    await apiClient("/auth/logout", { method: "POST" });
    clearSchoolSlug();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[#252A3A] bg-[#181C27] lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4F6EF7] text-xs font-bold text-white">
            MS
          </span>
          <p className="truncate text-sm font-semibold text-[#F0F2FA]">
            {schoolName ?? "Your school"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="shrink-0 rounded-lg p-2 text-[#8B90A7] transition hover:bg-[#252A3A] hover:text-[#F0F2FA]"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                active
                  ? "bg-[#1E2A5E] text-[#4F6EF7]"
                  : "text-[#8B90A7] hover:bg-[#252A3A] hover:text-[#F0F2FA]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
