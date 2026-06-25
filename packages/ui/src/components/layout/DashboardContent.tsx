import type { ReactNode } from "react";

const maxWidthClass = {
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
} as const;

export function DashboardContent({
  children,
  maxWidth = "7xl",
}: {
  children: ReactNode;
  maxWidth?: keyof typeof maxWidthClass;
}) {
  return (
    <div className={`mx-auto w-full ${maxWidthClass[maxWidth]} px-4 py-6 sm:px-6 lg:px-8`}>
      {children}
    </div>
  );
}
