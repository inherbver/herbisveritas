// src/app/[locale]/admin/layout.tsx

import { ReactNode } from "react";
import { checkUserPermission } from "@/lib/auth/server-auth";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminSidebar } from "@/components/features/admin/admin-sidebar";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { AdminStatus } from "@/components/features/admin/AdminStatus";

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const {
    isAuthorized,
    error,
    user: _user,
    role: _role,
  } = await checkUserPermission("admin:access");
  const tGlobal = await getTranslations("Global");
  const tAdmin = await getTranslations("AdminLayout");

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{tGlobal("Errors.unauthorizedTitle")}</AlertTitle>
          <AlertDescription>
            <p>{tGlobal("Errors.unauthorizedMessage")}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {tGlobal("Errors.reason")}: {error || tGlobal("Errors.insufficientPrivileges")}
            </p>
            <Link href="/" className="mt-4 block text-sm text-primary underline">
              {tGlobal("Header.goBackHome")}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <DashboardShell title={tAdmin("adminDashboardTitle")}>
        <AdminStatus />
        {children}
      </DashboardShell>
    </div>
  );
}
