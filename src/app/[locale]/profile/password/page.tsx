import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import PasswordChangeForm from "@/components/domain/profile/password-change-form";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";

interface PasswordPageProps {
  params: { locale: string };
}

export async function generateMetadata(props: PasswordPageProps): Promise<Metadata> {
  const { locale } = await props.params; // Correction: params est un objet direct
  // const locale = props.params.locale; // Original line commented out
  const t = await getTranslations({ locale, namespace: "PasswordPage" });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function PasswordPage(props: PasswordPageProps) {
  const { locale } = await props.params; // Correction: params est un objet direct
  // const locale = props.params.locale; // Original line commented out
  const t = await getTranslations({ locale, namespace: "PasswordPage" });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const redirectTo = `/${locale}${LOGIN_REDIRECT_URL}?next=/profile/password`;
    redirect(redirectTo);
  }

  return (
    <section className="space-y-8 rounded-lg bg-card p-6 shadow-lg md:p-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
      </header>
      <PasswordChangeForm />
    </section>
  );
}

// N'oubliez pas d'ajouter les clés de traduction dans vos fichiers (en.json, fr.json)
// sous le namespace "PasswordPage":
// "PasswordPage.metadata.title": "Change Password",
// "PasswordPage.metadata.description": "Change your account password.",
// "PasswordPage.title": "Change My Password",
