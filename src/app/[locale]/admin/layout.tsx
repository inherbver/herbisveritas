// src/app/[locale]/admin/layout.tsx

import { ReactNode } from "react";
import { checkUserPermission } from "@/lib/auth/server-auth";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface AdminLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default async function AdminLayout({ children, params: { locale } }: AdminLayoutProps) {
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-semibold">Dashboard Admin</h1>
        <div className="ml-auto text-sm text-muted-foreground">
          {user?.email} ({role})
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        {children}
      </main>
    </div>
  );
}
