export function isSettingsPath(pathname: string): boolean {
  return pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");
}
