import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import UpdateProfileForm from "./UpdateProfileForm";
import { ProfileData } from "@/types/profile";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

interface Props {
  params: { locale: string };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "ProfileEditPage.metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function EditProfilePage(props: Props) {
  const { locale } = await props.params;

  // Set the locale for this request
  setRequestLocale(locale);
  const t = await getTranslations("ProfileEditPage");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/signin?next=/profile/account/edit`);
  }

  const {
    data: dbProfileData, // Renommé pour éviter la confusion avec la variable finale
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      phone_number,
      role,
      shipping_address_line1,
      shipping_address_line2,
      shipping_postal_code,
      shipping_city,
      shipping_country,
      terms_accepted_at
    `
    )
    .eq("id", user.id)
    .single();

  let userProfile: ProfileData | null = null;

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116: 'No rows found'. Pour toute autre erreur, on log et userProfile reste null.
    console.error("Error fetching profile:", profileError);
    // Ici, on pourrait choisir de lancer une erreur ou de retourner un composant d'erreur.
    // Pour l'instant, si une erreur inattendue survient, le formulaire s'affichera vide.
  } else if (dbProfileData) {
    // Si les données sont là (pas d'erreur ou PGRST116 mais un profil existe déjà - peu probable avec .single() et PGRST116)
    userProfile = {
      id: dbProfileData.id, // id est bien présent et non null
      first_name: dbProfileData.first_name,
      last_name: dbProfileData.last_name,
      phone_number: dbProfileData.phone_number,
      role: dbProfileData.role,
      shipping_address_line1: dbProfileData.shipping_address_line1,
      shipping_address_line2: dbProfileData.shipping_address_line2,
      shipping_postal_code: dbProfileData.shipping_postal_code,
      shipping_city: dbProfileData.shipping_city,
      shipping_country: dbProfileData.shipping_country,
      terms_accepted_at: dbProfileData.terms_accepted_at,
    };
  }
  // Si dbProfileData est null (ex: PGRST116, le profil n'existe pas encore), userProfile reste null.

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>
      {/* La prop userProfile attend ProfileData | null, ce qui est maintenant garanti */}
      <UpdateProfileForm userProfile={userProfile} />
    </section>
  );
}
