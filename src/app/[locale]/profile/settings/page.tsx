import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const t = await getTranslations("ProfileSettings");
  const supabase = await createSupabaseServerClient();

  // Vérifier l'authentification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Récupérer le profil utilisateur avec les préférences newsletter
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("newsletter_subscribed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <SettingsForm
        initialNewsletterSubscribed={profile?.newsletter_subscribed ?? false}
      />
    </div>
  );
}
