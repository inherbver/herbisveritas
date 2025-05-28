// src/app/[locale]/admin/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n-config";

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}

export default async function AdminLayout(props: AdminLayoutProps) {
  // await the params promise before accessing .locale
  const { locale } = await props.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin") {
    const t = await getTranslations({ locale, namespace: "AdminLayout" });
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1>{t("accessDeniedTitle")}</h1>
        <p>{t("accessDeniedMessage")}</p>
        <a href={`/${locale}/`} className="mt-4 text-blue-500 hover:underline">
          {t("goBackHome")}
        </a>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="bg-gray-800 p-4 text-white">
        <h1 className="text-xl">Admin Dashboard</h1>
      </header>
      <main className="p-4">{props.children}</main>
    </div>
  );
}
