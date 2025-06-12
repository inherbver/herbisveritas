// src/app/[locale]/admin/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n-config";
import { checkAdminAccess } from "@/lib/auth/adminGuard";

interface AdminLayoutProps {
  children: ReactNode;
  params: { locale: Locale };
}

export default async function AdminLayout(props: AdminLayoutProps) {
  const { locale } = props.params;

  const authResult = await checkAdminAccess();

  if (!authResult.user && authResult.error === "Not authenticated") {
    redirect(`/${locale}/login`);
  }

  if (!authResult.isAuthorized) {
    const t = await getTranslations({ locale, namespace: "AdminLayout" });
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-red-600">{t("accessDeniedTitle")}</h1>
        <p className="mt-2 text-gray-600">{t("accessDeniedMessage")}</p>
        {authResult.error && (
          <p className="mt-1 text-sm text-red-400">Detail: {authResult.error}</p>
        )}
        <a href={`/${locale}/`} className="mt-4 text-blue-500 hover:underline">
          {t("goBackHome")}
        </a>
      </div>
    );
  }

  const adminUser = authResult.user!;
  const adminRole = authResult.role!;

  return (
    <div className="admin-layout">
      <header className="bg-gray-800 p-4 text-white">
        <h1 className="text-xl">Admin Dashboard</h1>
        <p className="text-sm text-gray-300">
          Connecté en tant que {adminUser.email} ({adminRole})
        </p>
      </header>
      <main className="p-4">{props.children}</main>
    </div>
  );
}
