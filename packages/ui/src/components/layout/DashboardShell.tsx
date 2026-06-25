import type { ReactNode } from "react";

export function DashboardShell({
  sidebar,
  header,
  topBar,
  rightRail,
  children,
}: {
  sidebar: ReactNode;
  header?: ReactNode;
  topBar?: ReactNode;
  rightRail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-theme-page text-theme-primary">
      {sidebar}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header ? <div className="shrink-0 lg:hidden">{header}</div> : null}

        <div className="flex min-h-0 flex-1 overflow-hidden xl:gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {topBar ? <div className="shrink-0">{topBar}</div> : null}

            <div className="dashboard-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </div>

          {rightRail ? (
            <div className="hidden h-full shrink-0 xl:block">{rightRail}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
