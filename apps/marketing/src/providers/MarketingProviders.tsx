"use client";

import { ThemeProvider } from "@makyschool/ui/providers/ThemeProvider";

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
