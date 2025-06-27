// src/app/[locale]/admin/layout.tsx

import { ReactNode } from "react";
import { checkUserPermission } from "@/lib/auth/server-auth";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { DashboardShell } from "@/components/admin/dashboard-shell";

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { isAuthorized, error, user, role } = await checkUserPermission("admin:access");
  const t = await getTranslations("Global");

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("Errors.unauthorizedTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("Errors.unauthorizedMessage")}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("Errors.reason")}: {error || t("Errors.insufficientPrivileges")}
            </p>
            <Link href="/" className="mt-4 block text-sm text-primary underline">
              {t("Header.goBackHome")}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      {children}
    </div>
  );
}
