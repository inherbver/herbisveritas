// import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileData } from "@/types/profile";
import { redirect as navRedirect } from "next/navigation";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";
import UpdateProfileForm from "./UpdateProfileForm"; // Futur composant client
import { SupabaseClient } from "@supabase/supabase-js"; // Added import

interface EditAccountPageProps {
  params: { locale: string };
}

async function getUserProfile(supabaseClient: SupabaseClient): Promise<ProfileData | null> {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.error("Error fetching user or user not found:", userError);
    return null;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("first_name, last_name, phone_number, role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    if (profileError.code === "PGRST116") {
      // Cas où l'utilisateur est authentifié mais n'a pas encore de profil.
      // Ce n'est pas une "erreur" au sens strict pour une page d'édition.
      console.log(
        `No profile found for user (ID: ${user.id}), returning empty profile data. This is expected for new users.`
      );
    } else {
      // Vraie erreur inattendue lors de la récupération du profil
      console.error("Unexpected error fetching profile:", {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        fullError: profileError, // Pour avoir tous les détails si nécessaire
      });
    }
    // Dans les deux cas (PGRST116 ou autre erreur), on retourne un profil "vide"
    // pour que le formulaire s'affiche. Une gestion d'erreur plus poussée (ex: page d'erreur)
    // pourrait être envisagée pour les erreurs inattendues si userProfile devenait null ici.
    return {
      first_name: null,
      last_name: null,
      phone_number: null,
      role: null, // Le rôle devrait idéalement provenir de la session ou d'une source fiable
    } as ProfileData; // Cast si on est sûr de la structure minimale
  }
  return profile;
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  // const { locale } = params; // Commented out as 't' is unused, and 'locale' was only for 't'

  // Valider si params.locale (de l'URL) correspond à la locale de la requête (optionnel mais bon à vérifier)
  // Note: params.locale n'est plus directement accessible après le renommage et await
  // console.log('Locale from params:', locale);

  const supabase = await createSupabaseServerClient();

  // const t = await getTranslations({ locale, namespace: 'ProfileEditPage' }); // Commented out as 't' is unused
  // const tGlobal = await getTranslations({ locale, namespace: 'Global' }); // Ensure tGlobal is commented out

  const userProfile = await getUserProfile(supabase);

  if (!userProfile) {
    // Si getUserProfile retourne null parce que l'utilisateur n'est pas authentifié (pas juste profil non trouvé)
    // alors rediriger vers login.
    // Pour l'instant, on suppose que si userProfile est null, c'est une absence d'utilisateur authentifié.
    const redirectUrl = `${LOGIN_REDIRECT_URL}?locale=${params.locale}&from=/profile/account/edit`;
    return navRedirect(redirectUrl);
  }

  return (
    <section className="space-y-6">
      <header>
        {/* <h1 className="text-2xl font-semibold">{t('title')}</h1> */}
        {/* <p className="text-muted-foreground">{t('subtitle')}</p> */}
      </header>

      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        {/* <h2 className="text-xl font-semibold mb-4">{t('formDataTitle')}</h2> */}
        <UpdateProfileForm
          userProfile={userProfile} // userProfile from getUserProfile should now always be an object
          // submitButtonText={t('updateProfileButton')}
          // labels={{
          //   firstName: t('firstNameLabel'),
          //   lastName: t('lastNameLabel'),
          //   phoneNumber: t('phoneNumberLabel'),
          // }}
        />
        {/* Placeholder pour le formulaire */}
        {/* <div className="p-4 border-2 border-dashed border-border rounded-md">
          <p className="text-center text-muted-foreground">
            {tGlobal('form_placeholder')} (UpdateProfileForm.tsx)
          </p>
          <pre className="mt-4 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(userProfile, null, 2)}
          </pre>
        </div> */}
      </div>

      {/* Exemple d'utilisation des traductions Globales */}
      {/* <p>{tGlobal('required_fields')}</p> */}
    </section>
  );
}
