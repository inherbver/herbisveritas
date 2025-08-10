import { ReactNode } from "react";
import { AdminHeader } from "./admin-header";

interface DashboardShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  headerAction?: ReactNode;
}

export function DashboardShell({
  children,
  title,
  description,
  headerAction,
}: DashboardShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader title={title} description={description} headerAction={headerAction} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
