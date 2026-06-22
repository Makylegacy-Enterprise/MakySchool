"use client";

import type { ReactNode } from "react";
import { can, type PermissionAction } from "@makyschool/shared/constants";
import type { MakySchoolRole } from "@makyschool/shared/types";
import { useAuth } from "@/hooks/useAuth";

export function CanDo({
  action,
  role: roleProp,
  children,
}: {
  action: PermissionAction;
  role?: MakySchoolRole;
  children: ReactNode;
}) {
  const { state } = useAuth();
  const role = roleProp ?? state.user?.role;

  if (!role || !can(role, action)) {
    return null;
  }

  return <>{children}</>;
}
